const express = require('express');
const { Client } = require('ssh2');
const path = require('path');
const app = express();
const PORT = 5000;

// 設置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 靜態文件服務器
app.use(express.static(path.join(__dirname, 'public')));

// 模擬遠端主機列表
const hosts = [
  { name: 'prod-server', ip: '149.28.23.110', container: 'prod-server' },
  { name: 'prod-api-server', ip: '149.28.23.110', container: 'prod-api-server' },
];

app.get('/', (req, res) => {
  res.render('index', { hosts: hosts });
});

app.get('/logs', (req, res) => {
  const host = hosts.find(h => h.name === req.query.host);
  if (!host) {
    return res.status(400).send('Invalid host');
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const ssh = new Client();
  let buffer = '';

  ssh.on('ready', () => {
    ssh.exec(`docker logs --follow --tail 100 ${host.container}`, (err, stream) => {
      if (err) {
        res.write('data: Error executing command\n\n');
        ssh.end();
        return;
      }

      stream.on('close', () => {
        ssh.end();
      }).on('data', (data) => {
        buffer += data.toString();
        
        // 按行發送數據
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留最後一個不完整的行
        
        lines.forEach(line => {
          if (line.trim()) {
            res.write(`data: ${line}\n\n`);
          }
        });
      }).stderr.on('data', (data) => {
        res.write(`data: ${data}\n\n`);
      });
    });
  }).on('error', (err) => {
    console.error('SSH connection error:', err);
    res.write(`data: SSH connection error: ${err.message}\n\n`);
  }).connect({
    host: host.ip,
    username: 'root',
    privateKey: require('fs').readFileSync('E:/Workspace/boanhealth.ai/_doc/vultr_key/id_ed25519')
  });

  req.on('close', () => {
    ssh.end();
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});