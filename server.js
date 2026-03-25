// ==========================================
// Node.js Multiplay Server with Socket.IO & MySQL
// Railway Deployment Ready (RPG & Zombie IO Mode)
// ==========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.send('Server is running normally');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});

// ==========================================
// Database 설정 및 초기화 (Railway MySQL)
// ==========================================
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway', 
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players_save (
                device_id VARCHAR(255) PRIMARY KEY,
                class_name VARCHAR(50),
                level INT,
                exp INT,
                score INT,
                kill_count INT,
                team VARCHAR(50),
                is_alive BOOLEAN
            )
        `);
        console.log("MySQL Database Initialized successfully.");
    } catch (error) {
        console.error("MySQL Initialization Error:", error);
    }
}
initDB();

async function savePlayer(player) {
    if (!player || !player.deviceId) return;
    try {
        await pool.query(`
            INSERT INTO players_save (device_id, class_name, level, exp, score, kill_count, team, is_alive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            class_name = VALUES(class_name), level = VALUES(level), exp = VALUES(exp), score = VALUES(score), kill_count = VALUES(kill_count), team = VALUES(team), is_alive = VALUES(is_alive)
        `, [player.deviceId, player.className, player.level, player.exp, player.score, player.killCount, player.team, player.isAlive]);
    } catch (error) {
        console.error("DB Save Error:", error);
    }
}

// ==========================================
// 게임 논리 데이터 및 통신 관리
// ==========================================

const players = {};
let axes = {};
let aoes = {}; 
let monsters = {}; 

let entityIdCounter = 0;
const MAX_PLAYERS = 20;
const MAX_MONSTERS = 15; 

// 직업 기본 스탯 정의 (사거리, 공격력, 체력 세부 조정 반영)
const CLASSES = {
    '번개':   { maxHp: 100, dmg: 40, speed: 20, aoe: false, projSpeed: 30, projLife: 150 }, // 근접 암살자 (투사체 생명력이 매우 짧아 사거리 짧음)
    '광전사': { maxHp: 120, dmg: 25, speed: 10, aoe: false, projSpeed: 15, projLife: 1500 }, // 원거리 전사 (일반 투사체)
    '스톤':   { maxHp: 250, dmg: 10, speed: 15, aoe: false, projSpeed: 12, projLife: 1000 }, // 방패병 (체력 매우 높음, 데미지 낮음)
    '페인터': { maxHp: 80,  dmg: 0,  speed: 8,  aoe: true,  projSpeed: 0,  projLife: 3000 }  // 마법사 (장판 생성, 데미지는 %로 계산되므로 0)
};

for(let i=0; i<MAX_MONSTERS; i++) {
    spawnMonster();
}

function spawnMonster() {
    entityIdCounter++;
    const mId = 'monster_' + entityIdCounter;
    monsters[mId] = {
        id: mId,
        x: Math.random() * 40 - 20,
        y: Math.random() * 40 - 20,
        hp: 50,
        maxHp: 50,
        isAlive: true
    };
}

io.on('connection', (socket) => {
    const playerId = socket.id;
    console.log(`New user connected: ${playerId}`);

    if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('server_full', { message: 'The server is currently full.' });
        socket.disconnect();
        return;
    }

    socket.on('init_request', async (dataStr) => {
        let selectedClass = '광전사'; 
        let deviceId = playerId; 
        
        try {
            if(dataStr) {
                const data = JSON.parse(dataStr);
                if(data.className && CLASSES[data.className]) {
                    selectedClass = data.className;
                }
                if(data.deviceId) {
                    deviceId = data.deviceId;
                }
            }
        } catch(e) {}

        socket.deviceId = deviceId;

        // 데이터베이스에서 캐릭터 정보 불러오기
        let loadedData = null;
        try {
            const [rows] = await pool.query('SELECT * FROM players_save WHERE device_id = ?', [deviceId]);
            if(rows.length > 0) {
                loadedData = rows[0];
            }
        } catch(e) { console.error("DB Load Error:", e); }

        let pInfo = {
            id: playerId,
            deviceId: deviceId,
            className: selectedClass,
            x: Math.random() * 30 - 15,
            y: Math.random() * 10 + 5, 
            hp: CLASSES[selectedClass].maxHp,
            maxHp: CLASSES[selectedClass].maxHp,
            dmgMulti: 1.0,
            dirX: 0,
            dirY: -1,
            score: 0,
            level: 1,
            exp: 0,
            isAlive: true,
            killCount: 0,
            team: 'peace' // 기본 평화주의
        };

        // 살아있는 세이브 데이터가 있으면 복구
        if(loadedData && loadedData.is_alive) {
            pInfo.className = loadedData.class_name;
            pInfo.level = loadedData.level;
            pInfo.exp = loadedData.exp;
            pInfo.score = loadedData.score;
            pInfo.killCount = loadedData.kill_count;
            pInfo.team = loadedData.team;
            
            pInfo.maxHp = CLASSES[pInfo.className].maxHp + (pInfo.level - 1) * 20;
            pInfo.hp = pInfo.maxHp;
            pInfo.dmgMulti = 1.0 + (pInfo.level - 1) * 0.1;

            // 숙주 감염자 혜택 복구
            if(pInfo.team.startsWith('zombie_')) {
                pInfo.maxHp *= 2;
                pInfo.hp = pInfo.maxHp;
                pInfo.dmgMulti *= 1.5;
            }
        } else {
            // 새 캐릭터 생성 시 저장
            savePlayer(pInfo);
        }

        players[playerId] = pInfo;

        socket.emit('init', {
            id: playerId,
            players: players,
            axes: axes,
            aoes: aoes,
            monsters: monsters
        });

        socket.broadcast.emit('player_join', players[playerId]);
    });

    socket.on('move', (data) => {
        try {
            const moveData = JSON.parse(data);
            if (players[playerId] && players[playerId].isAlive) {
                players[playerId].x = moveData.x;
                players[playerId].y = moveData.y;
                if (moveData.dirX !== undefined && moveData.dirY !== undefined) {
                    players[playerId].dirX = moveData.dirX;
                    players[playerId].dirY = moveData.dirY;
                }
            }
        } catch (e) { }
    });

    socket.on('change_class', (className) => {
        if(players[playerId] && CLASSES[className]) {
            players[playerId].className = className;
            players[playerId].maxHp = CLASSES[className].maxHp;
            if(players[playerId].isAlive) {
                players[playerId].hp = players[playerId].maxHp;
            }
            savePlayer(players[playerId]);
            io.emit('player_update', players[playerId]);
        }
    });

    socket.on('toggle_pvp', () => {
        const p = players[playerId];
        if(p && p.isAlive && p.team === 'peace') {
            p.team = 'zombie_' + playerId;
            p.maxHp *= 2; 
            p.hp = p.maxHp;
            p.dmgMulti *= 1.5; 
            savePlayer(p);
            io.emit('player_update', p);
            console.log(`${playerId} became a ZOMBIE HOST!`);
        }
    });

    socket.on('throw', (data) => {
        const player = players[playerId];
        if (player && player.isAlive && player.dirX !== undefined) {
            const mag = Math.sqrt(player.dirX * player.dirX + player.dirY * player.dirY);
            let finalDirX = 0;
            let finalDirY = 1;

            if (mag > 0.01) {
                finalDirX = player.dirX / mag;
                finalDirY = player.dirY / mag;
            } else if (player.dirX === 0 && player.dirY === 0) {
                finalDirX = 0;
                finalDirY = 1;
            }

            const classInfo = CLASSES[player.className];
            entityIdCounter++;
            const currentObjId = entityIdCounter;

            if(classInfo.aoe) {
                aoes[currentObjId] = {
                    id: currentObjId,
                    ownerId: playerId,
                    x: player.x,
                    y: player.y,
                    radius: 3.0,
                    timer: null
                };
                io.emit('aoe_spawn', aoes[currentObjId]);

                aoes[currentObjId].timer = setTimeout(() => {
                    if (aoes[currentObjId]) {
                        io.emit('aoe_destroy', currentObjId);
                        delete aoes[currentObjId];
                    }
                }, classInfo.projLife);
            } else {
                axes[currentObjId] = {
                    id: currentObjId,
                    ownerId: playerId,
                    x: player.x + finalDirX * 0.5, 
                    y: player.y + finalDirY * 0.5,
                    dirX: finalDirX,
                    dirY: finalDirY,
                    speed: classInfo.projSpeed,
                    dmg: classInfo.dmg * player.dmgMulti,
                    timer: null
                };

                io.emit('axe_spawn', axes[currentObjId]);

                axes[currentObjId].timer = setTimeout(() => {
                    if (axes[currentObjId]) {
                        io.emit('axe_destroy', currentObjId);
                        delete axes[currentObjId];
                    }
                }, classInfo.projLife);
            }
        }
    });

    // 죽은 후 완전히 새로운 캐릭터로 리스폰
    socket.on('respawn', (dataStr) => {
        let newClass = '광전사'; 
        try {
            if(dataStr) {
                const data = JSON.parse(dataStr);
                if(data.className && CLASSES[data.className]) {
                    newClass = data.className;
                }
            }
        } catch(e) {}

        if (players[playerId] && !players[playerId].isAlive) {
            const p = players[playerId];
            p.className = newClass;
            p.level = 1;
            p.exp = 0;
            p.score = 0;
            p.killCount = 0;
            // 죽기 전 감염된 상태였다면 그 팀을 유지, 아니라면 peace 유지
            p.maxHp = CLASSES[newClass].maxHp;
            p.hp = p.maxHp;
            p.dmgMulti = 1.0;
            p.isAlive = true;
            p.x = Math.random() * 30 - 15;
            p.y = Math.random() * 10 + 5; 
            
            savePlayer(p);
            io.emit('player_respawn', p);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${playerId}`);
        if (players[playerId]) {
            savePlayer(players[playerId]);
            delete players[playerId];
            io.emit('player_leave', playerId);
        }
    });
});

