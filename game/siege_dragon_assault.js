// v6.0 — 드래곤 공성전 시스템
// 드래곤을 타고 성을 공격/수비, 공중전, 드래곤 브레스

const DRAGON_TYPES = [
  { id: 'fire_dragon', name: '화염룡', icon: '🐲🔥', hp: 20000, atk: 400, breath: { type: 'fire', dmg: 300, area: 6 }, spd: 7, cost: 100000 },
  { id: 'ice_dragon', name: '빙결룡', icon: '🐲❄️', hp: 25000, atk: 300, breath: { type: 'ice', dmg: 200, area: 8, slow: 0.5 }, spd: 6, cost: 120000 },
  { id: 'thunder_dragon', name: '뇌전룡', icon: '🐲⚡', hp: 18000, atk: 500, breath: { type: 'thunder', dmg: 400, area: 4, stun: 2 }, spd: 9, cost: 150000 },
  { id: 'shadow_dragon', name: '암흑룡', icon: '🐲🌑', hp: 22000, atk: 350, breath: { type: 'dark', dmg: 250, area: 5, blind: 3 }, spd: 8, cost: 130000 },
  { id: 'holy_dragon', name: '성룡', icon: '🐲✨', hp: 30000, atk: 250, breath: { type: 'holy', dmg: 150, area: 10, heal: 0.2 }, spd: 5, cost: 140000 },
  { id: 'chaos_dragon', name: '혼돈룡', icon: '🐲💜', hp: 35000, atk: 600, breath: { type: 'chaos', dmg: 500, area: 7, random: true }, spd: 6, cost: 300000, legendary: true },
  { id: 'ancient_wyrm', name: '태고의 와이번', icon: '🐲👑', hp: 50000, atk: 800, breath: { type: 'all', dmg: 600, area: 12 }, spd: 4, cost: 500000, legendary: true },
];

// 드래곤 전투 기동
const DRAGON_MANEUVERS = [
  { id: 'dive_bomb', name: '급강하 폭격', icon: '⬇️💣', desc: '급강하하며 폭격 (DMG 2배, 착지 후 2초 무방비)', cooldown: 15 },
  { id: 'barrel_roll', name: '배럴 롤', icon: '🔄', desc: '회전으로 투사체 회피 (3초 무적)', cooldown: 20 },
  { id: 'wing_slash', name: '날개 베기', icon: '🦅⚔️', desc: '근접 비행 시 날개로 범위 공격', cooldown: 10 },
  { id: 'roar', name: '용의 포효', icon: '🗣️🔊', desc: '주변 적 공포 3초 + 아군 사기↑', cooldown: 25 },
  { id: 'tail_sweep', name: '꼬리 휩쓸기', icon: '🐉💨', desc: '후방 넓은 범위 넉백', cooldown: 12 },
  { id: 'sky_fortress', name: '공중 정지', icon: '☁️🏰', desc: '공중 정지, 연속 브레스 (이동 불가)', cooldown: 30 },
];

// 대공 무기 (성에 설치, 드래곤 대응)
const ANTI_AIR = [
  { id: 'ballista', name: '발리스타', icon: '🏹💣', dmg: 300, range: 400, reload: 5, desc: '대형 화살, 드래곤 전용' },
  { id: 'magic_turret', name: '마법 포탑', icon: '🔮💣', dmg: 200, range: 350, reload: 3, desc: '마법 연사, 빠른 공격' },
  { id: 'net_launcher', name: '그물 발사기', icon: '🕸️', dmg: 50, range: 250, reload: 10, effect: '드래곤 3초 낙하', desc: '드래곤 포획!' },
  { id: 'chain_lightning', name: '체인 라이트닝', icon: '⚡⛓️', dmg: 400, range: 300, reload: 8, desc: '번개 연쇄 (다수 타격)' },
  { id: 'dragon_bane', name: '용살포', icon: '🐲💀', dmg: 1000, range: 500, reload: 15, desc: '궁극 대공 무기! 드래곤 특효' },
];

// 보상
const DRAGON_SIEGE_REWARDS = {
  attacker_win: { gold: 50000, dragonExp: 1000, title: '하늘의 정복자' },
  defender_win: { gold: 40000, antiAirUpgrade: true, title: '용 사냥꾼' },
  dragon_kill:  { gold: 80000, item: 'dragon_scale_armor', title: '드래곤 슬레이어' },
};

function register(io, socket, player) {
  socket.on('dragon_siege_info', () => {
    socket.emit('dragon_siege_info', { dragons: DRAGON_TYPES, maneuvers: DRAGON_MANEUVERS, antiAir: ANTI_AIR, rewards: DRAGON_SIEGE_REWARDS, owned: player.dragons || [] });
  });
  socket.on('dragon_siege_tame', (data) => {
    const dragon = DRAGON_TYPES.find(d => d.id === data.dragonId);
    if (!dragon) return socket.emit('dragon_tame_result', { ok: false });
    if ((player.gold || 0) < dragon.cost) return socket.emit('dragon_tame_result', { ok: false, reason: '골드 부족' });
    player.gold -= dragon.cost;
    player.dragons = player.dragons || [];
    player.dragons.push({ ...dragon, id: `dragon_${Date.now()}`, exp: 0 });
    socket.emit('dragon_tame_result', { ok: true, dragon: dragon.name });
    if (dragon.legendary) io.emit('server_msg', `🐲👑 [드래곤] ${player.name}이(가) 전설의 "${dragon.name}" 획득!`);
  });
}

module.exports = { DRAGON_TYPES, DRAGON_MANEUVERS, ANTI_AIR, DRAGON_SIEGE_REWARDS, register };
