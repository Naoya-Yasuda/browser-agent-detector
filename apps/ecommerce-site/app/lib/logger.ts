import fs from 'fs';
import path from 'path';
import { openDb } from './db';

// ログディレクトリパス
const LOG_DIR = path.join(process.cwd(), 'logs');

// ログディレクトリが存在しない場合は作成
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ログファイルパス
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'security.log');
const APP_LOG_FILE = path.join(LOG_DIR, 'app.log');
const ACCESS_LOG_FILE = path.join(LOG_DIR, 'access.log');

// ログをファイルに書き込む関数
function writeToLog(logFile: string, message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('ログファイルへの書き込みエラー:', err);
    }
  });
}

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
  // JSON形式でログ出力
  const logMessage = JSON.stringify(event);
  writeToLog(SECURITY_LOG_FILE, logMessage);
  
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
  writeToLog(APP_LOG_FILE, `ERROR: ${message} - ${errorDetails}`);
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
  
  writeToLog(ACCESS_LOG_FILE, JSON.stringify(logData));
}

export default {
  logSecurityEvent,
  logAppError,
  logAccess
};