const TICK_RATE = 30;
const TICK_TIME = 1000 / TICK_RATE;

let tickCounter = 0;

setInterval(() => {
    tickCounter++;
    handleCollisions();
    
    if(tickCounter % 30 === 0) {
        for(let mId in monsters) {
            monsters[mId].x += (Math.random() * 2 - 1);
            monsters[mId].y += (Math.random() * 2 - 1);
        }
    }

    if(tickCounter % 15 === 0) {
        handleAoeDamage();
    }

    syncGameState();
}, TICK_TIME);

function handleCollisions() {
    for (const axeId in axes) {
        const axe = axes[axeId];
        const owner = players[axe.ownerId];
        if (!owner) continue;

        let axeDestroyed = false;

        for(const mId in monsters) {
            const mob = monsters[mId];
            if(!mob.isAlive) continue;

            const dx = axe.x - mob.x;
            const dy = axe.y - mob.y;
            if(dx*dx + dy*dy < 1.0) {
                mob.hp -= axe.dmg;
                if(mob.hp <= 0) {
                    mob.isAlive = false;
                    delete monsters[mId];
                    io.emit('monster_die', mId);
                    giveExp(owner, 20); 
                    spawnMonster(); 
                    io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                } else {
                    io.emit('monster_hit', { id: mId, hp: mob.hp });
                }
                destroyAxe(axeId);
                axeDestroyed = true;
                break;
            }
        }

        if(axeDestroyed) continue;

        for (const targetId in players) {
            const target = players[targetId];
            if (targetId === axe.ownerId || !target.isAlive) continue;

            if (owner.team === 'peace' && target.team === 'peace') continue;
            if (owner.team === target.team) continue;

            const dx = axe.x - target.x;
            const dy = axe.y - target.y;
            const distSq = dx * dx + dy * dy; 

            if (distSq < 0.6 * 0.6) {
                target.hp -= axe.dmg;
                io.emit('player_hit', { id: targetId, hp: target.hp });

                destroyAxe(axeId);

                if (target.hp <= 0) {
                    target.isAlive = false;
                    owner.killCount++;
                    owner.score += 100;
                    
                    // 감염 로직: 타겟이 죽으면 나를 죽인 사람의 팀으로 편입
                    target.team = owner.team;
                    
                    savePlayer(owner);
                    savePlayer(target);

                    io.emit('player_update', target); 
                    io.emit('player_die', { victimId: targetId, attackerId: axe.ownerId });
                }
                break; 
            }
        }
    }
}

