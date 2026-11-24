# Midjourney V8.2 提示词重写与参数实战手册

## 1. 旧版提示词 → V8.2 重写对照实例

`Skill(mj-code-library)` 中的部分历史条目或用户提供的旧提示词写于 V6/V7 时期，常带有渲染器堆砌词或旧参数。提交前必须按以下标准提纯为 V8.2 自然语言叙事：

### 示例 A：古风电影叙事（带码图库 `--profile`）
- **旧版原文（含冗余词）**：
  `ancient chinese carriage cabin interior, extremely narrow and cramped space, a person sitting inside, highly detailed wood texture, cinematic lighting, ultra realistic, 3D render, unreal engine, 8k, masterpiece --ar 16:9 --stylize 175 --hd --v 6.1 --profile 2q4zxma`
- **V8.2 重写后（保留前置 vibe + 精炼光学与质感 + 锁定 `--v 8.2`）**：
  `warm amber gold and deep crimson palette, low-key volumetric side light piercing through mist, cinematic realism, cramped interior of an ancient Chinese wooden carriage, a cloaked traveler sitting with knees drawn close, sheer silk curtains brushing the foreground, thin shafts of warm light leaking through slatted wood gaps, floating dust motes, tactile aged timber grain, close-up framing on 35mm cinema lens, shallow depth of field --ar 16:9 --s 200 --profile 2q4zxma --v 8.2`

### 示例 B：现代商业产品摄影（不挂风格码，保持纯净）
- **用户需求**：「帮我生成一张黑曜石台面上的极简玻璃香水瓶，冷调高级感海报」
- **V8.2 提示词**：
  `editorial product photography of a minimalist clear glass perfume bottle with a brushed silver cap resting on wet black slate, ripples of water catching soft diffused ice-blue rim lighting, clean negative space at top for typography, crisp glass refraction, shot on 100mm macro lens --ar 4:5 --s 120 --raw --v 8.2`

### 示例 C：画面内精准英文排版（利用 V8.2 文字渲染）
- **用户需求**：「赛博雨夜街头霓虹招牌写着 NOOK STUDIO」
- **V8.2 提示词**：
  `rain-slicked cyberpunk alleyway at night, a glowing vintage neon sign mounted on wet concrete reading "NOOK STUDIO" in crisp warm amber tubing, reflections shimmering in asphalt puddles, moody cyan ambient mist, cinematic wide shot on 28mm lens --ar 16:9 --s 220 --v 8.2`

---

## 2. V8.2 关键参数调优矩阵

| 参数 | 推荐区间 / 写法 | V8.2 行为特征与使用建议 |
| :--- | :--- | :--- |
| `--v 8.2` | **必填固定值** | 强制锁定 V8.2 核心模型，禁止省略或使用旧版本 |
| `--ar <W:H>` | `16:9` / `21:9`（横屏电影）、`9:16`（竖屏短剧）、`3:4` / `4:5`（人像海报）、`1:1` | 画幅比例，整数比 |
| `--s <0-1000>` | 写实/商业：`80–160`<br>电影/挂码：`180–350`<br>强烈艺术风格释放：`400–800` | V8.2 美学基线更鲜明；挂 `--profile` 时适当提高 `--s`（如 `200–350`）能更充分释放风格码特征 |
| `--raw` | 纪实摄影 / 去 AI 糖水感时添加 | 降低 MJ 默认美化介入，更忠实于镜头与材质描述（勿写旧版 `--style raw`） |
| `--chaos <0-100>` | 探索构图时用 `15–35`，定稿用 `0` | 提高同组 4 张候选图之间的构图差异度 |
| `--no <元素>` | 如 `--no text, watermark, blur` | 负向排除干扰物（不要在正文里写 `no xxx`，一律放 `--no`） |
| `--hd` | 按需开启 | V8.2 原生高分辨率结构直出（耗时与算力略增，常规快速迭代先跑标准四图再 `U1~U4` 放大更省额度） |
| `--seed <整数>` | 固定随机种子 | 配合相同 `--profile` 微调提示词时用于保持构图连贯 |

---

## 3. 角色一致性与局部改图（Discord 渠道 & 官网渠道双兼容范式）

在 V8.2 中，**不要再使用 `--cref` 或 `--oref`**（会触发引擎降级回退 V7）：
1. **对上一轮刚生成的图改衣服、换背景、改光影（Discord 渠道首选）**：
   直接调用 `mj.mjs action --task <父任务ID> --pick V1~V4 --prompt "<修改后的完整 V8.2 提示词>"`（开启 Remix Mode 后，`mj.mjs` 会自动处理 `code: 21` 弹窗提交新提示词，锁定原构图微调）。
2. **对本地单图或外部参考图做重绘改图 / 换材质**：
   调用 `mj.mjs edit --image <path> --prompt "<修改后的目标画面完整 V8.2 描述>" [--mode edit|retexture]`（若接入了官网账号走原生 `/edit`；在纯 Discord 渠道下，`mj.mjs` 会自动无感切换为高权重垫图引导 `--iw 1.5` / `--iw 2.0` + `--v 8.2`，不会报“无可用实例”）。
3. **风格参考图（`--sref`）与构图垫图（`--ref`）**：
   - 本地风格参考图：`mj.mjs imagine --sref ./style.jpg --prompt "<V8.2 提示词>"`（自动上传至 Discord CDN 换取 HTTPS 链接拼入 `--sref`）；
   - 本地构图参考图：`mj.mjs imagine --ref ./pose.png --prompt "<V8.2 提示词>"`。
