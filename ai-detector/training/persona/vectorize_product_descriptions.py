#!/usr/bin/env python3
"""
商品説明文章のベクトル化スクリプト

このスクリプトは、ECサイトの商品カテゴリ説明文をベクトル化し、
機械学習や検索システムで利用できる形式に変換します。
"""

import json
from datetime import datetime
from pathlib import Path
import warnings

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import seaborn as sns
from plotly.subplots import make_subplots
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
warnings.filterwarnings('ignore')

BASE_DIR = Path(__file__).resolve().parent
VECTOR_DATA_DIR = BASE_DIR / "vector_data"

class ProductDescriptionVectorizer:
    """商品説明文のベクトル化クラス"""
    
    def __init__(self, model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'):
        """
        初期化
        
        Args:
            model_name (str): 使用するSentenceTransformerモデル名
        """
        self.model_name = model_name
        self.model = None
        self.product_descriptions = {}
        self.vectors = {}
        self.metadata = {}
        
    def load_model(self):
        """SentenceTransformerモデルを読み込み"""
        print(f"モデルを読み込み中: {self.model_name}")
        self.model = SentenceTransformer(self.model_name)
        print("モデル読み込み完了")
        
    def load_product_descriptions(self):
        """商品説明データを読み込み"""
        # 商品カテゴリとその説明文を定義
        self.product_descriptions = {
            1: {
                "category": "PC・スマートフォン",
                "description": "最新のノートパソコン、デスクトップPC、スマートフォン、タブレット、周辺機器（マウス、キーボード、モニター、プリンター）など、デジタルライフを支えるテクノロジー製品。高性能なCPU、大容量メモリ、高解像度ディスプレイを搭載した最新モデルから、コストパフォーマンスに優れたエントリーモデルまで幅広く取り揃え。"
            },
            2: {
                "category": "家電",
                "description": "生活を豊かにする家電製品。冷蔵庫、洗濯機、エアコン、掃除機、電子レンジ、炊飯器、コーヒーメーカー、空気清浄機、加湿器など、日々の家事を効率化し、快適な生活空間を提供。省エネ機能搭載モデルからスマート家電まで、最新技術を採用した高品質な製品群。"
            },
            3: {
                "category": "本・雑誌",
                "description": "小説、ビジネス書、実用書、専門書、雑誌、漫画、絵本など、知識とエンターテイメントの宝庫。ベストセラーから専門的な学術書まで、あらゆるジャンルの書籍を豊富に取り揃え。電子書籍版も多数用意し、いつでもどこでも読書を楽しめる環境を提供。"
            },
            4: {
                "category": "お菓子・食品",
                "description": "美味しいお菓子、スナック、調味料、飲み物、冷凍食品、缶詰、インスタント食品など、食卓を彩る豊富な食品ラインナップ。有名ブランドから地域特産品まで、品質にこだわった厳選商品。ギフト用の高級お菓子から日常のおやつまで、あらゆるシーンに対応。"
            },
            5: {
                "category": "スポーツ用品",
                "description": "フィットネス、アウトドア、球技、水泳、格闘技など、あらゆるスポーツに対応した用品・用具。ランニングシューズ、ウェア、筋トレ器具、ヨガマット、テニスラケット、ゴルフクラブ、自転車用品など、スポーツライフを充実させる高品質なアイテム。初心者から上級者まで幅広く対応。"
            },
            6: {
                "category": "ペット用品",
                "description": "愛犬・愛猫の健康と快適な生活をサポートするペット用品。フード、おやつ、トイレ用品、おもちゃ、ベッド、ケージ、首輪、リード、シャンプー、ブラシなど、ペットの成長段階やサイズに合わせた豊富な商品ラインナップ。獣医師監修の健康食品も充実。"
            },
            7: {
                "category": "ファッション",
                "description": "トレンドを先取りしたファッションアイテム。メンズ・レディース・キッズ向けの服、靴、バッグ、アクセサリー、時計、下着など、スタイルアップをサポートする豊富な商品。カジュアルからフォーマルまで、シーンに応じたコーディネートが可能。サイズ展開も充実。"
            },
            8: {
                "category": "美容・健康",
                "description": "美しさと健康をサポートするコスメ・スキンケア・ヘアケア・サプリメント・健康器具など。有名ブランドからコスメティックブランドまで、厳選された高品質商品。アンチエイジング、美白、保湿、ダイエットなど、目的別に最適なアイテムを提供。"
            },
            9: {
                "category": "インテリア・家具",
                "description": "住空間を美しく演出するインテリア・家具・雑貨。ソファ、テーブル、チェア、ベッド、収納家具、照明、カーテン、カーペット、観葉植物、アート作品など、理想の住まいを実現する豊富なアイテム。モダンからクラシックまで、様々なスタイルに対応。"
            },
            10: {
                "category": "ゲーム・エンタメ",
                "description": "最新のゲーム機、ゲームソフト、アニメ・映画のDVD・Blu-ray、音楽CD、楽器、カードゲーム、ボードゲームなど、エンターテイメントを満喫できる商品群。人気タイトルから隠れた名作まで、幅広いジャンルをカバー。コレクター向けの限定版も充実。"
            },
            11: {
                "category": "ギフト券",
                "description": "様々なシーンで活用できるギフト券・商品券・プリペイドカード。誕生日、記念日、お祝い、お礼など、大切な人への贈り物に最適。金額設定も自由で、受け取った方の好みに合わせて商品を選べる便利なアイテム。包装サービスも充実。"
            },
            12: {
                "category": "その他",
                "description": "上記カテゴリに分類されない様々な商品。文具、オフィス用品、工具、園芸用品、自動車用品、旅行用品、ベビー用品、介護用品など、生活のあらゆる場面で役立つアイテム。専門性の高い商品から日常的に使用する便利グッズまで幅広く取り揃え。"
            }
        }
        
        print(f"商品説明データを読み込み完了: {len(self.product_descriptions)}カテゴリ")
        
    def vectorize_descriptions(self):
        """商品説明文をベクトル化"""
        if self.model is None:
            raise ValueError("モデルが読み込まれていません。load_model()を先に実行してください。")
            
        print("商品説明文をベクトル化中...")
        
        for category_id, data in self.product_descriptions.items():
            description = data["description"]
            vector = self.model.encode(description)
            self.vectors[category_id] = vector
            
            # メタデータを保存
            self.metadata[category_id] = {
                "category": data["category"],
                "description": description,
                "vector_dimension": int(len(vector)),  # int型に変換
                "vector_norm": float(np.linalg.norm(vector))  # float型に変換
            }
            
        print(f"ベクトル化完了: {len(self.vectors)}カテゴリ")
        
    def calculate_similarity_matrix(self):
        """カテゴリ間の類似度行列を計算"""
        if not self.vectors:
            raise ValueError("ベクトルが生成されていません。vectorize_descriptions()を先に実行してください。")
            
        print("類似度行列を計算中...")
        
        # ベクトルを配列に変換
        vectors_array = np.array(list(self.vectors.values()))
        category_ids = list(self.vectors.keys())
        
        # コサイン類似度を計算
        similarity_matrix = cosine_similarity(vectors_array)
        
        # DataFrameに変換
        similarity_df = pd.DataFrame(
            similarity_matrix,
            index=category_ids,
            columns=category_ids
        )
        
        return similarity_df, category_ids
        
    def save_vectors(self, output_dir: str | Path = VECTOR_DATA_DIR):
        """ベクトルデータを保存"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # ベクトルデータを保存
        vectors_data = {}
        for category_id, vector in self.vectors.items():
            vectors_data[category_id] = {
                "vector": vector.astype(float).tolist(),  # float32をfloatに変換
                "metadata": self.metadata[category_id]
            }
            
        vectors_file = output_path / f"product_vectors_{timestamp}.json"
        with vectors_file.open('w', encoding='utf-8') as f:
            json.dump(vectors_data, f, ensure_ascii=False, indent=2)
            
        # メタデータを保存
        metadata_file = output_path / f"product_metadata_{timestamp}.json"
        with metadata_file.open('w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
            
        # 類似度行列を保存
        similarity_df, category_ids = self.calculate_similarity_matrix()
        similarity_file = output_path / f"similarity_matrix_{timestamp}.csv"
        similarity_df.to_csv(similarity_file, encoding='utf-8')
        
        print(f"データ保存完了:")
        print(f"  - ベクトルデータ: {vectors_file}")
        print(f"  - メタデータ: {metadata_file}")
        print(f"  - 類似度行列: {similarity_file}")
        
        return vectors_file, metadata_file, similarity_file
        
    def visualize_similarity(self, output_dir: str | Path = VECTOR_DATA_DIR):
        """類似度の可視化"""
        similarity_df, category_ids = self.calculate_similarity_matrix()
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # カテゴリ名を取得
        category_names = [self.metadata[cat_id]["category"] for cat_id in category_ids]
        
        # ヒートマップを作成
        plt.figure(figsize=(12, 10))
        sns.heatmap(
            similarity_df,
            annot=True,
            cmap='YlOrRd',
            xticklabels=category_names,
            yticklabels=category_names,
            fmt='.3f'
        )
        plt.title('商品カテゴリ間の類似度マトリックス', fontsize=16, pad=20)
        plt.xlabel('カテゴリ', fontsize=12)
        plt.ylabel('カテゴリ', fontsize=12)
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        # 保存
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        heatmap_file = output_path / f"similarity_heatmap_{timestamp}.png"
        plt.savefig(heatmap_file, dpi=300, bbox_inches='tight')
        plt.show()
        
        # インタラクティブな可視化
        fig = px.imshow(
            similarity_df.values,
            x=category_names,
            y=category_names,
            color_continuous_scale='YlOrRd',
            title='商品カテゴリ間の類似度マトリックス（インタラクティブ）',
            labels={'color': '類似度'}
        )
        
        interactive_file = output_path / f"similarity_interactive_{timestamp}.html"
        fig.write_html(str(interactive_file))
        
        print(f"可視化ファイル保存完了:")
        print(f"  - ヒートマップ: {heatmap_file}")
        print(f"  - インタラクティブ: {interactive_file}")
        
        return heatmap_file, interactive_file
        
    def analyze_vectors(self):
        """ベクトルの分析"""
        if not self.vectors:
            raise ValueError("ベクトルが生成されていません。")
            
        print("ベクトル分析を実行中...")
        
        # ベクトルの次元数
        vector_dim = len(list(self.vectors.values())[0])
        print(f"ベクトル次元数: {vector_dim}")
        
        # 各ベクトルのノルム
        norms = [np.linalg.norm(vector) for vector in self.vectors.values()]
        print(f"ベクトルノルム - 平均: {np.mean(norms):.4f}, 標準偏差: {np.std(norms):.4f}")
        
        # 類似度統計
        similarity_df, _ = self.calculate_similarity_matrix()
        # 対角成分（自己類似度）を除く
        mask = np.ones_like(similarity_df, dtype=bool)
        np.fill_diagonal(mask, False)
        similarities = similarity_df.values[mask]
        
        print(f"カテゴリ間類似度 - 平均: {np.mean(similarities):.4f}, 標準偏差: {np.std(similarities):.4f}")
        print(f"最大類似度: {np.max(similarities):.4f}, 最小類似度: {np.min(similarities):.4f}")
        
        # 最も類似度の高いペアを特定
        max_sim_idx = np.unravel_index(np.argmax(similarities), similarities.shape)
        category_ids = list(self.vectors.keys())
        
        print(f"最も類似度の高いカテゴリペア:")
        if max_sim_idx[0] < len(category_ids) and max_sim_idx[1] < len(category_ids):
            print(f"  - {self.metadata[category_ids[max_sim_idx[0]]]['category']} と {self.metadata[category_ids[max_sim_idx[1]]]['category']}")
            print(f"  - 類似度: {np.max(similarities):.4f}")
        else:
            print(f"  - インデックスエラー: {max_sim_idx}")
            print(f"  - 類似度: {np.max(similarities):.4f}")
        
        return {
            "vector_dimension": vector_dim,
            "vector_norms": norms,
            "similarity_stats": {
                "mean": np.mean(similarities),
                "std": np.std(similarities),
                "max": np.max(similarities),
                "min": np.min(similarities)
            }
        }

def main():
    """メイン実行関数"""
    print("=== 商品説明文ベクトル化システム ===")
    
    # ベクトライザーを初期化
    vectorizer = ProductDescriptionVectorizer()
    
    # モデルを読み込み
    vectorizer.load_model()
    
    # 商品説明データを読み込み
    vectorizer.load_product_descriptions()
    
    # ベクトル化を実行
    vectorizer.vectorize_descriptions()
    
    # ベクトル分析を実行
    analysis_results = vectorizer.analyze_vectors()
    
    # データを保存
    vectors_file, metadata_file, similarity_file = vectorizer.save_vectors()
    
    # 可視化を実行
    heatmap_file, interactive_file = vectorizer.visualize_similarity()
    
    print("\n=== 実行完了 ===")
    print("生成されたファイル:")
    print(f"  - ベクトルデータ: {vectors_file}")
    print(f"  - メタデータ: {metadata_file}")
    print(f"  - 類似度行列: {similarity_file}")
    print(f"  - ヒートマップ: {heatmap_file}")
    print(f"  - インタラクティブ可視化: {interactive_file}")

if __name__ == "__main__":
    main()
