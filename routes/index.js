const express = require('express');
const router = express.Router();
const { verifyUser } = require('../models/database');

// 首頁路由
router.get('/', (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/watcher');
  } else {
    res.redirect('/login');
  }
});

// 登入頁面
router.get('/login', (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/watcher');
    return;
  }
  res.render('index', { 
    layout: false, 
    error: req.query.error,
    path: '/login'  // 添加 path
  });
});

// 登入處理
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { isValid, role, isDefaultPassword } = await verifyUser(username, password);
    if (isValid) {
      req.session.authenticated = true;
      req.session.username = username;
      req.session.role = role; // 設定角色
      await new Promise((resolve) => req.session.save(resolve));
      
      // 檢查是否為admin帳號使用預設密碼登入
      if (username === 'admin' && isDefaultPassword) {
        return res.redirect('/settings/admin?firstLogin=1');
      }
      
      res.redirect('/watcher');
    } else {
      res.redirect('/login?error=1');
    }
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/login?error=2');
  }
});

// 登出
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
