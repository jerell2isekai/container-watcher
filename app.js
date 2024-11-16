const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const { initDatabase, verifyUser } = require('./models/database');
const app = express();
const PORT = 5000;

require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const indexRouter = require('./routes/index');
const { router: watcherRouter } = require('./routes/watcher');
const settingsRouter = require('./routes/settings');
const apiRouter = require('./routes/api');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Initialize database and start server
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database initialization failed:', err);
        process.exit(1);
    });

// Set template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);


app.use((req, res, next) => {
  
  res.locals.user = {
    username: req.session.username,
    role: req.session.role,
    isAuthenticated: req.session.authenticated
  };
  
  res.locals.path = req.path;
  next();
});


app.use(express.static(path.join(__dirname, 'public')));


const authMiddleware = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};


app.use('/api/container', authMiddleware, apiRouter);


app.use('/', indexRouter);
app.use('/watcher', authMiddleware, watcherRouter);
app.use('/settings', authMiddleware, settingsRouter);


const regenerateSession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const saveSession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};
