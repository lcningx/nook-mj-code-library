#!/usr/bin/env node
/**
 * mj.mjs — Midjourney V8.2 CLI driver for trueai-org/midjourney-proxy
 *
 * Zero external npm dependencies (Node 18+ built-in fetch/fs/child_process).
 * Reads endpoint & credentials from env vars or ~/.config/mj-imagine/config.json.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), ".config", "mj-imagine", "config.json");

function loadConfig() {
  let fileCfg = {};
  const cfgPath = process.env.MJ_CONFIG_PATH || DEFAULT_CONFIG_PATH;
  if (fs.existsSync(cfgPath)) {
    try {
      fileCfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    } catch (err) {
      console.error(`[warn] Failed to parse ${cfgPath}: ${err.message}`);
    }
  }
  const baseUrl = (
    process.env.MJ_PROXY_URL ||
    fileCfg.baseUrl ||
    fileCfg.publicBaseUrl ||
    "http://127.0.0.1:14002"
  ).replace(/\/+$/, "");
  const publicBaseUrl = (
    process.env.MJ_PUBLIC_BASE_URL ||
    fileCfg.publicBaseUrl ||
    baseUrl
  ).replace(/\/+$/, "");
  const apiSecret = process.env.MJ_API_SECRET || fileCfg.apiSecret || "";
  const adminSecret = process.env.MJ_ADMIN_SECRET || fileCfg.adminSecret || apiSecret;
  return { baseUrl, publicBaseUrl, apiSecret, adminSecret, cfgPath };
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      let key, val;
      if (eq !== -1) {
        key = a.slice(2, eq);
        val = a.slice(eq + 1);
      } else {
        key = a.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          val = next;
          i++;
        } else {
          val = true;
        }
      }
      if (flags[key] !== undefined) {
        if (Array.isArray(flags[key])) flags[key].push(val);
        else flags[key] = [flags[key], val];
      } else {
        flags[key] = val;
      }
    } else {
      positional.push(a);
    }
  }
  return { cmd: positional[0] || "help", positional: positional.slice(1), flags };
}

function toArray(v) {
  if (v === undefined || v === null || v === false) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Enforce Midjourney V8.2 rules:
 * - Strip any legacy --v / --version / --niji version flags and enforce --v 8.2
 * - Strip legacy V7-fallback flags (--cref, --cw, --oref, --ow) with warning
 * - Convert --style raw -> --raw
 * - Strip inline --fast / --relax / --turbo when speed is routed via endpoint prefix
 */
export function sanitizePromptV82(rawPrompt) {
  const warnings = [];
  let p = String(rawPrompt || "").trim();
  if (!p) throw new Error("Prompt cannot be empty.");

  // Normalize smart dashes (e.g. "—ar" -> "--ar")
  p = p.replace(/(^|\s)[—–](\w+)/g, "$1--$2");

  // Convert legacy --style raw -> --raw
  if (/--style\s+raw\b/i.test(p)) {
    p = p.replace(/--style\s+raw\b/gi, "--raw");
    warnings.push("Converted legacy '--style raw' to '--raw'.");
  }

  // Strip V7-fallback reference flags
  const legacyRefRegex = /--(?:cref|oref)\s+\S+|--(?:cw|ow)\s+\d+/gi;
  if (legacyRefRegex.test(p)) {
    p = p.replace(legacyRefRegex, " ");
    warnings.push(
      "Stripped legacy --cref/--oref flags (they force fallback to V7; use 'mj.mjs edit' or '--ref' for V8.2).",
    );
  }

  // Strip any existing --v / --version / --niji flags
  const versionRegex = /--(?:v|version)\s+[0-9a-zA-Z._-]+|--niji(?:\s+[0-9a-zA-Z._-]+)?/gi;
  const matchedVersions = p.match(versionRegex);
  if (matchedVersions) {
    const non82 = matchedVersions.filter((m) => !/^--(?:v|version)\s+8\.2$/i.test(m.trim()));
    if (non82.length > 0) {
      warnings.push(`Replaced legacy version flag(s) [${non82.join(", ")}] with '--v 8.2'.`);
    }
    p = p.replace(versionRegex, " ");
  }

  // Strip inline speed flags so endpoint prefix (/mj-fast or /mj-relax) governs cleanly
  p = p.replace(/--(?:fast|relax|turbo)\b/gi, " ");

  // Collapse extra spaces and append --v 8.2
  p = p.replace(/\s+/g, " ").trim();
  p = `${p} --v 8.2`;

  return { prompt: p, warnings };
}

