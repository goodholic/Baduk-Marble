// v6.0 — 오토체스 전략 배치 모드 (TFT/오토배틀러 스타일)
// 8인 FFA, 라운드마다 용병 드래프트+배치, 자동 전투, 최후 1인

const MAX_PLAYERS = 8;
const BOARD_SIZE = { rows: 4, cols: 7 };
const ROUNDS_PER_STAGE = 5;
const STARTING_HP = 100;
const GOLD_PER_ROUND = 5;

// 용병 풀 (코스트별)
const UNIT_POOL = {
  cost1: [
    { id: 'ac_soldier', name: '병사', icon: '⚔️', atk: 40, hp: 500, trait: ['전사', '인간'], cost: 1 },
    { id: 'ac_archer', name: '궁수', icon: '🏹', atk: 50, hp: 350, trait: ['궁수', '엘프'], cost: 1 },
    { id: 'ac_mage_app', name: '견습 마법사', icon: '🔮', atk: 55, hp: 300, trait: ['마법사', '인간'], cost: 1 },
    { id: 'ac_thief', name: '도적', icon: '🗡️', atk: 45, hp: 400, trait: ['암살자', '인간'], cost: 1 },
  ],
  cost2: [
    { id: 'ac_knight', name: '기사', icon: '🛡️⚔️', atk: 55, hp: 800, trait: ['전사', '기사단'], cost: 2 },
    { id: 'ac_shaman', name: '주술사', icon: '🧙', atk: 65, hp: 500, trait: ['마법사', '야만족'], cost: 2 },
    { id: 'ac_ranger', name: '레인저', icon: '🏹🌿', atk: 70, hp: 450, trait: ['궁수', '엘프'], cost: 2 },
    { id: 'ac_assassin', name: '암살자', icon: '🗡️💨', atk: 80, hp: 350, trait: ['암살자', '그림자'], cost: 2 },
  ],
  cost3: [
    { id: 'ac_paladin', name: '성기사', icon: '⚔️✨', atk: 70, hp: 1200, trait: ['기사단', '신성'], cost: 3 },
    { id: 'ac_warlock', name: '흑마법사', icon: '🔮💀', atk: 90, hp: 600, trait: ['마법사', '악마'], cost: 3 },
    { id: 'ac_beastmaster', name: '야수왕', icon: '🐺⚔️', atk: 75, hp: 900, trait: ['야만족', '야수'], cost: 3 },
  ],
  cost4: [
    { id: 'ac_dragon_rider', name: '용기사', icon: '🐲⚔️', atk: 100, hp: 1500, trait: ['드래곤', '기사단'], cost: 4 },
    { id: 'ac_archmage', name: '대마도사', icon: '🔮👑', atk: 120, hp: 800, trait: ['마법사', '신성'], cost: 4 },
  ],
  cost5: [
    { id: 'ac_demon_lord', name: '마왕', icon: '😈👑', atk: 150, hp: 2000, trait: ['악마', '전설'], cost: 5 },
    { id: 'ac_angel', name: '대천사', icon: '👼👑', atk: 130, hp: 1800, trait: ['신성', '전설'], cost: 5 },
  ],
};

// 시너지 (같은 특성 N명 → 팀 보너스)
const SYNERGIES = {
  '전사':    [{ count: 2, bonus: 'ATK+10%' }, { count: 4, bonus: 'ATK+25%, 방어관통+15%' }],
  '궁수':    [{ count: 2, bonus: '공격속도+15%' }, { count: 4, bonus: '공격속도+35%, 크리+20%' }],
  '마법사':  [{ count: 2, bonus: '마공+15%' }, { count: 4, bonus: '마공+40%, 마법관통+20%' }],
  '암살자':  [{ count: 2, bonus: '크리+20%' }, { count: 3, bonus: '크리+40%, 배후ATK+50%' }],
  '기사단':  [{ count: 2, bonus: 'DEF+20%' }, { count: 4, bonus: 'DEF+50%, 팀 실드' }],
  '악마':    [{ count: 2, bonus: '흡혈+15%' }, { count: 3, bonus: '흡혈+30%, 공포오라' }],
  '신성':    [{ count: 2, bonus: '힐+20%' }, { count: 3, bonus: '힐+40%, 부활1회' }],
  '드래곤':  [{ count: 1, bonus: '화DMG+20%' }, { count: 2, bonus: '드래곤 폼 자동변신' }],
  '엘프':    [{ count: 2, bonus: '회피+15%' }, { count: 3, bonus: '회피+30%, 자연회복' }],
  '야만족':  [{ count: 2, bonus: 'HP+15%' }, { count: 3, bonus: 'HP+30%, 광폭화' }],
  '그림자':  [{ count: 2, bonus: '은신3초' }, { count: 3, bonus: '은신5초+첫타 크리확정' }],
  '전설':    [{ count: 1, bonus: '전체+5%' }, { count: 2, bonus: '전체+15%, 궁극기 자동발동' }],
  '야수':    [{ count: 2, bonus: '소환수 ATK+20%' }],
};

