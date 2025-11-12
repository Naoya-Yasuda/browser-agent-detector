#!/usr/bin/env python3
"""
PCA次元削減分析の実行スクリプト

このスクリプトは、ベクトル化された商品説明文に対してPCA次元削減を実行し、
結果を可視化します。
"""

from pca_dimension_reduction import PCADimensionReducer, VECTOR_DATA_DIR

def main():
    """メイン実行関数"""
    print("PCA次元削減分析を開始します...")
    
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
    
    print("使用するファイル:")
    print(f"  - ベクトルデータ: {latest_vector_file.name}")
    print(f"  - メタデータ: {latest_metadata_file.name}")
    
    try:
        # PCA次元削減器を初期化
        print("1. PCA次元削減器を初期化中...")
        pca_reducer = PCADimensionReducer(n_components=2)
        
        # データを読み込み
        print("2. ベクトルデータを読み込み中...")
        pca_reducer.load_vector_data(latest_vector_file, latest_metadata_file)
        
        # PCAを適用
        print("3. PCAによる次元削減を実行中...")
        pca_result = pca_reducer.apply_pca()
        
        # 可視化を実行
        print("4. 可視化を実行中...")
        matplotlib_file = pca_reducer.create_matplotlib_visualization()
        
        # 結果を保存
        print("5. 結果を保存中...")
        csv_file = pca_reducer.save_csv_results()
        
        print("\n=== 実行完了 ===")
        print("生成されたファイル:")
        print(f"  - Matplotlib散布図: {matplotlib_file}")
        print(f"  - PCA結果CSV: {csv_file}")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
