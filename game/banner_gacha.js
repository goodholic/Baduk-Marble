// ═══════════════════════════════════════════════════════════════
//  한정 배너 가챠 — v4.9
//  주간 로테이션 픽업, 확률 UP, 천장, FOMO
// ═══════════════════════════════════════════════════════════════

const BANNER_POOL = [
  { id: 'merc_dragon_knight', name: '드래곤나이트', icon: '🐲', grade: 3, element: 'fire',  rarity: '영웅', catchphrase: '용의 힘이 깃든 최강의 기사!' },
  { id: 'merc_death_knight',  name: '죽음의 기사', icon: '💀', grade: 4, element: 'dark',  rarity: '전설', catchphrase: '어둠의 끝에서 온 파멸의 검!' },
  { id: 'merc_seraph',        name: '세라핌',      icon: '👼', grade: 4, element: 'light', rarity: '전설', catchphrase: '천상의 빛으로 모두를 치유한다!' },
  { id: 'merc_bahamut',       name: '바하무트',    icon: '🐲', grade: 5, element: 'fire',  rarity: '신화', catchphrase: '만물을 태우는 용왕!' },
  { id: 'merc_emperor',       name: '패왕',        icon: '👑', grade: 5, element: 'light', rarity: '신화', catchphrase: '모든 것을 지배하는 절대자!' },
  { id: 'merc_frost_queen',   name: '서리 여왕',   icon: '❄️', grade: 3, element: 'water', rarity: '영웅', catchphrase: '만년빙의 여왕이 각성했다!' },
  { id: 'merc_storm_lord',    name: '폭풍의 군주', icon: '⛈️', grade: 3, element: 'wind',  rarity: '영웅', catchphrase: '뇌전을 부리는 폭풍의 왕!' },
  { id: 'merc_blood_queen',   name: '피의 여왕',   icon: '🩸', grade: 3, element: 'dark',  rarity: '영웅', catchphrase: '피로 목욕하는 잔혹한 여제!' },
  { id: 'merc_transcender',   name: '초월자',      icon: '🌟', grade: 5, element: 'fire',  rarity: '신화', catchphrase: '차원을 초월한 궁극의 존재!' },
  { id: 'merc_nature_god',    name: '자연신',      icon: '🌳', grade: 4, element: 'earth', rarity: '전설', catchphrase: '대자연의 힘을 품은 신!' },
];

const BANNER_CONFIG = {
  duration:          7 * 24 * 60 * 60 * 1000,  // 7일
  singleCost:        30,                        // 다이아
  tenPullCost:       270,                       // 10연차 (10% 할인)
  pickupRateBoost:   3.0,                       // 픽업 용병 확률 3배
  pityThreshold:     50,                        // 50회 천장 (영웅+ 확정)
  pityLegendary:     90,                        // 90회 천장 (전설+ 확정)
  guaranteedPickup:  true,                      // 천장 시 픽업 용병 확정
};

const GRADE_NAMES = { 0: '일반', 1: '고급', 2: '희귀', 3: '영웅', 4: '전설', 5: '신화' };

// ── 글로벌 배너 상태 ──
let bannerState = null;

function initBannerState() {
  bannerState = {
    currentBanner: null,   // BANNER_POOL 항목
    startTime: 0,
    endTime: 0,
    pullCounts: {},        // { playerId: number }
    history: {},           // { playerId: [ { merc, isPickup, isPity, time } ] }
  };
  rotateBanner();
  return bannerState;
}

// ── 배너 로테이션 ──
function rotateBanner(io) {
  if (!bannerState) initBannerState();

  // 이전 배너와 다른 용병 선택
  let pool = BANNER_POOL;
  if (bannerState.currentBanner) {
    pool = BANNER_POOL.filter(m => m.id !== bannerState.currentBanner.id);
  }
  const featured = pool[Math.floor(Math.random() * pool.length)];

  const now = Date.now();
  bannerState.currentBanner = featured;
  bannerState.startTime = now;
  bannerState.endTime = now + BANNER_CONFIG.duration;
  // 천장 카운트는 배너 전환 시에도 유지 (원신 방식)

  // 브로드캐스트
  if (io) {
    io.emit('server_msg', {
      msg: `🌟 신규 배너 등장! ${featured.icon} ${featured.name} 확률 UP! — "${featured.catchphrase}"`,
      type: 'boss',
    });
    io.emit('banner_rotated', getBannerInfo());
  }

  // 다음 로테이션 예약
  scheduleNextRotation(io);

  return getBannerInfo();
}

