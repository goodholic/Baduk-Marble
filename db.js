const mysql = require('mysql2/promise');

// Railway에서 제공받은 MySQL 접속 정보로 아래 항목들을 교체해 주세요.
// (나중에 Railway에 배포하실 때는 환경변수(process.env)가 자동으로 적용됩니다)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'Railway에서_발급받은_Host주소',      // 예: viaduct.proxy.rlwy.net
    user: process.env.DB_USER || 'Railway에서_발급받은_User이름',       // 예: root
    password: process.env.DB_PASSWORD || 'Railway에서_발급받은_비밀번호',
    database: process.env.DB_NAME || 'Railway에서_발급받은_DB이름',     // 예: railway
    port: process.env.DB_PORT || 3306,                              // Railway 포트는 3306이 아닐 수 있으니 꼭 확인하세요!
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 시작 시 필요 테이블 자동 생성 (예: 유저 전적 테이블)
async function initDB() {
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
        console.log("MySQL Database Connected & Checked.");
    } catch (error) {
        // DB 연결이 안 되더라도 서버가 멈추지 않도록 에러 메시지만 간략하게 띄웁니다.
        console.log("⚠️ MySQL 연결 안 됨: DB 연결 없이 게임 서버 로직만 임시로 작동합니다.");
    }
}

initDB();

module.exports = pool;