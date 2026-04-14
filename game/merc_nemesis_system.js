// v6.4 — 숙적(네메시스) 시스템
// 플레이어에게 자동 생성 라이벌 NPC, 패배할수록 강해짐, 최종 대결

const NEMESIS_EVOLVE_PER_LOSS = 0.15; // 패배마다 15% 강화

const NEMESIS_ARCHETYPES = [
  { id: 'shadow_twin', name: '그림자 쌍둥이', icon: '👤🌑', desc: '플레이어의 복제, 같은 스탯+스킬', copyPlayer: true },
  { id: 'dark_knight', name: '암흑 기사', icon: '🖤⚔️', desc: '전사 특화 네메시스', baseClass: 'warrior', atkMul: 1.3 },
  { id: 'void_mage', name: '공허 마법사', icon: '🌀🔮', desc: '마법 특화 네메시스', baseClass: 'mage', matkMul: 1.3 },
  { id: 'blood_assassin', name: '피의 암살자', icon: '🩸🗡️', desc: '암살 특화 네메시스', baseClass: 'assassin', critMul: 1.4 },
  { id: 'corrupted_self', name: '타락한 자아', icon: '😈👤', desc: '플레이어의 어둠 면, 매 패배 시 새 스킬 학습', adaptive: true },
];

// 네메시스 진화 단계
const NEMESIS_STAGES = [
  { stage: 1, name: '등장', hpMul: 1.0, atkMul: 1.0, skills: 1, desc: '첫 조우, 약한 상태' },
  { stage: 2, name: '성장', hpMul: 1.3, atkMul: 1.2, skills: 2, desc: '플레이어 패턴 학습 시작' },
  { stage: 3, name: '위협', hpMul: 1.7, atkMul: 1.5, skills: 3, desc: '상당히 강해짐, 약점 공략' },
  { stage: 4, name: '공포', hpMul: 2.2, atkMul: 1.8, skills: 4, desc: '플레이어보다 강함!', miniBoss: true },
  { stage: 5, name: '최종 대결', hpMul: 3.0, atkMul: 2.5, skills: 5, desc: '숙명의 대결, 이기면 최고 보상', finalBoss: true },
];

// 네메시스 출현 조건 (랜덤 이벤트)
const NEMESIS_TRIGGERS = [
  { trigger: 'io_loss', chance: 0.1, desc: 'IO 패배 시 10% 확률 출현' },
  { trigger: 'siege_loss', chance: 0.15, desc: '공성 패배 시 15% 출현' },
  { trigger: 'merc_death', chance: 0.08, desc: '용병 사망 시 8% 출현' },
  { trigger: 'random', chance: 0.03, desc: '랜덤 3% 확률 조우' },
  { trigger: 'dark_continent', chance: 0.2, desc: '어둠의 대륙에서 20% 출현' },
];

// 네메시스 처치 보상
const NEMESIS_REWARDS = {
  stage1: { gold: 5000, exp: 500 },
  stage2: { gold: 15000, exp: 1500, item: 'nemesis_shard' },
  stage3: { gold: 40000, exp: 4000, item: 'nemesis_essence' },
  stage4: { gold: 80000, exp: 8000, item: 'nemesis_core', title: '숙적 정복자' },
  stage5: { gold: 200000, exp: 20000, item: 'nemesis_soul', title: '운명의 승리자', merc: 'tamed_nemesis', frame: 'nemesis_slayer' },
};

// 네메시스 대사 (스테이지별)
const NEMESIS_DIALOGUE = {
  1: ['드디어 만났군...', '넌 약해.', '다시 만나게 될 거야.'],
  2: ['강해졌지? 나도 강해졌다.', '네 패턴은 다 읽었어.', '아직 멀었어.'],
  3: ['이번엔 다르다.', '네 약점을 알아냈다.', '무릎을 꿇어라.'],
  4: ['이제 공포를 알겠지?', '넌 나를 이길 수 없어.', '절망해라.'],
  5: ['이것이 마지막이다.', '너와 나, 둘 중 하나만 살아남는다.', '운명의 끝을 보자.'],
};

function createNemesis(player) {
  if (player.nemesis) return { ok: false, reason: '이미 숙적 존재' };
  const archetype = NEMESIS_ARCHETYPES[Math.floor(Math.random() * NEMESIS_ARCHETYPES.length)];
  player.nemesis = {
    archetype: archetype.id, name: `${player.name}의 그림자`, icon: archetype.icon,
    stage: 1, losses: 0, hp: (player.hp || 500), atk: (player.atk || 50),
    created: Date.now(), dialogue: NEMESIS_DIALOGUE[1][0],
  };
  return { ok: true, nemesis: player.nemesis };
}

function nemesisDefeat(player, won) {
  if (!player.nemesis) return { ok: false };
  if (won) {
    const stage = player.nemesis.stage;
    const reward = NEMESIS_REWARDS[`stage${stage}`];
    if (stage >= 5) { player.nemesis = null; return { ok: true, won: true, final: true, reward }; }
    player.nemesis = null;
    return { ok: true, won: true, reward };
  } else {
    player.nemesis.losses++;
    player.nemesis.stage = Math.min(5, player.nemesis.stage + 1);
    player.nemesis.hp = Math.floor(player.nemesis.hp * (1 + NEMESIS_EVOLVE_PER_LOSS));
    player.nemesis.atk = Math.floor(player.nemesis.atk * (1 + NEMESIS_EVOLVE_PER_LOSS));
    player.nemesis.dialogue = NEMESIS_DIALOGUE[player.nemesis.stage]?.[0] || '...';
    return { ok: true, won: false, nemesis: player.nemesis };
  }
}

function register(io, socket, player) {
  socket.on('nemesis_info', () => {
    socket.emit('nemesis_info', { archetypes: NEMESIS_ARCHETYPES, stages: NEMESIS_STAGES, triggers: NEMESIS_TRIGGERS, rewards: NEMESIS_REWARDS, current: player.nemesis });
  });
  socket.on('nemesis_battle_result', (data) => {
    const result = nemesisDefeat(player, data.won);
    socket.emit('nemesis_result', result);
    if (result.won && result.final) io.emit('server_msg', `⚔️💀 [숙적] ${player.name}이(가) 최종 네메시스를 격파! 운명의 승리!`);
    else if (!result.won) io.emit('server_msg', `👤🌑 [숙적] ${player.name}의 네메시스가 더 강해졌다... (${result.nemesis?.stage}단계)`);
  });
}

module.exports = { NEMESIS_ARCHETYPES, NEMESIS_STAGES, NEMESIS_TRIGGERS, NEMESIS_REWARDS, NEMESIS_DIALOGUE, createNemesis, nemesisDefeat, register };
