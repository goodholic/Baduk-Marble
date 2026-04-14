// v6.5 — 업적 트리 시스템
// 업적이 트리 형태로 분기, 특정 경로 선택 → 고유 보상

const ACHIEVEMENT_BRANCHES = {
  warrior_path: {
    name: '전사의 길', icon: '⚔️🌳',
    nodes: [
      { id: 'w1', name: '첫 킬', req: { kills: 1 }, reward: { gold: 500 }, children: ['w2a', 'w2b'] },
      { id: 'w2a', name: '100 킬', req: { kills: 100 }, reward: { atk: 1.03 }, children: ['w3a'] },
      { id: 'w2b', name: '보스 10 킬', req: { bossKills: 10 }, reward: { bossDmg: 1.05 }, children: ['w3b'] },
      { id: 'w3a', name: '1000 킬', req: { kills: 1000 }, reward: { atk: 1.05, title: '학살자' }, children: ['w4'] },
      { id: 'w3b', name: '보스 50 킬', req: { bossKills: 50 }, reward: { bossDmg: 1.1, title: '보스 슬레이어' }, children: ['w4'] },
      { id: 'w4', name: '전설의 전사', req: { kills: 5000, bossKills: 100 }, reward: { atk: 1.1, title: '전설의 전사', frame: true }, final: true },
    ],
  },
  merchant_path: {
    name: '상인의 길', icon: '💰🌳',
    nodes: [
      { id: 'm1', name: '첫 거래', req: { trades: 1 }, reward: { gold: 1000 }, children: ['m2a', 'm2b'] },
      { id: 'm2a', name: '거래 100회', req: { trades: 100 }, reward: { tradeBonus: 1.05 }, children: ['m3a'] },
      { id: 'm2b', name: '수익 10만G', req: { tradeProfit: 100000 }, reward: { gold: 10000 }, children: ['m3b'] },
      { id: 'm3a', name: '무역왕', req: { trades: 500 }, reward: { tradeBonus: 1.1, title: '무역왕' }, children: ['m4'] },
      { id: 'm3b', name: '백만장자', req: { tradeProfit: 1000000 }, reward: { goldProd: 1.1, title: '백만장자' }, children: ['m4'] },
      { id: 'm4', name: '상업 황제', req: { trades: 1000, tradeProfit: 10000000 }, reward: { tradeBonus: 1.15, title: '상업 황제', frame: true }, final: true },
    ],
  },
  explorer_path: {
    name: '탐험가의 길', icon: '🗺️🌳',
    nodes: [
      { id: 'e1', name: '첫 탐험', req: { zones: 1 }, reward: { exp: 500 }, children: ['e2a', 'e2b'] },
      { id: 'e2a', name: '10 지역', req: { zones: 10 }, reward: { spd: 1.03 }, children: ['e3a'] },
      { id: 'e2b', name: '비밀 지역 1', req: { secretZones: 1 }, reward: { dropRate: 1.05 }, children: ['e3b'] },
      { id: 'e3a', name: '전 지역', req: { zones: 50 }, reward: { spd: 1.05, title: '세계 여행자' }, children: ['e4'] },
      { id: 'e3b', name: '비밀 지역 5', req: { secretZones: 5 }, reward: { dropRate: 1.1, title: '비밀 탐험가' }, children: ['e4'] },
      { id: 'e4', name: '차원 탐험가', req: { zones: 50, secretZones: 5, dimensions: 12 }, reward: { allStat: 1.05, title: '차원 탐험가', frame: true }, final: true },
    ],
  },
  social_path: {
    name: '사교가의 길', icon: '🤝🌳',
    nodes: [
      { id: 's1', name: '첫 친구', req: { friends: 1 }, reward: { gold: 500 }, children: ['s2a', 's2b'] },
      { id: 's2a', name: '길드 가입', req: { guild: true }, reward: { teamBuff: 1.03 }, children: ['s3'] },
      { id: 's2b', name: '사제 관계', req: { mentor: true }, reward: { expBonus: 1.05 }, children: ['s3'] },
      { id: 's3', name: '사교의 달인', req: { friends: 50, guild: true, mentor: true }, reward: { teamBuff: 1.08, title: '사교의 달인' }, children: ['s4'] },
      { id: 's4', name: '서버의 중심', req: { friends: 100, clanLeader: true }, reward: { allStat: 1.05, title: '서버의 중심', frame: true }, final: true },
    ],
  },
};

// 업적 보상 요약
const FINAL_REWARDS = {
  all_paths: { title: '만능인', bonus: { allStat: 1.1 }, desc: '4개 경로 전부 최종 달성' },
};

function checkAchievement(player, nodeId) {
  // 간략화: 실제로는 req 조건 체크
  player.achievementTree = player.achievementTree || {};
  player.achievementTree[nodeId] = true;
  return { ok: true, nodeId };
}

function register(io, socket, player) {
  socket.on('achievement_tree_info', () => {
    socket.emit('achievement_tree_info', { branches: ACHIEVEMENT_BRANCHES, finalRewards: FINAL_REWARDS, completed: player.achievementTree || {} });
  });
  socket.on('achievement_tree_claim', (data) => {
    const result = checkAchievement(player, data.nodeId);
    socket.emit('achievement_tree_result', result);
  });
}

module.exports = { ACHIEVEMENT_BRANCHES, FINAL_REWARDS, checkAchievement, register };
