const express = require('express');
const router = express.Router();
const { getAllContainers } = require('../models/database');

router.get('/', async (req, res) => {
  try {
    const hosts = await getAllContainers();
    console.log('hosts', hosts);
    res.render('watcher', { 
      hosts,
      path: '/watcher'
    });
  } catch (error) {
    res.status(500).send('Error fetching hosts');
  }
});

module.exports = { router };
