#!/usr/bin/env python3
"""
PCA（Principal Component Analysis）による次元削減と可視化

このスクリプトは、ベクトル化された商品説明文をPCAで2次元に削減し、
商品カテゴリを判例として可視化します。
"""

import json
from datetime import datetime
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlretrieve
import warnings

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib import font_manager as fm
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
warnings.filterwarnings('ignore')

# 日本語フォント候補
JP_FONT_CANDIDATES = [
    "Hiragino Sans",
    "Yu Gothic",
    "Meiryo",
    "Takao",
    "IPAexGothic",
    "IPAPGothic",
    "VL PGothic",
    "Noto Sans CJK JP",
    "Noto Sans CJK JP Regular",
    "Noto Sans CJK JP Medium",
]

BASE_DIR = Path(__file__).resolve().parent
VECTOR_DATA_DIR = BASE_DIR / "vector_data"
PCA_RESULTS_DIR = BASE_DIR / "pca_results"
_FONT_DIR = BASE_DIR / "fonts"
_FONT_FILENAME = "NotoSansCJKjp-Regular.otf"
_FONT_URL = "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf"


def _ensure_local_font() -> Path | None:
    """リポジトリ内の fonts ディレクトリに日本語フォントを配置する。"""
    font_path = _FONT_DIR / _FONT_FILENAME
    if font_path.exists():
        return font_path

    _FONT_DIR.mkdir(parents=True, exist_ok=True)
    try:
        print("日本語フォントをダウンロード中...")
        urlretrieve(_FONT_URL, font_path)
        return font_path
    except URLError as exc:
        print(f"警告: 日本語フォントのダウンロードに失敗しました ({exc}).")
        if font_path.exists():
            font_path.unlink(missing_ok=True)
        return None


def _configure_japanese_font() -> None:
    """利用可能な日本語フォントを探索して設定する。"""
    for font_name in JP_FONT_CANDIDATES:
        try:
            fm.findfont(font_name, fallback_to_default=False)
        except ValueError:
            continue
        plt.rcParams["font.family"] = font_name
        return

    local_font = _ensure_local_font()
    if local_font and local_font.exists():
        try:
            font_prop = fm.FontProperties(fname=str(local_font))
            fm.fontManager.addfont(str(local_font))
            plt.rcParams["font.family"] = font_prop.get_name()
            return
        except Exception:
            pass

    if _FONT_DIR.is_dir():
        for entry in sorted(_FONT_DIR.iterdir()):
            if not entry.is_file():
                continue
            try:
                font_prop = fm.FontProperties(fname=str(entry))
                fm.fontManager.addfont(str(entry))
                plt.rcParams["font.family"] = font_prop.get_name()
                return
            except Exception:
                continue

    # 見つからない場合のフォールバック
    plt.rcParams["font.family"] = "DejaVu Sans"
    print(
        "警告: 日本語フォントが見つからなかったため DejaVu Sans を使用します。"
        "日本語表示を改善したい場合は Noto Sans CJK JP などをインストールしてください。"
    )


_configure_japanese_font()

