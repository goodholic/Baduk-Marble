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
const { BUFF_TYPES, applyBuff, removeBuff, updateBuffs, getBuffedStat, isStunned, TITLES, checkTitles } = require('./game/buff');
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
            ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP']
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

    try {
        await pool.query(`
            INSERT INTO players_save (device_id, class_name, level, exp, gold, kill_count, karma, team, is_alive, army_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            class_name=VALUES(class_name), level=VALUES(level), exp=VALUES(exp),
            gold=VALUES(gold), kill_count=VALUES(kill_count), karma=VALUES(karma),
            team=VALUES(team), is_alive=VALUES(is_alive), army_data=VALUES(army_data)
        `, [player.deviceId, player.className, player.level, player.exp,
            player.gold, player.killCount, player.karma, player.team,
            player.isAlive, JSON.stringify(myArmy)]);
    } catch (error) {
        console.error("[DB] Save Error:", error);
    }
}

// ==========================================
// 맵 존 시스템
// ==========================================
// 맵 200x200 (-100 ~ 100)
const ZONES = {
    // 마을 (안전지대, NPC 있음)
    village:    { name:'아덴 마을',     x:-100, y:-100, w:30, h:30, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이','힐러','낚시꾼','요리사'] },
    port_town:  { name:'항구 마을',     x:60,   y:-100, w:25, h:25, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','항해사','낚시꾼'] },
    // 사냥터
    forest:     { name:'엘프숲',       x:-70,  y:-60,  w:40, h:30, lvl:[1,10],  safe:false, bg:'map_forest' },
    plains:     { name:'말하는 섬 평원', x:-30,  y:-60,  w:40, h:30, lvl:[5,15],  safe:false, bg:'map_plains' },
    swamp:      { name:'독안개 늪지',   x:10,   y:-60,  w:30, h:30, lvl:[10,20], safe:false, bg:'map_forest' },
    desert:     { name:'사막 황야',     x:40,   y:-60,  w:40, h:25, lvl:[15,25], safe:false, bg:'map_plains' },
    dungeon:    { name:'어둠의 동굴',   x:-70,  y:-20,  w:30, h:30, lvl:[15,30], safe:false, bg:'map_dungeon' },
    graveyard:  { name:'잊혀진 묘지',   x:-40,  y:-20,  w:30, h:25, lvl:[20,35], safe:false, bg:'map_dungeon' },
    volcano:    { name:'화산 지대',     x:20,   y:-20,  w:35, h:30, lvl:[25,40], safe:false, bg:'map_dragon' },
    dragon:     { name:'드래곤 둥지',   x:55,   y:-20,  w:30, h:25, lvl:[30,99], safe:false, bg:'map_dragon' },
    chaos:      { name:'죽음의 협곡',   x:-50,  y:20,   w:40, h:30, lvl:[20,99], safe:false, bg:'map_chaos' },
    abyss:      { name:'심연',         x:10,   y:20,   w:35, h:30, lvl:[35,99], safe:false, bg:'map_chaos' },
    // 성 (공성전)
    castle:     { name:'왕의 성',      x:-20,  y:55,   w:40, h:35, lvl:[20,99], safe:false, bg:'map_dungeon', isCastle:true },
    // 낚시터
    fishing:    { name:'은빛 호수',     x:50,   y:50,   w:30, h:30, lvl:[1,99],  safe:true,  bg:'map_village', isFishing:true },
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
    'goods_silk':    { name:'비단',     basePrice: 100 },
    'goods_iron':    { name:'철광석',    basePrice: 50 },
    'goods_herb':    { name:'약초',     basePrice: 30 },
    'goods_gem':     { name:'보석',     basePrice: 200 },
    'goods_wood':    { name:'목재',     basePrice: 40 },
    'goods_leather': { name:'가죽',     basePrice: 60 },
    'goods_spice':   { name:'향신료',    basePrice: 150 },
    'goods_potion':  { name:'물약 원료', basePrice: 80 },
};

let townPrices = {};
function updateTownPrices() {
    const towns = ['village', 'port_town'];
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
const TAME_COST = 50;

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
    'equip_sword_1':  { name:'철제 검',      category:'장비', basePrice: 200 },
    'equip_sword_2':  { name:'강철 검',      category:'장비', basePrice: 800 },
    'equip_armor_1':  { name:'가죽 갑옷',    category:'장비', basePrice: 150 },
    'equip_armor_2':  { name:'철판 갑옷',    category:'장비', basePrice: 700 },
    'equip_ring_1':   { name:'힘의 반지',    category:'장비', basePrice: 500 },
};

// ==========================================
// 게임 상수 & 클래스 정의 (리니지 라이크)
// ==========================================

const players = {};

// ==========================================
// 퀘스트 시스템
// ==========================================
const QUESTS = {
    daily_hunt:    { name:'일일 사냥', desc:'몬스터 30마리 처치', target:'kill_monster', goal:30, reward:{gold:300,exp:500,diamonds:5}, type:'daily' },
    daily_elite:   { name:'엘리트 토벌', desc:'엘리트 이상 몬스터 5마리', target:'kill_elite', goal:5, reward:{gold:500,exp:800,diamonds:10}, type:'daily' },
    daily_gold:    { name:'골드 수집', desc:'골드 500 획득', target:'earn_gold', goal:500, reward:{gold:200,exp:300,diamonds:5}, type:'daily' },
    main_lv5:      { name:'성장의 시작', desc:'레벨 5 달성', target:'reach_level', goal:5, reward:{gold:500,diamonds:30}, type:'main' },
    main_lv10:     { name:'전사의 길', desc:'레벨 10 달성', target:'reach_level', goal:10, reward:{gold:1000,diamonds:50}, type:'main' },
    main_lv20:     { name:'영웅의 각성', desc:'레벨 20 달성', target:'reach_level', goal:20, reward:{gold:3000,diamonds:100}, type:'main' },
    main_boss:     { name:'드래곤 슬레이어', desc:'보스 몬스터 처치', target:'kill_boss', goal:1, reward:{gold:5000,diamonds:80}, type:'main' },
    main_pvp:      { name:'PvP 입문', desc:'PvP 모드로 전환', target:'toggle_pvp', goal:1, reward:{gold:1000,diamonds:30}, type:'main' },
    main_army:     { name:'군단장', desc:'용병 10명 보유', target:'army_count', goal:10, reward:{gold:2000,diamonds:50}, type:'main' },
};

// ==========================================
// 스킬 시스템
// ==========================================
const SKILLS = {
    Assassin: [
        { name:'그림자 일격', dmgMulti:3.0, cooldown:5, range:3, aoe:false, level:1 },
        { name:'연속 베기', dmgMulti:1.5, hits:4, cooldown:8, range:2, aoe:false, level:5 },
        { name:'암살', dmgMulti:8.0, cooldown:60, range:2, aoe:false, level:15, executeThreshold:0.3 },
    ],
    Warrior: [
        { name:'파워 스트라이크', dmgMulti:2.5, cooldown:4, range:4, aoe:false, level:1 },
        { name:'회전 베기', dmgMulti:2.0, cooldown:6, range:3, aoe:true, level:5 },
        { name:'버서커', dmgMulti:2.0, spdMulti:1.5, cooldown:90, duration:15, level:15, buff:true },
    ],
    Knight: [
        { name:'방패 강타', dmgMulti:2.0, cooldown:6, range:3, aoe:false, level:1, stun:1 },
        { name:'도발', cooldown:10, range:8, aoe:true, level:5, taunt:true },
        { name:'철벽 방어', cooldown:15, duration:5, level:15, buff:true, defMulti:0.3 },
    ],
    Mage: [
        { name:'파이어볼', dmgMulti:3.0, cooldown:3, range:6, aoe:true, level:1 },
        { name:'아이스 볼트', dmgMulti:2.0, cooldown:5, range:5, aoe:false, level:5, slow:0.5 },
        { name:'메테오', dmgMulti:10.0, cooldown:90, range:8, aoe:true, level:15, aoeRadius:4 },
    ],
};

// ==========================================
// 장비 시스템
// ==========================================
const EQUIPMENT_SLOTS = ['weapon','armor','helmet','gloves','boots','ring','necklace'];

const EQUIP_STATS = {
    'equip_sword_1':  { slot:'weapon', name:'철제 검',   atk:10, def:0, grade:'normal' },
    'equip_sword_2':  { slot:'weapon', name:'강철 검',   atk:25, def:0, grade:'uncommon' },
    'equip_armor_1':  { slot:'armor',  name:'가죽 갑옷', atk:0, def:10, grade:'normal' },
    'equip_armor_2':  { slot:'armor',  name:'철판 갑옷', atk:0, def:25, grade:'uncommon' },
    'equip_ring_1':   { slot:'ring',   name:'힘의 반지', atk:8, def:3, grade:'uncommon' },
};

// ==========================================
// 낮/밤 순환 (10분 주기)
// ==========================================
const DAY_NIGHT_CYCLE = 600; // 10분 = 600초
let worldTime = 0; // 0~599
let isNight = false;

// ==========================================
// 전직 시스템 (Lv.20)
// ==========================================
const CLASS_ADVANCE = {
    Assassin:  { name: 'ShadowLord',  displayName: '쉐도우로드', bonusAtk: 20, bonusCrit: 0.1, bonusSpeed: 5 },
    Warrior:   { name: 'Warlord',     displayName: '워로드',     bonusAtk: 15, bonusDef: 15, bonusHp: 100 },
    Knight:    { name: 'HolyKnight',  displayName: '홀리나이트', bonusDef: 25, bonusHp: 200, bonusDodge: 0.05 },
    Mage:      { name: 'Archmage',    displayName: '아크메이지', bonusAtk: 30, bonusCrit: 0.15 },
};

// ==========================================
// 속성 시스템
// ==========================================
const ELEMENTS = ['fire', 'water', 'wind', 'earth'];
const ELEMENT_BONUS = { fire: 'water', water: 'wind', wind: 'earth', earth: 'fire' }; // 상성

// ==========================================
// 혈맹(클랜) 시스템
// ==========================================
let clans = {}; // { clanName: { leader, members:[], level, exp, emblem } }

// ==========================================
// 파티 시스템
// ==========================================
let parties = {}; // { partyId: { leader, members:[], name } }
let partyIdCounter = 0;

// 랭킹
let rankings = { level:[], pvp:[], gold:[] };

function recalcStats(p) {
    if (!p || p.isBot) return;
    const cls = CLASSES[p.className];
    if (!cls) return;
    let bonusAtk = 0, bonusDef = 0;
    if (p.equipped) {
        for (const slot of EQUIPMENT_SLOTS) {
            const eqId = p.equipped[slot];
            if (eqId && EQUIP_STATS[eqId]) {
                bonusAtk += EQUIP_STATS[eqId].atk;
                bonusDef += EQUIP_STATS[eqId].def;
            }
        }
    }
    p.atk = cls.atk + bonusAtk;
    p.def = cls.def + bonusDef;
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
    const realPlayers = Object.values(players).filter(p => !p.isBot && p.isAlive);
    rankings.level = realPlayers.sort((a,b) => b.level - a.level).slice(0,10).map(p => ({
        name: p.displayName, level: p.level, className: p.className
    }));
    rankings.pvp = realPlayers.sort((a,b) => b.killCount - a.killCount).slice(0,10).map(p => ({
        name: p.displayName, kills: p.killCount, className: p.className
    }));
    rankings.gold = realPlayers.sort((a,b) => b.gold - a.gold).slice(0,10).map(p => ({
        name: p.displayName, gold: p.gold, className: p.className
    }));
}
let axes = {};
let aoes = {};
let monsters = {};
let drops = {}; // 드롭 아이템

let entityIdCounter = 0;
const MAX_PLAYERS = 50;
const MAX_MONSTERS = 80; // 넓은 맵에 몬스터 대량 배치
let hasKing = false;

// ── 클래스 정의 (판타지 RPG) ──
const CLASSES = {
    'Assassin': {
        displayName: '어쌔신',
        maxHp: 120, atk: 45, def: 8,  speed: 22,
        critRate: 0.25, dodgeRate: 0.15,
        aoe: false, projSpeed: 45, projLife: 80,
        desc: '빠른 속도와 높은 크리티컬로 적을 암살',
        autoSkill: 'shadowStrike' // 그림자 일격: 일정 확률로 2배 데미지
    },
    'Warrior': {
        displayName: '워리어',
        maxHp: 180, atk: 30, def: 15, speed: 12,
        critRate: 0.10, dodgeRate: 0.05,
        aoe: false, projSpeed: 18, projLife: 1200,
        desc: '균형 잡힌 공방, 안정적인 전투력',
        autoSkill: 'powerStrike' // 파워 스트라이크: 공격력 1.5배 일격
    },
    'Knight': {
        displayName: '나이트',
        maxHp: 300, atk: 15, def: 30, speed: 10,
        critRate: 0.05, dodgeRate: 0.02,
        aoe: false, projSpeed: 14, projLife: 800,
        desc: '철벽 방어, 아군을 지키는 탱커',
        autoSkill: 'shieldBash' // 방패 강타: 적 스턴 + 데미지
    },
    'Mage': {
        displayName: '메이지',
        maxHp: 90, atk: 10, def: 5,  speed: 9,
        critRate: 0.15, dodgeRate: 0.10,
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
        name: '슬라임', hp: 60, atk: 5, def: 2,
        expReward: 15, goldReward: 8, color: '#88cc88',
        spawnWeight: 60
    },
    elite: {
        name: '오크 전사', hp: 200, atk: 15, def: 8,
        expReward: 50, goldReward: 30, color: '#ccaa44',
        spawnWeight: 25
    },
    rare: {
        name: '다크 나이트', hp: 500, atk: 30, def: 15,
        expReward: 120, goldReward: 80, color: '#aa44cc',
        spawnWeight: 10
    },
    boss: {
        name: '드래곤', hp: 2000, atk: 60, def: 30,
        expReward: 500, goldReward: 300, color: '#ff4444',
        spawnWeight: 5
    }
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
    return Math.floor(100 * Math.pow(1.15, level - 1));
}

// ── 방어력 기반 데미지 계산 ──
function calcDamage(atk, def, dmgMulti, critRate) {
    let isCrit = Math.random() < critRate;
    let baseDmg = Math.max(1, atk * dmgMulti - def * 0.5);
    if (isCrit) baseDmg *= 2.0;
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

function spawnMonster() {
    entityIdCounter++;
    const mId = 'monster_' + entityIdCounter;
    const tierKey = pickMonsterTier();
    const tier = MONSTER_TIERS[tierKey];

    monsters[mId] = {
        id: mId,
        tier: tierKey,
        name: tier.name,
        x: Math.random() * 450 - 225,
        y: Math.random() * 450 - 225,
        hp: tier.hp,
        maxHp: tier.hp,
        atk: tier.atk,
        def: tier.def,
        color: tier.color,
        isAlive: true
    };
}

// 초기 몬스터 배치
for (let i = 0; i < MAX_MONSTERS; i++) spawnMonster();

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
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
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

            const baseCls = CLASSES[pInfo.className];
            pInfo.atk = baseCls.atk;
            pInfo.def = baseCls.def;
            pInfo.critRate = baseCls.critRate;
            pInfo.dodgeRate = baseCls.dodgeRate;
            pInfo.maxHp = baseCls.maxHp + (pInfo.level - 1) * 25;
            pInfo.hp = pInfo.maxHp;
            pInfo.dmgMulti = 1.0 + (pInfo.level - 1) * 0.08;

            if (pInfo.team.startsWith('king_')) {
                pInfo.isKing = true;
                pInfo.maxHp *= 3;
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

        players[playerId] = pInfo;

        socket.emit('init', {
            id: playerId,
            players,
            axes,
            aoes,
            monsters,
            drops,
            classInfo: CLASSES,
            karmaInfo: KARMA,
            monsterTiers: MONSTER_TIERS
        });

        socket.broadcast.emit('player_join', players[playerId]);
    });

    socket.on('move', (data) => {
        try {
            const moveData = JSON.parse(data);
            if (players[playerId] && players[playerId].isAlive && !players[playerId].isBot) {
                players[playerId].x = moveData.x;
                players[playerId].y = moveData.y;
                if (moveData.dirX !== undefined) players[playerId].dirX = moveData.dirX;
                if (moveData.dirY !== undefined) players[playerId].dirY = moveData.dirY;
            }
        } catch(e) {}
    });

    // PvP 토글 (카오틱/킹 시스템)
    socket.on('toggle_pvp', () => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;

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
                p.maxHp = Math.floor(p.maxHp * 1.5);
                p.hp = p.maxHp;
                p.dmgMulti *= 1.2;
            }
        } else {
            if (p.isKing) { hasKing = false; p.isKing = false; }
            p.team = 'peace';
            const baseCls = CLASSES[p.className];
            p.maxHp = baseCls.maxHp + (p.level - 1) * 25;
            if (p.hp > p.maxHp) p.hp = p.maxHp;
            p.dmgMulti = 1.0 + (p.level - 1) * 0.08;
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

    socket.on('throw', () => {
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
            const cls = CLASSES[newClass];
            p.className = newClass;
            p.displayName = cls.displayName;
            p.level = 1; p.exp = 0; p.gold = 0; p.killCount = 0;
            p.karma = 0; p.team = 'peace';
            p.isKing = false; p.targetId = null;
            p.atk = cls.atk; p.def = cls.def;
            p.critRate = cls.critRate; p.dodgeRate = cls.dodgeRate;
            p.maxHp = cls.maxHp;
            p.hp = p.maxHp;
            p.dmgMulti = 1.0;
            p.isAlive = true;
            p.x = Math.random() * 400 - 200;
            p.y = Math.random() * 400 - 200;

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
        }

        savePlayer(p);
        socket.emit('shop_result', { success: true, msg, diamonds: p.diamonds || 0, gold: p.gold });
        io.emit('player_update', p);
    });

    // ── 상점 목록 요청 ──
    socket.on('shop_list', () => {
        const p = players[playerId];
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
        socket.emit('inventory_data', {
            inventory: p.inventory || {},
            items: TRADEABLE_ITEMS
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
        if (q.reward.exp) { p.exp += q.reward.exp; }

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
        if (!eq) return;

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

    // ── 장비 강화 ──
    socket.on('enchant_item', (itemId) => {
        const p = players[playerId];
        if (!p) return;
        if (!p.equipped) p.equipped = {};

        const eq = EQUIP_STATS[itemId];
        if (!eq) { socket.emit('enchant_result', { success: false, msg: '강화 불가' }); return; }

        if (!p.enchantLevels) p.enchantLevels = {};
        const curLevel = p.enchantLevels[itemId] || 0;
        if (curLevel >= 10) { socket.emit('enchant_result', { success: false, msg: '최대 강화(+10)' }); return; }

        // 강화 비용
        const cost = (curLevel + 1) * 200;
        if (p.gold < cost) { socket.emit('enchant_result', { success: false, msg: `골드 부족 (${cost}G 필요)` }); return; }
        p.gold -= cost;

        // 성공 확률
        const rates = [100,100,100,90,80,70,60,50,40,30]; // +1~+10
        const rate = rates[curLevel] || 30;
        const roll = Math.random() * 100;

        if (roll < rate) {
            p.enchantLevels[itemId] = curLevel + 1;
            recalcStats(p);
            io.emit('server_msg', { msg: `${p.displayName}: ${eq.name} +${curLevel+1} 강화 성공!`, type: curLevel >= 6 ? 'rare' : 'normal' });
            socket.emit('enchant_result', { success: true, msg: `${eq.name} +${curLevel+1} 성공! (${rate}%)` });
        } else if (curLevel >= 7) {
            // +8 이상 실패 시 파괴
            delete p.enchantLevels[itemId];
            if (p.equipped) {
                for (const slot of EQUIPMENT_SLOTS) { if (p.equipped[slot] === itemId) delete p.equipped[slot]; }
            }
            recalcStats(p);
            io.emit('server_msg', { msg: `${p.displayName}: ${eq.name} 강화 실패! 장비 파괴!`, type: 'danger' });
            socket.emit('enchant_result', { success: false, msg: `${eq.name} 파괴됨!!! (${rate}% 실패)` });
        } else {
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

    // ── 스탯 포인트 배분 ──
    socket.on('add_stat', (stat) => {
        const p = players[playerId];
        if (!p || (p.statPoints || 0) <= 0) return;
        if (!['str','dex','int','con'].includes(stat)) return;
        p.statPoints--;
        const key = 'bonus' + stat.charAt(0).toUpperCase() + stat.slice(1);
        p[key] = (p[key] || 0) + 1;
        // 스탯 적용
        if (stat === 'str') p.atk += 2;
        if (stat === 'dex') { p.critRate += 0.005; p.dodgeRate += 0.003; }
        if (stat === 'int') p.dmgMulti += 0.02;
        if (stat === 'con') { p.maxHp += 10; p.hp += 10; }
        savePlayer(p);
        socket.emit('stat_result', { success: true, statPoints: p.statPoints, str: p.bonusStr||0, dex: p.bonusDex||0, int: p.bonusInt||0, con: p.bonusCon||0 });
        io.emit('player_update', p);
    });

    // ── 전직 (Lv.20) ──
    socket.on('class_advance', () => {
        const p = players[playerId];
        if (!p || p.isAdvanced || p.level < 20) {
            socket.emit('advance_result', { success: false, msg: p?.isAdvanced ? '이미 전직함' : 'Lv.20 필요' });
            return;
        }
        const adv = CLASS_ADVANCE[p.className];
        if (!adv) return;
        p.isAdvanced = true;
        p.advancedClass = adv.name;
        p.displayName = adv.displayName;
        if (adv.bonusAtk) p.atk += adv.bonusAtk;
        if (adv.bonusDef) p.def += adv.bonusDef;
        if (adv.bonusHp) { p.maxHp += adv.bonusHp; p.hp = p.maxHp; }
        if (adv.bonusCrit) p.critRate += adv.bonusCrit;
        if (adv.bonusSpeed) p.speed = (CLASSES[p.className]?.speed || 10) + adv.bonusSpeed;
        if (adv.bonusDodge) p.dodgeRate += adv.bonusDodge;
        savePlayer(p);
        io.emit('server_msg', { msg: `${p.displayName} 전직! [${adv.displayName}]`, type: 'rare' });
        socket.emit('advance_result', { success: true, msg: `${adv.displayName}(으)로 전직 완료!` });
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
        clans[clanName] = { leader: playerId, members: [playerId], level: 1, exp: 0 };
        savePlayer(p);
        io.emit('server_msg', { msg: `혈맹 [${clanName}] 창설! 군주: ${p.displayName}`, type: 'rare' });
        socket.emit('clan_result', { success: true, msg: `혈맹 [${clanName}] 창설 완료!` });
    });

    // ── 혈맹 가입 ──
    socket.on('join_clan', (clanName) => {
        const p = players[playerId];
        if (!p || p.clanName) return;
        if (!clans[clanName]) { socket.emit('clan_result', { success: false, msg: '존재하지 않는 혈맹' }); return; }
        if (clans[clanName].members.length >= 20) { socket.emit('clan_result', { success: false, msg: '혈맹 정원 초과' }); return; }
        p.clanName = clanName;
        clans[clanName].members.push(playerId);
        savePlayer(p);
        socket.emit('clan_result', { success: true, msg: `혈맹 [${clanName}] 가입!` });
    });

    // ── 혈맹 목록 ──
    socket.on('get_clans', () => {
        const list = Object.entries(clans).map(([name, c]) => ({
            name, memberCount: c.members.length, level: c.level,
            leader: players[c.leader]?.displayName || '?'
        }));
        socket.emit('clan_list', list);
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
                break;
            }
        }
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
        socket.emit('warehouse_data', { warehouse: p?.warehouse || {}, inventory: p?.inventory || {} });
    });

    // ── 몬스터 테이밍 (포켓몬) ──
    socket.on('tame_monster', (monsterId) => {
        const p = players[playerId];
        if (!p || !p.isAlive) return;
        const mob = monsters[monsterId];
        if (!mob || !mob.isAlive) { socket.emit('tame_result', { success:false, msg:'대상 없음' }); return; }
        const dist = Math.hypot(p.x - mob.x, p.y - mob.y);
        if (dist > 5) { socket.emit('tame_result', { success:false, msg:'너무 멀어요 (5 이내)' }); return; }
        if (p.gold < TAME_COST) { socket.emit('tame_result', { success:false, msg:`${TAME_COST}G 필요` }); return; }

        p.gold -= TAME_COST;
        const rate = TAME_RATES[mob.tier] || 0.1;
        const success = Math.random() < rate;

        if (success) {
            // 테이밍 성공 → 용병으로 추가
            let myArmyCount = 0;
            for (const bId in players) {
                if (players[bId].isBot && players[bId].ownerId === playerId && players[bId].isAlive) myArmyCount++;
            }
            if (myArmyCount >= (p.maxArmy || 30)) {
                socket.emit('tame_result', { success:false, msg:'용병 슬롯 부족!' });
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
                x: mob.x, y: mob.y,
                hp: mob.maxHp, maxHp: mob.maxHp,
                atk: mob.atk || 10, def: mob.def || 5,
                critRate: 0.1, dodgeRate: 0.05,
                dmgMulti: 1.0,
                dirX: 0, dirY: -1,
                gold: 0, level: Math.max(1, Math.floor(mob.maxHp / 50)), exp: 0,
                isAlive: true, killCount: 0, karma: 0,
                team: p.team, ownerId: playerId,
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
            io.emit('monster_die', { id: monsterId, tier: mob.tier, killer: playerId });
            spawnMonster();
            io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);

            io.emit('player_join', players[botId]);
            io.emit('server_msg', { msg: `${p.displayName}이(가) ${mob.name}을(를) 테이밍!`, type: 'morph' });
            socket.emit('tame_result', { success:true, msg: `${mob.name} 테이밍 성공! (${Math.floor(rate*100)}%)` });
        } else {
            // 테이밍 실패 → 몬스터 화남 (플레이어에게 데미지)
            p.hp -= mob.atk || 10;
            socket.emit('tame_result', { success:false, msg: `테이밍 실패! (${Math.floor(rate*100)}%) 몬스터가 화났다!` });
            io.emit('player_hit', { id: playerId, hp: p.hp, damage: mob.atk || 10, isCrit: false });
        }
        savePlayer(p);
        io.emit('player_update', p);
    });

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
        savePlayer(p);
        socket.emit('craft_result', result);
        if (result.success) io.emit('player_update', p);
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
            if (players[playerId].isKing) hasKing = false;
            savePlayer(players[playerId]);

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
        const { damage, isCrit } = calcDamage(cls.atk, 0, player.dmgMulti, player.critRate);
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
        x: victimPlayer.x, y: victimPlayer.y,
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

    players[botId] = {
        id: botId, deviceId: 'bot',
        className: randomClass,
        displayName: cls.displayName,
        x: Math.random() * 450 - 225,
        y: Math.random() * 450 - 225,
        hp: cls.maxHp, maxHp: cls.maxHp,
        atk: cls.atk, def: cls.def,
        critRate: cls.critRate, dodgeRate: cls.dodgeRate,
        dmgMulti: 1.0,
        dirX: 0, dirY: -1,
        gold: 0, level: 1, exp: 0,
        isAlive: true, killCount: 0, karma: 0,
        team: p.team,
        ownerId,
        targetId: null,
        isKing: false, isBot: true,
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

    // 몬스터 이동 (1초마다)
    if (tickCounter % 30 === 0) {
        for (let mId in monsters) {
            const m = monsters[mId];
            m.x += (Math.random() * 2 - 1) * 0.5;
            m.y += (Math.random() * 2 - 1) * 0.5;
            // 맵 경계
            m.x = Math.max(-240, Math.min(240, m.x));
            m.y = Math.max(-240, Math.min(240, m.y));
        }
    }

    // HP 자동 회복 (2초마다, 최대HP의 2%)
    if (tickCounter % 60 === 0) {
        for (let pId in players) {
            const p = players[pId];
            if (p.isAlive && p.hp < p.maxHp) {
                p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.02);
            }
            // 자동 물약 (HP 30% 이하 시)
            if (p.isAlive && p.autoPotion && !p.isBot && p.hp < p.maxHp * 0.3) {
                if (p.inventory && p.inventory['pot_hp_s'] > 0) {
                    p.inventory['pot_hp_s']--;
                    if (p.inventory['pot_hp_s'] <= 0) delete p.inventory['pot_hp_s'];
                    p.hp = Math.min(p.maxHp, p.hp + 100);
                    io.to(pId).emit('combat_log', { msg: '자동 물약 사용! HP +100' });
                }
            }
        }
    }

    // 월드 보스 알림 (5분마다)
    if (tickCounter % (30 * 300) === 0 && tickCounter > 0) {
        io.emit('server_msg', { msg: '강력한 보스가 드래곤 둥지에 출현했습니다!', type: 'boss' });
    }

    // 낮/밤 순환 (1초마다 체크)
    if (tickCounter % 30 === 0) {
        worldTime = Math.floor((Date.now() / 1000) % DAY_NIGHT_CYCLE);
        const wasNight = isNight;
        isNight = worldTime > DAY_NIGHT_CYCLE / 2; // 후반 5분 = 밤
        if (isNight && !wasNight) {
            io.emit('server_msg', { msg: '밤이 찾아왔습니다... 언데드가 강해집니다!', type: 'danger' });
            io.emit('day_night', { isNight: true });
        } else if (!isNight && wasNight) {
            io.emit('server_msg', { msg: '날이 밝았습니다. 안전한 사냥을!', type: 'normal' });
            io.emit('day_night', { isNight: false });
        }
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
            while (p.gold >= 200 && myArmyCount < 30) {
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

            // 이동 (타워 제외)
            if (cls.speed > 0) {
                p.x += p.dirX * (cls.speed / 100);
                p.y += p.dirY * (cls.speed / 100);
            }

            // 공격 확률
            const throwChance = (p.className === 'GuardianTower') ? 0.12 : 0.06;
            if (Math.random() < throwChance) executeThrow(id);

            // 스킬 자동 시전 (클래스별)
            if (!p.skillCooldowns) p.skillCooldowns = {};
            const classSkills = SKILLS[p.className];
            if (classSkills && target && minDist < 8) {
                for (const skill of classSkills) {
                    if (p.level < skill.level) continue;
                    const lastUsed = p.skillCooldowns[skill.name] || 0;
                    if (Date.now() - lastUsed > skill.cooldown * 1000) {
                        p.skillCooldowns[skill.name] = Date.now();
                        const skillDmg = Math.floor((p.atk || 10) * (skill.dmgMulti || 1) * (p.dmgMulti || 1));
                        if (target.hp !== undefined) {
                            target.hp -= skillDmg;
                            if (target.id) io.emit('player_hit', { id: target.id, hp: target.hp, damage: skillDmg, isCrit: true, skillName: skill.name });
                        }
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
            // 주인 따라가기 (타겟 없을 때)
            if (p.ownerId && players[p.ownerId] && players[p.ownerId].isAlive) {
                const owner = players[p.ownerId];
                const dx = owner.x - p.x;
                const dy = owner.y - p.y;
                const mag = Math.hypot(dx, dy);
                if (mag > 2.0) {
                    p.dirX = dx / mag;
                    p.dirY = dy / mag;
                    p.x += p.dirX * (cls.speed / 100);
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

    target.exp += amount;
    const required = getExpRequired(target.level);

    if (target.exp >= required) {
        target.exp -= required;
        target.level++;
        target.maxHp += 25;
        target.hp = target.maxHp;
        target.dmgMulti += 0.08;

        target.statPoints = (target.statPoints || 0) + 3; // 레벨업 시 스탯 3포인트
        io.emit('level_up', { id: target.id, level: target.level, className: target.displayName, statPoints: target.statPoints });
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
                const { damage } = calcDamage(owner.atk || 10, mob.def, owner.dmgMulti, owner.critRate || 0.1);
                mob.hp -= damage;

                if (mob.hp <= 0) {
                    mob.isAlive = false;
                    const tier = MONSTER_TIERS[mob.tier];

                    let realOwner = (owner.isBot && owner.ownerId && players[owner.ownerId])
                        ? players[owner.ownerId] : owner;

                    realOwner.gold += tier.goldReward;
                    giveExp(owner, tier.expReward);

                    // 변신 처치 카운트
                    if (!realOwner.morphKills) realOwner.morphKills = {};
                    if (mob.tier === 'normal') realOwner.morphKills['slime'] = (realOwner.morphKills['slime']||0) + 1;
                    if (mob.tier === 'elite') realOwner.morphKills['orc'] = (realOwner.morphKills['orc']||0) + 1;
                    if (mob.tier === 'rare') realOwner.morphKills['darkknight'] = (realOwner.morphKills['darkknight']||0) + 1;
                    if (mob.tier === 'boss') realOwner.morphKills['dragon'] = (realOwner.morphKills['dragon']||0) + 1;

                    // 퀘스트 추적
                    trackQuest(realOwner, 'kill_monster', 1);
                    if (mob.tier === 'elite' || mob.tier === 'rare' || mob.tier === 'boss') trackQuest(realOwner, 'kill_elite', 1);
                    if (mob.tier === 'boss') trackQuest(realOwner, 'kill_boss', 1);
                    trackQuest(realOwner, 'earn_gold', tier.goldReward);

                    // 재료 드롭 (인벤토리에 직접 추가)
                    if (!realOwner.inventory) realOwner.inventory = {};
                    if (mob.tier === 'normal' && Math.random() < 0.3) realOwner.inventory['mat_iron'] = (realOwner.inventory['mat_iron']||0) + 1;
                    if (mob.tier === 'elite' && Math.random() < 0.4) realOwner.inventory['mat_magic'] = (realOwner.inventory['mat_magic']||0) + 1;
                    if (mob.tier === 'rare' && Math.random() < 0.3) realOwner.inventory['mat_soul'] = (realOwner.inventory['mat_soul']||0) + 1;
                    if (mob.tier === 'boss' && Math.random() < 0.2) realOwner.inventory['mat_dragon'] = (realOwner.inventory['mat_dragon']||0) + 1;
                    if (Math.random() < 0.15) realOwner.inventory['pot_hp_s'] = (realOwner.inventory['pot_hp_s']||0) + 1;

                    // 장비 드롭
                    const equipDrops = {
                        normal: [{ id:'equip_sword_1', rate:0.05 }, { id:'equip_armor_1', rate:0.05 }],
                        elite:  [{ id:'equip_sword_2', rate:0.08 }, { id:'equip_armor_2', rate:0.08 }, { id:'equip_ring_1', rate:0.05 }],
                        rare:   [{ id:'equip_sword_2', rate:0.15 }, { id:'equip_armor_2', rate:0.15 }, { id:'equip_ring_1', rate:0.10 }],
                        boss:   [{ id:'equip_sword_2', rate:0.30 }, { id:'equip_armor_2', rate:0.30 }, { id:'equip_ring_1', rate:0.20 }],
                    };
                    const drops = equipDrops[mob.tier] || [];
                    for (const d of drops) {
                        if (Math.random() < d.rate) {
                            realOwner.inventory[d.id] = (realOwner.inventory[d.id]||0) + 1;
                            const eName = EQUIP_STATS[d.id]?.name || d.id;
                            io.to(realOwner.id).emit('combat_log', { msg: eName + ' 획득!' });
                            if (mob.tier === 'boss') io.emit('server_msg', { msg: `${realOwner.displayName}이(가) ${eName}을(를) 획득!`, type: 'rare' });
                            break;
                        }
                    }

                    // 골드 드롭
                    spawnDrop(mob.x, mob.y, Math.floor(tier.goldReward * 0.5), mId);

                    io.emit('monster_die', { id: mId, tier: mob.tier, killer: realOwner.id });
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

            // 회피 판정
            if (Math.random() < (target.dodgeRate || 0)) continue;

            const dx = axe.x - target.x, dy = axe.y - target.y;
            if (dx * dx + dy * dy < 0.6 * 0.6) {
                const { damage, isCrit } = calcDamage(
                    owner.atk || 10, target.def || 0, owner.dmgMulti, owner.critRate || 0.1
                );
                target.hp -= damage;

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
                const { damage } = calcDamage(owner.atk || 10, mob.def, owner.dmgMulti * 0.8, owner.critRate || 0.1);
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

            const dx = aoe.x - target.x, dy = aoe.y - target.y;
            if (dx * dx + dy * dy <= aoe.radius * aoe.radius) {
                const { damage } = calcDamage(owner.atk || 10, target.def || 0, owner.dmgMulti * 0.6, owner.critRate || 0.1);
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
    target.isAlive = false;

    let realKiller = owner;
    if (owner.isBot && owner.ownerId && players[owner.ownerId]) {
        realKiller = players[owner.ownerId];
    }

    realKiller.killCount++;

    // ── PK 카르마 판정 ──
    let isPK = false;
    if (!target.isBot && target.team === 'peace') {
        // 평화 모드 유저를 죽이면 PK
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
    io.emit('player_die', { victimId: targetId, attackerId, stolen, isPK });
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
                skin: players[pId].activeSkin
            };
        }
    }
    for (const mId in monsters) {
        syncData.monsters[mId] = { x: monsters[mId].x, y: monsters[mId].y };
    }

    syncData.isNight = isNight;
    syncData.worldTime = worldTime;
    io.volatile.emit('sync', syncData);
}