function imageInputToPayload(input) {
  if (/^https?:\/\//i.test(input) || /^data:image\//i.test(input)) {
    return input;
  }
  const abs = path.resolve(input);
  if (!fs.existsSync(abs)) {
    throw new Error(`Reference image file not found: ${abs}`);
  }
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/png";
  const b64 = fs.readFileSync(abs).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function speedPrefixFor(speed) {
  const s = String(speed || "fast").toLowerCase();
  if (s === "relax") return "/mj-relax";
  if (s === "turbo") return "/mj-turbo";
  if (s === "fast") return "/mj-fast";
  return "";
}

async function apiRequest(cfg, method, urlPath, body = undefined, useAdmin = false) {
  const token = useAdmin ? cfg.adminSecret : cfg.apiSecret;
  if (!token) {
    throw new Error(
      `Missing API token. Set MJ_API_SECRET or configure ${cfg.cfgPath}.`,
    );
  }
  const url = `${cfg.baseUrl}${urlPath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "mj-api-secret": token,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${urlPath}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function pollTask(cfg, taskId, timeoutMs = 600_000) {
  const start = Date.now();
  let lastProgress = "";
  while (Date.now() - start < timeoutMs) {
    const task = await apiRequest(cfg, "GET", `/mj/task/${taskId}/fetch`);
    if (!task) {
      throw new Error(`Task ${taskId} returned 204 (not found or cleaned up).`);
    }
    const prog = `${task.status}:${task.progress || "0%"}`;
    if (prog !== lastProgress) {
      console.error(`  [${taskId}] ${task.status} (${task.progress || "0%"})`);
      lastProgress = prog;
    }
    if (task.status === "SUCCESS") return task;
    if (task.status === "FAILURE" || task.status === "CANCEL") {
      throw new Error(
        `Task ${taskId} ${task.status}: ${task.failReason || "Unknown failure"}`,
      );
    }
    await new Promise((r) => setTimeout(r, 3500));
  }
  throw new Error(`Task ${taskId} timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

function rewritePublicUrl(cfg, rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("/")) {
    return `${cfg.publicBaseUrl}${rawUrl}`;
  }
  return rawUrl;
}

function toInternalDownloadUrl(cfg, rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("/")) {
    return `${cfg.baseUrl}${rawUrl}`;
  }
  if (cfg.publicBaseUrl && rawUrl.startsWith(cfg.publicBaseUrl + "/")) {
    const rel = rawUrl.slice(cfg.publicBaseUrl.length);
    return `${cfg.baseUrl}${rel}`;
  }
  return rawUrl;
}

async function downloadFile(cfg, rawUrl, destPath) {
  const dlUrl = toInternalDownloadUrl(cfg, rawUrl);
  const res = await fetch(dlUrl);
  if (!res.ok) {
    throw new Error(`Failed to download ${dlUrl}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return destPath;
}

function findBoldFont() {
  const candidates = [
    "/usr/share/fonts/opentype/urw-base35/URWGothic-Demi.otf",
    "/usr/share/fonts/opentype/urw-base35/NimbusSansNarrow-Bold.otf",
    "/usr/share/fonts/opentype/urw-base35/C059-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Build a 2x2 numbered contact sheet (1, 2, 3, 4) from 4 image files using ffmpeg.
 */
function buildContactSheet(imgPaths, outPath) {
  if (imgPaths.length !== 4) return null;
  const fontFile = findBoldFont();
  const cellFilter = (idx, num) => {
    const labelPart = fontFile
      ? `,drawbox=x=18:y=18:w=56:h=56:color=black@0.72:t=fill,drawbox=x=18:y=18:w=56:h=56:color=white@0.85:t=2,drawtext=fontfile='${fontFile}':text='${num}':fontcolor=white:fontsize=34:x=46-tw/2:y=46-th/2`
      : `,drawbox=x=18:y=18:w=52:h=52:color=black@0.72:t=fill`;
    return `[${idx}:v]scale=960:-2,pad=iw+8:ih+8:4:4:color=#141418${labelPart}[v${idx}]`;
  };
  const filterComplex = [
    cellFilter(0, 1),
    cellFilter(1, 2),
    cellFilter(2, 3),
    cellFilter(3, 4),
    "[v0][v1][v2][v3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0[out]",
  ].join(";");

  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        imgPaths[0],
        "-i",
        imgPaths[1],
        "-i",
        imgPaths[2],
        "-i",
        imgPaths[3],
        "-filter_complex",
        filterComplex,
        "-map",
        "[out]",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        outPath,
      ],
      { stdio: "pipe" },
    );
    return outPath;
  } catch (err) {
    console.error(`[warn] Contact sheet generation skipped: ${err.message}`);
    return null;
  }
}

