-- 初期データ投入用（必要なときだけ実行）

-- ユーザー（テスト用）
INSERT INTO users (email, password_hash, age, occupation, member_rank)
VALUES
  ('student@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 22, 'student', 'bronze'),
  ('office@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 35, 'office', 'silver'),
  ('tech@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 42, 'tech', 'gold');

-- 商品
INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES
('スマートフォン X', 1, 2, 89800, 50, 0, '/images/smartphone.jpg', '最新のスマートフォン'),
('ノートパソコン Pro', 1, 2, 158000, 30, 0, '/images/laptop.jpg', 'プロフェッショナル向けノートパソコン'),
('限定デザインスニーカー', 7, 17, 25800, 5, 1, '/images/sneaker.jpg', '数量限定のスニーカー'),
('コレクターズエディションフィギュア', 12, 18, 45000, 3, 1, '/images/figure.jpg', '希少なコレクターズアイテム'),
('ちゃぶ台', 9, 10, 25000, 15, 0, '/images/ちゃぶ台.png', '伝統的な日本のちゃぶ台。家族団らんに最適です。'),
('カジュアル洋服セット', 7, 11, 8500, 25, 0, '/images/洋服.png', '日常使いにぴったりのカジュアルな洋服セット。'),
('プレミアムペットフード', 6, 12, 3200, 40, 0, '/images/ペットの餌.png', '愛犬・愛猫の健康を考えたプレミアムフード。'),
('高級口紅', 8, 13, 4500, 20, 0, '/images/口紅.png', '長時間持続する高級口紅。豊富なカラーバリエーション。'),
('手作りお菓子セット', 4, 14, 1800, 30, 0, '/images/お菓子.png', '職人が手作りした美味しいお菓子の詰め合わせ。'),
('省エネ洗濯機', 2, 15, 85000, 8, 0, '/images/洗濯機.png', '最新の省エネ技術を搭載した高性能洗濯機。'),
('日本史の本', 3, 16, 2200, 35, 0, '/images/歴史の本.png', '日本の歴史を詳しく解説した学習書。'),
('限定品スニーカー', 7, 19, 25800, 5, 1, '/images/限定品スニーカー.png', '数量限定のプレミアムスニーカー。希少なデザインと高品質な素材を使用。');
