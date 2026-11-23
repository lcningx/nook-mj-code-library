# MJ 码图对照库 · nook-mj-code-library

493 条 Midjourney 提示词 / 风格码 / 参考图对照，覆盖 3 大类、34 个子类。

## 怎么用

| 谁用 | 入口 |
|---|---|
| 人看 | 打开 `index.html`（原始卡片页，可复制码/提示词） |
| AI 检索 | 从 `INDEX.md` 开始，里面写了检索协议与路由表 |
| AI 技能 | `SKILL.md` 可直接注册为 skill，按需加载 `categories/` 与 `entries/` |

### 三级索引

```
INDEX.md                 # 路由：3 大类 → 34 子类，约 9 KB
categories/<slug>.md     # 子类条目表：id / 码 / 一句话，1–8 KB
entries/<id>.md          # 单条详情：可复制串 + 完整提示词，1–3 KB
catalog.jsonl            # 493 行扁平元数据，grep 精确反查
```

### 两条硬约定

1. **码不能单独用**：MJ 里单挂 `--profile xxx` 不生效，必须前置 vibe 描述串；条目页的「① 码」已是完整可复制串。
2. **混码必须整组用**：115 条 multi 条目，分类页标「混码×N 勿拆」。

## 重建

`INDEX.md`、`SKILL.md`、`categories/`、`entries/`、`catalog.jsonl` 均为生成物，数据源是 `index.html`：

```bash
python3 build_index.py          # 重建
python3 build_index.py --check  # 只校验
```

检索词在 `build_index.py` 的 `KEYWORDS` 中维护，子类新增时补 `SLUGS` 映射。
