// middleware/logger.js
const winston = require('winston');
const dayjs = require('dayjs');
const { green, yellow, red, blue, magenta, cyan, bgYellow, black, white } = require('colorette');
require('dayjs/locale/zh-tw');

dayjs.locale('zh-tw');

// 創建 Winston logger 實例
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${white(timestamp)} | ${white(level.toUpperCase())} | ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// 輔助函數：安全地獲取值，提供默認值
const safeGet = (value, defaultValue = 'N/A') => {
  return value !== undefined && value !== null ? value : defaultValue;
};

// 獲取客戶端真實IP和請求來源
const getClientIpAndOrigin = (req) => {
  const ip = req.headers['x-forwarded-for']?.split(',').shift() || 
             req.socket?.remoteAddress || 
             'Unknown IP';
  
  // 獲取請求的來源
  const origin = req.headers.origin || req.headers.referer || 'Unknown Origin';
  
  // 獲取請求的主機名（通常是API的主機名）
  const host = req.get('host') || 'Unknown Host';
  
  return `${ip} (Origin: ${origin}, API Host: ${host})`;
};

// HTTP方法顏色映射
const methodColors = {
  GET: green,
  POST: blue,
  PUT: yellow,
  DELETE: red,
  PATCH: magenta,
  OPTIONS: cyan,
};

// 自定義 Express 中間件
const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // 捕獲響應
  const originalJson = res.json;
  res.json = function(body) {
    res.locals.body = body;
    originalJson.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, headers } = req;
    const { statusCode } = res;

    const ipAndOrigin = getClientIpAndOrigin(req);

    let statusColor = green;
    if (statusCode >= 400) statusColor = red;
    else if (statusCode >= 300) statusColor = yellow;

    const methodColor = methodColors[method] || white;

    const logMessage = [
      `${methodColor(safeGet(method))} ${white(safeGet(originalUrl))}`,
      `Status: ${statusColor(safeGet(statusCode))}`,
      `${white(`${duration}ms`)}`,
      `${white(ipAndOrigin)}`,
      `UA: ${white(safeGet(headers['user-agent']))}`,
      `Auth: ${white(headers.authorization ? headers.authorization.split(' ')[0] : 'None')}`,
      `Content-Type: ${white(safeGet(headers['content-type']))}`,
      `Request Size: ${white(`${safeGet(headers['content-length'], '0')} bytes`)}`
    ].join(' | ');

    // 檢查潛在的安全威脅
    const bodyString = JSON.stringify(req.body);
    const urlString = req.originalUrl;
    const xssAttempt = urlString.includes('<script>') || bodyString.includes('<script>');
    const sqlInjectionAttempt = urlString.includes('--') || bodyString.includes('--');

    if (xssAttempt) {
      logger.warn(bgYellow(black(`${logMessage} | Potential XSS Attempt Detected`)));
    } else if (sqlInjectionAttempt) {
      logger.warn(bgYellow(black(`${logMessage} | Potential SQL Injection Attempt Detected`)));
    } else {
      logger.info(logMessage);
    }
  });

  next();
};

module.exports = loggerMiddleware;