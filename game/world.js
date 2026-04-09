// ==========================================
// World / Terrain helpers (extracted from server.js, Phase 2 refactor)
// ==========================================
// 사용법:
//   const world = require('./game/world');
//   world.init({ ZONES, ROADS, TERRAIN_BARRIERS, NPCS, festival,
//                getFACTIONS, getIsNight, getCurrentWeather });
//   world.isOnRoad(x, y);
//
// 주의: NPCS/ZONES/ROADS/TERRAIN_BARRIERS는 stable data — 직접 주입.
//       FACTIONS/isNight/currentWeather는 server.js 후반 declared / 가변 →
//       lazy getter로 주입해서 TDZ 회피.

let _ZONES = null;
let _ROADS = null;
let _BARRIERS = null;
let _NPCS = null;
let _festival = null;
let _getFACTIONS = null;
let _getIsNight = null;
let _getCurrentWeather = null;

function init(deps) {
    _ZONES = deps.ZONES;
    _ROADS = deps.ROADS;
    _BARRIERS = deps.TERRAIN_BARRIERS;
    _NPCS = deps.NPCS;
    _festival = deps.festival;
    _getFACTIONS = deps.getFACTIONS;
    _getIsNight = deps.getIsNight;
    _getCurrentWeather = deps.getCurrentWeather;
}

// 도로 위 이동속도 보너스 체크
function isOnRoad(x, y) {
    for (const road of _ROADS) {
        for (const pt of road.path) {
            if (Math.abs(x - pt.x) < 15 && Math.abs(y - pt.y) < 15) return true;
        }
    }
    return false;
}

// 지형 장벽 충돌 체크
function isBlocked(x, y) {
    for (const b of _BARRIERS) {
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            // 숲/늪은 통과 가능하지만 속도 감소 (차단 아님)
            if (b.type === 'forest_wall' || b.type === 'swamp_wall') return null;
            return b;
        }
    }
    return null;
}

function isSlowTerrain(x, y) {
    for (const b of _BARRIERS) {
        if ((b.type === 'forest_wall' || b.type === 'swamp_wall') &&
            x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return 0.5; // 50% 속도
    }
    return 1;
}

function getZone(x, y) {
    for (const [id, z] of Object.entries(_ZONES)) {
        if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return { id, ...z };
    }
    return { id:'plains', ..._ZONES.plains }; // 기본값
}

// NPC 대사 — 상황별 특수 대사 우선
function getNpcMsg(npcType, player) {
    const npc = _NPCS[npcType];
    if (!npc || !npc.msgs) return '...';
    const isNight = _getIsNight();
    const currentWeather = _getCurrentWeather();
    const FACTIONS = _getFACTIONS();

    // 상황별 특수 대사 (우선순위 높은 순)
    if (npc.type === 'healer' && player.hp < player.maxHp * 0.3) return '이런! 상처가 심하시군요! 어서 치료합시다!';
    if (npc.type === 'healer' && player.hp >= player.maxHp) return '건강하시군요! 계속 조심하세요.';
    if (npc.type === 'healer' && isNight) return '이 밤에 무슨 일이시죠... 치료해드리겠습니다.';
    if (npc.type === 'smith' && player.level >= 40) return '전설의 장인도 탐낼 장비를 가지고 계시군요!';
    if (npc.type === 'smith' && player.level >= 30) return '오, 숙련된 전사시군요! 전설 장비도 다뤄봤습니다.';
    if (npc.type === 'smith' && player.level < 10) return '아직 초보시군요. 철제 검부터 시작해보세요.';
    if (npc.type === 'shop' && player.gold > 10000) return '부자시군요! 이 특별한 상품은 어떠세요?';
    if (npc.type === 'shop' && player.gold < 100) return '골드가 부족하신 것 같군요... 몬스터를 더 사냥해보세요.';
    if (npc.type === 'travel' && currentWeather.id === 'storm') return '폭풍이 심합니다... 그래도 떠나시겠습니까?';
    if (npc.type === 'travel' && currentWeather.id === 'rain') return '비가 오지만 항해에는 문제없습니다!';
    if (npc.type === 'travel' && isNight) return '밤바다는 위험하지만... 용기 있는 분이시군요.';
    if (npc.type === 'fisher' && currentWeather.id === 'rain') return '비 오는 날엔 대어가 잘 잡힌답니다!';
    if (npc.type === 'fisher' && isNight) return '밤낚시는 운이 좋으면 전설 물고기가...!';
    // v1.16 신규 NPC 상황 대사
    if (npc.type === 'fortune' && isNight) return '밤은 별이 가장 잘 보이는 시간이죠... 운명을 읽을 수 있어요.';
    if (npc.type === 'fortune' && player.karma > 200) return '...당신에게서 어두운 기운이 느껴져요. 조심하세요.';
    if (npc.type === 'appraise' && player.level >= 30) return '전설급 장비를 다뤄본 분이시군요! 어떤 보물을 가져오셨나요?';
    if (npc.type === 'collect' && player.gold > 50000) return '오, 부유한 모험가시군요! 특별한 거래를 제안할 수 있어요.';
    if (player.faction && npc.type === 'shop') return `${FACTIONS[player.faction]?.name} 소속이시군요! 진영 할인은 없지만 응원합니다!`;
    if (player.prestigeLevel > 0) return `환생 ${player.prestigeLevel}차... 대단하시군요. 경의를 표합니다.`;
    // v1.28: 축제 이벤트 기간 중에는 30% 확률로 축제 인사
    const activeEvent = _festival.getActiveEvent();
    if (activeEvent && Math.random() < 0.3) return `[${activeEvent.name}] ${activeEvent.npcGreeting}`;
    return npc.msgs[Math.floor(Math.random() * npc.msgs.length)];
}

module.exports = { init, isOnRoad, isBlocked, isSlowTerrain, getZone, getNpcMsg };
