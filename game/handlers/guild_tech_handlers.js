// 혈맹 기술 트리 & 길드 레이드 — v4.1
function registerGuildTechHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer } = ctx;

  const TECH_TREE = {
    swordsmanship:  { field: 'combat',  name: '검술 수련',     maxLv: 5, costPer: 5000,  timePer: 7200e3,  effect: { atkBonus: 0.02 }, prereq: null },
    shield_oath:    { field: 'combat',  name: '방패의 맹세',   maxLv: 5, costPer: 5000,  timePer: 7200e3,  effect: { defBonus: 0.02 }, prereq: { swordsmanship: 2 } },
    formation:      { field: 'combat',  name: '전투 대형',     maxLv: 3, costPer: 20000, timePer: 21600e3, effect: { siegeSynergy: 0.05 }, prereq: { swordsmanship: 3, shield_oath: 3 } },
    legend_weapon:  { field: 'combat',  name: '전설의 무기',   maxLv: 1, costPer: 500000,timePer: 259200e3,effect: { legendWeapon: true }, prereq: { formation: 3 } },
    taxation:       { field: 'economy', name: '효율적 징세',   maxLv: 5, costPer: 8000,  timePer: 10800e3, effect: { taxBonus: 0.05 }, prereq: null },
    trade_network:  { field: 'economy', name: '무역 네트워크', maxLv: 5, costPer: 10000, timePer: 14400e3, effect: { tradeBonus: 0.03 }, prereq: { taxation: 2 } },
    caravan_license:{ field: 'economy', name: '대상단 면허',   maxLv: 1, costPer: 200000,timePer: 172800e3,effect: { caravanUnlock: true }, prereq: { trade_network: 3 } },
    golden_vault:   { field: 'economy', name: '황금 금고',     maxLv: 3, costPer: 50000, timePer: 43200e3, effect: { fundCap: 100000 }, prereq: { taxation: 3 } },
    mana_amp:       { field: 'magic',   name: '마력 증폭',     maxLv: 5, costPer: 8000,  timePer: 10800e3, effect: { magicDmg: 0.03 }, prereq: null },
    bless_rune:     { field: 'magic',   name: '축복의 룬',     maxLv: 3, costPer: 15000, timePer: 21600e3, effect: { hpRegen: 0.01 }, prereq: { mana_amp: 3 } },
    forbidden:      { field: 'magic',   name: '금지된 연구',   maxLv: 1, costPer: 300000,timePer: 345600e3,effect: { forbiddenMagic: true }, prereq: { bless_rune: 3 } },
    intel_net:      { field: 'diplo',   name: '정보망',        maxLv: 5, costPer: 6000,  timePer: 7200e3,  effect: { intelBonus: 0.20 }, prereq: null },
    alliance_str:   { field: 'diplo',   name: '동맹 강화',     maxLv: 3, costPer: 12000, timePer: 14400e3, effect: { allianceBonus: 0.10 }, prereq: { intel_net: 3 } },
    double_agent:   { field: 'diplo',   name: '이중 스파이',   maxLv: 1, costPer: 400000,timePer: 432000e3,effect: { spy: true }, prereq: { alliance_str: 3, intel_net: 5 } },
  };

  function getClanData(p) {
    if (!p.clan) return null;
    // 간이 혈맹 데이터 (실제는 DB)
    if (!ctx.clanTech) ctx.clanTech = {};
    if (!ctx.clanTech[p.clan]) ctx.clanTech[p.clan] = { funds: 0, tech: {}, researching: null };
    return ctx.clanTech[p.clan];
  }

  // 기술 트리 조회
  socket.on('guild_tech_list', () => {
    const p = players[playerId];
    if (!p?.clan) { socket.emit('guild_tech_error', { reason: 'no_clan' }); return; }
    const clan = getClanData(p);
    const techs = Object.entries(TECH_TREE).map(([id, tech]) => {
      const currentLv = clan.tech[id] || 0;
      const canResearch = currentLv < tech.maxLv && (!tech.prereq || Object.entries(tech.prereq).every(([k, v]) => (clan.tech[k] || 0) >= v));
      return { id, ...tech, currentLv, canResearch, cost: tech.costPer * (currentLv + 1) };
    });
    socket.emit('guild_tech_list', { techs, funds: clan.funds, researching: clan.researching });
  });

  // 연구 시작
  socket.on('guild_tech_research', (data) => {
    const p = players[playerId];
    if (!p?.clan || !data?.techId) return;
    const clan = getClanData(p);
    const tech = TECH_TREE[data.techId];
    if (!tech) return;
    const currentLv = clan.tech[data.techId] || 0;
    if (currentLv >= tech.maxLv) { socket.emit('guild_tech_error', { reason: 'max_level' }); return; }
    if (clan.researching) { socket.emit('guild_tech_error', { reason: 'already_researching' }); return; }
    const cost = tech.costPer * (currentLv + 1);
    if (clan.funds < cost) { socket.emit('guild_tech_error', { reason: 'funds', need: cost }); return; }

    clan.funds -= cost;
    const finishTime = Date.now() + tech.timePer * (currentLv + 1);
    clan.researching = { techId: data.techId, finishTime };

    socket.emit('guild_tech_started', { techId: data.techId, finishTime });

    // 완료 타이머
    setTimeout(() => {
      if (clan.researching?.techId === data.techId) {
        clan.tech[data.techId] = (clan.tech[data.techId] || 0) + 1;
        clan.researching = null;
        io.emit('guild_tech_complete', { clan: p.clan, techName: tech.name, newLv: clan.tech[data.techId] });
      }
    }, tech.timePer * (currentLv + 1));
  });

  // 혈맹 자금 기부
  socket.on('guild_fund_donate', (data) => {
    const p = players[playerId];
    if (!p?.clan || !data?.amount) return;
    const amount = Math.min(data.amount, p.gold || 0);
    if (amount <= 0) return;
    const clan = getClanData(p);
    p.gold -= amount;
    clan.funds += amount;
    savePlayer(p);
    socket.emit('guild_fund_donated', { amount, totalFunds: clan.funds });
  });
}

module.exports = { registerGuildTechHandlers };
