const express = require('express');
const router = express.Router();
const { Client } = require('ssh2');
const { getContainer } = require('../models/database');

router.get('/logs', async (req, res) => {
  const { host } = req.query;
  
  try {
    const container = await getContainer(host);
    if (!container) {
      return res.status(404).send('Host not found');
    }

    // 設置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const conn = new Client();
    
    // 處理 SSH 連線錯誤
    conn.on('error', (err) => {
      console.error('SSH Connection Error:', err);
      res.write(`data: SSH 連線錯誤: ${err.message}\n\n`);
      conn.end();
    });

    // 處理 SSH 連線關閉
    conn.on('close', () => {
      console.log('SSH Connection closed');
      res.write('data: SSH 連線已關閉\n\n');
      res.end();
    });

    conn.on('ready', () => {
      console.log('SSH Client Ready');
      res.write('data: SSH 連線成功\n\n');

      // 設定更大的最大緩衝區
      const maxBuffer = 1024 * 1024 * 10; // 10MB
      const options = {
        MaxBuffer: maxBuffer,
        env: { TERM: 'xterm' }
      };

      // 執行 docker logs 命令，增加 --timestamps 以確保時間戳記
      const command = `docker logs -f --tail 100 --timestamps ${container.container_name}`;
      
      conn.exec(command, options, (err, stream) => {
        if (err) {
          console.error('Exec Error:', err);
          res.write(`data: 執行命令錯誤: ${err.message}\n\n`);
          conn.end();
          return;
        }

        let buffer = '';

        // 處理標準輸出
        stream.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          
          // 保留最後一行（可能不完整）
          buffer = lines.pop();
          
          // 發送完整的行
          lines.forEach(line => {
            if (line.trim()) {
              res.write(`data: ${line.trim()}\n\n`);
            }
          });
        });

        // 處理標準錯誤
        stream.stderr.on('data', (data) => {
          const errorMsg = data.toString().trim();
          if (errorMsg) {
            res.write(`data: ERROR: ${errorMsg}\n\n`);
          }
        });

        // 串流結束時發送剩餘的緩衝區
        stream.on('end', () => {
          if (buffer.trim()) {
            res.write(`data: ${buffer.trim()}\n\n`);
          }
          buffer = '';
        });

        // 處理串流結束
        stream.on('close', (code, signal) => {
          console.log('Stream closed', { code, signal });
          conn.end();
        });

        // 處理串流錯誤
        stream.on('error', (err) => {
          console.error('Stream Error:', err);
          res.write(`data: 串流錯誤: ${err.message}\n\n`);
          conn.end();
        });
      });
    });

    // 處理客戶端斷開連線
    req.on('close', () => {
      console.log('Client disconnected');
      conn.end();
    });

    // 開始連線
    conn.connect({
      host: container.host,
      port: 22,
      username: process.env.SSH_USER || 'root',
      privateKey: container.ssh_key
    });
  } catch (error) {
    res.status(500).send('Error establishing connection');
  }
});

module.exports = router;
