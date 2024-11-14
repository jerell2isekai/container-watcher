const express = require('express');
const router = express.Router();
const { addContainer, getAllContainers, updateContainer } = require('../models/database');

router.get('/', async (req, res) => {
  const containers = await getAllContainers();
  res.render('settings', {
    path: '/settings',
    containers: containers
  });
});

// 新增容器頁面
router.get('/new', (req, res) => {
  res.render('settings/new', {
    path: '/settings/new'
  });
});

// 修改容器頁面
router.get('/modify', async (req, res) => {
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
    const { id, host, container_name, host_name, ssh_key, tags } = req.body;
    await updateContainer(id, {
      host,
      container_name,
      host_name,
      ssh_key,
      tags
    });
    res.redirect('/settings/modify');
  } catch (error) {
    res.status(500).send('Error updating container');
  }
});

module.exports = router;