let rotationTimer = null;
function scheduleNextRotation(io) {
  if (rotationTimer) clearTimeout(rotationTimer);
  if (!bannerState) return;
  const remaining = bannerState.endTime - Date.now();
  if (remaining <= 0) { rotateBanner(io); return; }
  rotationTimer = setTimeout(() => rotateBanner(io), remaining);
}

// ── 배너 정보 조회 ──
function getBannerInfo() {
  if (!bannerState || !bannerState.currentBanner) return null;
  return {
    featured: bannerState.currentBanner,
    rarity: bannerState.currentBanner.rarity,
    catchphrase: bannerState.currentBanner.catchphrase,
    element: bannerState.currentBanner.element,
    startTime: bannerState.startTime,
    endTime: bannerState.endTime,
    remaining: getBannerCountdown(),
    pickupBoost: `x${BANNER_CONFIG.pickupRateBoost}`,
    cost: { single: BANNER_CONFIG.singleCost, ten: BANNER_CONFIG.tenPullCost },
    pity: { hero: BANNER_CONFIG.pityThreshold, legend: BANNER_CONFIG.pityLegendary },
  };
}

function getCurrentBanner() {
  if (!bannerState) initBannerState();
  // 만료 시 자동 로테이션
  if (Date.now() >= bannerState.endTime) rotateBanner();
  return getBannerInfo();
}

// ── 남은 시간 ──
function getBannerCountdown() {
  if (!bannerState) return null;
  const ms = Math.max(0, bannerState.endTime - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, text: `${d}일 ${h}시간 ${m}분 ${s}초`, days: d, hours: h, minutes: m, seconds: s };
}

// ── 플레이어 천장 카운트 ──
function getPlayerPity(player) {
  if (!player._bannerPulls) {
    player._bannerPulls = { count: 0, history: [], lastPityGrade: 0 };
  }
  return player._bannerPulls;
}

