const express = require('express');
const router = express.Router();

// 模擬遠端主機列表
const hosts = [
  { name: 'prod-server', ip: '149.28.23.110', container: 'prod-server' },
  { name: 'prod-api-server', ip: '149.28.23.110', container: 'prod-api-server' },
];

// 只保留頁面路由
router.get('/', (req, res) => {
  res.render('watcher', { 
    hosts: hosts,
    path: '/watcher'
  });
});

module.exports = { router, hosts };  // 匯出 hosts 供 API 路由使用
