// 친구/우정 시스템 — v2.03
// 친구 추가, 친밀도(affinity) 누적, 선물 교환

const MAX_FRIENDS = 50;
const AFFINITY_TIERS = [
  { min:0,    label:'낯선 사람', icon:'👤' },
  { min:50,   label:'지인',     icon:'🙂' },
  { min:200,  label:'친구',     icon:'😊' },
  { min:500,  label:'단짝',     icon:'🤝' },
  { min:1000, label:'절친',     icon:'💖' },
  { min:2500, label:'영혼의 동반자', icon:'⭐' },
];
const DAILY_GIFT_COOLDOWN_HOURS = 20;

function _ensure(player) {
  if (!player.friends) {
    player.friends = {
      list: {},        // {playerId: {addedAt, affinity, lastGiftAt, name}}
      pendingFromMe: [],  // 보낸 요청
      pendingToMe: [],    // 받은 요청
    };
  }
  return player.friends;
}

function _tier(affinity) {
  let cur = AFFINITY_TIERS[0];
  for (const t of AFFINITY_TIERS) {
    if (affinity >= t.min) cur = t;
  }
  return cur;
}

function getStatus(player) {
  const f = _ensure(player);
  const enriched = {};
  for (const [id, data] of Object.entries(f.list)) {
    enriched[id] = { ...data, tier: _tier(data.affinity || 0) };
  }
  return {
    list: enriched,
    count: Object.keys(f.list).length,
    max: MAX_FRIENDS,
    pendingFromMe: f.pendingFromMe,
    pendingToMe: f.pendingToMe,
    tiers: AFFINITY_TIERS,
  };
}

function sendRequest(player, target) {
  if (!target || !target.id) return { success:false, msg:'대상 플레이어 없음' };
  if (target.id === player.id) return { success:false, msg:'자기 자신은 친구가 될 수 없음' };
  const f = _ensure(player);
  const tf = _ensure(target);
  if (f.list[target.id]) return { success:false, msg:'이미 친구임' };
  if (Object.keys(f.list).length >= MAX_FRIENDS) return { success:false, msg:'친구 슬롯 가득' };
  if (f.pendingFromMe.includes(target.id)) return { success:false, msg:'이미 요청 보냄' };

  f.pendingFromMe.push(target.id);
  if (!tf.pendingToMe.includes(player.id)) tf.pendingToMe.push(player.id);
  return { success:true, msg:`${target.displayName || target.id}에게 친구 요청 전송` };
}

function acceptRequest(player, requesterId, players) {
  const f = _ensure(player);
  const idx = f.pendingToMe.indexOf(requesterId);
  if (idx < 0) return { success:false, msg:'해당 요청 없음' };
  const requester = players?.[requesterId];
  if (!requester) return { success:false, msg:'요청자 오프라인' };
  const rf = _ensure(requester);

  f.pendingToMe.splice(idx, 1);
  const ridx = rf.pendingFromMe.indexOf(player.id);
  if (ridx >= 0) rf.pendingFromMe.splice(ridx, 1);

  const now = Date.now();
  f.list[requesterId] = { addedAt: now, affinity: 0, lastGiftAt: 0, name: requester.displayName || requesterId };
  rf.list[player.id] = { addedAt: now, affinity: 0, lastGiftAt: 0, name: player.displayName || player.id };

  return { success:true, msg:`${requester.displayName || requesterId}와(과) 친구가 됨!` };
}

function removeFriend(player, friendId, players) {
  const f = _ensure(player);
  if (!f.list[friendId]) return { success:false, msg:'친구가 아님' };
  delete f.list[friendId];
  // 상대방에서도 제거
  const other = players?.[friendId];
  if (other) {
    const of = _ensure(other);
    delete of.list[player.id];
  }
  return { success:true, msg:'친구 삭제 완료' };
}

function sendGift(player, friendId, players) {
  const f = _ensure(player);
  const entry = f.list[friendId];
  if (!entry) return { success:false, msg:'친구가 아님' };
  const now = Date.now();
  const cdMs = DAILY_GIFT_COOLDOWN_HOURS * 60 * 60 * 1000;
  if (now < (entry.lastGiftAt || 0) + cdMs) {
    const left = Math.ceil(((entry.lastGiftAt || 0) + cdMs - now) / 60000);
    return { success:false, msg:`선물 쿨다운 ${left}분 남음` };
  }
  if ((player.gold || 0) < 100) return { success:false, msg:'선물 비용 100G 부족' };

  player.gold -= 100;
  entry.lastGiftAt = now;
  entry.affinity = (entry.affinity || 0) + 10;

  // 상대방에게도 친밀도 부여
  const friend = players?.[friendId];
  if (friend) {
    const ff = _ensure(friend);
    if (ff.list[player.id]) {
      ff.list[player.id].affinity = (ff.list[player.id].affinity || 0) + 10;
    }
  }
  return {
    success:true,
    msg:`선물 전달 (-100G, +10 친밀도)`,
    newAffinity: entry.affinity,
    newTier: _tier(entry.affinity),
  };
}

module.exports = {
  MAX_FRIENDS,
  AFFINITY_TIERS,
  getStatus,
  sendRequest,
  acceptRequest,
  removeFriend,
  sendGift,
};
