// ==========================================
// Node.js Multiplay Server with Socket.IO & MySQL
// AutoBattle.io (Army System & King/Steal Mode)
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
    if (!player || !player.deviceId || player.isBot) return; 
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
let hasKing = false; 

// 직업 기본 스탯 정의
const CLASSES = {
    '번개':   { maxHp: 100, dmg: 40, speed: 20, aoe: false, projSpeed: 40, projLife: 100 }, 
    '광전사': { maxHp: 120, dmg: 25, speed: 10, aoe: false, projSpeed: 15, projLife: 1500 }, 
    '스톤':   { maxHp: 250, dmg: 10, speed: 15, aoe: false, projSpeed: 12, projLife: 1000 }, 
    '페인터': { maxHp: 80,  dmg: 0,  speed: 8,  aoe: true,  projSpeed: 0,  projLife: 3000 }  
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
            ownerId: null, 
            targetId: null, // 어그로 대상을 저장할 속성
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
        if(p && p.isAlive) {
            if (p.team === 'peace') {
                if (!hasKing) {
                    p.team = 'king_' + playerId;
                    p.isKing = true;
                    p.maxHp *= 3; 
                    p.hp = p.maxHp;
                    p.dmgMulti *= 2.0; 
                    hasKing = true;
                } else {
                    p.team = 'pvp_' + playerId;
                    p.maxHp *= 1.5;
                    p.hp = p.maxHp;
                    p.dmgMulti *= 1.2;
                }
            } else {
                if (p.isKing) {
                    hasKing = false;
                    p.isKing = false;
                }
                p.team = 'peace';
                p.maxHp = CLASSES[p.className].maxHp + (p.level - 1) * 20;
                if (p.hp > p.maxHp) p.hp = p.maxHp;
                p.dmgMulti = 1.0 + (p.level - 1) * 0.1;
            }
            savePlayer(p);
            io.emit('player_update', p);

            // 내 병사들도 나와 같은 팀으로 일제히 전환
            for(let bId in players) {
                if(players[bId].isBot && players[bId].ownerId === playerId) {
                    players[bId].team = p.team;
                    io.emit('player_update', players[bId]);
                }
            }
        }
    });

    socket.on('add_bot', () => {
        const p = players[playerId];
        if(!p || !p.isAlive) return;

        entityIdCounter++;
        const botId = 'bot_manual_' + entityIdCounter;
        
        const classNames = Object.keys(CLASSES);
        const randomClass = classNames[Math.floor(Math.random() * classNames.length)];

        players[botId] = {
            id: botId,
            deviceId: 'bot',
            className: randomClass,
            x: p.x + (Math.random() * 2 - 1), 
            y: p.y + (Math.random() * 2 - 1),
            hp: CLASSES[randomClass].maxHp,
            maxHp: CLASSES[randomClass].maxHp,
            dmgMulti: 1.0,
            dirX: 0, dirY: -1,
            score: 0, level: 1, exp: 0,
            isAlive: true, killCount: 0,
            team: p.team, 
            ownerId: playerId, 
            targetId: null, // 어그로 타겟 추가
            isKing: false,
            isBot: true
        };
        io.emit('player_join', players[botId]);
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
            p.team = 'peace'; 
            p.isKing = false;
            p.targetId = null;
            
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
            if(players[playerId].isKing) hasKing = false; 
            savePlayer(players[playerId]);
            
            // 본체가 나갔으므로 군대도 운명 공동체로 함께 증발
            for(let bId in players) {
                if(players[bId].isBot && players[bId].ownerId === playerId) {
                    io.emit('player_leave', bId);
                    delete players[bId];
                }
            }

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

function createBot(victimPlayer, ownerTeam, ownerId) {
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
        ownerId: ownerId, 
        targetId: null, // 어그로 타겟
        isKing: false,
        isBot: true
    };
    io.emit('player_join', players[botId]);
}

// 군대 어그로 호출 함수: 주인이 맞으면 해당 주인의 병사들에게 공격자 타겟을 지정
function alertArmy(ownerId, attackerId) {
    if (ownerId === attackerId) return; // 자해나 오발탄은 무시
    for (let bId in players) {
        let p = players[bId];
        if (p.isBot && p.ownerId === ownerId && p.isAlive) {
            p.targetId = attackerId; // 나를 때린 놈을 기억!
        }
    }
}

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

            // 1순위: 주인을 때린 적이 있고 살아있다면 그놈부터 최우선 공격
            if (p.targetId && players[p.targetId] && players[p.targetId].isAlive) {
                target = players[p.targetId];
            } else {
                p.targetId = null; // 복수 대상이 죽었거나 없으면 리셋
                
                // 2순위: 주변의 가장 가까운 몬스터 사냥
                for (let mId in monsters) {
                    if (!monsters[mId].isAlive) continue;
                    let dist = Math.hypot(p.x - monsters[mId].x, p.y - monsters[mId].y);
                    if (dist < minDist) { minDist = dist; target = monsters[mId]; }
                }
            }

            if (target) {
                // 타겟이 있으면 돌격 및 공격
                let dx = target.x - p.x;
                let dy = target.y - p.y;
                let mag = Math.hypot(dx, dy);
                if (mag > 0) {
                    p.dirX = dx / mag; p.dirY = dy / mag;
                }
                p.x += p.dirX * (CLASSES[p.className].speed / 100);
                p.y += p.dirY * (CLASSES[p.className].speed / 100);

                if (Math.random() < 0.05) executeThrow(id);
            } else {
                // 3순위: 타겟도 없고 몬스터도 없으면 주인 곁으로 호위 복귀
                if (p.ownerId && players[p.ownerId] && players[p.ownerId].isAlive) {
                    let owner = players[p.ownerId];
                    let dx = owner.x - p.x;
                    let dy = owner.y - p.y;
                    let mag = Math.hypot(dx, dy);
                    // 주인이 너무 멀어지면 따라감
                    if (mag > 2.0) { 
                        p.dirX = dx / mag; p.dirY = dy / mag;
                        p.x += p.dirX * (CLASSES[p.className].speed / 100);
                        p.y += p.dirY * (CLASSES[p.className].speed / 100);
                    }
                }
            }
        }
    }
}

