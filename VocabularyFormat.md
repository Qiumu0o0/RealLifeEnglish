# 词库导入格式

`ColesFruitVocabulary.json` 为 UTF-8 JSON 数组，含29个词，每项仅包含 `english` 和 `chinese`。

```json
[{"english": "Avocados", "chinese": "牛油果／鳄梨"}]
```

单复数合并为一张词卡，暂取商品列表首次出现的形式。不同商品形式见 [单复数差异](WordFormDifferences.md)。应用兼容旧词库及学习记录。

其他字段暂时停用，完整数据保存在 `ColesFruitVocabulary.full.json`，可用于恢复。
