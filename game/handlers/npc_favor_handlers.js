// NPC 호감도 & 로맨스 심화 — v4.1
function registerNpcFavorHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const NPCS = {
    lina:      { name: '리나',       job: '치유사',     likes: ['herb_bouquet','tea_set','poetry'], dislikes: ['violence'], maxReward: 'skill_lina_blessing' },
    kyle:      { name: '카일',       job: '대장장이',   likes: ['rare_ore','ancient_blueprint','hot_soup'], dislikes: ['cheap_material'], maxReward: 'unlock_legend_craft' },
    yuki:      { name: '유키',       job: '떠돌이 상인', likes: ['lucky_coin','gem','funny_story'], dislikes: ['boring_talk'], maxReward: 'unlock_black_market' },
    serena:    { name: '세레나',     job: '정령사',     likes: ['spirit_stone','mana_flower','moonlight_dew'], dislikes: ['machine','noise'], maxReward: 'spirit_summon_skill' },
    crow:      { name: '크로우',     job: '현상금 사냥꾼', likes: ['whiskey','unique_weapon','bounty_info'], dislikes: ['weakness'], maxReward: 'special_bounty_route' },
    mira:      { name: '미라',       job: '고대 학자',  likes: ['ancient_book','relic_fragment','riddle'], dislikes: ['ignorance'], maxReward: 'hidden_dungeon_unlock' },
    artemis:   { name: '아르테미스', job: '기사단장',   likes: ['fine_sword','knight_oath','noble_wine'], dislikes: ['injustice'], maxReward: 'knight_order_join' },
  };

  const FAVOR_STAGES = [
    { name: '낯선 이',     min: 0,   bonus: null },
    { name: '아는 사이',   min: 50,  bonus: 'daily_quest' },
    { name: '친구',        min: 150, bonus: 'quest_tier1' },
    { name: '절친',        min: 300, bonus: 'companion' },
    { name: '특별한 존재', min: 500, bonus: 'special_equip' },
    { name: '영혼의 반려', min: 700, bonus: 'max_reward' },
  ];

  function getStage(favor) {
    for (let i = FAVOR_STAGES.length - 1; i >= 0; i--) {
      if (favor >= FAVOR_STAGES[i].min) return { ...FAVOR_STAGES[i], index: i };
    }
    return { ...FAVOR_STAGES[0], index: 0 };
  }

  // NPC 목록 조회
  socket.on('npc_favor_list', () => {
    const p = players[playerId];
    if (!p) return;
    if (!p.npcFavor) p.npcFavor = {};
    const list = Object.entries(NPCS).map(([id, npc]) => {
      const favor = p.npcFavor[id] || 0;
      return { id, ...npc, favor, stage: getStage(favor) };
    });
    socket.emit('npc_favor_list', list);
  });

  // 대화하기
  socket.on('npc_talk', (data) => {
    const p = players[playerId];
    if (!p || !data?.npcId) return;
    if (!NPCS[data.npcId]) return;
    if (!p.npcFavor) p.npcFavor = {};
    if (!p._npcTalkCd) p._npcTalkCd = {};
    const now = Date.now();
    if (p._npcTalkCd[data.npcId] && now - p._npcTalkCd[data.npcId] < 14400e3) {
      socket.emit('npc_talk_result', { success: false, reason: 'cooldown' });
      return;
    }
    const gain = 3 + Math.floor(Math.random() * 5);
    p.npcFavor[data.npcId] = (p.npcFavor[data.npcId] || 0) + gain;
    p._npcTalkCd[data.npcId] = now;
    savePlayer(p);
    const stage = getStage(p.npcFavor[data.npcId]);
    socket.emit('npc_talk_result', { success: true, npcId: data.npcId, gain, favor: p.npcFavor[data.npcId], stage: stage.name });
  });

  // 선물 주기
  socket.on('npc_gift', (data) => {
    const p = players[playerId];
    if (!p || !data?.npcId || !data?.itemType) return;
    const npc = NPCS[data.npcId];
    if (!npc) return;
    if (!p.npcFavor) p.npcFavor = {};
    const isLiked = npc.likes.includes(data.itemType);
    const isDisliked = npc.dislikes.includes(data.itemType);
    const gain = isLiked ? 25 + Math.floor(Math.random() * 15) : (isDisliked ? -10 : 5);
    p.npcFavor[data.npcId] = Math.max(0, (p.npcFavor[data.npcId] || 0) + gain);
    savePlayer(p);
    socket.emit('npc_gift_result', { npcId: data.npcId, liked: isLiked, disliked: isDisliked, gain, favor: p.npcFavor[data.npcId] });
  });

  // 동행 요청
  socket.on('npc_companion', (data) => {
    const p = players[playerId];
    if (!p || !data?.npcId) return;
    if (!p.npcFavor) p.npcFavor = {};
    const favor = p.npcFavor[data.npcId] || 0;
    if (favor < 300) { socket.emit('npc_companion_result', { success: false, reason: 'favor_300_needed' }); return; }
    p.activeCompanion = data.npcId;
    savePlayer(p);
    socket.emit('npc_companion_result', { success: true, npcId: data.npcId, name: NPCS[data.npcId].name });
  });
}

module.exports = { registerNpcFavorHandlers };