// ── 단일 뽑기 로직 ──
function doSingleBannerPull(player) {
  if (!bannerState || !bannerState.currentBanner) initBannerState();

  const pity = getPlayerPity(player);
  pity.count++;

  const featured = bannerState.currentBanner;
  let isPity = false;
  let isPickup = false;
  let selectedMerc = null;

  // === 천장 체크 ===
  // 90회 천장: 전설(grade 4)+ 확정, 픽업 확정
  if (pity.count >= BANNER_CONFIG.pityLegendary) {
    isPity = true;
    if (BANNER_CONFIG.guaranteedPickup) {
      selectedMerc = featured;
      isPickup = true;
    } else {
      const legendPool = BANNER_POOL.filter(m => m.grade >= 4);
      selectedMerc = legendPool[Math.floor(Math.random() * legendPool.length)];
      isPickup = (selectedMerc.id === featured.id);
    }
    pity.count = 0;
    pity.lastPityGrade = selectedMerc.grade;
    return { merc: selectedMerc, isPickup, isPity, grade: selectedMerc.grade };
  }

  // 50회 천장: 영웅(grade 3)+ 확정, 픽업 확정
  if (pity.count >= BANNER_CONFIG.pityThreshold && pity.count < BANNER_CONFIG.pityLegendary) {
    // 50회 도달 시점에만 영웅+ 확정
    if (pity.count === BANNER_CONFIG.pityThreshold) {
      isPity = true;
      if (BANNER_CONFIG.guaranteedPickup && featured.grade <= 3) {
        selectedMerc = featured;
        isPickup = true;
      } else {
        const heroPool = BANNER_POOL.filter(m => m.grade >= 3);
        selectedMerc = heroPool[Math.floor(Math.random() * heroPool.length)];
        isPickup = (selectedMerc.id === featured.id);
      }
      pity.count = 0;
      pity.lastPityGrade = selectedMerc.grade;
      return { merc: selectedMerc, isPickup, isPity, grade: selectedMerc.grade };
    }
  }

  // === 일반 확률 뽑기 ===
  // 기본 등급 확률: 일반 50 / 고급 25 / 희귀 15 / 영웅 7 / 전설 2.5 / 신화 0.5
  let weights = { 0: 50, 1: 25, 2: 15, 3: 7, 4: 2.5, 5: 0.5 };

  // 소프트 천장: 40회 이후 영웅+ 확률 점진 증가
  if (pity.count >= 40) {
    const bonus = (pity.count - 39) * 2;
    weights[3] += bonus;
    weights[4] += bonus * 0.3;
    weights[0] = Math.max(5, weights[0] - bonus);
  }

  // 가중치 롤
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  let targetGrade = 0;
  for (const [grade, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) { targetGrade = parseInt(grade); break; }
  }

  // 해당 등급 풀에서 선택 (픽업 용병 확률 부스트)
  const gradePool = BANNER_POOL.filter(m => m.grade === targetGrade);
  if (gradePool.length > 0) {
    // 픽업 용병이 같은 등급이면 확률 부스트 적용
    if (featured.grade === targetGrade) {
      const boostWeight = BANNER_CONFIG.pickupRateBoost;
      const totalW = gradePool.length - 1 + boostWeight;  // 다른 용병 각 1, 픽업은 boostWeight
      const r = Math.random() * totalW;
      if (r < boostWeight) {
        selectedMerc = featured;
        isPickup = true;
      } else {
        const others = gradePool.filter(m => m.id !== featured.id);
        selectedMerc = others.length > 0
          ? others[Math.floor(Math.random() * others.length)]
          : featured;
        isPickup = (selectedMerc.id === featured.id);
      }
    } else {
      selectedMerc = gradePool[Math.floor(Math.random() * gradePool.length)];
    }
  } else {
    // 배너 풀에 해당 등급이 없으면 가장 가까운 낮은 등급
    for (let g = targetGrade; g >= 0; g--) {
      const fallback = BANNER_POOL.filter(m => m.grade === g);
      if (fallback.length > 0) {
        selectedMerc = fallback[Math.floor(Math.random() * fallback.length)];
        targetGrade = g;
        break;
      }
    }
    if (!selectedMerc) selectedMerc = BANNER_POOL[0];
  }

  // 영웅 이상 획득 시 천장 리셋
  if (targetGrade >= 3) pity.count = 0;

  return { merc: selectedMerc, isPickup, isPity, grade: targetGrade };
}

// ── 배너 뽑기 (1회 or 10연차) ──
function pullBanner(player, count) {
  if (!bannerState) initBannerState();
  // 만료 체크
  if (Date.now() >= bannerState.endTime) rotateBanner();

  const isTen = (count === 10);
  const cost = isTen ? BANNER_CONFIG.tenPullCost : BANNER_CONFIG.singleCost * count;

  if ((player.diamonds || 0) < cost) {
    return { success: false, msg: `다이아 부족 (${cost}💎 필요, 보유: ${player.diamonds || 0}💎)` };
  }
  player.diamonds -= cost;

  const results = [];
  let hasHeroPlus = false;

  for (let i = 0; i < count; i++) {
    const pull = doSingleBannerPull(player);
    if (pull.grade >= 3) hasHeroPlus = true;
    results.push({
      merc: pull.merc,
      isPickup: pull.isPickup,
      isPity: pull.isPity,
      grade: pull.grade,
      gradeName: GRADE_NAMES[pull.grade] || '???',
      rarity: pull.merc.rarity,
    });
  }

  // 10연차 보장: 영웅(grade 3)+ 없으면 마지막을 영웅급 픽업으로 교체
  if (isTen && !hasHeroPlus) {
    const heroPool = BANNER_POOL.filter(m => m.grade >= 3);
    const bonus = heroPool[Math.floor(Math.random() * heroPool.length)];
    if (bonus) {
      const featured = bannerState.currentBanner;
      const isPickup = (bonus.id === featured.id);
      results[results.length - 1] = {
        merc: bonus,
        isPickup,
        isPity: false,
        grade: bonus.grade,
        gradeName: GRADE_NAMES[bonus.grade],
        rarity: bonus.rarity,
        guaranteed: true,
      };
    }
  }

  // 이력 저장
  const pity = getPlayerPity(player);
  const now = Date.now();
  for (const r of results) {
    pity.history.push({
      mercId: r.merc.id,
      name: r.merc.name,
      icon: r.merc.icon,
      grade: r.grade,
      isPickup: r.isPickup,
      isPity: r.isPity,
      time: now,
    });
  }
  // 이력 최대 100건 유지
  if (pity.history.length > 100) pity.history = pity.history.slice(-100);

  return {
    success: true,
    results,
    pullCount: pity.count,
    pityToHero: Math.max(0, BANNER_CONFIG.pityThreshold - pity.count),
    pityToLegend: Math.max(0, BANNER_CONFIG.pityLegendary - pity.count),
    diamondsLeft: player.diamonds,
    banner: getBannerInfo(),
  };
}

