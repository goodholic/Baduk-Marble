// v5.0 — 공성전 성주 실시간 함정 조작 시스템
// 도전자가 IO로 진행하는 동안, 성주가 함정/스킬을 실시간으로 조작

const CASTLE_ACTIONS_PER_TURN = 3;  // 성주가 1턴(10초)에 실행 가능한 액션 수
const ACTION_COOLDOWNS = {};

// 성주 실시간 함정 카탈로그
const TRAPS = {
  spike_floor:    { id: 'spike_floor', name: '가시 바닥', icon: '📌', dmg: 80, area: 3, cooldown: 15, cost: 100, desc: '지정 타일에 가시 함정 활성화' },
  fire_wall:      { id: 'fire_wall', name: '화염 벽', icon: '🔥', dmg: 120, area: 5, cooldown: 25, cost: 200, desc: '가로/세로 화염 장벽 생성 (5초 지속)' },
  ice_floor:      { id: 'ice_floor', name: '빙결 바닥', icon: '❄️', dmg: 40, area: 4, cooldown: 20, cost: 150, slow: 0.5, desc: '이동속도 50% 감소 + 데미지' },
  poison_gas:     { id: 'poison_gas', name: '독가스', icon: '☠️', dmg: 30, area: 6, cooldown: 30, cost: 250, dot: 15, dotDur: 5, desc: '넓은 범위 지속 독 데미지' },
  lightning_rod:  { id: 'lightning_rod', name: '번개 기둥', icon: '⚡', dmg: 200, area: 2, cooldown: 35, cost: 300, stun: 2, desc: '좁은 범위 고데미지 + 2초 기절' },
  pitfall:        { id: 'pitfall', name: '함정 구덩이', icon: '🕳️', dmg: 60, area: 2, cooldown: 20, cost: 120, trap: true, desc: '숨겨진 함정, 밟으면 발동' },
  arrow_rain:     { id: 'arrow_rain', name: '화살비', icon: '🏹', dmg: 70, area: 8, cooldown: 40, cost: 350, desc: '넓은 범위 화살 세례' },
  catapult:       { id: 'catapult', name: '투석기', icon: '🪨', dmg: 250, area: 3, cooldown: 45, cost: 400, knockback: 3, desc: '고데미지 + 넉백' },
  net_trap:       { id: 'net_trap', name: '그물 함정', icon: '🕸️', dmg: 10, area: 3, cooldown: 18, cost: 80, root: 3, desc: '3초 이동 불가' },
  teleport_trap:  { id: 'teleport_trap', name: '전송 함정', icon: '🌀', dmg: 0, area: 2, cooldown: 50, cost: 500, desc: '도전자를 맵 시작 지점으로 전송' },
  dragon_breath:  { id: 'dragon_breath', name: '용의 숨결', icon: '🐲', dmg: 300, area: 6, cooldown: 60, cost: 600, desc: '궁극 함정: 직선 범위 초고데미지' },
  gravity_well:   { id: 'gravity_well', name: '중력장', icon: '🌑', dmg: 50, area: 5, cooldown: 35, cost: 280, pull: true, desc: '중심으로 끌어당김 + 데미지' },
};

// 성주 액티브 스킬 (함정 외 직접 사용)
const LORD_SKILLS = {
  rally:      { name: '집결', icon: '📯', cooldown: 30, desc: '배치된 용병 전원 ATK+20% (15초)', effect: { teamAtk: 1.2, dur: 15 } },
  fortify:    { name: '요새화', icon: '🏰', cooldown: 45, desc: '성벽 HP 30% 회복', effect: { wallHeal: 0.3 } },
  scout:      { name: '정찰', icon: '👁️', cooldown: 20, desc: '도전자 위치/HP 5초간 표시', effect: { reveal: 5 } },
  sabotage:   { name: '방해공작', icon: '💣', cooldown: 40, desc: '도전자 무기 3초 비활성화', effect: { disarm: 3 } },
  summon_guard: { name: '경비병 소환', icon: '💂', cooldown: 50, desc: '임시 NPC 경비병 3명 소환 (30초)', effect: { guards: 3, dur: 30 } },
  blood_oath: { name: '혈맹의 맹세', icon: '🩸', cooldown: 90, desc: '모든 수비 용병 불사 5초', effect: { immortal: 5 } },
};

