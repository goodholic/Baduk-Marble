// 용병 스토리 모드 & 인연 퀘스트 — v3.9
function registerMercStoryHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  // 용병 인연 정의
  const BONDS = {
    light_dark:    { a: 'merc_dragon_knight', b: 'merc_seraph',       name: '빛과 어둠',    bonus: { allStat: 0.15 }, ultimateName: '성룡의 심판', ultimateDmg: 8.0 },
    fire_ice:      { a: 'merc_phoenix',       b: 'merc_frost_queen',  name: '불과 얼음',    bonus: { atk: 0.20, def: 0.20 }, ultimateName: '빙염 폭풍', ultimateDmg: 10.0 },
    master_student:{ a: 'merc_shadow_lord',   b: 'merc_assassin',     name: '스승과 제자',  bonus: { crit: 0.25 }, ultimateName: '연속 암살', ultimateDmg: 0, critHits: 5 },
    origin:        { a: 'merc_bahamut',       b: 'merc_world_ender',  name: '태초의 인연',  bonus: { allStat: 0.25 }, ultimateName: '창세와 종말', ultimateDmg: 20.0 },
    spacetime:     { a: 'merc_chaos_lord',    b: 'merc_time_mage',    name: '차원과 시간',  bonus: { cdReduction: 0.4 }, ultimateName: '시공 붕괴', ultimateDmg: 0, rewind: true },
    holy_warrior:  { a: 'merc_paladin',       b: 'merc_angel',        name: '성스러운 무사',bonus: { teamDef: 0.15 }, ultimateName: '천상의 방패', ultimateDmg: 0, invincible: 10 },
    beast_king:    { a: 'merc_beast_tamer',   b: null,                name: '야수의 왕',    bonus: { summon: 0.5 }, ultimateName: '만수의 왕', ultimateDmg: 0, summonCount: 20 },
    forbidden:     { a: 'merc_warlock',       b: 'merc_necro',        name: '금단의 지식',  bonus: { magicDmg: 0.3 }, ultimateName: '불사의 군단', ultimateDmg: 0, summonCount: 30 },
  };

  // 스토리 에피소드 데이터 (간략 — 실제는 DB에서 로드)
  const STORY_EPISODES = {
    merc_dragon_knight: [
      { ep: 1, title: '잿더미 위의 소년', type: 'dialog', choices: ['복수를 맹세한다', '슬픔에 잠긴다'], bondGain: 20 },
      { ep: 2, title: '드래곤 사냥꾼의 길', type: 'combat', enemyLevel: 20, bondGain: 30 },
      { ep: 3, title: '수호룡의 진실', type: 'choice', choices: ['수호룡을 공격', '진실을 받아들임'], critical: true, bondGain: 50 },
      { ep: 4, title: '후계자의 서약', type: 'reward', reward: 'dragon_merge_ultimate', bondGain: 100 },
    ],
    merc_seraph: [
      { ep: 1, title: '추방된 천사', type: 'dialog', choices: ['과거를 후회한다', '새 시작을 다짐한다'], bondGain: 20 },
      { ep: 2, title: '인간의 온기', type: 'dialog', choices: ['인간을 도운다', '관망한다'], bondGain: 30 },
      { ep: 3, title: '속죄의 시련', type: 'combat', enemyLevel: 30, bondGain: 50 },
      { ep: 4, title: '세라핌의 재탄생', type: 'reward', reward: 'revive_ultimate_enhance', bondGain: 100 },
    ],
    merc_shadow_lord: [
      { ep: 1, title: '어둠 속의 아이', type: 'dialog', bondGain: 20 },
      { ep: 2, title: '최고의 암살자', type: 'combat', enemyLevel: 25, bondGain: 30 },
      { ep: 3, title: '은인의 얼굴', type: 'choice', choices: ['임무를 수행한다', '은인을 살린다'], critical: true, bondGain: 50 },
      { ep: 4, title: '자유의 대가', type: 'reward', reward: 'shadow_clone_enhance', bondGain: 100 },
    ],
  };

  // 스토리 목록 조회
  socket.on('merc_story_list', () => {
    const p = players[playerId];
    if (!p) return;
    const mercs = p.mercenaries || [];
    const stories = [];
    for (const m of mercs) {
      const eps = STORY_EPISODES[m.id];
      if (!eps) continue;
      const progress = p.storyProgress?.[m.id] || 0;
      stories.push({
        mercId: m.id,
        mercName: m.name || m.id,
        totalEpisodes: eps.length,
        currentEpisode: progress,
        completed: progress >= eps.length,
        canStart: (m.bond || 0) >= (progress * 150), // 에피소드별 친밀도 요구
      });
    }
    socket.emit('merc_story_list', stories);
  });

  // 스토리 에피소드 시작
  socket.on('merc_story_play', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId) return;
    const eps = STORY_EPISODES[data.mercId];
    if (!eps) return;
    if (!p.storyProgress) p.storyProgress = {};
    const progress = p.storyProgress[data.mercId] || 0;
    if (progress >= eps.length) { socket.emit('story_error', { reason: 'completed' }); return; }

    const ep = eps[progress];
    const merc = (p.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return;

    // 친밀도 요구 체크
    if ((merc.bond || 0) < progress * 150) {
      socket.emit('story_error', { reason: 'bond_required', needed: progress * 150 });
      return;
    }

    socket.emit('merc_story_episode', {
      mercId: data.mercId,
      episode: ep,
      episodeNum: progress + 1,
    });
  });

  // 스토리 선택지 응답
  socket.on('merc_story_choice', (data) => {
    const p = players[playerId];
    if (!p || !data?.mercId || data?.choiceIndex === undefined) return;
    const eps = STORY_EPISODES[data.mercId];
    if (!eps) return;
    if (!p.storyProgress) p.storyProgress = {};
    const progress = p.storyProgress[data.mercId] || 0;
    const ep = eps[progress];
    if (!ep) return;

    const merc = (p.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return;

    // 친밀도 보상
    merc.bond = Math.min(1000, (merc.bond || 0) + (ep.bondGain || 10));

    // 스토리 선택 기록
    if (!p.storyChoices) p.storyChoices = {};
    if (!p.storyChoices[data.mercId]) p.storyChoices[data.mercId] = [];
    p.storyChoices[data.mercId].push(data.choiceIndex);

    // 진행
    p.storyProgress[data.mercId] = progress + 1;

    // 최종 에피소드 보상
    if (progress + 1 >= eps.length && ep.reward) {
      if (!merc.rewards) merc.rewards = [];
      merc.rewards.push(ep.reward);
      socket.emit('merc_story_reward', { mercId: data.mercId, reward: ep.reward, mercName: merc.name || merc.id });
      io.emit('server_toast', { msg: `📖 ${p.name}이(가) ${merc.name || merc.id}의 스토리를 완결했습니다!` });
    }

    savePlayer(p);
    socket.emit('merc_story_progress', {
      mercId: data.mercId,
      newProgress: p.storyProgress[data.mercId],
      bondGain: ep.bondGain,
      newBond: merc.bond,
    });
  });

  // 인연 보너스 체크
  socket.on('merc_bond_check', () => {
    const p = players[playerId];
    if (!p) return;
    const mercIds = (p.mercenaries || []).map(m => m.id);
    const activeBonds = [];

    for (const [key, bond] of Object.entries(BONDS)) {
      const hasA = mercIds.includes(bond.a);
      const hasB = bond.b === null || mercIds.includes(bond.b);
      if (hasA && hasB) {
        // 스토리 완료 체크
        const storyA = (p.storyProgress?.[bond.a] || 0) >= (STORY_EPISODES[bond.a]?.length || 99);
        const storyB = bond.b === null || (p.storyProgress?.[bond.b] || 0) >= (STORY_EPISODES[bond.b]?.length || 99);
        activeBonds.push({
          key,
          name: bond.name,
          bonus: bond.bonus,
          ultimateName: bond.ultimateName,
          active: storyA && storyB,
          requirement: !storyA || !storyB ? '스토리 완료 필요' : null,
        });
      }
    }

    socket.emit('merc_active_bonds', activeBonds);
  });

  // 도감 수집 보상 체크
  socket.on('merc_codex_check', () => {
    const p = players[playerId];
    if (!p) return;
    const count = (p.mercenaries || []).length;
    const milestones = [
      { count: 5,  reward: 'gold_5000',      title: '신참 지휘관' },
      { count: 10, reward: 'gold_20000_rune', title: '용병 수집가' },
      { count: 20, reward: 'gold_100000',     title: '정예 지휘관' },
      { count: 30, reward: 'gold_300000',     title: '대사령관' },
      { count: 40, reward: 'gold_500000',     title: '전설의 지휘관' },
      { count: 50, reward: 'gold_1000000',    title: '신화의 지휘관' },
      { count: 60, reward: 'king_crown',      title: '만군의 왕' },
    ];

    if (!p.codexRewards) p.codexRewards = {};
    const claimable = [];
    for (const m of milestones) {
      if (count >= m.count && !p.codexRewards[m.count]) {
        claimable.push(m);
      }
    }

    socket.emit('merc_codex_status', { totalMercs: count, milestones, claimable, claimed: p.codexRewards });
  });

  // 도감 보상 수령
  socket.on('merc_codex_claim', (data) => {
    const p = players[playerId];
    if (!p || !data?.milestone) return;
    if (!p.codexRewards) p.codexRewards = {};
    if (p.codexRewards[data.milestone]) return;

    const count = (p.mercenaries || []).length;
    if (count < data.milestone) return;

    p.codexRewards[data.milestone] = true;

    // 보상 지급 (간략화)
    const goldRewards = { 5: 5000, 10: 20000, 20: 100000, 30: 300000, 40: 500000, 50: 1000000, 60: 2000000 };
    p.gold = Math.min(999999999, (p.gold || 0) + (goldRewards[data.milestone] || 0));

    if (data.milestone === 60) {
      if (!p.titles) p.titles = [];
      p.titles.push('king_of_armies');
      io.emit('server_toast', { msg: `👑 ${p.name}이(가) "만군의 왕" 칭호를 획득했습니다! 용병 60종 완전 수집!` });
    }

    savePlayer(p);
    socket.emit('merc_codex_claimed', { milestone: data.milestone, gold: goldRewards[data.milestone] });
  });
}

module.exports = { registerMercStoryHandlers };
