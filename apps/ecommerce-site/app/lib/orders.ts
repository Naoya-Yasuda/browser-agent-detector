import { openDb } from './db';
import { getUserCart, clearCart, CartItem } from './cart';
import { decreaseProductStock } from './products';
import { SECURITY_SUITE_LABEL } from './security';

// 注文型定義
export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  security_mode: string | null;
  bot_score: number | null;
  security_action: string | null;
  created_at: string;
}

// 注文詳細型定義
export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  created_at: string;
  // 商品情報（結合）
  product_name?: string;
  product_image_path?: string | null;
}

/**
 * カートから注文を作成する
 * @param userId ユーザーID
 * @param securityInfo セキュリティ情報（オプション）
 */
export async function createOrderFromCart(
  userId: number,
  securityInfo?: {
    botScore?: number;
    securityAction?: string;
  }
): Promise<number | null> {
  const db = await openDb();

  try {
    // トランザクション開始
    await db.run('BEGIN TRANSACTION');

    // カート内商品を取得
    const cartItems = await getUserCart(userId);
    console.log('createOrderFromCart: カート内商品取得', { userId, cartItemCount: cartItems.length, cartItems });

    if (cartItems.length === 0) {
      // カートが空
      console.log('createOrderFromCart: カートが空のためnullを返します');
      await db.run('ROLLBACK');
      return null;
    }

    // 合計金額を計算
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);

    // 注文レコード作成
    const orderResult = await db.run(
      `INSERT INTO orders
       (user_id, total_amount, status, security_mode, bot_score, security_action)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        totalAmount,
        'pending',
        SECURITY_SUITE_LABEL,
        securityInfo?.botScore || null,
        securityInfo?.securityAction || null
      ]
    );

    if (!orderResult.lastID) {
      await db.run('ROLLBACK');
      return null;
    }

    const orderId = orderResult.lastID;

    // 注文商品を作成
    for (const item of cartItems) {
      // 在庫確認・更新（同じトランザクション内で実行）
      const product = await db.get(
        'SELECT stock_quantity FROM products WHERE id = ?',
        [item.product_id]
      );

      if (!product || product.stock_quantity < item.quantity) {
        // 在庫不足
        console.log('createOrderFromCart: 在庫不足のためnullを返します', { productId: item.product_id, quantity: item.quantity, currentStock: product?.stock_quantity });
        await db.run('ROLLBACK');
        return null;
      }

      // 在庫を減少
      const newQuantity = product.stock_quantity - item.quantity;
      const stockResult = await db.run(
        'UPDATE products SET stock_quantity = ? WHERE id = ?',
        [newQuantity, item.product_id]
      );

      if (!stockResult.changes || stockResult.changes === 0) {
        console.log('createOrderFromCart: 在庫更新に失敗しました', { productId: item.product_id });
        await db.run('ROLLBACK');
        return null;
      }

      // 注文商品レコード作成
      const itemResult = await db.run(
        `INSERT INTO order_items
         (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.product?.price || 0
        ]
      );

      if (!itemResult.lastID) {
        await db.run('ROLLBACK');
        return null;
      }
    }

    // ユーザーの購入統計を更新
    await db.run(
      `UPDATE users
       SET total_orders = total_orders + 1,
           total_spent = total_spent + ?,
           last_purchase_date = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [totalAmount, userId]
    );

    // カートを空にする（同じトランザクション内で実行）
    await db.run(
      'DELETE FROM cart_items WHERE user_id = ?',
      [userId]
    );

    // トランザクション完了
    await db.run('COMMIT');

    return orderId;
  } catch (error) {
    // エラー時はロールバック
    await db.run('ROLLBACK');
    console.error('注文作成エラー:', error);
    return null;
  } finally {
    await db.close();
  }
}

/**
 * ユーザーの注文履歴を取得
 * @param userId ユーザーID
 */
export async function getUserOrders(userId: number): Promise<Order[]> {
  const db = await openDb();

  try {
    const orders = await db.all(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return orders;
  } catch (error) {
    console.error('注文履歴取得エラー:', error);
    return [];
  } finally {
    await db.close();
  }
}

/**
 * 注文詳細を取得
 * @param orderId 注文ID
 * @param userId ユーザーID（本人確認用）
 */
export async function getOrderDetails(orderId: number, userId: number): Promise<{order: Order, items: OrderItem[]} | null> {
  const db = await openDb();

  try {
    // 注文基本情報を取得
    const order = await db.get(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (!order) {
      return null;
    }

    // 注文商品を取得
    const items = await db.all(
      `SELECT oi.*, p.name as product_name, p.image_path as product_image_path
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?
       ORDER BY oi.id`,
      [orderId]
    );

    return { order, items };
  } catch (error) {
    console.error('注文詳細取得エラー:', error);
    return null;
  } finally {
    await db.close();
  }
}

/**
 * 注文ステータスを更新
 * @param orderId 注文ID
 * @param userId ユーザーID（本人確認用）
 * @param status 新しいステータス
 */
export async function updateOrderStatus(orderId: number, userId: number, status: string): Promise<boolean> {
  const db = await openDb();

  try {
    // 本人の注文かチェック
    const order = await db.get(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (!order) {
      return false;
    }

    // ステータス更新
    const result = await db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );

    return result.changes !== undefined && result.changes > 0;
  } catch (error) {
    console.error('注文ステータス更新エラー:', error);
    return false;
  } finally {
    await db.close();
  }
}