class PCADimensionReducer:
    """PCAによる次元削減クラス"""
    
    def __init__(self, n_components=2):
        """
        初期化
        
        Args:
            n_components (int): 削減後の次元数（デフォルト: 2）
        """
        self.n_components = n_components
        self.pca = PCA(n_components=n_components)
        self.scaler = StandardScaler()
        self.vectors = None
        self.labels = None
        self.categories = None
        self.pca_result = None
        self.metadata = None
        
    def load_vector_data(self, vectors_file, metadata_file):
        """ベクトルデータとメタデータを読み込み"""
        print("ベクトルデータを読み込み中...")
        
        # ベクトルデータを読み込み
        with open(vectors_file, 'r', encoding='utf-8') as f:
            vectors_data = json.load(f)
        
        # メタデータを読み込み
        with open(metadata_file, 'r', encoding='utf-8') as f:
            self.metadata = json.load(f)
        
        # データを準備
        vectors_list = []
        labels_list = []
        categories_list = []
        
        for category_id, data in vectors_data.items():
            vector = np.array(data['vector'])
            category_name = self.metadata[category_id]['category']
            
            vectors_list.append(vector)
            labels_list.append(int(category_id))
            categories_list.append(category_name)
        
        self.vectors = np.array(vectors_list)
        self.labels = np.array(labels_list)
        self.categories = categories_list
        
        print(f"データ読み込み完了: {len(self.vectors)}サンプル, {self.vectors.shape[1]}次元")
        
    def apply_pca(self):
        """PCAを適用して次元削減"""
        print(f"PCAによる次元削減を実行中... ({self.vectors.shape[1]}次元 → {self.n_components}次元)")
        
        # データを標準化
        vectors_scaled = self.scaler.fit_transform(self.vectors)
        
        # PCAを適用
        self.pca_result = self.pca.fit_transform(vectors_scaled)
        
        print("PCA適用完了")
        print(f"説明分散比: {self.pca.explained_variance_ratio_}")
        print(f"累積説明分散比: {np.cumsum(self.pca.explained_variance_ratio_)}")
        
        return self.pca_result
    
    def create_matplotlib_visualization(self, output_dir=PCA_RESULTS_DIR):
        """Matplotlib散布図を作成"""
        if self.pca_result is None:
            raise ValueError("PCAが適用されていません。")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 散布図を作成
        plt.figure(figsize=(12, 8))
        
        # カテゴリごとに色分けしてプロット
        colors = plt.cm.Set3(np.linspace(0, 1, len(self.categories)))
        
        for i, (category, color) in enumerate(zip(self.categories, colors)):
            mask = self.labels == (i + 1)
            plt.scatter(self.pca_result[mask, 0], self.pca_result[mask, 1], 
                       c=[color], label=category, s=100, alpha=0.7, edgecolors='black')
        
        plt.xlabel(f'PC1 ({self.pca.explained_variance_ratio_[0]:.1%})', fontsize=12)
        plt.ylabel(f'PC2 ({self.pca.explained_variance_ratio_[1]:.1%})', fontsize=12)
        plt.title('商品カテゴリのPCA次元削減結果', fontsize=14, fontweight='bold')
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.grid(True, alpha=0.3)
        
        # ファイルを保存
        output_file = output_dir / f"pca_scatter_matplotlib_{timestamp}.png"
        plt.tight_layout()
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"Matplotlib散布図保存完了: {output_file}")
        return output_file
    
    def save_csv_results(self, output_dir=PCA_RESULTS_DIR):
        """PCA結果をCSVファイルで保存"""
        if self.pca_result is None:
            raise ValueError("PCAが適用されていません。")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 結果をDataFrameに変換
        results_data = []
        for i, (pc1, pc2) in enumerate(self.pca_result):
            results_data.append({
                'PC1': pc1,
                'PC2': pc2,
                'Category': self.categories[i],
                'Category_ID': self.labels[i]
            })
        
        df = pd.DataFrame(results_data)
        
        # CSVファイルを保存
        csv_file = output_dir / f"pca_results_{timestamp}.csv"
        df.to_csv(csv_file, index=False, encoding='utf-8')
        
        print(f"PCA結果CSV保存完了: {csv_file}")
        return csv_file

def main():
    """メイン実行関数"""
    print("=== PCA次元削減と可視化システム ===")
    
    # 最新のベクトルデータファイルを検索
    vector_data_dir = VECTOR_DATA_DIR
    if not vector_data_dir.exists():
        print(f"エラー: {vector_data_dir}ディレクトリが見つかりません。")
        return
    
    # 最新のファイルを検索
    vector_files = sorted(vector_data_dir.glob('product_vectors_*.json'))
    metadata_files = sorted(vector_data_dir.glob('product_metadata_*.json'))
    
    if not vector_files or not metadata_files:
        print("エラー: ベクトルデータファイルが見つかりません。")
        return
    
    # 最新のファイルを選択
    latest_vector_file = vector_files[-1]
    latest_metadata_file = metadata_files[-1]
    
    print(f"使用するファイル:")
    print(f"  - ベクトルデータ: {latest_vector_file.name}")
    print(f"  - メタデータ: {latest_metadata_file.name}")
    
    # PCA次元削減器を初期化
    pca_reducer = PCADimensionReducer(n_components=2)
    
    # データを読み込み
    pca_reducer.load_vector_data(latest_vector_file, latest_metadata_file)
    
    # PCAを適用
    pca_result = pca_reducer.apply_pca()
    
    # 可視化を作成
    print("5. 可視化を実行中...")
    matplotlib_file = pca_reducer.create_matplotlib_visualization()
    
    # 結果を保存
    print("6. 結果を保存中...")
    csv_file = pca_reducer.save_csv_results()
    
    print("\n=== 実行完了 ===")
    print("生成されたファイル:")
    print(f"  - Matplotlib散布図: {matplotlib_file}")
    print(f"  - PCA結果CSV: {csv_file}")

if __name__ == "__main__":
    main()
