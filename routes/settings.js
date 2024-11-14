const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('settings', {
    path: '/settings'  // 添加 path
  });
});

module.exports = router;
