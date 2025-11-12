# 商品説明ベクトル化システム

このシステムは、商品カテゴリの説明文をベクトル化し、次元削減と可視化を行うためのツールです。

## 機能

1. **商品説明のベクトル化**: Sentence Transformersを使用して商品説明文を384次元のベクトルに変換
2. **2次元までの次元圧縮**: PCAを使用して2次元まで次元削減
3. **結果の可視化**: カテゴリごとにPC1PC2を可視化、次元削減後の2次元ベクトル（PC1, PC2）

## ファイル構成

### メインファイル
- `vectorize_product_descriptions.py`: 商品説明のベクトル化メインスクリプト
- `run_vectorization.py`: ベクトル化の実行スクリプト
- `pca_dimension_reduction.py`: PCA次元削減と可視化スクリプト
- `run_pca_analysis.py`: PCA分析の実行スクリプト

### データファイル
- `vector_data_definition.md`: 商品カテゴリの定義ファイル
- `vector_data/`: ベクトル化結果の保存ディレクトリ（`training/persona/` 配下に自動生成）

### 設定ファイル
- `requirements.txt`: 必要なPythonパッケージ
- `README.md`: このファイル
- `fonts/`: 初回実行時に自動ダウンロードされる日本語フォント格納ディレクトリ（SIL Open Font License 1.1 で配布される Noto Sans CJK を保存）

## セットアップ

1. 依存関係を同期（リポジトリルートまたは `ai-detector/` 直下で実行）:
```bash
cd ai-detector
uv sync --group train --group vector --extra cpu
```
  - CUDA GPU 環境の場合は `--extra gpu` を指定すると GPU 版 PyTorch が自動で選択されます。

2. ベクトル化を実行:
```bash
uv run python training/persona/run_vectorization.py
```

3. PCA次元削減と可視化を実行:
```bash
uv run python training/persona/run_pca_analysis.py
```

## 使用方法

### 1. 商品説明のベクトル化

```bash
uv run python training/persona/run_vectorization.py
```

このコマンドにより以下が実行されます:
- 商品カテゴリの説明文を読み込み
- Sentence Transformersでベクトル化
- ベクトルデータとメタデータをJSON形式で保存

### 2. 次元削減と可視化

```bash
uv run python training/persona/run_pca_analysis.py
```

このコマンドにより以下が実行されます:
- ベクトルデータを読み込み
- PCAで2次元まで次元削減
- カテゴリごとのPC1, PC2を可視化

> **補足**: すべての成果物 (`vector_data/`, `pca_results/`) は実行場所に関わらず `training/persona/` 配下に保存されます。リポジトリ直下に同名ディレクトリが増殖することはありません。

## 出力ファイル

### ベクトル化結果
- `training/persona/vector_data/product_vectors_YYYYMMDD_HHMMSS.json`: ベクトルデータ
- `training/persona/vector_data/product_metadata_YYYYMMDD_HHMMSS.json`: メタデータ

### 可視化結果
- `training/persona/pca_results/scatter_plot_matplotlib.png`: Matplotlib散布図
- `training/persona/pca_results/scatter_plot_seaborn.png`: Seaborn散布図
- `training/persona/pca_results/interactive_plot.html`: インタラクティブなPlotly可視化
- `training/persona/pca_results/variance_ratio_plot.png`: 分散比プロット
- `training/persona/pca_results/pca_analysis_results.csv`: 分析結果CSV
- `training/persona/pca_results/pca_analysis_results.json`: 分析結果JSON

## 技術仕様

### 使用ライブラリ
- **Sentence Transformers**: `paraphrase-multilingual-MiniLM-L12-v2`
- **次元削減**: PCA (Principal Component Analysis)
- **可視化**: Matplotlib, Seaborn, Plotly
- **データ処理**: NumPy, Pandas, scikit-learn

### ベクトル仕様
- **入力**: 商品カテゴリの説明文（日本語）
- **出力**: 384次元のベクトル
- **次元削減**: 2次元（PC1, PC2）

## トラブルシューティング

### よくある問題

1. **ModuleNotFoundError**: 依存関係が同期されていない
   ```bash
   cd ai-detector
   uv sync --group train --group vector --extra cpu   # GPU の場合は --extra gpu
   ```

2. **ファイルが見つからない**: ベクトル化が実行されていない
   ```bash
   uv run python training/persona/run_vectorization.py
   ```

3. **メモリエラー**: 大きなデータセットの場合、メモリ不足が発生する可能性があります
4. **日本語フォントの警告**: 初回実行時に `fonts/` 配下へ Noto Sans CJK を自動ダウンロードします。ネットワーク制限で失敗する場合はフォントファイルを手動で配置するか、`pca_dimension_reduction.py` の候補リストを編集してください。

## カスタマイズ

### 商品カテゴリの追加・変更
`vector_data_definition.md`ファイルを編集して商品カテゴリを追加・変更できます。

### 可視化のカスタマイズ
`pca_dimension_reduction.py`ファイル内の可視化設定を変更できます。
