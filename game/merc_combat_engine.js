// 용병 전투 시뮬레이션 엔진 — v4.0
// 콜로세움/공성전/호위전투/로그라이크 던전 공통 전투 코어
const { MERCENARIES, PERSONALITIES, GRADE_STAT_MULT, applyPersonality } = require('./mercenary_system');

// ═══ 전투 유닛 생성 ═══
function createCombatUnit(merc, owner) {
  const baseDef = MERCENARIES.find(m => m.id === merc.id) || merc;
  const grade = merc.grade ?? baseDef.grade ?? 0;
  const mult = GRADE_STAT_MULT[grade] || 1;
  const lvBonus = 1 + ((merc.level || 1) - 1) * 0.02;
  const bondBonus = 1 + ((merc.bond || 0) / 1000) * 0.25;

  let stats = {
    atk: Math.floor((baseDef.atk || 10) * mult * lvBonus * bondBonus),
    def: Math.floor((baseDef.def || 5) * mult * lvBonus),
    hp:  Math.floor((baseDef.hp || 100) * mult * lvBonus),
    spd: Math.floor((baseDef.spd || 8) * mult),
    crit: 0.05 + (grade * 0.02),
    critDmg: 1.5,
    dodge: 0.02 + (grade * 0.01),
  };

  // 성격 보정
  const pers = PERSONALITIES[merc.personality];
  if (pers) {
    stats.atk = Math.floor(stats.atk * (pers.atkMod || 1));
    stats.def = Math.floor(stats.def * (pers.defMod || 1));
    stats.spd = Math.floor(stats.spd * (pers.spdMod || 1));
    if (pers.critMod) stats.crit += (pers.critMod - 1);
    if (pers.magicMod) stats.atk = Math.floor(stats.atk * pers.magicMod); // 마법 계열
  }

  // 룬 보정
  if (merc.runes && merc.runes.length > 0) {
    for (const rune of merc.runes) {
      if (rune.atkBonus) stats.atk += Math.floor(stats.atk * rune.atkBonus);
      if (rune.defBonus) stats.def += Math.floor(stats.def * rune.defBonus);
      if (rune.hpBonus) stats.hp += Math.floor(stats.hp * rune.hpBonus);
    }
  }

  return {
    id: merc.id,
    name: merc.name || baseDef.name || merc.id,
    owner,
    maxHP: stats.hp,
    currentHP: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    crit: stats.crit,
    critDmg: stats.critDmg,
    dodge: stats.dodge,
    skill: baseDef.skill || null,
    skillCooldown: 0,
    personality: merc.personality,
    alive: true,
    buffs: [],
    debuffs: [],
  };
}

// ═══ 데미지 계산 ═══
function calcDamage(attacker, defender, isSkill, skillData) {
  const baseDmg = isSkill && skillData?.dmg ? attacker.atk * skillData.dmg : attacker.atk;
  const defense = Math.max(1, defender.def);
  const rawDmg = Math.max(1, baseDmg - defense * 0.6);

  // 크리티컬
  let isCrit = false;
  const critChance = skillData?.critGuarantee ? 1.0 : attacker.crit;
  if (Math.random() < critChance) { isCrit = true; }
  const critMult = isCrit ? attacker.critDmg : 1.0;

  // 회피
  if (Math.random() < defender.dodge) {
    return { dmg: 0, dodged: true, crit: false };
  }

  // 버프/디버프 적용
  let atkMult = 1.0, defMult = 1.0;
  for (const b of attacker.buffs) { if (b.type === 'atk') atkMult += b.value; }
  for (const d of defender.debuffs) { if (d.type === 'def') defMult -= d.value; }

  const finalDmg = Math.max(1, Math.floor(rawDmg * critMult * atkMult * Math.max(0.1, defMult)));
  return { dmg: finalDmg, dodged: false, crit: isCrit };
}

