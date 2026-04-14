// v6.2 — 영지 첩보 네트워크 확장
// 글로벌 첩보 네트워크, 정보 시장, 정보 거래, 첩보전 미니게임

const INFO_TYPES = [
  { id: 'military', name: '군사 정보', icon: '⚔️📋', value: 5000, desc: '적 군사력/배치 정보' },
  { id: 'economic', name: '경제 정보', icon: '💰📋', value: 3000, desc: '적 자원/무역 정보' },
  { id: 'political', name: '정치 정보', icon: '👑📋', value: 4000, desc: '적 의회/법안 정보' },
  { id: 'personal', name: '개인 정보', icon: '🧑📋', value: 8000, desc: '특정 플레이어 스탯/장비 정보' },
  { id: 'secret', name: '비밀 정보', icon: '🤫📋', value: 15000, desc: '비밀 결사/밀약 정보' },
  { id: 'blueprint', name: '설계도', icon: '📐📋', value: 20000, desc: '적 성/함정/메카 설계도' },
];

// 정보 시장 (플레이어 간 정보 거래)
const INFO_MARKET = {
  listingFee: 0.1, // 10%
  anonymousListing: true,
  bidding: true,
  verification: { cost: 2000, desc: '정보 진위 검증 (가짜 정보 방지)' },
};

// 첩보 네트워크 노드 (글로벌)
const NETWORK_NODES = [
  { id: 'tavern_net', name: '주점 네트워크', icon: '🍺🕸️', range: 'local', cost: 5000, desc: '지역 소문/정보 수집' },
  { id: 'merchant_net', name: '상인 네트워크', icon: '💼🕸️', range: 'regional', cost: 15000, desc: '무역 루트 정보' },
  { id: 'shadow_net', name: '그림자 네트워크', icon: '🌑🕸️', range: 'global', cost: 30000, desc: '전 서버 정보 접근' },
  { id: 'royal_net', name: '궁정 네트워크', icon: '👑🕸️', range: 'political', cost: 50000, desc: '정치/외교 핵심 정보' },
  { id: 'divine_net', name: '신전 네트워크', icon: '⛪🕸️', range: 'divine', cost: 80000, desc: '신앙/진영 극비 정보' },
];

// 역첩보 (적 첩보 차단)
const COUNTER_OPS = [
  { id: 'firewall', name: '정보 방화벽', cost: 10000, effect: '적 정보 수집 차단 (24시간)', icon: '🔥🧱' },
  { id: 'disinformation', name: '역정보 유포', cost: 15000, effect: '가짜 정보를 적에게 전달', icon: '📰🎭' },
  { id: 'mole_hunt', name: '내부자 사냥', cost: 20000, effect: '내통자 색출 + 정보 차단', icon: '🔍🕵️' },
  { id: 'encryption', name: '암호화', cost: 8000, effect: '핵심 정보 탈취 불가 (1주)', icon: '🔐' },
];

function register(io, socket, player) {
  socket.on('spy_network_info', () => {
    socket.emit('spy_network_info', { infoTypes: INFO_TYPES, market: INFO_MARKET, nodes: NETWORK_NODES, counterOps: COUNTER_OPS });
  });
  socket.on('spy_network_build', (data) => {
    const node = NETWORK_NODES.find(n => n.id === data.nodeId);
    if (!node) return socket.emit('spy_net_result', { ok: false });
    if ((player.gold || 0) < node.cost) return socket.emit('spy_net_result', { ok: false, reason: '골드 부족' });
    player.gold -= node.cost;
    socket.emit('spy_net_result', { ok: true, node: node.name });
  });
}

module.exports = { INFO_TYPES, INFO_MARKET, NETWORK_NODES, COUNTER_OPS, register };
