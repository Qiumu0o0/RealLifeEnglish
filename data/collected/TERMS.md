# 核心词与图片处理状态

本目录是本次扩大采集的工作数据，不是已经全部导入 APP 的词库。

- `term-translations.tsv`：核心词提取及中文释义规则。没有每类 20 词限制，但规则匹配本身不代表语义上的穷尽提取。
- `term-candidates.json`：在实际采集商品名中命中的中英文词条候选；保留原商品出现的词形、规格、来源页、代表商品链接与图片状态。
- `term-form-differences.json`：同一提取规则在商品名中出现的不同单复数形式；候选不按单复数重复拆词。
- `unobserved-terms.json`：没有在本次原始清单中命中的规则。不会凭这些规则编造商品或导入词卡。
- `rejected-term-matches.json`：已剔除的明显歧义匹配，例如 Cherry Tomatoes 不能用作 Cherries（樱桃）、Oyster Blade 牛肉不能用作 Oysters（生蚝）。
- `product-links.json`、`links/`：从实际商品锚点解析出的链接，无法解析的记录明确保留空值。
- `image-downloads.json`：由已观察商品链接中的 ID 生成的图片候选地址，不声称候选地址一定可用。
- `image-download-results.json`：图片实际下载结果及成功地址；响应必须通过图片文件头校验。
- `images/`：下载成功的原始商品图片。同一商品共用图片，不用同类的其他图片替代缺失图。
- `terms-summary.json`：候选及图片数量，明确是否接入 APP。

## 待审核项

商品名中的词可能只是配料、口味或包装的一部分。例如出现 Sweet Potato 的商品也可能是一碗红薯沙拉；出现 Pads 的商品也可能是化妆棉而非卫生巾。代表图是该商品的图片，**不表示已确认其为核心词的最佳配图**。因此所有新候选保持 `review_status: candidate`，不自动覆盖用户正在学习的正式词库和云端进度。

需要完成核心词语义审核、同义词及已有词条去重、图片对应审核后，再同步修改各分类的正式 `vocabulary.json`、`images.json`、`sources.json` 并重新构建 APP。当前原始清单仍有缺页，不能称作 Coles 全量词库。

## 重建

1. `node scripts/audit-coles-collection.mjs`
2. `node scripts/extract-coles-terms.mjs`
3. `node scripts/build-collected-assets.mjs`
4. `node scripts/download-category-images.mjs data/collected/image-downloads.json data/collected/image-download-results.json`
5. 再次运行步骤 3，将实际下载结果写入候选。

原有分类数据及 APP 不受上述脚本修改。
