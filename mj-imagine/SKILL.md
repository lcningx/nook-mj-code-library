---
name: mj-imagine
description: "Midjourney V8.2 全闭环视觉创作与出图技能：仅在用户调用 /mj-imagine 或明确指定使用 MJ / Midjourney 时激活。自动联动 Skill(mj-code-library) 检索最佳风格码，强制遵循 --v 8.2 提示词范式重写/清洗旧版提示词，并通过内置 CLI 调用 mj-proxy 一步到位完成文生图、垫图参考、V8.2 原生 Edit 对话改图/重绘材质、Describe 反推转 V8.2、Blend 多图融合与 U/V 选图放大，自动生成带 ①②③④ 编号的 2×2 选片预览卡交付。"
allowed-tools: Bash(node:*), Bash(ffmpeg:*), Bash(curl:*), Bash(mkdir:*), Bash(ls:*)
---

# Midjourney V8.2 视觉导演与一键出图（`mj-imagine`）

本技能集成了 **Midjourney V8.2 提示词导演规范**、**`Skill(mj-code-library)` 风格码检索联动** 与 **一键执行脚本 [scripts/mj.mjs](scripts/mj.mjs)**（相对当前技能目录 `<SKILL_DIR>` 调用，不硬编码机器路径）。

---

## 一、触发边界与一步到位原则

1. **显式触发边界**：仅当用户输入 `/mj-imagine`，或在对话中明确提到使用 **MJ / Midjourney** 生图、改图、垫图、融图、反推、选图放大时激活本技能；普通未指定工具的日常生图不抢占其他默认生图技能。
2. **一步到位直接开跑（免审词等待）**：收到用户的创作意图后，**不要停下来等用户确认提示词**——直接按下方流程完成「检索匹配风格码 → 构造 V8.2 英文提示词 → 调用 `scripts/mj.mjs` 出图 → 交付 2×2 编号选片预览卡 + 附上完整 Prompt 与选码拆解」。

---

## 二、Midjourney `--v 8.2` 核心铁律（严禁使用旧版本）

### 1. 版本硬锁定与回退参数拦截
- **唯一指定版本**：所有生图请求**必须且只能使用 `--v 8.2`**（严禁出现 `--v 5`、`--v 6`、`--v 6.1`、`--v 7` 等任何旧版参数）。
- **严禁混入会导致回退 V7 的旧参考标签**：不要在提示词中写 `--cref`、`--cw`、`--oref`、`--ow`（在 V8 架构下这些旧标签会触发向后兼容回退到旧引擎）。角色/局部修改统一走 **V8.2 原生 Edit 接口（`edit` / `retexture`）** 或 `imagine --ref` 垫图。
- **原生参数写法**：去滤镜写实使用 `--raw`（替代旧版 `--style raw`）；需要画面印字时直接用英文双引号 `"EXACT TEXT"` 包裹。

### 2. V8.2 提示词黄金结构与旧词清洗
V8.2 以 **`--profile` 个性化美学驱动 + 简洁自然语言叙事** 为核心，厌恶旧时代“咒语词堆砌”。无论是新写提示词，还是复用 `Skill(mj-code-library)` 中的历史示例词 / `describe` 反推词，**必须按 V8.2 标准清洗重构**：

```text
[Vibe 风格前缀（挂码时必填）], [Subject 主体与关键细节], [Action & Scene 动作与空间环境], [Lighting & Atmosphere 光影氛围], [Camera & Composition 景别/焦段/构图] --ar <比例> --s <风格化> [--profile <码>] --v 8.2
```

- **必须剔除的旧版冗余废词**：`8k`, `4k`, `ultra realistic`, `photorealistic`, `unreal engine`, `octane render`, `vray`, `masterpiece`, `best quality`, `trending on artstation`, `hyperdetailed`, `award winning`。改用具体的光学与材质描写（如 `shot on 50mm lens, shallow depth of field, weathered linen texture, volumetric amber side-lighting`）。
- 详细的旧词改造对照表与参数调优区间见 [references/v82-prompt-playbook.md](references/v82-prompt-playbook.md)。

### 3. 与 `Skill(mj-code-library)`（493 条风格码库）联动选码
1. 当用户题材契合古风武侠、仙侠神话、电影人文、科幻机甲、建筑室内、自然奇观、克苏鲁/巨龙/巨物等风格时，先按 `Skill(mj-code-library)` 的两级目录检索最匹配的 **1 组** 风格码。
2. **挂码两条铁律**：
   - `--profile <code>` 单挂无效，**必须在提示词开头保留或转译该条目的 `vibe`（色调 + 光线 + 介质描述）**；
   - 标注为 **混码（multi）** 的条目严禁拆分，必须整串 `--profile code1 code2 ...` 完整保留。