function giveExp(playerObj, amount) {
    let target = playerObj;
    if (playerObj.isBot && playerObj.ownerId && players[playerObj.ownerId]) {
        target = players[playerObj.ownerId];
    }

    target.exp += amount;
    if(target.exp >= target.level * 100) {
        target.exp = 0; 
        target.level++; 
        target.maxHp += 20; 
        target.hp = target.maxHp; 
        target.dmgMulti += 0.1; 
        savePlayer(target);
        io.emit('player_update', target); 
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
            if (owner.team === 'peace' && target.team === 'peace') continue; 
            if (owner.team === target.team) continue; 

            const dx = axe.x - target.x; const dy = axe.y - target.y;
            if (dx * dx + dy * dy < 0.6 * 0.6) {
                target.hp -= axe.dmg;
                io.emit('player_hit', { id: targetId, hp: target.hp });

                // [추가] 내가 맞으면 내 병사들에게 공격자를 타겟으로 지정하여 돕게 만듦
                alertArmy(targetId, axe.ownerId);

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

                // [추가] 내가 맞으면 내 병사들에게 공격자를 타겟으로 지정하여 돕게 만듦
                alertArmy(targetId, aoe.ownerId);

                if(target.hp <= 0) {
                    handlePlayerDeath(target, targetId, owner, aoe.ownerId);
                }
            }
        }
    }
}

function handlePlayerDeath(target, targetId, owner, attackerId) {
    target.isAlive = false;

    let realKiller = owner;
    if (owner.isBot && owner.ownerId && players[owner.ownerId]) {
        realKiller = players[owner.ownerId];
    }
    
    realKiller.killCount++;
    realKiller.score += 100;

    let stolen = false;
    if (realKiller.isKing && Math.random() < 0.05) {
        stolen = true;
        createBot(target, realKiller.team, realKiller.id); 
    }

    target.level = 1; target.exp = 0; target.score = 0; target.killCount = 0; target.team = 'peace'; target.isKing = false; target.targetId = null;
    savePlayer(target);
    savePlayer(realKiller);

    io.emit('player_update', target);
    io.emit('player_die', { victimId: targetId, attackerId: attackerId, stolen: stolen });

    // [운명 공동체 로직] 죽은 타겟이 거느리던 군대(병사들)도 즉각 동반 폭사 처리
    for(let bId in players) {
        if(players[bId].isBot && players[bId].ownerId === targetId) {
            players[bId].isAlive = false;
            io.emit('player_die', { victimId: bId, attackerId: attackerId, stolen: false });
            delete players[bId];
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