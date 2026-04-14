// v6.2 — 용병 소원 시스템
// 특정 조건 달성 시 소원 1개 허락, 강력한 1회성 효과

const WISH_COOLDOWN = 604800; // 1주일

const WISHES = [
  { id: 'power', name: '힘의 소원', icon: '💪⭐', effect: '선택 용병 ATK 영구 +20%', cost: { gold: 100000, item: '소원의 구슬' } },
  { id: 'life', name: '생명의 소원', icon: '❤️⭐', effect: '선택 용병 HP 영구 +30%', cost: { gold: 100000, item: '소원의 구슬' } },
  { id: 'revival', name: '부활의 소원', icon: '💫⭐', effect: '어둠의 대륙 전사자 1명 부활!', cost: { gold: 200000, item: '소원의 구슬 ×3' } },
  { id: 'wealth', name: '부의 소원', icon: '💰⭐', effect: '즉시 골드 500000 획득', cost: { item: '소원의 구슬' } },
  { id: 'knowledge', name: '지식의 소원', icon: '📚⭐', effect: '모든 연구 즉시 완료', cost: { gold: 150000, item: '소원의 구슬 ×2' } },
  { id: 'destiny', name: '운명의 소원', icon: '🌟⭐', effect: '선택 용병 운명 변경 (원하는 운명으로)', cost: { gold: 200000, item: '소원의 구슬 ×2' } },
  { id: 'immortal', name: '불멸의 소원', icon: '♾️⭐', effect: '선택 용병 영구사망 면역 (1회)', cost: { gold: 300000, item: '소원의 구슬 ×5' } },
  { id: 'creation', name: '창조의 소원', icon: '🌌⭐', effect: '원하는 스탯의 커스텀 용병 1명 생성!', cost: { gold: 500000, item: '소원의 구슬 ×10' }, legendary: true },
  { id: 'time', name: '시간의 소원', icon: '⏰⭐', effect: '프레스티지 보너스를 유지한 채 레벨 리셋 없이 추가 보너스', cost: { gold: 1000000, item: '소원의 구슬 ×20' }, legendary: true },
];

// 소원의 구슬 획득처
const WISH_ORB_SOURCES = [
  { source: '월드 보스 처치', chance: 0.1 },
  { source: '어둠의 대륙 보스', chance: 0.15 },
  { source: '차원 정복 (기원 차원)', chance: 0.2 },
  { source: '그랜드 토너먼트 1위', chance: 1.0 },
  { source: '7회 환생 완료', chance: 1.0 },
  { source: '10회 프레스티지', chance: 1.0 },
];

function makeWish(player, wishId, targetMercId) {
  const wish = WISHES.find(w => w.id === wishId);
  if (!wish) return { ok: false, reason: '알 수 없는 소원' };
  if (wish.cost.gold && (player.gold || 0) < wish.cost.gold) return { ok: false, reason: '골드 부족' };
  const now = Date.now();
  if (player.lastWishTime && now - player.lastWishTime < WISH_COOLDOWN * 1000) return { ok: false, reason: '소원 쿨다운 중' };

  if (wish.cost.gold) player.gold -= wish.cost.gold;
  player.lastWishTime = now;
  player.wishCount = (player.wishCount || 0) + 1;

  return { ok: true, wish: wish.name, effect: wish.effect };
}

function register(io, socket, player) {
  socket.on('wish_info', () => {
    socket.emit('wish_info', { wishes: WISHES, sources: WISH_ORB_SOURCES, cooldown: WISH_COOLDOWN, wishCount: player.wishCount || 0, orbs: player.wishOrbs || 0 });
  });
  socket.on('wish_make', (data) => {
    const result = makeWish(player, data.wishId, data.mercId);
    socket.emit('wish_result', result);
    if (result.ok) io.emit('server_msg', `⭐🌟 [소원] ${player.name}이(가) "${result.wish}"을 빌었다! ${result.effect}`);
  });
}

module.exports = { WISHES, WISH_ORB_SOURCES, WISH_COOLDOWN, makeWish, register };
