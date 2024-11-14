const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// 指向專案根目錄的 main.db
const db = new sqlite3.Database('main.db');

function checkAndCreateTable(tableName, schema) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                db.run(`CREATE TABLE ${tableName} ${schema}`, (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`Table ${tableName} created`);
                        resolve();
                    }
                });
            } else {
                console.log(`Table ${tableName} already exists`);
                resolve();
            }
        });
    });
}

function initDatabase() {
    const usersSchema = `(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT
    )`;

    const containersSchema = `(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL,
        container_name TEXT NOT NULL,
        host_name TEXT NOT NULL,
        ssh_key TEXT NOT NULL,
        tags TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

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
        .then(() => checkAndCreateTable('containers', containersSchema)) // 檢查並創建 containers 表
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
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(false);
            const isValid = bcrypt.compareSync(password, row.password);
            resolve(isValid);
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

// 新增容器相關的函數
function addContainer(container) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO containers (host, container_name, host_name, ssh_key, tags) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                container.host, 
                container.container_name, 
                container.host_name, 
                container.ssh_key,
                container.tags
            ],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function getAllContainers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM containers", (err, rows) => {
            console.log('getAllContainers:', rows); // 添加日志以檢查返回的數據
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
             SET host = ?, container_name = ?, host_name = ?, ssh_key = ?, tags = ?
             WHERE id = ?`,
            [
                container.host,
                container.container_name,
                container.host_name,
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

module.exports = {
    initDatabase,
    verifyUser,
    resetAdmin,  // 導出重設函數
    addContainer,
    getAllContainers,
    getContainer,
    getAllTags, // 新增這一行
    updateContainer,  // 添加這行
};