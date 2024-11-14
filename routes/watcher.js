const express = require('express');
const router = express.Router();
const { getAllContainers, getAllTags } = require('../models/database');

router.get('/', async (req, res) => {
  try {
    const hosts = await getAllContainers();
    const tags = await getAllTags();
    console.log('hosts', hosts);
    res.render('watcher', { 
      hosts,
      tags,
      path: '/watcher'
    });
  } catch (error) {
    res.status(500).send('Error fetching hosts');
  }
});

module.exports = { router };
