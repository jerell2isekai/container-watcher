const express = require('express');
const router = express.Router();
const { verifyUser } = require('../models/database');

// Home route
router.get('/', (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/watcher');
  } else {
    res.redirect('/login');
  }
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/watcher');
    return;
  }
  res.render('index', { 
    layout: false, 
    error: req.query.error,
    path: '/login'  // Adding path
  });
});

// Login processing
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { isValid, role, isDefaultPassword } = await verifyUser(username, password);
    if (isValid) {
      req.session.authenticated = true;
      req.session.username = username;
      req.session.role = role; // Setting role
      await new Promise((resolve) => req.session.save(resolve));
      
      // Check if admin account is logging in with the default password
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

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;