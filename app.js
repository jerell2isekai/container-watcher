const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const { initDatabase, verifyUser } = require('./models/database');
const app = express();
const PORT = 5000;

// Body parser - 移到最前面
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 路由
const indexRouter = require('./routes/index');
const watcherRouter = require('./routes/watcher');
const settingsRouter = require('./routes/settings');

// Session 配置
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// 初始化資料庫
initDatabase()
    .then(() => {
        console.log('Database initialized successfully');
    })
    .catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });

// 設置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);

// 靜態文件服務器
app.use(express.static(path.join(__dirname, 'public')));

// 驗證中間件
const authMiddleware = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};

// 全域變數 - 用於導航高亮 (移到路由之前)
app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

// 路由中間件
app.use('/', indexRouter);  // 這會處理 /login 和 /logout
app.use('/watcher', authMiddleware, watcherRouter);
app.use('/settings', authMiddleware, settingsRouter);

// 全域變數 - 用於導航高亮
app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});