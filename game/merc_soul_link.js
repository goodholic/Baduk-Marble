// v5.4 — 용병 소울 링크 시스템
// 플레이어와 용병 간 영혼 연결, 깊은 유대 → 플레이어 능력 강화

const MAX_SOUL_LINKS = 3;

const SOUL_LINK_TIERS = [
  { tier: 1, name: '인연', req: { battles: 50 }, bonus: { playerAtk: 1.03, playerDef: 1.03 }, icon: '🔗', desc: '50전 함께 싸움' },
  { tier: 2, name: '유대', req: { battles: 150, awakened: true }, bonus: { playerAtk: 1.06, playerDef: 1.06, sharedSkill: 1 }, icon: '⛓️', desc: '150전+각성, 스킬 공유 1개' },
  { tier: 3, name: '공명', req: { battles: 300, gen: 3 }, bonus: { playerAtk: 1.10, playerDef: 1.10, sharedSkill: 2, emotionSync: true }, icon: '💫', desc: '300전+3세대, 감정 동기화' },
  { tier: 4, name: '합일', req: { battles: 500, gen: 5, married: true }, bonus: { playerAll: 1.15, sharedSkill: 3, fusionReady: true }, icon: '✨🔗', desc: '500전+5세대+결혼, 합체 준비' },
  { tier: 5, name: '초월 연결', req: { battles: 1000, darkSurvivor: true }, bonus: { playerAll: 1.25, ultimateLink: true }, icon: '🌟🔗', desc: '1000전+어둠의 대륙 생환, 궁극 연결' },
];

// 소울 링크 특수 능력
const LINK_ABILITIES = [
  { id: 'shared_hp', name: 'HP 공유', desc: '플레이어-용병 HP 풀 공유 (총합)', tier: 2 },
  { id: 'emotion_mirror', name: '감정 반영', desc: '용병 감정이 플레이어 IO 전투에 영향', tier: 3 },
  { id: 'auto_summon', name: '자동 소환', desc: '위기 시 소울링크 용병 자동 소환', tier: 3 },
  { id: 'stat_transfer', name: '스탯 전이', desc: '용병 스탯의 10%를 플레이어에게', tier: 4 },
  { id: 'soul_fusion', name: '영혼 합체', desc: '플레이어+용병 합체 (30초, 전 스탯 2배)', tier: 5, cooldown: 600 },
];

// 영혼 대화 (소울링크 용병과의 대화 시스템)
const SOUL_DIALOGUES = {
  tier1: ['주인님, 함께해서 기쁩니다.', '좋은 전투였습니다!', '더 강해지고 싶습니다.'],
  tier2: ['당신과 함께라면 어디든 갈 수 있어요.', '제 힘을 빌려드릴게요.', '우리의 유대는 특별합니다.'],
  tier3: ['당신의 감정이 느껴집니다.', '함께 세계를 바꿀 수 있어요.', '영혼이 공명하고 있습니다.'],
  tier4: ['우리는 하나입니다.', '당신의 뜻이 곧 제 뜻입니다.', '영원히 함께하겠습니다.'],
  tier5: ['초월의 경지... 당신과 저의 경계가 사라집니다.', '이제 우리는 하나의 존재입니다.', '세계의 끝까지, 영원히.'],
};

function getSoulLinkTier(battles, merc) {
  for (let i = SOUL_LINK_TIERS.length - 1; i >= 0; i--) {
    const t = SOUL_LINK_TIERS[i];
    if (battles >= t.req.battles) {
      if (t.req.awakened && !merc.awakened) continue;
      if (t.req.gen && (merc.generation || 1) < t.req.gen) continue;
      if (t.req.married && !merc.married) continue;
      if (t.req.darkSurvivor && !merc.darkSurvivor) continue;
      return t;
    }
  }
  return null;
}

function createSoulLink(player, mercId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const links = player.soulLinks || [];
  if (links.length >= MAX_SOUL_LINKS) return { ok: false, reason: `최대 ${MAX_SOUL_LINKS}개` };
  if (links.find(l => l.mercId === mercId)) return { ok: false, reason: '이미 연결됨' };

  const battles = merc.sharedBattles || 0;
  const tier = getSoulLinkTier(battles, merc);
  if (!tier) return { ok: false, reason: '조건 미충족 (최소 50전 필요)' };

  const link = { mercId, mercName: merc.name, tier: tier.tier, battles, bonus: tier.bonus, icon: tier.icon, created: Date.now() };
  links.push(link);
  player.soulLinks = links;

  return { ok: true, link, dialogue: SOUL_DIALOGUES[`tier${tier.tier}`]?.[0] };
}

function register(io, socket, player) {
  socket.on('soul_link_info', () => {
    socket.emit('soul_link_info', {
      tiers: SOUL_LINK_TIERS, abilities: LINK_ABILITIES,
      current: player.soulLinks || [], max: MAX_SOUL_LINKS,
    });
  });
  socket.on('soul_link_create', (data) => {
    const result = createSoulLink(player, data.mercId);
    socket.emit('soul_link_result', result);
    if (result.ok) {
      io.emit('server_msg', `🔗 [소울 링크] ${player.name}과 ${result.link.mercName}의 영혼이 연결되었습니다!`);
    }
  });
  socket.on('soul_link_dialogue', (data) => {
    const link = (player.soulLinks || []).find(l => l.mercId === data.mercId);
    if (!link) return socket.emit('soul_link_dialogue', { ok: false });
    const dialogues = SOUL_DIALOGUES[`tier${link.tier}`] || SOUL_DIALOGUES.tier1;
    socket.emit('soul_link_dialogue', { ok: true, dialogue: dialogues[Math.floor(Math.random() * dialogues.length)] });
  });
}

module.exports = { SOUL_LINK_TIERS, LINK_ABILITIES, SOUL_DIALOGUES, MAX_SOUL_LINKS, getSoulLinkTier, createSoulLink, register };
