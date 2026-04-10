// ==========================================
// Database (extracted from server.js, Phase 1 refactor)
// ==========================================
// Railway는 보통 MYSQL_URL 또는 개별 MYSQLHOST/USER/PASSWORD/DATABASE/PORT 환경변수를 제공.
// 둘 다 지원하도록 fallback 구성.

const mysql = require('mysql2/promise');

function buildDbConfig() {
    const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (url) {
        try {
            const u = new URL(url);
            return {
                host: u.hostname,
                user: decodeURIComponent(u.username),
                password: decodeURIComponent(u.password),
                database: u.pathname.replace(/^\//, '') || 'railway',
                port: u.port ? parseInt(u.port) : 3306,
            };
        } catch (e) {
            console.error('[DB] MYSQL_URL 파싱 실패:', e.message);
        }
    }
    return {
        host: process.env.MYSQLHOST || 'localhost',
        user: process.env.MYSQLUSER || 'root',
        password: process.env.MYSQLPASSWORD || '',
        database: process.env.MYSQLDATABASE || 'railway',
        port: parseInt(process.env.MYSQLPORT || 3306),
    };
}

const _dbCfg = buildDbConfig();
console.log(`[DB] connecting host=${_dbCfg.host} port=${_dbCfg.port} db=${_dbCfg.database} user=${_dbCfg.user}`);

const pool = mysql.createPool({
    ..._dbCfg,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
});

async function initDB() {
    try {
        // 연결 ping 테스트
        const [pingRows] = await pool.query('SELECT 1 AS ok');
        console.log(`[DB] ping OK (${pingRows[0]?.ok})`);

        // 계정 테이블
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(20) NOT NULL UNIQUE,
                password_hash VARCHAR(64) NOT NULL,
                salt VARCHAR(16) NOT NULL,
                device_id VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_username (username)
            )
        `).catch(e => console.error('[DB] accounts table:', e.message));

        // 오프라인 우편함 테이블
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                target_name VARCHAR(255) NOT NULL,
                from_name VARCHAR(255) NOT NULL,
                item_id VARCHAR(100),
                item_count INT DEFAULT 0,
                gold INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_target (target_name)
            )
        `).catch(e => console.error('[DB] mails table:', e.message));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS players_save (
                device_id VARCHAR(255) PRIMARY KEY,
                class_name VARCHAR(50),
                level INT DEFAULT 1,
                exp INT DEFAULT 0,
                gold INT DEFAULT 0,
                kill_count INT DEFAULT 0,
                karma INT DEFAULT 0,
                team VARCHAR(50) DEFAULT 'peace',
                is_alive BOOLEAN DEFAULT TRUE,
                army_data JSON,
                total_playtime INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // 새 컬럼 안전하게 추가
        const newCols = [
            ['gold', 'INT DEFAULT 0'],
            ['karma', 'INT DEFAULT 0'],
            ['total_playtime', 'INT DEFAULT 0'],
            ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
            ['ext_data', 'LONGTEXT']
        ];
        for (const [col, def] of newCols) {
            try { await pool.query(`ALTER TABLE players_save ADD COLUMN ${col} ${def}`); } catch(e) {}
        }
        console.log("[DB] MySQL initialized.");
    } catch (error) {
        console.error("[DB] Init Error:", error);
    }
}

module.exports = { pool, initDB, buildDbConfig };
