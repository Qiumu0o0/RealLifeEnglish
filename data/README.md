# Coles 分类词库

2026-10-18 整理首批数据：17个分类含313条新词记录；保留29条已有水果词条，共342条分类记录、341张本地图片。跨分类相同词没有去重，因语境或含义可能不同。

## 数据范围

这是从搜索工具可读的 Coles 分类页快照中选取的首批词库，不是 Coles 全部商品，也不是实时库存。每类检查快照前48个商品条目，优先选取不同核心词，最多选20条新词；果蔬类另外保留原29个水果词。部分分类不足20条。International Foods 来源为其 Asian Foods 子分类，不能代表整个国际食品范围；Pet 使用排序参数页面快照。

烟草分类快照未提供具体商品信息，目录内词库为空；不编造商品名或图片。具体商品来源另存，图片直接从 Coles 图片服务器下载，所有本地图片经过解码校验。

| 分类目录 | 中文 | 词条数 |
| --- | --- | --- |
| [meat-seafood](meat-seafood/vocabulary.json) | 肉类与海鲜 | 20 |
| [fruit-vegetables](fruit-vegetables/vocabulary.json) | 果蔬 | 49 |
| [dairy-eggs-fridge](dairy-eggs-fridge/vocabulary.json) | 乳制品、蛋与冷藏食品 | 20 |
| [bakery](bakery/vocabulary.json) | 烘焙 | 20 |
| [deli](deli/vocabulary.json) | 熟食 | 20 |
| [pantry](pantry/vocabulary.json) | 食品杂货 | 20 |
| [chips-chocolates-snacks](chips-chocolates-snacks/vocabulary.json) | 薯片、巧克力与零食 | 15 |
| [international-foods](international-foods/vocabulary.json) | 国际食品 | 20 |
| [health-dietary](health-dietary/vocabulary.json) | 健康及特殊饮食 | 20 |
| [drinks](drinks/vocabulary.json) | 饮料 | 14 |
| [liquorland](liquorland/vocabulary.json) | 酒类 | 19 |
| [frozen](frozen/vocabulary.json) | 冷冻食品 | 20 |
| [cleaning-laundry](cleaning-laundry/vocabulary.json) | 清洁与洗衣 | 20 |
| [health-beauty](health-beauty/vocabulary.json) | 保健与美妆 | 20 |
| [baby](baby/vocabulary.json) | 母婴 | 20 |
| [pet](pet/vocabulary.json) | 宠物 | 8 |
| [home-garden](home-garden/vocabulary.json) | 家居与园艺 | 17 |
| [tobacco](tobacco/vocabulary.json) | 烟草 | 0 |

## 每类文件

- `vocabulary.json`：仅包含 `english`、`chinese` 的词条数组，保持既有词库格式。
- `images.json`：英文小写核心词到本分类本地图片路径的映射。
- `images/`：已下载商品图。
- `sources.json`：词条对应的完整商品名、规格、商品链接及图片来源候选地址。
- `catalog-snapshot.json`：保存快照中前48个商品的名称及规格，标注非全量、非实时。

实际成功的图片下载地址见 [`image-download-results.json`](image-download-results.json)，下载输入见 [`image-downloads.json`](image-downloads.json)。现有水果图片来源见对应分类的 `sources.json`。

## 单复数与导入

相同核心词的单复数不拆成多个卡片，保留首次选中商品的形式。已发现的差异见 [词形说明](word-form-differences.md)。商品中 Yogurt/Yoghurt 的拼写差异也在同类内合并。

各类别独立保留语境，例如零食类 Potato Chips 译为薯片，冷冻类则译为薯条。图片是对应商品包装或商品实物，不一定为纯食材照片。Melon 沿用已有 Rockmelon 代表图，因此果蔬类49个词共48张图。

v1.2.0 起，网页版及 Android APP 已接入所有分类数据和对应图片。可切换分类或选择全部学习；相同英文及中文释义共用掌握状态，全部分类中合并重复卡片。烟草分类显示暂无词条。导入已知词汇时会自动匹配图片，未知词汇仍可文字学习。

运行 `node scripts/build-catalog.mjs` 生成 `data/app-catalog.js`，网页通过 `app.js` 使用此词库；Android 构建会自动生成并将词库和图片打包离线使用。

v1.2.2 起，请先运行 `python scripts/build-image-assets.py` 生成缩略图和映射，再生成分类词库。`data/app-images/` 为网页缩略图，`data/app-images.js` 为 APK 内置图片数据；原始图片不变。

## 维护

`node scripts/download-category-images.mjs` 可按已核实商品链接生成的下载清单补齐图片；脚本不获取实时商品列表。`python scripts/validate-category-data.py` 校验词库结构、重复词和图片可解码性（需要 Pillow）。
