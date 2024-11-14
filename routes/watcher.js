const express = require('express');
const router = express.Router();
const { Client } = require('ssh2');

// 模擬遠端主機列表
const hosts = [
  { name: 'prod-server', ip: '149.28.23.110', container: 'prod-server' },
  { name: 'prod-api-server', ip: '149.28.23.110', container: 'prod-api-server' },
];

router.get('/', (req, res) => {
  res.render('watcher', { 
    hosts: hosts,
    path: '/watcher'
  });
});

router.get('/logs', (req, res) => {
  const { host } = req.query;
  const selectedHost = hosts.find(h => h.name === host);
  
  if (!selectedHost) {
    return res.status(404).send('Host not found');
  }

  // 設置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const conn = new Client();
  
  // 當客戶端斷開連接時清理
  req.on('close', () => {
    conn.end();
  });

  conn.on('ready', () => {
    // 執行 docker logs 命令
    const command = `docker logs -f --tail 100 ${selectedHost.container}`;
    
    conn.exec(command, (err, stream) => {
      if (err) {
        console.error('SSH exec error:', err);
        res.write(`data: Error executing command: ${err.message}\n\n`);
        return conn.end();
      }

      stream.on('data', (data) => {
        res.write(`data: ${data.toString()}\n\n`);
      });

      stream.stderr.on('data', (data) => {
        res.write(`data: ${data.toString()}\n\n`);
      });

      stream.on('close', () => {
        conn.end();
      });
    });
  });

  conn.on('error', (err) => {
    console.error('SSH connection error:', err);
    res.write(`data: Connection error: ${err.message}\n\n`);
    conn.end();
  });

  // 連接到遠程伺服器
  conn.connect({
    host: selectedHost.ip,
    port: 22,
    username: process.env.SSH_USER || 'root',
    privateKey: require('fs').readFileSync(process.env.SSH_KEY_PATH || '/path/to/your/private/key')
  });
});

module.exports = router;
