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
const { router: watcherRouter } = require('./routes/watcher');
const settingsRouter = require('./routes/settings');
const apiRouter = require('./routes/api');

// Session 配置
app.use(session({
  secret: '83D1BED6DD337737C3511F41E689A',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,  // 在開發環境中設為 false
    maxAge: 24 * 60 * 60 * 1000 // 24小時
  }
}));

// 初始化資料庫並啟動伺服器
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

// API 路由配置 (移除舊的配置)
app.use('/api/container', authMiddleware, apiRouter);

// 頁面路由配置
app.use('/', indexRouter);
app.use('/watcher', authMiddleware, watcherRouter);
app.use('/settings', authMiddleware, settingsRouter);

// 全域變數 - 用於導航高亮
app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});