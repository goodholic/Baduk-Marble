// v6.7 — 영지 우편 서비스 시스템
// 플레이어 간 아이템/편지/선물 전송, 택배, 우편 퀘스트

const DELIVERY_TYPES = [
  { id: 'letter', name: '편지', icon: '✉️', cost: 100, time: 0, desc: '즉시 도착하는 편지' },
  { id: 'package', name: '소포', icon: '📦', cost: 500, time: 300, desc: '아이템 전송 (5분 소요)' },
  { id: 'gift', name: '선물 상자', icon: '🎁', cost: 1000, time: 0, desc: '특별 포장! 개봉 시 이펙트', special: true },
  { id: 'express', name: '특급 배송', icon: '📦💨', cost: 3000, time: 0, desc: '아이템 즉시 전송' },
  { id: 'anonymous', name: '익명 배송', icon: '📦❓', cost: 2000, time: 300, desc: '발신인 비공개!' },
  { id: 'bomb_mail', name: '폭탄 우편', icon: '📦💣', cost: 5000, time: 600, desc: '개봉 시 폭발! (DMG 500)', karma: -10, risky: true },
];

// 우편 배달원 (NPC)
const POSTMEN = [
  { id: 'basic', name: '일반 배달원', icon: '🧑‍✈️', speed: 1.0, safety: 0.9, desc: '기본 배달 (10% 분실 확률)' },
  { id: 'fast', name: '급행 배달원', icon: '🏃‍♂️💨', speed: 2.0, safety: 0.85, desc: '빠르지만 분실 15%' },
  { id: 'armored', name: '무장 배달원', icon: '💂📦', speed: 0.7, safety: 0.99, desc: '느리지만 안전 99%' },
  { id: 'flying', name: '비행 배달원', icon: '🦅📦', speed: 3.0, safety: 0.95, desc: '초고속! 하늘 배달' },
  { id: 'dimensional', name: '차원 배달원', icon: '🌀📦', speed: 10.0, safety: 1.0, cost: 10000, desc: '즉시+안전 100%! (비쌈)', premium: true },
];

// 우편 퀘스트 (배달 임무)
const POSTAL_QUESTS = [
  { id: 'local_delivery', name: '마을 배달', reward: { gold: 2000, exp: 200 }, packages: 5, desc: '같은 지역 내 배달' },
  { id: 'regional_delivery', name: '지역 배달', reward: { gold: 5000, exp: 500 }, packages: 3, desc: '인접 지역으로 배달' },
  { id: 'cross_country', name: '대륙 횡단 배달', reward: { gold: 15000, exp: 1500 }, packages: 1, desc: '대륙 끝까지!' },
  { id: 'dangerous_delivery', name: '위험 배달', reward: { gold: 20000, exp: 2000, item: 'postal_badge' }, packages: 1, desc: '전쟁 지역 배달!', combat: true },
  { id: 'time_limited', name: '긴급 배달', reward: { gold: 10000, exp: 1000 }, packages: 1, timeLimit: 60, desc: '1분 내 배달!' },
];

// 우편함 시스템
const MAILBOX = {
  maxSlots: 50,
  autoDelete: 30, // 30일 후 자동 삭제
  premium: { maxSlots: 200, autoDelete: 90, cost: 10000, desc: '프리미엄 우편함' },
};

// 우편 이벤트
const POSTAL_EVENTS = [
  { id: 'lost_mail', name: '분실 우편', chance: 0.05, effect: '배달 실패! 보상금 지급', desc: '배달원이 길을 잃었다...' },
  { id: 'bonus_mail', name: '보너스 우편', chance: 0.08, effect: '랜덤 보너스 아이템 동봉!', desc: '깜짝 선물!' },
  { id: 'chain_letter', name: '행운의 편지', chance: 0.03, effect: '전달하면 행운+10%, 안 하면 행운-5%', desc: '전달할까 말까...' },
  { id: 'mystery_package', name: '미스터리 소포', chance: 0.02, effect: '정체불명 아이템! (좋은 것 or 나쁜 것)', desc: '열어볼 용기가 있는가?' },
];

function sendMail(player, targetId, deliveryType, content) {
  const dType = DELIVERY_TYPES.find(d => d.id === deliveryType);
  if (!dType) return { ok: false, reason: '알 수 없는 배송 유형' };
  if ((player.gold || 0) < dType.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= dType.cost;
  if (dType.karma) player.karma = (player.karma || 0) + dType.karma;
  return { ok: true, delivery: dType, target: targetId, content };
}

function register(io, socket, player) {
  socket.on('postal_info', () => {
    socket.emit('postal_info', { types: DELIVERY_TYPES, postmen: POSTMEN, quests: POSTAL_QUESTS, mailbox: MAILBOX, events: POSTAL_EVENTS });
  });
  socket.on('postal_send', (data) => {
    const result = sendMail(player, data.targetId, data.type, data.content);
    socket.emit('postal_send_result', result);
    if (result.ok && data.type === 'gift') io.emit('server_msg', `🎁 [우편] ${player.name}이(가) 선물을 보냈다!`);
  });
}

module.exports = { DELIVERY_TYPES, POSTMEN, POSTAL_QUESTS, MAILBOX, POSTAL_EVENTS, sendMail, register };