function splitGridToFourImages(mergedPath, taskDir) {
  const outPaths = [1, 2, 3, 4].map((n) => path.join(taskDir, `${n}.png`));
  const crops = [
    "crop=iw/2:ih/2:0:0",
    "crop=iw/2:ih/2:iw/2:0",
    "crop=iw/2:ih/2:0:ih/2",
    "crop=iw/2:ih/2:iw/2:ih/2",
  ];
  for (let i = 0; i < 4; i++) {
    execFileSync(
      "ffmpeg",
      ["-y", "-loglevel", "error", "-i", mergedPath, "-vf", crops[i], "-frames:v", "1", outPaths[i]],
      { stdio: "pipe" },
    );
  }
  return outPaths;
}

async function materializeTaskOutputs(cfg, task, outRoot) {
  const taskDir = path.resolve(outRoot, String(task.id));
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(taskDir, "task.json"), JSON.stringify(task, null, 2));

  const savedImages = [];
  const hasUpscaleButtons =
    Array.isArray(task.buttons) &&
    task.buttons.some((b) => String(b?.label || "").toUpperCase() === "U1");
  const isFourGridTask =
    task.action !== "UPSCALE" &&
    task.action !== "UPSCALE_HD" &&
    ((Array.isArray(task.imageUrls) && task.imageUrls.length === 4) ||
      (Boolean(task.imageUrl) && hasUpscaleButtons));

  // Prefer downloading local/proxied merged grid (task.imageUrl) and splitting into 1..4
  // for Discord 2x2 grids or when imageUrls point to Cloudflare-protected cdn.midjourney.com
  const shouldSplitMergedGrid =
    isFourGridTask &&
    Boolean(task.imageUrl) &&
    (!Array.isArray(task.imageUrls) ||
      task.imageUrls.length !== 4 ||
      task.imageUrls.some((x) => /cdn\.midjourney\.com/i.test(String(x?.url || ""))));

  if (shouldSplitMergedGrid) {
    const ext = path.extname(new URL(task.imageUrl, "https://example.com").pathname) || ".webp";
    const mergedPath = path.join(taskDir, `merged_raw${ext}`);
    await downloadFile(cfg, task.imageUrl, mergedPath);
    const splitPaths = splitGridToFourImages(mergedPath, taskDir);
    for (let i = 0; i < splitPaths.length; i++) {
      savedImages.push({
        index: i + 1,
        path: splitPaths[i],
        url: rewritePublicUrl(cfg, task.imageUrl),
      });
    }
  } else if (Array.isArray(task.imageUrls) && task.imageUrls.length > 0) {
    for (let i = 0; i < task.imageUrls.length; i++) {
      const u = task.imageUrls[i]?.url;
      if (!u) continue;
      const ext = path.extname(new URL(u, "https://example.com").pathname) || ".png";
      const filePath = path.join(taskDir, `${i + 1}${ext}`);
      await downloadFile(cfg, u, filePath);
      savedImages.push({
        index: i + 1,
        path: filePath,
        url: rewritePublicUrl(cfg, u),
      });
    }
  } else if (task.imageUrl) {
    const ext = path.extname(new URL(task.imageUrl, "https://example.com").pathname) || ".png";
    const filePath = path.join(taskDir, `result${ext}`);
    await downloadFile(cfg, task.imageUrl, filePath);
    savedImages.push({
      index: 1,
      path: filePath,
      url: rewritePublicUrl(cfg, task.imageUrl),
    });
  }

  let contactSheetPath = null;
  if (savedImages.length === 4) {
    contactSheetPath = buildContactSheet(
      savedImages.map((x) => x.path),
      path.join(taskDir, "contact_sheet.jpg"),
    );
  }

  const availableActions = (task.buttons || []).map((b) => ({
    label: b.label || b.emoji || "",
    customId: b.customId,
  }));

  return {
    taskId: task.id,
    action: task.action,
    status: task.status,
    mode: task.mode,
    version: task.version || "v 8.2",
    duration: task.useTime || null,
    finalPrompt: task.properties?.finalPrompt || task.promptEn || task.prompt,
    taskDir,
    contactSheetPath,
    imageUrl: rewritePublicUrl(cfg, task.imageUrl),
    images: savedImages,
    availableActions,
  };
}

