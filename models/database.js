const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database(path.join(__dirname, '../main.db'));

// 初始化資料庫
function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 建立資料表
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT
            )`, (err) => {
                if (err) {
                    console.error('Create table error:', err);
                    reject(err);
                    return;
                }

                // 檢查管理員帳號
                db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
                    if (err) {
                        console.error('Query admin error:', err);
                        reject(err);
                        return;
                    }

                    const hashedPassword = bcrypt.hashSync("admin", 10);

                    if (!row) {
                        // 如果沒有管理員帳號，建立一個
                        db.run("INSERT INTO users (username, password) VALUES (?, ?)", 
                            ["admin", hashedPassword], (err) => {
                                if (err) {
                                    console.error('Insert admin error:', err);
                                    reject(err);
                                }
                                console.log('Admin account created');
                                resolve();
                            });
                    } else if (row.password === null) {
                        // 如果密碼是 null，更新密碼
                        db.run("UPDATE users SET password = ? WHERE username = ?",
                            [hashedPassword, "admin"], (err) => {
                                if (err) {
                                    console.error('Update admin password error:', err);
                                    reject(err);
                                }
                                console.log('Admin password updated');
                                resolve();
                            });
                    } else {
                        // 一切正常，直接結束
                        resolve();
                    }
                });
            });
        });
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

module.exports = {
    initDatabase,
    verifyUser,
    resetAdmin  // 導出重設函數
};
