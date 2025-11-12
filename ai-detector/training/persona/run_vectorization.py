#!/usr/bin/env python3
"""
商品説明文ベクトル化の実行スクリプト

このスクリプトは、商品説明文のベクトル化を実行し、
結果を確認するためのシンプルなインターフェースを提供します。
"""

import sys
import os
import numpy as np
from vectorize_product_descriptions import ProductDescriptionVectorizer

def main():
    """メイン実行関数"""
    print("商品説明文ベクトル化を開始します...")
    
    try:
        # ベクトライザーを初期化
        vectorizer = ProductDescriptionVectorizer()
        
        # モデルを読み込み
        print("1. モデルを読み込み中...")
        vectorizer.load_model()
        
        # 商品説明データを読み込み
        print("2. 商品説明データを読み込み中...")
        vectorizer.load_product_descriptions()
        
        # ベクトル化を実行
        print("3. ベクトル化を実行中...")
        vectorizer.vectorize_descriptions()
        
        # ベクトル分析を実行
        print("4. ベクトル分析を実行中...")
        analysis_results = vectorizer.analyze_vectors()
        
        # データを保存
        print("5. データを保存中...")
        vectors_file, metadata_file, similarity_file = vectorizer.save_vectors()
        
        # 可視化を実行
        print("6. 可視化を実行中...")
        heatmap_file, interactive_file = vectorizer.visualize_similarity()
        
        print("\n=== 実行完了 ===")
        print("生成されたファイル:")
        print(f"  - ベクトルデータ: {vectors_file}")
        print(f"  - メタデータ: {metadata_file}")
        print(f"  - 類似度行列: {similarity_file}")
        print(f"  - ヒートマップ: {heatmap_file}")
        print(f"  - インタラクティブ可視化: {interactive_file}")
        
        print("\n分析結果:")
        print(f"  - ベクトル次元数: {analysis_results['vector_dimension']}")
        print(f"  - ベクトルノルム平均: {np.mean(analysis_results['vector_norms']):.4f}")
        print(f"  - 類似度平均: {analysis_results['similarity_stats']['mean']:.4f}")
        print(f"  - 類似度最大: {analysis_results['similarity_stats']['max']:.4f}")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
