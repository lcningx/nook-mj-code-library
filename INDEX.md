# MJ 码图库 · AI 检索索引

> 493 条 / 3 大类 / 34 子类 ｜ 数据源 `index.html` ｜ 生成物，勿手改（重建：`python3 build_index.py`）

## 0. 检索协议（AI 必读）

1. **不要整读** `catalog.jsonl` 或 `entries/`，按需加载。
2. 先用「大类路由」定位大类，再用「子类目录」选 1 个子类文件。
3. 读 `categories/<slug>.md`：里面已有全部 id、码、一句话，多数问题到此为止。
4. 只有需要**完整提示词**时，才读 `entries/<id>.md`。
5. 精确关键词（颜色/介质/主体）反查：`grep -i "赛博" catalog.jsonl`（装了 rg 可用 `rg -i`）。
   已知 id 时可直接读 `entries/<前缀+3位数字>.md`（char15 → `entries/char015.md`）。
6. **混码条目（multi）禁止拆分**，必须整组 profile 一起用；页面内已标注「勿拆」。
7. MJ 里单挂 `--profile xxx` 不生效：**必须把 vibe 描述串放在码前面**，条目页的「① 码」已是可直接复制的完整串。

> 示例：用户问「古风武侠有没有独码？」→ 读 §2 定位 `char-01-gufeng-wuxia` → 读该分类页 → 直接回答，全程不碰 `entries/`。
> 示例：用户要「char15 的完整提示词」→ 直接读 `entries/char015.md`。

## 1. 大类路由

| 用户说的是 | 大类 | 入口 | 条数 |
|---|---|---|---|
| 人物、人像、角色、汉服、机甲少女、脸/半身/全身 | 角色·人像 | `categories/char-*` | 185 |
| 场景、室内、街景、山水、云海、废墟、空镜 | 场景·环境 | `categories/scene-*` | 201 |
| 巨物、怪兽、巨龙、泰坦、哥斯拉、海怪、压迫感 | 巨物·怪兽 | `categories/juwu-*` | 107 |

## 2. 子类目录