async function cmdCheck(cfg) {
  const health = await apiRequest(cfg, "GET", "/health");
  let accountsSummary = null;
  try {
    const accRes = await apiRequest(
      cfg,
      "POST",
      "/mj/admin/accounts",
      { current: 1, pageSize: 20 },
      true,
    );
    accountsSummary = (accRes.list || []).map((a) => ({
      id: a.id,
      name: a.loginAccount || a.channelId,
      type: a.isOfficial ? "official" : a.isYouChuan ? "youchuan" : "discord",
      enable: a.enable,
      running: a.running,
      fastTimeRemaining: a.fastTimeRemaining,
    }));
  } catch {
    // Non-fatal if only user token is configured
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl: cfg.baseUrl,
        publicBaseUrl: cfg.publicBaseUrl,
        health,
        accounts: accountsSummary,
      },
      null,
      2,
    ),
  );
}

function stripInvalidProfileCodes(prompt, badCodes) {
  const badSet = new Set(badCodes.map((c) => c.toLowerCase()));
  let emptied = false;
  const next = prompt.replace(
    /--(?:profile|p)\s+([^-]+?)(?=\s+--|$)/gi,
    (_full, codesStr) => {
      const kept = codesStr
        .trim()
        .split(/\s+/)
        .filter((c) => c && !badSet.has(c.toLowerCase()));
      if (kept.length === 0) {
        emptied = true;
        return "";
      }
      return `--profile ${kept.join(" ")}`;
    },
  );
  return { prompt: next.replace(/\s+/g, " ").trim(), emptied };
}

async function uploadToDiscordUrls(cfg, inputs) {
  const urls = [];
  const localDataUrls = [];
  const localIndices = [];

  for (let i = 0; i < inputs.length; i++) {
    const item = String(inputs[i]);
    if (/^https?:\/\//i.test(item)) {
      urls[i] = item;
    } else {
      localIndices.push(i);
      localDataUrls.push(imageInputToPayload(item));
    }
  }

  if (localDataUrls.length > 0) {
    const up = await apiRequest(cfg, "POST", "/mj/submit/upload-discord-images", {
      base64Array: localDataUrls,
    });
    if (!up || up.code !== 1 || !Array.isArray(up.result)) {
      throw new Error(`upload-discord-images failed: ${JSON.stringify(up)}`);
    }
    for (let j = 0; j < localIndices.length; j++) {
      urls[localIndices[j]] = up.result[j];
    }
  }
  return urls;
}