function handleAoeDamage() {
    for(const aoeId in aoes) {
        const aoe = aoes[aoeId];
        const owner = players[aoe.ownerId];
        if(!owner) continue;

        for(const mId in monsters) {
            const mob = monsters[mId];
            if(!mob.isAlive) continue;
            const dx = aoe.x - mob.x;
            const dy = aoe.y - mob.y;
            if(dx*dx + dy*dy <= aoe.radius * aoe.radius) {
                const dmg = mob.maxHp * 0.1; 
                mob.hp -= dmg;
                if(mob.hp <= 0) {
                    mob.isAlive = false;
                    delete monsters[mId];
                    io.emit('monster_die', mId);
                    giveExp(owner, 20);
                    spawnMonster();
                    io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                } else {
                    io.emit('monster_hit', { id: mId, hp: mob.hp });
                }
            }
        }

        for(const targetId in players) {
            const target = players[targetId];
            if(!target.isAlive || targetId === aoe.ownerId) continue;
            
            if (owner.team === 'peace' && target.team === 'peace') continue;
            if (owner.team === target.team) continue;

            const dx = aoe.x - target.x;
            const dy = aoe.y - target.y;
            if(dx*dx + dy*dy <= aoe.radius * aoe.radius) {
                const dmg = target.maxHp * 0.05 * owner.dmgMulti; 
                target.hp -= dmg;
                io.emit('player_hit', { id: targetId, hp: target.hp });

                if(target.hp <= 0) {
                    target.isAlive = false;
                    owner.killCount++;
                    owner.score += 100;
                    target.team = owner.team; 
                    
                    savePlayer(owner);
                    savePlayer(target);

                    io.emit('player_update', target);
                    io.emit('player_die', { victimId: targetId, attackerId: aoe.ownerId });
                }
            }
        }
    }
}

function destroyAxe(axeId) {
    if(axes[axeId]) {
        clearTimeout(axes[axeId].timer);
        io.emit('axe_destroy', axeId);
        delete axes[axeId];
    }
}

function giveExp(player, amount) {
    player.exp += amount;
    if(player.exp >= player.level * 100) {
        player.exp = 0;
        player.level++;
        player.maxHp += 20;
        player.hp = player.maxHp;
        player.dmgMulti += 0.1; 
        savePlayer(player);
        io.emit('player_update', player); 
    }
}

function syncGameState() {
    if (Object.keys(players).length === 0) return;
    
    const syncData = {
        players: {},
        monsters: {}
    };

    for (const pId in players) {
        syncData.players[pId] = {
            x: players[pId].x,
            y: players[pId].y,
            score: players[pId].score
        };
    }

    for (const mId in monsters) {
        syncData.monsters[mId] = {
            x: monsters[mId].x,
            y: monsters[mId].y
        };
    }
    
    io.volatile.emit('sync', syncData);
}