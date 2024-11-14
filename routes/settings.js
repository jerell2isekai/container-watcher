const express = require('express');
const router = express.Router();
const { addContainer, getAllContainers, updateContainer, addOperator, getAllOperators } = require('../models/database');

// 管理員權限中間件
const adminRequired = (req, res, next) => {
  if (req.session.role !== 'admin') {
    return res.status(403).redirect('/watcher');
  }
  next();
};

router.get('/', async (req, res) => {
  const containers = await getAllContainers();
  res.render('settings', {
    path: '/settings',
    containers: containers
  });
});

// 新增容器頁面
router.get('/new', adminRequired, (req, res) => {
  res.render('settings/new', {
    path: '/settings/new'
  });
});

// 修改容器頁面
router.get('/modify', adminRequired, async (req, res) => {
  const containers = await getAllContainers();
  res.render('settings/modify', {
    path: '/settings/modify',
    containers: containers
  });
});

router.post('/container', async (req, res) => {
  try {
    const { host, container_name, host_name, ssh_key, tags } = req.body;
    await addContainer({
      host,
      container_name,
      host_name,
      ssh_key,
      tags
    });
    res.redirect('/settings/new');
  } catch (error) {
    res.status(500).send('Error adding container');
  }
});

// 更新容器
router.post('/container/update', async (req, res) => {
  try {
    console.log('Updating container with data:', req.body); // 新增除錯日誌

    const { id, host, container_name, host_name, username, ssh_key, tags } = req.body;

    // 檢查必要欄位
    if (!id || !host || !container_name || !host_name || !username || !ssh_key) {
      console.error('Missing required fields:', { id, host, container_name, host_name, username });
      return res.status(400).send('Missing required fields');
    }

    // 更新容器
    const result = await updateContainer(id, {
      host,
      container_name,
      host_name,
      username,
      ssh_key,
      tags: tags || ''  // 確保 tags 不會是 undefined
    });

    console.log('Update result:', result); // 新增除錯日誌

    if (result === 0) {
      // 如果沒有更新任何行
      return res.status(404).send('Container not found');
    }

    res.redirect('/settings/modify');
  } catch (error) {
    console.error('Error updating container:', error); // 新增詳細錯誤日誌
    res.status(500).send(`Error updating container: ${error.message}`);
  }
});

// 子帳號管理路由
router.get('/operators', adminRequired, async (req, res) => {
  const operators = await getAllOperators();
  res.render('settings/operators', {
    path: '/settings/operators',
    operators
  });
});

router.post('/operators', adminRequired, async (req, res) => {
  try {
    const { username, password } = req.body;
    await addOperator(username, password);
    res.redirect('/settings/operators');
  } catch (error) {
    res.status(500).send('Error adding operator');
  }
});

module.exports = router;