// 날씨/시간 변수가 공성전에 미치는 영향
const SIEGE_WEATHER = {
  clear:    { trapDmg: 1.0, visibility: 1.0, movSpd: 1.0, desc: '맑음 — 표준 조건' },
  rain:     { trapDmg: 0.8, visibility: 0.7, movSpd: 0.9, desc: '비 — 화염 함정 약화, 시야 감소' },
  storm:    { trapDmg: 1.2, visibility: 0.5, movSpd: 0.8, desc: '폭풍 — 번개 함정 강화, 시야 대폭 감소' },
  fog:      { trapDmg: 1.0, visibility: 0.3, movSpd: 1.0, desc: '안개 — 함정 거의 안 보임' },
  snow:     { trapDmg: 0.9, visibility: 0.8, movSpd: 0.7, desc: '눈 — 이동속도 감소' },
  night:    { trapDmg: 1.1, visibility: 0.4, movSpd: 1.0, desc: '야간 — 은신 함정 효과 증가' },
};

const SIEGE_TIME_OF_DAY = {
  dawn:     { defBonus: 1.0, atkBonus: 1.1, desc: '새벽 — 기습 보너스' },
  day:      { defBonus: 1.0, atkBonus: 1.0, desc: '낮 — 표준' },
  dusk:     { defBonus: 1.1, atkBonus: 1.0, desc: '황혼 — 방어 소폭 증가' },
  night:    { defBonus: 1.2, atkBonus: 0.9, desc: '밤 — 성주 유리' },
};

function activateTrap(player, trapId, targetX, targetY, weather) {
  const trap = TRAPS[trapId];
  if (!trap) return { ok: false, reason: '알 수 없는 함정' };

  const cooldowns = player.siegeCooldowns || {};
  const now = Date.now();
  if (cooldowns[trapId] && now - cooldowns[trapId] < trap.cooldown * 1000) {
    const remain = Math.ceil((trap.cooldown * 1000 - (now - cooldowns[trapId])) / 1000);
    return { ok: false, reason: `쿨다운 ${remain}초` };
  }

  const wMod = SIEGE_WEATHER[weather || 'clear'] || SIEGE_WEATHER.clear;
  const finalDmg = Math.floor(trap.dmg * wMod.trapDmg);

  cooldowns[trapId] = now;
  player.siegeCooldowns = cooldowns;
  player.siegeResources = (player.siegeResources || 1000) - trap.cost;

  return {
    ok: true,
    trap: { ...trap, dmg: finalDmg },
    targetX, targetY,
    weather: wMod.desc,
  };
}

function useLordSkill(player, skillId) {
  const skill = LORD_SKILLS[skillId];
  if (!skill) return { ok: false, reason: '알 수 없는 스킬' };

  const cooldowns = player.siegeSkillCooldowns || {};
  const now = Date.now();
  if (cooldowns[skillId] && now - cooldowns[skillId] < skill.cooldown * 1000) {
    const remain = Math.ceil((skill.cooldown * 1000 - (now - cooldowns[skillId])) / 1000);
    return { ok: false, reason: `쿨다운 ${remain}초` };
  }

  cooldowns[skillId] = now;
  player.siegeSkillCooldowns = cooldowns;

  return { ok: true, skill, effect: skill.effect };
}

function register(io, socket, player) {
  // 성주: 함정 활성화
  socket.on('siege_activate_trap', (data) => {
    const { trapId, x, y, weather } = data;
    const result = activateTrap(player, trapId, x, y, weather);
    socket.emit('siege_trap_result', result);
    if (result.ok) {
      io.to(data.siegeRoom || 'siege').emit('siege_trap_triggered', {
        lordId: player.id,
        trap: result.trap,
        x, y,
      });
    }
  });

  // 성주: 액티브 스킬 사용
  socket.on('siege_lord_skill', (data) => {
    const { skillId } = data;
    const result = useLordSkill(player, skillId);
    socket.emit('siege_lord_skill_result', result);
    if (result.ok) {
      io.to(data.siegeRoom || 'siege').emit('siege_lord_skill_used', {
        lordId: player.id,
        skill: result.skill,
      });
    }
  });

  // 공성전 날씨/시간 조회
  socket.on('siege_conditions', () => {
    socket.emit('siege_conditions', {
      traps: Object.values(TRAPS),
      lordSkills: Object.values(LORD_SKILLS),
      weather: SIEGE_WEATHER,
      timeOfDay: SIEGE_TIME_OF_DAY,
    });
  });
}

module.exports = {
  TRAPS, LORD_SKILLS, SIEGE_WEATHER, SIEGE_TIME_OF_DAY,
  CASTLE_ACTIONS_PER_TURN,
  activateTrap, useLordSkill, register,
};
