// v7.0 — 아바타 시스템
// 플레이어 자신이 용병처럼 전장에 참전, 아바타 커스터마이징+성장

const AVATAR_CLASSES = [
  { id: 'swordmaster', name: '검의 달인', icon: '⚔️🧑', baseStats: { atk: 100, def: 60, spd: 7, hp: 1000 }, skills: ['검기 방출', '일섬', '검무'], desc: '근접 공격 특화' },
  { id: 'archmage_avatar', name: '대마도사', icon: '🔮🧑', baseStats: { matk: 120, def: 40, spd: 5, hp: 800 }, skills: ['메테오', '차원 절단', '마력 폭발'], desc: '마법 특화' },
  { id: 'shadow_lord', name: '그림자 군주', icon: '🌑🧑', baseStats: { atk: 90, def: 50, spd: 10, hp: 700 }, skills: ['암살', '그림자 분신', '독침'], desc: '속도+암살' },
  { id: 'guardian_king', name: '수호왕', icon: '🛡️🧑', baseStats: { atk: 50, def: 120, spd: 4, hp: 2000 }, skills: ['불멸 방패', '도발', '성벽'], desc: '방어+탱킹' },
  { id: 'sage_healer', name: '현자 치유사', icon: '💚🧑', baseStats: { matk: 80, def: 70, spd: 6, hp: 900, healPow: 150 }, skills: ['대치유', '부활', '성역'], desc: '힐+서포트' },
  { id: 'gunslinger', name: '건슬링거', icon: '🔫🧑', baseStats: { atk: 110, def: 30, spd: 8, hp: 600 }, skills: ['연사', '관통탄', '폭발탄'], desc: '원거리+고DPS' },
];

// 아바타 외형 커스텀
const AVATAR_CUSTOMIZE = {
  hair: ['short', 'long', 'mohawk', 'ponytail', 'bald', 'afro', 'twin_tail'],
  face: ['scar', 'eyepatch', 'tattoo', 'freckles', 'mask', 'glasses', 'beard'],
  outfit: ['armor', 'robe', 'cloak', 'casual', 'royal', 'ninja', 'pirate'],
  aura: ['flame', 'ice', 'lightning', 'shadow', 'holy', 'void', 'rainbow'],
  emote: ['wave', 'dance', 'laugh', 'cry', 'rage', 'flex', 'sleep', 'salute'],
};

// 아바타 레벨 시스템 (용병과 별개)
const AVATAR_LEVELS = {
  maxLevel: 100,
  expPerLevel: (lv) => lv * 500,
  statGrowth: { atk: 2, def: 1.5, spd: 0.1, hp: 20, matk: 2 },
};

// 아바타+용병 합체 (소울 링크 5티어)
const AVATAR_MERC_FUSION = {
  req: 'soulLink tier 5',
  duration: 30,
  bonus: { allStat: 2.5 },
  desc: '아바타와 용병이 합체! 30초간 전 스탯 2.5배!',
  cooldown: 600,
};

// 아바타 칭호
const AVATAR_TITLES = [
  { level: 10, title: '신참 모험가' },
  { level: 25, title: '숙련 전사' },
  { level: 50, title: '영웅' },
  { level: 75, title: '전설' },
  { level: 100, title: '신의 대리인', frame: 'avatar_god', desc: '최고 레벨!' },
];

function createAvatar(player, classId) {
  const cls = AVATAR_CLASSES.find(c => c.id === classId);
  if (!cls) return { ok: false, reason: '알 수 없는 클래스' };
  player.avatar = { class: classId, level: 1, exp: 0, stats: { ...cls.baseStats }, customize: {}, created: Date.now() };
  return { ok: true, avatar: player.avatar, class: cls };
}

function register(io, socket, player) {
  socket.on('avatar_info', () => {
    socket.emit('avatar_info', { classes: AVATAR_CLASSES, customize: AVATAR_CUSTOMIZE, levels: AVATAR_LEVELS, fusion: AVATAR_MERC_FUSION, titles: AVATAR_TITLES, myAvatar: player.avatar });
  });
  socket.on('avatar_create', (data) => {
    const result = createAvatar(player, data.classId);
    socket.emit('avatar_create_result', result);
    if (result.ok) io.emit('server_msg', `🧑⚔️ [아바타] ${player.name}이(가) "${result.class.name}" 아바타 생성!`);
  });
}

module.exports = { AVATAR_CLASSES, AVATAR_CUSTOMIZE, AVATAR_LEVELS, AVATAR_MERC_FUSION, AVATAR_TITLES, createAvatar, register };
