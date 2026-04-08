// 이모트 시스템 — v2.06
// 캐릭터 감정 표현 — 주변/전체 브로드캐스트, 잠금해제 시스템

const EMOTES = {
  // 기본 (모두 해금)
  wave:    { name:'손 흔들기',  icon:'👋', text:'손을 흔든다',          unlock:'default' },
  bow:     { name:'인사',       icon:'🙇', text:'정중히 인사한다',      unlock:'default' },
  laugh:   { name:'웃음',       icon:'😂', text:'크게 웃는다',          unlock:'default' },
  cry:     { name:'울음',       icon:'😢', text:'눈물을 흘린다',        unlock:'default' },
  // 골드 구매
  dance:   { name:'춤',         icon:'💃', text:'신나게 춤춘다',        unlock:'gold', cost: 500  },
  flex:    { name:'근육 자랑',  icon:'💪', text:'근육을 자랑한다',      unlock:'gold', cost: 800  },
  sleep:   { name:'잠',         icon:'😴', text:'잠시 잠든다',          unlock:'gold', cost: 300  },
  point:   { name:'가리키기',    icon:'👉', text:'무언가를 가리킨다',    unlock:'gold', cost: 400  },
  // 레벨 제한
  rage:    { name:'분노',       icon:'😡', text:'분노에 찬 표정을 짓는다', unlock:'level', req: 10 },
  pray:    { name:'기도',       icon:'🙏', text:'경건히 기도한다',      unlock:'level', req: 15 },
  cheer:   { name:'환호',       icon:'🎉', text:'환호한다',             unlock:'level', req: 20 },
  // 업적
  crown:   { name:'왕관 쓰기',  icon:'👑', text:'왕관을 쓴다',          unlock:'achieve', req:'pvp_winner' },
  thunder: { name:'벼락 부르기',icon:'⚡', text:'하늘에서 벼락이 친다', unlock:'achieve', req:'boss_slayer' },
  flower:  { name:'꽃 흩뿌리기',icon:'🌸', text:'꽃잎을 흩뿌린다',      unlock:'achieve', req:'social_butterfly' },
};

const COOLDOWN_SECONDS = 3;

function _ensure(player) {
  if (!player.emote) {
    player.emote = {
      unlocked: ['wave','bow','laugh','cry'],
      lastUseAt: 0,
      useCount: 0,
      favorites: [],
    };
  }
  return player.emote;
}

function getStatus(player) {
  const e = _ensure(player);
  const list = {};
  for (const [id, def] of Object.entries(EMOTES)) {
    list[id] = {
      ...def,
      unlocked: e.unlocked.includes(id),
      canUnlockNow: false,
    };
    if (!e.unlocked.includes(id)) {
      if (def.unlock === 'level' && (player.level || 1) >= def.req) list[id].canUnlockNow = true;
      if (def.unlock === 'gold' && (player.gold || 0) >= def.cost) list[id].canUnlockNow = true;
    }
  }
  return {
    emotes: list,
    unlockedCount: e.unlocked.length,
    totalCount: Object.keys(EMOTES).length,
    favorites: e.favorites,
    useCount: e.useCount,
    cooldownSecondsLeft: Math.max(0, Math.ceil((e.lastUseAt + COOLDOWN_SECONDS*1000 - Date.now()) / 1000)),
  };
}

function unlock(player, emoteId) {
  const e = _ensure(player);
  const def = EMOTES[emoteId];
  if (!def) return { success:false, msg:'존재하지 않는 이모트' };
  if (e.unlocked.includes(emoteId)) return { success:false, msg:'이미 해금됨' };
  if (def.unlock === 'gold') {
    if ((player.gold || 0) < def.cost) return { success:false, msg:`골드 ${def.cost} 부족` };
    player.gold -= def.cost;
  } else if (def.unlock === 'level') {
    if ((player.level || 1) < def.req) return { success:false, msg:`레벨 ${def.req} 필요` };
  } else if (def.unlock === 'achieve') {
    return { success:false, msg:'업적 보상으로만 획득' };
  }
  e.unlocked.push(emoteId);
  return { success:true, msg:`${def.icon} ${def.name} 해금!` };
}

function awardEmote(player, emoteId) {
  const e = _ensure(player);
  if (!EMOTES[emoteId]) return null;
  if (e.unlocked.includes(emoteId)) return null;
  e.unlocked.push(emoteId);
  return EMOTES[emoteId];
}

function perform(player, emoteId) {
  const e = _ensure(player);
  const def = EMOTES[emoteId];
  if (!def) return { success:false, msg:'존재하지 않는 이모트' };
  if (!e.unlocked.includes(emoteId)) return { success:false, msg:'미해금 이모트' };
  const now = Date.now();
  if (now < e.lastUseAt + COOLDOWN_SECONDS * 1000) {
    return { success:false, msg:`쿨다운 ${Math.ceil((e.lastUseAt + COOLDOWN_SECONDS*1000 - now)/1000)}초` };
  }
  e.lastUseAt = now;
  e.useCount += 1;
  return {
    success:true,
    msg:`${def.icon} ${player.displayName || '플레이어'}: ${def.text}`,
    broadcast:{
      playerId: player.id,
      displayName: player.displayName,
      emoteId,
      icon: def.icon,
      text: def.text,
      x: player.x || 0,
      y: player.y || 0,
    },
  };
}

function toggleFavorite(player, emoteId) {
  const e = _ensure(player);
  if (!EMOTES[emoteId]) return { success:false, msg:'존재하지 않는 이모트' };
  const idx = e.favorites.indexOf(emoteId);
  if (idx >= 0) {
    e.favorites.splice(idx, 1);
    return { success:true, msg:'즐겨찾기 해제' };
  }
  if (e.favorites.length >= 8) return { success:false, msg:'즐겨찾기 가득 (최대 8)' };
  e.favorites.push(emoteId);
  return { success:true, msg:'즐겨찾기 추가' };
}

module.exports = {
  EMOTES,
  COOLDOWN_SECONDS,
  getStatus,
  unlock,
  awardEmote,
  perform,
  toggleFavorite,
};
