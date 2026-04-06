// ==========================================
// AutoBattle.io — Lineage-like Auto-Battle RPG Server
// Node.js + Socket.IO + MySQL
// ==========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mysql = require('mysql2/promise');

// 게임 모듈
const { RECIPES, handleCraft } = require('./game/craft');
const { PETS, MOUNTS, handleBuyPet, handleBuyMount, getPetEffect, getMountSpeed } = require('./game/pet');
const { BUFF_TYPES, applyBuff, removeBuff, updateBuffs, getBuffedStat, isStunned, TITLES, checkTitles, getTitleBonus } = require('./game/buff');
const GameConfig = require('./game/config');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
const PORT = process.env.PORT || 3000;

// 토스페이먼츠 테스트 키
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R';

// 다이아몬드 상품
const DIAMOND_PRODUCTS = {
    'diamond_100':  { diamonds: 100,  price: 1000,  name: '다이아 100개' },
    'diamond_500':  { diamonds: 500,  price: 4500,  name: '다이아 500개 (+10% 보너스)' },
    'diamond_1000': { diamonds: 1100, price: 9000,  name: '다이아 1100개 (+20% 보너스)' },
    'diamond_3000': { diamonds: 3500, price: 25000, name: '다이아 3500개 (+30% 보너스)' },
};

app.get('/health', (req, res) => res.send('AutoBattle.io Server Running'));

// 결제 성공 페이지
app.get('/payment/success', async (req, res) => {
    const { paymentKey, orderId, amount } = req.query;

    try {
        // 토스페이먼츠 결제 승인 API 호출
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(TOSS_SECRET_KEY + ':').toString('base64'),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        });

        const result = await response.json();

        if (result.status === 'DONE') {
            // 결제 성공 → 다이아몬드 지급
            const parts = orderId.split('_');
            const productId = parts[0] + '_' + parts[1];
            const deviceId = parts.slice(2, -1).join('_');
            const product = DIAMOND_PRODUCTS[productId];

            if (product && Number(amount) === product.price) {
                // 접속 중인 플레이어 찾기
                for (const pId in players) {
                    if (players[pId].deviceId === deviceId && !players[pId].isBot) {
                        players[pId].diamonds = (players[pId].diamonds || 0) + product.diamonds;
                        savePlayer(players[pId]);
                        io.to(pId).emit('player_update', players[pId]);
                        io.to(pId).emit('shop_result', {
                            success: true,
                            msg: `${product.name} 구매 완료! +${product.diamonds} 다이아`,
                            diamonds: players[pId].diamonds
                        });
                        break;
                    }
                }
            }

            res.send(`<html><head><meta charset="utf-8"><script>
                alert('결제 완료! ${product ? product.diamonds : 0} 다이아몬드가 지급되었습니다.');
                window.close(); setTimeout(()=>location.href='/',1000);
            </script></head></html>`);
        } else {
            res.send(`<html><head><meta charset="utf-8"><script>
                alert('결제 확인 실패: ${result.message || "알 수 없는 오류"}');
                window.close(); setTimeout(()=>location.href='/',1000);
            </script></head></html>`);
        }
    } catch (err) {
        console.error('[Payment] Error:', err.message);
        res.send(`<html><head><meta charset="utf-8"><script>
            alert('결제 처리 중 오류가 발생했습니다.');
            window.close(); setTimeout(()=>location.href='/',1000);
        </script></head></html>`);
    }
});

// 결제 실패 페이지
app.get('/payment/fail', (req, res) => {
    res.send(`<html><head><meta charset="utf-8"><script>
        alert('결제가 취소되었습니다.');
        window.close(); setTimeout(()=>location.href='/',1000);
    </script></head></html>`);
});

// 상품 목록 API
app.get('/api/products', (req, res) => {
    res.json(DIAMOND_PRODUCTS);
});

server.listen(PORT, () => {
    console.log(`[AutoBattle.io] Server running on port ${PORT}`);
});

// ==========================================
// Database
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
initDB();

async function savePlayer(player) {
    if (!player || !player.deviceId || player.isBot) return;

    let myArmy = [];
    for (let bId in players) {
        const b = players[bId];
        if (b.isBot && b.ownerId === player.id && b.isAlive) {
            myArmy.push({
                className: b.className, x: b.x, y: b.y,
                hp: b.hp, maxHp: b.maxHp, level: b.level
            });
        }
    }

    // 확장 데이터 (JSON으로 직렬화)
    const extData = JSON.stringify({
        equipped: player.equipped || {},
        enchantLevels: player.enchantLevels || {},
        equipOptions: player.equipOptions || {},
        inventory: player.inventory || {},
        warehouse: player.warehouse || {},
        diamonds: player.diamonds || 0,
        statPoints: player.statPoints || 0,
        bonusStr: player.bonusStr || 0, bonusDex: player.bonusDex || 0,
        bonusInt: player.bonusInt || 0, bonusCon: player.bonusCon || 0,
        isAdvanced: player.isAdvanced || false,
        advancedClass: player.advancedClass || null,
        baseClassName: player.baseClassName || null,
        pvpWins: player.pvpWins || 0,
        towerHighest: player.towerHighest || 0,
        attendance: player.attendance || {},
        lastLoginDate: player.lastLoginDate || null,
        lastWeek: player.lastWeek || null,
        clanName: player.clanName || null,
        activePet: player.activePet || null,
        pets: player.pets || [],
        activeMount: player.activeMount || null,
        mounts: player.mounts || [],
        titles: player.titles || [],
        activeTitle: player.activeTitle || null,
        activeSkin: player.activeSkin || null,
        skins: player.skins || [],
        morphKills: player.morphKills || {},
        totalTamed: player.totalTamed || 0,
        totalTradeProfit: player.totalTradeProfit || 0,
        totalCrafts: player.totalCrafts || 0,
        dungeonClears: player.dungeonClears || 0,
        bestiary: player.bestiary || {},
        waypoints: player.waypoints || ['aden'],
        faction: player.faction || null,
        factionRep: player.factionRep || 0,
        prestigeLevel: player.prestigeLevel || 0,
        legacyPerks: player.legacyPerks || [],
        itemRunes: player.itemRunes || {},
        _riftDepth: player._riftDepth || 0,
        discoveredZones: player.discoveredZones || [],
        fishingLevel: player.fishingLevel || 1,
        _fishCount: player._fishCount || 0,
        maxArmy: player.maxArmy || 30,
        autoPotion: player.autoPotion || false,
        questProgress: player.questProgress || {},
        questCompleted: player.questCompleted || {},
    });

    try {
        await pool.query(`
            INSERT INTO players_save (device_id, class_name, level, exp, gold, kill_count, karma, team, is_alive, army_data, ext_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            class_name=VALUES(class_name), level=VALUES(level), exp=VALUES(exp),
            gold=VALUES(gold), kill_count=VALUES(kill_count), karma=VALUES(karma),
            team=VALUES(team), is_alive=VALUES(is_alive), army_data=VALUES(army_data),
            ext_data=VALUES(ext_data)
        `, [player.deviceId, player.className, player.level, player.exp,
            player.gold, player.killCount, player.karma, player.team,
            player.isAlive, JSON.stringify(myArmy), extData]);
    } catch (error) {
        console.error("[DB] Save Error:", error);
    }
}

// ==========================================
// 맵 존 시스템
// ==========================================
// 맵 1000x1000 (-500 ~ 500)
const ZONES = {
    // ── 마을 5곳 (안전지대, 교역 거점) ──
    aden:       { name:'바람개비 마을',    x:-500, y:-500, w:60, h:60, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이','힐러','제작소'] },
    harbor:     { name:'별빛 항구',       x:350,  y:-450, w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','펫 상인','항해사'] },
    oasis:      { name:'달빛 오아시스',    x:-100, y:0,    w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','제작소'] },
    mountain:   { name:'구름마루 산장',    x:300,  y:100,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이'] },
    frontier:   { name:'끝자락 전초기지',  x:-300, y:350,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','힐러'] },
    // ── 초보 사냥터 (마을 주변) ──
    forest:     { name:'이슬숲',          x:-420, y:-400, w:80, h:70, lvl:[1,10],  safe:false, bg:'map_forest' },
    plains:     { name:'해바라기 들판',    x:-300, y:-450, w:80, h:60, lvl:[3,12],  safe:false, bg:'map_plains' },
    meadow:     { name:'꽃잎 초원',       x:-150, y:-400, w:70, h:60, lvl:[5,15],  safe:false, bg:'map_plains' },
    // ── 중급 사냥터 (교역로 중간) ──
    swamp:      { name:'안개골 늪지',     x:50,   y:-350, w:70, h:70, lvl:[10,20], safe:false, bg:'map_forest' },
    desert:     { name:'붉은모래 사막',    x:200,  y:-350, w:80, h:70, lvl:[12,22], safe:false, bg:'map_plains' },
    cave:       { name:'수정 동굴',       x:-400, y:-200, w:70, h:70, lvl:[15,25], safe:false, bg:'map_dungeon' },
    ruins:      { name:'달그림자 유적',    x:-250, y:-200, w:70, h:60, lvl:[18,28], safe:false, bg:'map_dungeon' },
    coral:      { name:'산호초 해안',     x:400,  y:-250, w:60, h:60, lvl:[10,18], safe:false, bg:'map_plains' },
    // ── 고급 사냥터 ──
    volcano:    { name:'불꽃산',          x:150,  y:-150, w:80, h:70, lvl:[25,40], safe:false, bg:'map_dragon' },
    graveyard:  { name:'고요한 무덤',     x:-400, y:-50,  w:70, h:60, lvl:[28,38], safe:false, bg:'map_dungeon' },
    darkforest: { name:'그림자숲',        x:200,  y:-50,  w:70, h:70, lvl:[30,45], safe:false, bg:'map_forest' },
    glacier:    { name:'얼음 협곡',       x:-350, y:100,  w:70, h:60, lvl:[25,35], safe:false, bg:'map_dungeon' },
    // ── 최상급/보스 ──
    dragon:     { name:'용의 요람',       x:350,  y:150,  w:70, h:70, lvl:[35,99], safe:false, bg:'map_dragon' },
    abyss:      { name:'어둠의 심연',     x:-400, y:200,  w:80, h:70, lvl:[40,99], safe:false, bg:'map_chaos' },
    hell:       { name:'혼돈의 문',       x:-200, y:250,  w:70, h:70, lvl:[45,99], safe:false, bg:'map_chaos' },
    ancient:    { name:'태고의 숲',       x:100,  y:300,  w:80, h:70, lvl:[35,50], safe:false, bg:'map_forest' },
    // ── PK 존 ──
    chaos:      { name:'피의 골짜기',     x:100,  y:200,  w:80, h:70, lvl:[20,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    warzone:    { name:'전쟁의 벌판',     x:-100, y:350,  w:90, h:70, lvl:[15,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    // ── 특수 ──
    castle:     { name:'하늘의 성채',     x:0,    y:400,  w:80, h:70, lvl:[20,99], safe:false, bg:'map_dungeon', isCastle:true },
    arena:      { name:'투기장',          x:350,  y:350,  w:50, h:50, lvl:[10,99], safe:true,  bg:'map_dungeon', isArena:true },
    // ── 확장 맵: 동부 (x:500~1000) ──
    port_east:  { name:'동쪽 항구',       x:700,  y:-700, w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','항해사','힐러'] },
    mushroom:   { name:'버섯 골짜기',     x:600,  y:-500, w:80, h:70, lvl:[5,12],  safe:false, bg:'map_forest' },
    riverbank:  { name:'강변 평야',       x:800,  y:-300, w:80, h:60, lvl:[8,18],  safe:false, bg:'map_plains' },
    sandstorm:  { name:'모래폭풍 협곡',    x:600,  y:-100, w:80, h:70, lvl:[15,25], safe:false, bg:'map_plains' },
    sunken:     { name:'수몰 신전',       x:700,  y:100,  w:70, h:70, lvl:[20,30], safe:false, bg:'map_dungeon' },
    shadow:     { name:'그림자 영역',     x:800,  y:400,  w:70, h:70, lvl:[32,45], safe:false, bg:'map_chaos' },
    celestial:  { name:'천공의 정상',     x:700,  y:700,  w:80, h:80, lvl:[40,60], safe:false, bg:'map_dragon' },
    void_rift:  { name:'공허의 균열',     x:900,  y:900,  w:70, h:70, lvl:[50,99], safe:false, bg:'map_chaos' },
    fishing:    { name:'낚시 만',         x:900,  y:0,    w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_plains', npcs:['낚시꾼','상점'] },
    blood_arena:{ name:'피의 투기장',     x:500,  y:-800, w:70, h:70, lvl:[20,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    colosseum:  { name:'대투기장',        x:900,  y:-900, w:60, h:60, lvl:[15,99], safe:true,  bg:'map_dungeon', isArena:true },
    // ── 확장 맵: 서부 (x:-500~-1000) ──
    shrine:     { name:'신전 마을',       x:-800, y:200,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이','힐러','제작소'] },
    tundra:     { name:'얼어붙은 평원',    x:-700, y:-700, w:80, h:70, lvl:[1,8],   safe:false, bg:'map_plains' },
    crystal_mine:{ name:'수정 광산',      x:-800, y:-200, w:70, h:70, lvl:[18,28], safe:false, bg:'map_dungeon' },
    toxic_marsh:{ name:'독안개 습지',     x:-700, y:400,  w:80, h:70, lvl:[12,22], safe:false, bg:'map_forest' },
    haunted:    { name:'유령의 저택',     x:-600, y:600,  w:70, h:70, lvl:[22,35], safe:false, bg:'map_dungeon' },
    sky_ruins:  { name:'하늘 유적',       x:-800, y:700,  w:80, h:70, lvl:[30,45], safe:false, bg:'map_dungeon' },
    frozen_deep:{ name:'빙결 심연',       x:-600, y:-800, w:70, h:70, lvl:[35,50], safe:false, bg:'map_dungeon' },
    demon:      { name:'마왕성',          x:-800, y:900,  w:80, h:80, lvl:[45,60], safe:false, bg:'map_chaos' },
    lawless:    { name:'무법 황야',       x:-500, y:800,  w:80, h:70, lvl:[25,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    // ── 확장 맵: 중앙 확장 ──
    bazaar:     { name:'사막 시장',       x:500,  y:500,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','요리사','제작소'] },
    world_tree: { name:'세계수',          x:0,    y:800,  w:80, h:80, lvl:[50,99], safe:false, bg:'map_forest' },
    fortress:   { name:'북부 요새',       x:0,    y:-900, w:70, h:70, lvl:[25,99], safe:false, bg:'map_dungeon', isCastle:true },
    training:   { name:'훈련장',          x:-900, y:0,    w:60, h:60, lvl:[1,15],  safe:false, bg:'map_plains' },
    magma_core: { name:'용암 핵심부',     x:500,  y:300,  w:70, h:70, lvl:[28,42], safe:false, bg:'map_dragon' },
};

// 존별 몬스터 배합 + 보너스
const ZONE_MONSTERS = {
    // 초보: 노말 위주
    forest:    { tiers:{ normal:80, elite:15, rare:5 },  expBonus:0, goldBonus:0 },
    plains:    { tiers:{ normal:75, elite:20, rare:5 },  expBonus:0, goldBonus:0 },
    meadow:    { tiers:{ normal:70, elite:25, rare:5 },  expBonus:0, goldBonus:0 },
    // 중급: 엘리트 혼합
    swamp:     { tiers:{ normal:40, elite:45, rare:15 }, expBonus:0.1, goldBonus:0 },
    desert:    { tiers:{ normal:35, elite:45, rare:18, boss:2 }, expBonus:0.1, goldBonus:0.1 },
    cave:      { tiers:{ normal:20, elite:40, rare:30, boss:10 }, expBonus:0.3, goldBonus:0 },
    ruins:     { tiers:{ normal:20, elite:35, rare:35, boss:10 }, expBonus:0.2, goldBonus:0.1 },
    coral:     { tiers:{ normal:50, elite:35, rare:15 }, expBonus:0, goldBonus:0.1 },
    // 고급: 레어+보스
    volcano:   { tiers:{ elite:30, rare:50, boss:20 }, expBonus:0.2, goldBonus:0.2 },
    graveyard: { tiers:{ elite:25, rare:50, boss:25 }, expBonus:0.15, goldBonus:0.15 },
    darkforest:{ tiers:{ elite:20, rare:45, boss:35 }, expBonus:0.25, goldBonus:0.2 },
    glacier:   { tiers:{ elite:30, rare:45, boss:25 }, expBonus:0.2, goldBonus:0.15 },
    // 최상급: 보스 다수
    dragon:    { tiers:{ rare:25, boss:60, legendary:15 }, expBonus:0.3, goldBonus:0.5 },
    abyss:     { tiers:{ rare:20, boss:60, legendary:20 }, expBonus:0.4, goldBonus:0.3 },
    hell:      { tiers:{ rare:15, boss:60, legendary:25 }, expBonus:0.5, goldBonus:0.4 },
    ancient:   { tiers:{ rare:30, boss:55, legendary:15 }, expBonus:0.35, goldBonus:0.3 },
    // PK존: 모든 등급 강화
    chaos:     { tiers:{ elite:20, rare:40, boss:40 }, expBonus:0.4, goldBonus:0.4 },
    warzone:   { tiers:{ elite:30, rare:40, boss:30 }, expBonus:0.3, goldBonus:0.3 },
    // 확장 존
    mushroom:    { tiers:{ normal:70, elite:25, rare:5 },  expBonus:0, goldBonus:0 },
    riverbank:   { tiers:{ normal:55, elite:35, rare:10 }, expBonus:0.05, goldBonus:0.05 },
    tundra:      { tiers:{ normal:85, elite:15 },          expBonus:0, goldBonus:0 },
    training:    { tiers:{ normal:90, elite:10 },          expBonus:0.1, goldBonus:0 },
    toxic_marsh: { tiers:{ normal:35, elite:45, rare:20 }, expBonus:0.15, goldBonus:0.1 },
    sandstorm:   { tiers:{ normal:25, elite:40, rare:30, boss:5 }, expBonus:0.2, goldBonus:0.15 },
    crystal_mine:{ tiers:{ normal:20, elite:35, rare:35, boss:10 }, expBonus:0.25, goldBonus:0.2 },
    sunken:      { tiers:{ elite:30, rare:45, boss:25 }, expBonus:0.25, goldBonus:0.2 },
    haunted:     { tiers:{ elite:25, rare:45, boss:30 }, expBonus:0.2, goldBonus:0.2 },
    magma_core:  { tiers:{ elite:15, rare:50, boss:35 }, expBonus:0.3, goldBonus:0.25 },
    sky_ruins:   { tiers:{ elite:10, rare:45, boss:40, legendary:5 }, expBonus:0.35, goldBonus:0.3 },
    shadow:      { tiers:{ rare:35, boss:50, legendary:15 }, expBonus:0.4, goldBonus:0.35 },
    frozen_deep: { tiers:{ rare:30, boss:50, legendary:20 }, expBonus:0.4, goldBonus:0.3 },
    celestial:   { tiers:{ rare:20, boss:45, legendary:30, mythic:5 }, expBonus:0.5, goldBonus:0.5 },
    demon:       { tiers:{ rare:15, boss:40, legendary:35, mythic:10 }, expBonus:0.6, goldBonus:0.5 },
    world_tree:  { tiers:{ boss:30, legendary:40, mythic:30 }, expBonus:0.7, goldBonus:0.6 },
    void_rift:   { tiers:{ boss:25, legendary:35, mythic:40 }, expBonus:0.8, goldBonus:0.7 },
    blood_arena: { tiers:{ elite:20, rare:35, boss:35, legendary:10 }, expBonus:0.5, goldBonus:0.5 },
    lawless:     { tiers:{ elite:25, rare:40, boss:30, legendary:5 }, expBonus:0.4, goldBonus:0.4 },
};

// NPC 정의
const NPCS = {
    '상점':    { type:'shop',    msg:'어서오세요! 물건을 사고파세요.' },
    '대장장이': { type:'smith',   msg:'장비를 강화해드리겠습니다.' },
    '힐러':    { type:'healer',  msg:'치료해드릴까요? (무료)' },
    '낚시꾼':  { type:'fisher',  msg:'낚시를 하려면 낚싯대가 필요합니다.' },
    '요리사':  { type:'cook',    msg:'재료를 가져오시면 요리를 만들어드립니다.' },
    '항해사':  { type:'travel',  msg:'다른 마을로 이동하시겠습니까?' },
};

// 성 소유
let castleOwner = null;
let siegeActive = false;
let siegeTimer = null;

// ==========================================
// 거상 — 마을별 상점 가격 변동
// ==========================================
const TRADE_GOODS = {
    'goods_silk':      { name:'비단',      basePrice: 100 },
    'goods_iron':      { name:'철광석',     basePrice: 50 },
    'goods_herb':      { name:'약초',      basePrice: 30 },
    'goods_gem':       { name:'보석',      basePrice: 200 },
    'goods_wood':      { name:'목재',      basePrice: 40 },
    'goods_leather':   { name:'가죽',      basePrice: 60 },
    'goods_spice':     { name:'향신료',     basePrice: 150 },
    'goods_potion':    { name:'물약 원료',  basePrice: 80 },
    'goods_pearl':     { name:'진주',      basePrice: 300 },
    'goods_crystal':   { name:'마법 수정',  basePrice: 250 },
    'goods_wine':      { name:'고급 와인',  basePrice: 180 },
    'goods_fur':       { name:'고급 모피',  basePrice: 120 },
    'goods_incense':   { name:'향',        basePrice: 90 },
    'goods_dye':       { name:'염료',      basePrice: 70 },
    'goods_salt':      { name:'소금',      basePrice: 35 },
    'goods_fish':      { name:'건어물',     basePrice: 55 },
    'goods_gold_bar':  { name:'금괴',      basePrice: 500 },
    'goods_dragon_eye':{ name:'용의 눈',   basePrice: 800 },
    'goods_star_dust': { name:'별의 가루',  basePrice: 400 },
    'goods_moonstone': { name:'월석',      basePrice: 350 },
};

let townPrices = {};
function updateTownPrices() {
    const towns = ['aden', 'harbor', 'oasis', 'mountain', 'frontier', 'port_east', 'shrine', 'bazaar'];
    for (const town of towns) {
        townPrices[town] = {};
        for (const [id, good] of Object.entries(TRADE_GOODS)) {
            const mult = 0.5 + Math.random() * 1.5;
            townPrices[town][id] = {
                buyPrice: Math.floor(good.basePrice * mult),
                sellPrice: Math.floor(good.basePrice * mult * 0.9),
                name: good.name,
            };
        }
    }
}
updateTownPrices();
setInterval(updateTownPrices, 600000); // 10분마다 변동

// ==========================================
// 포켓몬 — 몬스터 테이밍
// ==========================================
const TAME_RATES = { normal:0.30, elite:0.15, rare:0.08, boss:0.03 };
const TAME_COSTS = { normal: 50, elite: 150, rare: 300, boss: 500, legendary: 1000, mythic: 2000 };

function getZone(x, y) {
    for (const [id, z] of Object.entries(ZONES)) {
        if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return { id, ...z };
    }
    return { id:'plains', ...ZONES.plains }; // 기본값
}

// ==========================================
// BM 상점 시스템 (프리미엄 화폐: 다이아몬드)
// ==========================================
const SHOP_ITEMS = {
    // 소모품
    'exp_boost':     { name:'경험치 2배 부스터', price:50,  currency:'diamond', effect:'exp_boost', value:2, duration:300, desc:'5분간 EXP 2배' },
    'gold_boost':    { name:'골드 2배 부스터',   price:50,  currency:'diamond', effect:'gold_boost', value:2, duration:300, desc:'5분간 골드 2배' },
    'hp_potion_big': { name:'상급 HP 물약 x10',  price:30,  currency:'diamond', effect:'hp_potion', value:800, count:10, desc:'HP 800 즉시 회복' },
    'revive_scroll': { name:'부활 주문서 x3',    price:80,  currency:'diamond', effect:'revive', count:3, desc:'현재 위치에서 즉시 부활' },
    'protect_scroll':{ name:'강화 보호 주문서',  price:100, currency:'diamond', effect:'protect', count:1, desc:'강화 실패 시 파괴 방지' },
    // 편의
    'inventory_expand':{ name:'용병 슬롯 +5',   price:200, currency:'diamond', effect:'army_expand', value:5, desc:'최대 용병 수 +5 (영구)' },
    'auto_loot_range': { name:'루팅 범위 확대',  price:150, currency:'diamond', effect:'loot_range', value:2, duration:3600, desc:'1시간 루팅 범위 2배' },
    // 코스메틱
    'skin_golden':   { name:'황금 오라 스킨',    price:300, currency:'diamond', effect:'skin', value:'golden', desc:'캐릭터 황금빛 이펙트 (영구)' },
    'skin_shadow':   { name:'그림자 스킨',       price:300, currency:'diamond', effect:'skin', value:'shadow', desc:'캐릭터 어둠 이펙트 (영구)' },
    'skin_flame':    { name:'화염 스킨',         price:500, currency:'diamond', effect:'skin', value:'flame', desc:'캐릭터 불꽃 이펙트 (영구)' },
    // 골드로 구매
    'hp_potion_s':   { name:'하급 HP 물약 x10',  price:100, currency:'gold', effect:'hp_potion', value:100, count:10, desc:'HP 100 즉시 회복' },
    'hp_potion_m':   { name:'중급 HP 물약 x10',  price:300, currency:'gold', effect:'hp_potion', value:300, count:10, desc:'HP 300 즉시 회복' },
    'atk_boost':     { name:'공격 부스터',       price:500, currency:'gold', effect:'atk_boost', value:1.3, duration:60, desc:'1분간 ATK 30% 증가' },
    'def_boost':     { name:'방어 부스터',       price:500, currency:'gold', effect:'def_boost', value:1.3, duration:60, desc:'1분간 DEF 30% 증가' },
    'town_scroll':   { name:'귀환 주문서',       price:200, currency:'gold', effect:'teleport', value:'village', desc:'마을로 즉시 귀환' },
    // ── NPC 장비 상점 (골드) ──
    'shop_sword_1':  { name:'철제 검',          price:200,  currency:'gold', effect:'equip_item', value:'equip_sword_1', desc:'ATK +10 (일반)' },
    'shop_sword_2':  { name:'강철 검',          price:800,  currency:'gold', effect:'equip_item', value:'equip_sword_2', desc:'ATK +25 (고급)' },
    'shop_armor_1':  { name:'가죽 갑옷',        price:150,  currency:'gold', effect:'equip_item', value:'equip_armor_1', desc:'DEF +10 (일반)' },
    'shop_armor_2':  { name:'철판 갑옷',        price:700,  currency:'gold', effect:'equip_item', value:'equip_armor_2', desc:'DEF +25 (고급)' },
    'shop_helm_1':   { name:'가죽 투구',        price:100,  currency:'gold', effect:'equip_item', value:'equip_helm_1', desc:'DEF +5 (일반)' },
    'shop_glove_1':  { name:'가죽 장갑',        price:80,   currency:'gold', effect:'equip_item', value:'equip_glove_1', desc:'ATK+3 DEF+2 (일반)' },
    'shop_boots_1':  { name:'가죽 장화',        price:80,   currency:'gold', effect:'equip_item', value:'equip_boots_1', desc:'DEF+3 SPD+2 (일반)' },
    'shop_ring_1':   { name:'힘의 반지',        price:500,  currency:'gold', effect:'equip_item', value:'equip_ring_1', desc:'ATK+8 DEF+3 (고급)' },
    'shop_neck_1':   { name:'지혜의 목걸이',     price:400,  currency:'gold', effect:'equip_item', value:'equip_neck_1', desc:'ATK+5 DEF+5 EXP+5%' },
    // ── 희귀 장비 (다이아) ──
    'shop_sword_3':  { name:'미스릴 검',        price:300,  currency:'diamond', effect:'equip_item', value:'equip_sword_3', desc:'ATK +45 (희귀)' },
    'shop_armor_3':  { name:'미스릴 갑옷',      price:250,  currency:'diamond', effect:'equip_item', value:'equip_armor_3', desc:'DEF +45 (희귀)' },
};

// 다이아몬드 무료 획득 방법
const FREE_DIAMOND_SOURCES = {
    daily_login: 10,        // 매일 접속: 10 다이아
    first_boss_kill: 50,    // 첫 보스 처치: 50 다이아
    level_10: 30,           // Lv.10 달성: 30 다이아
    level_20: 50,           // Lv.20 달성: 50 다이아
    level_30: 100,          // Lv.30 달성: 100 다이아
    pvp_10_wins: 30,        // PvP 10승: 30 다이아
    pvp_100_wins: 100,      // PvP 100승: 100 다이아
    weekly_quest: 50,       // 주간 퀘스트 완료: 50 다이아
};

// ==========================================
// 거래소 시스템
// ==========================================
let marketListings = []; // { id, sellerId, sellerName, itemId, itemName, price, currency, listedAt }
let marketIdCounter = 0;
const MARKET_FEE = 0.05; // 5% 수수료

// 거래 가능 아이템 정의
const TRADEABLE_ITEMS = {
    'mat_iron':       { name:'철광석',       category:'재료', basePrice: 5 },
    'mat_magic':      { name:'마법 결정',    category:'재료', basePrice: 15 },
    'mat_soul':       { name:'영혼석',       category:'재료', basePrice: 50 },
    'mat_dragon':     { name:'드래곤 비늘',  category:'재료', basePrice: 500 },
    'pot_hp_s':       { name:'하급 HP 물약', category:'물약', basePrice: 10 },
    'pot_hp_m':       { name:'중급 HP 물약', category:'물약', basePrice: 30 },
    'pot_hp_l':       { name:'상급 HP 물약', category:'물약', basePrice: 80 },
    'pot_atk':        { name:'공격 부스터',  category:'물약', basePrice: 100 },
    'pot_def':        { name:'방어 부스터',  category:'물약', basePrice: 100 },
    'scroll_return':  { name:'귀환 주문서',  category:'주문서', basePrice: 50 },
    'scroll_revive':  { name:'부활 주문서',  category:'주문서', basePrice: 300 },
    'scroll_protect': { name:'강화 보호',    category:'주문서', basePrice: 500 },
    'protect_scroll': { name:'보호 주문서',    category:'주문서', basePrice: 500 },
    'bless_scroll':   { name:'축복 주문서',   category:'주문서', basePrice: 200 },
    // 장비 - 무기
    'equip_sword_1':  { name:'철제 검',      category:'장비', basePrice: 200 },
    'equip_sword_2':  { name:'강철 검',      category:'장비', basePrice: 800 },
    'equip_sword_3':  { name:'미스릴 검',    category:'장비', basePrice: 3000 },
    'equip_sword_4':  { name:'영웅의 검',    category:'장비', basePrice: 10000 },
    'equip_sword_5':  { name:'드래곤 소드',  category:'장비', basePrice: 50000 },
    // 장비 - 방어구
    'equip_armor_1':  { name:'가죽 갑옷',    category:'장비', basePrice: 150 },
    'equip_armor_2':  { name:'철판 갑옷',    category:'장비', basePrice: 700 },
    'equip_armor_3':  { name:'미스릴 갑옷',  category:'장비', basePrice: 2500 },
    'equip_armor_4':  { name:'영웅의 갑옷',  category:'장비', basePrice: 9000 },
    'equip_armor_5':  { name:'드래곤 아머',  category:'장비', basePrice: 45000 },
    // 장비 - 투구/장갑/신발
    'equip_helm_1':   { name:'가죽 투구',    category:'장비', basePrice: 100 },
    'equip_helm_2':   { name:'철제 투구',    category:'장비', basePrice: 400 },
    'equip_helm_3':   { name:'미스릴 투구',  category:'장비', basePrice: 2000 },
    'equip_glove_1':  { name:'가죽 장갑',    category:'장비', basePrice: 80 },
    'equip_glove_2':  { name:'철제 장갑',    category:'장비', basePrice: 350 },
    'equip_glove_3':  { name:'미스릴 장갑',  category:'장비', basePrice: 1500 },
    'equip_boots_1':  { name:'가죽 장화',    category:'장비', basePrice: 80 },
    'equip_boots_2':  { name:'철제 장화',    category:'장비', basePrice: 350 },
    'equip_boots_3':  { name:'민첩의 장화',  category:'장비', basePrice: 1800 },
    // 장비 - 장신구
    'equip_ring_1':   { name:'힘의 반지',    category:'장비', basePrice: 500 },
    'equip_ring_2':   { name:'용사의 반지',  category:'장비', basePrice: 2000 },
    'equip_ring_3':   { name:'드래곤 반지',  category:'장비', basePrice: 8000 },
    'equip_neck_1':   { name:'지혜의 목걸이', category:'장비', basePrice: 400 },
    'equip_neck_2':   { name:'행운의 목걸이', category:'장비', basePrice: 1500 },
    'equip_neck_3':   { name:'드래곤 목걸이', category:'장비', basePrice: 6000 },
};

// ==========================================
// 게임 상수 & 클래스 정의 (리니지 라이크)
// ==========================================

const players = {};

// ==========================================
// 퀘스트 시스템
// ==========================================
const QUESTS = {
    // ── 일일 퀘스트 (매일 초기화) ──
    daily_hunt:    { name:'일일 사냥', desc:'몬스터 50마리 처치', target:'kill_monster', goal:50, reward:{gold:200,exp:500}, type:'daily', minLevel:5 },
    daily_elite:   { name:'필드 보스', desc:'엘리트 이상 몬스터 3마리', target:'kill_elite', goal:3, reward:{gold:500,exp:800}, type:'daily', minLevel:15 },
    daily_gold:    { name:'골드 수집', desc:'골드 500 획득', target:'earn_gold', goal:500, reward:{gold:200,exp:300}, type:'daily', minLevel:5 },
    daily_pvp:     { name:'PvP 도전', desc:'PvP 3회 참여', target:'pvp_fight', goal:3, reward:{gold:300,exp:400}, type:'daily', minLevel:10 },
    // ── 주간 퀘스트 (매주 초기화) ──
    weekly_boss:   { name:'보스 레이드', desc:'보스 5회 처치', target:'kill_boss', goal:5, reward:{gold:5000,exp:8000,diamonds:30}, type:'weekly', minLevel:20 },
    weekly_guild:  { name:'길드 미션', desc:'길드 던전 2회 클리어', target:'dungeon_clear', goal:2, reward:{gold:3000,exp:5000}, type:'weekly', minLevel:15 },
    weekly_pvp:    { name:'PvP 전적', desc:'PvP 20승', target:'pvp_win', goal:20, reward:{gold:2000,exp:3000,diamonds:20}, type:'weekly', minLevel:15 },
    weekly_trade:  { name:'교역 달인', desc:'교역 10회', target:'trade_count', goal:10, reward:{gold:3000,exp:2000}, type:'weekly', minLevel:10 },
    // ── 메인 퀘스트 (1회) ──
    main_hunt1:    { name:'첫 번째 사냥', desc:'슬라임 5마리 처치', target:'kill_monster', goal:5, reward:{gold:100,exp:200}, type:'main', minLevel:1 },
    main_lv5:      { name:'성장의 시작', desc:'레벨 5 달성', target:'reach_level', goal:5, reward:{gold:500,diamonds:30}, type:'main' },
    main_lv10:     { name:'전사의 길', desc:'레벨 10 달성', target:'reach_level', goal:10, reward:{gold:1000,diamonds:50}, type:'main' },
    main_orc:      { name:'오크의 위협', desc:'오크전사(엘리트) 10마리 처치', target:'kill_elite', goal:10, reward:{gold:500,diamonds:20}, type:'main', minLevel:10 },
    main_lv20:     { name:'영웅의 각성', desc:'레벨 20 달성', target:'reach_level', goal:20, reward:{gold:3000,diamonds:100}, type:'main' },
    main_dungeon:  { name:'어둠의 동굴', desc:'던전 클리어', target:'dungeon_clear', goal:1, reward:{gold:2000,diamonds:50}, type:'main', minLevel:15 },
    main_lv30:     { name:'전설의 시작', desc:'레벨 30 달성', target:'reach_level', goal:30, reward:{gold:5000,diamonds:150}, type:'main' },
    main_boss:     { name:'드래곤 토벌', desc:'보스 몬스터 처치', target:'kill_boss', goal:1, reward:{gold:5000,diamonds:80}, type:'main' },
    main_pvp:      { name:'PvP 입문', desc:'PvP 모드로 전환', target:'toggle_pvp', goal:1, reward:{gold:1000,diamonds:30}, type:'main' },
    main_army:     { name:'군단장', desc:'용병 10명 보유', target:'army_count', goal:10, reward:{gold:2000,diamonds:50}, type:'main' },
    // ── 업적 (1회, 특별 보상) ──
    ach_first_pk:    { name:'피의 세례', desc:'다른 유저 첫 처치', target:'pvp_win', goal:1, reward:{gold:500}, type:'achievement' },
    ach_dragon100:   { name:'드래곤 슬레이어', desc:'드래곤 100회 처치', target:'kill_boss', goal:100, reward:{gold:10000,diamonds:200}, type:'achievement' },
    ach_millionaire: { name:'백만장자', desc:'골드 1,000,000 보유', target:'total_gold', goal:1000000, reward:{diamonds:500}, type:'achievement' },
};

// ==========================================
// 스킬 시스템
// ==========================================
const SKILLS = {
    Assassin: [
        { name:'그림자 일격', type:'active', dmgMulti:3.0, cooldown:5, range:3, aoe:false, level:1, mpCost:20, critBonus:true },
        { name:'독 바르기', type:'passive', level:5, poisonDot:15, poisonDuration:3 },
        { name:'은신', type:'active', cooldown:15, duration:5, level:10, mpCost:30, buff:true, stealth:true, nextAtkMulti:2.0 },
        { name:'연속 베기', type:'active', dmgMulti:1.5, hits:4, cooldown:8, range:2, aoe:false, level:15, mpCost:25 },
        { name:'암살', type:'ultimate', dmgMulti:8.0, cooldown:60, range:2, aoe:false, level:25, mpCost:80, executeThreshold:0.3 },
    ],
    Warrior: [
        { name:'파워 스트라이크', type:'active', dmgMulti:2.5, cooldown:4, range:4, aoe:false, level:1, mpCost:15, knockback:true },
        { name:'전투 함성', type:'active', cooldown:20, duration:10, range:6, level:5, mpCost:25, buff:true, allyAtkMulti:1.2 },
        { name:'분노', type:'passive', level:10, hpThreshold:0.5, atkBonus:0.3 },
        { name:'회전 베기', type:'active', dmgMulti:2.0, cooldown:6, range:3, aoe:true, level:15, mpCost:20 },
        { name:'버서커', type:'ultimate', dmgMulti:2.0, spdMulti:1.5, cooldown:90, duration:15, level:25, mpCost:100, buff:true, defPenalty:0.5 },
    ],
    Knight: [
        { name:'방패 강타', type:'active', dmgMulti:2.0, cooldown:6, range:3, aoe:false, level:1, mpCost:15, stun:1 },
        { name:'수호 오라', type:'passive', level:5, allyDefMulti:1.15, auraRange:5 },
        { name:'도발', type:'active', cooldown:10, range:8, aoe:true, level:10, mpCost:20, taunt:true },
        { name:'철벽 방어', type:'active', cooldown:15, duration:5, level:15, mpCost:30, buff:true, dmgReduce:0.7 },
        { name:'신성한 방벽', type:'ultimate', cooldown:120, duration:3, range:6, level:25, mpCost:120, buff:true, allyInvincible:true },
    ],
    Mage: [
        { name:'파이어볼', type:'active', dmgMulti:3.0, cooldown:3, range:6, aoe:true, level:1, mpCost:15 },
        { name:'아이스 볼트', type:'active', dmgMulti:2.0, cooldown:5, range:5, aoe:false, level:5, mpCost:20, slow:0.5, slowDuration:3 },
        { name:'마나 재생', type:'passive', level:10, mpRegenMulti:1.5 },
        { name:'체인 라이트닝', type:'active', dmgMulti:2.5, cooldown:8, range:6, level:15, mpCost:35, chainCount:3, chainRange:4 },
        { name:'메테오', type:'ultimate', dmgMulti:10.0, cooldown:90, range:8, aoe:true, level:25, mpCost:150, aoeRadius:4 },
    ],
};

// ==========================================
// 장비 시스템 (5등급: normal/uncommon/rare/epic/legendary)
// ==========================================
const EQUIPMENT_SLOTS = ['weapon','armor','helmet','gloves','boots','ring','necklace','cape','belt'];

// 장비 세트 보너스
const EQUIPMENT_SETS = {
    dragon: {
        name: '드래곤 세트', pieces: ['equip_sword_5','equip_armor_5','equip_helm_5','equip_glove_5','equip_boots_5','equip_belt_5','equip_cape_5'],
        bonuses: { 2: {atk:20,def:20}, 3: {atk:40,def:40,hp:200}, 5: {atkMulti:1.2,defMulti:1.2,hp:500}, 7: {atkMulti:1.5,defMulti:1.5,hp:1000} }
    },
    hero: {
        name: '영웅 세트', pieces: ['equip_sword_4','equip_armor_4','equip_helm_4','equip_glove_4','equip_boots_4','equip_belt_4','equip_cape_4'],
        bonuses: { 2: {atk:10,def:10}, 3: {atk:25,def:25,hp:100}, 5: {atkMulti:1.15,defMulti:1.15,hp:300} }
    },
    mythic: {
        name: '태초 세트', pieces: ['equip_mythic_sword','equip_mythic_armor','equip_mythic_ring'],
        bonuses: { 2: {atk:50,def:50,hp:500}, 3: {atkMulti:1.5,defMulti:1.5,hp:2000,expBonus:0.3} }
    },
};

const GRADE_INFO = {
    normal:    { name:'일반', color:'#cccccc', atkMulti:1.0, defMulti:1.0, maxEnchant:5,  randomOpts:0, levelReq:1 },
    uncommon:  { name:'고급', color:'#44cc44', atkMulti:1.2, defMulti:1.2, maxEnchant:8,  randomOpts:1, levelReq:5 },
    rare:      { name:'희귀', color:'#4488ff', atkMulti:1.4, defMulti:1.4, maxEnchant:10, randomOpts:2, levelReq:15 },
    epic:      { name:'영웅', color:'#aa44ff', atkMulti:1.7, defMulti:1.7, maxEnchant:12, randomOpts:3, levelReq:25 },
    legendary: { name:'전설', color:'#ff8800', atkMulti:2.2, defMulti:2.2, maxEnchant:15, randomOpts:4, levelReq:35 },
};

const RANDOM_OPTIONS = [
    { name:'크리티컬 +', stat:'critRate', min:0.02, max:0.08 },
    { name:'회피 +',     stat:'dodgeRate', min:0.01, max:0.05 },
    { name:'HP +',       stat:'bonusHp', min:20, max:100 },
    { name:'공격속도 +', stat:'atkSpeed', min:0.05, max:0.15 },
    { name:'이동속도 +', stat:'bonusSpd', min:1, max:5 },
    { name:'경험치 +',   stat:'expBonus', min:0.05, max:0.15 },
    { name:'골드 +',     stat:'goldBonus', min:0.05, max:0.10 },
];

function generateRandomOptions(count) {
    const opts = [];
    const shuffled = [...RANDOM_OPTIONS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const opt = shuffled[i];
        const val = +(opt.min + Math.random() * (opt.max - opt.min)).toFixed(3);
        opts.push({ name: opt.name, stat: opt.stat, value: val });
    }
    return opts;
}

const EQUIP_STATS = {
    // 무기 (weapon)
    'equip_sword_1':  { slot:'weapon', name:'철제 검',     atk:10, def:0, grade:'normal' },
    'equip_sword_2':  { slot:'weapon', name:'강철 검',     atk:25, def:0, grade:'uncommon' },
    'equip_sword_3':  { slot:'weapon', name:'미스릴 검',   atk:45, def:0, grade:'rare' },
    'equip_sword_4':  { slot:'weapon', name:'영웅의 검',   atk:70, def:0, grade:'epic' },
    'equip_sword_5':  { slot:'weapon', name:'드래곤 소드', atk:120, def:0, grade:'legendary', bound:true },
    // 방어구 (armor)
    'equip_armor_1':  { slot:'armor', name:'가죽 갑옷',   atk:0, def:10, grade:'normal' },
    'equip_armor_2':  { slot:'armor', name:'철판 갑옷',   atk:0, def:25, grade:'uncommon' },
    'equip_armor_3':  { slot:'armor', name:'미스릴 갑옷', atk:0, def:45, grade:'rare' },
    'equip_armor_4':  { slot:'armor', name:'영웅의 갑옷', atk:0, def:70, grade:'epic' },
    'equip_armor_5':  { slot:'armor', name:'드래곤 아머', atk:0, def:120, grade:'legendary', bound:true },
    // 투구 (helmet)
    'equip_helm_1':   { slot:'helmet', name:'가죽 투구',   atk:0, def:5,  grade:'normal' },
    'equip_helm_2':   { slot:'helmet', name:'철제 투구',   atk:0, def:12, grade:'uncommon' },
    'equip_helm_3':   { slot:'helmet', name:'미스릴 투구', atk:0, def:20, grade:'rare' },
    // 장갑 (gloves)
    'equip_glove_1':  { slot:'gloves', name:'가죽 장갑',   atk:3,  def:2,  grade:'normal' },
    'equip_glove_2':  { slot:'gloves', name:'철제 장갑',   atk:8,  def:5,  grade:'uncommon' },
    'equip_glove_3':  { slot:'gloves', name:'미스릴 장갑', atk:15, def:10, grade:'rare' },
    // 신발 (boots)
    'equip_boots_1':  { slot:'boots', name:'가죽 장화',   atk:0, def:3,  grade:'normal',   bonusSpd:2 },
    'equip_boots_2':  { slot:'boots', name:'철제 장화',   atk:0, def:7,  grade:'uncommon', bonusSpd:3 },
    'equip_boots_3':  { slot:'boots', name:'민첩의 장화', atk:0, def:12, grade:'rare',     bonusSpd:5 },
    // 반지 (ring)
    'equip_ring_1':   { slot:'ring', name:'힘의 반지',     atk:8,  def:3,  grade:'uncommon' },
    'equip_ring_2':   { slot:'ring', name:'용사의 반지',   atk:15, def:5,  grade:'rare' },
    'equip_ring_3':   { slot:'ring', name:'드래곤 반지',   atk:20, def:10, grade:'epic' },
    // 목걸이 (necklace)
    'equip_neck_1':   { slot:'necklace', name:'지혜의 목걸이',  atk:5,  def:5,  grade:'uncommon', expBonus:0.05 },
    'equip_neck_2':   { slot:'necklace', name:'행운의 목걸이',  atk:8,  def:8,  grade:'rare',     goldBonus:0.10 },
    'equip_neck_3':   { slot:'necklace', name:'드래곤의 목걸이', atk:15, def:15, grade:'epic',     expBonus:0.10 },
    // 망토 (cape)
    'equip_cape_1':   { slot:'cape', name:'여행자의 망토',   atk:3,  def:5,  grade:'normal' },
    'equip_cape_2':   { slot:'cape', name:'기사의 망토',     atk:5,  def:10, grade:'uncommon' },
    'equip_cape_3':   { slot:'cape', name:'마법사의 로브',   atk:10, def:15, grade:'rare',     expBonus:0.05 },
    'equip_cape_4':   { slot:'cape', name:'영웅의 망토',     atk:18, def:25, grade:'epic',     bonusSpd:3 },
    'equip_cape_5':   { slot:'cape', name:'천공의 날개',     atk:30, def:40, grade:'legendary', bonusSpd:5, bound:true },
    // 벨트 (belt)
    'equip_belt_1':   { slot:'belt', name:'가죽 벨트',       atk:2,  def:3,  grade:'normal' },
    'equip_belt_2':   { slot:'belt', name:'철제 벨트',       atk:5,  def:8,  grade:'uncommon' },
    'equip_belt_3':   { slot:'belt', name:'미스릴 벨트',     atk:10, def:12, grade:'rare' },
    'equip_belt_4':   { slot:'belt', name:'영웅의 벨트',     atk:15, def:20, grade:'epic' },
    'equip_belt_5':   { slot:'belt', name:'드래곤 벨트',     atk:25, def:30, grade:'legendary', bound:true },
    // 영웅/전설급 투구/장갑/신발 추가
    'equip_helm_4':   { slot:'helmet', name:'영웅의 투구',   atk:5,  def:35, grade:'epic' },
    'equip_helm_5':   { slot:'helmet', name:'드래곤 투구',   atk:10, def:50, grade:'legendary', bound:true },
    'equip_glove_4':  { slot:'gloves', name:'영웅의 장갑',   atk:20, def:15, grade:'epic' },
    'equip_glove_5':  { slot:'gloves', name:'드래곤 장갑',   atk:30, def:25, grade:'legendary', bound:true },
    'equip_boots_4':  { slot:'boots', name:'영웅의 장화',    atk:5,  def:18, grade:'epic',      bonusSpd:4 },
    'equip_boots_5':  { slot:'boots', name:'드래곤 장화',    atk:8,  def:28, grade:'legendary', bonusSpd:6, bound:true },
    // 신화급 세트 장비 (mythic)
    'equip_mythic_sword': { slot:'weapon', name:'태초의 검', atk:200, def:0,  grade:'legendary', bound:true },
    'equip_mythic_armor': { slot:'armor',  name:'태초의 갑옷', atk:0, def:200, grade:'legendary', bound:true },
    'equip_mythic_ring':  { slot:'ring',   name:'태초의 반지', atk:30, def:30, grade:'legendary', bound:true, expBonus:0.15, goldBonus:0.15 },
};

// ==========================================
// 낮/밤 순환 (10분 주기)
// ==========================================
const DAY_NIGHT_CYCLE = 600; // 10분 = 600초
let worldTime = 0; // 0~599
let isNight = false;

// 날씨 시스템
const WEATHERS = [
    { id:'clear', name:'맑음', effect:null, duration:300 },
    { id:'rain',  name:'비',   effect:{ element:'water', dodgeUp:0.03 }, duration:180 },
    { id:'fog',   name:'안개', effect:{ dodgeUp:0.05, visionDown:true }, duration:120 },
    { id:'snow',  name:'눈',   effect:{ element:'water', spdDown:0.2 }, duration:150 },
    { id:'storm', name:'폭풍', effect:{ element:'wind', atkUp:0.1, defDown:0.1 }, duration:90 },
];
let currentWeather = WEATHERS[0];
let nextWeatherChange = Date.now() + 300000;

// 월드 이벤트 로그
let worldEventLog = []; // { time, msg, type }
function logWorldEvent(msg, type) {
    worldEventLog.push({ time: Date.now(), msg, type });
    if (worldEventLog.length > 30) worldEventLog.shift();
}

// ==========================================
// 전직 시스템 (Lv.20)
// ==========================================
const CLASS_ADVANCE = {
    Assassin: [
        { name: 'ShadowLord', displayName: '쉐도우로드', desc: '극한의 암살 — 크리 특화', bonusAtk: 20, bonusCrit: 0.12, bonusSpeed: 5 },
        { name: 'Nightblade',  displayName: '나이트블레이드', desc: '독+회피 — 지속 전투', bonusAtk: 10, bonusCrit: 0.05, bonusDodge: 0.1, bonusSpeed: 3 },
    ],
    Warrior: [
        { name: 'Warlord',    displayName: '워로드', desc: '공방 균형 — 만능 전사', bonusAtk: 15, bonusDef: 15, bonusHp: 100 },
        { name: 'Berserker',   displayName: '버서커', desc: '극한 공격 — 방어 포기', bonusAtk: 35, bonusDef: -5, bonusHp: 50, bonusCrit: 0.08 },
    ],
    Knight: [
        { name: 'HolyKnight', displayName: '홀리나이트', desc: '철벽 수비 — 팀 수호', bonusDef: 25, bonusHp: 200, bonusDodge: 0.05 },
        { name: 'DarkKnight',  displayName: '다크나이트', desc: '공격형 탱커 — HP 흡수', bonusAtk: 15, bonusDef: 15, bonusHp: 100 },
    ],
    Mage: [
        { name: 'Archmage',   displayName: '아크메이지', desc: '순수 마법 — 극한 데미지', bonusAtk: 30, bonusCrit: 0.15 },
        { name: 'Elementalist', displayName: '엘리멘탈리스트', desc: '속성 마스터 — 광역+상태이상', bonusAtk: 15, bonusDef: 10, bonusHp: 50, bonusCrit: 0.05 },
    ],
};

// ==========================================
// 속성 시스템
// ==========================================
const ELEMENTS = ['fire', 'water', 'wind', 'earth'];
const ELEMENT_BONUS = { fire: 'water', water: 'wind', wind: 'earth', earth: 'fire' }; // 상성

// ==========================================
// 혈맹(클랜) 시스템 (기획서 확장)
// ==========================================
const CLAN_LEVEL_EXP = [0, 1000, 3000, 7000, 15000, 30000]; // 레벨업 필요 경험치
const CLAN_MAX_MEMBERS = { 1:10, 2:20, 3:30, 4:40, 5:50 };
const CLAN_SKILLS = {
    1: { name:'혈맹의 힘', effect:'ATK +5%', stat:'atk', multi:0.05 },
    2: { name:'혈맹의 방패', effect:'DEF +5%', stat:'def', multi:0.05 },
    3: { name:'혈맹의 지혜', effect:'EXP +10%', stat:'exp', multi:0.10 },
    4: { name:'혈맹의 축복', effect:'HP +10%', stat:'hp', multi:0.10 },
    5: { name:'혈맹의 영광', effect:'골드 +10%', stat:'gold', multi:0.10 },
};
let clans = {}; // { clanName: { leader, officers:[], members:[], level, exp, storage:{}, war:null } }

// ==========================================
// 파티 시스템
// ==========================================
let parties = {}; // { partyId: { leader, members:[], name } }
let partyIdCounter = 0;

// 아레나 시스템
let arenaQueue = []; // 대기 중인 플레이어 ID 목록
let arenaMatches = {}; // { matchId: { player1, player2, startTime, zone } }
let arenaRankings = {}; // { playerId: { wins, losses, points, rank } }
let arenaMatchIdCounter = 0;

// 랭킹
let rankings = { level:[], pvp:[], gold:[] };

function getEnchantBonus(enchantLevel) {
    // 밸런스 조정: +1~3: +3%, +4~7: +5%, +8~10: +7%, +11~15: +10%
    let bonus = 0;
    for (let i = 1; i <= enchantLevel; i++) {
        if (i <= 3)       bonus += 0.03;
        else if (i <= 7)  bonus += 0.05;
        else if (i <= 10) bonus += 0.07;
        else              bonus += 0.10;
    }
    return bonus;
}

function recalcStats(p) {
    if (!p || p.isBot) return;
    const cls = CLASSES[p.className];
    if (!cls) return;
    let bonusAtk = 0, bonusDef = 0, bonusHp = 0, bonusSpd = 0;
    let bonusCrit = 0, bonusDodge = 0, bonusExp = 0, bonusGold = 0;

    if (p.equipped) {
        for (const slot of EQUIPMENT_SLOTS) {
            const eqId = p.equipped[slot];
            if (!eqId || !EQUIP_STATS[eqId]) continue;
            const eq = EQUIP_STATS[eqId];
            const grade = GRADE_INFO[eq.grade] || GRADE_INFO.normal;
            const enchant = (p.enchantLevels && p.enchantLevels[eqId]) || 0;
            const enchantMult = 1 + getEnchantBonus(enchant);

            bonusAtk += Math.floor(eq.atk * grade.atkMulti * enchantMult);
            bonusDef += Math.floor(eq.def * grade.defMulti * enchantMult);
            if (eq.bonusSpd) bonusSpd += eq.bonusSpd;
            if (eq.expBonus) bonusExp += eq.expBonus;
            if (eq.goldBonus) bonusGold += eq.goldBonus;

            // 랜덤 옵션 적용
            const opts = p.equipOptions && p.equipOptions[eqId];
            if (opts) {
                for (const opt of opts) {
                    if (opt.stat === 'bonusHp') bonusHp += opt.value;
                    if (opt.stat === 'critRate') bonusCrit += opt.value;
                    if (opt.stat === 'dodgeRate') bonusDodge += opt.value;
                    if (opt.stat === 'bonusSpd') bonusSpd += opt.value;
                    if (opt.stat === 'expBonus') bonusExp += opt.value;
                    if (opt.stat === 'goldBonus') bonusGold += opt.value;
                }
            }
        }
    }

    // 스탯 포인트 보너스 (bonusStr/Dex/Int/Con 사용)
    const str = p.bonusStr || 0, dex = p.bonusDex || 0, int_ = p.bonusInt || 0, con = p.bonusCon || 0;

    // 세트 보너스 계산
    let setAtkBonus = 0, setDefBonus = 0, setHpBonus = 0, setAtkMulti = 1, setDefMulti = 1, setExpBonus = 0;
    if (p.equipped) {
        const equippedIds = Object.values(p.equipped).filter(Boolean);
        for (const [setId, setInfo] of Object.entries(EQUIPMENT_SETS)) {
            const count = setInfo.pieces.filter(pid => equippedIds.includes(pid)).length;
            for (const [req, bonus] of Object.entries(setInfo.bonuses)) {
                if (count >= parseInt(req)) {
                    if (bonus.atk) setAtkBonus += bonus.atk;
                    if (bonus.def) setDefBonus += bonus.def;
                    if (bonus.hp) setHpBonus += bonus.hp;
                    if (bonus.atkMulti) setAtkMulti = Math.max(setAtkMulti, bonus.atkMulti);
                    if (bonus.defMulti) setDefMulti = Math.max(setDefMulti, bonus.defMulti);
                    if (bonus.expBonus) setExpBonus += bonus.expBonus;
                }
            }
        }
    }

    // 펫 보너스
    let petAtkMulti = 1.0;
    const pet = getPetEffect(p);
    if (pet && pet.effect === 'atkBonus') petAtkMulti += pet.value;

    // ── 룬 개별 스탯 + 룬 워드 보너스 ──
    let runeAtk = 0, runeDef = 0, runeHp = 0, runeSpd = 0, runeCrit = 0, runeDodge = 0, runeExp = 0, runeGold = 0;
    let runeDropRate = 0;
    if (p.itemRunes && p.equipped) {
        for (const eqId of Object.values(p.equipped)) {
            const runes = p.itemRunes[eqId];
            if (!runes) continue;
            // 개별 룬 스탯
            for (const rId of runes) {
                const r = RUNES[rId];
                if (!r) continue;
                if (r.stat === 'atk') runeAtk += r.value;
                if (r.stat === 'def') runeDef += r.value;
                if (r.stat === 'hp') runeHp += r.value;
                if (r.stat === 'spd') runeSpd += r.value;
                if (r.stat === 'crit') runeCrit += r.value;
                if (r.stat === 'dodge') runeDodge += r.value;
                if (r.stat === 'exp') runeExp += r.value;
                if (r.stat === 'gold') runeGold += r.value;
                if (r.stat === 'mp') { /* MP는 별도 처리 */ }
                if (r.stat === 'all') { runeAtk += r.value; runeDef += r.value; }
            }
            // 룬 워드 보너스
            const runeKey = [...runes].sort().join('');
            const rw = RUNE_WORDS[runeKey];
            if (rw && rw.bonus) {
                if (rw.bonus.atk) runeAtk += rw.bonus.atk;
                if (rw.bonus.def) runeDef += rw.bonus.def;
                if (rw.bonus.spd) runeSpd += rw.bonus.spd;
                if (rw.bonus.exp) runeExp += rw.bonus.exp;
                if (rw.bonus.hpRegen) { /* 별도 처리 */ }
                if (rw.bonus.dropRate) runeDropRate += rw.bonus.dropRate;
            }
        }
    }

    // ── 프레스티지 (환생) 영구 보너스 ──
    let legacyAtk = 0, legacyDef = 0, legacyHp = 0, legacySpd = 0, legacyCrit = 0;
    let legacyExpBonus = 0, legacyGoldBonus = 0, legacyDropRate = 0, legacyAllMulti = 1;
    if (p.legacyPerks && p.legacyPerks.length > 0) {
        for (const perk of p.legacyPerks) {
            if (perk.stat === 'atk') legacyAtk += perk.value;
            if (perk.stat === 'def') legacyDef += perk.value;
            if (perk.stat === 'hp') legacyHp += perk.value;
            if (perk.stat === 'spd') legacySpd += perk.value;
            if (perk.stat === 'crit') legacyCrit += perk.value;
            if (perk.stat === 'goldBonus') legacyGoldBonus += perk.value;
            if (perk.stat === 'expBonus') legacyExpBonus += perk.value;
            if (perk.stat === 'dropRate') legacyDropRate += perk.value;
            if (perk.stat === 'allMulti') legacyAllMulti += perk.value;
        }
    }

    // ── 전직 보너스 ──
    const ab = p.advanceBonus || {};
    const advAtk = ab.atk || 0, advDef = ab.def || 0, advHp = ab.hp || 0;
    const advCrit = ab.crit || 0, advDodge = ab.dodge || 0;

    // ── 진영 보너스 ──
    let factionAtkMulti = 1, factionDefMulti = 1;
    if (p.faction && FACTIONS[p.faction]) {
        const fb = FACTIONS[p.faction];
        if (fb.bonus === 'atk') factionAtkMulti += fb.bonusValue;
        if (fb.bonus === 'def') factionDefMulti += fb.bonusValue;
    }

    // ── 칭호 보너스 ──
    let titleAtk = 0, titleExp = 0;
    const tb = getTitleBonus(p, 'atk'); if (tb) titleAtk = tb;
    const te = getTitleBonus(p, 'expBonus'); if (te) titleExp = te;

    // ── 최종 스탯 계산 ──
    p.atk = Math.floor((cls.atk + bonusAtk + setAtkBonus + runeAtk + legacyAtk + advAtk + str * 2) * petAtkMulti * setAtkMulti * factionAtkMulti * legacyAllMulti * (1 + titleAtk));
    p.def = Math.floor((cls.def + bonusDef + setDefBonus + runeDef + legacyDef + advDef) * setDefMulti * factionDefMulti * legacyAllMulti);
    p.equipBonusHp = bonusHp + con * 10 + setHpBonus + runeHp + legacyHp + advHp;
    p.maxHp = cls.hp + (p.level - 1) * 20 + p.equipBonusHp;
    p.dmgMulti = 1.0 + (p.level - 1) * 0.08 + int_ * 0.02;
    p.critRate = (cls.critRate || 0.1) + bonusCrit + runeCrit + legacyCrit + advCrit + dex * 0.005;
    p.dodgeRate = (cls.dodgeRate || 0) + bonusDodge + runeDodge + advDodge + dex * 0.003;
    p.equipBonusSpd = bonusSpd + runeSpd + legacySpd;
    p.equipExpBonus = bonusExp + setExpBonus + runeExp + legacyExpBonus + titleExp;
    p.equipGoldBonus = bonusGold + runeGold + legacyGoldBonus;
    p.dropRateBonus = runeDropRate + legacyDropRate;
}

function trackQuest(p, target, amount) {
    if (!p || p.isBot) return;
    if (!p.questProgress) p.questProgress = {};
    for (const [qId, q] of Object.entries(QUESTS)) {
        if (q.target === target && !(p.questCompleted && p.questCompleted[qId])) {
            if (target === 'reach_level') {
                p.questProgress[qId] = p.level;
            } else if (target === 'army_count') {
                let count = 0;
                for (const bId in players) { if (players[bId].isBot && players[bId].ownerId === p.id && players[bId].isAlive) count++; }
                p.questProgress[qId] = count;
            } else {
                p.questProgress[qId] = (p.questProgress[qId] || 0) + (amount || 1);
            }
        }
    }
}

function updateRankings() {
    const oldLevelTop = rankings.level ? rankings.level.map(r => r.id) : [];
    const realPlayers = Object.values(players).filter(p => !p.isBot && p.isAlive);
    rankings.level = realPlayers.sort((a,b) => b.level - a.level).slice(0,10).map(p => ({
        name: p.displayName, level: p.level, className: p.className, id: p.id
    }));
    // 랭킹 추월 알림
    for (let i = 0; i < rankings.level.length; i++) {
        const pid = rankings.level[i].id;
        const oldIdx = oldLevelTop.indexOf(pid);
        if (oldIdx > i && i < 5) {
            io.to(pid).emit('rank_change', { type: 'level', newRank: i+1, oldRank: oldIdx+1 });
            if (i === 0) io.emit('server_msg', { msg: `${rankings.level[i].name}이(가) 레벨 랭킹 1위 달성!`, type: 'rare' });
        } else if (oldIdx === -1 && i < 10) {
            io.to(pid).emit('rank_change', { type: 'level', newRank: i+1, oldRank: 0 });
        }
    }
    rankings.pvp = realPlayers.sort((a,b) => (b.pvpWins||0) - (a.pvpWins||0)).slice(0,10).map(p => ({
        name: p.displayName, kills: p.pvpWins||0, className: p.className, id: p.id
    }));
    rankings.gold = realPlayers.sort((a,b) => b.gold - a.gold).slice(0,10).map(p => ({
        name: p.displayName, gold: p.gold, className: p.className, id: p.id
    }));
    // 아레나 랭킹
    rankings.arena = Object.entries(arenaRankings)
        .sort((a,b) => b[1].points - a[1].points)
        .slice(0, 10)
        .map(([pid, r], idx) => ({
            rank: idx + 1, name: players[pid]?.displayName || '?',
            className: players[pid]?.className || '?',
            wins: r.wins, losses: r.losses, points: r.points, id: pid
        }));
}

// 주간 랭킹 보상 지급 (월요일 06:00 기준)
let lastWeeklyRewardWeek = '';
function checkWeeklyRankingRewards() {
    const now = new Date();
    const week = getWeekNumber();
    if (now.getDay() === 1 && now.getHours() === 6 && lastWeeklyRewardWeek !== week) {
        lastWeeklyRewardWeek = week;
        updateRankings();

        // 레벨 1위
        if (rankings.level.length > 0) {
            const topId = rankings.level[0].id;
            const top = players[topId];
            if (top) {
                top.gold += 10000;
                top.diamonds = (top.diamonds || 0) + 100;
                // 주간 칭호 부여 (기존 주간 칭호 제거)
                if (top.titles) top.titles = top.titles.filter(t => !TITLES[t]?.weekly);
                if (!top.titles) top.titles = [];
                top.titles.push('title_rank_level');
                io.to(topId).emit('server_msg', { msg: '주간 레벨 1위 보상! +10000G, +100D, 칭호: 서버 최강자', type: 'rare' });
            }
        }

        // PvP 1위
        if (rankings.pvp.length > 0) {
            const topId = rankings.pvp[0].id;
            const top = players[topId];
            if (top) {
                top.gold += 5000;
                top.diamonds = (top.diamonds || 0) + 80;
                if (top.titles) top.titles = top.titles.filter(t => !TITLES[t]?.weekly);
                if (!top.titles) top.titles = [];
                top.titles.push('title_rank_pvp');
                io.to(topId).emit('server_msg', { msg: '주간 PvP 1위 보상! +5000G, +80D, 칭호: 최강 전사', type: 'rare' });
            }
        }

        // 상위 10위까지 보상
        for (let i = 1; i < Math.min(10, rankings.level.length); i++) {
            const p = players[rankings.level[i]?.id];
            if (p) {
                const reward = Math.floor(10000 / (i + 1));
                p.gold += reward;
                io.to(p.id).emit('server_msg', { msg: `주간 레벨 ${i+1}위 보상! +${reward}G`, type: 'normal' });
            }
        }

        io.emit('server_msg', { msg: '주간 랭킹 보상이 지급되었습니다!', type: 'boss' });
    }
}
let axes = {};
let aoes = {};
let monsters = {};
let drops = {}; // 드롭 아이템

let entityIdCounter = 0;
const MAX_PLAYERS = 50;
const MAX_MONSTERS = 600; // 2000x2000 맵에 몬스터 대량 배치
let hasKing = false;

// ── 클래스 정의 (판타지 RPG) ──
const CLASSES = {
    'Assassin': {
        displayName: '어쌔신',
        maxHp: 130, atk: 35, def: 8,  speed: 20,
        critRate: 0.20, dodgeRate: 0.15,
        aoe: false, projSpeed: 40, projLife: 80,
        desc: '빠른 속도와 높은 크리티컬로 적을 암살',
        autoSkill: 'shadowStrike'
    },
    'Warrior': {
        displayName: '워리어',
        maxHp: 200, atk: 28, def: 16, speed: 12,
        critRate: 0.10, dodgeRate: 0.05,
        aoe: false, projSpeed: 18, projLife: 1200,
        desc: '균형 잡힌 공방, 안정적인 전투력',
        autoSkill: 'powerStrike'
    },
    'Knight': {
        displayName: '나이트',
        maxHp: 350, atk: 18, def: 28, speed: 10,
        critRate: 0.05, dodgeRate: 0.02,
        aoe: false, projSpeed: 14, projLife: 800,
        desc: '철벽 방어, 아군을 지키는 탱커',
        autoSkill: 'shieldBash'
    },
    'Mage': {
        displayName: '메이지',
        maxHp: 110, atk: 18, def: 6,  speed: 9,
        critRate: 0.15, dodgeRate: 0.08,
        aoe: true, projSpeed: 0, projLife: 2500,
        desc: '강력한 광역 마법으로 전장을 지배',
        autoSkill: 'meteor' // 메테오: 넓은 범위 폭발
    },
    'GuardianTower': {
        displayName: '가디언 타워',
        maxHp: 600, atk: 35, def: 25, speed: 0,
        critRate: 0.05, dodgeRate: 0,
        aoe: false, projSpeed: 22, projLife: 800,
        desc: '고정 방어탑, 영역 수호',
        autoSkill: 'none'
    }
};

// ── 몬스터 등급 ──
const MONSTER_TIERS = {
    normal: {
        name: '슬라임', hp: 80, atk: 12, def: 3,
        expReward: 18, goldReward: 10, color: '#88cc88',
        spawnWeight: 50
    },
    elite: {
        name: '오크 전사', hp: 300, atk: 28, def: 12,
        expReward: 65, goldReward: 40, color: '#ccaa44',
        spawnWeight: 25
    },
    rare: {
        name: '다크 나이트', hp: 800, atk: 50, def: 22,
        expReward: 160, goldReward: 100, color: '#aa44cc',
        spawnWeight: 12
    },
    boss: {
        name: '드래���', hp: 2000, atk: 60, def: 30,
        expReward: 600, goldReward: 350, color: '#ff4444',
        spawnWeight: 5
    },
    legendary: {
        name: '고대 드��곤', hp: 8000, atk: 100, def: 50,
        expReward: 2000, goldReward: 1000, color: '#ff8800',
        spawnWeight: 1
    },
    mythic: {
        name: '태초의 존재', hp: 30000, atk: 200, def: 100,
        expReward: 8000, goldReward: 5000, color: '#ff00ff',
        spawnWeight: 0
    }
};

// 존별 몬스터 이름 변형
const ZONE_MONSTER_NAMES = {
    forest:     { normal:'숲 슬라임', elite:'독거미' },
    plains:     { normal:'야생토끼', elite:'늑대' },
    meadow:     { normal:'꽃 요정', elite:'꿀벌 여왕' },
    swamp:      { normal:'독 두꺼비', elite:'늪지 골렘', rare:'해골 기사' },
    desert:     { normal:'전갈', elite:'모래 웜', rare:'사막 미라' },
    cave:       { normal:'박쥐', elite:'동굴 트롤', rare:'수정 골렘', boss:'동굴 보스' },
    ruins:      { normal:'유령', elite:'가고일', rare:'리치', boss:'고대 수호자' },
    volcano:    { elite:'화염 정령', rare:'용암 골렘', boss:'불의 드래곤' },
    graveyard:  { elite:'좀비', rare:'뱀파이어', boss:'데스나이트' },
    darkforest: { elite:'그림자 늑대', rare:'다크 엘프', boss:'숲의 군주' },
    glacier:    { elite:'얼음 골렘', rare:'프로스트 위치', boss:'빙룡' },
    dragon:     { rare:'와이번', boss:'레드 드래곤', legendary:'고대 드래곤' },
    abyss:      { rare:'심연의 그림자', boss:'암흑 군주', legendary:'심연의 왕' },
    hell:       { rare:'악마', boss:'지옥의 문지기', legendary:'대마왕' },
    ancient:    { rare:'트렌트', boss:'고대 엔트', legendary:'세계수 수호자' },
    chaos:      { elite:'광전사', rare:'카오스 나이트', boss:'혼돈의 용' },
    warzone:    { elite:'용병 대장', rare:'전쟁 기계', boss:'전장의 왕' },
    // 확장 존
    mushroom:    { normal:'독버섯', elite:'버섯 골렘' },
    riverbank:   { normal:'물고기 요정', elite:'강 트롤', rare:'수룡' },
    tundra:      { normal:'눈토끼', elite:'설인' },
    training:    { normal:'허수아비', elite:'훈련용 골렘' },
    toxic_marsh: { normal:'독두꺼비', elite:'독안개 정령', rare:'늪지 히드라' },
    sandstorm:   { normal:'먼지 요정', elite:'사막 전갈', rare:'사막 거인', boss:'모래폭풍 워름' },
    crystal_mine:{ normal:'광석 박쥐', elite:'수정 골렘', rare:'보석 수호자', boss:'미스릴 드래곤' },
    sunken:      { elite:'물의 정령', rare:'해저 기사', boss:'크라켄' },
    haunted:     { elite:'폴터가이스트', rare:'밤의 백작', boss:'유령왕' },
    magma_core:  { elite:'마그마 슬라임', rare:'화염 원소', boss:'화산 거인' },
    sky_ruins:   { elite:'하피', rare:'천공 기사', boss:'천둥 드래곤', legendary:'폭풍의 왕' },
    shadow:      { rare:'그림자 암살자', boss:'허무의 기사', legendary:'그림자 군주' },
    frozen_deep: { rare:'빙결 골렘', boss:'프로스트 리치', legendary:'빙하의 여왕' },
    celestial:   { rare:'천사', boss:'세라핌', legendary:'대천사장', mythic:'하늘의 심판자' },
    demon:       { rare:'하급 악마', boss:'악마 장군', legendary:'마왕', mythic:'혼돈의 지배자' },
    world_tree:  { boss:'엔트 수호자', legendary:'세계수 정령', mythic:'생명의 어머니' },
    void_rift:   { boss:'공허의 감시자', legendary:'차원 포식자', mythic:'태초의 존재' },
    blood_arena: { elite:'광전사', rare:'피의 기사', boss:'투기장 챔피언', legendary:'피의 군주' },
    lawless:     { elite:'도적 대장', rare:'현상금 사냥꾼', boss:'무법자 왕' },
};

// ── 카르마 시스템 (PK 페널티) ──
const KARMA = {
    PK_PENALTY: 100,         // PK 1회당 카르마 증가
    DECAY_PER_MIN: 5,        // 분당 카르마 자연 감소
    CHAOTIC_THRESHOLD: 200,  // 이 이상이면 '카오틱' 상태
    DEATH_GOLD_LOSS: 0.10,   // 카오틱 사망 시 골드 10% 손실
    DEATH_EXP_LOSS: 0.05,    // 카오틱 사망 시 경험치 5% 손실
    BOUNTY_BONUS: 1.5        // 카오틱 처치 시 보상 1.5배
};

// ── 레벨업 테이블 ──
function getExpRequired(level) {
    return Math.floor(100 * Math.pow(1.10, level - 1));
}

// ── 방어력 기반 데미지 계산 ──
const MAX_STACK = 999; // 아이템 최대 스택
// ── 재미 시스템 전역 변수 ──
let treasureGoblin = null; // { id, zoneId, spawnTime }
let nextTreasureTime = Date.now() + 180000 + Math.random() * 300000;
let bountyBoard = []; // [{ targetId, targetName, reward, timeLimit, claimedBy, claimedAt }]
let lastBountyUpdate = 0;
let zoneConquest = {}; // { zoneId: { clanName, kills:{} } }
let lastConquestReset = Date.now();
let meteorShower = null; // { zoneId, endTime }
let nextMeteorTime = Date.now() + 1200000 + Math.random() * 1200000;
let rogueMerchant = null; // { townId, deals:[], expiresAt }
let nextRogueTime = Date.now() + 480000 + Math.random() * 420000;

const MAX_GOLD = 999999999;
const MAX_DIAMONDS = 9999999;
const MAX_LEVEL = 99;

function capResources(p) {
    if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
    if (p.diamonds > MAX_DIAMONDS) p.diamonds = MAX_DIAMONDS;
    if (p.level > MAX_LEVEL) p.level = MAX_LEVEL;
}

function getYesterday() {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}
function getWeekNumber() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-W' + Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
}

function calcDamage(atk, def, dmgMulti, critRate, attackerElement, defenderElement) {
    let isCrit = Math.random() < critRate;
    let baseDmg = Math.max(1, atk * dmgMulti - def * 0.3);
    if (isCrit) baseDmg *= 2.0;
    // 속성 상성 보너스 (fire>wind>earth>water>fire) + 날씨 영향
    if (attackerElement && defenderElement && ELEMENT_BONUS[attackerElement] === defenderElement) {
        baseDmg *= 1.25;
    } else if (defenderElement && attackerElement && ELEMENT_BONUS[defenderElement] === attackerElement) {
        baseDmg *= 0.8;
    }
    // 날씨 속성 보너스 (날씨 속성과 같으면 +15%)
    if (currentWeather.effect?.element && attackerElement === currentWeather.effect.element) {
        baseDmg *= 1.15;
    }
    return { damage: Math.floor(baseDmg), isCrit };
}

// ── 몬스터 스폰 (등급별 가중치) ──
function pickMonsterTier() {
    const totalWeight = Object.values(MONSTER_TIERS).reduce((s, t) => s + t.spawnWeight, 0);
    let roll = Math.random() * totalWeight;
    for (const [key, tier] of Object.entries(MONSTER_TIERS)) {
        roll -= tier.spawnWeight;
        if (roll <= 0) return key;
    }
    return 'normal';
}

function pickZoneTier(zoneId) {
    const zm = ZONE_MONSTERS[zoneId];
    if (!zm) return pickMonsterTier();
    const total = Object.values(zm.tiers).reduce((s, w) => s + w, 0);
    let roll = Math.random() * total;
    for (const [tier, weight] of Object.entries(zm.tiers)) {
        roll -= weight;
        if (roll <= 0) return tier;
    }
    return 'normal';
}

// 존 레벨에 따라 몬스터 스탯 스케일링
function scaleMonster(tier, zoneLvl) {
    const base = MONSTER_TIERS[tier];
    if (!base) return MONSTER_TIERS.normal;
    const scale = 1 + Math.max(0, zoneLvl - 5) * 0.06; // 존 레벨 5 이상부터 6%씩 강화
    return {
        ...base,
        hp: Math.floor(base.hp * scale),
        atk: Math.floor(base.atk * scale),
        def: Math.floor(base.def * scale),
        expReward: Math.floor(base.expReward * scale),
        goldReward: Math.floor(base.goldReward * scale),
    };
}

function spawnMonster() {
    entityIdCounter++;
    const mId = 'monster_' + entityIdCounter;

    // 존 기반 스폰 (존별 몬스터 등급 배합)
    const huntZoneEntries = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena && ZONE_MONSTERS[id]);
    const [zoneId, zone] = huntZoneEntries[Math.floor(Math.random() * huntZoneEntries.length)];
    const tierKey = pickZoneTier(zoneId);
    const zoneMidLvl = Math.floor((zone.lvl[0] + zone.lvl[1]) / 2);
    const tier = scaleMonster(tierKey, zoneMidLvl);

    const mx = zone.x + Math.random() * zone.w;
    const my = zone.y + Math.random() * zone.h;

    // 몬스터 고유 AI 타입
    const AI_TYPES = { normal:'wander', elite:'charge', rare:'aoe', boss:'breath', legendary:'breath', mythic:'breath' };
    // 존별 이름 적용
    const zoneNames = ZONE_MONSTER_NAMES[zoneId];
    const monsterName = (zoneNames && zoneNames[tierKey]) ? zoneNames[tierKey] : tier.name;

    monsters[mId] = {
        id: mId,
        tier: tierKey,
        name: monsterName,
        x: mx, y: my,
        hp: tier.hp, maxHp: tier.hp,
        atk: tier.atk, def: tier.def,
        color: tier.color,
        isAlive: true,
        element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
        zoneId,
        aiType: AI_TYPES[tierKey] || 'wander',
        expReward: tier.expReward,
        goldReward: tier.goldReward,
        lastSpecialAttack: 0,
    };

    // 밤 시간 강화 적용
    if (isNight) {
        monsters[mId].atk = Math.floor(monsters[mId].atk * 1.2);
        monsters[mId].hp = Math.floor(monsters[mId].hp * 1.2);
        monsters[mId].maxHp = Math.floor(monsters[mId].maxHp * 1.2);
        monsters[mId].nightBuffed = true;
    }

    // 레어 몬스터 스폰 공지
    if (tierKey === 'legendary' || tierKey === 'mythic') {
        const spawnZoneName = ZONES[zoneId]?.name || zoneId;
        io.emit('rare_spawn', { id: mId, name: monsterName, tier: tierKey, zoneId, zoneName: spawnZoneName });
        io.emit('server_msg', { msg: `[희귀 출현] ${monsterName}이(가) ${spawnZoneName}에 나타났습니다!`, type: 'boss' });
    }
}

// 초기 몬스터 배치
for (let i = 0; i < MAX_MONSTERS; i++) spawnMonster();

// ── 월드 보스 시스템 ──
let worldBoss = null;
const WORLD_BOSS_TYPES = [
    { name:'태고의 드래곤', hp:50000, atk:120, def:50, expReward:5000, goldReward:3000, tier:'worldboss', color:'#FF0000' },
    { name:'심연의 군주',   hp:80000, atk:150, def:70, expReward:8000, goldReward:5000, tier:'worldboss', color:'#8800FF' },
    { name:'불멸의 피닉스', hp:60000, atk:130, def:40, expReward:6000, goldReward:4000, tier:'worldboss', color:'#FF8800' },
];

function endArenaMatch(matchId, winnerId, loserId, reason) {
    const match = arenaMatches[matchId];
    if (!match) return;
    const winner = players[winnerId], loser = players[loserId];

    // 포인트 계산
    if (!arenaRankings[winnerId]) arenaRankings[winnerId] = { wins:0, losses:0, points:1000 };
    if (!arenaRankings[loserId]) arenaRankings[loserId] = { wins:0, losses:0, points:1000 };
    arenaRankings[winnerId].wins++;
    arenaRankings[loserId].losses++;
    arenaRankings[winnerId].points += 25;
    arenaRankings[loserId].points = Math.max(0, arenaRankings[loserId].points - 15);

    // 보상
    if (winner) {
        winner.gold += 200;
        winner.arenaCountToday = (winner.arenaCountToday || 0) + 1;
        winner.hp = winner.maxHp; // HP 회복
        delete winner.arenaMatchId;
        // 마을로 귀환
        winner.x = -480 + Math.random() * 40; winner.y = -480 + Math.random() * 40;
        io.to(winnerId).emit('arena_end', { result: 'win', points: arenaRankings[winnerId].points, reward: 200, reason });
        trackQuest(winner, 'pvp_win', 1);
        trackQuest(winner, 'pvp_fight', 1);
    }
    if (loser) {
        loser.arenaCountToday = (loser.arenaCountToday || 0) + 1;
        loser.hp = loser.maxHp; // HP 회복
        delete loser.arenaMatchId;
        loser.x = -480 + Math.random() * 40; loser.y = -480 + Math.random() * 40;
        io.to(loserId).emit('arena_end', { result: 'lose', points: arenaRankings[loserId].points, reason });
        trackQuest(loser, 'pvp_fight', 1);
    }

    io.emit('server_msg', { msg: `[아레나] ${winner?.displayName || '?'} 승리! (${reason})`, type: 'normal' });
    delete arenaMatches[matchId];
}

function spawnWorldBoss() {
    if (worldBoss && worldBoss.isAlive) return; // 이미 보스 존재
    const bossType = WORLD_BOSS_TYPES[Math.floor(Math.random() * WORLD_BOSS_TYPES.length)];
    const zone = ZONES.dragon; // 용의 요람에 스폰
    entityIdCounter++;
    const bossId = 'worldboss_' + entityIdCounter;

    monsters[bossId] = {
        id: bossId,
        tier: 'worldboss',
        name: bossType.name,
        x: zone.x + zone.w / 2,
        y: zone.y + zone.h / 2,
        hp: bossType.hp,
        maxHp: bossType.hp,
        atk: bossType.atk,
        def: bossType.def,
        color: bossType.color,
        isAlive: true,
        isWorldBoss: true,
        expReward: bossType.expReward,
        goldReward: bossType.goldReward,
        damageContrib: {}, // 기여도 추적 {playerId: totalDamage}
    };

    worldBoss = { id: bossId, name: bossType.name, isAlive: true, spawnTime: Date.now() };
    io.emit('server_msg', { msg: `[월드 보스] ${bossType.name}이(가) 용의 요람에 출현했습니다! 모든 전사여 모여라!`, type: 'boss' });
    io.emit('world_boss_spawn', { id: bossId, name: bossType.name, hp: bossType.hp, maxHp: bossType.hp, x: monsters[bossId].x, y: monsters[bossId].y });
}

// ── 던전 시스템 ──
const DUNGEONS = {
    cave_dungeon: {
        name: '어둠의 동굴', zoneId: 'cave', minLevel: 15, maxParty: 5, stages: 3,
        monsters: [
            { tier:'elite', count:5 }, { tier:'elite', count:8 }, { tier:'boss', count:1 }
        ],
        rewards: { gold: 2000, exp: 3000, drops: ['equip_sword_3','equip_armor_3'] }
    },
    ruins_dungeon: {
        name: '지하 감옥', zoneId: 'ruins', minLevel: 20, maxParty: 5, stages: 5,
        monsters: [
            { tier:'elite', count:5 }, { tier:'rare', count:3 }, { tier:'elite', count:8 },
            { tier:'rare', count:5 }, { tier:'boss', count:2 }
        ],
        rewards: { gold: 5000, exp: 8000, drops: ['equip_sword_4','equip_armor_4','equip_ring_3'] }
    },
    dragon_raid: {
        name: '드래곤 둥지 레이드', zoneId: 'dragon', minLevel: 25, maxParty: 25, stages: 3,
        monsters: [
            { tier:'rare', count:10 }, { tier:'boss', count:3 }, { tier:'boss', count:1 }
        ],
        rewards: { gold: 15000, exp: 20000, drops: ['equip_sword_5','equip_armor_5'] }
    },
};
let activeDungeons = {}; // {instanceId: {dungeonId, players:[], currentStage, monstersLeft}}

// ── 무한의 탑 시스템 ──
const INFINITE_TOWER = {
    maxFloor: 100,
    getMonsters(floor) {
        const count = 3 + Math.floor(floor / 5);
        const hp = 80 + floor * 40;
        const atk = 8 + floor * 3;
        const def = 3 + floor * 1.5;
        let tier = 'normal';
        if (floor >= 10) tier = 'elite';
        if (floor >= 30) tier = 'rare';
        if (floor >= 50) tier = 'boss';
        return { count, hp, atk, def, tier };
    },
    getReward(floor) {
        const gold = 100 + floor * 50;
        const exp = 200 + floor * 80;
        const diamonds = floor % 10 === 0 ? Math.floor(floor / 2) : 0;
        const drops = [];
        if (floor % 10 === 0) drops.push(floor >= 50 ? 'equip_sword_4' : floor >= 20 ? 'equip_sword_3' : 'equip_sword_2');
        if (floor % 25 === 0) drops.push('mat_dragon');
        return { gold, exp, diamonds, drops };
    }
};
let towerProgress = {}; // {playerId: {currentFloor, monstersLeft, startTime}}

// ── 친구 시스템 ──
let friendLists = {}; // {playerId: [friendId, ...]}
let friendRequests = {}; // {targetId: [{fromId, fromName, time}]}

// ── 시간대별 필드보스 ──
let fieldBossActive = false;
let lastFieldBossHour = -1;
let goldFeverZone = null;

// ══════════════════════════════════════
// 5대 신규 시스템
// ══════════════════════════════════════

// ── 1. 시즌 균열 (2주 주기 로테이션) ──
const RIFT_THEMES = [
    { id:'frozen', name:'얼어붙은 심연', modifiers:{ atkMulti:1.0, defMulti:0.8, critGlobal:1.3, element:'water' }, color:'#88ccff' },
    { id:'burning', name:'불타는 사막', modifiers:{ atkMulti:1.2, defMulti:1.0, spdMulti:0.8, element:'fire' }, color:'#ff6600' },
    { id:'void', name:'공허의 폭풍', modifiers:{ atkMulti:0.9, defMulti:0.9, expMulti:2.0, element:'wind' }, color:'#aa44ff' },
    { id:'earth', name:'대지의 진동', modifiers:{ atkMulti:1.1, defMulti:1.3, goldMulti:1.5, element:'earth' }, color:'#88aa44' },
];
let currentSeason = { theme: RIFT_THEMES[0], depth: 0, startTime: Date.now(), leaderboard: {} };

// ── 2. 룬 시스템 ──
const RUNES = {
    'ㄱ':{name:'기',stat:'atk',value:3}, 'ㄴ':{name:'나',stat:'def',value:3},
    'ㄷ':{name:'다',stat:'hp',value:15}, 'ㄹ':{name:'라',stat:'spd',value:1},
    'ㅁ':{name:'마',stat:'mp',value:10}, 'ㅂ':{name:'바',stat:'crit',value:0.02},
    'ㅅ':{name:'사',stat:'dodge',value:0.01}, 'ㅇ':{name:'아',stat:'exp',value:0.03},
    'ㅈ':{name:'자',stat:'gold',value:0.03}, 'ㅊ':{name:'차',stat:'atk',value:5},
    'ㅋ':{name:'카',stat:'def',value:5}, 'ㅌ':{name:'타',stat:'hp',value:25},
    'ㅍ':{name:'파',stat:'crit',value:0.03}, 'ㅎ':{name:'하',stat:'all',value:2},
};
const RUNE_WORDS = {
    'ㄱㅂㅊ': { name:'용의 숨결', effect:'fireAoe', desc:'공격 시 10% 확률 화염 광역', bonus:{atk:20} },
    'ㄴㅋㅌ': { name:'철벽',     effect:'shield',  desc:'피격 시 15% 확률 1초 무적', bonus:{def:30} },
    'ㄹㅅㅍ': { name:'질풍',     effect:'haste',   desc:'킬 시 3초간 속도 2배', bonus:{spd:5} },
    'ㅁㅇㅎ': { name:'지혜의 빛', effect:'expUp',   desc:'EXP +25% 상시', bonus:{exp:0.25} },
    'ㄱㄴㄷ': { name:'초심',     effect:'regen',   desc:'HP 리젠 +3%', bonus:{hpRegen:0.03} },
    'ㅊㅋㅌ': { name:'파괴자',   effect:'execute', desc:'HP 20%↓ 적에게 데미지 x2', bonus:{atk:15} },
    'ㅂㅅㅍ': { name:'행운',     effect:'luck',    desc:'드롭률 +30%', bonus:{dropRate:0.3} },
};

// ── 3. 진영 시스템 ──
const FACTIONS = {
    sun:  { name:'태양 기사단', color:'#ffd700', bonus:'atk', bonusValue:0.05 },
    moon: { name:'달빛 마법단', color:'#aaccff', bonus:'exp', bonusValue:0.08 },
    star: { name:'별의 수호자', color:'#ffaacc', bonus:'def', bonusValue:0.05 },
};
let factionState = { sun:{zones:{},kills:0}, moon:{zones:{},kills:0}, star:{zones:{},kills:0} };

// ── 4. 프레스티지 (환생) ──
const LEGACY_PERKS = [
    { name:'골드 마스터', desc:'기본 골드 +10%', stat:'goldBonus', value:0.10 },
    { name:'전투 본능', desc:'기본 ATK +5', stat:'atk', value:5 },
    { name:'강철 체력', desc:'기본 HP +50', stat:'hp', value:50 },
    { name:'행운의 별', desc:'크리티컬 +3%', stat:'crit', value:0.03 },
    { name:'빠른 발', desc:'이동속도 +2', stat:'spd', value:2 },
    { name:'현자의 지혜', desc:'EXP +15%', stat:'expBonus', value:0.15 },
    { name:'수호의 기운', desc:'DEF +5', stat:'def', value:5 },
    { name:'도적의 손길', desc:'드롭률 +10%', stat:'dropRate', value:0.10 },
    { name:'용사의 혼', desc:'전체 스탯 +3%', stat:'allMulti', value:0.03 },
    { name:'불멸의 의지', desc:'사망 시 HP 10% 부활 (10분 CD)', stat:'autoRevive', value:0.1 },
];

// ── 5. 의뢰 게시판 (플레이어 생성 퀘스트) ──
let contractBoard = []; // { id, creatorId, creatorName, type, target, reward, status, acceptedBy, expiresAt }
let contractIdCounter = 0;

// ── 낚시 시스템 ──
const FISH_TABLE = [
    { name:'잡어',     grade:'common', sell:5,   weight:50, minLevel:1 },
    { name:'붕어',     grade:'common', sell:10,  weight:30, minLevel:1 },
    { name:'잉어',     grade:'uncommon', sell:30, weight:20, minLevel:3 },
    { name:'송어',     grade:'uncommon', sell:50, weight:15, minLevel:5 },
    { name:'연어',     grade:'rare',   sell:100, weight:8,  minLevel:8 },
    { name:'참치',     grade:'rare',   sell:200, weight:5,  minLevel:12 },
    { name:'황금 잉어', grade:'epic',   sell:500, weight:2,  minLevel:15 },
    { name:'용왕의 물고기', grade:'legendary', sell:2000, weight:0.5, minLevel:25 },
];

// ── 이모트 ──
const EMOTES = {
    taunt:'도발!', cheer:'환호!', greet:'안녕!', laugh:'ㅋㅋㅋ',
    cry:'ㅠㅠ', gg:'GG', help:'도와줘!', thanks:'고마워!',
};

// ── 출석 캘린더 보상 ──
const ATTENDANCE_REWARDS = [
    {day:1, reward:'100G'},  {day:2, reward:'200G'},  {day:3, reward:'300G + 10D'},
    {day:4, reward:'400G'},  {day:5, reward:'500G + 15D'}, {day:6, reward:'600G'},
    {day:7, reward:'희귀 상자'},  {day:8, reward:'800G'},  {day:9, reward:'900G'},
    {day:10, reward:'1000G + 30D'}, {day:11, reward:'1100G'}, {day:12, reward:'1200G'},
    {day:13, reward:'1300G + 20D'}, {day:14, reward:'전설 재료 x3'},
    {day:15, reward:'1500G'}, {day:16, reward:'1600G'}, {day:17, reward:'1700G + 30D'},
    {day:18, reward:'1800G'}, {day:19, reward:'1900G'}, {day:20, reward:'2000G + 50D'},
    {day:21, reward:'영웅 장비 상자'}, {day:22, reward:'2200G'}, {day:23, reward:'2300G'},
    {day:24, reward:'2400G + 40D'}, {day:25, reward:'2500G'}, {day:26, reward:'2600G'},
    {day:27, reward:'2700G + 50D'}, {day:28, reward:'전설 장비 상자 + 칭호'},
];
let goldFeverEnd = 0;

// ── 드롭 아이템 생성 ──
function spawnDrop(x, y, gold, monsterId) {
    entityIdCounter++;
    const dropId = 'drop_' + entityIdCounter;
    drops[dropId] = {
        id: dropId,
        x, y, gold,
        spawnTime: Date.now(),
        pickupRadius: 2.0
    };
    io.emit('drop_spawn', drops[dropId]);

    // 30초 후 자동 소멸
    setTimeout(() => {
        if (drops[dropId]) {
            io.emit('drop_destroy', dropId);
            delete drops[dropId];
        }
    }, 30000);
}

// ==========================================
// Socket.IO 연결 처리
// ==========================================

io.on('connection', (socket) => {
    const playerId = socket.id;

    if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('server_full', { message: '서버가 가득 찼습니다.' });
        socket.disconnect();
        return;
    }

    socket.on('init_request', async (dataStr) => {
        let selectedClass = 'Warrior';
        let deviceId = playerId;

        try {
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.className && CLASSES[data.className]) selectedClass = data.className;
                if (data.deviceId) deviceId = data.deviceId;
            }
        } catch(e) {}

        socket.deviceId = deviceId;

        let loadedData = null;
        try {
            const [rows] = await pool.query('SELECT * FROM players_save WHERE device_id = ?', [deviceId]);
            if (rows.length > 0) loadedData = rows[0];
        } catch(e) {}

        const cls = CLASSES[selectedClass];
        let pInfo = {
            id: playerId,
            deviceId,
            className: selectedClass,
            displayName: cls.displayName,
            x: -480 + Math.random() * 40, // 바람개비 마을 안에서 시작
            y: -480 + Math.random() * 40,
            hp: cls.maxHp,
            maxHp: cls.maxHp,
            atk: cls.atk,
            def: cls.def,
            critRate: cls.critRate,
            dodgeRate: cls.dodgeRate,
            dmgMulti: 1.0,
            dirX: 0, dirY: -1,
            gold: 0,
            diamonds: 100, // 신규 유저 보너스
            level: 1,
            exp: 0,
            isAlive: true,
            killCount: 0,
            karma: 0,
            team: 'peace',
            ownerId: null,
            targetId: null,
            isKing: false,
            isBot: false,
            skins: [],
            activeSkin: null,
            maxArmy: 30,
            inventory: { 'pot_hp_s': 5, 'scroll_return': 2 },
            // 스탯 포인트
            statPoints: 0,
            bonusStr: 0, bonusDex: 0, bonusInt: 0, bonusCon: 0,
            // MP 시스템
            mp: 100, maxMp: 100,
            // 속성
            element: ELEMENTS[Math.floor(Math.random() * 4)],
            // 전직
            isAdvanced: false, advancedClass: null,
            // 혈맹
            clanName: null,
            // 파티
            partyId: null,
            lastHpRegen: Date.now(),
            autoSkillCooldown: 0
        };

        if (loadedData && loadedData.is_alive) {
            pInfo.className = loadedData.class_name;
            pInfo.displayName = CLASSES[pInfo.className]?.displayName || pInfo.className;
            pInfo.level = loadedData.level;
            pInfo.exp = loadedData.exp;
            pInfo.gold = loadedData.gold || 0;
            pInfo.killCount = loadedData.kill_count;
            pInfo.karma = loadedData.karma || 0;
            pInfo.team = loadedData.team;

            // 확장 데이터 복원
            if (loadedData.ext_data) {
                try {
                    const ext = JSON.parse(loadedData.ext_data);
                    Object.assign(pInfo, {
                        equipped: ext.equipped || {},
                        enchantLevels: ext.enchantLevels || {},
                        equipOptions: ext.equipOptions || {},
                        inventory: ext.inventory || pInfo.inventory,
                        warehouse: ext.warehouse || {},
                        diamonds: ext.diamonds || pInfo.diamonds,
                        statPoints: ext.statPoints || 0,
                        bonusStr: ext.bonusStr || 0, bonusDex: ext.bonusDex || 0,
                        bonusInt: ext.bonusInt || 0, bonusCon: ext.bonusCon || 0,
                        isAdvanced: ext.isAdvanced || false,
                        advancedClass: ext.advancedClass || null,
                        baseClassName: ext.baseClassName || null,
                        pvpWins: ext.pvpWins || 0,
                        towerHighest: ext.towerHighest || 0,
                        attendance: ext.attendance || {},
                        lastLoginDate: ext.lastLoginDate || null,
                        lastWeek: ext.lastWeek || null,
                        clanName: ext.clanName || null,
                        activePet: ext.activePet || null,
                        pets: ext.pets || [],
                        activeMount: ext.activeMount || null,
                        mounts: ext.mounts || [],
                        titles: ext.titles || [],
                        activeTitle: ext.activeTitle || null,
                        activeSkin: ext.activeSkin || null,
                        skins: ext.skins || [],
                        morphKills: ext.morphKills || {},
                        totalTamed: ext.totalTamed || 0,
                        totalTradeProfit: ext.totalTradeProfit || 0,
                        totalCrafts: ext.totalCrafts || 0,
                        dungeonClears: ext.dungeonClears || 0,
                        bestiary: ext.bestiary || {},
                        waypoints: ext.waypoints || ['aden'],
                        faction: ext.faction || null,
                        factionRep: ext.factionRep || 0,
                        prestigeLevel: ext.prestigeLevel || 0,
                        legacyPerks: ext.legacyPerks || [],
                        itemRunes: ext.itemRunes || {},
                        discoveredZones: ext.discoveredZones || [],
                        fishingLevel: ext.fishingLevel || 1,
                        _fishCount: ext._fishCount || 0,
                        maxArmy: ext.maxArmy || 30,
                        autoPotion: ext.autoPotion || false,
                        questProgress: ext.questProgress || {},
                        questCompleted: ext.questCompleted || {},
                    });
                    if (pInfo.isAdvanced && pInfo.advancedClass) {
                        const adv = CLASS_ADVANCE[pInfo.baseClassName || pInfo.className];
                        if (adv) pInfo.displayName = adv.displayName;
                    }
                } catch(e) {}
            }

            const baseCls = CLASSES[pInfo.baseClassName || pInfo.className] || CLASSES[pInfo.className];
            // recalcStats로 장비/스탯 포인트 포함 전체 재계산
            pInfo.atk = baseCls.atk;
            pInfo.def = baseCls.def;
            pInfo.critRate = baseCls.critRate;
            pInfo.dodgeRate = baseCls.dodgeRate;
            pInfo.maxHp = baseCls.maxHp + (pInfo.level - 1) * 25;
            pInfo.dmgMulti = 1.0 + (pInfo.level - 1) * 0.08;

            if (pInfo.team.startsWith('king_')) {
                pInfo.isKing = true;
                pInfo.maxHp = Math.floor(pInfo.maxHp * 1.8);
                pInfo.hp = pInfo.maxHp;
                pInfo.dmgMulti *= 2.0;
            }

            // 군대 복구
            if (loadedData.army_data) {
                let savedArmy = [];
                try {
                    savedArmy = typeof loadedData.army_data === 'string'
                        ? JSON.parse(loadedData.army_data) : loadedData.army_data;
                } catch(e) {}

                savedArmy.forEach(bot => {
                    entityIdCounter++;
                    const botId = 'bot_restored_' + entityIdCounter;
                    const botCls = CLASSES[bot.className] || CLASSES['Warrior'];
                    players[botId] = {
                        id: botId, deviceId: 'bot',
                        className: bot.className,
                        displayName: botCls.displayName,
                        x: bot.x, y: bot.y,
                        hp: bot.hp, maxHp: bot.maxHp,
                        atk: botCls.atk, def: botCls.def,
                        critRate: botCls.critRate, dodgeRate: botCls.dodgeRate,
                        dmgMulti: pInfo.dmgMulti,
                        dirX: 0, dirY: -1,
                        gold: 0, level: bot.level || 1, exp: 0,
                        isAlive: true, killCount: 0, karma: 0,
                        team: pInfo.team,
                        ownerId: pInfo.id,
                        targetId: null,
                        isKing: false, isBot: true,
                        lastHpRegen: Date.now(), autoSkillCooldown: 0
                    };
                    socket.broadcast.emit('player_join', players[botId]);
                });
            }
        } else {
            savePlayer(pInfo);
        }

        // 장비/스탯 포인트 포함 전체 스탯 재계산
        recalcStats(pInfo);
        pInfo.hp = pInfo.maxHp;

        players[playerId] = pInfo;

        // ── 출석 체크 & 일일/주간 퀘스트 초기화 ──
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const thisWeek = getWeekNumber();
        if (!pInfo.lastLoginDate || pInfo.lastLoginDate !== today) {
            // 일일 퀘스트 진행도 초기화
            if (pInfo.questProgress) {
                for (const [qId, q] of Object.entries(QUESTS)) {
                    if (q.type === 'daily') { pInfo.questProgress[qId] = 0; if (pInfo.questCompleted) delete pInfo.questCompleted[qId]; }
                }
            }
            // 출석 체크 보상
            if (!pInfo.attendance) pInfo.attendance = { streak: 0, lastDate: null };
            if (pInfo.attendance.lastDate === getYesterday()) {
                pInfo.attendance.streak++;
            } else if (pInfo.attendance.lastDate !== today) {
                pInfo.attendance.streak = 1;
            }
            pInfo.attendance.lastDate = today;
            const streak = pInfo.attendance.streak;
            const attendReward = { gold: 50 * streak, diamonds: streak >= 7 ? 30 : 10, exp: 100 * streak };
            pInfo.gold += attendReward.gold;
            pInfo.diamonds = (pInfo.diamonds || 0) + attendReward.diamonds;
            giveExp(pInfo, attendReward.exp);
            socket.emit('attendance_reward', { streak, reward: attendReward, msg: `출석 ${streak}일차! +${attendReward.gold}G, +${attendReward.diamonds}D` });
            if (streak === 7) {
                socket.emit('attendance_reward', { streak: 7, msg: '7일 연속 출석! 희귀 상자 지급!' });
                if (!pInfo.inventory) pInfo.inventory = {};
                pInfo.inventory['rare_box'] = (pInfo.inventory['rare_box'] || 0) + 1;
            }
            pInfo.lastLoginDate = today;
            // 아레나 일일 횟수 초기화
            pInfo.arenaCountToday = 0;
        }
        // 주간 퀘스트 초기화
        if (!pInfo.lastWeek || pInfo.lastWeek !== thisWeek) {
            if (pInfo.questProgress) {
                for (const [qId, q] of Object.entries(QUESTS)) {
                    if (q.type === 'weekly') { pInfo.questProgress[qId] = 0; if (pInfo.questCompleted) delete pInfo.questCompleted[qId]; }
                }
            }
            pInfo.lastWeek = thisWeek;
        }

        socket.emit('init', {
            id: playerId,
            players,
            axes,
            aoes,
            monsters,
            drops,
            classInfo: CLASSES,
            karmaInfo: KARMA,
            monsterTiers: MONSTER_TIERS,
            mountSpeed: getMountSpeed(pInfo),
            gradeInfo: GRADE_INFO,
        });

        socket.broadcast.emit('player_join', players[playerId]);

        // ── 신규 플레이어 온보딩 가이드 ──
        if (pInfo.level <= 1 && !pInfo.questProgress?.main_hunt1) {
            setTimeout(() => {
                socket.emit('guide_msg', { step: 1, msg: '환영합니다! 마을 밖 이슬숲에서 슬라임을 사냥해보세요.', target: 'forest' });
                setTimeout(() => {
                    socket.emit('guide_msg', { step: 2, msg: '자동 전투 중입니다. 몬스터 근처로 이동하면 자동 공격합니다.' });
                }, 8000);
                setTimeout(() => {
                    socket.emit('guide_msg', { step: 3, msg: '하단 메뉴에서 장비/스킬/퀘스트를 확인할 수 있습니다.' });
                }, 16000);
            }, 2000);
        } else if (pInfo.level <= 5) {
            setTimeout(() => {
                const zone = getZone(pInfo.x, pInfo.y);
                const safeZone = zone && ZONES[zone.id]?.safe;
                if (safeZone) socket.emit('guide_msg', { msg: `Lv.${pInfo.level} — 마을 밖으로 나가서 사냥을 시작하세요!` });
            }, 3000);
        }
        // 접속 시 현재 퀘스트 진행도 알림
        if (pInfo.questProgress) {
            for (const [qId, q] of Object.entries(QUESTS)) {
                if (q.type === 'daily' && !(pInfo.questCompleted?.[qId])) {
                    const prog = pInfo.questProgress[qId] || 0;
                    if (prog > 0 && prog < q.goal) {
                        setTimeout(() => {
                            socket.emit('quest_progress', { name: q.name, current: prog, goal: q.goal, remaining: q.goal - prog });
                        }, 4000);
                        break;
                    }
                }
            }
        }
    });

    socket.on('move', (data) => {
        try {
            const moveData = JSON.parse(data);
            const p = players[playerId];
            if (!p || !p.isAlive || p.isBot) return;
            const nx = parseFloat(moveData.x), ny = parseFloat(moveData.y);
            if (!isFinite(nx) || !isFinite(ny)) return;
            // 이동 거리 검증 (텔레포트 핵 방지)
            const dist = Math.hypot(nx - p.x, ny - p.y);
            if (dist > 3) return; // 틱당 최대 이동 거리 제한
            // 맵 범위 제한
            p.x = Math.max(-1020, Math.min(1020, nx));
            p.y = Math.max(-1020, Math.min(1020, ny));
            if (moveData.dirX !== undefined) p.dirX = moveData.dirX;
            if (moveData.dirY !== undefined) p.dirY = moveData.dirY;
            // 존 레벨 경고
            const curZone = getZone(p.x, p.y);
            if (curZone && ZONES[curZone.id]) {
                const zLvl = ZONES[curZone.id].lvl;
                const prevZoneId = p._lastZoneId;
                if (prevZoneId !== curZone.id) {
                    p._lastZoneId = curZone.id;
                    if (p.level < zLvl[0]) {
                        socket.emit('server_msg', { msg: `경고: ${ZONES[curZone.id].name}은(는) Lv.${zLvl[0]}+ 추천 구역입니다! (현재 Lv.${p.level})`, type: 'danger' });
                    }
                    // 마을 첫 방문 시 웨이포인트 자동 등록
                    if (ZONES[curZone.id].safe) {
                        if (!p.waypoints) p.waypoints = ['aden'];
                        if (!p.waypoints.includes(curZone.id)) {
                            p.waypoints.push(curZone.id);
                            socket.emit('server_msg', { msg: `[웨이포인트] ${ZONES[curZone.id].name} 등록! 이제 어디서든 이동 가능`, type: 'normal' });
                            giveExp(p, 10);
                        }
                    }
                    // 탐험도 자동 등록
                    if (!p.discoveredZones) p.discoveredZones = [];
                    if (!p.discoveredZones.includes(curZone.id)) {
                        p.discoveredZones.push(curZone.id);
                        const total = Object.keys(ZONES).length;
                        const pct = Math.floor(p.discoveredZones.length / total * 100);
                        socket.emit('zone_discovered', { zone: ZONES[curZone.id].name, discovered: p.discoveredZones.length, total, pct });
                        giveExp(p, 5);
                        if (pct === 25) { p.gold += 1000; socket.emit('server_msg', { msg: '[탐험] 25% 달성! +1000G', type: 'rare' }); }
                        if (pct === 50) { p.diamonds = (p.diamonds||0) + 50; socket.emit('server_msg', { msg: '[탐험] 50% 달성! +50D', type: 'rare' }); }
                        if (pct === 75) { p.diamonds = (p.diamonds||0) + 100; socket.emit('server_msg', { msg: '[탐험] 75% 달성! +100D', type: 'rare' }); }
                        if (pct >= 100) { io.emit('server_msg', { msg: `[탐험] ${p.displayName}이(가) 전 지역 탐험 완료!`, type: 'boss' }); }
                    }
                }
            }
        } catch(e) {}
    });

    // PvP 토글 (카오틱/킹 시스템)
    // ── NPC 상호작용 ──
    socket.on('interact_npc', (npcType) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;

        // 마을 안에 있는지 체크
        const zone = getZone(p.x, p.y);
        if (!zone || !ZONES[zone.id]?.safe) {
            socket.emit('npc_result', { msg: '마을에서만 NPC 이용 가능' }); return;
        }
        const zoneNpcs = ZONES[zone.id]?.npcs || [];
        const npcInfo = NPCS[npcType];
        if (!npcInfo || !zoneNpcs.includes(npcType)) {
            socket.emit('npc_result', { msg: '이 마을에 해당 NPC가 없습니다' }); return;
        }

        switch (npcInfo.type) {
            case 'healer':
                p.hp = p.maxHp;
                socket.emit('npc_result', { msg: '치료 완료! HP가 가득 찼습니다.', type: 'healer' });
                io.emit('player_update', p);
                break;
            case 'smith':
                // 강화 가능한 장비 목록 전송
                const enchantable = [];
                if (p.equipped) {
                    for (const slot of EQUIPMENT_SLOTS) {
                        const eqId = p.equipped[slot];
                        if (eqId && EQUIP_STATS[eqId]) {
                            const eq = EQUIP_STATS[eqId];
                            const level = (p.enchantLevels && p.enchantLevels[eqId]) || 0;
                            const maxEnchant = (GRADE_INFO[eq.grade] || GRADE_INFO.normal).maxEnchant;
                            enchantable.push({ id: eqId, name: eq.name, slot, level, maxEnchant, grade: eq.grade });
                        }
                    }
                }
                socket.emit('npc_smith', { msg: npcInfo.msg, items: enchantable });
                break;
            case 'shop':
                socket.emit('npc_result', { msg: npcInfo.msg, type: 'shop' });
                break;
            case 'cook':
                socket.emit('npc_result', { msg: npcInfo.msg, type: 'cook' });
                break;
            case 'travel': {
                // 다른 마을 목록
                const towns = Object.entries(ZONES)
                    .filter(([id, z]) => z.safe && z.npcs && id !== zone.id)
                    .map(([id, z]) => ({ id, name: z.name, x: z.x + z.w/2, y: z.y + z.h/2 }));
                socket.emit('npc_travel', { msg: npcInfo.msg, towns });
                break;
            }
            case 'fisher':
                socket.emit('npc_result', { msg: npcInfo.msg, type: 'fisher' });
                break;
            default:
                socket.emit('npc_result', { msg: npcInfo.msg });
        }
    });

    // ── NPC 항해사 이동 ──
    socket.on('npc_travel_to', (townId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const targetZone = ZONES[townId];
        if (!targetZone || !targetZone.safe) return;
        const cost = 100;
        if (p.gold < cost) { socket.emit('npc_result', { msg: `이동 비용 ${cost}G 부족` }); return; }
        p.gold -= cost;
        p.x = targetZone.x + targetZone.w / 2;
        p.y = targetZone.y + targetZone.h / 2;
        savePlayer(p);
        io.emit('player_update', p);
        socket.emit('npc_result', { msg: `${targetZone.name}(으)로 이동 완료! (-${cost}G)` });
    });

    socket.on('toggle_pvp', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        // PvP 토글 쿨타임 (10초)
        const now = Date.now();
        if (p._lastPvpToggle && now - p._lastPvpToggle < 10000) {
            socket.emit('server_msg', { msg: 'PvP 전환 쿨타임 (10초)', type: 'normal' }); return;
        }
        p._lastPvpToggle = now;
        // 안전지대에서만 PvP 전환 가능
        const pZone = getZone(p.x, p.y);
        if (!pZone || !ZONES[pZone.id]?.safe) {
            socket.emit('server_msg', { msg: '마을에서만 PvP 전환 가능', type: 'danger' }); return;
        }

        if (p.team === 'peace') {
            if (!hasKing) {
                p.team = 'king_' + playerId;
                p.isKing = true;
                p.maxHp = Math.floor(p.maxHp * 1.8); // 3→1.8배
                p.hp = p.maxHp;
                p.dmgMulti *= 1.4; // 2→1.4배
                hasKing = true;
            } else {
                p.team = 'pvp_' + playerId;
                p.maxHp = Math.floor(p.maxHp * 1.3); // 1.5→1.3배
                p.hp = p.maxHp;
                p.dmgMulti *= 1.3; // 1.2→1.3배
            }
        } else {
            if (p.isKing) { hasKing = false; p.isKing = false; }
            p.team = 'peace';
            recalcStats(p); // 장비 보너스 포함 재계산
            p.dmgMulti = 1.0 + (p.level - 1) * 0.08;
            if (p.hp > p.maxHp) p.hp = p.maxHp;
        }

        savePlayer(p);
        io.emit('player_update', p);

        // 군대도 팀 동기화
        for (let bId in players) {
            if (players[bId].isBot && players[bId].ownerId === playerId) {
                players[bId].team = p.team;
                io.emit('player_update', players[bId]);
            }
        }
    });

    // 가디언 타워 건설 (-80골드)
    socket.on('build_tower', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.team === 'peace' || p.gold < 80) return;

        p.gold -= 80;
        entityIdCounter++;
        const towerId = 'tower_' + entityIdCounter;
        const tCls = CLASSES['GuardianTower'];

        players[towerId] = {
            id: towerId, deviceId: 'tower',
            className: 'GuardianTower',
            displayName: tCls.displayName,
            x: p.x, y: p.y,
            hp: tCls.maxHp, maxHp: tCls.maxHp,
            atk: tCls.atk, def: tCls.def,
            critRate: tCls.critRate, dodgeRate: tCls.dodgeRate,
            dmgMulti: p.dmgMulti,
            dirX: 0, dirY: -1,
            gold: 0, level: p.level, exp: 0,
            isAlive: true, killCount: 0, karma: 0,
            team: p.team,
            ownerId: playerId,
            targetId: null,
            isKing: false, isBot: true,
            lastHpRegen: Date.now(), autoSkillCooldown: 0
        };
        io.emit('player_join', players[towerId]);
        io.emit('player_update', p);
        savePlayer(p);
    });

    // 용병 고용 (-150골드)
    socket.on('add_bot', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;

        let myArmyCount = 0;
        for (let bId in players) {
            if (players[bId].isBot && players[bId].ownerId === playerId
                && players[bId].className !== 'GuardianTower' && players[bId].isAlive) {
                myArmyCount++;
            }
        }

        if (p.gold >= 150 && myArmyCount < 30) {
            p.gold -= 150;
            entityIdCounter++;
            const botId = 'bot_manual_' + entityIdCounter;

            const classNames = ['Assassin', 'Warrior', 'Knight', 'Mage'];
            const randomClass = classNames[Math.floor(Math.random() * classNames.length)];
            const botCls = CLASSES[randomClass];

            players[botId] = {
                id: botId, deviceId: 'bot',
                className: randomClass,
                displayName: botCls.displayName,
                x: p.x + (Math.random() * 2 - 1),
                y: p.y + (Math.random() * 2 - 1),
                hp: botCls.maxHp, maxHp: botCls.maxHp,
                atk: botCls.atk, def: botCls.def,
                critRate: botCls.critRate, dodgeRate: botCls.dodgeRate,
                dmgMulti: 1.0,
                dirX: 0, dirY: -1,
                gold: 0, level: 1, exp: 0,
                isAlive: true, killCount: 0, karma: 0,
                team: p.team,
                ownerId: playerId,
                targetId: null,
                isKing: false, isBot: true,
                lastHpRegen: Date.now(), autoSkillCooldown: 0
            };
            io.emit('player_join', players[botId]);
            io.emit('player_update', p);
            savePlayer(p);
        }
    });

    // 방향만 업데이트 (위치 변경 없이)
    socket.on('update_dir', (data) => {
        try {
            const d = JSON.parse(data);
            if (players[playerId] && players[playerId].isAlive) {
                if (d.dirX !== undefined) players[playerId].dirX = d.dirX;
                if (d.dirY !== undefined) players[playerId].dirY = d.dirY;
            }
        } catch(e) {}
    });

    socket.on('throw', () => {
        if (!players[playerId] || !players[playerId].isAlive) return;
        executeThrow(playerId);
    });

    socket.on('respawn', (dataStr) => {
        let newClass = 'Warrior';
        try {
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.className && CLASSES[data.className]) newClass = data.className;
            }
        } catch(e) {}

        if (players[playerId] && !players[playerId].isAlive) {
            const p = players[playerId];
            // 클래스 변경 (레벨/골드/장비는 유지 — 사망 시 이미 약탈됨)
            if (newClass !== p.className && !p.isAdvanced) {
                p.className = newClass;
                p.baseClassName = newClass;
                p.displayName = CLASSES[newClass]?.displayName || newClass;
            }
            p.team = 'peace';
            p.isKing = false; p.targetId = null;
            p.isAlive = true;
            // 장비/스탯 포함 전체 재계산
            recalcStats(p);
            p.hp = p.maxHp;
            // 마을에서 부활
            p.x = -480 + Math.random() * 40;
            p.y = -480 + Math.random() * 40;

            savePlayer(p);
            io.emit('player_respawn', p);
        }
    });

    // ── 상점 구매 ──
    socket.on('shop_buy', (itemId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;

        const item = SHOP_ITEMS[itemId];
        if (!item) return;

        // 화폐 확인 & 차감
        if (item.currency === 'diamond') {
            if ((p.diamonds || 0) < item.price) {
                socket.emit('shop_result', { success: false, msg: '다이아몬드가 부족합니다' });
                return;
            }
            p.diamonds -= item.price;
        } else {
            if (p.gold < item.price) {
                socket.emit('shop_result', { success: false, msg: '골드가 부족합니다' });
                return;
            }
            p.gold -= item.price;
        }

        // 효과 적용
        let msg = `${item.name} 구매 완료!`;
        switch (item.effect) {
            case 'exp_boost':
                p.expBoost = (p.expBoost || 1) * item.value;
                p.expBoostEnd = Date.now() + (item.duration * 1000);
                msg += ` (${item.duration}초간 EXP x${item.value})`;
                break;
            case 'gold_boost':
                p.goldBoost = (p.goldBoost || 1) * item.value;
                p.goldBoostEnd = Date.now() + (item.duration * 1000);
                msg += ` (${item.duration}초간 골드 x${item.value})`;
                break;
            case 'hp_potion':
                p.hp = Math.min(p.maxHp, p.hp + item.value * (item.count || 1));
                break;
            case 'army_expand':
                p.maxArmy = (p.maxArmy || 30) + item.value;
                msg += ` (최대 용병: ${p.maxArmy}명)`;
                break;
            case 'skin':
                if (!p.skins) p.skins = [];
                if (!p.skins.includes(item.value)) p.skins.push(item.value);
                p.activeSkin = item.value;
                msg += ` (${item.value} 스킨 적용)`;
                break;
            case 'teleport':
                p.x = -20; p.y = -20; // 마을 좌표
                break;
            case 'atk_boost':
                p.dmgMulti *= item.value;
                setTimeout(() => { if (players[playerId]) players[playerId].dmgMulti /= item.value; }, item.duration * 1000);
                break;
            case 'def_boost':
                p.def = Math.floor(p.def * item.value);
                const origDef = p.def;
                setTimeout(() => { if (players[playerId]) players[playerId].def = Math.floor(origDef / item.value); }, item.duration * 1000);
                break;
            case 'equip_item':
                if (!p.inventory) p.inventory = {};
                p.inventory[item.value] = (p.inventory[item.value] || 0) + 1;
                const eName = EQUIP_STATS[item.value]?.name || item.value;
                msg = `${eName} 구매 완료! (인벤토리에 추가)`;
                break;
            case 'protect':
                if (!p.inventory) p.inventory = {};
                p.inventory['protect_scroll'] = (p.inventory['protect_scroll'] || 0) + (item.count || 1);
                break;
            case 'revive':
                if (!p.inventory) p.inventory = {};
                p.inventory['scroll_revive'] = (p.inventory['scroll_revive'] || 0) + (item.count || 1);
                break;
        }

        savePlayer(p);
        socket.emit('shop_result', { success: true, msg, diamonds: p.diamonds || 0, gold: p.gold });
        io.emit('player_update', p);
    });

    // ── 상점 목록 요청 ──
    socket.on('shop_list', () => {
        const p = players[playerId];
        if (!p) return;
        socket.emit('shop_list_result', {
            items: SHOP_ITEMS,
            diamonds: p?.diamonds || 0,
            gold: p?.gold || 0,
            freeSources: FREE_DIAMOND_SOURCES
        });
    });

    // ── 일일 보상 수령 ──
    socket.on('daily_reward', () => {
        const p = players[playerId];
        if (!p) return;
        const today = new Date().toDateString();
        if (p.lastDailyReward === today) {
            socket.emit('daily_result', { success: false, msg: '오늘 이미 수령했습니다' });
            return;
        }
        p.lastDailyReward = today;
        p.diamonds = (p.diamonds || 0) + FREE_DIAMOND_SOURCES.daily_login;
        p.gold += 500;
        savePlayer(p);
        socket.emit('daily_result', {
            success: true,
            msg: `일일 보상: 💎${FREE_DIAMOND_SOURCES.daily_login} + 💰500G`,
            diamonds: p.diamonds,
            gold: p.gold
        });
    });

    // ── 인벤토리 조회 ──
    socket.on('get_inventory', () => {
        const p = players[playerId];
        if (!p) return;
        // 장비 정보 병합 (등급, 귀속 포함)
        const mergedItems = { ...TRADEABLE_ITEMS };
        for (const [eqId, eq] of Object.entries(EQUIP_STATS)) {
            if (!mergedItems[eqId]) mergedItems[eqId] = {};
            mergedItems[eqId].name = eq.name;
            mergedItems[eqId].grade = eq.grade;
            mergedItems[eqId].bound = eq.bound || false;
        }
        socket.emit('inventory_data', {
            inventory: p.inventory || {},
            items: mergedItems,
            enchantLevels: p.enchantLevels || {},
            equipped: p.equipped || {},
        });
    });

    // ── 퀘스트 목록/진행도 ──
    socket.on('get_quests', () => {
        const p = players[playerId];
        if (!p) return;
        if (!p.questProgress) p.questProgress = {};
        if (!p.questCompleted) p.questCompleted = {};
        socket.emit('quest_data', {
            quests: QUESTS,
            progress: p.questProgress,
            completed: p.questCompleted
        });
    });

    // ── 퀘스트 보상 수령 ──
    socket.on('quest_claim', (questId) => {
        const p = players[playerId];
        if (!p) return;
        const q = QUESTS[questId];
        if (!q) return;
        if (p.questCompleted && p.questCompleted[questId]) { socket.emit('quest_result', {success:false, msg:'이미 수령'}); return; }
        const progress = (p.questProgress && p.questProgress[questId]) || 0;
        if (progress < q.goal) { socket.emit('quest_result', {success:false, msg:'미완료'}); return; }

        if (!p.questCompleted) p.questCompleted = {};
        p.questCompleted[questId] = true;
        if (q.reward.gold) p.gold += q.reward.gold;
        if (q.reward.diamonds) p.diamonds = (p.diamonds||0) + q.reward.diamonds;
        if (q.reward.exp) giveExp(p, q.reward.exp);
        capResources(p);

        // 업적이면 전체 공지 + 팬파레
        if (q.type === 'achievement') {
            io.emit('server_msg', { msg: `[업적] ${p.displayName}: "${q.name}" 달성!`, type: 'rare' });
            socket.emit('achievement_unlock', { name: q.name, desc: q.desc, reward: q.reward });
        }

        savePlayer(p);
        socket.emit('quest_result', {success:true, msg:`${q.name} 보상 수령!`});
        io.emit('player_update', p);
    });

    // ── 유닛 관리 (용병 목록) ──
    socket.on('get_units', () => {
        const p = players[playerId];
        if (!p) return;
        const units = [];
        for (const bId in players) {
            const b = players[bId];
            if (b.isBot && b.ownerId === playerId && b.isAlive) {
                units.push({ id:bId, className:b.className, displayName:b.displayName, level:b.level, hp:b.hp, maxHp:b.maxHp });
            }
        }
        socket.emit('unit_data', { units, maxArmy: p.maxArmy || 30 });
    });

    // ── 유닛 해고 ──
    socket.on('dismiss_unit', (unitId) => {
        const b = players[unitId];
        if (!b || !b.isBot || b.ownerId !== playerId) return;
        b.isAlive = false;
        io.emit('player_die', { victimId: unitId, attackerId: playerId, stolen: false });
        delete players[unitId];
        socket.emit('unit_result', { success:true, msg:`${b.displayName} 해고됨` });
    });

    // ── 용병 NPC 판매 ──
    socket.on('sell_unit', (unitId) => {
        const p = players[playerId];
        const b = players[unitId];
        if (!p || !b || !b.isBot || b.ownerId !== playerId) return;

        // 등급별 판매 가격
        const sellPrices = { normal: 30, elite: 100, rare: 300, boss: 1000 };
        const price = sellPrices[b.tamedTier] || 50;

        p.gold += price;
        b.isAlive = false;
        io.emit('player_die', { victimId: unitId, attackerId: playerId, stolen: false });
        delete players[unitId];
        savePlayer(p);
        socket.emit('unit_result', { success:true, msg:`${b.displayName} NPC 판매 (+${price}G)` });
        io.emit('player_update', p);
    });

    // ── 장비 착용 ──
    socket.on('equip_item', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        const eq = EQUIP_STATS[itemId];
        if (!eq || !eq.slot) return;
        // 등급별 레벨 요구
        const gradeReq = GRADE_INFO[eq.grade]?.levelReq || 1;
        if (p.level < gradeReq) {
            socket.emit('equip_result', { success: false, msg: `Lv.${gradeReq} 이상 필요 (현재 Lv.${p.level})` });
            return;
        }

        if (!p.equipped) p.equipped = {};
        // 기존 장비 해제 → 인벤토리로
        if (p.equipped[eq.slot]) {
            const old = p.equipped[eq.slot];
            p.inventory[old] = (p.inventory[old]||0) + 1;
        }
        // 새 장비 착용
        p.equipped[eq.slot] = itemId;
        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];

        // 스탯 재계산
        recalcStats(p);
        savePlayer(p);
        socket.emit('equip_result', { success:true, msg:`${eq.name} 착용!`, equipped: p.equipped });
        io.emit('player_update', p);
    });

    // ── 장비 해제 ──
    socket.on('unequip_item', (slot) => {
        const p = players[playerId];
        if (!p || !p.equipped || !p.equipped[slot]) return;
        if (!EQUIPMENT_SLOTS.includes(slot)) return;
        const itemId = p.equipped[slot];
        delete p.equipped[slot];
        if (!p.inventory) p.inventory = {};
        p.inventory[itemId] = (p.inventory[itemId] || 0) + 1;
        recalcStats(p);
        savePlayer(p);
        socket.emit('equip_result', { success: true, msg: `장비 해제!`, equipped: p.equipped });
        io.emit('player_update', p);
    });

    // ── 일괄 판매 (등급 이하 모두 판매) ──
    socket.on('bulk_sell', (maxGrade) => {
        const p = players[playerId];
        if (!p || !p.inventory) return;
        const gradeOrder = ['normal','uncommon','rare','epic','legendary'];
        const maxIdx = gradeOrder.indexOf(maxGrade);
        if (maxIdx < 0) return;
        let totalGold = 0, soldCount = 0;
        for (const [itemId, qty] of Object.entries({ ...p.inventory })) {
            const eq = EQUIP_STATS[itemId];
            if (!eq) continue;
            const idx = gradeOrder.indexOf(eq.grade);
            if (idx >= 0 && idx <= maxIdx) {
                // 장착 중인 아이템 제외
                if (p.equipped && Object.values(p.equipped).includes(itemId)) continue;
                const price = Math.floor((TRADEABLE_ITEMS[itemId]?.basePrice || 50) * qty * 0.6);
                totalGold += price;
                soldCount += qty;
                delete p.inventory[itemId];
            }
        }
        if (soldCount > 0) {
            p.gold += totalGold;
            capResources(p);
            savePlayer(p);
            socket.emit('bulk_sell_result', { msg: `${soldCount}개 장비 일괄 판매! +${totalGold}G`, count: soldCount, gold: totalGold });
            io.emit('player_update', p);
        } else {
            socket.emit('bulk_sell_result', { msg: '판매할 장비가 없습니다' });
        }
    });

    // ── 장비 분해 (장비 → 재료) ──
    socket.on('dismantle_item', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        const eq = EQUIP_STATS[itemId];
        if (!eq) return;
        if (p.equipped && Object.values(p.equipped).includes(itemId)) {
            socket.emit('dismantle_result', { msg: '장착 중인 장비는 분해 불가' }); return;
        }
        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
        // 등급별 재료 반환
        if (!p.inventory) p.inventory = {};
        const matRewards = { normal: {mat_iron:2}, uncommon: {mat_iron:5,mat_magic:1}, rare: {mat_magic:3,mat_soul:1}, epic: {mat_soul:3,mat_dragon:1}, legendary: {mat_dragon:3,mat_soul:5} };
        const mats = matRewards[eq.grade] || {mat_iron:1};
        let matMsg = [];
        for (const [mat, qty] of Object.entries(mats)) {
            p.inventory[mat] = (p.inventory[mat]||0) + qty;
            matMsg.push(mat.replace('mat_','') + ' x' + qty);
        }
        savePlayer(p);
        socket.emit('dismantle_result', { msg: `${eq.name} 분해! → ${matMsg.join(', ')}` });
        io.emit('player_update', p);
    });

    // ── 웨이포인트 텔레포트 (방문한 마을로 무료 이동) ──
    socket.on('waypoint_teleport', (zoneId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (!p.waypoints) p.waypoints = ['aden']; // 기본 시작 마을
        if (!p.waypoints.includes(zoneId)) { socket.emit('waypoint_result', { msg: '미방문 지역' }); return; }
        const zone = ZONES[zoneId];
        if (!zone || !zone.safe) { socket.emit('waypoint_result', { msg: '마을만 이동 가능' }); return; }
        // 쿨타임 60초
        const now = Date.now();
        if (p._lastWaypoint && now - p._lastWaypoint < 60000) {
            socket.emit('waypoint_result', { msg: `쿨타임 ${Math.ceil((60000-(now-p._lastWaypoint))/1000)}초` }); return;
        }
        p._lastWaypoint = now;
        p.x = zone.x + zone.w/2;
        p.y = zone.y + zone.h/2;
        savePlayer(p);
        io.emit('player_update', p);
        socket.emit('waypoint_result', { msg: `${zone.name}(으)로 이동!` });
    });

    // ── 웨이포인트 목록 ──
    socket.on('get_waypoints', () => {
        const p = players[playerId];
        if (!p) return;
        if (!p.waypoints) p.waypoints = ['aden'];
        const list = p.waypoints.map(zId => ({ id: zId, name: ZONES[zId]?.name || zId }));
        socket.emit('waypoint_list', list);
    });

    // ── 액티브 플레이 보너스 (탭/클릭 시 보너스) ──
    socket.on('active_tap', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.isBot) return;
        const now = Date.now();
        if (p._lastActiveTap && now - p._lastActiveTap < 3000) return; // 3초 쿨타임
        p._lastActiveTap = now;
        // 액티브 보너스: 다음 5초간 데미지 +30%
        if (!p._activeBonus) p._activeBonus = 0;
        p._activeBonus = now + 5000;
        socket.emit('active_bonus', { duration: 5, multi: 1.3 });
    });

    // ── 크리티컬 루트 수집 ──
    socket.on('claim_critical_loot', (dropId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const drop = drops[dropId];
        if (!drop || drop.type !== 'critical_loot') return;
        if (Math.hypot(p.x - drop.x, p.y - drop.y) > 5) { socket.emit('loot_result', { msg: '너무 멀어요' }); return; }
        // 5배 희귀도 보상
        if (!p.inventory) p.inventory = {};
        const rareItems = Object.entries(EQUIP_STATS).filter(([id,eq]) => eq.grade === 'rare' || eq.grade === 'epic');
        if (rareItems.length > 0) {
            const [itemId, eq] = rareItems[Math.floor(Math.random() * rareItems.length)];
            p.inventory[itemId] = (p.inventory[itemId]||0) + 1;
            socket.emit('loot_result', { msg: `크리티컬 루트! ${eq.name} (${GRADE_INFO[eq.grade].name}) 획득!` });
            io.emit('server_msg', { msg: `${p.displayName}이(가) 크리티컬 루트로 ${eq.name} 획득!`, type: 'rare' });
        } else {
            p.gold += 1000;
            socket.emit('loot_result', { msg: '크리티컬 루트! +1000G!' });
        }
        io.emit('drop_destroy', dropId);
        delete drops[dropId];
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 버프 탭 연장 (50 MP로 +2초) ──
    socket.on('extend_buff', (buffId) => {
        const p = players[playerId];
        if (!p || !p.activeBuffs || !p.activeBuffs[buffId]) return;
        if ((p.mp || 0) < 50) { socket.emit('buff_result', { msg: 'MP 부족 (50 필요)' }); return; }
        p.mp -= 50;
        p.activeBuffs[buffId].endTime += 2000;
        socket.emit('buff_result', { msg: p.activeBuffs[buffId].name + ' +2초 연장! (-50MP)' });
    });

    // ── 캐릭터 프로필 ──
    socket.on('get_profile', () => {
        const p = players[playerId];
        if (!p) return;
        const equippedList = [];
        if (p.equipped) {
            for (const [slot, eqId] of Object.entries(p.equipped)) {
                if (!eqId) continue;
                const eq = EQUIP_STATS[eqId];
                const enchant = p.enchantLevels?.[eqId] || 0;
                const runes = p.itemRunes?.[eqId] || [];
                equippedList.push({ slot, id: eqId, name: eq?.name || eqId, grade: eq?.grade, enchant, runes });
            }
        }
        socket.emit('profile_data', {
            name: p.displayName, class: p.className, advancedClass: p.advancedClass,
            level: p.level, prestige: p.prestigeLevel || 0,
            atk: p.atk, def: p.def, maxHp: p.maxHp, critRate: Math.floor((p.critRate||0)*100),
            dodgeRate: Math.floor((p.dodgeRate||0)*100), dmgMulti: (p.dmgMulti||1).toFixed(2),
            gold: p.gold, diamonds: p.diamonds || 0,
            faction: p.faction ? FACTIONS[p.faction]?.name : '없음',
            factionRep: p.factionRep || 0,
            titles: (p.titles || []).length, activeTitle: p.activeTitle,
            equipped: equippedList,
            kills: p.killCount || 0, pvpWins: p.pvpWins || 0,
            towerHighest: p.towerHighest || 0,
            bestiary: Object.keys(p.bestiary || {}).length,
            exploration: (p.discoveredZones || []).length,
            fishingLevel: p.fishingLevel || 1,
        });
    });

    // ── 다른 플레이어 조회 ──
    socket.on('inspect_player', (targetId) => {
        const target = players[targetId];
        if (!target || target.isBot) return;
        const equippedList = [];
        if (target.equipped) {
            for (const [slot, eqId] of Object.entries(target.equipped)) {
                if (!eqId) continue;
                const eq = EQUIP_STATS[eqId];
                equippedList.push({ slot, name: eq?.name || eqId, grade: eq?.grade, enchant: target.enchantLevels?.[eqId] || 0 });
            }
        }
        socket.emit('inspect_data', {
            name: target.displayName, class: target.advancedClass || target.className,
            level: target.level, prestige: target.prestigeLevel || 0,
            faction: target.faction ? FACTIONS[target.faction]?.name : null,
            team: target.team, kills: target.killCount || 0,
            equipped: equippedList,
        });
    });

    // ── 월드 이벤트 로그 ──
    socket.on('get_world_events', () => {
        socket.emit('world_events', worldEventLog.slice(-20).reverse().map(e => ({
            time: Math.floor((Date.now() - e.time) / 60000), msg: e.msg, type: e.type
        })));
    });

    // ── 스킬 쿨타임 실시간 ──
    socket.on('get_skill_cooldowns', () => {
        const p = players[playerId];
        if (!p) return;
        const cls = p.baseClassName || p.className;
        const skills = SKILLS[cls] || [];
        const cds = skills.filter(s => s.type !== 'passive').map(s => {
            const lastUsed = p.skillCooldowns?.[s.name] || 0;
            const remaining = Math.max(0, Math.ceil((s.cooldown * 1000 - (Date.now() - lastUsed)) / 1000));
            return { name: s.name, cooldown: s.cooldown, remaining, mpCost: s.mpCost || 0, ready: remaining === 0 };
        });
        socket.emit('skill_cooldowns', cds);
    });

    // ── 길드 채팅 ──
    socket.on('guild_chat', (msg) => {
        const p = players[playerId];
        if (!p || !p.clanName || typeof msg !== 'string' || msg.length > 100) return;
        const clan = clans[p.clanName];
        if (!clan) return;
        const cleanMsg = msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        for (const mid of clan.members) {
            io.to(mid).emit('guild_chat_msg', { sender: p.displayName, msg: cleanMsg });
        }
    });

    // ── 길드 온라인 멤버 ──
    socket.on('get_guild_members', () => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        const members = clan.members.map(mid => {
            const m = players[mid];
            return { id: mid, name: m?.displayName || '?', level: m?.level || 0, online: !!m?.isAlive, class: m?.advancedClass || m?.className || '?' };
        });
        socket.emit('guild_members', { name: p.clanName, level: clan.level, members });
    });

    // ── 랭킹 조회 ──
    socket.on('get_ranking', () => {
        updateRankings();
        socket.emit('ranking_data', rankings);
    });

    // ── 변신(Morph) 시스템 ──
    socket.on('morph', (morphType) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (!p.morphKills) p.morphKills = {};

        const MORPHS = {
            slime:    { need: 30,  bonus: { maxHp: 50, speed: 3 }, name: '슬라임 변신', duration: 120 },
            orc:      { need: 20,  bonus: { atk: 15, def: 10 }, name: '오크 변신', duration: 120 },
            darkknight:{ need: 15, bonus: { atk: 25, critRate: 0.1 }, name: '다크나이트 변신', duration: 90 },
            dragon:   { need: 5,   bonus: { atk: 40, maxHp: 200, def: 20 }, name: '드래곤 변신', duration: 60 },
        };

        const morph = MORPHS[morphType];
        if (!morph) return;
        if ((p.morphKills[morphType] || 0) < morph.need) {
            socket.emit('morph_result', { success: false, msg: `${morph.name} 필요 처치 수: ${p.morphKills[morphType]||0}/${morph.need}` });
            return;
        }

        p.morphKills[morphType] -= morph.need;
        p.activeMorph = morphType;
        if (morph.bonus.atk) p.atk += morph.bonus.atk;
        if (morph.bonus.def) p.def += morph.bonus.def;
        if (morph.bonus.maxHp) { p.maxHp += morph.bonus.maxHp; p.hp = p.maxHp; }
        if (morph.bonus.critRate) p.critRate += morph.bonus.critRate;
        if (morph.bonus.speed) p.speed = (CLASSES[p.className]?.speed || 10) + morph.bonus.speed;

        io.emit('server_msg', { msg: `${p.displayName}이(가) ${morph.name}!`, type: 'morph' });
        socket.emit('morph_result', { success: true, msg: `${morph.name} 활성화! (${morph.duration}초)` });
        io.emit('player_update', p);

        // 변신 해제 타이머
        setTimeout(() => {
            if (!players[playerId]) return;
            const pp = players[playerId];
            pp.activeMorph = null;
            recalcStats(pp);
            pp.hp = Math.min(pp.hp, pp.maxHp);
            io.emit('player_update', pp);
            io.to(playerId).emit('morph_result', { success: true, msg: '변신 해제됨' });
        }, morph.duration * 1000);
    });

    // ── 장비 강화 (+15까지, 기획서 기준) ──
    socket.on('enchant_item', (data) => {
        const p = players[playerId];
        if (!p) return;
        if (!p.equipped) p.equipped = {};

        const itemId = typeof data === 'string' ? data : data.itemId;
        const useProtect = typeof data === 'object' ? data.useProtect : false;

        const eq = EQUIP_STATS[itemId];
        if (!eq) { socket.emit('enchant_result', { success: false, msg: '강화 불가' }); return; }
        // 장착 중인 장비만 강화 가능
        const isEquipped = p.equipped && Object.values(p.equipped).includes(itemId);
        if (!isEquipped) { socket.emit('enchant_result', { success: false, msg: '장비를 먼저 착용하세요' }); return; }

        const gradeInfo = GRADE_INFO[eq.grade] || GRADE_INFO.normal;
        if (!p.enchantLevels) p.enchantLevels = {};
        const curLevel = p.enchantLevels[itemId] || 0;
        if (curLevel >= gradeInfo.maxEnchant) {
            socket.emit('enchant_result', { success: false, msg: `최대 강화(+${gradeInfo.maxEnchant})` });
            return;
        }

        // 강화 비용 (단계별 증가)
        const cost = curLevel < 3 ? (curLevel+1)*200 : curLevel < 7 ? (curLevel+1)*350 : curLevel < 10 ? (curLevel+1)*500 : (curLevel+1)*800;
        if (p.gold < cost) { socket.emit('enchant_result', { success: false, msg: `골드 부족 (${cost}G 필요)` }); return; }
        p.gold -= cost;

        // 보호 주문서 사용 체크
        let hasProtect = false;
        if (useProtect && p.inventory && p.inventory['protect_scroll'] > 0) {
            hasProtect = true;
            p.inventory['protect_scroll']--;
        }

        // 축복 주문서 보너스 체크
        let blessBonus = 0;
        if (p.inventory && p.inventory['bless_scroll'] > 0) {
            blessBonus = 10;
            p.inventory['bless_scroll']--;
        }

        // 성공 확률 (기획서 기준: +1~3: 100%, +4~7: 80%, +8~10: 50%, +11~15: 30%)
        const rates = [100,100,100,80,80,80,80,50,50,50,30,30,30,30,30]; // +1~+15
        const rate = Math.min(100, (rates[curLevel] || 30) + blessBonus);
        const roll = Math.random() * 100;

        if (roll < rate) {
            // 잭팟 판정: 1% 기적 (MAX) / 5% 대성공 (+2)
            const jackpotRoll = Math.random();
            let enchantGain = 1;
            let jackpotMsg = '';
            if (jackpotRoll < 0.01 && curLevel < gradeInfo.maxEnchant - 1) {
                enchantGain = gradeInfo.maxEnchant - curLevel; // MAX까지
                jackpotMsg = '기적!';
                io.emit('server_msg', { msg: `[기적!] ${p.displayName}: ${eq.name} +${gradeInfo.maxEnchant} 달성!!! 🌟`, type: 'boss' });
            } else if (jackpotRoll < 0.06 && curLevel + 2 <= gradeInfo.maxEnchant) {
                enchantGain = 2;
                jackpotMsg = '대성공!';
            }
            p.enchantLevels[itemId] = Math.min(gradeInfo.maxEnchant, curLevel + enchantGain);
            recalcStats(p);
            const newLevel = p.enchantLevels[itemId];
            const announce = newLevel >= 10 ? 'rare' : newLevel >= 7 ? 'normal' : null;
            if (announce && !jackpotMsg) io.emit('server_msg', { msg: `${p.displayName}: ${eq.name} +${newLevel} 강화 성공!`, type: announce });
            socket.emit('enchant_result', { success: true, msg: `${jackpotMsg || ''} ${eq.name} +${newLevel} 성공!${enchantGain > 1 ? ' (+' + enchantGain + '!)' : ''} (${rate}%)`, jackpot: jackpotMsg || null });
        } else if (curLevel >= 10) {
            // +11 이상 실패 시 파괴 (보호 주문서로 방지 가능)
            if (hasProtect) {
                socket.emit('enchant_result', { success: false, msg: `강화 실패! 보호 주문서로 파괴 방지 (+${curLevel} 유지)` });
            } else {
                delete p.enchantLevels[itemId];
                if (p.equipped) {
                    for (const slot of EQUIPMENT_SLOTS) { if (p.equipped[slot] === itemId) delete p.equipped[slot]; }
                }
                if (p.inventory) delete p.inventory[itemId];
                recalcStats(p);
                io.emit('server_msg', { msg: `${p.displayName}: ${eq.name} +${curLevel+1} 강화 실패! 장비 파괴!`, type: 'danger' });
                socket.emit('enchant_result', { success: false, msg: `${eq.name} 파괴됨!!! (${rate}% 실패)` });
            }
        } else if (curLevel >= 7) {
            // +8~10 실패 시 -1 단계
            p.enchantLevels[itemId] = Math.max(0, curLevel - 1);
            recalcStats(p);
            socket.emit('enchant_result', { success: false, msg: `강화 실패 (${rate}%) — +${curLevel-1}로 하락` });
        } else {
            // +4~7 실패 시 등급 유지
            socket.emit('enchant_result', { success: false, msg: `강화 실패 (${rate}%) — 등급 유지` });
        }

        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 자동 물약 토글 ──
    socket.on('toggle_auto_potion', () => {
        const p = players[playerId];
        if (!p) return;
        p.autoPotion = !p.autoPotion;
        socket.emit('auto_potion_status', { enabled: p.autoPotion });
    });

    // ── 던전 입장 ──
    socket.on('enter_dungeon', (dungeonId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const dungeon = DUNGEONS[dungeonId];
        if (!dungeon) { socket.emit('dungeon_result', { msg: '존재하지 않는 던전' }); return; }
        if (p.level < dungeon.minLevel) { socket.emit('dungeon_result', { msg: `레벨 ${dungeon.minLevel} 이상 필요` }); return; }
        if (p.inDungeon) { socket.emit('dungeon_result', { msg: '이미 던전에 참가 중' }); return; }

        // 던전 인스턴스 생성
        entityIdCounter++;
        const instanceId = 'dungeon_' + entityIdCounter;
        activeDungeons[instanceId] = {
            dungeonId, players: [playerId], currentStage: 0,
            monstersLeft: dungeon.monsters[0].count,
            startTime: Date.now(), totalStages: dungeon.stages,
        };
        p.inDungeon = instanceId;
        socket.emit('dungeon_enter', {
            instanceId, name: dungeon.name, stage: 1, totalStages: dungeon.stages,
            monstersLeft: dungeon.monsters[0].count, tier: dungeon.monsters[0].tier
        });
        io.emit('server_msg', { msg: `${p.displayName}이(가) ${dungeon.name}에 입장!`, type: 'normal' });
    });

    // ── 던전 몬스터 처치 보고 ──
    socket.on('dungeon_kill', () => {
        const p = players[playerId];
        if (!p || !p.inDungeon) return;
        const inst = activeDungeons[p.inDungeon];
        if (!inst) return;
        inst.monstersLeft--;
        if (inst.monstersLeft <= 0) {
            inst.currentStage++;
            const dungeon = DUNGEONS[inst.dungeonId];
            if (inst.currentStage >= dungeon.stages) {
                // 던전 클리어
                const rewards = dungeon.rewards;
                for (const pid of inst.players) {
                    const pp = players[pid];
                    if (!pp) continue;
                    pp.gold += rewards.gold;
                    giveExp(pp, rewards.exp);
                    if (!pp.inventory) pp.inventory = {};
                    const dropItem = rewards.drops[Math.floor(Math.random() * rewards.drops.length)];
                    if (Math.random() < 0.3) {
                        pp.inventory[dropItem] = (pp.inventory[dropItem]||0) + 1;
                        const eName = EQUIP_STATS[dropItem]?.name || dropItem;
                        io.to(pid).emit('combat_log', { msg: `던전 보상: ${eName} 획득!` });
                    }
                    pp.inDungeon = null;
                    io.to(pid).emit('dungeon_clear', { name: dungeon.name, gold: rewards.gold, exp: rewards.exp });
                    io.emit('player_update', pp);
                }
                io.emit('server_msg', { msg: `${dungeon.name} 클리어!`, type: 'rare' });
                delete activeDungeons[p.inDungeon];
            } else {
                // 다음 스테이지
                const nextMonsters = dungeon.monsters[inst.currentStage];
                inst.monstersLeft = nextMonsters.count;
                for (const pid of inst.players) {
                    io.to(pid).emit('dungeon_stage', {
                        stage: inst.currentStage + 1, totalStages: dungeon.stages,
                        monstersLeft: nextMonsters.count, tier: nextMonsters.tier
                    });
                }
            }
        } else {
            socket.emit('dungeon_update', { monstersLeft: inst.monstersLeft });
        }
    });

    // ── 스탯 포인트 배분 ──
    socket.on('add_stat', (stat) => {
        const p = players[playerId];
        if (!p || (p.statPoints || 0) <= 0) return;
        if (!['str','dex','int','con'].includes(stat)) return;
        p.statPoints--;
        const key = 'bonus' + stat.charAt(0).toUpperCase() + stat.slice(1);
        p[key] = (p[key] || 0) + 1;
        recalcStats(p);
        if (p.hp > p.maxHp) p.hp = p.maxHp;
        savePlayer(p);
        socket.emit('stat_result', { success: true, statPoints: p.statPoints, str: p.bonusStr||0, dex: p.bonusDex||0, int: p.bonusInt||0, con: p.bonusCon||0 });
        io.emit('player_update', p);
    });

    // ── 스탯 리셋 ──
    socket.on('reset_stats', () => {
        const p = players[playerId];
        if (!p) return;
        const cost = 500 + p.level * 100;
        if (p.gold < cost) { socket.emit('stat_result', { success: false, msg: `골드 부족 (${cost}G 필요)` }); return; }
        p.gold -= cost;
        // 스탯 포인트 반환
        const totalUsed = (p.bonusStr||0) + (p.bonusDex||0) + (p.bonusInt||0) + (p.bonusCon||0);
        p.statPoints = (p.statPoints || 0) + totalUsed;
        p.bonusStr = 0; p.bonusDex = 0; p.bonusInt = 0; p.bonusCon = 0;
        recalcStats(p);
        savePlayer(p);
        socket.emit('stat_result', { success: true, msg: `스탯 초기화! (${totalUsed}포인트 반환, -${cost}G)`, statPoints: p.statPoints, str:0, dex:0, int:0, con:0 });
        io.emit('player_update', p);
    });

    // ── 무한의 탑: 입장 ──
    socket.on('tower_enter', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (p.level < 10) { socket.emit('tower_result', { msg: 'Lv.10 이상 필요' }); return; }
        if (towerProgress[playerId]) { socket.emit('tower_result', { msg: '이미 탑 도전 중' }); return; }
        const startFloor = (p.towerHighest || 0) + 1;
        if (startFloor > INFINITE_TOWER.maxFloor) { socket.emit('tower_result', { msg: '100층 완전 클리어!' }); return; }
        const monsters = INFINITE_TOWER.getMonsters(startFloor);
        towerProgress[playerId] = { currentFloor: startFloor, monstersLeft: monsters.count, startTime: Date.now() };
        socket.emit('tower_enter', { floor: startFloor, maxFloor: INFINITE_TOWER.maxFloor, monstersLeft: monsters.count, tier: monsters.tier, monsterHp: monsters.hp });
    });

    // ── 무한의 탑: 몬스터 처치 ──
    socket.on('tower_kill', () => {
        const p = players[playerId];
        if (!p || !towerProgress[playerId]) return;
        const tp = towerProgress[playerId];
        tp.monstersLeft--;

        if (tp.monstersLeft <= 0) {
            // 층 클리어
            const reward = INFINITE_TOWER.getReward(tp.currentFloor);
            p.gold += reward.gold;
            giveExp(p, reward.exp);
            if (reward.diamonds > 0) p.diamonds = (p.diamonds||0) + reward.diamonds;
            if (!p.inventory) p.inventory = {};
            for (const d of reward.drops) {
                p.inventory[d] = (p.inventory[d]||0) + 1;
                const eName = EQUIP_STATS[d]?.name || d;
                socket.emit('combat_log', { msg: `탑 ${tp.currentFloor}층 보상: ${eName}` });
            }
            p.towerHighest = Math.max(p.towerHighest || 0, tp.currentFloor);
            socket.emit('tower_clear', { floor: tp.currentFloor, reward });

            // 다음 층
            const nextFloor = tp.currentFloor + 1;
            if (nextFloor > INFINITE_TOWER.maxFloor) {
                socket.emit('tower_result', { msg: `무한의 탑 완전 클리어! (${tp.currentFloor}층)` });
                io.emit('server_msg', { msg: `${p.displayName}이(가) 무한의 탑 ${tp.currentFloor}층 클리어!`, type: 'rare' });
                delete towerProgress[playerId];
            } else {
                const nextMonsters = INFINITE_TOWER.getMonsters(nextFloor);
                tp.currentFloor = nextFloor;
                tp.monstersLeft = nextMonsters.count;
                socket.emit('tower_stage', { floor: nextFloor, monstersLeft: nextMonsters.count, tier: nextMonsters.tier, monsterHp: nextMonsters.hp });
            }
            if (tp.currentFloor % 10 === 0) {
                io.emit('server_msg', { msg: `${p.displayName}이(가) 무한의 탑 ${tp.currentFloor}층 돌파!`, type: 'normal' });
            }
            savePlayer(p);
            io.emit('player_update', p);
        } else {
            socket.emit('tower_update', { monstersLeft: tp.monstersLeft });
        }
    });

    // ── 무한의 탑: 포기 ──
    socket.on('tower_leave', () => {
        if (towerProgress[playerId]) {
            socket.emit('tower_result', { msg: `${towerProgress[playerId].currentFloor}층에서 포기` });
            delete towerProgress[playerId];
        }
    });

    // ── 희귀 상자 오픈 ──
    socket.on('open_rare_box', () => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory['rare_box']) { socket.emit('box_result', { msg: '상자 없음' }); return; }
        p.inventory['rare_box']--;
        if (p.inventory['rare_box'] <= 0) delete p.inventory['rare_box'];

        // 랜덤 보상
        const roll = Math.random();
        let rewardMsg = '';
        if (roll < 0.02) {
            // 전설 장비 2%
            const items = ['equip_sword_5','equip_armor_5'];
            const item = items[Math.floor(Math.random() * items.length)];
            p.inventory[item] = (p.inventory[item]||0) + 1;
            rewardMsg = (EQUIP_STATS[item]?.name || item) + ' (전설!)';
            io.emit('server_msg', { msg: `${p.displayName}이(가) 희귀 상자에서 ${rewardMsg} 획득!`, type: 'rare' });
        } else if (roll < 0.10) {
            // 영웅 장비 8%
            const items = ['equip_sword_4','equip_armor_4','equip_ring_3','equip_neck_3'];
            const item = items[Math.floor(Math.random() * items.length)];
            p.inventory[item] = (p.inventory[item]||0) + 1;
            rewardMsg = (EQUIP_STATS[item]?.name || item) + ' (영웅)';
        } else if (roll < 0.35) {
            // 희귀 장비 25%
            const items = ['equip_sword_3','equip_armor_3','equip_helm_3','equip_glove_3','equip_boots_3','equip_ring_2','equip_neck_2'];
            const item = items[Math.floor(Math.random() * items.length)];
            p.inventory[item] = (p.inventory[item]||0) + 1;
            rewardMsg = (EQUIP_STATS[item]?.name || item) + ' (희귀)';
        } else if (roll < 0.60) {
            // 재료 25%
            p.inventory['mat_dragon'] = (p.inventory['mat_dragon']||0) + 2;
            p.inventory['mat_soul'] = (p.inventory['mat_soul']||0) + 5;
            rewardMsg = '드래곤 비늘 x2, 영혼석 x5';
        } else {
            // 골드/다이아 40%
            const gold = 1000 + Math.floor(Math.random() * 4000);
            const dia = 20 + Math.floor(Math.random() * 30);
            p.gold += gold;
            p.diamonds = (p.diamonds||0) + dia;
            rewardMsg = `${gold}G + ${dia}D`;
        }
        socket.emit('box_result', { msg: `희귀 상자 오픈! ${rewardMsg}` });
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 친구 추가 요청 ──
    socket.on('friend_request', (targetId) => {
        const p = players[playerId];
        if (!p || !players[targetId] || players[targetId].isBot) return;
        if (targetId === playerId) return;
        if (!friendLists[playerId]) friendLists[playerId] = [];
        if (friendLists[playerId].includes(targetId)) { socket.emit('friend_result', { msg: '이미 친구입니다' }); return; }
        if (friendLists[playerId].length >= 50) { socket.emit('friend_result', { msg: '친구 최대 50명' }); return; }

        if (!friendRequests[targetId]) friendRequests[targetId] = [];
        friendRequests[targetId].push({ fromId: playerId, fromName: p.displayName, time: Date.now() });
        io.to(targetId).emit('friend_request_received', { fromId: playerId, fromName: p.displayName });
        socket.emit('friend_result', { msg: `${players[targetId].displayName}에게 친구 요청 전송` });
    });

    // ── 친구 요청 수락 ──
    socket.on('friend_accept', (fromId) => {
        const p = players[playerId];
        if (!p) return;
        if (!friendRequests[playerId]) return;
        const reqIdx = friendRequests[playerId].findIndex(r => r.fromId === fromId);
        if (reqIdx === -1) return;
        friendRequests[playerId].splice(reqIdx, 1);

        if (!friendLists[playerId]) friendLists[playerId] = [];
        if (!friendLists[fromId]) friendLists[fromId] = [];
        friendLists[playerId].push(fromId);
        friendLists[fromId].push(playerId);

        socket.emit('friend_result', { msg: `${players[fromId]?.displayName || '?'}와 친구가 되었습니다!` });
        io.to(fromId).emit('friend_result', { msg: `${p.displayName}와 친구가 되었습니다!` });
    });

    // ── 친구 삭제 ──
    socket.on('friend_remove', (targetId) => {
        if (!friendLists[playerId]) return;
        friendLists[playerId] = friendLists[playerId].filter(f => f !== targetId);
        if (friendLists[targetId]) friendLists[targetId] = friendLists[targetId].filter(f => f !== playerId);
        socket.emit('friend_result', { msg: '친구 삭제 완료' });
    });

    // ── 친구 목록 ──
    socket.on('get_friends', () => {
        const list = (friendLists[playerId] || []).map(fid => ({
            id: fid, name: players[fid]?.displayName || '?',
            level: players[fid]?.level || 0, className: players[fid]?.className || '?',
            online: !!players[fid]?.isAlive,
        }));
        const requests = (friendRequests[playerId] || []).map(r => ({ fromId: r.fromId, fromName: r.fromName }));
        socket.emit('friend_list', { friends: list, requests });
    });

    // ── 귓속말 (1:1 메시지) ──
    socket.on('whisper', (data) => {
        const p = players[playerId];
        if (!p || typeof data.targetId !== 'string' || typeof data.msg !== 'string') return;
        const target = players[data.targetId];
        if (!target || target.isBot) { socket.emit('whisper_result', { msg: '상대를 찾을 수 없습니다' }); return; }
        if (data.msg.length > 100) return;
        const safeMsg = data.msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        io.to(data.targetId).emit('whisper_received', { fromId: playerId, fromName: p.displayName, msg: safeMsg });
        socket.emit('whisper_sent', { toName: target.displayName, msg: safeMsg });
    });

    // ── 우편 거래 (아이템/골드 전송) ──
    socket.on('mail_send', (data) => {
        const p = players[playerId];
        if (!p || p.level < 15) { socket.emit('mail_result', { msg: 'Lv.15 이상 필요' }); return; }
        const { targetName, itemId, itemCount, gold } = data;

        // 수신자 찾기
        let targetId = null;
        for (const [pid, pl] of Object.entries(players)) {
            if (!pl.isBot && pl.displayName === targetName) { targetId = pid; break; }
        }
        if (!targetId) { socket.emit('mail_result', { msg: '존재하지 않는 플레이어' }); return; }
        if (targetId === playerId) { socket.emit('mail_result', { msg: '자신에게 보낼 수 없음' }); return; }
        const target = players[targetId];
        if (!target) { socket.emit('mail_result', { msg: '상대 오프라인' }); return; }

        // 우편 비용 50G
        const mailCost = 50 + (gold > 0 ? Math.floor(gold * 0.01) : 0); // 골드 전송 시 1% 수수료
        if (p.gold < mailCost) { socket.emit('mail_result', { msg: `우편 비용 ${mailCost}G 부족` }); return; }
        p.gold -= mailCost;

        // 아이템 전송
        if (itemId && itemCount > 0) {
            if (!p.inventory || !p.inventory[itemId] || p.inventory[itemId] < itemCount) {
                socket.emit('mail_result', { msg: '아이템 부족' }); return;
            }
            // 귀속 아이템 체크
            const eq = EQUIP_STATS[itemId];
            if (eq && eq.bound) { socket.emit('mail_result', { msg: '귀속 아이템은 거래 불가' }); return; }

            p.inventory[itemId] -= itemCount;
            if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
            if (!target.inventory) target.inventory = {};
            target.inventory[itemId] = (target.inventory[itemId] || 0) + itemCount;
            const iName = TRADEABLE_ITEMS[itemId]?.name || EQUIP_STATS[itemId]?.name || itemId;
            io.to(targetId).emit('mail_received', { from: p.displayName, item: iName, count: itemCount });
            socket.emit('mail_result', { msg: `${target.displayName}에게 ${iName} x${itemCount} 전송 완료!` });
        }

        // 골드 전송
        if (gold && gold > 0) {
            if (p.gold < gold) { socket.emit('mail_result', { msg: '골드 부족' }); return; }
            p.gold -= gold;
            target.gold += gold;
            io.to(targetId).emit('mail_received', { from: p.displayName, gold });
            socket.emit('mail_result', { msg: `${target.displayName}에게 ${gold}G 전송 완료!` });
        }

        savePlayer(p); savePlayer(target);
        io.emit('player_update', p); io.emit('player_update', target);
    });

    // ── 전직 (Lv.20) ──
    // ── 전직 선택지 요청 ──
    socket.on('get_advance_options', () => {
        const p = players[playerId];
        if (!p || p.isAdvanced || p.level < 20) return;
        const options = CLASS_ADVANCE[p.className];
        if (!options) return;
        socket.emit('advance_options', options.map((o, i) => ({ idx: i, name: o.displayName, desc: o.desc,
            stats: `ATK+${o.bonusAtk||0} DEF+${o.bonusDef||0} HP+${o.bonusHp||0} CRIT+${Math.floor((o.bonusCrit||0)*100)}% 회피+${Math.floor((o.bonusDodge||0)*100)}%`
        })));
    });

    // ── 전직 (분기 선택) ──
    socket.on('class_advance', (choiceIdx) => {
        const p = players[playerId];
        if (!p || p.isAdvanced || p.level < 20) {
            socket.emit('advance_result', { success: false, msg: p?.isAdvanced ? '이미 전직함' : 'Lv.20 필요' });
            return;
        }
        const options = CLASS_ADVANCE[p.className];
        if (!options) { socket.emit('advance_result', { success: false, msg: '전직 불가' }); return; }
        const idx = parseInt(choiceIdx) || 0;
        const adv = options[Math.min(idx, options.length - 1)];
        if (!adv) return;
        p.isAdvanced = true;
        p.baseClassName = p.className;
        p.advancedClass = adv.name;
        p.displayName = adv.displayName;
        // 보너스 스탯은 recalcStats에서 처리할 수 있도록 저장
        p.advanceBonus = { atk: adv.bonusAtk||0, def: adv.bonusDef||0, hp: adv.bonusHp||0, crit: adv.bonusCrit||0, dodge: adv.bonusDodge||0, speed: adv.bonusSpeed||0 };
        recalcStats(p);
        p.hp = p.maxHp;
        savePlayer(p);
        io.emit('server_msg', { msg: `${p.displayName} 전직! [${adv.displayName}]`, type: 'rare' });
        socket.emit('advance_result', { success: true, msg: `${adv.displayName}(으)로 전직 완료! — ${adv.desc}` });
        io.emit('player_update', p);
    });

    // ── 혈맹(클랜) 생성 ──
    socket.on('create_clan', (clanName) => {
        const p = players[playerId];
        if (!p || p.level < 10) { socket.emit('clan_result', { success: false, msg: 'Lv.10 이상 필요' }); return; }
        if (p.clanName) { socket.emit('clan_result', { success: false, msg: '이미 혈맹 가입 중' }); return; }
        if (typeof clanName !== 'string' || clanName.length < 2 || clanName.length > 12) { socket.emit('clan_result', { success: false, msg: '이름 2~12자' }); return; }
        if (clans[clanName]) { socket.emit('clan_result', { success: false, msg: '이미 존재하는 혈맹' }); return; }
        if (p.gold < 5000) { socket.emit('clan_result', { success: false, msg: '5000G 필요' }); return; }

        p.gold -= 5000;
        p.clanName = clanName;
        clans[clanName] = { leader: playerId, officers:[], members: [playerId], level: 1, exp: 0, storage: {}, war: null, dungeonCooldown: 0 };
        savePlayer(p);
        io.emit('server_msg', { msg: `혈맹 [${clanName}] 창설! 군주: ${p.displayName}`, type: 'rare' });
        socket.emit('clan_result', { success: true, msg: `혈맹 [${clanName}] 창설 완료!` });
    });

    // ── 혈맹 가입 ──
    socket.on('join_clan', (clanName) => {
        const p = players[playerId];
        if (!p || p.clanName) return;
        if (!clans[clanName]) { socket.emit('clan_result', { success: false, msg: '존재하지 않는 혈맹' }); return; }
        const maxMembers = CLAN_MAX_MEMBERS[clans[clanName].level] || 10;
        if (clans[clanName].members.length >= maxMembers) { socket.emit('clan_result', { success: false, msg: `혈맹 정원 초과 (${maxMembers}명)` }); return; }
        p.clanName = clanName;
        clans[clanName].members.push(playerId);
        savePlayer(p);
        socket.emit('clan_result', { success: true, msg: `혈맹 [${clanName}] 가입!` });
    });

    // ── 혈맹 목록 ──
    socket.on('get_clans', () => {
        const list = Object.entries(clans).map(([name, c]) => ({
            name, memberCount: c.members.length, level: c.level, exp: c.exp,
            maxMembers: CLAN_MAX_MEMBERS[c.level] || 10,
            leader: players[c.leader]?.displayName || '?',
            skills: Object.keys(CLAN_SKILLS).filter(lv => c.level >= lv).map(lv => CLAN_SKILLS[lv].name),
        }));
        socket.emit('clan_list', list);
    });

    // ── 혈맹 경험치 기부 (몬스터 사냥 시 자동 + 수동 기부) ──
    socket.on('clan_donate', (amount) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const gold = Math.min(Math.max(0, Math.floor(amount)), p.gold);
        if (gold <= 0) return;
        p.gold -= gold;
        const clan = clans[p.clanName];
        clan.exp += Math.floor(gold / 10);

        // 레벨업 체크
        const nextLevelExp = CLAN_LEVEL_EXP[clan.level] || 99999;
        if (clan.exp >= nextLevelExp && clan.level < 5) {
            clan.exp -= nextLevelExp;
            clan.level++;
            const newSkill = CLAN_SKILLS[clan.level];
            io.emit('server_msg', { msg: `혈맹 [${p.clanName}] 레벨 ${clan.level} 달성! ${newSkill ? newSkill.name + ' 해금!' : ''}`, type: 'rare' });
        }
        socket.emit('clan_result', { success: true, msg: `${gold}G 기부 완료! (혈맹 EXP +${Math.floor(gold/10)})` });
    });

    // ── 혈맹 창고 (아이템 넣기/빼기) ──
    socket.on('clan_storage_deposit', (data) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const { itemId, count } = data;
        if (!p.inventory || !p.inventory[itemId] || p.inventory[itemId] < count) return;
        p.inventory[itemId] -= count;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
        const storage = clans[p.clanName].storage;
        storage[itemId] = (storage[itemId] || 0) + count;
        socket.emit('clan_result', { success: true, msg: `창고에 ${itemId} x${count} 보관` });
    });

    socket.on('clan_storage_withdraw', (data) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const { itemId, count } = data;
        const storage = clans[p.clanName].storage;
        if (!storage[itemId] || storage[itemId] < count) return;
        storage[itemId] -= count;
        if (storage[itemId] <= 0) delete storage[itemId];
        if (!p.inventory) p.inventory = {};
        p.inventory[itemId] = (p.inventory[itemId] || 0) + count;
        socket.emit('clan_result', { success: true, msg: `창고에서 ${itemId} x${count} 인출` });
    });

    // ── 혈맹 전쟁 선포 ──
    socket.on('clan_war_declare', (targetClanName) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        if (clan.leader !== playerId) { socket.emit('clan_result', { success: false, msg: '군주만 선포 가능' }); return; }
        if (!clans[targetClanName]) { socket.emit('clan_result', { success: false, msg: '존재하지 않는 혈맹' }); return; }
        if (clan.level < 3) { socket.emit('clan_result', { success: false, msg: '혈맹 Lv.3 이상 필요' }); return; }
        if (clan.war) { socket.emit('clan_result', { success: false, msg: '이미 전쟁 중' }); return; }

        clan.war = { target: targetClanName, startTime: Date.now(), endTime: Date.now() + 86400000, kills: 0 };
        clans[targetClanName].war = { target: p.clanName, startTime: Date.now(), endTime: Date.now() + 86400000, kills: 0 };
        io.emit('server_msg', { msg: `[혈맹 전쟁] ${p.clanName} vs ${targetClanName} 전쟁 시작! (24시간)`, type: 'boss' });
        socket.emit('clan_result', { success: true, msg: `${targetClanName}에 전쟁 선포!` });
    });

    // ── 혈맹 직위 변경 ──
    socket.on('clan_promote', (data) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        const { targetId, rank } = data;
        if (clan.leader !== playerId && !clan.officers.includes(playerId)) return;
        if (rank === 'officer' && clan.leader === playerId) {
            if (!clan.officers.includes(targetId)) clan.officers.push(targetId);
            socket.emit('clan_result', { success: true, msg: '간부 임명 완료' });
        }
    });

    // ── 혈맹 탈퇴 ──
    socket.on('clan_leave', () => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        if (clan.leader === playerId) {
            // 군주가 탈퇴하면 혈맹 해산
            for (const mid of clan.members) {
                if (players[mid]) { players[mid].clanName = null; io.to(mid).emit('clan_result', { success:true, msg:'혈맹 해산됨' }); }
            }
            delete clans[p.clanName];
        } else {
            clan.members = clan.members.filter(m => m !== playerId);
            clan.officers = (clan.officers || []).filter(o => o !== playerId);
        }
        p.clanName = null;
        savePlayer(p);
        socket.emit('clan_result', { success: true, msg: '혈맹 탈퇴' });
    });

    // ── 혈맹 추방 ──
    socket.on('clan_kick', (targetId) => {
        const p = players[playerId];
        if (!p || !p.clanName || !clans[p.clanName]) return;
        const clan = clans[p.clanName];
        if (clan.leader !== playerId && !(clan.officers || []).includes(playerId)) return;
        if (targetId === clan.leader) return; // 군주는 추방 불가
        clan.members = clan.members.filter(m => m !== targetId);
        clan.officers = (clan.officers || []).filter(o => o !== targetId);
        if (players[targetId]) {
            players[targetId].clanName = null;
            io.to(targetId).emit('clan_result', { success: true, msg: '혈맹에서 추방당했습니다' });
        }
        socket.emit('clan_result', { success: true, msg: '멤버 추방 완료' });
    });

    // ── 경매장: 아이템 등록 ──
    socket.on('market_list_item', (data) => {
        const p = players[playerId];
        if (!p) return;
        const { itemId, price } = data;
        if (!itemId || !price || price <= 0) { socket.emit('market_result', { msg: '잘못된 입력' }); return; }
        if (!p.inventory || !p.inventory[itemId] || p.inventory[itemId] <= 0) {
            socket.emit('market_result', { msg: '아이템 없음' }); return;
        }
        // 귀속 아이템 거래 불가
        if (EQUIP_STATS[itemId]?.bound) { socket.emit('market_result', { msg: '귀속 아이템은 거래 불가' }); return; }
        // 동시 10개 제한
        const myListings = marketListings.filter(l => l.sellerId === playerId);
        if (myListings.length >= 10) { socket.emit('market_result', { msg: '최대 10개까지 등록 가능' }); return; }

        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];

        marketIdCounter++;
        const listing = {
            id: marketIdCounter, sellerId: playerId,
            sellerName: p.displayName, itemId, price: Math.floor(price),
            itemName: TRADEABLE_ITEMS[itemId]?.name || EQUIP_STATS[itemId]?.name || itemId,
            grade: EQUIP_STATS[itemId]?.grade || null,
            listedAt: Date.now(), expiresAt: Date.now() + 86400000, // 24시간
            bids: [], // 입찰 목록
        };
        marketListings.push(listing);
        socket.emit('market_result', { msg: `${listing.itemName} 등록 완료! (${price}G)` });
        savePlayer(p);
    });

    // ── 경매장: 즉시 구매 ──
    socket.on('market_buy', (listingId) => {
        const p = players[playerId];
        if (!p) return;
        const idx = marketListings.findIndex(l => l.id === listingId);
        if (idx === -1) { socket.emit('market_result', { msg: '매물 없음' }); return; }
        const listing = marketListings[idx];
        if (listing.sellerId === playerId) { socket.emit('market_result', { msg: '자기 매물 구매 불가' }); return; }
        if (p.gold < listing.price) { socket.emit('market_result', { msg: '골드 부족' }); return; }

        p.gold -= listing.price;
        if (!p.inventory) p.inventory = {};
        p.inventory[listing.itemId] = (p.inventory[listing.itemId] || 0) + 1;

        // 판매자에게 수수료 제외 골드 지급
        const sellerGold = Math.floor(listing.price * (1 - MARKET_FEE));
        const seller = players[listing.sellerId];
        if (seller) { seller.gold += sellerGold; savePlayer(seller); }

        marketListings.splice(idx, 1);
        socket.emit('market_result', { msg: `${listing.itemName} 구매 완료! (-${listing.price}G)` });
        io.emit('player_update', p);
        savePlayer(p);
    });

    // ── 경매장: 입찰 ──
    socket.on('market_bid', (data) => {
        const p = players[playerId];
        if (!p) return;
        const { listingId, bidAmount } = data;
        const listing = marketListings.find(l => l.id === listingId);
        if (!listing) { socket.emit('market_result', { msg: '매물 없음' }); return; }
        if (listing.sellerId === playerId) { socket.emit('market_result', { msg: '자기 매물 입찰 불가' }); return; }
        if (bidAmount <= 0 || p.gold < bidAmount) { socket.emit('market_result', { msg: '골드 부족' }); return; }

        const highestBid = listing.bids.length > 0 ? listing.bids[listing.bids.length - 1].amount : 0;
        if (bidAmount <= highestBid) { socket.emit('market_result', { msg: `현재 최고 입찰가(${highestBid}G)보다 높아야 함` }); return; }

        // 이전 입찰자에게 골드 반환
        if (listing.bids.length > 0) {
            const prevBid = listing.bids[listing.bids.length - 1];
            const prevBidder = players[prevBid.bidderId];
            if (prevBidder) { prevBidder.gold += prevBid.amount; io.emit('player_update', prevBidder); }
        }

        p.gold -= bidAmount;
        listing.bids.push({ bidderId: playerId, bidderName: p.displayName, amount: bidAmount });
        socket.emit('market_result', { msg: `${listing.itemName}에 ${bidAmount}G 입찰 완료!` });
        io.emit('player_update', p);
    });

    // ── 경매장: 목록 조회 ──
    socket.on('market_browse', (filter) => {
        const now = Date.now();
        // 만료된 매물 정리
        marketListings = marketListings.filter(l => {
            if (l.expiresAt && now > l.expiresAt) {
                // 입찰자가 있으면 낙찰 처리
                if (l.bids && l.bids.length > 0) {
                    const winBid = l.bids[l.bids.length - 1];
                    const winner = players[winBid.bidderId];
                    if (winner) {
                        if (!winner.inventory) winner.inventory = {};
                        winner.inventory[l.itemId] = (winner.inventory[l.itemId] || 0) + 1;
                        io.to(winBid.bidderId).emit('market_result', { msg: `${l.itemName} 낙찰! 경매장에서 획득` });
                    }
                    const seller = players[l.sellerId];
                    if (seller) {
                        seller.gold += Math.floor(winBid.amount * (1 - MARKET_FEE));
                        io.to(l.sellerId).emit('market_result', { msg: `${l.itemName} 낙찰 완료! +${Math.floor(winBid.amount * (1-MARKET_FEE))}G` });
                    }
                } else {
                    // 입찰 없이 만료 → 판매자에게 반환
                    const seller = players[l.sellerId];
                    if (seller) {
                        if (!seller.inventory) seller.inventory = {};
                        seller.inventory[l.itemId] = (seller.inventory[l.itemId] || 0) + 1;
                        io.to(l.sellerId).emit('market_result', { msg: `${l.itemName} 만료 반환` });
                    }
                }
                return false;
            }
            return true;
        });

        let filtered = marketListings;
        if (filter && filter.category) {
            filtered = filtered.filter(l => (TRADEABLE_ITEMS[l.itemId]?.category || '') === filter.category);
        }
        socket.emit('market_listings', filtered.map(l => ({
            id: l.id, itemId: l.itemId, itemName: l.itemName, price: l.price,
            grade: l.grade, sellerName: l.sellerName,
            highestBid: l.bids.length > 0 ? l.bids[l.bids.length - 1].amount : 0,
            timeLeft: Math.max(0, Math.floor((l.expiresAt - now) / 60000)),
        })));
    });

    // ── 경매장: 내 매물 취소 ──
    socket.on('market_cancel', (listingId) => {
        const p = players[playerId];
        if (!p) return;
        const idx = marketListings.findIndex(l => l.id === listingId && l.sellerId === playerId);
        if (idx === -1) { socket.emit('market_result', { msg: '매물 없음' }); return; }
        const listing = marketListings[idx];
        // 입찰자에게 골드 반환
        if (listing.bids && listing.bids.length > 0) {
            const lastBid = listing.bids[listing.bids.length - 1];
            const bidder = players[lastBid.bidderId];
            if (bidder) { bidder.gold += lastBid.amount; io.emit('player_update', bidder); }
        }
        // 아이템 반환
        if (!p.inventory) p.inventory = {};
        p.inventory[listing.itemId] = (p.inventory[listing.itemId] || 0) + 1;
        marketListings.splice(idx, 1);
        socket.emit('market_result', { msg: `${listing.itemName} 등록 취소` });
    });

    // ── 현상금 수락 ──
    socket.on('claim_bounty', (targetName) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const bounty = bountyBoard.find(b => b.targetName === targetName && !b.claimedBy);
        if (!bounty) { socket.emit('bounty_result', { msg: '이미 수락됨 또는 만료' }); return; }
        bounty.claimedBy = playerId;
        bounty.claimedAt = Date.now();
        p._activeBounty = bounty;
        socket.emit('bounty_result', { msg: `${bounty.targetName} 현상금 수락! 5분 내 처치하세요. 보상: ${bounty.reward}G + 50D` });
        // 5분 타이머
        setTimeout(() => {
            if (p._activeBounty === bounty && bounty.claimedBy === playerId) {
                p._activeBounty = null; bounty.claimedBy = null;
                socket.emit('bounty_result', { msg: '현상금 시간 초과! 실패' });
            }
        }, 300000);
    });

    // ── 현상금 목록 ──
    socket.on('get_bounties', () => {
        socket.emit('bounty_update', bountyBoard.map(b => ({ targetName: b.targetName, reward: b.reward, claimed: !!b.claimedBy })));
    });

    // ── 몬스터 도감 ──
    socket.on('get_bestiary', () => {
        const p = players[playerId];
        if (!p) return;
        const bestiary = p.bestiary || {};
        const totalTypes = Object.keys(ZONE_MONSTER_NAMES).reduce((sum, zId) => sum + Object.keys(ZONE_MONSTER_NAMES[zId]).length, 0);
        const discovered = Object.keys(bestiary).length;
        socket.emit('bestiary_data', { bestiary, discovered, total: totalTypes });
    });

    // ── 주사위 도박 ──
    socket.on('dice_challenge', (data) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const { targetId, bet } = data;
        const target = players[targetId];
        if (!target || target.isBot || !target.isAlive) { socket.emit('dice_result', { msg: '상대를 찾을 수 없음' }); return; }
        const zone = getZone(p.x, p.y);
        if (!zone || !ZONES[zone.id]?.safe) { socket.emit('dice_result', { msg: '마을에서만 가능' }); return; }
        const betAmount = Math.max(100, Math.min(10000, Math.floor(bet)));
        if (p.gold < betAmount || target.gold < betAmount) { socket.emit('dice_result', { msg: '골드 부족' }); return; }
        if (!p._diceCount) p._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 };
        if (p._diceCount.hour !== Math.floor(Date.now()/3600000)) { p._diceCount = { hour: Math.floor(Date.now()/3600000), count: 0 }; }
        if (p._diceCount.count >= 5) { socket.emit('dice_result', { msg: '시간당 5회 제한 초과' }); return; }
        p._diceCount.count++;

        const roll1 = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
        const roll2 = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
        const tax = Math.floor(betAmount * 0.05);
        let winner, loser;
        if (roll1 > roll2) { winner = p; loser = target; }
        else if (roll2 > roll1) { winner = target; loser = p; }
        else { // 동점
            socket.emit('dice_result', { msg: `동점! (${roll1} vs ${roll2}) 무승부`, roll1, roll2, tie: true });
            io.to(targetId).emit('dice_result', { msg: `동점! (${roll2} vs ${roll1}) 무승부`, roll1: roll2, roll2: roll1, tie: true });
            return;
        }
        loser.gold -= betAmount;
        winner.gold += betAmount - tax;
        const result = { roll1, roll2, bet: betAmount, winner: winner.displayName, tax };
        socket.emit('dice_result', { msg: `주사위: ${roll1} vs ${roll2} → ${winner.displayName} 승리!${winner===p ? ' +'+( betAmount-tax)+'G' : ' -'+betAmount+'G'}`, ...result });
        io.to(targetId).emit('dice_result', { msg: `주사위: ${roll2} vs ${roll1} → ${winner.displayName} 승리!${winner===target ? ' +'+(betAmount-tax)+'G' : ' -'+betAmount+'G'}`, ...result });
        if (betAmount >= 5000) io.emit('server_msg', { msg: `[도박] ${p.displayName} vs ${target.displayName} — ${betAmount}G 판돈! ${winner.displayName} 승리!`, type: 'rare' });
        io.emit('player_update', p); io.emit('player_update', target);
    });

    // ── 떠돌이 상인 구매 ──
    socket.on('rogue_buy', (dealIdx) => {
        const p = players[playerId];
        if (!p || !rogueMerchant) { socket.emit('rogue_result', { msg: '상인이 없습니다' }); return; }
        if (rogueMerchant.bought[dealIdx]) { socket.emit('rogue_result', { msg: '이미 판매됨' }); return; }
        const deal = rogueMerchant.deals[dealIdx];
        if (!deal) return;
        if (deal.currency === 'diamond' && (p.diamonds||0) < deal.price) { socket.emit('rogue_result', { msg: '다이아 부족' }); return; }
        if (deal.currency === 'gold' && p.gold < deal.price) { socket.emit('rogue_result', { msg: '골드 부족' }); return; }
        if (deal.currency === 'diamond') p.diamonds -= deal.price; else p.gold -= deal.price;
        rogueMerchant.bought[dealIdx] = playerId;
        if (!p.inventory) p.inventory = {};

        if (deal.type === 'equip') {
            p.inventory[deal.itemId] = (p.inventory[deal.itemId]||0) + 1;
            socket.emit('rogue_result', { msg: `${deal.name} 구매 완료!` });
        } else if (deal.type === 'material') {
            p.inventory[deal.itemId] = (p.inventory[deal.itemId]||0) + (deal.qty||1);
            socket.emit('rogue_result', { msg: `${deal.name} 구매 완료!` });
        } else if (deal.type === 'mystery') {
            const roll = Math.random();
            let item, grade;
            if (roll < 0.01) { item = 'equip_sword_5'; grade = '전설'; }
            else if (roll < 0.05) { item = 'equip_sword_4'; grade = '영웅'; }
            else if (roll < 0.15) { item = 'equip_sword_3'; grade = '희귀'; }
            else if (roll < 0.40) { item = 'equip_sword_2'; grade = '고급'; }
            else { item = 'pot_hp_s'; grade = '꽝'; }
            p.inventory[item] = (p.inventory[item]||0) + 1;
            const iName = EQUIP_STATS[item]?.name || item;
            socket.emit('rogue_result', { msg: `미스터리 박스 오픈! → ${iName} (${grade})` });
            if (grade === '전설' || grade === '영웅') io.emit('server_msg', { msg: `${p.displayName}이(가) 미스터리 박스에서 ${iName} 획득!`, type: 'rare' });
        }
        savePlayer(p); io.emit('player_update', p);
    });

    // ── 장비 합성 (같은 등급 3개 → 상위 1개) ──
    socket.on('fuse_equipment', (data) => {
        const p = players[playerId];
        if (!p) return;
        const { item1, item2, item3 } = data;
        if (!p.inventory) return;
        const items = [item1, item2, item3];
        // 3개 모두 보유 확인
        for (const it of items) {
            if (!p.inventory[it] || p.inventory[it] <= 0) { socket.emit('fuse_result', { msg: '재료 부족' }); return; }
        }
        // 같은 등급 확인
        const grades = items.map(it => EQUIP_STATS[it]?.grade);
        if (!grades[0] || grades[0] !== grades[1] || grades[1] !== grades[2]) { socket.emit('fuse_result', { msg: '같은 등급 장비 3개 필요' }); return; }
        const gradeOrder = ['normal','uncommon','rare','epic','legendary'];
        const curIdx = gradeOrder.indexOf(grades[0]);
        if (curIdx >= gradeOrder.length - 1) { socket.emit('fuse_result', { msg: '전설 등급은 합성 불가' }); return; }
        const nextGrade = gradeOrder[curIdx + 1];
        const fuseCosts = { normal:500, uncommon:2000, rare:5000, epic:15000 };
        const cost = fuseCosts[grades[0]] || 500;
        if (p.gold < cost) { socket.emit('fuse_result', { msg: `골드 부족 (${cost}G 필요)` }); return; }
        p.gold -= cost;
        // 재료 소모
        for (const it of items) { p.inventory[it]--; if (p.inventory[it] <= 0) delete p.inventory[it]; }
        // 결과: 상위 등급 랜덤 장비
        const candidates = Object.entries(EQUIP_STATS).filter(([id, eq]) => eq.grade === nextGrade);
        if (candidates.length === 0) { socket.emit('fuse_result', { msg: '합성 실패' }); return; }
        const [resultId, resultEq] = candidates[Math.floor(Math.random() * candidates.length)];
        p.inventory[resultId] = (p.inventory[resultId]||0) + 1;
        // 랜덤 옵션 생성
        const gi = GRADE_INFO[nextGrade];
        if (gi && gi.randomOpts > 0) {
            if (!p.equipOptions) p.equipOptions = {};
            p.equipOptions[resultId] = generateRandomOptions(gi.randomOpts);
        }
        savePlayer(p);
        socket.emit('fuse_result', { msg: `합성 성공! ${resultEq.name} (${GRADE_INFO[nextGrade].name}) 획득!` });
        if (nextGrade === 'epic' || nextGrade === 'legendary') io.emit('server_msg', { msg: `${p.displayName}이(가) 장비 합성으로 ${resultEq.name} 획득!`, type: 'rare' });
        io.emit('player_update', p);
    });

    // ── 옵션 리롤 (100 다이아) ──
    socket.on('reroll_options', (itemId) => {
        const p = players[playerId];
        if (!p) return;
        const eq = EQUIP_STATS[itemId];
        if (!eq) { socket.emit('reroll_result', { msg: '장비 없음' }); return; }
        if (!p.equipped || !Object.values(p.equipped).includes(itemId)) { socket.emit('reroll_result', { msg: '장착 중인 장비만 리롤 가능' }); return; }
        if ((p.diamonds||0) < 100) { socket.emit('reroll_result', { msg: '다이아 100개 필요' }); return; }
        p.diamonds -= 100;
        const gi = GRADE_INFO[eq.grade];
        if (!gi || gi.randomOpts <= 0) { socket.emit('reroll_result', { msg: '이 등급은 옵션 없음' }); return; }
        if (!p.equipOptions) p.equipOptions = {};
        const oldOpts = p.equipOptions[itemId] || [];
        p.equipOptions[itemId] = generateRandomOptions(gi.randomOpts);
        recalcStats(p);
        savePlayer(p);
        socket.emit('reroll_result', { msg: `옵션 리롤 완료! (-100D)`, oldOpts, newOpts: p.equipOptions[itemId] });
        io.emit('player_update', p);
    });

    // ══════════════════════════════════════
    // ══════════════════════════════════════
    // 낚시/이모트/출석캘린더/탐험도
    // ══════════════════════════════════════

    // ── 낚시 시작 ──
    socket.on('start_fishing', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const zone = getZone(p.x, p.y);
        if (!zone || zone.id !== 'fishing') { socket.emit('fish_result', { msg: '낚시 만에서만 가능!' }); return; }
        if (p._fishing) return;
        p._fishing = true;
        socket.emit('fish_cast', { msg: '낚싯대를 던졌습니다... 기다리세요...' });
        // 3~8초 후 물고기 입질
        const biteTime = 3000 + Math.random() * 5000;
        setTimeout(() => {
            if (!players[playerId] || !p._fishing) return;
            p._fishBite = Date.now();
            socket.emit('fish_bite', { msg: '입질이다! 빨리 낚아올려요!' });
            // 1.5초 안에 hook_fish 안 보내면 실패
            setTimeout(() => {
                if (p._fishBite) {
                    p._fishing = false; p._fishBite = null;
                    socket.emit('fish_result', { msg: '놓쳤다... 다시 시도하세요.' });
                }
            }, 1500);
        }, biteTime);
    });

    // ── 낚시 낚아올리기 ──
    socket.on('hook_fish', () => {
        const p = players[playerId];
        if (!p || !p._fishBite) return;
        p._fishing = false; p._fishBite = null;
        if (!p.fishingLevel) p.fishingLevel = 1;
        // 물고기 뽑기
        const eligible = FISH_TABLE.filter(f => p.fishingLevel >= f.minLevel);
        const totalWeight = eligible.reduce((s, f) => s + f.weight, 0);
        let roll = Math.random() * totalWeight;
        let caught = eligible[0];
        for (const f of eligible) {
            roll -= f.weight;
            if (roll <= 0) { caught = f; break; }
        }
        // 낚시 레벨업 (20마리마다)
        p._fishCount = (p._fishCount || 0) + 1;
        if (p._fishCount % 20 === 0 && p.fishingLevel < 50) {
            p.fishingLevel++;
            socket.emit('fish_result', { msg: `낚시 레벨 UP! Lv.${p.fishingLevel}` });
        }
        // 보상
        if (!p.inventory) p.inventory = {};
        p.inventory['goods_fish'] = (p.inventory['goods_fish'] || 0) + 1;
        p.gold += caught.sell;
        capResources(p);
        const gradeColors = {common:'#ccc',uncommon:'#4c4',rare:'#48f',epic:'#a4f',legendary:'#f80'};
        socket.emit('fish_result', { msg: `${caught.name} 낚음! (+${caught.sell}G)`, name: caught.name, grade: caught.grade, color: gradeColors[caught.grade] });
        if (caught.grade === 'epic' || caught.grade === 'legendary') {
            io.emit('server_msg', { msg: `[낚시] ${p.displayName}이(가) ${caught.name}을(를) 낚았다!`, type: 'rare' });
        }
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 이모트 ──
    socket.on('emote', (emoteId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const text = EMOTES[emoteId];
        if (!text) return;
        // 같은 존의 모든 플레이어에게 브로드캐스트
        io.emit('emote_show', { playerId, playerName: p.displayName, emote: text, x: p.x, y: p.y });
    });

    // ── 출석 캘린더 ──
    socket.on('get_attendance_calendar', () => {
        const p = players[playerId];
        if (!p) return;
        const streak = p.attendance?.streak || 0;
        const calendar = ATTENDANCE_REWARDS.map((r, i) => ({
            day: r.day, reward: r.reward,
            claimed: i < streak,
            today: i === streak,
        }));
        socket.emit('attendance_calendar', { calendar, streak });
    });

    // ── 탐험도 조회 ──
    socket.on('get_exploration', () => {
        const p = players[playerId];
        if (!p) return;
        const discovered = p.discoveredZones || [];
        const total = Object.keys(ZONES).length;
        socket.emit('exploration_data', { discovered, total, pct: Math.floor(discovered.length / total * 100) });
    });

    // 5대 신규 시스템 소켓 핸들러
    // ══════════════════════════════════════

    // ── 1. 시즌 균열 입장 ──
    socket.on('rift_enter', () => {
        const p = players[playerId];
        if (!p || !p.isAlive || p.level < 20) { socket.emit('rift_result', { msg: 'Lv.20 이상 필요' }); return; }
        const theme = currentSeason.theme;
        if (!p._riftDepth) p._riftDepth = 0;
        p._riftDepth++;
        const depth = p._riftDepth;
        const monsterHp = 500 + depth * 200;
        const monsterAtk = 20 + depth * 10;
        const reward = { gold: 200 + depth * 100, exp: 500 + depth * 200, diamonds: depth % 5 === 0 ? depth * 2 : 0 };

        socket.emit('rift_floor', { depth, theme: theme.name, color: theme.color, monsterHp, monsterAtk, reward });
        // 균열 리더보드 갱신
        currentSeason.leaderboard[playerId] = Math.max(currentSeason.leaderboard[playerId] || 0, depth);
        if (depth % 10 === 0) {
            io.emit('server_msg', { msg: `[균열] ${p.displayName}이(가) ${theme.name} ${depth}층 돌파!`, type: 'rare' });
        }
    });

    // ── 1b. 균열 몬스터 클리어 ──
    socket.on('rift_clear', () => {
        const p = players[playerId];
        if (!p || !p._riftDepth) return;
        const depth = p._riftDepth;
        const reward = { gold: 200 + depth * 100, exp: 500 + depth * 200, diamonds: depth % 5 === 0 ? depth * 2 : 0 };
        p.gold += reward.gold;
        if (reward.diamonds) p.diamonds = (p.diamonds||0) + reward.diamonds;
        giveExp(p, reward.exp);
        capResources(p);
        savePlayer(p);
        io.emit('player_update', p);
        socket.emit('rift_result', { msg: `균열 ${depth}층 클리어! +${reward.gold}G +${reward.exp}EXP${reward.diamonds ? ' +'+reward.diamonds+'D' : ''}` });
    });

    // ── 1c. 균열 리더보드 ──
    socket.on('get_rift_ranking', () => {
        const sorted = Object.entries(currentSeason.leaderboard)
            .sort((a,b) => b[1] - a[1]).slice(0, 20)
            .map(([pid, depth], i) => ({ rank: i+1, name: players[pid]?.displayName || '?', depth }));
        socket.emit('rift_ranking', { theme: currentSeason.theme.name, rankings: sorted });
    });

    // ── 2. 룬 장착 ──
    socket.on('inscribe_rune', (data) => {
        const p = players[playerId];
        if (!p) return;
        const { itemId, runeId } = data;
        if (!p.equipped || !Object.values(p.equipped).includes(itemId)) {
            socket.emit('rune_result', { msg: '장착 중인 장비만 룬 장착 가능' }); return;
        }
        if (!p.inventory?.[runeId] || p.inventory[runeId] <= 0) {
            socket.emit('rune_result', { msg: '룬 없음' }); return;
        }
        if (!RUNES[runeId]) { socket.emit('rune_result', { msg: '유효하지 않은 룬' }); return; }

        // 장비당 최대 3룬
        if (!p.itemRunes) p.itemRunes = {};
        if (!p.itemRunes[itemId]) p.itemRunes[itemId] = [];
        if (p.itemRunes[itemId].length >= 3) { socket.emit('rune_result', { msg: '슬롯 가득 (최대 3개)' }); return; }

        p.inventory[runeId]--;
        if (p.inventory[runeId] <= 0) delete p.inventory[runeId];
        p.itemRunes[itemId].push(runeId);

        // 룬 워드 체크
        const runes = p.itemRunes[itemId].sort().join('');
        const runeWord = RUNE_WORDS[runes];
        if (runeWord) {
            socket.emit('rune_result', { msg: `룬 워드 발동! "${runeWord.name}" — ${runeWord.desc}` });
            io.emit('server_msg', { msg: `[룬 워드] ${p.displayName}: "${runeWord.name}" 발동!`, type: 'rare' });
        } else {
            socket.emit('rune_result', { msg: `룬 ${runeId} 장착 완료 (${p.itemRunes[itemId].length}/3)` });
        }
        recalcStats(p);
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 3. 진영 가입 ──
    socket.on('faction_join', (factionId) => {
        const p = players[playerId];
        if (!p || p.level < 20) { socket.emit('faction_result', { msg: 'Lv.20 이상 필요' }); return; }
        if (p.faction) { socket.emit('faction_result', { msg: '이미 진영 가입 중: ' + FACTIONS[p.faction]?.name }); return; }
        if (!FACTIONS[factionId]) { socket.emit('faction_result', { msg: '유효하지 않은 진영' }); return; }
        p.faction = factionId;
        p.factionRep = 0;
        savePlayer(p);
        socket.emit('faction_result', { msg: `${FACTIONS[factionId].name}에 가입! 진영전에서 활약하세요.` });
        io.emit('server_msg', { msg: `${p.displayName}이(가) ${FACTIONS[factionId].name}에 합류!`, type: 'normal' });
    });

    // ── 3b. 진영 정보 ──
    socket.on('get_faction_info', () => {
        const p = players[playerId];
        const info = {};
        for (const [fId, f] of Object.entries(FACTIONS)) {
            const zoneCount = Object.keys(factionState[fId]?.zones || {}).length;
            info[fId] = { name: f.name, color: f.color, zones: zoneCount, kills: factionState[fId]?.kills || 0 };
        }
        socket.emit('faction_info', { factions: info, myFaction: p?.faction || null, myRep: p?.factionRep || 0 });
    });

    // ── 4. 프레스티지 (환생) ──
    socket.on('prestige', () => {
        const p = players[playerId];
        if (!p || p.level < 50) { socket.emit('prestige_result', { msg: 'Lv.50 이상 필요' }); return; }
        if (!p.prestigeLevel) p.prestigeLevel = 0;
        if (p.prestigeLevel >= 10) { socket.emit('prestige_result', { msg: '최대 환생 (10회)' }); return; }
        p.prestigeLevel++;
        const perkIdx = p.prestigeLevel - 1;
        const perk = LEGACY_PERKS[perkIdx];
        if (!p.legacyPerks) p.legacyPerks = [];
        p.legacyPerks.push(perk);

        // 레벨 리셋 (장비/인벤은 유지)
        p.level = 1; p.exp = 0;
        p.statPoints = 0; p.bonusStr = 0; p.bonusDex = 0; p.bonusInt = 0; p.bonusCon = 0;
        recalcStats(p);
        p.hp = p.maxHp;

        savePlayer(p);
        io.emit('server_msg', { msg: `[환생] ${p.displayName} ${p.prestigeLevel}차 환생! "${perk.name}" 획득!`, type: 'boss' });
        socket.emit('prestige_result', { msg: `${p.prestigeLevel}차 환생! "${perk.name}" — ${perk.desc}. 다시 Lv.1부터!`, perk });
        io.emit('player_update', p);
    });

    // ── 5. 의뢰 게시판 ──
    socket.on('contract_create', (data) => {
        const p = players[playerId];
        if (!p || p.level < 10) { socket.emit('contract_result', { msg: 'Lv.10 이상 필요' }); return; }
        const { type, target, reward } = data;
        if (!type || !reward || reward <= 0) return;
        const cost = Math.floor(reward * 1.1); // 10% 수수료
        if (p.gold < cost) { socket.emit('contract_result', { msg: `골드 부족 (${cost}G 필요 — 수수료 10%)` }); return; }
        p.gold -= cost;
        contractIdCounter++;
        const contract = {
            id: contractIdCounter, creatorId: playerId, creatorName: p.displayName,
            type, target: target || '', reward: Math.floor(reward),
            status: 'open', acceptedBy: null, expiresAt: Date.now() + 3600000, // 1시간
        };
        contractBoard.push(contract);
        savePlayer(p);
        socket.emit('contract_result', { msg: `의뢰 등록! "${type}" — ${reward}G 보상` });
        io.emit('server_msg', { msg: `[의뢰] ${p.displayName}의 새 의뢰: "${type}" (${reward}G)`, type: 'normal' });
    });

    socket.on('contract_accept', (contractId) => {
        const p = players[playerId];
        if (!p) return;
        const c = contractBoard.find(x => x.id === contractId && x.status === 'open');
        if (!c) { socket.emit('contract_result', { msg: '의뢰 없음 또는 마감' }); return; }
        if (c.creatorId === playerId) { socket.emit('contract_result', { msg: '자기 의뢰 수락 불가' }); return; }
        c.status = 'accepted';
        c.acceptedBy = playerId;
        socket.emit('contract_result', { msg: `의뢰 수락! "${c.type}" — 1시간 내 완료하세요.` });
        io.to(c.creatorId).emit('contract_result', { msg: `${p.displayName}이(가) 당신의 의뢰를 수락!` });
    });

    socket.on('contract_complete', (contractId) => {
        const p = players[playerId];
        if (!p) return;
        const c = contractBoard.find(x => x.id === contractId && x.acceptedBy === playerId && x.status === 'accepted');
        if (!c) { socket.emit('contract_result', { msg: '완료 불가' }); return; }
        c.status = 'completed';
        p.gold += c.reward;
        capResources(p);
        savePlayer(p);
        socket.emit('contract_result', { msg: `의뢰 완료! +${c.reward}G` });
        io.to(c.creatorId).emit('contract_result', { msg: `의뢰 "${c.type}" 완료됨!` });
        io.emit('player_update', p);
    });

    socket.on('get_contracts', () => {
        const now = Date.now();
        contractBoard = contractBoard.filter(c => now < c.expiresAt && c.status !== 'completed');
        socket.emit('contract_list', contractBoard.map(c => ({
            id: c.id, creator: c.creatorName, type: c.type, target: c.target,
            reward: c.reward, status: c.status, timeLeft: Math.floor((c.expiresAt - now)/60000),
        })));
    });

    // ── 아레나: 참가 신청 ──
    socket.on('arena_join', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        if (p.level < 10) { socket.emit('arena_result', { msg: 'Lv.10 이상 필요' }); return; }
        if ((p.arenaCountToday || 0) >= 10) { socket.emit('arena_result', { msg: '일일 아레나 10회 초과' }); return; }
        if (arenaQueue.includes(playerId)) { socket.emit('arena_result', { msg: '이미 대기 중' }); return; }
        // 이미 매치 중인지 체크
        for (const m of Object.values(arenaMatches)) {
            if (m.player1 === playerId || m.player2 === playerId) {
                socket.emit('arena_result', { msg: '이미 매치 진행 중' }); return;
            }
        }
        arenaQueue.push(playerId);
        socket.emit('arena_result', { msg: '아레나 대기열 참가! 상대 매칭 중...' });

        // 매칭 시도
        if (arenaQueue.length >= 2) {
            const p1Id = arenaQueue.shift();
            const p2Id = arenaQueue.shift();
            const p1 = players[p1Id], p2 = players[p2Id];
            if (!p1 || !p2 || !p1.isAlive || !p2.isAlive) return;

            arenaMatchIdCounter++;
            const matchId = 'arena_' + arenaMatchIdCounter;
            const arenaZone = ZONES.arena;
            // 양 플레이어를 아레나로 이동
            p1.x = arenaZone.x + 10; p1.y = arenaZone.y + arenaZone.h / 2;
            p2.x = arenaZone.x + arenaZone.w - 10; p2.y = arenaZone.y + arenaZone.h / 2;
            p1.hp = p1.maxHp; p2.hp = p2.maxHp; // HP 풀 회복

            arenaMatches[matchId] = { player1: p1Id, player2: p2Id, startTime: Date.now() };
            p1.arenaMatchId = matchId; p2.arenaMatchId = matchId;

            io.to(p1Id).emit('arena_start', { matchId, opponent: p2.displayName, opponentClass: p2.className });
            io.to(p2Id).emit('arena_start', { matchId, opponent: p1.displayName, opponentClass: p1.className });
            io.emit('server_msg', { msg: `[아레나] ${p1.displayName} vs ${p2.displayName} 대결 시작!`, type: 'normal' });

            // 3분 타임아웃
            setTimeout(() => {
                const match = arenaMatches[matchId];
                if (!match) return;
                const mp1 = players[match.player1], mp2 = players[match.player2];
                // 남은 HP 비율로 승자 결정
                const hp1Pct = mp1 ? mp1.hp / mp1.maxHp : 0;
                const hp2Pct = mp2 ? mp2.hp / mp2.maxHp : 0;
                const winnerId = hp1Pct >= hp2Pct ? match.player1 : match.player2;
                const loserId = winnerId === match.player1 ? match.player2 : match.player1;
                endArenaMatch(matchId, winnerId, loserId, '시간 초과 - HP 비율 판정');
            }, 180000);
        }
    });

    // ── 아레나: 대기열 취소 ──
    socket.on('arena_leave', () => {
        arenaQueue = arenaQueue.filter(id => id !== playerId);
        socket.emit('arena_result', { msg: '대기열 취소' });
    });

    // ── 아레나: 랭킹 조회 ──
    socket.on('arena_rankings', () => {
        const sorted = Object.entries(arenaRankings)
            .sort((a, b) => b[1].points - a[1].points)
            .slice(0, 20)
            .map(([pid, r], idx) => ({
                rank: idx + 1, name: players[pid]?.displayName || '?',
                className: players[pid]?.className || '?',
                wins: r.wins, losses: r.losses, points: r.points
            }));
        socket.emit('arena_ranking_list', sorted);
    });

    // ── 파티 생성 ──
    socket.on('create_party', () => {
        const p = players[playerId];
        if (!p || p.partyId) { socket.emit('party_result', { success: false, msg: '이미 파티 중' }); return; }
        partyIdCounter++;
        const pid = 'party_' + partyIdCounter;
        p.partyId = pid;
        parties[pid] = { leader: playerId, members: [playerId], name: p.displayName + '의 파티' };
        socket.emit('party_result', { success: true, msg: '파티 생성!' });
        socket.emit('party_info', parties[pid]);
    });

    // ── 파티 초대 (근처 플레이어 자동) ──
    socket.on('party_invite_nearby', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = parties[p.partyId];
        if (!party || party.leader !== playerId) return;
        if (party.members.length >= 5) { socket.emit('party_result', { success: false, msg: '파티 최대 5명' }); return; }

        for (const pid in players) {
            const target = players[pid];
            if (pid === playerId || target.isBot || target.partyId) continue;
            const dist = Math.hypot(p.x - target.x, p.y - target.y);
            if (dist < 10) {
                target.partyId = p.partyId;
                party.members.push(pid);
                io.to(pid).emit('party_result', { success: true, msg: `${p.displayName}의 파티에 합류!` });
                socket.emit('party_result', { success: true, msg: `${target.displayName} 파티 합류!` });
                // 파티원 모두에게 업데이트
                for (const mid of party.members) {
                    io.to(mid).emit('party_info', { ...party, memberNames: party.members.map(m => players[m]?.displayName || '?') });
                }
                break;
            }
        }
    });

    // ── 파티 탈퇴 ──
    socket.on('leave_party', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = parties[p.partyId];
        if (!party) { p.partyId = null; return; }

        party.members = party.members.filter(m => m !== playerId);

        if (party.members.length === 0) {
            delete parties[p.partyId];
        } else {
            // 리더가 떠나면 다음 사람이 리더
            if (party.leader === playerId) {
                party.leader = party.members[0];
                io.to(party.leader).emit('party_result', { success: true, msg: '파티장이 되었습니다!' });
            }
            for (const mid of party.members) {
                io.to(mid).emit('party_info', { ...party, memberNames: party.members.map(m => players[m]?.displayName || '?') });
            }
        }
        p.partyId = null;
        socket.emit('party_result', { success: true, msg: '파티 탈퇴' });
    });

    // ── 파티 해산 ──
    socket.on('disband_party', () => {
        const p = players[playerId];
        if (!p || !p.partyId) return;
        const party = parties[p.partyId];
        if (!party || party.leader !== playerId) { socket.emit('party_result', { success: false, msg: '파티장만 해산 가능' }); return; }

        for (const mid of party.members) {
            if (players[mid]) players[mid].partyId = null;
            io.to(mid).emit('party_result', { success: true, msg: '파티가 해산되었습니다' });
        }
        delete parties[p.partyId];
    });

    // ── 파티 정보 조회 ──
    socket.on('get_party_info', () => {
        const p = players[playerId];
        if (!p || !p.partyId || !parties[p.partyId]) { socket.emit('party_info', null); return; }
        const party = parties[p.partyId];
        socket.emit('party_info', {
            ...party,
            memberNames: party.members.map(m => ({
                id: m, name: players[m]?.displayName || '?',
                level: players[m]?.level || 1, className: players[m]?.className || '?',
                hp: players[m]?.hp || 0, maxHp: players[m]?.maxHp || 1,
                isLeader: m === party.leader,
            }))
        });
    });

    // ── 파티 던전 입장 ──
    socket.on('party_enter_dungeon', (dungeonId) => {
        const p = players[playerId];
        if (!p || !p.partyId) { socket.emit('dungeon_result', { msg: '파티 필요' }); return; }
        const party = parties[p.partyId];
        if (!party || party.leader !== playerId) { socket.emit('dungeon_result', { msg: '파티장만 입장 가능' }); return; }
        const dungeon = DUNGEONS[dungeonId];
        if (!dungeon) { socket.emit('dungeon_result', { msg: '존재하지 않는 던전' }); return; }
        if (party.members.length > dungeon.maxParty) { socket.emit('dungeon_result', { msg: `최대 ${dungeon.maxParty}명` }); return; }

        // 모든 파티원 레벨 체크
        for (const mid of party.members) {
            const member = players[mid];
            if (!member || !member.isAlive) { socket.emit('dungeon_result', { msg: '모든 파티원이 생존해야 함' }); return; }
            if (member.level < dungeon.minLevel) { socket.emit('dungeon_result', { msg: `${member.displayName}: 레벨 ${dungeon.minLevel} 이상 필요` }); return; }
        }

        entityIdCounter++;
        const instanceId = 'dungeon_' + entityIdCounter;
        activeDungeons[instanceId] = {
            dungeonId, players: [...party.members], currentStage: 0,
            monstersLeft: dungeon.monsters[0].count,
            startTime: Date.now(), totalStages: dungeon.stages,
        };
        for (const mid of party.members) {
            if (players[mid]) players[mid].inDungeon = instanceId;
            io.to(mid).emit('dungeon_enter', {
                instanceId, name: dungeon.name, stage: 1, totalStages: dungeon.stages,
                monstersLeft: dungeon.monsters[0].count, tier: dungeon.monsters[0].tier
            });
        }
        io.emit('server_msg', { msg: `${p.displayName}의 파티가 ${dungeon.name}에 입장! (${party.members.length}명)`, type: 'normal' });
    });

    // ── 창고 ──
    socket.on('warehouse_deposit', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        if (!p.warehouse) p.warehouse = {};
        p.inventory[itemId]--;
        if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
        p.warehouse[itemId] = (p.warehouse[itemId] || 0) + 1;
        savePlayer(p);
        socket.emit('warehouse_data', { warehouse: p.warehouse, inventory: p.inventory });
    });

    socket.on('warehouse_withdraw', (itemId) => {
        const p = players[playerId];
        if (!p || !p.warehouse || !p.warehouse[itemId]) return;
        if (!p.inventory) p.inventory = {};
        p.warehouse[itemId]--;
        if (p.warehouse[itemId] <= 0) delete p.warehouse[itemId];
        p.inventory[itemId] = (p.inventory[itemId] || 0) + 1;
        savePlayer(p);
        socket.emit('warehouse_data', { warehouse: p.warehouse, inventory: p.inventory });
    });

    socket.on('get_warehouse', () => {
        const p = players[playerId];
        if (!p) return;
        socket.emit('warehouse_data', { warehouse: p.warehouse || {}, inventory: p.inventory || {} });
    });

    // ── 몬스터 테이밍 (포켓몬) ──
    // 가장 가까운 몬스터 자동 테이밍
    socket.on('tame_nearest', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) { socket.emit('tame_result', {success:false, msg:'캐릭터가 없습니다'}); return; }
        let nearestId = null, nearestDist = 999;
        for (const mId in monsters) {
            if (!monsters[mId].isAlive) continue;
            const d = Math.hypot(p.x - monsters[mId].x, p.y - monsters[mId].y);
            if (d < nearestDist) { nearestDist = d; nearestId = mId; }
        }
        if (!nearestId || nearestDist > 8) {
            socket.emit('tame_result', {success:false, msg:'근처 몬스터 없음 (8 이내)'});
            return;
        }
        doTame(playerId, nearestId, socket);
    });

    socket.on('tame_monster', (monsterId) => { doTame(playerId, monsterId, socket); });

    function doTame(ownerId, monsterId, sock) {
        const p = players[ownerId];
        if (!p || !p.isAlive) return;
        const mob = monsters[monsterId];
        if (!mob || !mob.isAlive) { sock.emit('tame_result', { success:false, msg:'대상 없음' }); return; }
        const dist = Math.hypot(p.x - mob.x, p.y - mob.y);
        if (dist > 8) { sock.emit('tame_result', { success:false, msg:'너무 멀어요 (8 이내)' }); return; }
        const tameCost = TAME_COSTS[mob.tier] || 50;
        if (p.gold < tameCost) { sock.emit('tame_result', { success:false, msg:`${tameCost}G 필요` }); return; }

        p.gold -= tameCost;
        const rate = TAME_RATES[mob.tier] || 0.1;
        const success = Math.random() < rate;

        if (success) {
            // 테이밍 성공 → 용병으로 추가
            let myArmyCount = 0;
            for (const bId in players) {
                if (players[bId].isBot && players[bId].ownerId === ownerId && players[bId].isAlive) myArmyCount++;
            }
            if (myArmyCount >= (p.maxArmy || 30)) {
                sock.emit('tame_result', { success:false, msg:'용병 슬롯 부족!' });
                return;
            }

            // 몬스터 → 용병 변환
            const tier = MONSTER_TIERS[mob.tier];
            entityIdCounter++;
            const botId = 'tamed_' + entityIdCounter;
            const cls = CLASSES['Warrior']; // 기본 워리어 베이스
            players[botId] = {
                id: botId, deviceId: 'tamed',
                className: 'Warrior', displayName: p.displayName + '의 ' + mob.name,
                x: p.x + (Math.random() * 4 - 2), y: p.y + (Math.random() * 4 - 2),
                hp: mob.maxHp, maxHp: mob.maxHp,
                atk: mob.atk || 10, def: mob.def || 5,
                critRate: 0.1, dodgeRate: 0.05,
                dmgMulti: 1.0,
                dirX: 0, dirY: -1,
                gold: 0, level: Math.max(1, Math.floor(mob.maxHp / 50)), exp: 0,
                isAlive: true, killCount: 0, karma: 0,
                team: p.team, ownerId: ownerId,
                targetId: null, isKing: false, isBot: true,
                tamedTier: mob.tier, tamedName: mob.name,
                // 등급별 공격 스타일
                attackStyle: mob.tier === 'normal' ? 'melee' : mob.tier === 'elite' ? 'charge' : mob.tier === 'rare' ? 'aoe' : 'breath',
                lastHpRegen: Date.now(), autoSkillCooldown: 0, skillCooldowns: {},
            };

            // 등급별 스탯 보정
            if (mob.tier === 'elite') { players[botId].atk *= 1.3; players[botId].def *= 1.2; }
            if (mob.tier === 'rare')  { players[botId].atk *= 1.6; players[botId].critRate = 0.2; }
            if (mob.tier === 'boss')  { players[botId].atk *= 2.0; players[botId].maxHp *= 1.5; players[botId].hp = players[botId].maxHp; }

            // 몬스터 제거
            delete monsters[monsterId];
            io.emit('monster_die', { id: monsterId, tier: mob.tier, killer: ownerId });
            spawnMonster();
            io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);

            io.emit('player_join', players[botId]);
            io.emit('server_msg', { msg: `${p.displayName}이(가) ${mob.name}을(를) 테이밍!`, type: 'morph' });
            sock.emit('tame_result', { success:true, msg: `${mob.name} 테이밍 성공! (${Math.floor(rate*100)}%)` });
            p.totalTamed = (p.totalTamed || 0) + 1;
        } else {
            // 테이밍 실패 → 몬스터 화남 (플레이어에게 데미지)
            p.hp -= mob.atk || 10;
            sock.emit('tame_result', { success:false, msg: `테이밍 실패! (${Math.floor(rate*100)}%) 몬스터가 화났다!` });
            io.emit('player_hit', { id: ownerId, hp: p.hp, damage: mob.atk || 10, isCrit: false });
        }
        savePlayer(p);
        io.emit('player_update', p);
    }

    // ── 거상 — 마을 상점 매매 ──
    socket.on('town_buy', (dataStr) => {
        const p = players[playerId];
        if (!p) return;
        try {
            const { goodsId, town, qty } = JSON.parse(dataStr);
            const zone = getZone(p.x, p.y);
            if (zone.id !== town) { socket.emit('trade_goods_result', { success:false, msg:'해당 마을에 있어야 합니다' }); return; }
            if (!townPrices[town] || !townPrices[town][goodsId]) return;

            const price = townPrices[town][goodsId].buyPrice * (qty || 1);
            if (p.gold < price) { socket.emit('trade_goods_result', { success:false, msg:'골드 부족' }); return; }

            p.gold -= price;
            if (!p.inventory) p.inventory = {};
            p.inventory[goodsId] = (p.inventory[goodsId] || 0) + (qty || 1);
            savePlayer(p);
            socket.emit('trade_goods_result', { success:true, msg:`${townPrices[town][goodsId].name} x${qty||1} 구매 (${price}G)` });
            io.emit('player_update', p);
        } catch(e) {}
    });

    socket.on('town_sell', (dataStr) => {
        const p = players[playerId];
        if (!p) return;
        try {
            const { goodsId, town, qty } = JSON.parse(dataStr);
            const zone = getZone(p.x, p.y);
            if (zone.id !== town) { socket.emit('trade_goods_result', { success:false, msg:'해당 마을에 있어야 합니다' }); return; }
            if (!p.inventory || !p.inventory[goodsId] || p.inventory[goodsId] < (qty||1)) {
                socket.emit('trade_goods_result', { success:false, msg:'물건 부족' }); return;
            }
            if (!townPrices[town] || !townPrices[town][goodsId]) return;

            const price = townPrices[town][goodsId].sellPrice * (qty || 1);
            p.inventory[goodsId] -= (qty || 1);
            if (p.inventory[goodsId] <= 0) delete p.inventory[goodsId];
            p.gold += price;
            p.totalTradeProfit = (p.totalTradeProfit || 0) + price;
            trackQuest(p, 'trade_count', qty || 1);
            checkTitles(p);
            capResources(p);
            savePlayer(p);
            socket.emit('trade_goods_result', { success:true, msg:`${townPrices[town][goodsId].name} x${qty||1} 판매 (+${price}G)` });
            io.emit('player_update', p);
        } catch(e) {}
    });

    socket.on('get_town_prices', () => {
        socket.emit('town_prices', townPrices);
    });

    // ── 용병 거래 ──
    socket.on('trade_unit', (dataStr) => {
        try {
            const { unitId, targetPlayerId, price } = JSON.parse(dataStr);
            const p = players[playerId];
            const t = players[targetPlayerId];
            const unit = players[unitId];
            if (!p || !t || !unit || !unit.isBot || unit.ownerId !== playerId) return;
            if (t.isBot) return;
            const dist = Math.hypot(p.x - t.x, p.y - t.y);
            if (dist > 10) { socket.emit('trade_result', { success:false, msg:'너무 멀어요' }); return; }
            if (t.gold < (price || 0)) { socket.emit('trade_result', { success:false, msg:'상대 골드 부족' }); return; }

            // 거래 실행
            unit.ownerId = targetPlayerId;
            unit.team = t.team;
            if (price > 0) { t.gold -= price; p.gold += price; }
            savePlayer(p); savePlayer(t);
            socket.emit('trade_result', { success:true, msg:`용병 판매! +${price}G` });
            io.to(targetPlayerId).emit('trade_result', { success:true, msg:`용병 구매! -${price}G` });
            io.emit('player_update', p);
            io.emit('player_update', t);
            io.emit('player_update', unit);
        } catch(e) {}
    });

    // ── 공성전 ──
    socket.on('start_siege', () => {
        const p = players[playerId];
        if (!p || !p.clanName) { socket.emit('siege_result', { msg:'혈맹 필요' }); return; }
        if (siegeActive) { socket.emit('siege_result', { msg:'이미 공성 중' }); return; }
        if (castleOwner === p.clanName) { socket.emit('siege_result', { msg:'이미 성 소유 중' }); return; }

        siegeActive = true;
        io.emit('server_msg', { msg:`[공성전] ${p.clanName} 혈맹이 왕의 성에 공격을 선포했습니다! (5분)`, type:'boss' });

        siegeTimer = setTimeout(() => {
            siegeActive = false;
            // 공성 성공 여부: 성 구역에 공격자 혈맹이 가장 많으면 성공
            const clanCounts = {};
            for (const pid in players) {
                const pl = players[pid];
                if (!pl.isAlive || !pl.clanName || pl.isBot) continue;
                const z = getZone(pl.x, pl.y);
                if (z.isCastle) {
                    clanCounts[pl.clanName] = (clanCounts[pl.clanName] || 0) + 1;
                }
            }
            let winner = null, maxCount = 0;
            for (const [clan, count] of Object.entries(clanCounts)) {
                if (count > maxCount) { maxCount = count; winner = clan; }
            }
            if (winner) {
                castleOwner = winner;
                io.emit('server_msg', { msg:`[공성전] ${winner} 혈맹이 왕의 성을 차지했습니다!`, type:'rare' });
            } else {
                io.emit('server_msg', { msg:`[공성전] 공성 실패 — 성을 지켜냈습니다!`, type:'normal' });
            }
        }, 300000); // 5분

        socket.emit('siege_result', { msg:'공성전 시작! 5분 내에 성을 점령하세요!' });
    });

    // ── 1:1 거래 ──
    socket.on('trade_request', (targetId) => {
        const p = players[playerId];
        const t = players[targetId];
        if (!p || !t || t.isBot) return;
        const dist = Math.hypot(p.x - t.x, p.y - t.y);
        if (dist > 5) { socket.emit('trade_result', { success:false, msg:'대상이 너무 멉니다 (5 이내)' }); return; }
        io.to(targetId).emit('trade_incoming', { fromId: playerId, fromName: p.displayName });
        socket.emit('trade_result', { success:true, msg:'거래 요청을 보냈습니다' });
    });

    socket.on('trade_accept', (dataStr) => {
        try {
            const data = JSON.parse(dataStr);
            const { fromId, myItem, theirItem } = data;
            const p = players[playerId];
            const t = players[fromId];
            if (!p || !t) return;

            // 아이템 교환
            if (myItem && p.inventory && p.inventory[myItem]) {
                p.inventory[myItem]--;
                if (p.inventory[myItem] <= 0) delete p.inventory[myItem];
                if (!t.inventory) t.inventory = {};
                t.inventory[myItem] = (t.inventory[myItem] || 0) + 1;
            }
            if (theirItem && t.inventory && t.inventory[theirItem]) {
                t.inventory[theirItem]--;
                if (t.inventory[theirItem] <= 0) delete t.inventory[theirItem];
                if (!p.inventory) p.inventory = {};
                p.inventory[theirItem] = (p.inventory[theirItem] || 0) + 1;
            }
            savePlayer(p); savePlayer(t);
            socket.emit('trade_result', { success:true, msg:'거래 완료!' });
            io.to(fromId).emit('trade_result', { success:true, msg:'거래 완료!' });
        } catch(e) {}
    });

    // ── 제작 ──
    socket.on('craft', (recipeId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleCraft(p, recipeId, io);
        if (result.success) {
            p.totalCrafts = (p.totalCrafts || 0) + 1;
            checkTitles(p);
        }
        savePlayer(p);
        socket.emit('craft_result', result);
        if (result.success) io.emit('player_update', p);
    });

    // ── 스킬 상세 정보 ──
    socket.on('get_skills', () => {
        const p = players[playerId];
        if (!p) return;
        const cls = p.baseClassName || p.className;
        const skills = SKILLS[cls] || [];
        const skillData = skills.map(s => ({
            name: s.name, type: s.type,
            dmgMulti: s.dmgMulti || 0, cooldown: s.cooldown || 0,
            mpCost: s.mpCost || 0, range: s.range || 0,
            level: s.level, aoe: s.aoe || false,
            desc: s.stealth ? '은신 후 다음 공격 2배' :
                  s.allyAtkMulti ? '아군 ATK +' + Math.floor((s.allyAtkMulti-1)*100) + '%' :
                  s.taunt ? '몬스터 어그로 강제 변경' :
                  s.dmgReduce ? '받는 데미지 ' + Math.floor(s.dmgReduce*100) + '% 감소' :
                  s.allyInvincible ? '아군 무적 ' + s.duration + '초' :
                  s.chainCount ? '적 ' + s.chainCount + '명 연쇄 타격' :
                  s.executeThreshold ? 'HP ' + Math.floor(s.executeThreshold*100) + '% 이하 처형' :
                  s.poisonDot ? '공격 시 독 ' + s.poisonDot + '/초' :
                  s.hpThreshold ? 'HP ' + Math.floor(s.hpThreshold*100) + '%↓ → ATK +' + Math.floor(s.atkBonus*100) + '%' :
                  s.allyDefMulti ? '아군 DEF +' + Math.floor((s.allyDefMulti-1)*100) + '%' :
                  s.mpRegenMulti ? 'MP 회복 +' + Math.floor((s.mpRegenMulti-1)*100) + '%' :
                  s.dmgMulti ? '데미지 x' + s.dmgMulti : '패시브',
            unlocked: p.level >= s.level,
            cooldownLeft: p.skillCooldowns?.[s.name] ? Math.max(0, Math.ceil((s.cooldown*1000 - (Date.now() - p.skillCooldowns[s.name]))/1000)) : 0,
        }));
        socket.emit('skill_data', skillData);
    });

    // ── 장비 비교 정보 ──
    socket.on('compare_equip', (itemId) => {
        const p = players[playerId];
        if (!p) return;
        const newEq = EQUIP_STATS[itemId];
        if (!newEq) return;
        const curId = p.equipped?.[newEq.slot];
        const curEq = curId ? EQUIP_STATS[curId] : null;
        const curEnchant = curId && p.enchantLevels?.[curId] ? p.enchantLevels[curId] : 0;
        const newEnchant = p.enchantLevels?.[itemId] || 0;
        const curGrade = curEq ? GRADE_INFO[curEq.grade] : null;
        const newGrade = GRADE_INFO[newEq.grade];

        const curAtk = curEq ? Math.floor(curEq.atk * (curGrade?.atkMulti||1) * (1+getEnchantBonus(curEnchant))) : 0;
        const curDef = curEq ? Math.floor(curEq.def * (curGrade?.defMulti||1) * (1+getEnchantBonus(curEnchant))) : 0;
        const newAtk = Math.floor(newEq.atk * (newGrade?.atkMulti||1) * (1+getEnchantBonus(newEnchant)));
        const newDef = Math.floor(newEq.def * (newGrade?.defMulti||1) * (1+getEnchantBonus(newEnchant)));

        socket.emit('equip_compare', {
            slot: newEq.slot,
            current: curEq ? { name: curEq.name, grade: curEq.grade, enchant: curEnchant, atk: curAtk, def: curDef } : null,
            new: { name: newEq.name, grade: newEq.grade, enchant: newEnchant, atk: newAtk, def: newDef },
            atkDiff: newAtk - curAtk, defDiff: newDef - curDef,
        });
    });

    socket.on('get_recipes', () => {
        socket.emit('recipe_list', RECIPES);
    });

    // ── 펫 구매 ──
    socket.on('buy_pet', (petId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleBuyPet(p, petId);
        if (result.success) savePlayer(p);
        socket.emit('pet_result', result);
    });

    // ── 탈것 구매 ──
    socket.on('buy_mount', (mountId) => {
        const p = players[playerId];
        if (!p) return;
        const result = handleBuyMount(p, mountId);
        if (result.success) savePlayer(p);
        socket.emit('mount_result', result);
    });

    // ── 버프 사용 (인벤토리 아이템) ──
    socket.on('use_buff_item', (itemId) => {
        const p = players[playerId];
        if (!p || !p.inventory || !p.inventory[itemId]) return;
        if (BUFF_TYPES[itemId]) {
            p.inventory[itemId]--;
            if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
            applyBuff(p, itemId);
            savePlayer(p);
            socket.emit('buff_result', { success:true, msg:`${BUFF_TYPES[itemId].name} 사용!` });
        }
    });

    // ── 칭호 변경 ──
    socket.on('set_title', (titleId) => {
        const p = players[playerId];
        if (!p || !p.titles || !p.titles.includes(titleId)) return;
        p.activeTitle = titleId;
        savePlayer(p);
        io.emit('player_update', p);
    });

    // ── 채팅 ──
    socket.on('chat', (msg) => {
        const p = players[playerId];
        if (!p || typeof msg !== 'string' || msg.length > 100) return;
        const cleanMsg = msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        io.emit('chat_msg', {
            sender: p.displayName || p.className,
            msg: cleanMsg,
            team: p.team,
            isKing: p.isKing,
            karma: p.karma
        });
    });

    socket.on('disconnect', () => {
        if (players[playerId]) {
            const p = players[playerId];
            if (p.isKing) hasKing = false;
            // 던전 인스턴스 정리
            if (p.inDungeon && activeDungeons[p.inDungeon]) {
                const inst = activeDungeons[p.inDungeon];
                inst.players = inst.players.filter(pid => pid !== playerId);
                if (inst.players.length === 0) delete activeDungeons[p.inDungeon];
            }
            // 무한의 탑 정리
            if (towerProgress[playerId]) delete towerProgress[playerId];
            // 아레나 큐 정리
            arenaQueue = arenaQueue.filter(id => id !== playerId);

            savePlayer(p);

            for (let bId in players) {
                if (players[bId].isBot && players[bId].ownerId === playerId) {
                    io.emit('player_leave', bId);
                    delete players[bId];
                }
            }
            delete players[playerId];
            io.emit('player_leave', playerId);
        }
    });
});

// ==========================================
// 투사체 & 전투 로직
// ==========================================

function executeThrow(pId) {
    const player = players[pId];
    if (!player || !player.isAlive) return;

    const mag = Math.sqrt(player.dirX ** 2 + player.dirY ** 2);
    let finalDirX = 0, finalDirY = 1;
    if (mag > 0.01) { finalDirX = player.dirX / mag; finalDirY = player.dirY / mag; }

    const cls = CLASSES[player.className];
    if (!cls) return;

    entityIdCounter++;
    const currentObjId = entityIdCounter;

    if (cls.aoe) {
        aoes[currentObjId] = {
            id: currentObjId, ownerId: pId,
            x: player.x, y: player.y,
            radius: 2.0, timer: null
        };
        io.emit('aoe_spawn', aoes[currentObjId]);
        aoes[currentObjId].timer = setTimeout(() => {
            if (aoes[currentObjId]) {
                io.emit('aoe_destroy', currentObjId);
                delete aoes[currentObjId];
            }
        }, cls.projLife);
    } else {
        // 액티브 플레이 보너스 적용
        // 버프 아이템 반영 (atk_boost, food_atk 등)
        const buffedAtk = getBuffedStat(player, 'atk');
        let activeDmgMulti = player.dmgMulti;
        if (player._activeBonus && Date.now() < player._activeBonus) activeDmgMulti *= 1.3;
        const { damage, isCrit } = calcDamage(buffedAtk, 0, activeDmgMulti, player.critRate);
        axes[currentObjId] = {
            id: currentObjId, ownerId: pId,
            x: player.x + finalDirX * 0.5,
            y: player.y + finalDirY * 0.5,
            dirX: finalDirX, dirY: finalDirY,
            speed: cls.projSpeed,
            dmg: damage,
            isCrit,
            timer: null
        };
        io.emit('axe_spawn', axes[currentObjId]);
        axes[currentObjId].timer = setTimeout(() => {
            if (axes[currentObjId]) {
                io.emit('axe_destroy', currentObjId);
                delete axes[currentObjId];
            }
        }, cls.projLife);
    }
}

function createBot(victimPlayer, ownerTeam, ownerId) {
    entityIdCounter++;
    const botId = 'bot_' + entityIdCounter;
    const cls = CLASSES[victimPlayer.className] || CLASSES['Warrior'];
    players[botId] = {
        id: botId, deviceId: 'bot',
        className: victimPlayer.className,
        displayName: cls.displayName,
        x: (players[ownerId] ? players[ownerId].x : victimPlayer.x) + (Math.random() * 4 - 2),
        y: (players[ownerId] ? players[ownerId].y : victimPlayer.y) + (Math.random() * 4 - 2),
        hp: victimPlayer.maxHp, maxHp: victimPlayer.maxHp,
        atk: cls.atk, def: cls.def,
        critRate: cls.critRate, dodgeRate: cls.dodgeRate,
        dmgMulti: victimPlayer.dmgMulti,
        dirX: 0, dirY: -1,
        gold: 0, level: victimPlayer.level, exp: 0,
        isAlive: true, killCount: 0, karma: 0,
        team: ownerTeam,
        ownerId,
        targetId: null,
        isKing: false, isBot: true,
        lastHpRegen: Date.now(), autoSkillCooldown: 0
    };
    io.emit('player_join', players[botId]);
}

function createAutoArmy(ownerId) {
    const p = players[ownerId];
    if (!p || !p.isAlive) return;

    entityIdCounter++;
    const botId = 'bot_auto_' + entityIdCounter;
    const classNames = ['Assassin', 'Warrior', 'Knight', 'Mage'];
    const randomClass = classNames[Math.floor(Math.random() * classNames.length)];
    const cls = CLASSES[randomClass];

    const botLevel = Math.max(1, Math.floor(p.level * 0.8));
    const botHp = cls.maxHp + (botLevel - 1) * 25;
    players[botId] = {
        id: botId, deviceId: 'bot',
        className: randomClass,
        displayName: cls.displayName,
        x: p.x + (Math.random() * 4 - 2),
        y: p.y + (Math.random() * 4 - 2),
        hp: botHp, maxHp: botHp,
        atk: cls.atk, def: cls.def,
        critRate: cls.critRate, dodgeRate: cls.dodgeRate,
        dmgMulti: 1.0 + (botLevel - 1) * 0.08,
        dirX: 0, dirY: -1,
        gold: 0, level: botLevel, exp: 0,
        isAlive: true, killCount: 0, karma: 0,
        team: p.team,
        ownerId,
        targetId: null,
        isKing: false, isBot: true,
        element: p.element,
        lastHpRegen: Date.now(), autoSkillCooldown: 0
    };
    io.emit('player_join', players[botId]);
}

function alertArmy(ownerId, attackerId) {
    if (ownerId === attackerId) return;
    for (let bId in players) {
        if (players[bId].isBot && players[bId].ownerId === ownerId && players[bId].isAlive) {
            players[bId].targetId = attackerId;
        }
    }
}

// ==========================================
// 게임 루프 (30 TPS)
// ==========================================

const TICK_RATE = 30;
const TICK_TIME = 1000 / TICK_RATE;
let tickCounter = 0;

setInterval(() => {
    tickCounter++;

    handleCollisions();

    // 몬스터 AI (1초마다)
    if (tickCounter % 30 === 0) {
        for (let mId in monsters) {
            const m = monsters[mId];
            if (!m.isAlive) continue;

            // 가장 가까운 플레이어 찾기
            let nearestPlayer = null, nearestDist = 15; // 어그로 범위 15
            // 도발 대상 우선
            if (m.tauntTarget && players[m.tauntTarget]?.isAlive) {
                nearestPlayer = players[m.tauntTarget];
                nearestDist = Math.hypot(m.x - nearestPlayer.x, m.y - nearestPlayer.y);
            } else {
                m.tauntTarget = null;
                for (const pId in players) {
                    const p = players[pId];
                    if (!p.isAlive) continue;
                    const d = Math.hypot(m.x - p.x, m.y - p.y);
                    if (d < nearestDist) { nearestDist = d; nearestPlayer = p; }
                }
            }

            const now = Date.now();
            const aiType = m.aiType || 'wander';

            if (nearestPlayer && nearestDist < 12) {
                // 플레이어를 향해 이동
                const dx = nearestPlayer.x - m.x, dy = nearestPlayer.y - m.y;
                const mag = Math.hypot(dx, dy);

                switch (aiType) {
                    case 'charge': // 엘리트: 돌진 — 빠르게 접근, 3초마다 돌진 공격
                        if (mag > 2) {
                            const spd = 0.8; // 일반보다 빠름
                            m.x += (dx / mag) * spd;
                            m.y += (dy / mag) * spd;
                        }
                        // 돌진 준비 경고 (0.5초 전)
                        if (nearestDist < 4 && now - (m.lastSpecialAttack||0) > 2500 && now - (m.lastSpecialAttack||0) < 3000) {
                            io.emit('monster_telegraph', { id: mId, type: 'charge', x: m.x, y: m.y, targetX: nearestPlayer.x, targetY: nearestPlayer.y });
                        }
                        if (nearestDist < 3 && now - (m.lastSpecialAttack||0) > 3000) {
                            m.lastSpecialAttack = now;
                            // 돌진 데미지 + 넉백
                            const chargeDmg = Math.floor(m.atk * 1.5);
                            nearestPlayer.hp -= chargeDmg;
                            // 넉백 (플레이어를 밀어냄)
                            if (mag > 0.1) {
                                nearestPlayer.x += (dx / mag) * -2;
                                nearestPlayer.y += (dy / mag) * -2;
                            }
                            io.emit('player_hit', { id: nearestPlayer.id, hp: nearestPlayer.hp, damage: chargeDmg, isCrit: false, skillName: '돌진' });
                            if (nearestPlayer.hp <= 0 && nearestPlayer.isAlive) {
                                handlePlayerDeath(nearestPlayer, nearestPlayer.id, m, mId);
                            }
                        }
                        break;

                    case 'aoe': // 레어: 광역 — 느리지만 주기적 광역 공격
                        if (mag > 3) {
                            m.x += (dx / mag) * 0.3;
                            m.y += (dy / mag) * 0.3;
                        }
                        if (now - (m.lastSpecialAttack||0) > 4000) {
                            m.lastSpecialAttack = now;
                            // 주변 3범위 광역 데미지
                            const aoeDmg = Math.floor(m.atk * 1.2);
                            for (const pId in players) {
                                const p = players[pId];
                                if (!p.isAlive) continue;
                                const pd = Math.hypot(m.x - p.x, m.y - p.y);
                                if (pd < 3) {
                                    if (p.activeBuffs?.divine_shield) continue;
                                    let dmg = aoeDmg;
                                    if (p.activeBuffs?.iron_wall) dmg = Math.floor(dmg * 0.3);
                                    p.hp -= dmg;
                                    io.emit('player_hit', { id: pId, hp: p.hp, damage: dmg, isCrit: false, skillName: '광역 충격파' });
                                    if (p.hp <= 0 && p.isAlive) handlePlayerDeath(p, pId, m, mId);
                                }
                            }
                        }
                        break;

                    case 'breath': // 보스: 브레스 — 원거리 직선 공격 + 높은 데미지
                        if (mag > 5) {
                            m.x += (dx / mag) * 0.4;
                            m.y += (dy / mag) * 0.4;
                        }
                        if (now - (m.lastSpecialAttack||0) > 5000) {
                            m.lastSpecialAttack = now;
                            // 브레스: 방향으로 범위 6, 폭 2의 직선 공격
                            const breathDmg = Math.floor(m.atk * 2.0);
                            const bdx = dx / mag, bdy = dy / mag;
                            for (const pId in players) {
                                const p = players[pId];
                                if (!p.isAlive) continue;
                                // 브레스 직선 범위 체크 (내적 + 거리)
                                const px = p.x - m.x, py = p.y - m.y;
                                const proj = px * bdx + py * bdy; // 정사영
                                if (proj > 0 && proj < 8) {
                                    const perp = Math.abs(px * bdy - py * bdx); // 수직 거리
                                    if (perp < 2) {
                                        if (p.activeBuffs?.divine_shield) continue;
                                        let dmg = breathDmg;
                                        if (p.activeBuffs?.iron_wall) dmg = Math.floor(dmg * 0.3);
                                        p.hp -= dmg;
                                        applyBuff(p, 'burn'); // 화상 디버프
                                        io.emit('player_hit', { id: pId, hp: p.hp, damage: dmg, isCrit: false, skillName: '브레스' });
                                        if (p.hp <= 0 && p.isAlive) handlePlayerDeath(p, pId, m, mId);
                                    }
                                }
                            }
                            io.emit('skill_effect', { casterId: mId, skillName: '브레스', type: 'aoe', targetX: nearestPlayer.x, targetY: nearestPlayer.y });
                        }
                        break;

                    default: // wander: 느린 추적
                        if (mag > 2) {
                            m.x += (dx / mag) * 0.4;
                            m.y += (dy / mag) * 0.4;
                        }
                        // 근접 시 기본 공격 (2초마다)
                        if (nearestDist < 2 && now - (m.lastSpecialAttack||0) > 2000) {
                            m.lastSpecialAttack = now;
                            const mDmg = Math.max(1, m.atk - (nearestPlayer.def || 0) * 0.3);
                            nearestPlayer.hp -= mDmg;
                            io.emit('player_hit', { id: nearestPlayer.id, hp: nearestPlayer.hp, damage: Math.floor(mDmg), isCrit: false });
                            if (nearestPlayer.hp <= 0 && nearestPlayer.isAlive) handlePlayerDeath(nearestPlayer, nearestPlayer.id, m, mId);
                        }
                }
            } else {
                // 어그로 없음: 스폰 존 중심으로 복귀
                const mZoneHome = m.zoneId && ZONES[m.zoneId];
                if (mZoneHome) {
                    const homeX = mZoneHome.x + mZoneHome.w / 2;
                    const homeY = mZoneHome.y + mZoneHome.h / 2;
                    const homeDist = Math.hypot(m.x - homeX, m.y - homeY);
                    if (homeDist > mZoneHome.w * 0.4) {
                        // 존 중심으로 복귀
                        m.x += (homeX - m.x) / homeDist * 0.5;
                        m.y += (homeY - m.y) / homeDist * 0.5;
                    } else {
                        // 존 내 랜덤 배회
                        m.x += (Math.random() * 2 - 1) * 0.3;
                        m.y += (Math.random() * 2 - 1) * 0.3;
                    }
                } else {
                    m.x += (Math.random() * 2 - 1) * 0.3;
                    m.y += (Math.random() * 2 - 1) * 0.3;
                }
            }

            // 존 경계 유지
            const mZone = m.zoneId && ZONES[m.zoneId];
            if (mZone) {
                m.x = Math.max(mZone.x, Math.min(mZone.x + mZone.w, m.x));
                m.y = Math.max(mZone.y, Math.min(mZone.y + mZone.h, m.y));
            }
            m.x = Math.max(-1020, Math.min(1020, m.x));
            m.y = Math.max(-1020, Math.min(1020, m.y));
        }
    }

    // 버프/디버프 업데이트 (매 틱)
    for (let pId in players) {
        if (players[pId].isAlive) updateBuffs(players[pId]);
    }

    // HP 자동 회복 (2초마다, 최대HP의 2% + 펫 보너스)
    if (tickCounter % 60 === 0) {
        for (let pId in players) {
            const p = players[pId];
            if (p.isAlive && p.hp < p.maxHp) {
                let regenRate = 0.01; // 1%/2초 (2%에서 하향)
                const pet = getPetEffect(p);
                if (pet && pet.effect === 'hpRegen') regenRate += pet.value;
                p.hp = Math.min(p.maxHp, p.hp + p.maxHp * regenRate);
            }
            // MP 자동 회복 (2초마다 최대 MP의 3%)
            if (p.isAlive && p.mp !== undefined && p.mp < (p.maxMp || 100)) {
                let mpRegen = (p.maxMp || 100) * 0.03;
                // 메이지 마나 재생 패시브
                const magePassive = SKILLS[p.baseClassName || p.className]?.find(s => s.type === 'passive' && s.mpRegenMulti);
                if (magePassive && p.level >= magePassive.level) mpRegen *= magePassive.mpRegenMulti;
                p.mp = Math.min(p.maxMp || 100, p.mp + mpRegen);
            }
            // 자동 물약 (HP 30% 이하 시, 상급→중급→하급 순서)
            if (p.isAlive && p.autoPotion && !p.isBot && p.hp < p.maxHp * 0.3 && p.inventory) {
                const potions = [
                    { id:'pot_hp_l', heal:800, name:'상급 HP 물약' },
                    { id:'pot_hp_m', heal:300, name:'중급 HP 물약' },
                    { id:'pot_hp_s', heal:100, name:'하급 HP 물약' },
                ];
                for (const pot of potions) {
                    if (p.inventory[pot.id] > 0) {
                        p.inventory[pot.id]--;
                        if (p.inventory[pot.id] <= 0) delete p.inventory[pot.id];
                        p.hp = Math.min(p.maxHp, p.hp + pot.heal);
                        io.to(pId).emit('combat_log', { msg: `${pot.name} 사용! HP +${pot.heal}` });
                        break;
                    }
                }
            }
        }
    }

    // ══════════════════════════════════════
    // 재미 시스템 틱 처리
    // ══════════════════════════════════════

    const now = Date.now();

    // ── 날씨 변경 ──
    if (Date.now() > nextWeatherChange) {
        const newWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
        if (newWeather.id !== currentWeather.id) {
            currentWeather = newWeather;
            io.emit('weather_change', { id: newWeather.id, name: newWeather.name, effect: newWeather.effect });
            if (newWeather.id !== 'clear') {
                io.emit('server_msg', { msg: `[날씨] ${newWeather.name} — ${newWeather.effect?.element ? newWeather.effect.element + ' 속성 강화' : '전투 환경 변화'}`, type: 'normal' });
            }
        }
        nextWeatherChange = Date.now() + newWeather.duration * 1000;
    }

    // ── 시즌 균열 로테이션 (2주마다) ──
    if (Date.now() - currentSeason.startTime > 14 * 86400000) {
        // 시즌 종료 → 보상 지급 + 다음 시즌
        const sorted = Object.entries(currentSeason.leaderboard).sort((a,b) => b[1] - a[1]);
        for (let i = 0; i < Math.min(10, sorted.length); i++) {
            const [pid, depth] = sorted[i];
            const p = players[pid];
            if (!p) continue;
            const reward = Math.floor(5000 / (i + 1));
            p.gold += reward;
            p.diamonds = (p.diamonds||0) + Math.floor(100 / (i + 1));
            io.to(pid).emit('server_msg', { msg: `[시즌 종료] ${i+1}위! +${reward}G +${Math.floor(100/(i+1))}D`, type: 'rare' });
        }
        // 다음 테마
        const nextIdx = (RIFT_THEMES.indexOf(currentSeason.theme) + 1) % RIFT_THEMES.length;
        currentSeason = { theme: RIFT_THEMES[nextIdx], depth: 0, startTime: Date.now(), leaderboard: {} };
        // 모든 플레이어 균열 깊이 리셋
        for (const pid in players) { if (players[pid]._riftDepth) players[pid]._riftDepth = 0; }
        io.emit('server_msg', { msg: `[새 시즌] "${RIFT_THEMES[nextIdx].name}" 시즌 시작!`, type: 'boss' });
    }

    // ── 1. 트레저 고블린 (3~8분마다) ──
    if (!treasureGoblin && now > nextTreasureTime && Math.random() < 0.7) {
        const huntZoneEntries = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena);
        if (huntZoneEntries.length > 0) {
            const [zId, zone] = huntZoneEntries[Math.floor(Math.random() * huntZoneEntries.length)];
            entityIdCounter++;
            const gId = 'goblin_' + entityIdCounter;
            monsters[gId] = {
                id: gId, tier: 'treasure', name: '보물 도깨비',
                x: zone.x + zone.w/2, y: zone.y + zone.h/2,
                hp: 500, maxHp: 500, atk: 0, def: 100,
                color: '#FFD700', isAlive: true, zoneId: zId,
                aiType: 'flee', element: 'fire',
                expReward: 0, goldReward: 0, lastSpecialAttack: 0,
            };
            treasureGoblin = { id: gId, zoneId: zId, spawnTime: now };
            io.emit('server_msg', { msg: `[보물 도깨비] ${ZONES[zId].name}에 보물 도깨비 출현! 15초 내에 잡아라!`, type: 'boss' });
            logWorldEvent(`보물 도깨비 — ${ZONES[zId].name}`, 'boss');
            io.emit('rare_spawn', { id: gId, name: '보물 도깨비', tier: 'treasure', zoneId: zId, zoneName: ZONES[zId].name });
            // 15초 후 도주
            setTimeout(() => {
                if (monsters[gId] && monsters[gId].isAlive) {
                    delete monsters[gId];
                    treasureGoblin = null;
                    io.emit('server_msg', { msg: '[보물 도깨비] 도깨비가 도망쳤다! 하하하!', type: 'danger' });
                }
                nextTreasureTime = now + 180000 + Math.random() * 300000;
            }, 15000);
        }
    }
    // 고블린 도주 AI (매 틱 빠르게 도주)
    if (treasureGoblin && monsters[treasureGoblin.id]) {
        const g = monsters[treasureGoblin.id];
        if (g.isAlive) {
            // 가장 가까운 플레이어 반대 방향으로 도주
            let nearP = null, nearD = 20;
            for (const pid in players) {
                const p = players[pid]; if (!p.isAlive) continue;
                const d = Math.hypot(g.x - p.x, g.y - p.y);
                if (d < nearD) { nearD = d; nearP = p; }
            }
            if (nearP) {
                const dx = g.x - nearP.x, dy = g.y - nearP.y;
                const mag = Math.hypot(dx, dy) || 1;
                g.x += (dx/mag) * 1.5; g.y += (dy/mag) * 1.5;
            } else {
                g.x += (Math.random()-0.5) * 2; g.y += (Math.random()-0.5) * 2;
            }
            g.x = Math.max(-1020, Math.min(1020, g.x));
            g.y = Math.max(-1020, Math.min(1020, g.y));
        }
    }

    // ── 2. 현상금 게시판 (10분마다) ──
    if (now - lastBountyUpdate > 600000) {
        lastBountyUpdate = now;
        bountyBoard = [];
        const candidates = Object.values(players).filter(p => !p.isBot && p.isAlive && (p.karma > 100 || p.level >= 20));
        candidates.sort((a,b) => (b.karma||0) - (a.karma||0));
        for (let i = 0; i < Math.min(3, candidates.length); i++) {
            const t = candidates[i];
            const reward = Math.floor(500 + t.level * 100 + (t.karma||0) * 10);
            bountyBoard.push({ targetId: t.id, targetName: t.displayName, reward: Math.min(reward, 5000), claimedBy: null, claimedAt: 0 });
        }
        if (bountyBoard.length > 0) {
            io.emit('bounty_update', bountyBoard.map(b => ({ targetName: b.targetName, reward: b.reward, claimed: !!b.claimedBy })));
            io.emit('server_msg', { msg: `[현상금] 새 현상금 ${bountyBoard.length}건 등록!`, type: 'rare' });
        }
    }

    // ── 6. 유성우 이벤트 (20~40분마다) ──
    if (!meteorShower && now > nextMeteorTime) {
        const huntZones = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena);
        const [mzId, mZone] = huntZones[Math.floor(Math.random() * huntZones.length)];
        meteorShower = { zoneId: mzId, endTime: now + 120000 };
        io.emit('server_msg', { msg: `[유성우] ${mZone.name}에 유성우 발생! 2분간 파편 수집 + EXP/골드 x2!`, type: 'boss' });
        io.emit('meteor_shower', { zoneId: mzId, zoneName: mZone.name, duration: 120 });
        nextMeteorTime = now + 1200000 + Math.random() * 1200000;
    }
    // 유성우 진행 중: 3초마다 유성 낙하
    if (meteorShower) {
        if (now > meteorShower.endTime) {
            io.emit('server_msg', { msg: '[유성우] 유성우가 끝났습니다.', type: 'normal' });
            meteorShower = null;
        } else if (tickCounter % 90 === 0) { // 3초마다
            const mz = ZONES[meteorShower.zoneId];
            if (mz) {
                const mx = mz.x + Math.random() * mz.w, my = mz.y + Math.random() * mz.h;
                // 유성 데미지
                for (const pid in players) {
                    const p = players[pid]; if (!p.isAlive) continue;
                    if (Math.hypot(p.x - mx, p.y - my) < 3) {
                        p.hp -= 200;
                        io.emit('player_hit', { id: pid, hp: p.hp, damage: 200, isCrit: false, skillName: '유성' });
                        if (p.hp <= 0 && p.isAlive) { p.isAlive = false; io.emit('player_die', { victimId: pid, attackerId: 'meteor', killerName: '유성' }); }
                    }
                }
                // 파편 드롭
                const fragGold = 50 + Math.floor(Math.random() * 450);
                spawnDrop(mx, my, fragGold, 'meteor_frag');
                if (Math.random() < 0.05) {
                    // 5% 확률 드래곤 비늘 파편
                    for (const pid in players) {
                        const p = players[pid]; if (!p.isAlive || p.isBot) continue;
                        if (Math.hypot(p.x - mx, p.y - my) < 4) {
                            if (!p.inventory) p.inventory = {};
                            p.inventory['mat_dragon'] = (p.inventory['mat_dragon']||0) + 1;
                            io.to(pid).emit('combat_log', { msg: '유성 파편에서 드래곤 비늘 발견!' });
                        }
                    }
                }
            }
        }
    }

    // ── 4. 존 정복 집계 (매시 정각 리셋) ──
    if (now - lastConquestReset > 3600000) {
        lastConquestReset = now;
        // 영주 발표
        for (const [zId, data] of Object.entries(zoneConquest)) {
            if (!data.kills || Object.keys(data.kills).length === 0) continue;
            let maxClan = null, maxKills = 0;
            for (const [clan, kills] of Object.entries(data.kills)) {
                if (kills > maxKills) { maxKills = kills; maxClan = clan; }
            }
            if (maxClan) {
                data.lordClan = maxClan;
                data.kills = {};
                io.emit('server_msg', { msg: `[존 정복] ${ZONES[zId]?.name||zId} 영주: [${maxClan}] (${maxKills}킬)`, type: 'normal' });
            }
        }
    }

    // ── 8. 떠돌이 상인 (8~15분마다) ──
    if (!rogueMerchant && now > nextRogueTime) {
        const towns = Object.entries(ZONES).filter(([id, z]) => z.safe && z.npcs);
        const [townId, town] = towns[Math.floor(Math.random() * towns.length)];
        const deals = [];
        // 3개 랜덤 딜
        const allEquips = Object.keys(EQUIP_STATS).filter(k => EQUIP_STATS[k].grade === 'epic' || EQUIP_STATS[k].grade === 'legendary');
        if (allEquips.length > 0) {
            const eq = allEquips[Math.floor(Math.random() * allEquips.length)];
            deals.push({ type: 'equip', itemId: eq, name: EQUIP_STATS[eq].name, price: 150, currency: 'diamond', desc: '50% 할인 장비' });
        }
        deals.push({ type: 'material', itemId: 'mat_dragon', name: '드래곤 비늘 x20', price: 2000, currency: 'gold', qty: 20, desc: '대량 재료' });
        deals.push({ type: 'mystery', name: '미스터리 박스', price: 500, currency: 'gold', desc: '60%쓰레기/25%고급/10%희귀/4%영웅/1%전설' });
        rogueMerchant = { townId, deals, expiresAt: now + 90000, bought: {} };
        io.emit('server_msg', { msg: `[떠돌이 상인] ${town.name}에 신비한 상인이 90초간 출현!`, type: 'rare' });
        io.emit('rogue_merchant', { townId, townName: town.name, deals: deals.map((d,i) => ({ idx:i, name:d.name, price:d.price, currency:d.currency, desc:d.desc, sold:false })), expiresIn: 90 });
        nextRogueTime = now + 480000 + Math.random() * 420000;
    }
    if (rogueMerchant && now > rogueMerchant.expiresAt) {
        io.emit('server_msg', { msg: '[떠돌이 상인] 상인이 사라졌습니다...', type: 'normal' });
        rogueMerchant = null;
    }

    // 보스 카운트다운 타이머
    const bossInterval = 30 * 300; // 5분 = 9000틱
    const ticksUntilBoss = bossInterval - (tickCounter % bossInterval);
    const secsUntilBoss = Math.floor(ticksUntilBoss / 30);
    if (secsUntilBoss === 120 || secsUntilBoss === 60 || secsUntilBoss === 30 || secsUntilBoss === 10) {
        io.emit('boss_countdown', { seconds: secsUntilBoss });
    }

    // 골드 피버 이벤트 (15분마다 랜덤 PK존에서 3분간 3배 보상)
    if (tickCounter % (30 * 900) === 0 && tickCounter > 0) {
        const feverZones = ['chaos','warzone','lawless','blood_arena'];
        const feverZone = feverZones[Math.floor(Math.random() * feverZones.length)];
        const zoneName = ZONES[feverZone]?.name || feverZone;
        goldFeverZone = feverZone;
        goldFeverEnd = Date.now() + 180000; // 3분
        io.emit('gold_fever', { zoneId: feverZone, zoneName, duration: 180 });
        io.emit('server_msg', { msg: `[골드 피버!] ${zoneName}에서 3분간 골드/EXP x3! 위험을 감수하라!`, type: 'boss' });
    }

    // 월드 보스 스폰 (5분마다)
    if (tickCounter % (30 * 300) === 0 && tickCounter > 0) {
        spawnWorldBoss();
    }

    // 월드 보스 타이머 업데이트
    if (worldBoss && worldBoss.isAlive && tickCounter % 30 === 0) {
        // 보스 생존 시간 체크 (10분 후 사라짐)
        if (Date.now() - worldBoss.spawnTime > 600000) {
            io.emit('server_msg', { msg: `월드 보스 ${worldBoss.name}이(가) 사라졌습니다...`, type: 'danger' });
            if (monsters[worldBoss.id]) delete monsters[worldBoss.id];
            worldBoss = null;
        }
    }

    // 낮/밤 순환 (1초마다 체크)
    if (tickCounter % 30 === 0) {
        worldTime = Math.floor((Date.now() / 1000) % DAY_NIGHT_CYCLE);
        const wasNight = isNight;
        isNight = worldTime > DAY_NIGHT_CYCLE / 2; // 후반 5분 = 밤
        if (isNight && !wasNight) {
            io.emit('server_msg', { msg: '밤이 찾아왔습니다... 몬스터가 강해집니다! (ATK/HP +20%, EXP +20%)', type: 'danger' });
            io.emit('day_night', { isNight: true });
            // 밤: 모든 몬스터 ATK/HP 20% 증가
            for (const mId in monsters) {
                const m = monsters[mId];
                if (!m.nightBuffed) {
                    m.atk = Math.floor(m.atk * 1.2);
                    m.hp = Math.floor(m.hp * 1.2);
                    m.maxHp = Math.floor(m.maxHp * 1.2);
                    m.nightBuffed = true;
                }
            }
        } else if (!isNight && wasNight) {
            io.emit('server_msg', { msg: '날이 밝았습니다. 안전한 사냥을!', type: 'normal' });
            io.emit('day_night', { isNight: false });
            // 낮: 몬스터 원래 스탯 복구
            for (const mId in monsters) {
                const m = monsters[mId];
                if (m.nightBuffed) {
                    m.atk = Math.floor(m.atk / 1.2);
                    m.hp = Math.floor(m.hp / 1.2);
                    m.maxHp = Math.floor(m.maxHp / 1.2);
                    if (m.hp > m.maxHp) m.hp = m.maxHp;
                    m.nightBuffed = false;
                }
            }
        }
    }

    // 주간 랭킹 보상 체크 (1분마다)
    if (tickCounter % (30 * 60) === 0) {
        checkWeeklyRankingRewards();
    }

    // 시간대별 필드보스 스폰 (12:00, 20:00)
    if (tickCounter % (30 * 60) === 0) {
        const hour = new Date().getHours();
        if ((hour === 12 || hour === 20) && lastFieldBossHour !== hour) {
            lastFieldBossHour = hour;
            // 고급 사냥터에 엘리트 필드보스 3마리 추가 스폰
            const fieldBossZones = ['volcano','darkforest','graveyard'];
            for (const zId of fieldBossZones) {
                const zone = ZONES[zId];
                if (!zone) continue;
                entityIdCounter++;
                const fbId = 'fieldboss_' + entityIdCounter;
                monsters[fbId] = {
                    id: fbId, tier: 'boss',
                    name: '필드 보스 ' + zone.name,
                    x: zone.x + zone.w / 2, y: zone.y + zone.h / 2,
                    hp: 5000, maxHp: 5000, atk: 80, def: 40,
                    color: '#FF2222', isAlive: true, isFieldBoss: true,
                    element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
                    expReward: 1000, goldReward: 500,
                };
                io.emit('monster_spawn', monsters[fbId]);
            }
            io.emit('server_msg', { msg: `[필드 보스] ${hour}:00 - 필드 보스 3마리가 고급 사냥터에 출현!`, type: 'boss' });
        }
    }

    // 공성전 세금 수입 (5분마다 성 소유 혈맹에게 지급)
    if (tickCounter % (30 * 300) === 0 && castleOwner && clans[castleOwner]) {
        const ownerClan = clans[castleOwner];
        const taxGold = 500; // 5분마다 500G
        for (const mid of ownerClan.members) {
            const member = players[mid];
            if (member && member.isAlive) {
                member.gold += taxGold;
                io.to(mid).emit('combat_log', { msg: `[세금] 왕의 성 세금 수입 +${taxGold}G` });
            }
        }
        ownerClan.exp += 50; // 혈맹 경험치도
    }

    // 카르마 자연 감소 (매 분)
    if (tickCounter % (30 * 60) === 0) {
        for (let pId in players) {
            const p = players[pId];
            if (!p.isBot && p.karma > 0) {
                p.karma = Math.max(0, p.karma - KARMA.DECAY_PER_MIN);
                io.emit('player_update', p);
            }
        }
    }

    // 혈맹 전쟁 24시간 자동 종료 (1분마다 ���크)
    if (tickCounter % (30 * 60) === 0) {
        const now = Date.now();
        for (const [clanName, clan] of Object.entries(clans)) {
            if (clan.war && clan.war.endTime && now > clan.war.endTime) {
                const targetClan = clans[clan.war.target];
                io.emit('server_msg', { msg: `[혈맹 전쟁] ${clanName} vs ${clan.war.target} 전쟁 종료!`, type: 'normal' });
                if (targetClan && targetClan.war) targetClan.war = null;
                clan.war = null;
            }
        }
    }

    // 던전 인스턴스 타임아웃 (30분)
    if (tickCounter % (30 * 60) === 0) {
        const now = Date.now();
        for (const [instId, inst] of Object.entries(activeDungeons)) {
            if (now - inst.startTime > 1800000) {
                for (const pid of inst.players) {
                    if (players[pid]) {
                        players[pid].inDungeon = null;
                        io.to(pid).emit('dungeon_result', { msg: '던전 시간 초과! (30분)' });
                    }
                }
                delete activeDungeons[instId];
            }
        }
    }

    // 자동 골드 군대 소환 (200골드마다, 최대 30명)
    for (let pId in players) {
        const p = players[pId];
        if (!p.isBot && p.isAlive) {
            let myArmyCount = 0;
            for (let bId in players) {
                if (players[bId].isBot && players[bId].ownerId === pId
                    && players[bId].className !== 'GuardianTower' && players[bId].isAlive) {
                    myArmyCount++;
                }
            }

            let spawned = false;
            const maxArmy = p.maxArmy || 30;
            while (p.gold >= 200 && myArmyCount < maxArmy) {
                p.gold -= 200;
                createAutoArmy(pId);
                myArmyCount++;
                spawned = true;
            }
            if (spawned) {
                io.emit('player_update', p);
                savePlayer(p);
            }
        }
    }

    // 드롭 아이템 자동 줍기
    for (let dropId in drops) {
        const drop = drops[dropId];
        for (let pId in players) {
            const p = players[pId];
            if (!p.isAlive) continue;
            const dist = Math.hypot(p.x - drop.x, p.y - drop.y);
            if (dist < drop.pickupRadius) {
                // 봇이 주우면 주인에게
                let receiver = p;
                if (p.isBot && p.ownerId && players[p.ownerId]) {
                    receiver = players[p.ownerId];
                }
                receiver.gold += drop.gold;
                io.emit('player_update', receiver);
                io.emit('drop_destroy', dropId);
                delete drops[dropId];
                break;
            }
        }
    }

    updateBots();

    if (tickCounter % 15 === 0) handleAoeDamage();

    syncGameState();
}, TICK_TIME);

// ==========================================
// 봇 AI
// ==========================================

function updateBots() {
    for (let id in players) {
        const p = players[id];
        if (!p.isBot || !p.isAlive) continue;

        const cls = CLASSES[p.className];
        if (!cls) continue;

        let target = null;
        let minDist = 9999;

        // 우선순위 1: 지정된 타겟
        if (p.targetId && players[p.targetId] && players[p.targetId].isAlive) {
            target = players[p.targetId];
        } else {
            p.targetId = null;

            // 우선순위 2: 적 플레이어
            if (p.team !== 'peace') {
                for (let eId in players) {
                    const enemy = players[eId];
                    if (enemy.isAlive && enemy.team !== 'peace' && enemy.team !== p.team) {
                        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
                        const rangeLimit = (p.className === 'GuardianTower') ? 15 : 9999;
                        if (dist < minDist && dist <= rangeLimit) {
                            minDist = dist;
                            target = enemy;
                        }
                    }
                }
            }

            // 우선순위 3: 몬스터
            if (!target) {
                for (let mId in monsters) {
                    if (!monsters[mId].isAlive) continue;
                    const dist = Math.hypot(p.x - monsters[mId].x, p.y - monsters[mId].y);
                    const rangeLimit = (p.className === 'GuardianTower') ? 15 : 9999;
                    if (dist < minDist && dist <= rangeLimit) {
                        minDist = dist;
                        target = monsters[mId];
                    }
                }
            }
        }

        if (target) {
            const dx = target.x - p.x;
            const dy = target.y - p.y;
            const mag = Math.hypot(dx, dy);
            if (mag > 0) {
                p.dirX = dx / mag;
                p.dirY = dy / mag;
            }

            // 이동 (타워 제외) — 탈것 속도 적용
            if (cls.speed > 0) {
                let moveSpeed = cls.speed;
                // 탈것 속도 보너스 (본인 또는 오너)
                const speedOwner = p.ownerId ? players[p.ownerId] : p;
                if (speedOwner) {
                    const mountBonus = getMountSpeed(speedOwner);
                    moveSpeed *= (1 + mountBonus);
                    moveSpeed += (speedOwner.equipBonusSpd || 0);
                }
                p.x += p.dirX * (moveSpeed / 100);
                p.y += p.dirY * (moveSpeed / 100);
            }

            // 공격 확률 — 용병 공격 스타일별 분기
            const throwChance = (p.className === 'GuardianTower') ? 0.12 : 0.06;
            if (Math.random() < throwChance) {
                const atkStyle = p.attackStyle || 'melee';
                if (atkStyle === 'charge' && target && minDist < 4) {
                    // 돌진: 타겟에게 순간 접근 + 강타
                    const dx = target.x - p.x, dy = target.y - p.y;
                    const mag = Math.hypot(dx, dy);
                    if (mag > 1) { p.x += (dx/mag) * 2; p.y += (dy/mag) * 2; }
                    const chargeDmg = Math.floor((p.atk || 10) * 1.5 * (p.dmgMulti || 1));
                    if (target.hp !== undefined) {
                        target.hp -= chargeDmg;
                        if (target.id) io.emit('player_hit', { id: target.id, hp: target.hp, damage: chargeDmg, isCrit: false, skillName: '돌진' });
                    }
                } else if (atkStyle === 'aoe' && target && minDist < 5) {
                    // 광역: 주변 적에게 범위 데미지
                    const aoeDmg = Math.floor((p.atk || 10) * 0.8 * (p.dmgMulti || 1));
                    for (const [eid, enemy] of Object.entries(players)) {
                        if (eid === id || !enemy.isAlive || enemy.team === p.team) continue;
                        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < 3) {
                            enemy.hp -= aoeDmg;
                            if (enemy.id) io.emit('player_hit', { id: eid, hp: enemy.hp, damage: aoeDmg, isCrit: false, skillName: '광역' });
                        }
                    }
                    for (const mi in monsters) {
                        const mob = monsters[mi];
                        if (mob && mob.isAlive && Math.hypot(mob.x - p.x, mob.y - p.y) < 3) {
                            mob.hp -= aoeDmg;
                        }
                    }
                } else if (atkStyle === 'breath' && target && minDist < 8) {
                    // 브레스: 직선 범위 공격
                    const breathDmg = Math.floor((p.atk || 10) * 1.8 * (p.dmgMulti || 1));
                    const dx = target.x - p.x, dy = target.y - p.y;
                    const mag = Math.hypot(dx, dy);
                    if (mag > 0.1) {
                        const bdx = dx/mag, bdy = dy/mag;
                        for (const [eid, enemy] of Object.entries(players)) {
                            if (eid === id || !enemy.isAlive || enemy.team === p.team) continue;
                            const px = enemy.x - p.x, py = enemy.y - p.y;
                            const proj = px*bdx + py*bdy;
                            if (proj > 0 && proj < 6 && Math.abs(px*bdy - py*bdx) < 1.5) {
                                enemy.hp -= breathDmg;
                                if (enemy.id) io.emit('player_hit', { id: eid, hp: enemy.hp, damage: breathDmg, isCrit: false, skillName: '브레스' });
                            }
                        }
                    }
                } else {
                    // melee (기본): 투사체 발사
                    executeThrow(id);
                }
            }

            // 패시브 스킬 적용
            if (!p.skillCooldowns) p.skillCooldowns = {};
            if (!p.passiveApplied) p.passiveApplied = {};
            const baseClassName = p.baseClassName || p.className;
            const classSkills = SKILLS[baseClassName];
            if (classSkills) {
                for (const skill of classSkills) {
                    if (skill.type !== 'passive' || p.level < skill.level) continue;
                    // 어쌔신 - 독 바르기: 일반 공격 시 독 적용 (별도 처리 필요 없음, 투사체 적중 시 적용)
                    // 워리어 - 분노: HP 50% 이하 시 ATK 30% 증가
                    if (skill.atkBonus && skill.hpThreshold) {
                        if (p.hp < p.maxHp * skill.hpThreshold) {
                            if (!p.passiveApplied[skill.name]) {
                                p.passiveApplied[skill.name] = true;
                                p.passiveAtkBonus = skill.atkBonus;
                            }
                        } else {
                            if (p.passiveApplied[skill.name]) {
                                p.passiveApplied[skill.name] = false;
                                p.passiveAtkBonus = 0;
                            }
                        }
                    }
                    // 나이트 - 수호 오라: 주변 아군 DEF +15%
                    if (skill.allyDefMulti && skill.auraRange) {
                        for (const [aid, ally] of Object.entries(players)) {
                            if (aid === id || !ally.isAlive) continue;
                            if (ally.team !== p.team && !(ally.ownerId === p.ownerId || ally.ownerId === id || aid === p.ownerId)) continue;
                            const auraDist = Math.hypot(ally.x - p.x, ally.y - p.y);
                            if (auraDist <= skill.auraRange) {
                                ally.auraDefMulti = skill.allyDefMulti;
                            }
                        }
                    }
                }
            }

            // 스킬 자동 시전 (클래스별 액티브/궁극기)
            if (classSkills && target && minDist < 8) {
                for (const skill of classSkills) {
                    if (skill.type === 'passive') continue;
                    if (p.level < skill.level) continue;
                    // MP 체크
                    if (skill.mpCost && (p.mp || 0) < skill.mpCost) continue;
                    const lastUsed = p.skillCooldowns[skill.name] || 0;
                    if (Date.now() - lastUsed > skill.cooldown * 1000) {
                        p.skillCooldowns[skill.name] = Date.now();
                        // MP 소모
                        if (skill.mpCost) p.mp = Math.max(0, (p.mp || 0) - skill.mpCost);

                        // 은신 스킬 (버프만, 데미지 없음)
                        if (skill.stealth) {
                            applyBuff(p, 'stealth');
                            p.stealthNextAtkMulti = skill.nextAtkMulti || 2.0;
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'stealth' });
                            break;
                        }

                        // 전투 함성 (아군 버프)
                        if (skill.allyAtkMulti) {
                            for (const [aid, ally] of Object.entries(players)) {
                                if (!ally.isAlive) continue;
                                if (ally.team !== p.team && !(ally.ownerId === p.ownerId || ally.ownerId === id || aid === p.ownerId)) continue;
                                const buffDist = Math.hypot(ally.x - p.x, ally.y - p.y);
                                if (buffDist <= (skill.range || 6)) {
                                    applyBuff(ally, 'war_cry');
                                }
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'ally_buff' });
                            break;
                        }

                        // 도발 (주변 몬스터의 타겟을 자신으로 변경)
                        if (skill.taunt) {
                            let tauntCount = 0;
                            for (const monsterId in monsters) {
                                const mob = monsters[monsterId];
                                if (!mob.isAlive) continue;
                                const dist = Math.hypot(mob.x - p.x, mob.y - p.y);
                                if (dist <= (skill.range || 8)) {
                                    mob.tauntTarget = id;
                                    tauntCount++;
                                    // 3초 후 도발 해제
                                    setTimeout(() => {
                                        if (monsters[monsterId]) monsters[monsterId].tauntTarget = null;
                                    }, 3000);
                                }
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'aoe' });
                            io.to(id).emit('combat_log', { msg: `도발! ${tauntCount}마리 몬스터의 주의를 끌었다!` });
                            break;
                        }

                        // 철벽 방어 (자기 버프, 받는 데미지 70% 감소)
                        if (skill.dmgReduce) {
                            applyBuff(p, 'iron_wall');
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'self_buff' });
                            break;
                        }

                        // 신성한 방벽 (주변 아군 무적)
                        if (skill.allyInvincible) {
                            for (const [aid, ally] of Object.entries(players)) {
                                if (!ally.isAlive) continue;
                                if (ally.team !== p.team && !(ally.ownerId === p.ownerId || ally.ownerId === id || aid === p.ownerId)) continue;
                                const buffDist = Math.hypot(ally.x - p.x, ally.y - p.y);
                                if (buffDist <= (skill.range || 6)) {
                                    applyBuff(ally, 'divine_shield');
                                }
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'ally_invincible' });
                            break;
                        }

                        // 체인 라이트닝 (연쇄 타격)
                        if (skill.chainCount) {
                            let chainTarget = target;
                            const hitTargets = new Set();
                            for (let c = 0; c < skill.chainCount; c++) {
                                if (!chainTarget || hitTargets.has(chainTarget.id || chainTarget.idx)) break;
                                hitTargets.add(chainTarget.id || chainTarget.idx);
                                const chainDmg = Math.floor((p.atk || 10) * (skill.dmgMulti || 1) * (p.dmgMulti || 1));
                                chainTarget.hp -= chainDmg;
                                if (chainTarget.id) io.emit('player_hit', { id: chainTarget.id, hp: chainTarget.hp, damage: chainDmg, isCrit: true, skillName: skill.name });
                                // 다음 타겟 찾기
                                let nextTarget = null, nextDist = skill.chainRange || 4;
                                for (const [eid, enemy] of Object.entries(players)) {
                                    if (!enemy.isAlive || hitTargets.has(eid)) continue;
                                    if (enemy.team === p.team) continue;
                                    const d = Math.hypot(enemy.x - (chainTarget.x||0), enemy.y - (chainTarget.y||0));
                                    if (d < nextDist) { nextDist = d; nextTarget = enemy; }
                                }
                                if (!nextTarget) {
                                    for (let mi = 0; mi < monsters.length; mi++) {
                                        const m = monsters[mi];
                                        if (!m || hitTargets.has(mi)) continue;
                                        const d = Math.hypot(m.x - (chainTarget.x||0), m.y - (chainTarget.y||0));
                                        if (d < nextDist) { nextDist = d; nextTarget = m; }
                                    }
                                }
                                chainTarget = nextTarget;
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'chain' });
                            break;
                        }

                        // 일반 데미지 스킬
                        const atkValue = p.atk || 10;
                        const passiveBonus = p.passiveAtkBonus || 0;
                        const effectiveAtk = atkValue * (1 + passiveBonus);
                        let skillDmg = Math.floor(effectiveAtk * (skill.dmgMulti || 1) * (p.dmgMulti || 1));

                        // 은신 상태에서 공격 시 2배
                        if (p.stealthNextAtkMulti && p.activeBuffs && p.activeBuffs['stealth']) {
                            skillDmg = Math.floor(skillDmg * p.stealthNextAtkMulti);
                            removeBuff(p, 'stealth');
                            p.stealthNextAtkMulti = 0;
                        }

                        // 암살 스킬 - HP 30% 이하 적에게 처형 데미지
                        if (skill.executeThreshold && target.hp !== undefined && target.maxHp) {
                            if (target.hp / target.maxHp <= skill.executeThreshold) {
                                skillDmg = Math.floor(skillDmg * 2);
                            }
                        }

                        // 그림자 일격 - 크리티컬 확률 2배
                        if (skill.critBonus) {
                            const critRate = (CLASSES[baseClassName]?.critRate || 0.1) * 2;
                            if (Math.random() < critRate) skillDmg = Math.floor(skillDmg * 2);
                        }

                        // 다중 히트 (연속 베기)
                        const hitCount = skill.hits || 1;
                        for (let h = 0; h < hitCount; h++) {
                            if (target.hp !== undefined) {
                                target.hp -= skillDmg;
                                if (target.id) io.emit('player_hit', { id: target.id, hp: target.hp, damage: skillDmg, isCrit: true, skillName: skill.name });
                            }
                        }

                        // 어쌔신 독 바르기 패시브 - 스킬 적중 시 독 적용
                        const poisonPassive = classSkills.find(s => s.type === 'passive' && s.poisonDot);
                        if (poisonPassive && p.level >= poisonPassive.level && target.activeBuffs !== undefined) {
                            applyBuff(target, 'poison');
                        }

                        // 아이스 볼트 슬로우 적용
                        if (skill.slow && target.activeBuffs !== undefined) {
                            applyBuff(target, 'slow');
                        }

                        // 스턴 적용 (방패 강타)
                        if (skill.stun && target.activeBuffs !== undefined) {
                            applyBuff(target, 'stun');
                        }

                        // 버서커 버프 적용
                        if (skill.buff && skill.dmgMulti && skill.spdMulti) {
                            applyBuff(p, 'berserker');
                            if (skill.defPenalty) {
                                applyBuff(p, 'berserk_penalty');
                            }
                        }

                        // AOE 데미지 (광역 스킬)
                        if (skill.aoe && target) {
                            const aoeR = skill.aoeRadius || 3;
                            for (const [eid, enemy] of Object.entries(players)) {
                                if (eid === id || !enemy.isAlive || eid === (target.id || '')) continue;
                                if (enemy.team === p.team) continue;
                                const d = Math.hypot(enemy.x - target.x, enemy.y - target.y);
                                if (d <= aoeR) {
                                    enemy.hp -= skillDmg;
                                    if (enemy.id) io.emit('player_hit', { id: enemy.id, hp: enemy.hp, damage: skillDmg, isCrit: true, skillName: skill.name });
                                }
                            }
                            for (let mi = 0; mi < monsters.length; mi++) {
                                const m = monsters[mi];
                                if (!m || m === target) continue;
                                const d = Math.hypot(m.x - target.x, m.y - target.y);
                                if (d <= aoeR) {
                                    m.hp -= skillDmg;
                                }
                            }
                        }

                        io.emit('skill_effect', { casterId: id, skillName: skill.name, type: skill.aoe ? 'aoe' : 'single', targetX: target.x, targetY: target.y });
                        break; // 한 틱에 스킬 1개만
                    }
                }
            }

            // 주인과 거리 체크 → 너무 멀면 강제 복귀
            if (p.ownerId && players[p.ownerId] && cls.speed > 0) {
                const ownerDist = Math.hypot(p.x - players[p.ownerId].x, p.y - players[p.ownerId].y);
                if (ownerDist > 15) {
                    // 주인에게 강제 복귀 (타겟 포기)
                    target = null;
                    const owner = players[p.ownerId];
                    p.dirX = (owner.x - p.x) / ownerDist;
                    p.dirY = (owner.y - p.y) / ownerDist;
                    p.x += p.dirX * (cls.speed / 50); // 빠르게 복귀
                    p.y += p.dirY * (cls.speed / 50);
                }
            }

        } else if (cls.speed > 0) {
            // 주인 따라가기 (타겟 없을 때) — 탈것 속도 적용
            if (p.ownerId && players[p.ownerId] && players[p.ownerId].isAlive) {
                const owner = players[p.ownerId];
                const dx = owner.x - p.x;
                const dy = owner.y - p.y;
                const mag = Math.hypot(dx, dy);
                if (mag > 2.0) {
                    let followSpeed = cls.speed;
                    const mountBonus = getMountSpeed(owner);
                    followSpeed *= (1 + mountBonus);
                    p.dirX = dx / mag;
                    p.dirY = dy / mag;
                    p.x += p.dirX * (followSpeed / 100);
                    p.y += p.dirY * (cls.speed / 100);
                }
            }
        }
    }
}

// ==========================================
// 경험치 & 레벨업
// ==========================================

function giveExp(playerObj, amount) {
    let target = playerObj;
    if (playerObj.isBot && playerObj.ownerId && players[playerObj.ownerId]) {
        target = players[playerObj.ownerId];
    }

    // 파티 EXP 공유 (거리 10 이내 파티원에게 분배)
    if (target.partyId && parties[target.partyId]) {
        const party = parties[target.partyId];
        const nearbyMembers = party.members.filter(mid => {
            const m = players[mid];
            if (!m || !m.isAlive || mid === target.id) return false;
            return Math.hypot(m.x - target.x, m.y - target.y) <= 10;
        });
        if (nearbyMembers.length > 0) {
            const baseShare = Math.floor(amount * 0.8 / (nearbyMembers.length + 1));
            for (const mid of nearbyMembers) {
                const member = players[mid];
                if (member) {
                    // 레벨차 패널티: 20레벨 이상 차이 시 EXP 50% 감소
                    const lvlDiff = Math.abs(target.level - member.level);
                    const penalty = lvlDiff >= 20 ? 0.5 : lvlDiff >= 10 ? 0.8 : 1.0;
                    const shareAmount = Math.floor(baseShare * penalty);
                    member.exp += shareAmount;
                    const req = getExpRequired(member.level);
                    if (member.exp >= req) {
                        member.exp -= req;
                        member.level++;
                        member.maxHp += 25;
                        member.hp = member.maxHp;
                        member.dmgMulti += 0.08;
                        member.statPoints = (member.statPoints || 0) + 3;
                        io.emit('level_up', { id: member.id, level: member.level, className: member.displayName, statPoints: member.statPoints });
                        trackQuest(member, 'reach_level', 0);
                        savePlayer(member);
                    }
                    io.emit('player_update', member);
                }
            }
            amount = baseShare; // 본인도 분배 몫만 받음
        }
    }

    // 펫 EXP 보너스
    const petEffect = getPetEffect(target);
    if (petEffect && petEffect.effect === 'expBonus') amount = Math.floor(amount * (1 + petEffect.value));

    target.exp += amount;
    const required = getExpRequired(target.level);

    if (target.exp >= required && target.level < MAX_LEVEL) {
        target.exp -= required;
        target.level++;
        target.maxHp += 20;
        target.hp = target.maxHp;
        target.dmgMulti += 0.08;
        capResources(target);

        target.statPoints = (target.statPoints || 0) + 3; // 레벨업 시 스탯 3포인트
        io.emit('level_up', { id: target.id, level: target.level, className: target.displayName, statPoints: target.statPoints, maxHp: target.maxHp, atk: target.atk, def: target.def, maxExp: getExpRequired(target.level) });
        trackQuest(target, 'reach_level', 0);

        // Lv.20 전직 알림
        if (target.level === 20 && !target.isAdvanced) {
            io.to(target.id).emit('server_msg', { msg: '전직이 가능합니다! 메뉴에서 전직하세요.', type: 'rare' });
        }
        savePlayer(target);
    }
    io.emit('player_update', target);
}

// ==========================================
// 충돌 처리
// ==========================================

function handleCollisions() {
    for (const axeId in axes) {
        const axe = axes[axeId];
        const owner = players[axe.ownerId];
        if (!owner) continue;

        let axeDestroyed = false;

        // 몬스터 충돌
        for (const mId in monsters) {
            const mob = monsters[mId];
            if (!mob.isAlive) continue;

            const dx = axe.x - mob.x, dy = axe.y - mob.y;
            if (dx * dx + dy * dy < 1.0) {
                const { damage } = calcDamage(owner.atk || 10, mob.def, owner.dmgMulti, owner.critRate || 0.1, owner.element, mob.element);
                mob.hp -= damage;

                // 월드보스 기여도 추적
                if (mob.isWorldBoss && mob.damageContrib) {
                    let realOwnerId = (owner.isBot && owner.ownerId) ? owner.ownerId : owner.id;
                    mob.damageContrib[realOwnerId] = (mob.damageContrib[realOwnerId] || 0) + damage;
                    // 보스 HP 바 업데이트
                    if (tickCounter % 5 === 0) {
                        // 보스 페이즈 전환
                        const hpPct = mob.hp / mob.maxHp;
                        if (!mob._phase) mob._phase = 'normal';
                        if (hpPct <= 0.25 && mob._phase !== 'desperate') {
                            mob._phase = 'desperate';
                            mob.atk = Math.floor(mob.atk * 1.8);
                            mob.aiType = 'aoe';
                            io.emit('boss_phase', { id: mId, phase: 'desperate', msg: '보스가 필사적으로 발악합니다! ATK x1.8 + 광역 공격!' });
                            io.emit('server_msg', { msg: `[월드 보스] 필사 페이즈! ATK 대폭 증가!`, type: 'danger' });
                        } else if (hpPct <= 0.5 && mob._phase === 'normal') {
                            mob._phase = 'enrage';
                            mob.atk = Math.floor(mob.atk * 1.3);
                            mob.aiType = 'breath';
                            io.emit('boss_phase', { id: mId, phase: 'enrage', msg: '보스가 분노합니다! ATK x1.3 + 브레스!' });
                            io.emit('server_msg', { msg: `[월드 보스] 분노 페이즈! 브레스 공격 시작!`, type: 'danger' });
                        }
                        io.emit('world_boss_update', { id: mId, hp: mob.hp, maxHp: mob.maxHp, phase: mob._phase });
                    }
                }

                if (mob.hp <= 0) {
                    mob.isAlive = false;

                    // 월드보스 처치 시 기여도 기반 보상
                    if (mob.isWorldBoss) {
                        const totalDmg = Object.values(mob.damageContrib).reduce((s, d) => s + d, 0);
                        const sorted = Object.entries(mob.damageContrib).sort((a,b) => b[1] - a[1]);
                        io.emit('server_msg', { msg: `[월드 보스] ${mob.name} 처치 완료! MVP: ${players[sorted[0]?.[0]]?.displayName || '???'}`, type: 'boss' });

                        for (const [pid, dmg] of sorted) {
                            const p = players[pid];
                            if (!p) continue;
                            const ratio = dmg / totalDmg;
                            const goldReward = Math.floor(mob.goldReward * ratio * 2);
                            const expReward = Math.floor(mob.expReward * ratio * 2);
                            p.gold += goldReward;
                            giveExp(p, expReward);
                            // MVP (1위)에게 전설 재료 보너스
                            if (pid === sorted[0][0]) {
                                if (!p.inventory) p.inventory = {};
                                p.inventory['mat_dragon'] = (p.inventory['mat_dragon']||0) + 3;
                                io.to(pid).emit('combat_log', { msg: `MVP 보너스! 드래곤 비늘 x3, ${goldReward}G, ${expReward} EXP` });
                            } else {
                                io.to(pid).emit('combat_log', { msg: `월드 보스 보상: ${goldReward}G, ${expReward} EXP (기여 ${Math.floor(ratio*100)}%)` });
                            }
                            // 상위 기여자 장비 드롭 기회
                            if (ratio > 0.05 && Math.random() < ratio) {
                                const bossDrops = ['equip_sword_4','equip_armor_4','equip_ring_3','equip_neck_3'];
                                const dropItem = bossDrops[Math.floor(Math.random() * bossDrops.length)];
                                if (!p.inventory) p.inventory = {};
                                p.inventory[dropItem] = (p.inventory[dropItem]||0) + 1;
                                const eName = EQUIP_STATS[dropItem]?.name || dropItem;
                                io.to(pid).emit('combat_log', { msg: `${eName} 획득!` });
                                io.emit('server_msg', { msg: `${p.displayName}이(가) 월드 보스에서 ${eName} 획득!`, type: 'rare' });
                            }
                            io.emit('player_update', p);
                        }

                        worldBoss = null;
                        io.emit('world_boss_dead', { id: mId, name: mob.name });
                        delete monsters[mId];
                        destroyAxe(axeId);
                        axeDestroyed = true;
                        break;
                    }

                    const tier = MONSTER_TIERS[mob.tier];
                    // 존 스케일링된 보상 사용 (없으면 기본 티어 보상)
                    const mobExpReward = mob.expReward || tier.expReward;
                    const mobGoldReward = mob.goldReward || tier.goldReward;

                    let realOwner = (owner.isBot && owner.ownerId && players[owner.ownerId])
                        ? players[owner.ownerId] : owner;

                    // 존 보너스 + 혈맹 버프 + 장비 보너스 적용
                    let goldMulti = 1, expMulti = 1;
                    // 존 보너스 (몬스터가 위치한 존의 보너스)
                    const mobZone = mob.zoneId && ZONE_MONSTERS[mob.zoneId];
                    if (mobZone) {
                        goldMulti += mobZone.goldBonus || 0;
                        expMulti += mobZone.expBonus || 0;
                    }
                    // 혈맹 버프
                    if (realOwner.clanName && clans[realOwner.clanName]) {
                        const clanLv = clans[realOwner.clanName].level;
                        if (clanLv >= 5) goldMulti += CLAN_SKILLS[5].multi;
                        if (clanLv >= 3) expMulti += CLAN_SKILLS[3].multi;
                        clans[realOwner.clanName].exp += 1;
                    }
                    // 장비 보너스
                    goldMulti += (realOwner.equipGoldBonus || 0);
                    expMulti += (realOwner.equipExpBonus || 0);
                    // 밤 보너스 (+20% EXP)
                    if (isNight) expMulti += 0.2;
                    // 골드 피버 보너스 (해당 존 3배)
                    if (goldFeverZone && mob.zoneId === goldFeverZone && Date.now() < goldFeverEnd) {
                        goldMulti *= 3; expMulti *= 3;
                    }
                    // 킬 스트릭 보너스
                    if (!realOwner._killStreak) realOwner._killStreak = { count:0, lastTime:0 };
                    const ks = realOwner._killStreak;
                    const ksNow = Date.now();
                    if (ksNow - ks.lastTime < 10000) { ks.count++; } else { ks.count = 1; }
                    ks.lastTime = ksNow;
                    if (ks.count >= 100) { goldMulti *= 5; expMulti *= 5; }
                    else if (ks.count >= 50) { goldMulti *= 3; expMulti *= 3; }
                    else if (ks.count >= 25) { goldMulti *= 2; expMulti *= 2; }
                    else if (ks.count >= 10) { goldMulti *= 1.5; expMulti *= 1.5; }
                    // 스트릭 공지 (25/50/100)
                    if (ks.count === 25 || ks.count === 50 || ks.count === 100) {
                        io.emit('server_msg', { msg: `${realOwner.displayName}이(가) ${ks.count}킬 스트릭 달성!`, type: 'rare' });
                    }
                    if (ks.count % 10 === 0 && ks.count >= 10) {
                        io.to(realOwner.id).emit('kill_streak_bonus', { count: ks.count, multi: goldMulti });
                    }

                    realOwner.gold += Math.floor(mobGoldReward * goldMulti);
                    giveExp(owner, Math.floor(mobExpReward * expMulti));

                    // 변신 처치 카운트
                    if (!realOwner.morphKills) realOwner.morphKills = {};
                    if (mob.tier === 'normal') realOwner.morphKills['slime'] = (realOwner.morphKills['slime']||0) + 1;
                    if (mob.tier === 'elite') realOwner.morphKills['orc'] = (realOwner.morphKills['orc']||0) + 1;
                    if (mob.tier === 'rare') realOwner.morphKills['darkknight'] = (realOwner.morphKills['darkknight']||0) + 1;
                    if (mob.tier === 'boss' || mob.tier === 'legendary') realOwner.morphKills['dragon'] = (realOwner.morphKills['dragon']||0) + 1;

                    // 몬스터 도감 기록
                    if (!realOwner.bestiary) realOwner.bestiary = {};
                    if (!realOwner.bestiary[mob.name]) {
                        realOwner.bestiary[mob.name] = 1;
                        const discovered = Object.keys(realOwner.bestiary).length;
                        if (discovered === 10) { realOwner.gold += 500; io.to(realOwner.id).emit('combat_log', { msg: '도감 10종 달성! +500G' }); }
                        if (discovered === 25) { realOwner.gold += 1000; io.to(realOwner.id).emit('achievement_unlock', { name: '몬스터 학자', desc: '25종 처치', reward: {gold:1000} }); }
                        if (discovered === 50) { realOwner.gold += 5000; realOwner.diamonds = (realOwner.diamonds||0) + 100; io.to(realOwner.id).emit('achievement_unlock', { name: '도감 마스터', desc: '50종 처치', reward: {gold:5000, diamonds:100} }); }
                    } else {
                        realOwner.bestiary[mob.name]++;
                    }

                    // 트레저 고블린 처치 보상
                    if (mob.tier === 'treasure' && treasureGoblin) {
                        const zoneGold = (ZONE_MONSTERS[mob.zoneId]?.goldBonus || 0) + 1;
                        const goblinReward = Math.floor(500 * zoneGold);
                        realOwner.gold += goblinReward;
                        if (!realOwner.inventory) realOwner.inventory = {};
                        realOwner.inventory['mat_dragon'] = (realOwner.inventory['mat_dragon']||0) + 1;
                        io.emit('server_msg', { msg: `${realOwner.displayName}이(가) 보물 도깨비를 잡았다! +${goblinReward}G + 드래곤 비늘!`, type: 'boss' });
                        treasureGoblin = null;
                        nextTreasureTime = Date.now() + 180000 + Math.random() * 300000;
                    }

                    // 존 정복 킬 카운트
                    if (mob.zoneId && realOwner.clanName) {
                        if (!zoneConquest[mob.zoneId]) zoneConquest[mob.zoneId] = { kills: {}, lordClan: null };
                        const zc = zoneConquest[mob.zoneId].kills;
                        zc[realOwner.clanName] = (zc[realOwner.clanName] || 0) + 1;
                    }
                    // 존 정복 영주 보너스
                    if (mob.zoneId && zoneConquest[mob.zoneId]?.lordClan === realOwner.clanName) {
                        goldMulti += 0.15; expMulti += 0.15;
                    }

                    // 진영 킬 카운트
                    if (realOwner.faction && mob.zoneId) {
                        if (factionState[realOwner.faction]) {
                            factionState[realOwner.faction].kills++;
                            if (!factionState[realOwner.faction].zones[mob.zoneId]) factionState[realOwner.faction].zones[mob.zoneId] = 0;
                            factionState[realOwner.faction].zones[mob.zoneId]++;
                            realOwner.factionRep = (realOwner.factionRep || 0) + 1;
                        }
                        // 진영 보너스 (ATK/DEF는 recalcStats에서 적용, EXP만 여기서)
                        const fb = FACTIONS[realOwner.faction];
                        if (fb) {
                            if (fb.bonus === 'exp') expMulti += fb.bonusValue;
                        }
                    }

                    // 룬 드롭 (5% 확률)
                    if (Math.random() < 0.05) {
                        const runeKeys = Object.keys(RUNES);
                        const droppedRune = runeKeys[Math.floor(Math.random() * runeKeys.length)];
                        if (!realOwner.inventory) realOwner.inventory = {};
                        realOwner.inventory[droppedRune] = (realOwner.inventory[droppedRune]||0) + 1;
                        io.to(realOwner.id).emit('combat_log', { msg: `룬 [${droppedRune}] 획득!` });
                    }

                    // 유성우 존 보너스 (x2)
                    if (meteorShower && mob.zoneId === meteorShower.zoneId) {
                        goldMulti *= 2; expMulti *= 2;
                    }

                    // 현상금 처치 체크
                    if (!realOwner.isBot && realOwner._activeBounty) {
                        const bounty = realOwner._activeBounty;
                        // (이건 PvP 킬에서 처리 — 몬스터 킬과 무관)
                    }

                    // 전설 몬스터 처치 특별 보상
                    if (mob.tier === 'legendary') {
                        if (!realOwner.inventory) realOwner.inventory = {};
                        realOwner.inventory['mat_dragon'] = (realOwner.inventory['mat_dragon']||0) + 3;
                        realOwner.inventory['mat_soul'] = (realOwner.inventory['mat_soul']||0) + 5;
                        io.emit('server_msg', { msg: `${realOwner.displayName}이(가) ${mob.name}을(를) 처치! 전설 재료 획득!`, type: 'rare' });
                    }

                    // 퀘스트 추적
                    trackQuest(realOwner, 'kill_monster', 1);
                    if (mob.tier === 'elite' || mob.tier === 'rare' || mob.tier === 'boss' || mob.tier === 'legendary') trackQuest(realOwner, 'kill_elite', 1);
                    if (mob.tier === 'boss' || mob.tier === 'legendary') trackQuest(realOwner, 'kill_boss', 1);
                    trackQuest(realOwner, 'earn_gold', mobGoldReward);
                    // 실시간 퀘스트 진행도 알림 (가장 가까운 미완료 퀘스트)
                    if (!realOwner.isBot && realOwner.questProgress) {
                        for (const [qId, q] of Object.entries(QUESTS)) {
                            if ((q.type === 'daily' || q.type === 'main') && !(realOwner.questCompleted?.[qId])) {
                                const prog = realOwner.questProgress[qId] || 0;
                                if (prog > 0 && prog <= q.goal) {
                                    io.to(realOwner.id).emit('quest_progress', { name: q.name, current: Math.min(prog, q.goal), goal: q.goal, remaining: Math.max(0, q.goal - prog) });
                                    if (prog >= q.goal) {
                                        io.to(realOwner.id).emit('server_msg', { msg: `[퀘스트] "${q.name}" 완료! 보상을 수령하세요!`, type: 'rare' });
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    // 재료 드롭 (인벤토리에 직접 추가)
                    if (!realOwner.inventory) realOwner.inventory = {};
                    if (mob.tier === 'normal' && Math.random() < 0.3) realOwner.inventory['mat_iron'] = (realOwner.inventory['mat_iron']||0) + 1;
                    if (mob.tier === 'elite' && Math.random() < 0.4) realOwner.inventory['mat_magic'] = (realOwner.inventory['mat_magic']||0) + 1;
                    if (mob.tier === 'rare' && Math.random() < 0.3) realOwner.inventory['mat_soul'] = (realOwner.inventory['mat_soul']||0) + 1;
                    if (mob.tier === 'boss' && Math.random() < 0.2) realOwner.inventory['mat_dragon'] = (realOwner.inventory['mat_dragon']||0) + 1;
                    if (Math.random() < 0.15) realOwner.inventory['pot_hp_s'] = (realOwner.inventory['pot_hp_s']||0) + 1;

                    // 장��� 드롭 (등급별 확장)
                    const equipDrops = {
                        normal: [
                            { id:'equip_sword_1', rate:0.05 }, { id:'equip_armor_1', rate:0.05 },
                            { id:'equip_helm_1', rate:0.03 }, { id:'equip_glove_1', rate:0.03 },
                            { id:'equip_boots_1', rate:0.03 },
                        ],
                        elite: [
                            { id:'equip_sword_2', rate:0.08 }, { id:'equip_armor_2', rate:0.08 },
                            { id:'equip_helm_2', rate:0.05 }, { id:'equip_glove_2', rate:0.05 },
                            { id:'equip_boots_2', rate:0.05 }, { id:'equip_ring_1', rate:0.04 },
                            { id:'equip_neck_1', rate:0.03 },
                        ],
                        rare: [
                            { id:'equip_sword_3', rate:0.10 }, { id:'equip_armor_3', rate:0.10 },
                            { id:'equip_helm_3', rate:0.07 }, { id:'equip_glove_3', rate:0.07 },
                            { id:'equip_boots_3', rate:0.07 }, { id:'equip_ring_2', rate:0.05 },
                            { id:'equip_neck_2', rate:0.04 },
                        ],
                        boss: [
                            { id:'equip_sword_4', rate:0.04 }, { id:'equip_armor_4', rate:0.04 },
                            { id:'equip_sword_3', rate:0.15 }, { id:'equip_armor_3', rate:0.15 },
                            { id:'equip_ring_3', rate:0.05 }, { id:'equip_neck_3', rate:0.04 },
                            { id:'equip_sword_5', rate:0.01 }, { id:'equip_armor_5', rate:0.01 },
                        ],
                        legendary: [
                            { id:'equip_sword_5', rate:0.15 }, { id:'equip_armor_5', rate:0.15 },
                            { id:'equip_sword_4', rate:0.30 }, { id:'equip_armor_4', rate:0.30 },
                            { id:'equip_ring_3', rate:0.20 }, { id:'equip_neck_3', rate:0.15 },
                        ],
                    };
                    const drops = equipDrops[mob.tier] || [];
                    for (const d of drops) {
                        const effectiveRate = d.rate * (1 + (realOwner.dropRateBonus || 0));
                        if (Math.random() < effectiveRate) {
                            realOwner.inventory[d.id] = (realOwner.inventory[d.id]||0) + 1;
                            // 랜덤 옵션 생성 (등급에 따라)
                            const eqInfo = EQUIP_STATS[d.id];
                            if (eqInfo) {
                                const gradeInfo = GRADE_INFO[eqInfo.grade] || GRADE_INFO.normal;
                                if (gradeInfo.randomOpts > 0) {
                                    if (!realOwner.equipOptions) realOwner.equipOptions = {};
                                    realOwner.equipOptions[d.id] = generateRandomOptions(gradeInfo.randomOpts);
                                }
                            }
                            const eName = eqInfo?.name || d.id;
                            const gradeColor = GRADE_INFO[eqInfo?.grade]?.color || '#ccc';
                            io.to(realOwner.id).emit('combat_log', { msg: eName + ' 획득!', color: gradeColor });
                            if (mob.tier === 'boss' || eqInfo?.grade === 'epic' || eqInfo?.grade === 'legendary') {
                                io.emit('server_msg', { msg: `${realOwner.displayName}이(가) ${eName}을(를) 획득!`, type: 'rare' });
                            }
                            break;
                        }
                    }

                    // 골드 드롭
                    spawnDrop(mob.x, mob.y, Math.floor(mobGoldReward * 0.5), mId);

                    // 크리티컬 루트 (5% 확률 — 반짝이 드롭)
                    if (Math.random() < 0.05) {
                        const critDropId = 'crit_loot_' + (++entityIdCounter);
                        drops[critDropId] = {
                            id: critDropId, x: mob.x, y: mob.y, gold: 0,
                            type: 'critical_loot', spawnTime: Date.now(), pickupRadius: 5.0,
                        };
                        io.emit('drop_spawn', { ...drops[critDropId], isCritical: true });
                        io.to(realOwner.id).emit('critical_loot', { dropId: critDropId, x: mob.x, y: mob.y });
                        // 3초 후 소멸
                        setTimeout(() => { if (drops[critDropId]) { io.emit('drop_destroy', critDropId); delete drops[critDropId]; } }, 3000);
                    }

                    const goldEarned = Math.floor(mobGoldReward * goldMulti);
                    const expEarned = Math.floor(mobExpReward * expMulti);
                    const expPct = Math.floor((realOwner.exp / getExpRequired(realOwner.level)) * 100);
                    io.emit('monster_die', { id: mId, tier: mob.tier, killer: realOwner.id, zone: mob.zoneId, name: mob.name, goldEarned, expEarned, expPct });
                    io.emit('player_update', realOwner);

                    delete monsters[mId];
                    spawnMonster();
                    io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                } else {
                    io.emit('monster_hit', { id: mId, hp: mob.hp, damage, maxHp: mob.maxHp });
                }
                destroyAxe(axeId);
                axeDestroyed = true;
                break;
            }
        }

        if (axeDestroyed) continue;

        // 플레이어 충돌
        for (const targetId in players) {
            const target = players[targetId];
            if (targetId === axe.ownerId || !target.isAlive) continue;
            if (owner.team === 'peace' && target.team === 'peace') continue;
            if (owner.team === target.team) continue;
            // 안전지대 보호: 피격자가 마을 안에 있으면 공격 무효
            const targetZone = getZone(target.x, target.y);
            if (targetZone && ZONES[targetZone.id]?.safe) continue;
            // 공격자가 안전지대에서 공격하는 것도 차단
            const ownerZone = getZone(owner.x, owner.y);
            if (ownerZone && ZONES[ownerZone.id]?.safe) continue;

            // 회피 판정
            if (Math.random() < (target.dodgeRate || 0)) {
                io.to(targetId).emit('dodge_event', { attackerName: owner.displayName || '적' });
                continue;
            }

            const dx = axe.x - target.x, dy = axe.y - target.y;
            if (dx * dx + dy * dy < 0.6 * 0.6) {
                // 무적 상태 체크
                if (target.activeBuffs && target.activeBuffs['divine_shield']) {
                    destroyAxe(axeId);
                    break;
                }

                let { damage, isCrit } = calcDamage(
                    owner.atk || 10, target.def || 0, owner.dmgMulti, owner.critRate || 0.1, owner.element, target.element
                );

                // 철벽 방어 (데미지 감소) 체크
                if (target.activeBuffs && target.activeBuffs['iron_wall']) {
                    damage = Math.floor(damage * 0.3);
                }

                // 수호 오라 방어 보너스 체크
                if (target.auraDefMulti && target.auraDefMulti > 1) {
                    damage = Math.floor(damage / target.auraDefMulti);
                }

                // 은신 상태에서 공격 시 2배 데미지
                if (owner.stealthNextAtkMulti && owner.activeBuffs && owner.activeBuffs['stealth']) {
                    damage = Math.floor(damage * owner.stealthNextAtkMulti);
                    removeBuff(owner, 'stealth');
                    owner.stealthNextAtkMulti = 0;
                }

                target.hp -= damage;

                // 어쌔신 독 바르기 패시브 (일반 공격 시 독 적용)
                const ownerBaseClass = owner.baseClassName || owner.className;
                const ownerSkills = SKILLS[ownerBaseClass];
                if (ownerSkills) {
                    const poisonPassive = ownerSkills.find(s => s.type === 'passive' && s.poisonDot);
                    if (poisonPassive && (owner.level || 1) >= poisonPassive.level) {
                        if (!target.activeBuffs) target.activeBuffs = {};
                        applyBuff(target, 'poison');
                    }
                }

                io.emit('player_hit', {
                    id: targetId, hp: target.hp, damage, isCrit,
                    attackerClass: owner.displayName
                });

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
    for (const aoeId in aoes) {
        const aoe = aoes[aoeId];
        const owner = players[aoe.ownerId];
        if (!owner) continue;

        // 몬스터
        for (const mId in monsters) {
            const mob = monsters[mId];
            if (!mob.isAlive) continue;
            const dx = aoe.x - mob.x, dy = aoe.y - mob.y;
            if (dx * dx + dy * dy <= aoe.radius * aoe.radius) {
                const { damage } = calcDamage(owner.atk || 10, mob.def, owner.dmgMulti * 0.8, owner.critRate || 0.1, owner.element, mob.element);
                mob.hp -= damage;

                if (mob.hp <= 0) {
                    mob.isAlive = false;
                    const tier = MONSTER_TIERS[mob.tier];
                    let realOwner = (owner.isBot && owner.ownerId && players[owner.ownerId])
                        ? players[owner.ownerId] : owner;

                    realOwner.gold += tier.goldReward;
                    giveExp(owner, tier.expReward);
                    spawnDrop(mob.x, mob.y, Math.floor(tier.goldReward * 0.5), mId);

                    io.emit('monster_die', { id: mId, tier: mob.tier, killer: realOwner.id });
                    io.emit('player_update', realOwner);

                    delete monsters[mId];
                    spawnMonster();
                    io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                } else {
                    io.emit('monster_hit', { id: mId, hp: mob.hp, damage, maxHp: mob.maxHp });
                }
            }
        }

        // 플레이어
        for (const targetId in players) {
            const target = players[targetId];
            if (!target.isAlive || targetId === aoe.ownerId) continue;
            if (owner.team === 'peace' && target.team === 'peace') continue;
            if (owner.team === target.team) continue;
            // 안전지대 보호
            const tgtZ = getZone(target.x, target.y);
            if (tgtZ && ZONES[tgtZ.id]?.safe) continue;
            // 무적 체크
            if (target.activeBuffs && target.activeBuffs['divine_shield']) continue;
            // 회피 판정
            if (Math.random() < (target.dodgeRate || 0)) continue;

            const dx = aoe.x - target.x, dy = aoe.y - target.y;
            if (dx * dx + dy * dy <= aoe.radius * aoe.radius) {
                let { damage } = calcDamage(owner.atk || 10, target.def || 0, owner.dmgMulti * 0.6, owner.critRate || 0.1, owner.element, target.element);
                // 철벽 방어 데미지 감소
                if (target.activeBuffs && target.activeBuffs['iron_wall']) damage = Math.floor(damage * 0.3);
                // 수호 오라 방어 보너스
                if (target.auraDefMulti && target.auraDefMulti > 1) damage = Math.floor(damage / target.auraDefMulti);
                target.hp -= damage;

                io.emit('player_hit', { id: targetId, hp: target.hp, damage, isCrit: false });
                alertArmy(targetId, aoe.ownerId);

                if (target.hp <= 0) {
                    handlePlayerDeath(target, targetId, owner, aoe.ownerId);
                }
            }
        }
    }
}

// ==========================================
// 사망 처리 (PK 카르마 시스템)
// ==========================================

function handlePlayerDeath(target, targetId, owner, attackerId) {
    // 자동 부활 체크 (펫 + 프레스티지)
    if (!target.isBot) {
        const petEff = getPetEffect(target);
        const hasLegacyRevive = target.legacyPerks?.some(pk => pk.stat === 'autoRevive');
        const canRevive = (petEff && petEff.effect === 'autoRevive') || hasLegacyRevive;
        if (canRevive) {
            const now = Date.now();
            if (!target.lastAutoRevive || now - target.lastAutoRevive > 600000) {
                target.lastAutoRevive = now;
                const reviveHp = hasLegacyRevive ? 0.1 : 0.5; // 프레스티지: 10%, 펫: 50%
                target.hp = Math.floor(target.maxHp * Math.max(reviveHp, petEff?.effect === 'autoRevive' ? 0.5 : 0));
                if (target.hp < 1) target.hp = 1;
                const source = (petEff?.effect === 'autoRevive') ? '천사 펫' : '환생 특성';
                io.to(targetId).emit('combat_log', { msg: `${source}이(가) 당신을 부활시켰습니다! (HP ${Math.floor(target.hp/target.maxHp*100)}%)` });
                io.emit('player_update', target);
                return;
            }
        }
    }

    target.isAlive = false;

    let realKiller = owner;
    if (owner.isBot && owner.ownerId && players[owner.ownerId]) {
        realKiller = players[owner.ownerId];
    }

    // 아레나 매치 종료 체크
    if (target.arenaMatchId && arenaMatches[target.arenaMatchId]) {
        const match = arenaMatches[target.arenaMatchId];
        const winnerId = (match.player1 === targetId) ? match.player2 : match.player1;
        target.isAlive = true; // 아레나에서는 실제 사망 안함
        target.hp = 1;
        endArenaMatch(target.arenaMatchId, winnerId, targetId, 'KO');
        return; // 아레나는 별도 처리, 일반 사망 로직 스킵
    }

    realKiller.killCount++;
    if (!target.isBot) {
        realKiller.pvpWins = (realKiller.pvpWins || 0) + 1;
        trackQuest(realKiller, 'pvp_win', 1);
        trackQuest(realKiller, 'pvp_fight', 1);
        checkTitles(realKiller);
        // 현상금 처치 보상
        if (realKiller._activeBounty && realKiller._activeBounty.targetId === targetId) {
            const bounty = realKiller._activeBounty;
            realKiller.gold += bounty.reward;
            realKiller.diamonds = (realKiller.diamonds||0) + 50;
            realKiller._activeBounty = null;
            io.emit('server_msg', { msg: `[현상금] ${realKiller.displayName}이(가) ${target.displayName}의 현상금을 수령! +${bounty.reward}G +50D`, type: 'rare' });
            io.to(realKiller.id).emit('bounty_result', { msg: `현상금 완료! +${bounty.reward}G +50D` });
        }
        // 카오틱 상자 드롭
        if ((target.karma||0) >= 200) {
            const chestGold = Math.floor(target.gold * 0.2);
            let chestItem = null;
            if (target.equipped) {
                const slots = Object.keys(target.equipped).filter(s => target.equipped[s]);
                if (slots.length > 0) {
                    const rSlot = slots[Math.floor(Math.random() * slots.length)];
                    chestItem = target.equipped[rSlot];
                    delete target.equipped[rSlot];
                    recalcStats(target);
                }
            }
            const chestId = 'chaotic_chest_' + (++entityIdCounter);
            drops[chestId] = {
                id: chestId, x: target.x, y: target.y,
                gold: chestGold, item: chestItem, spawnTime: Date.now(), pickupRadius: 3.0,
                type: 'chaotic_chest'
            };
            setTimeout(() => { if (drops[chestId]) { io.emit('drop_destroy', chestId); delete drops[chestId]; } }, 30000);
            io.emit('drop_spawn', drops[chestId]);
            io.emit('server_msg', { msg: `[카오틱 상자] ${target.displayName}의 상자가 ${getZone(target.x,target.y)?.id||'필드'}에 나타났다!`, type: 'danger' });
        }
    }

    // ── PK 카르마 판정 ──
    let isPK = false;
    // 혈맹 전쟁 중이면 PK 페널티 없음
    const killerClan = realKiller.clanName && clans[realKiller.clanName];
    const targetClan = target.clanName && clans[target.clanName];
    const inClanWar = killerClan?.war?.target === target.clanName || targetClan?.war?.target === realKiller.clanName;

    if (!target.isBot && target.team === 'peace' && !inClanWar) {
        // 평화 모드 유저를 죽이면 PK (혈맹 전쟁 중 제외)
        isPK = true;
        realKiller.karma += KARMA.PK_PENALTY;
        io.emit('pk_alert', {
            killerId: realKiller.id,
            killerName: realKiller.displayName,
            victimId: targetId,
            karma: realKiller.karma
        });
        io.emit('server_msg', { msg: `${realKiller.displayName}이(가) PK! 카르마: ${realKiller.karma}`, type: 'danger' });
    }

    // 카오틱 처치 시 보너스 보상
    let goldReward = 50;
    let expReward = 30;
    if (target.karma >= KARMA.CHAOTIC_THRESHOLD) {
        goldReward = Math.floor(goldReward * KARMA.BOUNTY_BONUS);
        expReward = Math.floor(expReward * KARMA.BOUNTY_BONUS);
    }

    realKiller.gold += goldReward;
    giveExp(realKiller, expReward);

    // 왕의 5% 병사 탈취
    let stolen = false;
    if (realKiller.isKing && Math.random() < 0.05) {
        stolen = true;
        createBot(target, realKiller.team, realKiller.id);
    }

    // ── 카오틱 사망 페널티 ──
    if (target.karma >= KARMA.CHAOTIC_THRESHOLD) {
        const goldLoss = Math.floor(target.gold * KARMA.DEATH_GOLD_LOSS);
        const expLoss = Math.floor(target.exp * KARMA.DEATH_EXP_LOSS);
        target.gold = Math.max(0, target.gold - goldLoss);
        target.exp = Math.max(0, target.exp - expLoss);

        io.emit('chaotic_death_penalty', {
            playerId: targetId,
            goldLoss,
            expLoss,
            karma: target.karma
        });
    }

    // 사망 패널티 (알비온 스타일 — 약탈)
    const expLoss = Math.floor(getExpRequired(target.level) * 0.1);
    target.exp = Math.max(0, (target.exp || 0) - expLoss);

    // 인벤토리 아이템 30% 드롭 (약탈 가능)
    if (target.inventory && !target.isBot) {
        const droppedItems = [];
        for (const [itemId, qty] of Object.entries(target.inventory)) {
            const dropQty = Math.floor(qty * 0.3);
            if (dropQty > 0) {
                target.inventory[itemId] -= dropQty;
                if (target.inventory[itemId] <= 0) delete target.inventory[itemId];
                // 킬러에게 전달
                if (!realKiller.inventory) realKiller.inventory = {};
                realKiller.inventory[itemId] = (realKiller.inventory[itemId] || 0) + dropQty;
                droppedItems.push(itemId + ' x' + dropQty);
            }
        }
        if (droppedItems.length > 0) {
            io.emit('server_msg', { msg: `${realKiller.displayName}이(가) ${target.displayName}에게서 아이템 약탈!`, type: 'danger' });
        }
    }

    // 골드 50% 약탈
    if (!target.isBot && target.gold > 0) {
        const goldDrop = Math.floor(target.gold * 0.5);
        target.gold -= goldDrop;
        realKiller.gold += goldDrop;
        io.to(realKiller.id).emit('combat_log', { msg: `${goldDrop}G 약탈!` });
    }

    if (target.karma >= KARMA.CHAOTIC_THRESHOLD) {
        target.level = Math.max(1, target.level - 1);
        target.exp = 0;
    }
    target.killCount = 0;
    target.team = 'peace';
    target.isKing = false;
    target.targetId = null;

    // 군대 소멸
    for (let bId in players) {
        if (players[bId].isBot && players[bId].ownerId === targetId) {
            players[bId].isAlive = false;
            io.emit('player_die', { victimId: bId, attackerId, stolen: false });
            delete players[bId];
        }
    }

    savePlayer(target);
    savePlayer(realKiller);

    io.emit('player_update', target);
    io.emit('player_update', realKiller);
    io.emit('player_die', {
        victimId: targetId, attackerId, stolen, isPK,
        killerName: realKiller.displayName || '몬스터',
        killerClass: realKiller.className || '',
        killerLevel: realKiller.level || 0,
        victimLevel: target.level || 0,
        goldLost: Math.floor((target._deathGoldLost || 0)),
    });
}

function destroyAxe(axeId) {
    if (axes[axeId]) {
        clearTimeout(axes[axeId].timer);
        io.emit('axe_destroy', axeId);
        delete axes[axeId];
    }
}

// ==========================================
// 동기화
// ==========================================

function syncGameState() {
    if (Object.keys(players).length === 0) return;

    const syncData = { players: {}, monsters: {} };

    for (const pId in players) {
        if (players[pId].isAlive) {
            const zone = getZone(players[pId].x, players[pId].y);
            syncData.players[pId] = {
                x: players[pId].x,
                y: players[pId].y,
                gold: players[pId].gold,
                hp: players[pId].hp,
                karma: players[pId].karma,
                zone: zone.id,
                diamonds: players[pId].diamonds || 0,
                skin: players[pId].activeSkin,
                exp: players[pId].exp || 0,
                maxExp: getExpRequired(players[pId].level),
                mp: players[pId].mp || 0,
                maxMp: players[pId].maxMp || 100,
                maxHp: players[pId].maxHp || 100,
                level: players[pId].level || 1,
                killCount: players[pId].killCount || 0
            };
        }
    }
    for (const mId in monsters) {
        const m = monsters[mId];
        syncData.monsters[mId] = { x: m.x, y: m.y, name: m.name, tier: m.tier, element: m.element, hp: m.hp, maxHp: m.maxHp, aiType: m.aiType };
    }

    syncData.isNight = isNight;
    syncData.weather = currentWeather.id;
    syncData.worldTime = worldTime;
    io.volatile.emit('sync', syncData);

    // 개별 소켓에 버프 상태 전송 (5틱마다 = ~166ms)
    if (tickCounter % 5 === 0) {
        for (const pId in players) {
            const p = players[pId];
            if (p.isBot || !p.isAlive || !p.activeBuffs) continue;
            const buffs = [];
            const now = Date.now();
            for (const [bId, buff] of Object.entries(p.activeBuffs)) {
                const remaining = Math.max(0, Math.ceil((buff.endTime - now) / 1000));
                if (remaining > 0) {
                    buffs.push({ id: bId, name: buff.name, remaining, icon: buff.icon || 'buff' });
                }
            }
            if (buffs.length > 0 || p.lastBuffCount > 0) {
                io.to(pId).emit('buff_status', buffs);
                p.lastBuffCount = buffs.length;
            }
        }
    }
}
