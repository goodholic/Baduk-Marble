// 통합 성장 대시보드 — v4.7
// IO↔SLG 순환 시각화, 성장 추천, 다음 목표

function getDashboard(player) {
  let mercSystem, v4;
  try { mercSystem = require('./mercenary_system'); } catch(e) {}
  try { v4 = require('./v4_systems'); } catch(e) {}

  const mercs = mercSystem ? mercSystem.getPlayerMercs(player) : { roster: [], party: [] };
  const partyMercs = mercs.roster.filter(m => mercs.party.includes(m.uid));
  const totalPower = partyMercs.reduce((s, m) => s + (mercSystem ? mercSystem.calcCombatPower(m) : 0), 0);

  // IO 성과
  const ioStats = {
    level: player.level || 1,
    totalKills: player._totalKills || 0,
    bestWave: player._bestSurvivalWave || 0,
    gold: player.gold || 0,
    diamonds: player.diamonds || 0,
  };

  // SLG 성과
  const slgStats = {
    mercCount: mercs.roster.length,
    maxRoster: mercs.maxRoster || 20,
    partySize: partyMercs.length,
    totalPower,
    materials: player._slgMaterials || { materials: 0, bloodlineFrags: 0, evolutionStones: 0 },
    territory: player._territory?.resources || {},
    castleLevel: player._castle?.level || 0,
  };

  // 시너지 분석
  let synergyScore = 0;
  if (mercSystem && partyMercs.length >= 2) {
    synergyScore = mercSystem.calcPartySynergy(partyMercs);
  }
  const elements = new Set(partyMercs.map(m => m.element).filter(Boolean));

  // 성장 추천
  const recommendations = [];
  if (partyMercs.length < 3) recommendations.push({ icon: '\u{1F3B4}', text: '\uC6A9\uBCD1\uC744 3\uBA85 \uC774\uC0C1 \uD30C\uD2F0\uC5D0 \uD3B8\uC131\uD558\uC138\uC694!', priority: 'high' });
  if (partyMercs.length >= 3 && !player._mercFormation?.formationId) recommendations.push({ icon: '\u{1F4CA}', text: '\uC9C4\uD615\uC744 \uC124\uC815\uD558\uBA74 IO \uC804\uD22C\uB825\uC774 \uC62C\uB77C\uAC11\uB2C8\uB2E4!', priority: 'high' });
  if (elements.size < 3 && partyMercs.length >= 3) recommendations.push({ icon: '\u{1F525}', text: '3\uAC00\uC9C0 \uC774\uC0C1 \uC18D\uC131\uC744 \uD30C\uD2F0\uC5D0 \uB123\uC73C\uBA74 \uBCF4\uB108\uC2A4!', priority: 'medium' });
  if (synergyScore < 0) recommendations.push({ icon: '\u{1F494}', text: '\uC131\uACA9 \uC2DC\uB108\uC9C0\uAC00 \uB9C8\uC774\uB108\uC2A4! \uD30C\uD2F0 \uD3B8\uC131\uC744 \uBC14\uAFB8\uBCF4\uC138\uC694', priority: 'high' });
  if (synergyScore >= 0 && synergyScore < 5) recommendations.push({ icon: '\u{1F49B}', text: '\uC131\uACA9 \uC2DC\uB108\uC9C0\uB97C \uB192\uC774\uBA74 ATK +' + (synergyScore*2) + '%', priority: 'medium' });
  if ((player._slgMaterials?.materials || 0) >= 20) recommendations.push({ icon: '\u2B06\uFE0F', text: '\uC7AC\uB8CC ' + player._slgMaterials.materials + '\uAC1C! \uC6A9\uBCD1\uC744 \uAC15\uD654\uD558\uC138\uC694', priority: 'medium' });
  if (ioStats.bestWave < 5) recommendations.push({ icon: '\u{1F3AE}', text: 'IO \uC11C\uBC14\uC774\uBC8C\uC5D0\uC11C \uC6E8\uC774\uBE0C 5 \uB3CC\uD30C \uC2DC \uC7AC\uB8CC \uB300\uB7C9 \uD68D\uB4DD!', priority: 'high' });
  if (slgStats.castleLevel === 0) recommendations.push({ icon: '\u{1F3F0}', text: '\uC131\uC744 \uAC74\uC124\uD558\uBA74 IO\uC5D0\uC11C \uB300\uC7A5\uAC04/\uC2E0\uC804 \uBCF4\uB108\uC2A4!', priority: 'medium' });

  // IO→SLG 순환 표시
  const loopStatus = {
    ioToSlg: '\u{1F3AE} IO \uC11C\uBC14\uC774\uBC8C \u2192 \u{1F4B0} \uACE8\uB4DC + \u{1F3B4} \uC6A9\uBCD1\uCE74\uB4DC + \u{1F9F1} \uC7AC\uB8CC + \u{1FAB5} \uC601\uC9C0\uC790\uC6D0',
    slgToIo: '\u2694\uFE0F \uC6A9\uBCD1 \uD30C\uD2F0 \u2192 IO \uC2A4\uD0EF \uBCF4\uB108\uC2A4 (ATK +' + (totalPower > 0 ? Math.floor(totalPower * 0.3 / partyMercs.length || 1) : 0) + ')',
    synergyInfo: '\u{1F49B} \uC2DC\uB108\uC9C0 ' + synergyScore + ' \u2192 ATK +' + Math.max(0, synergyScore * 2) + '%',
    elementInfo: '\u{1F525} \uC18D\uC131 \uB2E4\uC591\uC131 ' + elements.size + '/6 \u2192 \uBCF4\uB108\uC2A4 ATK +' + (elements.size >= 3 ? elements.size * 3 : 0),
  };

  return { ioStats, slgStats, synergyScore, elementDiversity: elements.size, recommendations, loopStatus };
}

function registerDashboardHandlers(io, socket, player, players) {
  socket.on('growth_dashboard', () => {
    if (!player) return;
    socket.emit('growth_dashboard', getDashboard(player));
  });
}

module.exports = { getDashboard, registerDashboardHandlers };
