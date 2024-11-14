const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// 修改資料庫路徑為絕對路徑
const dbPath = path.join(__dirname, '../main.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database creation error:', err);
    }
});

function checkAndCreateTable(tableName, schema) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                db.run(`CREATE TABLE ${tableName} ${schema}`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

function initDatabase() {
    const usersSchema = `(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT DEFAULT 'admin'
    )`;

    const containersSchema = `(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL,
        container_name TEXT NOT NULL,
        host_name TEXT NOT NULL,
        username TEXT NOT NULL DEFAULT 'root',
        ssh_key TEXT NOT NULL,
        tags TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

    const operatorsSchema = `(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

    // 檢查是否需要更新表結構
    const updateContainersTable = () => {
        return new Promise((resolve, reject) => {
            db.get("PRAGMA table_info(containers)", (err, rows) => {
                if (err) return reject(err);

                // 檢查是否已存在 username 欄位
                db.get("SELECT * FROM sqlite_master WHERE type='table' AND name='containers' AND sql LIKE '%username%'", (err, row) => {
                    if (err) return reject(err);
                    if (!row) {
                        // 新增 username 欄位
                        db.run("ALTER TABLE containers ADD COLUMN username TEXT NOT NULL DEFAULT 'root'", (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        });
    };

    const setupAdminUser = () => {
        return new Promise((resolve, reject) => {
            const hashedPassword = bcrypt.hashSync("admin", 10);
            db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
                if (err) return reject(err);
                
                if (!row) {
                    db.run("INSERT INTO users (username, password) VALUES (?, ?)", 
                        ["admin", hashedPassword], (err) => {
                            if (err) reject(err);
                            else {
                                console.log('Admin user created');
                                resolve();
                            }
                        });
                } else {
                    console.log('Admin user exists');
                    resolve();
                }
            });
        });
    };

    // 檢查並創建 users 表
    return checkAndCreateTable('users', usersSchema)
        .then(() => checkAndCreateTable('operators', operatorsSchema))
        .then(() => checkAndCreateTable('containers', containersSchema)) // 檢查並創建 containers 表
        .then(() => updateContainersTable())  // 新增更新表結構的步驟
        .then(setupAdminUser)
        .then(() => {
            console.log('Database initialization completed');
        })
        .catch(err => {
            console.error('Database initialization failed:', err);
            throw err;
        });
}

// 驗證使用者
function verifyUser(username, password) {
    return new Promise((resolve, reject) => {
        // 先檢查 admin 用戶
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            if (err) return reject(err);
            if (row) {
                const isValid = bcrypt.compareSync(password, row.password);
                const role = isValid ? 'admin' : null;
                // 檢查是否為預設密碼
                const isDefaultPassword = isValid && password === 'admin';
                console.log('Admin verify result:', { username, isValid, role, isDefaultPassword });
                return resolve({ isValid, role, isDefaultPassword });
            }
            // 檢查 operator 用戶
            db.get("SELECT * FROM operators WHERE username = ?", [username], (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve({ isValid: false, role: null, isDefaultPassword: false });
                const isValid = bcrypt.compareSync(password, row.password);
                const role = isValid ? 'operator' : null;
                console.log('Operator verify result:', { username, isValid, role });
                resolve({ isValid, role, isDefaultPassword: false });
            });
        });
    });
}

// 重設管理員密碼
function resetAdmin() {
    return new Promise((resolve, reject) => {
        const hashedPassword = bcrypt.hashSync("admin", 10);
        db.run("DELETE FROM users WHERE username = ?", ["admin"], (err) => {
            if (err) {
                console.error('Delete admin error:', err);
                reject(err);
                return;
            }
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", 
                ["admin", hashedPassword], (err) => {
                    if (err) {
                        console.error('Insert admin error:', err);
                        reject(err);
                        return;
                    }
                    resolve();
                });
        });
    });
}

// 使用新密碼重設管理員密碼
function resetAdminWithNewPassword(newPassword) {
    return new Promise((resolve, reject) => {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.run("DELETE FROM users WHERE username = ?", ["admin"], (err) => {
            if (err) {
                console.error('Delete admin error:', err);
                reject(err);
                return;
            }
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", 
                ["admin", hashedPassword], (err) => {
                    if (err) {
                        console.error('Insert admin error:', err);
                        reject(err);
                        return;
                    }
                    resolve();
                });
        });
    });
}

// 新增容器相關的函數
function addContainer(container) {
    return new Promise((resolve, reject) => {
        // 檢查必要欄位
        if (!container.host || !container.container_name || !container.host_name || !container.ssh_key) {
            console.error('欄位驗證失敗:', container);
            return reject(new Error('缺少必要欄位'));
        }

        // 設定預設值
        const username = container.username || 'root';
        const tags = container.tags || '';

        db.run(
            `INSERT INTO containers (host, container_name, host_name, username, ssh_key, tags) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                container.host, 
                container.container_name, 
                container.host_name,
                username,
                container.ssh_key,
                tags
            ],
            function(err) {
                if (err) {
                    console.error('新增容器時發生錯誤:', err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

function getAllContainers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM containers", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getContainer(hostName) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM containers WHERE host_name = ?", [hostName], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getAllTags() {
    return new Promise((resolve, reject) => {
        db.all("SELECT DISTINCT tags FROM containers WHERE tags IS NOT NULL AND tags != ''", (err, rows) => {
            if (err) reject(err);
            else {
                const tags = rows.map(row => row.tags);
                resolve(tags);
            }
        });
    });
}

function updateContainer(id, container) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE containers 
             SET host = ?, container_name = ?, host_name = ?, username = ?, ssh_key = ?, tags = ?
             WHERE id = ?`,
            [
                container.host,
                container.container_name,
                container.host_name,
                container.username,  // 新增字段
                container.ssh_key,
                container.tags,
                id
            ],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

// 新增 operator 相關函數
function addOperator(username, password) {
    return new Promise((resolve, reject) => {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.run(
            "INSERT INTO operators (username, password) VALUES (?, ?)",
            [username, hashedPassword],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function getAllOperators() {
    return new Promise((resolve, reject) => {
        db.all("SELECT id, username, created_at FROM operators", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// 更新操作員密碼
function updateOperatorPassword(id, newPassword) {
    return new Promise((resolve, reject) => {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.run(
            "UPDATE operators SET password = ? WHERE id = ?",
            [hashedPassword, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

// 刪除操作員
function deleteOperator(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM operators WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

module.exports = {
    initDatabase,
    verifyUser,
    resetAdmin,  // 導出重設函數
    resetAdminWithNewPassword,
    addContainer,
    getAllContainers,
    getContainer,
    getAllTags, // 新增這一行
    updateContainer,  // 添加這行
    addOperator,
    getAllOperators,
    updateOperatorPassword,
    deleteOperator,
};