| 子类 | 条数 | 检索词 | 文件 |
|---|---|---|---|
| 角色·人像 · 东方古风·武侠 | 39 | 古风 武侠 汉服 江湖 侠客 电影感 雾气 中式 | [char-01-gufeng-wuxia](categories/char-01-gufeng-wuxia.md) |
| 角色·人像 · 东方神话·仙侠奇观 | 27 | 仙侠 神话 东方 神女 法术 天宫 古装 | [char-02-xianxia-myth](categories/char-02-xianxia-myth.md) |
| 角色·人像 · 现代都市·电影人文 | 26 | 现代 都市 电影 人文 故事感 生活 情绪 | [char-03-modern-cinema](categories/char-03-modern-cinema.md) |
| 角色·人像 · 科幻·机甲 | 16 | 科幻 机甲 未来 赛博 装甲 机器人 太空 | [char-04-scifi-mecha](categories/char-04-scifi-mecha.md) |
| 角色·人像 · 游戏CG·动漫角色 | 11 | 游戏 CG 动漫 二次元 角色 原画 立绘 | [char-05-game-cg](categories/char-05-game-cg.md) |
| 角色·人像 · 西方奇幻·神话史诗 | 11 | 西方 奇幻 精灵 骑士 魔法 史诗 神话 | [char-06-western-fantasy](categories/char-06-western-fantasy.md) |
| 角色·人像 · 日韩系·影像 | 11 | 日韩 偶像 写真 少女 清新 生活流 人像 | [char-07-jk-idol](categories/char-07-jk-idol.md) |
| 角色·人像 · 东方古装·史诗 | 10 | 东方古装 史诗 王朝 将军 宫廷 大场面 | [char-08-ancient-epic](categories/char-08-ancient-epic.md) |
| 角色·人像 · 东方赛博·武侠朋克 | 9 | 东方赛博 武侠朋克 霓虹 机械 古风混搭 | [char-09-cyber-wuxia](categories/char-09-cyber-wuxia.md) |
| 角色·人像 · 现代写实人像·生活流 | 8 | 写实 人像 生活流 自然光 抓拍 真实照片 | [char-10-real-portrait](categories/char-10-real-portrait.md) |
| 角色·人像 · 风格化与实验 | 7 | 风格化 实验 艺术 插画 特殊质感 概念 | [char-11-stylized](categories/char-11-stylized.md) |
| 角色·人像 · 时尚编辑·商业广告 | 7 | 时尚 杂志 广告 商业 大片 棚拍 高级感 | [char-12-fashion-editorial](categories/char-12-fashion-editorial.md) |
| 角色·人像 · 国风暗黑·志怪恐怖 | 3 | 国风 暗黑 志怪 恐怖 阴森 诡异 | [char-13-guofeng-horror](categories/char-13-guofeng-horror.md) |
| 场景·环境 · 科幻·未来场景 | 34 | 科幻 未来 城市 赛博 霓虹 废土 太空 | [scene-01-scifi-future](categories/scene-01-scifi-future.md) |
| 场景·环境 · 现代室内·生活空间 | 29 | 现代 室内 家居 生活空间 客厅 卧室 暖光 | [scene-02-modern-interior](categories/scene-02-modern-interior.md) |
| 场景·环境 · 仙侠天宫·奇观 | 26 | 仙侠 天宫 奇观 云海 神殿 东方幻想 | [scene-03-xianxia-palace](categories/scene-03-xianxia-palace.md) |
| 场景·环境 · 现代都市·街景 | 23 | 现代 都市 街景 街道 城市 夜景 人流 | [scene-04-city-street](categories/scene-04-city-street.md) |
| 场景·环境 · 古风室内·殿堂楼阁 | 21 | 古风 室内 殿堂 楼阁 木质 中式 宫廷 | [scene-05-ancient-interior](categories/scene-05-ancient-interior.md) |
| 场景·环境 · 古镇村落·俯瞰 | 21 | 古镇 村落 俯瞰 水乡 民居 山城 | [scene-06-ancient-town](categories/scene-06-ancient-town.md) |
| 场景·环境 · 古建·祠庙宫殿 | 15 | 古建 祠庙 宫殿 寺庙 牌坊 中式建筑 | [scene-07-temple-palace](categories/scene-07-temple-palace.md) |
| 场景·环境 · 自然奇观·山水云海 | 10 | 自然 山水 云海 奇观 雪山 瀑布 风景 | [scene-08-nature](categories/scene-08-nature.md) |
| 场景·环境 · 巨物·尺度压迫 | 9 | 巨物 尺度 压迫感 巨大 建筑 仰望 | [scene-09-colossal-scale](categories/scene-09-colossal-scale.md) |
| 场景·环境 · 西幻·城堡秘境 | 6 | 西幻 城堡 秘境 欧洲 魔法 森林 | [scene-10-castle](categories/scene-10-castle.md) |
| 场景·环境 · 废墟·古代战场 | 3 | 废墟 古代 战场 遗迹 断壁 苍凉 | [scene-11-ruins-battle](categories/scene-11-ruins-battle.md) |
| 场景·环境 · 光影空镜·氛围 | 3 | 光影 空镜 氛围 极简 情绪 光线 | [scene-12-light-atmosphere](categories/scene-12-light-atmosphere.md) |
| 场景·环境 · 废墟末世·战场 | 1 | 废墟 末世 战场 荒芜 灾难 末日 | [scene-13-post-apocalypse](categories/scene-13-post-apocalypse.md) |
| 巨物·怪兽 · 暗黑异兽·克苏鲁 | 26 | 暗黑 异兽 克苏鲁 触手 怪物 恐怖 诡异 | [juwu-01-cthulhu](categories/juwu-01-cthulhu.md) |
| 巨物·怪兽 · 巨型机甲·超级机器人 | 18 | 巨型机甲 超级机器人 钢铁 装甲 战斗 科幻 | [juwu-02-mega-mecha](categories/juwu-02-mega-mecha.md) |
| 巨物·怪兽 · 东方神龙·仙兽 | 17 | 东方 神龙 仙兽 龙 云海 神话 | [juwu-03-eastern-dragon](categories/juwu-03-eastern-dragon.md) |
| 巨物·怪兽 · 上古神祇·泰坦巨人 | 14 | 上古 神祇 泰坦 巨人 神像 史诗 压迫感 | [juwu-04-titan](categories/juwu-04-titan.md) |
| 巨物·怪兽 · 西方巨龙·翼兽 | 11 | 西方 巨龙 翼兽 喷火 奇幻 城堡 | [juwu-05-western-dragon](categories/juwu-05-western-dragon.md) |
| 巨物·怪兽 · 怪兽特摄·哥斯拉系 | 10 | 怪兽 特摄 哥斯拉 城市 破坏 巨大生物 | [juwu-06-kaiju](categories/juwu-06-kaiju.md) |
| 巨物·怪兽 · 深海巨兽·海怪 | 8 | 深海 巨兽 海怪 章鱼 海啸 海面 | [juwu-07-sea-monster](categories/juwu-07-sea-monster.md) |
| 巨物·怪兽 · 超尺度奇观·巨物崇拜 | 3 | 超尺度 奇观 巨物 建筑 巨像 崇拜 | [juwu-08-mega-structure](categories/juwu-08-mega-structure.md) |

## 3. 常用意图速查

| 意图 | 直接去 |
|---|---|
| 古风/武侠/汉服人像 | `categories/char-01-gufeng-wuxia.md` |
| 仙侠/神话人物 | `categories/char-02-xianxia-myth.md` |
| 科幻机甲人物 | `categories/char-04-scifi-mecha.md` |
| 赛博朋克城市场景 | `categories/scene-01-scifi-future.md` |
| 现代室内/家居 | `categories/scene-02-modern-interior.md` |
| 山水云海/自然奇观 | `categories/scene-08-nature.md` |
| 克苏鲁/暗黑异兽 | `categories/juwu-01-cthulhu.md` |
| 巨型机甲/机器人 | `categories/juwu-02-mega-mecha.md` |
| 东方神龙 | `categories/juwu-03-eastern-dragon.md` |
| 泰坦/巨神 | `categories/juwu-04-titan.md` |
| 深海海怪 | `categories/juwu-07-sea-monster.md` |

## 4. 文件约定

| 路径 | 内容 | 典型大小 |
|---|---|---|
| `INDEX.md` / `SKILL.md` | 本索引，只含路由 | ~7 KB |
| `categories/*.md` | 一个子类的全部条目表（id/码/一句话） | 1–8 KB |
| `entries/*.md` | 单个条目的完整提示词与可复制串 | 1–3 KB |
| `catalog.jsonl` | 493 行扁平元数据，供 grep/rg 精确检索 | ~230 KB（勿整读） |

## 5. 数据来源与口径

- `vibe`：色调 + 光线 + 介质的一句话风格描述，用于码前缀。
- `code`：`--profile …`（可能多码），**单独无效**，必须配 vibe。
- `params`：`--ar / --stylize / --chaos / --raw / --hd` 等出图参数。
- `prompt`：完整英文/中文提示词，已把参数写在末尾。
- 图片：角色为 `图库/`，场景为 `图库_场景/` + `原图_场景/`，巨物为 `图库_巨物/` + `原图_巨物/`。