// ═══ 턴제 전투 시뮬레이션 ═══
function simulateBattle(teamA, teamB, options = {}) {
  const maxTurns = options.maxTurns || 50;
  const log = [];

  // 유닛 생성
  const unitsA = teamA.map(m => createCombatUnit(m, 'A'));
  const unitsB = teamB.map(m => createCombatUnit(m, 'B'));
  const allUnits = [...unitsA, ...unitsB];

  for (let turn = 1; turn <= maxTurns; turn++) {
    // SPD 순으로 행동
    const order = allUnits.filter(u => u.alive).sort((a, b) => b.spd - a.spd + (Math.random() - 0.5) * 2);

    for (const unit of order) {
      if (!unit.alive) continue;
      const enemies = (unit.owner === 'A' ? unitsB : unitsA).filter(u => u.alive);
      const allies = (unit.owner === 'A' ? unitsA : unitsB).filter(u => u.alive);
      if (enemies.length === 0) break;

      // 쿨다운 감소
      if (unit.skillCooldown > 0) unit.skillCooldown--;

      // 버프/디버프 틱
      unit.buffs = unit.buffs.filter(b => { b.turns--; return b.turns > 0; });
      unit.debuffs = unit.debuffs.filter(d => { d.turns--; return d.turns > 0; });

      // 스킬 or 일반 공격
      const canSkill = unit.skill && unit.skillCooldown <= 0;
      let action;

      if (canSkill && unit.skill.healAll && allies.some(a => a.currentHP < a.maxHP * 0.7)) {
        // 치유 스킬
        const healAmt = unit.skill.healAll || 0;
        for (const ally of allies) {
          ally.currentHP = Math.min(ally.maxHP, ally.currentHP + healAmt);
        }
        unit.skillCooldown = unit.skill.cd || 10;
        action = { type: 'heal', unit: unit.name, skill: unit.skill.name, healAmt, targets: allies.length };
      } else if (canSkill && unit.skill.dmg) {
        // 공격 스킬
        const targets = unit.skill.aoe ? enemies : [enemies[0]];
        const hits = unit.skill.hits || 1;
        let totalDmg = 0;
        for (const target of targets) {
          for (let h = 0; h < hits; h++) {
            const result = calcDamage(unit, target, true, unit.skill);
            target.currentHP -= result.dmg;
            totalDmg += result.dmg;
            if (target.currentHP <= 0) { target.alive = false; target.currentHP = 0; }
          }
        }
        // 스턴
        if (unit.skill.stun) {
          for (const t of targets) {
            if (t.alive) t.debuffs.push({ type: 'stun', turns: unit.skill.stun });
          }
        }
        // 흡혈
        if (unit.skill.lifesteal) {
          unit.currentHP = Math.min(unit.maxHP, unit.currentHP + Math.floor(totalDmg * unit.skill.lifesteal / 100));
        }
        unit.skillCooldown = unit.skill.cd || 10;
        action = { type: 'skill', unit: unit.name, skill: unit.skill.name, totalDmg, targets: targets.map(t => t.name), aoe: !!unit.skill.aoe };
      } else {
        // 일반 공격
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        const result = calcDamage(unit, target, false, null);
        target.currentHP -= result.dmg;
        if (target.currentHP <= 0) { target.alive = false; target.currentHP = 0; }
        action = { type: 'attack', unit: unit.name, target: target.name, dmg: result.dmg, crit: result.crit, dodged: result.dodged };
      }

      log.push({ turn, ...action });

      // 승리 체크
      if (unitsA.filter(u => u.alive).length === 0 || unitsB.filter(u => u.alive).length === 0) break;
    }

    if (unitsA.filter(u => u.alive).length === 0 || unitsB.filter(u => u.alive).length === 0) break;
  }

  const aAlive = unitsA.filter(u => u.alive);
  const bAlive = unitsB.filter(u => u.alive);
  const winner = aAlive.length > 0 ? (bAlive.length > 0 ? 'draw' : 'A') : 'B';

  return {
    winner,
    survivorsA: aAlive.map(u => ({ name: u.name, hp: u.currentHP, maxHP: u.maxHP })),
    survivorsB: bAlive.map(u => ({ name: u.name, hp: u.currentHP, maxHP: u.maxHP })),
    totalTurns: log.length > 0 ? log[log.length - 1].turn : 0,
    log: log.slice(-30), // 마지막 30개 로그만
    mvp: findMVP(log),
  };
}

function findMVP(log) {
  const dmgMap = {};
  for (const entry of log) {
    if (entry.type === 'attack' || entry.type === 'skill') {
      const dmg = entry.dmg || entry.totalDmg || 0;
      dmgMap[entry.unit] = (dmgMap[entry.unit] || 0) + dmg;
    }
  }
  let mvp = null, maxDmg = 0;
  for (const [name, dmg] of Object.entries(dmgMap)) {
    if (dmg > maxDmg) { mvp = name; maxDmg = dmg; }
  }
  return { name: mvp, totalDmg: maxDmg };
}

module.exports = { createCombatUnit, calcDamage, simulateBattle };
