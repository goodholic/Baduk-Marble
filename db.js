const mysql = require('mysql2/promise');

// DB 환경변수 검증
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT || 3306;

if (!DB_HOST || !DB_USER || !DB_PASS || !DB_NAME) {
    console.warn('⚠️ DB 환경변수 미설정 — DB 없이 메모리 모드로 작동합니다.');
    console.warn('  필요: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
}

const pool = (DB_HOST && DB_USER) ? mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000, // 10초 타임아웃
}) : null;

// 시작 시 필요 테이블 자동 생성
async function initDB() {
    if (!pool) {
        console.log('⚠️ DB pool 없음 — 메모리 모드로 작동합니다.');
        return;
    }
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS game_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                team VARCHAR(10) NOT NULL,
                tiles_claimed INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        connection.release();
        console.log('✅ MySQL Database Connected & Checked.');
    } catch (error) {
        console.error('⚠️ MySQL 연결 실패:', error.message);
        console.log('  → DB 없이 게임 서버 로직만 작동합니다.');
    }
}

initDB();

// pool이 null이면 더미 pool 반환 (쿼리 시 silent fail)
const safePool = pool || {
    getConnection: async () => { throw new Error('DB not configured'); },
    query: async () => { return [[], []]; },
    execute: async () => { return [[], []]; },
};

module.exports = { pool: safePool, initDB };