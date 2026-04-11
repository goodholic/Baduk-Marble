// ══════════════════════════════════════════════════════
// AutoBattle.io v3.0 — 게임 설계 문서 (코드 겸용)
// RPG 서바이벌 IO + SLG (거상/포켓몬/리니지/알비온)
// ══════════════════════════════════════════════════════

// ── 게임 구조 ──
//
// ┌─────────────────────────────────────────────────┐
// │         1단계: 서바이벌 IO (단판)                │
// │  매 판 Lv.1부터 → 10분 생존 → 보상 획득         │
// │  보상: 골드, 재료, 용병 카드, 장비 파편          │
// └───────────────────┬─────────────────────────────┘
//                     ↓ 보상이 영구 계정에 누적
// ┌─────────────────────────────────────────────────┐
// │         2단계: SLG (전략 시뮬레이션)             │
// │                                                 │
// │  🏰 내 성 건설/업그레이드                        │
// │  ⚔️ 용병 수집/육성/편성                          │
// │  💰 마을 간 무역 (거상 스타일)                   │
// │  🗡️ 다른 플레이어 성 공격 (공성전)              │
// │  🐾 몬스터 포획/수집 (포켓몬 스타일)            │
// │  ☠️ 필드 PK (리니지 스타일)                     │
// │  🎪 이벤트/토너먼트/레이드                      │
// └─────────────────────────────────────────────────┘
//
// 핵심: 서바이벌에서 번 자원으로 SLG를 키우고,
//       SLG에서 강해져서 서바이벌에서 더 잘하는 순환!

// ═══ 1단계: 서바이벌 IO 보상 → SLG 연결 ═══
const SURVIVAL_TO_SLG_REWARDS = {
  // 서바이벌 성과별 SLG 보상
  perKill:      { gold: 2, material: 0.1 },      // 킬당
  perWave:      { gold: 50, material: 1 },        // 웨이브당
  perBossKill:  { gold: 200, mercCard: 0.3 },     // 보스당 (30% 용병 카드)
  perLevel:     { gold: 30, equipFragment: 0.2 }, // 레벨당 (20% 장비 파편)
  matchEnd: {   // 매치 종료 시 순위별
    1: { gold: 5000, diamonds: 50, mercCard: 1, legendaryChance: 0.1 },
    2: { gold: 3000, diamonds: 30, mercCard: 0.5 },
    3: { gold: 2000, diamonds: 20 },
    default: { gold: 500, diamonds: 5 },
  },
};

// ═══ 2단계: SLG 시스템 ═══

// ── 성(Castle) 시스템 ──
const CASTLE_TIERS = [
  { lv: 1, name: '캠프',       icon: '⛺', cost: 0,       buildTime: 0,    slots: 3,  wallHp: 500,   desc: '시작 거점' },
  { lv: 2, name: '목책 요새',  icon: '🏕️', cost: 5000,   buildTime: 60,   slots: 5,  wallHp: 1500,  desc: '나무 울타리' },
  { lv: 3, name: '석조 성채',  icon: '🏰', cost: 20000,  buildTime: 300,  slots: 8,  wallHp: 5000,  desc: '돌로 지은 성' },
  { lv: 4, name: '왕의 성',    icon: '🏯', cost: 80000,  buildTime: 900,  slots: 12, wallHp: 15000, desc: '거대한 왕성' },
  { lv: 5, name: '제국 요새',  icon: '🗼', cost: 300000, buildTime: 1800, slots: 18, wallHp: 50000, desc: '난공불락 요새' },
];

// 성 시설 (슬롯에 배치)
const CASTLE_BUILDINGS = {
  barracks:    { name: '병영',     icon: '⚔️', cost: 2000,  effect: 'mercSlots +2', desc: '용병 배치 슬롯 증가' },
  wall:        { name: '성벽 강화',icon: '🧱', cost: 3000,  effect: 'wallHp +2000', desc: '성벽 내구도 증가' },
  watchtower:  { name: '감시탑',   icon: '🗼', cost: 5000,  effect: 'visionRange +50', desc: '적 감지 범위 증가' },
  market:      { name: '시장',     icon: '💰', cost: 4000,  effect: 'tradeSlots +1', desc: '교역 슬롯 증가' },
  smithy:      { name: '대장간',   icon: '🔨', cost: 6000,  effect: 'equipUpgrade', desc: '장비 강화 가능' },
  stable:      { name: '마구간',   icon: '🐴', cost: 8000,  effect: 'mountSlots +1', desc: '탈것 보관' },
  temple:      { name: '신전',     icon: '⛪', cost: 10000, effect: 'healRate +20%', desc: '용병 회복 속도 증가' },
  warehouse:   { name: '창고',     icon: '📦', cost: 3000,  effect: 'storage +500', desc: '자원 보관량 증가' },
  academy:     { name: '학원',     icon: '📚', cost: 15000, effect: 'mercExpRate +30%', desc: '용병 경험치 증가' },
  trap:        { name: '함정',     icon: '⚠️', cost: 5000,  effect: 'trapDmg 200', desc: '침입자에게 함정 데미지' },
};

// ── 용병(Mercenary) 시스템 ──
const MERC_GRADES = ['일반','고급','희귀','영웅','전설','신화'];
const MERC_CLASSES = ['전사','궁수','마법사','기사','암살자','사제','드래곤나이트','네크로맨서'];

