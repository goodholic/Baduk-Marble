// ==========================================
// Node.js Multiplay Server with Socket.IO & MySQL
// AutoBattle.io (RPG & King/Steal Mode)
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
    if (!player || !player.deviceId || player.isBot) return; // 봇은 저장하지 않음
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
const MAX_PLAYERS = 50;
const MAX_MONSTERS = 25; 
let hasKing = false; // 최초 PvP 선택자를 왕으로 지정하기 위한 플래그

// 직업 기본 스탯 정의 (사거리, 공격력, 체력 세부 조정 반영)
const CLASSES = {
    '번개':   { maxHp: 100, dmg: 40, speed: 20, aoe: false, projSpeed: 40, projLife: 100 }, // 근접 암살자 (투사체 생명력 매우 짧음)
    '광전사': { maxHp: 120, dmg: 25, speed: 10, aoe: false, projSpeed: 15, projLife: 1500 }, // 원거리 전사 
    '스톤':   { maxHp: 250, dmg: 10, speed: 15, aoe: false, projSpeed: 12, projLife: 1000 }, // 방패병 
    '페인터': { maxHp: 80,  dmg: 0,  speed: 8,  aoe: true,  projSpeed: 0,  projLife: 3000 }  // 마법사 (% 데미지)
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
                if(data.className && CLASSES[data.className]) selectedClass = data.className;
                if(data.deviceId) deviceId = data.deviceId;
            }
        } catch(e) {}

        socket.deviceId = deviceId;

        let loadedData = null;
        try {
            const [rows] = await pool.query('SELECT * FROM players_save WHERE device_id = ?', [deviceId]);
            if(rows.length > 0) loadedData = rows[0];
        } catch(e) {}

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
            team: 'peace',
            isKing: false,
            isBot: false
        };

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

            if(pInfo.team.startsWith('king_')) {
                pInfo.isKing = true;
                pInfo.maxHp *= 3;
                pInfo.hp = pInfo.maxHp;
                pInfo.dmgMulti *= 2.0;
            }
        } else {
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
            if (players[playerId] && players[playerId].isAlive && !players[playerId].isBot) {
                players[playerId].x = moveData.x;
                players[playerId].y = moveData.y;
                if (moveData.dirX !== undefined && moveData.dirY !== undefined) {
                    players[playerId].dirX = moveData.dirX;
                    players[playerId].dirY = moveData.dirY;
                }
            }
        } catch (e) { }
    });

    socket.on('toggle_pvp', () => {
        const p = players[playerId];
        if(p && p.isAlive && p.team === 'peace') {
            if (!hasKing) {
                p.team = 'king_' + playerId;
                p.isKing = true;
                p.maxHp *= 3; 
                p.hp = p.maxHp;
                p.dmgMulti *= 2.0; 
                hasKing = true;
                console.log(`${playerId} became the FIRST KING!`);
            } else {
                p.team = 'pvp_' + playerId;
                p.maxHp *= 1.5;
                p.hp = p.maxHp;
                p.dmgMulti *= 1.2;
            }
            savePlayer(p);
            io.emit('player_update', p);
        }
    });

    socket.on('throw', (data) => {
        executeThrow(playerId);
    });

    socket.on('respawn', (dataStr) => {
        let newClass = '광전사'; 
        try {
            if(dataStr) {
                const data = JSON.parse(dataStr);
                if(data.className && CLASSES[data.className]) newClass = data.className;
            }
        } catch(e) {}

        if (players[playerId] && !players[playerId].isAlive) {
            const p = players[playerId];
            p.className = newClass;
            p.level = 1; p.exp = 0; p.score = 0; p.killCount = 0;
            p.team = 'peace'; // 죽으면 무조건 평화 모드로 처음부터
            p.isKing = false;
            
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
        if (players[playerId]) {
            if(players[playerId].isKing) hasKing = false; // 왕이 나가면 초기화
            savePlayer(players[playerId]);
            delete players[playerId];
            io.emit('player_leave', playerId);
        }
    });
});