// ── 뽑기 이력 ──
function getBannerHistory(player) {
  const pity = getPlayerPity(player);
  return {
    history: pity.history.slice(-20).reverse(),
    totalPulls: pity.history.length,
    currentPity: pity.count,
    pityToHero: Math.max(0, BANNER_CONFIG.pityThreshold - pity.count),
    pityToLegend: Math.max(0, BANNER_CONFIG.pityLegendary - pity.count),
  };
}

// ═══ 소켓 핸들러 등록 ═══
function registerBannerHandlers(io, socket, player, players) {
  const playerId = socket.playerId || socket.id;

  // 배너 정보 조회
  socket.on('banner_info', () => {
    const p = players[playerId];
    if (!p) return;
    const info = getCurrentBanner();
    const pity = getPlayerPity(p);
    socket.emit('banner_info', {
      ...info,
      playerPity: pity.count,
      pityToHero: Math.max(0, BANNER_CONFIG.pityThreshold - pity.count),
      pityToLegend: Math.max(0, BANNER_CONFIG.pityLegendary - pity.count),
      diamonds: p.diamonds || 0,
    });
  });

  // 단일 뽑기 (30💎)
  socket.on('banner_pull', () => {
    const p = players[playerId];
    if (!p) return;
    const result = pullBanner(p, 1);
    socket.emit('banner_pull_result', result);

    if (result.success && result.results) {
      for (const r of result.results) {
        if (r.grade >= 4) {
          io.emit('server_msg', {
            msg: `🌟 ${p.displayName || p.className || '???'}님이 배너에서 ${GRADE_NAMES[r.grade]} ${r.merc.icon} ${r.merc.name} 획득!${r.isPickup ? ' (픽업!)' : ''}`,
            type: 'boss',
          });
        }
        if (r.isPity) {
          io.emit('server_msg', {
            msg: `🎯 ${p.displayName || p.className || '???'}님 천장 발동! ${r.merc.icon} ${r.merc.name} 확정 획득!`,
            type: 'rare',
          });
        }
      }
    }
  });

  // 10연차 (270💎)
  socket.on('banner_pull_10', () => {
    const p = players[playerId];
    if (!p) return;
    const result = pullBanner(p, 10);
    socket.emit('banner_pull_result', result);

    if (result.success && result.results) {
      const legends = result.results.filter(r => r.grade >= 4);
      const pickups = result.results.filter(r => r.isPickup);
      if (legends.length > 0) {
        const names = legends.map(r => `${r.merc.icon}${r.merc.name}`).join(', ');
        io.emit('server_msg', {
          msg: `🌟 ${p.displayName || p.className || '???'}님 10연차에서 ${names} 획득!${pickups.length > 0 ? ' (픽업 포함!)' : ''}`,
          type: 'boss',
        });
      }
      const pities = result.results.filter(r => r.isPity);
      if (pities.length > 0) {
        io.emit('server_msg', {
          msg: `🎯 ${p.displayName || p.className || '???'}님 천장 발동! 확정 획득!`,
          type: 'rare',
        });
      }
    }
  });

  // 뽑기 이력
  socket.on('banner_history', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('banner_history', getBannerHistory(p));
  });
}

// ═══ 모듈 내보내기 ═══
module.exports = {
  BANNER_POOL,
  BANNER_CONFIG,
  initBannerState,
  rotateBanner,
  getCurrentBanner,
  pullBanner,
  getBannerHistory,
  getBannerCountdown,
  registerBannerHandlers,
};