3. 若需求为纯白底电商图、扁平矢量图标、极简 UI 界面等不适合风格码染色的场景，不强行挂码，直接使用纯净 V8.2 叙事词 + `--s 80~150 --v 8.2`。

---

## 三、智能速度调度策略（FAST / RELAX 自动分流）

`scripts/mj.mjs` 默认开启 `--speed auto` 智能分流（契合每月有限 Fast 时长 + 无限量 Relax 慢速的订阅结构）：
- **单组实时交互（`--count 1`，默认）**：自动走 **`FAST`**（`/mj-fast`，约 15 秒极速出图）；
- **批量抽卡 / 多方案对比（`--count >= 2` 或并发调用多组）**：自动切 **`RELAX`**（`/mj-relax`，消耗无限慢速额度，零扣减 Fast 时长）；
- 当用户明确提出“慢速/省额度”或“全部用快速/加急”时，显式传 `--speed relax` 或 `--speed fast` 覆盖。

---

## 四、CLI 全套平面视觉命令速查

以当前技能目录为 `<SKILL_DIR>`，输出目录统一指定到当前工作区下的生成目录（如 `./mj-outputs`）：

```bash
# 0. 环境与账号健康/剩余额度自检
node <SKILL_DIR>/scripts/mj.mjs check

# 1. 文生图 / 垫图参考（自动锁定 --v 8.2，下载 4 张单图并合成带 1/2/3/4 编号的 2×2 选片卡）
node <SKILL_DIR>/scripts/mj.mjs imagine \
  --prompt "<V8.2 英文提示词> --ar 16:9 --s 200 --profile 2q4zxma --v 8.2" \
  [--ref ./ref1.png --ref https://.../ref2.jpg] \
  [--count 1] \
  [--speed auto|fast|relax|turbo] \
  --out ./mj-outputs

# 2. 选图放大 / 变体 / 重绘（支持 U1~U4、V1~V4、reroll 简写，自动处理 Remix 弹窗）
node <SKILL_DIR>/scripts/mj.mjs action \
  --task "<父任务ID>" \
  --pick U2 \
  [--prompt "<微调时的新提示词>"] \
  --out ./mj-outputs

# 3. V8.2 原生 Edit 对话改图 / Retexture 材质重绘（替代旧版 cref/oref）
node <SKILL_DIR>/scripts/mj.mjs edit \
  --image ./mj-outputs/<taskId>/2.png \
  --prompt "Change the cloak fabric to dark weathered leather and add light rain" \
  [--mode edit|retexture] \
  --out ./mj-outputs

# 4. 图生文反推（获取原始描述后，务必按 V8.2 规范清洗重写再用于 imagine）
node <SKILL_DIR>/scripts/mj.mjs describe \
  --image ./reference.jpg

# 5. 多图融合（2~5 张本地图或 URL）
node <SKILL_DIR>/scripts/mj.mjs blend \
  --image ./a.png --image ./b.png \
  [--dimensions SQUARE|PORTRAIT|LANDSCAPE] \
  --out ./mj-outputs
```

---

## 五、标准交付规范（每次出图必做）

1. **优先交付 2×2 编号选片预览卡**：
   - 对于 `imagine` / `edit` / `blend` 生成的 4 图任务，`scripts/mj.mjs` 会在输出目录生成带 **① ② ③ ④ 角标** 的 `contact_sheet.jpg` 以及无损单图 `1.png` ~ `4.png`。
   - 若环境支持 `nook_card_file_delivery` / `nook_card_file_card`，优先调用卡片展示 `contact_sheet.jpg`（放大任务则直接展示放大后的高清大图），并在文本中提供可点击的 `file://` 本地文件链接与公网直链。
2. **透明附带创作配方与下一步指令提示**：
   在成图下方简明列出：
   - **最终执行的 V8.2 Prompt**（代码块，方便用户复制或微调）
   - **选码与参数说明**（若使用了 `Skill(mj-code-library)`，注明条目 ID、风格码与调度模式 `FAST/RELAX`、任务 `taskId`）
   - **快捷后续操作提示**：提示用户可直接回复如「**放大第 2 张**」、「**基于第 3 张微调（V3）**」或「**把第 1 张背景改成雪夜（Edit）**」。