function executeThrow(pId) {
    const player = players[pId];
    if (player && player.isAlive && player.dirX !== undefined) {
        const mag = Math.sqrt(player.dirX * player.dirX + player.dirY * player.dirY);
        let finalDirX = 0; let finalDirY = 1;

        if (mag > 0.01) {
            finalDirX = player.dirX / mag;
            finalDirY = player.dirY / mag;
        }

        const classInfo = CLASSES[player.className];
        entityIdCounter++;
        const currentObjId = entityIdCounter;

        if(classInfo.aoe) {
            aoes[currentObjId] = {
                id: currentObjId, ownerId: pId, x: player.x, y: player.y, radius: 1.5, timer: null
            };
            io.emit('aoe_spawn', aoes[currentObjId]);
            aoes[currentObjId].timer = setTimeout(() => {
                if (aoes[currentObjId]) { io.emit('aoe_destroy', currentObjId); delete aoes[currentObjId]; }
            }, classInfo.projLife);
        } else {
            axes[currentObjId] = {
                id: currentObjId, ownerId: pId, x: player.x + finalDirX * 0.5, y: player.y + finalDirY * 0.5,
                dirX: finalDirX, dirY: finalDirY, speed: classInfo.projSpeed, dmg: classInfo.dmg * player.dmgMulti, timer: null
            };
            io.emit('axe_spawn', axes[currentObjId]);
            axes[currentObjId].timer = setTimeout(() => {
                if (axes[currentObjId]) { io.emit('axe_destroy', currentObjId); delete axes[currentObjId]; }
            }, classInfo.projLife);
        }
    }
}

// 뺏긴 캐릭터를 왕의 봇(미니언)으로 생성
function createBot(victimPlayer, ownerTeam) {
    entityIdCounter++;
    const botId = 'bot_' + entityIdCounter;
    players[botId] = {
        id: botId,
        deviceId: 'bot',
        className: victimPlayer.className,
        x: victimPlayer.x,
        y: victimPlayer.y,
        hp: victimPlayer.maxHp,
        maxHp: victimPlayer.maxHp,
        dmgMulti: victimPlayer.dmgMulti,
        dirX: 0, dirY: -1,
        score: 0, level: victimPlayer.level, exp: 0,
        isAlive: true, killCount: 0,
        team: ownerTeam,
        isKing: false,
        isBot: true
    };
    io.emit('player_join', players[botId]);
}

const TICK_RATE = 30;
const TICK_TIME = 1000 / TICK_RATE;
let tickCounter = 0;

setInterval(() => {
    tickCounter++;
    handleCollisions();
    
    // 몬스터 랜덤 이동
    if(tickCounter % 30 === 0) {
        for(let mId in monsters) {
            monsters[mId].x += (Math.random() * 2 - 1);
            monsters[mId].y += (Math.random() * 2 - 1);
        }
    }

    // 봇 자동 사냥 로직
    updateBots();

    if(tickCounter % 15 === 0) handleAoeDamage();

    syncGameState();
}, TICK_TIME);

function updateBots() {
    for (let id in players) {
        let p = players[id];
        if (p.isBot && p.isAlive) {
            let target = null;
            let minDist = 9999;
            for (let mId in monsters) {
                if (!monsters[mId].isAlive) continue;
                let dist = Math.hypot(p.x - monsters[mId].x, p.y - monsters[mId].y);
                if (dist < minDist) { minDist = dist; target = monsters[mId]; }
            }
            if (target) {
                let dx = target.x - p.x;
                let dy = target.y - p.y;
                let mag = Math.hypot(dx, dy);
                if (mag > 0) {
                    p.dirX = dx / mag; p.dirY = dy / mag;
                }
                p.x += p.dirX * (CLASSES[p.className].speed / 100);
                p.y += p.dirY * (CLASSES[p.className].speed / 100);

                if (Math.random() < 0.05) executeThrow(id);
            }
        }
    }
}

