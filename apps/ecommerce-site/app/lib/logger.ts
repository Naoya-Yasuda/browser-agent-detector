import { openDb } from './db';

// セキュリティイベントをログに記録
export function logSecurityEvent(event: {
  sessionId: string;
  userId?: number | null;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  securityMode: string;
  botScore?: number | null;
  riskLevel?: string | null;
  actionTaken: string;
  detectionReasons?: any;
  processingTimeMs?: number | null;
}) {
  // JSON形式でコンソール出力（Edge Runtime向け）
  console.log('[security-log]', JSON.stringify(event));
  
  // データベースにも記録
  (async () => {
    try {
      const db = await openDb();
      
      await db.run(`
        INSERT INTO security_logs 
        (session_id, user_id, ip_address, user_agent, request_path, request_method, 
         security_mode, bot_score, risk_level, action_taken, detection_reasons, processing_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.sessionId,
        event.userId || null,
        event.ipAddress || '',
        event.userAgent || '',
        event.requestPath || '',
        event.requestMethod || '',
        event.securityMode,
        event.botScore || null,
        event.riskLevel || null,
        event.actionTaken,
        JSON.stringify(event.detectionReasons || {}),
        event.processingTimeMs || null
      ]);
      
      await db.close();
    } catch (error) {
      console.error('セキュリティログのDB記録エラー:', error);
    }
  })();
}

// アプリケーションエラーをログに記録
export function logAppError(message: string, error: any) {
  const errorDetails = error instanceof Error ? error.stack || error.message : JSON.stringify(error);
  console.error('[app-error]', message, errorDetails);
}

// アクセスログを記録
export function logAccess(req: any, res: any, responseTimeMs: number) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url,
    statusCode: res.statusCode,
    responseTimeMs,
    ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
  };
  
  console.log('[access-log]', JSON.stringify(logData));
}

export default {
  logSecurityEvent,
  logAppError,
  logAccess
};