async function runSingleImagine(cfg, prompt, refs, speedPrefix, outRoot, allowProfileRetry = true) {
  const body = { prompt };
  if (refs.length > 0) {
    body.base64Array = refs.map(imageInputToPayload);
  }
  const sub = await apiRequest(cfg, "POST", `${speedPrefix}/mj/submit/imagine`, body);
  if (!sub || (sub.code !== 1 && sub.code !== 22)) {
    throw new Error(`Submit imagine failed: ${JSON.stringify(sub)}`);
  }
  const taskId = String(sub.result);
  console.error(`Submitted imagine taskId=${taskId} (${speedPrefix || "/mj"})`);
  try {
    const task = await pollTask(cfg, taskId);
    return await materializeTaskOutputs(cfg, task, outRoot);
  } catch (err) {
    const msg = String(err.message || "");
    const badMatches = [...msg.matchAll(/Member\s+`+([A-Za-z0-9_-]+)`+\s+not\s+found|Member\s+([A-Za-z0-9_-]+)\s+not\s+found/gi)];
    const badCodes = badMatches.map((m) => m[1] || m[2]).filter(Boolean);
    if (allowProfileRetry && badCodes.length > 0) {
      const { prompt: healedPrompt } = stripInvalidProfileCodes(prompt, badCodes);
      if (healedPrompt !== prompt) {
        console.error(
          `[v8.2-self-heal] Retired --profile code(s) [${badCodes.join(", ")}] detected; stripping and retrying once...`,
        );
        return await runSingleImagine(cfg, healedPrompt, refs, speedPrefix, outRoot, false);
      }
    }
    throw err;
  }
}

async function cmdImagine(cfg, flags) {
  const rawPrompts = toArray(flags.prompt);
  if (rawPrompts.length === 0) {
    throw new Error("Missing --prompt for 'imagine'.");
  }
  const countPerPrompt = Math.max(1, Number(flags.count || 1));
  const totalJobs = rawPrompts.length * countPerPrompt;

  const rawSpeed = String(flags.speed || "auto").toLowerCase();
  const resolvedSpeed =
    rawSpeed === "auto" ? (totalJobs >= 2 ? "relax" : "fast") : rawSpeed;
  const speedPrefix = speedPrefixFor(resolvedSpeed);
  const refs = toArray(flags.ref);
  const srefs = toArray(flags.sref);
  const outRoot = path.resolve(String(flags.out || "./mj-outputs"));

  let srefSuffix = "";
  if (srefs.length > 0) {
    const srefUrls = await uploadToDiscordUrls(cfg, srefs);
    srefSuffix = ` --sref ${srefUrls.join(" ")}`;
  }

  const jobs = [];
  const allWarnings = [];
  for (const rp of rawPrompts) {
    const withSref = srefSuffix ? `${rp} ${srefSuffix}` : rp;
    const { prompt, warnings } = sanitizePromptV82(withSref);
    allWarnings.push(...warnings);
    for (let k = 0; k < countPerPrompt; k++) {
      jobs.push(() => runSingleImagine(cfg, prompt, refs, speedPrefix, outRoot));
    }
  }

  for (const w of [...new Set(allWarnings)]) {
    console.error(`[v8.2-guard] ${w}`);
  }
  console.error(
    `Running ${jobs.length} job(s) in ${resolvedSpeed.toUpperCase()} mode -> ${outRoot}`,
  );

  const results = await Promise.all(jobs.map((fn) => fn()));
  console.log(
    JSON.stringify(
      {
        ok: true,
        speedMode: resolvedSpeed.toUpperCase(),
        warnings: [...new Set(allWarnings)],
        count: results.length,
        results: results.length === 1 ? results[0] : results,
      },
      null,
      2,
    ),
  );
}

function matchButton(buttons, pick) {
  const target = String(pick || "").trim();
  if (!target) return null;
  if (target.startsWith("MJ::")) {
    return { customId: target, label: target };
  }
  const upper = target.toUpperCase();
  for (const b of buttons || []) {
    const lbl = (b.label || "").trim().toUpperCase();
    const emj = (b.emoji || "").trim();
    if (lbl === upper || emj === target) return b;
    if ((upper === "REROLL" || upper === "REFRESH") && b.customId?.includes("reroll")) {
      return b;
    }
  }
  return null;
}