function handleCollisions() {
    for (const axeId in axes) {
        const axe = axes[axeId];
        const owner = players[axe.ownerId];
        if (!owner) continue;

        let axeDestroyed = false;

        for(const mId in monsters) {
            const mob = monsters[mId];
            if(!mob.isAlive) continue;

            const dx = axe.x - mob.x; const dy = axe.y - mob.y;
            if(dx*dx + dy*dy < 1.0) {
                mob.hp -= axe.dmg;
                if(mob.hp <= 0) {
                    mob.isAlive = false; delete monsters[mId]; io.emit('monster_die', mId);
                    giveExp(owner, 20); spawnMonster(); io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                } else {
                    io.emit('monster_hit', { id: mId, hp: mob.hp });
                }
                destroyAxe(axeId); axeDestroyed = true; break;
            }
        }

        if(axeDestroyed) continue;

        for (const targetId in players) {
            const target = players[targetId];
            if (targetId === axe.ownerId || !target.isAlive) continue;
            if (owner.team === 'peace' && target.team === 'peace') continue; // 평화주의자끼리는 공격 불가
            if (owner.team === target.team) continue; // 같은 팀 공격 불가

            const dx = axe.x - target.x; const dy = axe.y - target.y;
            if (dx * dx + dy * dy < 0.6 * 0.6) {
                target.hp -= axe.dmg;
                io.emit('player_hit', { id: targetId, hp: target.hp });
                destroyAxe(axeId);

                if (target.hp <= 0) {
                    handlePlayerDeath(target, targetId, owner, axe.ownerId);
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
            const dx = aoe.x - mob.x; const dy = aoe.y - mob.y;
            if(dx*dx + dy*dy <= aoe.radius * aoe.radius) {
                mob.hp -= (mob.maxHp * 0.1); 
                if(mob.hp <= 0) {
                    mob.isAlive = false; delete monsters[mId]; io.emit('monster_die', mId);
                    giveExp(owner, 20); spawnMonster(); io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                } else { io.emit('monster_hit', { id: mId, hp: mob.hp }); }
            }
        }

        for(const targetId in players) {
            const target = players[targetId];
            if(!target.isAlive || targetId === aoe.ownerId) continue;
            if (owner.team === 'peace' && target.team === 'peace') continue;
            if (owner.team === target.team) continue;

            const dx = aoe.x - target.x; const dy = aoe.y - target.y;
            if(dx*dx + dy*dy <= aoe.radius * aoe.radius) {
                target.hp -= (target.maxHp * 0.05 * owner.dmgMulti); 
                io.emit('player_hit', { id: targetId, hp: target.hp });

                if(target.hp <= 0) {
                    handlePlayerDeath(target, targetId, owner, aoe.ownerId);
                }
            }
        }
    }
}

function handlePlayerDeath(target, targetId, owner, attackerId) {
    target.isAlive = false;
    owner.killCount++;
    owner.score += 100;

    // 왕에게 죽었을 시 5% 확률로 봇으로 뺏김
    let stolen = false;
    if (owner.isKing && Math.random() < 0.05) {
        stolen = true;
        createBot(target, owner.team); // 봇으로 부활시켜 왕의 팀으로 귀속
    }

    // 죽으면 데이터 초기화 (다시 키워야 함)
    target.level = 1; target.exp = 0; target.score = 0; target.killCount = 0; target.team = 'peace'; target.isKing = false;
    savePlayer(target);
    savePlayer(owner);

    io.emit('player_update', target);
    io.emit('player_die', { victimId: targetId, attackerId: attackerId, stolen: stolen });
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
        player.exp = 0; player.level++; player.maxHp += 20; player.hp = player.maxHp; player.dmgMulti += 0.1; 
        savePlayer(player);
        io.emit('player_update', player); 
    }
}

function syncGameState() {
    if (Object.keys(players).length === 0) return;
    
    const syncData = { players: {}, monsters: {} };

    for (const pId in players) {
        if(players[pId].isAlive) {
            syncData.players[pId] = { x: players[pId].x, y: players[pId].y, score: players[pId].score };
        }
    }
    for (const mId in monsters) {
        syncData.monsters[mId] = { x: monsters[mId].x, y: monsters[mId].y };
    }
    
    io.volatile.emit('sync', syncData);
}