const MERC_TEMPLATES = [
  // 일반
  { id: 'merc_soldier',    name: '보병',       icon: '🗡️', grade: 0, cls: '전사',   baseAtk: 10, baseDef: 8,  baseHp: 100 },
  { id: 'merc_archer',     name: '궁수',       icon: '🏹', grade: 0, cls: '궁수',   baseAtk: 12, baseDef: 4,  baseHp: 70 },
  { id: 'merc_mage_basic', name: '견습 마법사', icon: '🔮', grade: 0, cls: '마법사', baseAtk: 14, baseDef: 3,  baseHp: 60 },
  // 고급
  { id: 'merc_knight',     name: '기사',       icon: '⚔️', grade: 1, cls: '기사',   baseAtk: 15, baseDef: 14, baseHp: 150 },
  { id: 'merc_rogue',      name: '도적',       icon: '🗡️', grade: 1, cls: '암살자', baseAtk: 18, baseDef: 5,  baseHp: 80 },
  // 희귀
  { id: 'merc_paladin',    name: '성기사',     icon: '✝️', grade: 2, cls: '기사',   baseAtk: 20, baseDef: 18, baseHp: 200 },
  { id: 'merc_warlock',    name: '흑마법사',   icon: '☠️', grade: 2, cls: '마법사', baseAtk: 25, baseDef: 6,  baseHp: 90 },
  { id: 'merc_healer',     name: '치유사',     icon: '💚', grade: 2, cls: '사제',   baseAtk: 8,  baseDef: 10, baseHp: 120 },
  // 영웅
  { id: 'merc_dragonknight',name:'드래곤나이트',icon: '🐲', grade: 3, cls: '드래곤나이트', baseAtk: 35, baseDef: 25, baseHp: 300 },
  { id: 'merc_archmage',   name: '대마법사',   icon: '🌟', grade: 3, cls: '마법사', baseAtk: 40, baseDef: 8,  baseHp: 130 },
  // 전설
  { id: 'merc_deathknight', name:'죽음의 기사', icon: '💀', grade: 4, cls: '네크로맨서', baseAtk: 50, baseDef: 30, baseHp: 400 },
  { id: 'merc_seraph',     name: '세라핌',     icon: '👼', grade: 4, cls: '사제',   baseAtk: 30, baseDef: 20, baseHp: 350 },
  // 신화
  { id: 'merc_bahamut',    name: '바하무트',   icon: '🐲', grade: 5, cls: '드래곤나이트', baseAtk: 80, baseDef: 50, baseHp: 800 },
];

// ── 무역(Trade) 시스템 ──
const TRADE_ROUTES = [
  { from: 'aden',    to: 'harbor',   goods: '곡물',    buyPrice: 100,  sellPrice: 180, risk: 'low' },
  { from: 'harbor',  to: 'oasis',    goods: '해산물',   buyPrice: 150,  sellPrice: 280, risk: 'medium' },
  { from: 'oasis',   to: 'mountain', goods: '향신료',   buyPrice: 200,  sellPrice: 400, risk: 'medium' },
  { from: 'mountain',to: 'shrine',   goods: '광석',     buyPrice: 300,  sellPrice: 550, risk: 'high' },
  { from: 'shrine',  to: 'bazaar',   goods: '마법 결정', buyPrice: 500,  sellPrice: 1000,risk: 'high' },
  { from: 'bazaar',  to: 'aden',     goods: '보석',     buyPrice: 800,  sellPrice: 1500,risk: 'very_high' },
];

// ── 공성전(Siege) 시스템 ──
const SIEGE_RULES = {
  minAttackers: 1,
  prepareTime: 30,         // 30초 준비
  battleTime: 300,         // 5분 전투
  wallBreakReward: 1000,   // 성벽 파괴 보상
  victoryReward: { gold: 10000, diamonds: 100, lootPct: 20 }, // 승리 시 상대 자원 20% 약탈
  defenseReward: { gold: 5000, diamonds: 50 },  // 방어 성공 보상
  cooldown: 3600,          // 1시간 공격 쿨다운
};

// ── 몬스터 포획(Capture) 시스템 ──
const CAPTURE_CONFIG = {
  captureChance: { normal: 0.3, elite: 0.15, rare: 0.08, boss: 0.03 },
  maxCaptures: 6,          // 최대 포획 수
  evolutionLevels: [10, 25, 50], // 진화 레벨
  bondLevels: ['만남', '친밀', '신뢰', '유대', '영혼의 동반자'],
};

// ── PK 시스템 ──
const PK_RULES = {
  enabledZones: ['chaos','warzone','blood_arena','lawless'], // PK 허용 존
  karmaPerKill: 100,
  karmaDecay: 5,           // 분당 감소
  chaoticThreshold: 200,
  lootOnDeath: { goldPct: 10, itemDropChance: 0.3, equipDropChance: 0.1 },
  bountySystem: true,      // 현상금 시스템 연동
};

// ── 게임 사이클 ──
//
// 1. 서바이벌 IO 플레이 (10분) → 골드/재료/카드 획득
// 2. SLG 모드:
//    a. 성 건설/업그레이드
//    b. 용병 모집/육성/편성
//    c. 무역 (거상 스타일): 도시 간 물품 운송, 이윤 창출
//    d. 필드 탐험: 몬스터 포획, 자원 수집, PK
//    e. 공성전: 다른 플레이어 성 공격/방어
//    f. 이벤트: 토너먼트, 레이드, 시즌
// 3. 더 강해진 상태로 다시 서바이벌 IO → 반복
//
// SLG 진행도가 서바이벌에 미치는 영향:
// - 용병이 서바이벌에서 AI 동료로 참전
// - 성 시설이 시작 스탯 보너스 제공
// - 포획 몬스터가 서바이벌에서 소환 가능

module.exports = {
  SURVIVAL_TO_SLG_REWARDS,
  CASTLE_TIERS,
  CASTLE_BUILDINGS,
  MERC_GRADES,
  MERC_CLASSES,
  MERC_TEMPLATES,
  TRADE_ROUTES,
  SIEGE_RULES,
  CAPTURE_CONFIG,
  PK_RULES,
};
