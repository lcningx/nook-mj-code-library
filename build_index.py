#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 index.html（MJ 码图对照库）重建 AI 检索索引。

产物（全部为生成物，请勿手改）：
  INDEX.md
  SKILL.md
  catalog.jsonl
  categories/<slug>.md
  entries/<id>.md

用法：
  python3 build_index.py            # 重建
  python3 build_index.py --check    # 只检查数据完整性，不写文件
"""
import argparse
import html
import json
import os
import re
import sys
from collections import OrderedDict

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "index.html")

TAB_TITLE = {"char": "角色·人像", "scene": "场景·环境", "juwu": "巨物·怪兽"}

# 子类 slug：按 index.html 中大类内出现顺序编号
SLUGS = {
    ("char", "东方古风·武侠"): "char-01-gufeng-wuxia",
    ("char", "东方神话·仙侠奇观"): "char-02-xianxia-myth",
    ("char", "现代都市·电影人文"): "char-03-modern-cinema",
    ("char", "科幻·机甲"): "char-04-scifi-mecha",
    ("char", "游戏CG·动漫角色"): "char-05-game-cg",
    ("char", "西方奇幻·神话史诗"): "char-06-western-fantasy",
    ("char", "日韩系·影像"): "char-07-jk-idol",
    ("char", "东方古装·史诗"): "char-08-ancient-epic",
    ("char", "东方赛博·武侠朋克"): "char-09-cyber-wuxia",
    ("char", "现代写实人像·生活流"): "char-10-real-portrait",
    ("char", "风格化与实验"): "char-11-stylized",
    ("char", "时尚编辑·商业广告"): "char-12-fashion-editorial",
    ("char", "国风暗黑·志怪恐怖"): "char-13-guofeng-horror",
    ("scene", "科幻·未来场景"): "scene-01-scifi-future",
    ("scene", "现代室内·生活空间"): "scene-02-modern-interior",
    ("scene", "仙侠天宫·奇观"): "scene-03-xianxia-palace",
    ("scene", "现代都市·街景"): "scene-04-city-street",
    ("scene", "古风室内·殿堂楼阁"): "scene-05-ancient-interior",
    ("scene", "古镇村落·俯瞰"): "scene-06-ancient-town",
    ("scene", "古建·祠庙宫殿"): "scene-07-temple-palace",
    ("scene", "自然奇观·山水云海"): "scene-08-nature",
    ("scene", "巨物·尺度压迫"): "scene-09-colossal-scale",
    ("scene", "西幻·城堡秘境"): "scene-10-castle",
    ("scene", "废墟·古代战场"): "scene-11-ruins-battle",
    ("scene", "光影空镜·氛围"): "scene-12-light-atmosphere",
    ("scene", "废墟末世·战场"): "scene-13-post-apocalypse",
    ("juwu", "暗黑异兽·克苏鲁"): "juwu-01-cthulhu",
    ("juwu", "巨型机甲·超级机器人"): "juwu-02-mega-mecha",
    ("juwu", "东方神龙·仙兽"): "juwu-03-eastern-dragon",
    ("juwu", "上古神祇·泰坦巨人"): "juwu-04-titan",
    ("juwu", "西方巨龙·翼兽"): "juwu-05-western-dragon",
    ("juwu", "怪兽特摄·哥斯拉系"): "juwu-06-kaiju",
    ("juwu", "深海巨兽·海怪"): "juwu-07-sea-monster",
    ("juwu", "超尺度奇观·巨物崇拜"): "juwu-08-mega-structure",
}

# 每个子类的检索词（人工维护，脚本重建不会丢）
KEYWORDS = {
    "char-01-gufeng-wuxia": "古风 武侠 汉服 江湖 侠客 电影感 雾气 中式",
    "char-02-xianxia-myth": "仙侠 神话 东方 神女 法术 天宫 古装",
    "char-03-modern-cinema": "现代 都市 电影 人文 故事感 生活 情绪",
    "char-04-scifi-mecha": "科幻 机甲 未来 赛博 装甲 机器人 太空",
    "char-05-game-cg": "游戏 CG 动漫 二次元 角色 原画 立绘",
    "char-06-western-fantasy": "西方 奇幻 精灵 骑士 魔法 史诗 神话",
    "char-07-jk-idol": "日韩 偶像 写真 少女 清新 生活流 人像",
    "char-08-ancient-epic": "东方古装 史诗 王朝 将军 宫廷 大场面",
    "char-09-cyber-wuxia": "东方赛博 武侠朋克 霓虹 机械 古风混搭",
    "char-10-real-portrait": "写实 人像 生活流 自然光 抓拍 真实照片",
    "char-11-stylized": "风格化 实验 艺术 插画 特殊质感 概念",
    "char-12-fashion-editorial": "时尚 杂志 广告 商业 大片 棚拍 高级感",
    "char-13-guofeng-horror": "国风 暗黑 志怪 恐怖 阴森 诡异",
    "scene-01-scifi-future": "科幻 未来 城市 赛博 霓虹 废土 太空",
    "scene-02-modern-interior": "现代 室内 家居 生活空间 客厅 卧室 暖光",
    "scene-03-xianxia-palace": "仙侠 天宫 奇观 云海 神殿 东方幻想",
    "scene-04-city-street": "现代 都市 街景 街道 城市 夜景 人流",
    "scene-05-ancient-interior": "古风 室内 殿堂 楼阁 木质 中式 宫廷",
    "scene-06-ancient-town": "古镇 村落 俯瞰 水乡 民居 山城",
    "scene-07-temple-palace": "古建 祠庙 宫殿 寺庙 牌坊 中式建筑",
    "scene-08-nature": "自然 山水 云海 奇观 雪山 瀑布 风景",
    "scene-09-colossal-scale": "巨物 尺度 压迫感 巨大 建筑 仰望",
    "scene-10-castle": "西幻 城堡 秘境 欧洲 魔法 森林",
    "scene-11-ruins-battle": "废墟 古代 战场 遗迹 断壁 苍凉",
    "scene-12-light-atmosphere": "光影 空镜 氛围 极简 情绪 光线",
    "scene-13-post-apocalypse": "废墟 末世 战场 荒芜 灾难 末日",
    "juwu-01-cthulhu": "暗黑 异兽 克苏鲁 触手 怪物 恐怖 诡异",
    "juwu-02-mega-mecha": "巨型机甲 超级机器人 钢铁 装甲 战斗 科幻",
    "juwu-03-eastern-dragon": "东方 神龙 仙兽 龙 云海 神话",
    "juwu-04-titan": "上古 神祇 泰坦 巨人 神像 史诗 压迫感",
    "juwu-05-western-dragon": "西方 巨龙 翼兽 喷火 奇幻 城堡",
    "juwu-06-kaiju": "怪兽 特摄 哥斯拉 城市 破坏 巨大生物",
    "juwu-07-sea-monster": "深海 巨兽 海怪 章鱼 海啸 海面",
    "juwu-08-mega-structure": "超尺度 奇观 巨物 建筑 巨像 崇拜",
}

TAB_ROUTE = [
    ("人物、人像、角色、汉服、机甲少女、脸/半身/全身", "角色·人像", "char"),
    ("场景、室内、街景、山水、云海、废墟、空镜", "场景·环境", "scene"),
    ("巨物、怪兽、巨龙、泰坦、哥斯拉、海怪、压迫感", "巨物·怪兽", "juwu"),
]


def load_items(src_text):
    m = re.search(r"const ITEMS=(\{.*?\});\s*\nfunction toast", src_text, re.S)
    if not m:
        sys.exit("找不到 ITEMS JSON，index.html 结构可能已变")
    return json.loads(m.group(1))


def tab_segments(src_text):
    """按 tabpane 切分，返回 {tab: segment_text}"""
    marks = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="tabpane[^"]*" id="tab-([\w]+)"', src_text)]
    if not marks:
        sys.exit("找不到 tabpane")
    out = {}
    for i, (pos, tab) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else src_text.find("<script>", pos)
        out[tab] = src_text[pos:end]
    return out


def fname(item_id):
    m = re.match(r"([a-zA-Z]+)(\d+)$", item_id)
    return "%s%03d" % (m.group(1), int(m.group(2))) if m else item_id


def clean(s):
    s = re.sub(r"<br\s*/?>", "；", s or "")
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def parse_cards(seg):
    chunks = seg.split('<div class="card ')[1:]
    cards = []
    for c in chunks:
        m_id = re.search(r"openM\('([\w]+)'\)", c)
        if not m_id:
            continue
        badge = re.search(r'<span class="badge [^"]*">(.*?)</span>', c, re.S)
        num = re.search(r"<b>#(\d+)</b>", c)
        name = re.search(r"<b>#\d+</b>\s*<span class=\"q\">(.*?)</span>", c, re.S)
        code = re.search(r'<div class="codebox">(.*?)</div>', c, re.S)
        combo = re.search(r'<div class="combo">(.*?)</div>', c, re.S)
        taste = re.search(r'<span class="taste">(.*?)</span>', c, re.S)
        med = re.search(r'<span class="med">(.*?)</span>', c, re.S)
        qs = re.findall(r'<span class="q">(.*?)</span>', c, re.S)
        params = qs[-1] if qs else ""
        badge_txt = clean(badge.group(1)) if badge else ""
        multi = "multi" in c.split(">", 1)[0]
        mn = 0
        if multi:
            mm = re.search(r"混码·(\d+)", badge_txt)
            mn = int(mm.group(1)) if mm else 0
        cards.append(dict(
            id=m_id.group(1),
            num=int(num.group(1)) if num else 0,
            mode="multi" if multi else "solo",
            badge=badge_txt,
            mn=mn,
            name=clean(name.group(1)) if name else "",
            code=clean(code.group(1)) if code else "",
            combo=clean(combo.group(1)) if combo else "",
            taste=clean(taste.group(1)) if taste else "",
            med=clean(med.group(1)) if med else "",
            params=clean(params),
        ))
    return cards


def build(src_text):
    items = load_items(src_text)
    segs = tab_segments(src_text)

    cats = OrderedDict()   # (tab, cat_name) -> card list
    for tab, seg in segs.items():
        parts = re.split(r'<h2 id="[^"]*">(.*?)</h2><div class="grid">', seg, flags=re.S)
        for i in range(1, len(parts), 2):
            raw = clean(parts[i])
            name = re.sub(r"\s*·\s*\d+\s*图\s*$", "", raw)
            cats[(tab, name)] = parse_cards(parts[i + 1])

    # 校验：每个 ITEMS 都必须归入某个子类，且每个卡片都有 ITEMS
    seen = {c["id"] for cs in cats.values() for c in cs}
    missing_meta = sorted(set(items) - seen)
    missing_item = sorted(seen - set(items))
    if missing_meta:
        sys.exit("有 ITEMS 未出现在卡片中: %s" % missing_meta[:10])
    if missing_item:
        sys.exit("有卡片在 ITEMS 中不存在: %s" % missing_item[:10])

    for (tab, name) in cats:
        if (tab, name) not in SLUGS:
            sys.exit("缺少 slug 映射: %s / %s" % (tab, name))

    records = []
    for (tab, name), cards in cats.items():
        slug = SLUGS[(tab, name)]
        for c in sorted(cards, key=lambda x: x["num"]):
            it = items[c["id"]]
            rec = dict(c)
            rec.update(dict(
                tab=tab,
                cat=name,
                slug=slug,
                vibe=it.get("vibe", "").strip(),
                thumb=it.get("thumb", ""),
                orig=it.get("orig", ""),
                prompt=it.get("prompt", ""),
                codes=it.get("codes", "").strip(),
                codeparam=it.get("codeparam", "").strip(),
            ))
            rec["md"] = "entries/%s.md" % fname(rec["id"])
            records.append(rec)
    assert len(records) == len(items), (len(records), len(items))
    return cats, records


def one_line(s, n):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def code_short(codes):
    return codes.replace("--profile ", "").strip()


def fence(text):
    f = "```"
    while f in text:
        f += "`"
    return f


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(path) else None
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def gen_entry(rec):
    flag = "🟢 独码" if rec["mode"] == "solo" else "🟡 混码 ×%d（必须整组挂，别拆）" % rec["mn"]
    img = rec["thumb"]
    orig = rec["orig"]
    img_line = "`%s`" % img if img == orig else "`%s`（原图 `%s`）" % (img, orig)
    lines = [
        "# %s · %s" % (rec["id"], rec["name"]),
        "",
        "> 生成物，勿手改。重建：`python3 build_index.py`",
        "",
        "- 分类：%s › %s" % (TAB_TITLE[rec["tab"]], rec["cat"]),
        "- 类型：%s" % flag,
        "- 图片：%s" % img_line,
        "- 返回：[INDEX](../INDEX.md) ｜ [分类页](../categories/%s.md)" % rec["slug"],
        "",
    ]
    if rec["combo"]:
        lines += ["> ⚠️ **混码提示**：%s" % rec["combo"], ""]
    lines += [
        "## 推荐复制串",
        "",
        "**① 码（vibe 前置 + code，MJ 里必须带前面这段描述）**",
        "",
        "```text",
        ("%s %s" % (rec["vibe"], rec["codes"])).strip(),
        "```",
        "",
        "**② 码 + 参数**",
        "",
        "```text",
        ("%s %s" % (rec["vibe"], rec["codeparam"])).strip(),
        "```",
        "",
        "## 完整提示词（原文，已含参数）",
        "",
    ]
    f = fence(rec["prompt"])
    lines += [f + "text", rec["prompt"], f, ""]
    return "\n".join(lines)


def gen_category(tab, name, cards):
    slug = SLUGS[(tab, name)]
    lines = [
        "# %s · %s（%d 条）" % (TAB_TITLE[tab], name, len(cards)),
        "",
        "> 生成物，勿手改。上级：[INDEX](../INDEX.md)",
        "",
        "- 检索词：%s" % KEYWORDS.get(slug, ""),
        "- 条目页目录：`entries/`（点 id 进入，含完整提示词）",
        "",
        "| id | # | 名称 | 类型 | 码 | 一句话 |",
        "|---|---|---|---|---|---|",
    ]
    for c in cards:
        typ = "独码" if c["mode"] == "solo" else "**混码×%d 勿拆**" % c["mn"]
        lines.append("| [%s](%s) | %d | %s | %s | `%s` | %s |" % (
            c["id"], "../" + c["md"], c["num"], c["name"], typ,
            code_short(c["codes"]), one_line(c["vibe"], 34),
        ))
    lines.append("")
    return "\n".join(lines)


def gen_catalog(records):
    out = []
    for r in records:
        obj = OrderedDict([
            ("id", r["id"]), ("num", r["num"]), ("tab", r["tab"]), ("cat", r["cat"]),
            ("slug", r["slug"]), ("name", r["name"]), ("mode", r["mode"]),
            ("mn", r["mn"]), ("codes", r["codes"]), ("params", r["params"]),
            ("vibe", r["vibe"]), ("kw", KEYWORDS.get(r["slug"], "")),
            ("img", r["thumb"]), ("orig", r["orig"]), ("md", r["md"]),
        ])
        out.append(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    return "\n".join(out) + "\n"


def gen_index(cats, records, skill=False):
    total = len(records)
    tab_count = {t: sum(len(v) for (tt, _), v in cats.items() if tt == t) for t in TAB_TITLE}
    head = []
    if skill:
        head = [
            "---",
            "name: mj-code-library",
            "description: MJ 码图库检索（%d 条 Midjourney 提示词 + 风格码 + 参考图）。当用户要找 MJ 提示词/风格码/参考图、问「有没有 XX 风格的码」、需要按古风/科幻/巨物/人像等主题选图或复用 prompt 时使用。入口只读本文件，再按路由加载 categories/ 与 entries/。" % total,
            "---",
            "",
        ]
    lines = head + [
        "# MJ 码图库 · AI 检索索引",
        "",
        "> %d 条 / 3 大类 / %d 子类 ｜ 数据源 `index.html` ｜ 生成物，勿手改（重建：`python3 build_index.py`）" % (total, len(cats)),
        "",
        "## 0. 检索协议（AI 必读）",
        "",
        "1. **不要整读** `catalog.jsonl` 或 `entries/`，按需加载。",
        "2. 先用「大类路由」定位大类，再用「子类目录」选 1 个子类文件。",
        "3. 读 `categories/<slug>.md`：里面已有全部 id、码、一句话，多数问题到此为止。",
        "4. 只有需要**完整提示词**时，才读 `entries/<id>.md`。",
        "5. 精确关键词（颜色/介质/主体）反查：`grep -i \"赛博\" catalog.jsonl`（装了 rg 可用 `rg -i`）。",
        "   已知 id 时可直接读 `entries/<前缀+3位数字>.md`（char15 → `entries/char015.md`）。",
        "6. **混码条目（multi）禁止拆分**，必须整组 profile 一起用；页面内已标注「勿拆」。",
        "7. MJ 里单挂 `--profile xxx` 不生效：**必须把 vibe 描述串放在码前面**，条目页的「① 码」已是可直接复制的完整串。",
        "",
        "> 示例：用户问「古风武侠有没有独码？」→ 读 §2 定位 `char-01-gufeng-wuxia` → 读该分类页 → 直接回答，全程不碰 `entries/`。",
        "> 示例：用户要「char15 的完整提示词」→ 直接读 `entries/char015.md`。",
        "",
        "## 1. 大类路由",
        "",
        "| 用户说的是 | 大类 | 入口 | 条数 |",
        "|---|---|---|---|",
    ]
    for words, title, tab in TAB_ROUTE:
        lines.append("| %s | %s | `categories/%s-*` | %d |" % (words, title, tab, tab_count[tab]))
    lines += [
        "",
        "## 2. 子类目录",
        "",
        "| 子类 | 条数 | 检索词 | 文件 |",
        "|---|---|---|---|",
    ]
    for (tab, name), cards in cats.items():
        slug = SLUGS[(tab, name)]
        lines.append("| %s · %s | %d | %s | [%s](categories/%s.md) |" % (
            TAB_TITLE[tab], name, len(cards), KEYWORDS.get(slug, ""), slug, slug))
    lines += [
        "",
        "## 3. 常用意图速查",
        "",
        "| 意图 | 直接去 |",
        "|---|---|",
        "| 古风/武侠/汉服人像 | `categories/char-01-gufeng-wuxia.md` |",
        "| 仙侠/神话人物 | `categories/char-02-xianxia-myth.md` |",
        "| 科幻机甲人物 | `categories/char-04-scifi-mecha.md` |",
        "| 赛博朋克城市场景 | `categories/scene-01-scifi-future.md` |",
        "| 现代室内/家居 | `categories/scene-02-modern-interior.md` |",
        "| 山水云海/自然奇观 | `categories/scene-08-nature.md` |",
        "| 克苏鲁/暗黑异兽 | `categories/juwu-01-cthulhu.md` |",
        "| 巨型机甲/机器人 | `categories/juwu-02-mega-mecha.md` |",
        "| 东方神龙 | `categories/juwu-03-eastern-dragon.md` |",
        "| 泰坦/巨神 | `categories/juwu-04-titan.md` |",
        "| 深海海怪 | `categories/juwu-07-sea-monster.md` |",
        "",
        "## 4. 文件约定",
        "",
        "| 路径 | 内容 | 典型大小 |",
        "|---|---|---|",
        "| `INDEX.md` / `SKILL.md` | 本索引，只含路由 | ~7 KB |",
        "| `categories/*.md` | 一个子类的全部条目表（id/码/一句话） | 1–8 KB |",
        "| `entries/*.md` | 单个条目的完整提示词与可复制串 | 1–3 KB |",
        "| `catalog.jsonl` | %d 行扁平元数据，供 grep/rg 精确检索 | ~230 KB（勿整读） |" % total,
        "",
        "## 5. 数据来源与口径",
        "",
        "- `vibe`：色调 + 光线 + 介质的一句话风格描述，用于码前缀。",
        "- `code`：`--profile …`（可能多码），**单独无效**，必须配 vibe。",
        "- `params`：`--ar / --stylize / --chaos / --raw / --hd` 等出图参数。",
        "- `prompt`：完整英文/中文提示词，已把参数写在末尾。",
        "- 图片：角色为 `图库/`，场景为 `图库_场景/` + `原图_场景/`，巨物为 `图库_巨物/` + `原图_巨物/`。",
        "",
    ]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    with open(SRC, encoding="utf-8") as fh:
        src = fh.read()

    cats, records = build(src)

    print("条目 %d ｜ 子类 %d" % (len(records), len(cats)))
    for tab in TAB_TITLE:
        print("  %-6s %d 条" % (tab, sum(len(v) for (t, _), v in cats.items() if t == tab)))
    multi = [r["id"] for r in records if r["mode"] == "multi"]
    print("混码 %d 条：%s" % (len(multi), ", ".join(multi[:12]) + (" ..." if len(multi) > 12 else "")))

    missing_img = [r["thumb"] for r in records if r["thumb"] and not os.path.exists(os.path.join(ROOT, r["thumb"]))]
    missing_orig = [r["orig"] for r in records if r["orig"] and not os.path.exists(os.path.join(ROOT, r["orig"]))]
    if missing_img:
        print("⚠ 缺缩略图 %d 个，例：%s" % (len(missing_img), missing_img[:3]))
    if missing_orig:
        print("⚠ 缺原图 %d 个，例：%s" % (len(missing_orig), missing_orig[:3]))

    if args.check:
        sys.exit(0)

    # 清理旧生成物（只删本脚本管辖的目录/文件）
    for d in ("categories", "entries"):
        p = os.path.join(ROOT, d)
        if os.path.isdir(p):
            for f in os.listdir(p):
                if f.endswith(".md"):
                    os.remove(os.path.join(p, f))

    by_cat = OrderedDict()
    for r in records:
        by_cat.setdefault((r["tab"], r["cat"]), []).append(r)
    for (tab, name), recs in by_cat.items():
        write(os.path.join(ROOT, "categories", SLUGS[(tab, name)] + ".md"),
              gen_category(tab, name, sorted(recs, key=lambda x: x["num"])))
    for r in records:
        write(os.path.join(ROOT, r["md"]), gen_entry(r))

    write(os.path.join(ROOT, "catalog.jsonl"), gen_catalog(records))
    index = gen_index(cats, records)
    write(os.path.join(ROOT, "INDEX.md"), index)
    write(os.path.join(ROOT, "SKILL.md"), gen_index(cats, records, skill=True))

    print("✅ 已生成：INDEX.md / SKILL.md / catalog.jsonl / categories(%d) / entries(%d)" % (len(cats), len(records)))


if __name__ == "__main__":
    main()
