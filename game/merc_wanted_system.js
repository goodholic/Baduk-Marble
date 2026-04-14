// v5.4 — 용병 수배/현상금 시스템
// PK 시 수배됨, 현상금 사냥꾼이 추적, 수배 해제 퀘스트

const KARMA_PER_KILL = -15;
const WANTED_THRESHOLD = -50;

const WANTED_LEVELS = [
  { level: 1, name: '소요범', icon: '⭐', karma: -50, bounty: 5000, hunters: 1, desc: '소규모 PK, NPC 경비병 적대' },
  { level: 2, name: '범죄자', icon: '⭐⭐', karma: -100, bounty: 15000, hunters: 2, desc: '마을 출입 제한' },
  { level: 3, name: '악명높은 자', icon: '⭐⭐⭐', karma: -200, bounty: 50000, hunters: 3, desc: '전 NPC 적대, 상점 이용 불가' },
  { level: 4, name: '대악당', icon: '💀⭐⭐⭐⭐', karma: -400, bounty: 150000, hunters: 5, desc: '현상금 사냥꾼 자동 파견' },
  { level: 5, name: '공공의 적', icon: '💀💀⭐⭐⭐⭐⭐', karma: -700, bounty: 500000, hunters: 10, desc: '서버 전체 추적! 위치 공개!', serverWide: true },
];

// 현상금 사냥꾼 NPC
const BOUNTY_HUNTERS = [
  { id: 'hunter_rookie', name: '신입 사냥꾼', hp: 1000, atk: 100, reward: 500 },
  { id: 'hunter_veteran', name: '베테랑 사냥꾼', hp: 3000, atk: 250, reward: 2000 },
  { id: 'hunter_elite', name: '엘리트 사냥꾼', hp: 6000, atk: 400, reward: 5000 },
  { id: 'hunter_legendary', name: '전설의 사냥꾼', hp: 15000, atk: 700, reward: 20000 },
  { id: 'hunter_nemesis', name: '숙적', hp: 30000, atk: 1000, reward: 50000, adapts: true },
];

// 수배 해제 방법
const REDEMPTION_QUESTS = [
  { id: 'community_service', name: '봉사 활동', desc: '마을 퀘스트 10개 완료', karmaGain: 30 },
  { id: 'donation', name: '기부', desc: '50000G 기부', karmaGain: 50 },
  { id: 'monster_hunt', name: '토벌 의뢰', desc: '보스 몬스터 5마리 처치', karmaGain: 40 },
  { id: 'bodyguard', name: '호위 임무', desc: '다른 플레이어 카라반 호위 성공 3회', karmaGain: 60 },
  { id: 'confession', name: '참회', desc: '신전에서 1시간 참회 (접속 유지)', karmaGain: 100 },
  { id: 'turn_in', name: '자수', desc: '감옥에서 10분 대기', karmaGain: 80, penalty: 'gold_loss_20%' },
];

// PK 보상 (킬러 관점)
const PK_REWARDS = {
  loot_chance: 0.3,    // 30% 확률로 장비 1개 드롭
  gold_steal: 0.1,     // 골드 10% 탈취
  karma_loss: -15,
  wanted_increase: true,
};

// 인살자 칭호 (PK 특화)
const ASSASSIN_TITLES = [
  { kills: 10, name: '살인마', bonus: { atk: 1.03 } },
  { kills: 50, name: '살육자', bonus: { atk: 1.05, crit: 1.05 } },
  { kills: 100, name: '학살의 왕', bonus: { atk: 1.08, crit: 1.08 } },
  { kills: 500, name: '죽음의 신', bonus: { atk: 1.12, crit: 1.1, fear: true } },
];

function getWantedLevel(karma) {
  return [...WANTED_LEVELS].reverse().find(w => karma <= w.karma) || null;
}

function register(io, socket, player) {
  socket.on('wanted_status', () => {
    const wanted = getWantedLevel(player.karma || 0);
    const title = ASSASSIN_TITLES.filter(t => (player.pkKills || 0) >= t.kills).pop();
    socket.emit('wanted_status', {
      karma: player.karma || 0,
      wanted,
      pkKills: player.pkKills || 0,
      assassinTitle: title,
      redemptions: REDEMPTION_QUESTS,
    });
  });

  socket.on('wanted_redeem', (data) => {
    const quest = REDEMPTION_QUESTS.find(q => q.id === data.questId);
    if (!quest) return socket.emit('wanted_redeem_result', { ok: false });
    player.karma = Math.min(0, (player.karma || 0) + quest.karmaGain);
    socket.emit('wanted_redeem_result', { ok: true, karma: player.karma, quest: quest.name });
  });

  socket.on('wanted_bounty_board', () => {
    socket.emit('wanted_bounty_board', { levels: WANTED_LEVELS, hunters: BOUNTY_HUNTERS, pkRewards: PK_REWARDS });
  });
}

module.exports = { WANTED_LEVELS, BOUNTY_HUNTERS, REDEMPTION_QUESTS, PK_REWARDS, ASSASSIN_TITLES, getWantedLevel, register };
