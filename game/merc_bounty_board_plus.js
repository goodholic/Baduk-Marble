// v6.5 — 현상금 게시판+ (확장)
// 플레이어가 직접 현상금 의뢰, 다른 플레이어/용병 대상, 수주+완수

const MIN_BOUNTY = 5000;
const MAX_BOUNTY = 1000000;

const BOUNTY_TYPES = [
  { id: 'kill_player', name: '플레이어 처치', icon: '💀🧑', desc: '지정 플레이어를 PvP로 처치', reward: 'bounty×1.0', karmaChange: -10 },
  { id: 'steal_item', name: '아이템 탈취', icon: '🤏📦', desc: '지정 플레이어의 특정 아이템 탈취', reward: 'bounty×1.2', karmaChange: -5 },
  { id: 'defeat_guild', name: '길드 패배', icon: '⚔️🏰', desc: '지정 길드를 공성전에서 패배시킴', reward: 'bounty×1.5', karmaChange: -15 },
  { id: 'escort_npc', name: 'NPC 호위', icon: '🛡️🧑', desc: '특정 NPC를 안전하게 호위', reward: 'bounty×1.0', karmaChange: +5 },
  { id: 'gather_resource', name: '자원 수집', icon: '⛏️📦', desc: '특정 자원 X개 수집 납품', reward: 'bounty×0.8', karmaChange: 0 },
  { id: 'tame_monster', name: '몬스터 포획', icon: '🪤🐲', desc: '특정 몬스터 포획하여 납품', reward: 'bounty×1.3', karmaChange: 0 },
  { id: 'spy_mission', name: '첩보 의뢰', icon: '🕵️📋', desc: '지정 영지 정보 수집', reward: 'bounty×1.1', karmaChange: -5 },
  { id: 'protection', name: '보디가드', icon: '🛡️💪', desc: '의뢰인을 24시간 보호', reward: 'bounty×1.0', karmaChange: +5 },
];

// 현상금 사냥꾼 등급
const HUNTER_RANKS = [
  { rank: 1, name: '견습 사냥꾼', completions: 0, bonus: {} },
  { rank: 2, name: '사냥꾼', completions: 5, bonus: { bountyMul: 1.1 } },
  { rank: 3, name: '베테랑 사냥꾼', completions: 15, bonus: { bountyMul: 1.2 } },
  { rank: 4, name: '마스터 사냥꾼', completions: 30, bonus: { bountyMul: 1.3, exclusive: true } },
  { rank: 5, name: '전설의 사냥꾼', completions: 50, bonus: { bountyMul: 1.5, title: true, frame: true } },
];

// 의뢰 난이도 등급
const DIFFICULTY_TIERS = [
  { tier: 'D', minBounty: 5000, maxBounty: 20000, desc: '쉬움' },
  { tier: 'C', minBounty: 20000, maxBounty: 50000, desc: '보통' },
  { tier: 'B', minBounty: 50000, maxBounty: 150000, desc: '어려움' },
  { tier: 'A', minBounty: 150000, maxBounty: 500000, desc: '매우 어려움' },
  { tier: 'S', minBounty: 500000, maxBounty: 1000000, desc: '극한!' },
];

// 의뢰 실패 패널티
const FAILURE_PENALTY = {
  hunter: '평판 -10, 24시간 수주 불가',
  client: '환불 없음 (의뢰비 소멸)',
};

function postBounty(player, bountyType, targetId, amount, details) {
  const bType = BOUNTY_TYPES.find(b => b.id === bountyType);
  if (!bType) return { ok: false, reason: '알 수 없는 의뢰' };
  if (amount < MIN_BOUNTY || amount > MAX_BOUNTY) return { ok: false, reason: `의뢰금: ${MIN_BOUNTY}~${MAX_BOUNTY}G` };
  if ((player.gold || 0) < amount) return { ok: false, reason: '골드 부족' };
  player.gold -= amount;

  const bounty = {
    id: `bounty_${Date.now()}`, type: bountyType, target: targetId,
    amount, details, poster: player.id, posterName: player.name,
    status: 'open', postedAt: Date.now(),
  };
  return { ok: true, bounty };
}

function register(io, socket, player) {
  socket.on('bounty_board_info', () => {
    const rank = [...HUNTER_RANKS].reverse().find(r => (player.bountyCompletions || 0) >= r.completions);
    socket.emit('bounty_board_info', { types: BOUNTY_TYPES, hunterRanks: HUNTER_RANKS, difficulties: DIFFICULTY_TIERS, failure: FAILURE_PENALTY, myRank: rank });
  });
  socket.on('bounty_post', (data) => {
    const result = postBounty(player, data.type, data.targetId, data.amount, data.details);
    socket.emit('bounty_post_result', result);
    if (result.ok) io.emit('server_msg', `📋💰 [현상금] 새 의뢰 등록! "${BOUNTY_TYPES.find(b=>b.id===data.type)?.name}" (${data.amount}G)`);
  });
}

module.exports = { BOUNTY_TYPES, HUNTER_RANKS, DIFFICULTY_TIERS, FAILURE_PENALTY, postBounty, register };
