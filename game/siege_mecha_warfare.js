// v5.9 — 공성전 메카 전쟁 시스템
// 거대 메카 탑승 전투, 메카 커스터마이징, 메카 vs 성벽

const MECHA_TYPES = [
  { id: 'scout_mech', name: '정찰 메카', icon: '🤖💨', hp: 5000, atk: 200, spd: 8, size: 'small', cost: 20000,
    weapons: ['레이저 라이플', '스텔스 장치'], ability: '은신 이동 (10초)', desc: '빠르고 은밀한 경량 메카' },
  { id: 'assault_mech', name: '돌격 메카', icon: '🤖⚔️', hp: 15000, atk: 500, spd: 5, size: 'medium', cost: 50000,
    weapons: ['개틀링건', '로켓 펀치'], ability: '돌격 (직선 범위 DMG)', desc: '균형 잡힌 전투형 메카' },
  { id: 'titan_mech', name: '타이탄 메카', icon: '🤖🗿', hp: 40000, atk: 300, spd: 2, size: 'large', cost: 100000,
    weapons: ['대포 2문', '에너지 실드'], ability: '포격 모드 (정지+DMG 3배)', desc: '이동 요새급 초대형 메카' },
  { id: 'flying_mech', name: '비행 메카', icon: '🤖🦅', hp: 8000, atk: 350, spd: 10, size: 'medium', cost: 80000,
    weapons: ['공대지 미사일', '레이저 빔'], ability: '비행 (지상 함정 무시)', desc: '공중에서 공격하는 메카' },
  { id: 'siege_mech', name: '공성 메카', icon: '🤖🏰', hp: 30000, atk: 800, spd: 1, size: 'huge', cost: 150000,
    weapons: ['초대형 대포', '성벽 파쇄기'], ability: '성벽 즉파 (HP 무시 1회)', desc: '성벽을 한 방에 무너뜨리는 메카' },
  { id: 'legendary_mech', name: '전설 메카: 갓 머신', icon: '🤖👑', hp: 60000, atk: 1000, spd: 6, size: 'huge', cost: 500000,
    weapons: ['오메가 캐논', '차원 절단검', '방어 위성'], ability: '최종병기 (전체 HP 30%)', desc: '최강 전설 메카!', legendary: true },
];

// 메카 파츠 (커스터마이징)
const MECHA_PARTS = {
  head:  [{ id: 'scanner', name: '스캐너', effect: '적 위치 탐지', cost: 5000 }, { id: 'horn', name: '뿔', effect: '돌격 DMG+30%', cost: 8000 }],
  arms:  [{ id: 'drill', name: '드릴팔', effect: '성벽 DMG+50%', cost: 10000 }, { id: 'shield_arm', name: '방패팔', effect: 'DEF+30%', cost: 7000 }],
  legs:  [{ id: 'hover', name: '호버', effect: '지형 무시+SPD+20%', cost: 12000 }, { id: 'anchor', name: '앵커', effect: '넉백 무효+DEF+20%', cost: 6000 }],
  back:  [{ id: 'jet_pack', name: '제트팩', effect: '단거리 비행', cost: 15000 }, { id: 'turret', name: '자동 포탑', effect: '후방 자동 공격', cost: 10000 }],
  core:  [{ id: 'nuclear', name: '핵 코어', effect: '전체 스탯+20%, 파괴 시 자폭', cost: 30000 }, { id: 'crystal', name: '마력 코어', effect: '에너지 무한', cost: 25000 }],
};

// 메카 합체 (2인 합체 메카!)
const MECHA_FUSIONS = [
  { a: 'assault_mech', b: 'titan_mech', name: '기가 타이탄', icon: '🤖⚔️🗿', hp: 50000, atk: 800, desc: '돌격+방어 융합' },
  { a: 'flying_mech', b: 'siege_mech', name: '스카이 포트리스', icon: '🤖🦅🏰', hp: 35000, atk: 1000, desc: '공중 요새, 성벽 폭격' },
  { a: 'scout_mech', b: 'flying_mech', name: '팬텀 스트라이커', icon: '🤖💨🦅', hp: 12000, atk: 500, spd: 15, desc: '초고속 기습 메카' },
];

// 메카 전투 보상
const MECHA_REWARDS = {
  siege_win:     { gold: 30000, mechParts: 1, title: '메카 파일럿' },
  mech_vs_mech:  { gold: 20000, mechExp: 500 },
  boss_mech:     { gold: 50000, item: 'mech_core', title: '메카 에이스' },
  legendary_win: { gold: 100000, title: '갓 머신 파일럿', frame: 'mecha_legend' },
};

function buildMecha(player, mechaId) {
  const mecha = MECHA_TYPES.find(m => m.id === mechaId);
  if (!mecha) return { ok: false, reason: '알 수 없는 메카' };
  if ((player.gold || 0) < mecha.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= mecha.cost;
  player.mechas = player.mechas || [];
  player.mechas.push({ ...mecha, id: `mech_${Date.now()}`, parts: {}, builtAt: Date.now() });
  return { ok: true, mecha: mecha.name };
}

function register(io, socket, player) {
  socket.on('mecha_info', () => {
    socket.emit('mecha_info', { types: MECHA_TYPES, parts: MECHA_PARTS, fusions: MECHA_FUSIONS, rewards: MECHA_REWARDS, owned: player.mechas || [] });
  });
  socket.on('mecha_build', (data) => {
    const result = buildMecha(player, data.mechaId);
    socket.emit('mecha_build_result', result);
    if (result.ok) io.emit('server_msg', `🤖 [메카] ${player.name}이(가) "${result.mecha}" 건조 완료!`);
  });
}

module.exports = { MECHA_TYPES, MECHA_PARTS, MECHA_FUSIONS, MECHA_REWARDS, buildMecha, register };
