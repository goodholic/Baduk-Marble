// v7.0 — 유령 군단 공성전
// 사망한 용병의 유령을 소환하여 공성전 투입, 유령 특수능력

const MAX_PHANTOMS = 10;

const PHANTOM_ABILITIES = [
  { id: 'pass_walls', name: '벽 통과', icon: '👻🧱', desc: '성벽을 통과하여 내부 침투!', passive: true },
  { id: 'fear_aura', name: '공포 오라', icon: '👻😨', desc: '주변 적 공포 3초 (쿨 30초)', cooldown: 30 },
  { id: 'possession', name: '빙의', icon: '👻🎭', desc: '적 용병 1명에 빙의! 5초 조종', cooldown: 45 },
  { id: 'soul_drain', name: '영혼 흡수', icon: '👻🩸', desc: '적 HP 흡수 (DMG의 100% 회복)', cooldown: 20 },
  { id: 'phantom_bomb', name: '유령 폭발', icon: '👻💥', desc: '자폭! 범위 HP 30% DMG', oneTime: true },
  { id: 'invisible', name: '투명', icon: '👻✨', desc: '완전 투명 (공격 시 해제)', passive: true },
  { id: 'haunt', name: '저주', icon: '👻💀', desc: '적 1명에게 저주 (ATK/DEF -20% 30초)', cooldown: 40 },
  { id: 'resurrect', name: '부활 유도', icon: '👻💫', desc: '유령이 소멸하며 생전의 50% 스탯으로 부활!', ultimate: true, oneTime: true },
];

// 유령 소환 비용
const PHANTOM_COST = {
  gold: 3000,
  soulEssence: 1, // 용병 사망 시 자동 획득
  desc: '사망한 용병 = 영혼의 정수 1개 자동 획득 → 유령 소환 재료',
};

// 유령 강화 (전사자 명단의 용병이 강한 유령)
const PHANTOM_SCALING = {
  byLevel: { statRatio: (lv) => 0.3 + lv * 0.005, desc: '원래 레벨이 높을수록 강한 유령' },
  byGeneration: { bonusPerGen: 0.1, desc: '세대당 유령 능력 +10%' },
  byBondStrength: { bonusPerBond: 0.05, desc: '강한 유대 관계 = 강한 유령' },
  byDeathLocation: { darkContinent: 1.5, desc: '어둠의 대륙 전사자 = 1.5배 강화' },
};

// 유령 군단 진형
const PHANTOM_FORMATIONS = [
  { id: 'scatter', name: '산개', icon: '👻👻👻', bonus: { coverage: true }, desc: '넓은 범위 침투' },
  { id: 'wedge', name: '쐐기', icon: '👻⚔️👻', bonus: { breachDmg: 1.3 }, desc: '한 점 돌파' },
  { id: 'surround', name: '포위', icon: '👻🔄👻', bonus: { fearRadius: 2.0 }, desc: '적 포위, 공포 범위 2배' },
  { id: 'stealth', name: '은밀', icon: '👻...👻', bonus: { stealthAll: true }, desc: '전원 투명 침투' },
  { id: 'sacrifice', name: '돌격 자폭', icon: '👻💥💥💥', bonus: { bombAll: true }, desc: '전원 동시 자폭!', extreme: true },
];

// 보상 (유령 군단 활용)
const PHANTOM_REWARDS = {
  siege_with_phantom: { gold: 20000, desc: '유령 군단으로 공성 승리' },
  phantom_ace: { gold: 30000, title: '유령 사령관', desc: '유령 5명으로 성 함락' },
  resurrect_success: { gold: 10000, desc: '유령 부활 성공' },
};

function summonPhantom(player, deadMercId) {
  if ((player.gold || 0) < PHANTOM_COST.gold) return { ok: false, reason: '골드 부족' };
  const fallen = (player.fallenHeroes || []).find(f => f.name === deadMercId || f.id === deadMercId);
  if (!fallen) return { ok: false, reason: '전사자 없음' };
  player.gold -= PHANTOM_COST.gold;
  const phantoms = player.phantomArmy || [];
  if (phantoms.length >= MAX_PHANTOMS) return { ok: false, reason: `최대 ${MAX_PHANTOMS}명` };
  const phantom = { name: `${fallen.name}의 유령`, icon: '👻', originalLevel: fallen.level || 1, abilities: PHANTOM_ABILITIES.slice(0, 3), created: Date.now() };
  phantoms.push(phantom);
  player.phantomArmy = phantoms;
  return { ok: true, phantom };
}

function register(io, socket, player) {
  socket.on('phantom_army_info', () => {
    socket.emit('phantom_army_info', { abilities: PHANTOM_ABILITIES, cost: PHANTOM_COST, scaling: PHANTOM_SCALING, formations: PHANTOM_FORMATIONS, rewards: PHANTOM_REWARDS, army: player.phantomArmy || [], fallen: player.fallenHeroes || [] });
  });
  socket.on('phantom_summon', (data) => {
    const result = summonPhantom(player, data.deadMercId);
    socket.emit('phantom_summon_result', result);
    if (result.ok) io.emit('server_msg', `👻 [유령 군단] ${result.phantom.name} 소환... 전사자가 돌아왔다...`);
  });
}

module.exports = { PHANTOM_ABILITIES, PHANTOM_COST, PHANTOM_SCALING, PHANTOM_FORMATIONS, PHANTOM_REWARDS, MAX_PHANTOMS, summonPhantom, register };
