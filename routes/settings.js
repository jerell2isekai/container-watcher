const express = require('express');
const router = express.Router();
const { addContainer } = require('../models/database');

router.get('/', (req, res) => {
  res.render('settings', {
    path: '/settings'
  });
});

router.post('/container', async (req, res) => {
  try {
    const { host, container_name, host_name, ssh_key } = req.body;
    await addContainer({
      host,
      container_name,
      host_name,
      ssh_key
    });
    res.redirect('/settings');
  } catch (error) {
    res.status(500).send('Error adding container');
  }
});

module.exports = router;