async function cmdAction(cfg, flags) {
  const parentId = flags.task ? String(flags.task) : "";
  const pick = flags.pick || flags["custom-id"] || "";
  if (!parentId || !pick) {
    throw new Error("Usage: action --task <taskId> --pick <U1..U4|V1..V4|reroll|customId>");
  }
  const outRoot = path.resolve(String(flags.out || "./mj-outputs"));
  const speedPrefix = flags.speed ? speedPrefixFor(flags.speed) : "";

  let customId = String(pick);
  if (!customId.startsWith("MJ::")) {
    const parentTask = await apiRequest(cfg, "GET", `/mj/task/${parentId}/fetch`);
    if (!parentTask) throw new Error(`Parent task ${parentId} not found.`);
    const matched = matchButton(parentTask.buttons, pick);
    if (!matched) {
      const avail = (parentTask.buttons || []).map((b) => b.label || b.emoji).join(", ");
      throw new Error(`Action '${pick}' not found on task ${parentId}. Available: [${avail}]`);
    }
    customId = matched.customId;
  }

  const sub = await apiRequest(cfg, "POST", `${speedPrefix}/mj/submit/action`, {
    taskId: parentId,
    customId,
  });
  if (!sub || ![1, 21, 22].includes(sub.code)) {
    throw new Error(`Submit action failed: ${JSON.stringify(sub)}`);
  }
  const actionTaskId = String(sub.result);

  if (sub.code === 21) {
    const modalBody = { taskId: actionTaskId };
    if (flags.prompt) {
      modalBody.prompt = sanitizePromptV82(String(flags.prompt)).prompt;
    }
    const modalRes = await apiRequest(cfg, "POST", `${speedPrefix}/mj/submit/modal`, modalBody);
    if (!modalRes || ![1, 22].includes(modalRes.code)) {
      throw new Error(`Modal confirm failed: ${JSON.stringify(modalRes)}`);
    }
  }

  const task = await pollTask(cfg, actionTaskId);
  const res = await materializeTaskOutputs(cfg, task, outRoot);
  console.log(JSON.stringify({ ok: true, result: res }, null, 2));
}