// 아이템 (NPC 라운드 드롭)
const ITEMS = [
  { id: 'bf_sword', name: '대검', icon: '⚔️', stat: { atk: 20 } },
  { id: 'chain_vest', name: '쇠사슬', icon: '🛡️', stat: { def: 20 } },
  { id: 'giants_belt', name: '거인벨트', icon: '❤️', stat: { hp: 200 } },
  { id: 'rod', name: '마력봉', icon: '🔮', stat: { matk: 20 } },
  { id: 'cloak', name: '망토', icon: '🧥', stat: { eva: 15 } },
  { id: 'bow', name: '활', icon: '🏹', stat: { atkSpd: 0.15 } },
];

// 아이템 조합
const ITEM_COMBOS = [
  { a: 'bf_sword', b: 'bf_sword', result: { name: '무한검', icon: '⚔️⚔️', stat: { atk: 60 } } },
  { a: 'bf_sword', b: 'rod', result: { name: '마검', icon: '⚔️🔮', stat: { atk: 20, matk: 20, spellBlade: true } } },
  { a: 'chain_vest', b: 'giants_belt', result: { name: '가디언 앤젤', icon: '👼🛡️', stat: { def: 20, hp: 200, revive: true } } },
  { a: 'bow', b: 'cloak', result: { name: '유령 활', icon: '👻🏹', stat: { atkSpd: 0.15, eva: 15, stealth: true } } },
];

// 별 업그레이드 (같은 유닛 3개 = 2성, 2성 3개 = 3성)
const STAR_SCALE = { 1: 1.0, 2: 1.8, 3: 3.5 };

function rollShop(level) {
  const odds = { 1: [0.7,0.2,0.08,0.02,0], 3: [0.5,0.3,0.15,0.04,0.01], 5: [0.3,0.3,0.2,0.15,0.05], 7: [0.15,0.2,0.25,0.25,0.15] };
  const tier = odds[Math.min(level, 7)] || odds[1];
  const shop = [];
  for (let i = 0; i < 5; i++) {
    const r = Math.random();
    let cum = 0;
    for (let c = 0; c < 5; c++) {
      cum += tier[c];
      if (r <= cum) {
        const pool = UNIT_POOL[`cost${c+1}`];
        if (pool?.length) shop.push(pool[Math.floor(Math.random() * pool.length)]);
        break;
      }
    }
  }
  return shop;
}

function register(io, socket, player) {
  socket.on('auto_chess_info', () => {
    socket.emit('auto_chess_info', { pool: UNIT_POOL, synergies: SYNERGIES, items: ITEMS, combos: ITEM_COMBOS, board: BOARD_SIZE, starScale: STAR_SCALE });
  });
  socket.on('auto_chess_roll_shop', (data) => {
    socket.emit('auto_chess_shop', rollShop(data.level || 1));
  });
  socket.on('auto_chess_join', () => {
    socket.emit('auto_chess_join_result', { ok: true, hp: STARTING_HP });
    io.emit('server_msg', `♟️ [오토체스] ${player.name}이(가) 오토체스 참가!`);
  });
}

module.exports = { UNIT_POOL, SYNERGIES, ITEMS, ITEM_COMBOS, BOARD_SIZE, STAR_SCALE, rollShop, register };
