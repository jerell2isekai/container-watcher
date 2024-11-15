const express = require('express');
const router = express.Router();
const { 
  addContainer, 
  getAllContainers, 
  updateContainer, 
  addOperator, 
  getAllOperators, 
  updateOperatorPassword, 
  deleteOperator,
  resetAdminWithNewPassword  // Add this line
} = require('../models/database');

// Admin privileges middleware
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

// New container page
router.get('/new', adminRequired, (req, res) => {
  res.render('settings/new', {
    path: '/settings/new'
  });
});

// Modify container page
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

// Update container
router.post('/container/update', async (req, res) => {
  try {
    console.log('Updating container with data:', req.body); // Add debug log

    const { id, host, container_name, host_name, username, ssh_key, tags } = req.body;

    // Check required fields
    if (!id || !host || !container_name || !host_name || !username || !ssh_key) {
      console.error('Missing required fields:', { id, host, container_name, host_name, username });
      return res.status(400).send('Missing required fields');
    }

    // Update container
    const result = await updateContainer(id, {
      host,
      container_name,
      host_name,
      username,
      ssh_key,
      tags: tags || ''  // Ensure tags is not undefined
    });

    console.log('Update result:', result); // Add debug log

    if (result === 0) {
      // If no rows were updated
      return res.status(404).send('Container not found');
    }

    res.redirect('/settings/modify');
  } catch (error) {
    console.error('Error updating container:', error); // Add detailed error log
    res.status(500).send(`Error updating container: ${error.message}`);
  }
});

// Admin settings page
router.get('/admin', adminRequired, (req, res) => {
  res.render('settings/admin', {
    path: '/settings/admin',
    firstLogin: req.query.firstLogin === '1'
  });
});

// Reset admin password
router.post('/admin/reset-password', adminRequired, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    
    // Validate password
    if (!newPassword || newPassword.length < 5) {
      return res.redirect('/settings/admin?error=The password must be at least 5 characters long');
    }
    
    if (newPassword !== confirmPassword) {
      return res.redirect('/settings/admin?error=The passwords entered do not match');
    }

    await resetAdminWithNewPassword(newPassword);
    // Redirect directly to logout
    res.redirect('/logout');
  } catch (error) {
    console.error('Failed to change admin password:', error);
    res.redirect('/settings/admin?error=Failed to change admin password');
  }
});

// Operator management routes
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

// Update operator password
router.post('/operators/change-password', adminRequired, async (req, res) => {
  try {
    const { operatorId, newPassword } = req.body;
    await updateOperatorPassword(operatorId, newPassword);
    res.redirect('/settings/operators');
  } catch (error) {
    console.error('Password update failed:', error);
    res.status(500).send('Password update failed');
  }
});

// Delete operator
router.delete('/operators/:id', adminRequired, async (req, res) => {
  try {
    const result = await deleteOperator(req.params.id);
    if (result === 0) {
      res.status(404).send('Operator does not exist');
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    console.error('Failed to delete operator:', error);
    res.status(500).send('Failed to delete operator');
  }
});

module.exports = router;