async function cmdEdit(cfg, flags) {
  const imgInput = flags.image;
  const rawPrompt = flags.prompt;
  if (!imgInput || !rawPrompt) {
    throw new Error("Usage: edit --image <pathOrUrl> --prompt <instructionOrV82Prompt> [--mode edit|retexture]");
  }
  const endpoint = String(flags.mode || "edit").toLowerCase() === "retexture" ? "retexture" : "edit";
  const speedPrefix = speedPrefixFor(flags.speed || "fast");
  const outRoot = path.resolve(String(flags.out || "./mj-outputs"));

  const cleanPrompt = String(rawPrompt)
    .replace(/--(?:cref|oref)\s+\S+|--(?:cw|ow)\s+\d+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const imgPayload = imageInputToPayload(String(imgInput));
  const sub = await apiRequest(cfg, "POST", `${speedPrefix}/mj/submit/${endpoint}`, {
    image: imgPayload,
    prompt: cleanPrompt,
  });

  // Note: /mj/submit/edit and /retexture in midjourney-proxy only route to Official/YouChuan accounts.
  // When running on pure Discord channel accounts, seamlessly fall back to high-weight V8.2 image-guided imagine!
  if (!sub || ![1, 22].includes(sub.code)) {
    const desc = String(sub?.description || "");
    if (sub?.code === 24 || desc.includes("无可用的账号") || desc.includes("不支持编辑")) {
      const iw = endpoint === "retexture" ? "--iw 2" : "--iw 1.5";
      const hasIw = /--iw\s+[0-9.]+/i.test(cleanPrompt);
      const { prompt: v82Prompt } = sanitizePromptV82(
        hasIw ? cleanPrompt : `${cleanPrompt} ${iw}`,
      );
      console.error(
        `[discord-fallback] '/${endpoint}' requires Official/YouChuan plugin; routing via Discord image-guided V8.2 imagine (${iw})...`,
      );
      const res = await runSingleImagine(
        cfg,
        v82Prompt,
        [String(imgInput)],
        speedPrefix,
        outRoot,
      );
      console.log(
        JSON.stringify(
          { ok: true, mode: `${endpoint}-discord-ref`, result: res },
          null,
          2,
        ),
      );
      return;
    }
    throw new Error(`Submit ${endpoint} failed: ${JSON.stringify(sub)}`);
  }

  const taskId = String(sub.result);
  console.error(`Submitted ${endpoint} taskId=${taskId}`);
  const task = await pollTask(cfg, taskId);
  const res = await materializeTaskOutputs(cfg, task, outRoot);
  console.log(JSON.stringify({ ok: true, mode: endpoint, result: res }, null, 2));
}

async function cmdDescribe(cfg, flags) {
  const imgInput = flags.image;
  if (!imgInput) {
    throw new Error("Usage: describe --image <pathOrUrl>");
  }
  const payload = /^https?:\/\//i.test(String(imgInput))
    ? { link: String(imgInput) }
    : { base64: imageInputToPayload(String(imgInput)) };

  const sub = await apiRequest(cfg, "POST", "/mj/submit/describe", payload);
  if (!sub || ![1, 22].includes(sub.code)) {
    throw new Error(`Submit describe failed: ${JSON.stringify(sub)}`);
  }
  const task = await pollTask(cfg, String(sub.result));
  console.log(
    JSON.stringify(
      {
        ok: true,
        taskId: task.id,
        rawPrompt: task.promptEn || task.prompt || task.description,
        note: "Refactor rawPrompt into concise V8.2 prose and append '--v 8.2' before running imagine.",
      },
      null,
      2,
    ),
  );
}

async function cmdBlend(cfg, flags) {
  const imgs = toArray(flags.image);
  if (imgs.length < 2 || imgs.length > 5) {
    throw new Error("Usage: blend --image <img1> --image <img2> [... up to 5] [--dimensions SQUARE|PORTRAIT|LANDSCAPE]");
  }
  const dimensions = String(flags.dimensions || "SQUARE").toUpperCase();
  const speedPrefix = speedPrefixFor(flags.speed || "fast");
  const outRoot = path.resolve(String(flags.out || "./mj-outputs"));

  const sub = await apiRequest(cfg, "POST", `${speedPrefix}/mj/submit/blend`, {
    base64Array: imgs.map((x) => imageInputToPayload(String(x))),
    dimensions,
  });
  if (!sub || ![1, 22].includes(sub.code)) {
    throw new Error(`Submit blend failed: ${JSON.stringify(sub)}`);
  }
  const task = await pollTask(cfg, String(sub.result));
  const res = await materializeTaskOutputs(cfg, task, outRoot);
  console.log(JSON.stringify({ ok: true, result: res }, null, 2));
}

async function cmdFetch(cfg, flags) {
  const taskId = flags.task ? String(flags.task) : "";
  if (!taskId) throw new Error("Usage: fetch --task <taskId> [--out ./mj-outputs]");
  const outRoot = path.resolve(String(flags.out || "./mj-outputs"));
  const task = await pollTask(cfg, taskId);
  const res = await materializeTaskOutputs(cfg, task, outRoot);
  console.log(JSON.stringify({ ok: true, result: res }, null, 2));
}

function printHelp() {
  console.log(`mj.mjs — Midjourney V8.2 CLI
Commands:
  check
  imagine  --prompt "<text>" [--ref <fileOrUrl>...] [--count 1] [--speed auto|fast|relax|turbo] [--out ./mj-outputs]
  fetch    --task <id> [--out ./mj-outputs]
  action   --task <id> --pick <U1..U4|V1..V4|reroll> [--prompt "<remixText>"] [--out ./mj-outputs]
  edit     --image <fileOrUrl> --prompt "<instruction>" [--mode edit|retexture] [--out ./mj-outputs]
  describe --image <fileOrUrl>
  blend    --image <img1> --image <img2> [--dimensions SQUARE|PORTRAIT|LANDSCAPE] [--out ./mj-outputs]
`);
}

async function main() {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const cfg = loadConfig();
  switch (cmd) {
    case "check":
      return await cmdCheck(cfg);
    case "imagine":
      return await cmdImagine(cfg, flags);
    case "fetch":
      return await cmdFetch(cfg, flags);
    case "action":
      return await cmdAction(cfg, flags);
    case "edit":
    case "retexture":
      if (cmd === "retexture") flags.mode = "retexture";
      return await cmdEdit(cfg, flags);
    case "describe":
      return await cmdDescribe(cfg, flags);
    case "blend":
      return await cmdBlend(cfg, flags);
    default:
      printHelp();
  }
}

const isDirectRun =
  process.argv[1] &&
  fs.existsSync(process.argv[1]) &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((err) => {
    console.error(`[mj-imagine error] ${err.message}`);
    process.exit(1);
  });
}
