// ==========================================
// Game Loop Functions (extracted from server.js, Phase 4 refactor)
// ==========================================
// 사용법:
//   const loops = require('./game/loops');
//   loops.init({ getPlayers, getIo, ... });
//
// $ 객체를 통해 모든 외부 의존성을 lazy 접근합니다.

let $ = null;
let prevMonsterSync = {};

function init(deps) {
    $ = deps;
}

// ────────────────────────────────────────
// Phase 4a: expireMarketListings, destroyAxe, syncGameState
// ────────────────────────────────────────

function expireMarketListings() {
    const players = $.getPlayers();
    const io = $.getIo();
    const MARKET_FEE = $.MARKET_FEE;
    const marketListings = $.getMarketListings();
    const filtered = marketListings.filter(l => {
        const now = Date.now();
        if (l.expiresAt && now > l.expiresAt) {
            // 입찰자가 있으면 낙찰 처리
            if (l.bids && l.bids.length > 0) {
                const winBid = l.bids[l.bids.length - 1];
                const winner = players[winBid.bidderId];
                if (winner) {
                    if (!winner.inventory) winner.inventory = {};
                    winner.inventory[l.itemId] = (winner.inventory[l.itemId] || 0) + 1;
                    io.to(winBid.bidderId).emit('market_result', { msg: `${l.itemName} 낙찰! 경매장에서 획득` });
                }
                const seller = players[l.sellerId];
                if (seller) {
                    seller.gold = Math.min(999999999, seller.gold + Math.floor(winBid.amount * (1 - MARKET_FEE)));
                    io.to(l.sellerId).emit('market_result', { msg: `${l.itemName} 낙찰 완료! +${Math.floor(winBid.amount * (1-MARKET_FEE))}G` });
                }
            } else {
                // 입찰 없이 만료 → 판매자에게 반환
                const seller = players[l.sellerId];
                if (seller) {
                    if (!seller.inventory) seller.inventory = {};
                    seller.inventory[l.itemId] = (seller.inventory[l.itemId] || 0) + 1;
                    io.to(l.sellerId).emit('market_result', { msg: `${l.itemName} 만료 반환` });
                }
            }
            return false;
        }
        return true;
    });
    $.setMarketListings(filtered);
}

function destroyAxe(axeId) {
    const axes = $.getAxes();
    const io = $.getIo();
    if (axes[axeId]) {
        clearTimeout(axes[axeId].timer);
        io.emit('axe_destroy', axeId);
        delete axes[axeId];
    }
}

function syncGameState() {
    const players = $.getPlayers();
    const monsters = $.getMonsters();
    const io = $.getIo();
    const tickCounter = $.getTickCounter();

    if (Object.keys(players).length === 0) return;

    // 플레이어별 존 기반 sync (자기 존 + 인접 존만)
    const playersByZone = {};
    for (const pId in players) {
        if (!players[pId] || !players[pId].isAlive || players[pId].isBot) continue;
        const zone = $.getZone(players[pId].x, players[pId].y);
        const zId = zone?.id || 'plains';
        if (!playersByZone[zId]) playersByZone[zId] = [];
        playersByZone[zId].push(pId);
    }

    // 몬스터 델타 sync (변경된 것만)
    const fullSync = (tickCounter % 150 === 0); // 5초마다 풀 sync
    const monsterDelta = {};
    for (const mId in monsters) {
        const m = monsters[mId];
        const prev = prevMonsterSync[mId];
        if (fullSync || !prev || Math.abs(m.x - prev.x) > 0.1 || Math.abs(m.y - prev.y) > 0.1 || m.hp !== prev.hp) {
            if (fullSync || !prev) {
                monsterDelta[mId] = { x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, name: m.name, tier: m.tier, element: m.element, aiType: m.aiType };
            } else {
                monsterDelta[mId] = { x: m.x, y: m.y, hp: m.hp };
            }
            prevMonsterSync[mId] = { x: m.x, y: m.y, hp: m.hp };
        }
    }
    // 삭제된 몬스터 정리
    for (const mId in prevMonsterSync) {
        if (!monsters[mId]) { monsterDelta[mId] = null; delete prevMonsterSync[mId]; }
    }

    // 각 실제 플레이어에게 sync 전송
    for (const pId in players) {
        const p = players[pId];
        if (!p || p.isBot || !p.isAlive) continue;
        const zone = $.getZone(p.x, p.y);

        const playerCount = Object.values(players).filter(pp => !pp.isBot && pp.isAlive).length;
        const uptime = Math.floor((Date.now() - $.serverStartTime) / 1000);
        const syncData = {
            players: {}, monsters: monsterDelta,
            isNight: $.getIsNight(), weather: $.getCurrentWeather().id,
            worldTime: $.getWorldTime(), playerCount, uptime,
        };

        // 가시 범위 내 플레이어만 (거리 150 이내)
        for (const opId in players) {
            if (!players[opId] || !players[opId].isAlive) continue;
            const op = players[opId];
            if (Math.abs(op.x - p.x) < 150 && Math.abs(op.y - p.y) < 150) {
                const opZone = $.getZone(op.x, op.y);
                syncData.players[opId] = {
                    x: op.x, y: op.y, gold: op.gold, hp: op.hp, karma: op.karma,
                    zone: opZone?.id || '', diamonds: op.diamonds || 0, skin: op.activeSkin,
                    exp: op.exp || 0, maxExp: $.getExpRequired(op.level),
                    mp: op.mp || 0, maxMp: op.maxMp || 100,
                    maxHp: op.maxHp || 100, level: op.level || 1, killCount: op.killCount || 0
                };
            }
        }

        io.to(pId).volatile.emit('sync', syncData);
    }

    // 개별 소켓에 버프 상태 전송 (5틱마다 = ~166ms)
    if (tickCounter % 5 === 0) {
        for (const pId in players) {
            const p = players[pId];
            if (!p || p.isBot || !p.isAlive || !p.activeBuffs) continue;
            const buffs = [];
            const now = Date.now();
            for (const [bId, buff] of Object.entries(p.activeBuffs)) {
                const remaining = Math.max(0, Math.ceil((buff.endTime - now) / 1000));
                if (remaining > 0) {
                    buffs.push({ id: bId, name: buff.name, remaining, icon: buff.icon || 'buff' });
                }
            }
            if (buffs.length > 0 || p.lastBuffCount > 0) {
                io.to(pId).emit('buff_status', buffs);
                p.lastBuffCount = buffs.length;
            }
        }
    }
}

// ────────────────────────────────────────
// Phase 4b: updatePassives, updatePlayerAutoSkills
// ────────────────────────────────────────

function updatePassives() {
    const players = $.getPlayers();
    const io = $.getIo();
    const SKILLS = $.getSKILLS();

    // 1) 매 틱 시작에 aura 효과 리셋 (지속 누적/잔존 방지)
    for (const id in players) {
        const p = players[id];
        if (!p) continue;
        if (p.auraDefMulti) p.auraDefMulti = 1;
    }
    // 2) 패시브 적용
    for (const id in players) {
        const p = players[id];
        if (!p || !p.isAlive) continue;
        if (!p.passiveApplied) p.passiveApplied = {};
        const baseClassName = p.baseClassName || p.className;
        const classSkills = SKILLS[baseClassName];
        if (!classSkills) continue;
        for (const skill of classSkills) {
            if (skill.type !== 'passive' || p.level < skill.level) continue;
            // 워리어 - 분노: HP 임계치 이하 시 ATK 보너스
            if (skill.atkBonus && skill.hpThreshold) {
                if (p.hp < p.maxHp * skill.hpThreshold) {
                    p.passiveAtkBonus = skill.atkBonus;
                } else {
                    p.passiveAtkBonus = 0;
                }
            }
            // 나이트 - 수호 오라: 주변 아군 DEF 증가 (매 틱 갱신)
            if (skill.allyDefMulti && skill.auraRange) {
                for (const aid in players) {
                    if (aid === id) continue;
                    const ally = players[aid];
                    if (!ally || !ally.isAlive) continue;
                    // 같은 팀 또는 같은 소유주
                    const sameTeam = ally.team === p.team;
                    const sameOwner = ally.ownerId === p.ownerId || ally.ownerId === id || aid === p.ownerId;
                    if (!sameTeam && !sameOwner) continue;
                    const auraDist = Math.hypot(ally.x - p.x, ally.y - p.y);
                    if (auraDist <= skill.auraRange) {
                        ally.auraDefMulti = Math.max(ally.auraDefMulti || 1, skill.allyDefMulti);
                    }
                }
            }
            // 클레릭 - 치유의 손길: 주변 아군 + 자기 자신 HP 회복
            if (skill.healAuraTick && skill.auraRange) {
                const healAmt = skill.healAuraTick;
                if (p.hp < p.maxHp) {
                    p.hp = Math.min(p.maxHp, p.hp + healAmt);
                }
                for (const aid in players) {
                    if (aid === id) continue;
                    const ally = players[aid];
                    if (!ally || !ally.isAlive || ally.hp >= ally.maxHp) continue;
                    const sameTeam = ally.team === p.team;
                    const sameOwner = ally.ownerId === p.ownerId || ally.ownerId === id || aid === p.ownerId;
                    if (!sameTeam && !sameOwner) continue;
                    const auraDist = Math.hypot(ally.x - p.x, ally.y - p.y);
                    if (auraDist <= skill.auraRange) {
                        ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
                        io.to(aid).emit('combat_log', { msg: `클레릭의 치유 +${healAmt} HP` });
                    }
                }
            }
        }
    }
}

function updatePlayerAutoSkills() {
    const players = $.getPlayers();
    const monsters = $.getMonsters();
    const io = $.getIo();
    const SKILLS = $.getSKILLS();
    const getBuffedStat = $.getBuffedStat;
    const spawnMonster = $.spawnMonster;

    const now = Date.now();
    for (const id in players) {
        const p = players[id];
        if (!p || p.isBot || !p.isAlive || !p.autoSkill) continue;
        if (!p.skillCooldowns) p.skillCooldowns = {};
        const baseClassName = p.baseClassName || p.className;
        const classSkills = SKILLS[baseClassName];
        if (!classSkills) continue;

        // 각성 스킬 병합 (v2.38)
        let allSkills = classSkills;
        if (p.isAwakened && p.awakenedClass && $.getAwakenSkills) {
            const awkSkills = $.getAwakenSkills();
            const awkSkill = awkSkills && awkSkills[p.awakenedClass];
            if (awkSkill) allSkills = classSkills.concat([awkSkill]);
        }

        // 가장 가까운 적/몬스터 찾기
        let target = null, minDist = 9999;
        for (const mId in monsters) {
            const m = monsters[mId];
            if (!m || !m.isAlive) continue;
            const d = Math.hypot(m.x - p.x, m.y - p.y);
            if (d < minDist && d < 8) { minDist = d; target = m; }
        }
        if (!target) continue;

        // 스킬 자동 시전 (액티브만)
        for (const skill of allSkills) {
            if (skill.type === 'passive') continue;
            if (p.level < skill.level) continue;
            if (skill.mpCost && (p.mp || 0) < skill.mpCost) continue;
            const lastUsed = p.skillCooldowns[skill.name] || 0;
            if (now - lastUsed < skill.cooldown * 1000) continue;
            if (skill.range && minDist > skill.range) continue;

            p.skillCooldowns[skill.name] = now;
            if (skill.mpCost) p.mp = Math.max(0, (p.mp || 0) - skill.mpCost);

            // 데미지 스킬
            if (skill.dmgMulti) {
                const buffedAtk = (typeof getBuffedStat === 'function' ? getBuffedStat(p, 'atk') : p.atk) || p.atk || 10;
                const skillDmg = Math.floor(buffedAtk * skill.dmgMulti * (p.dmgMulti || 1));
                target.hp -= skillDmg;
                io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'cast', targetX: target.x, targetY: target.y });
                io.emit('monster_hit', { id: target.id, hp: target.hp, damage: skillDmg, isCrit: false, skillName: skill.name, maxHp: target.maxHp });
                io.to(id).emit('combat_log', { msg: `${skill.name} → ${skillDmg}` });
                if (target.hp <= 0) {
                    target.isAlive = false;
                    delete monsters[target.id];
                    spawnMonster();
                }
                break;
            }
            // 버프 스킬
            if (skill.buff) {
                if (!p.activeBuffs) p.activeBuffs = {};
                p.activeBuffs['skill_'+skill.name] = {
                    name: skill.name, stat: skill.allyAtkMulti ? 'atk' : 'def',
                    multi: skill.allyAtkMulti || skill.dmgReduce || 1.2,
                    startTime: now, endTime: now + (skill.duration || 10) * 1000, icon: 'skill',
                };
                io.to(id).emit('combat_log', { msg: `${skill.name} 발동!` });
                break;
            }
        }
    }
}

// Phase 4c: updateBots, giveExp

function updateBots() {
    const players = $.getPlayers();
    const monsters = $.getMonsters();
    const io = $.getIo();
    const CLASSES = $.getCLASSES();
    const SKILLS = $.getSKILLS();
    const getMountSpeed = $.getMountSpeed;
    const executeThrow = $.executeThrow;
    const applyBuff = $.applyBuff;
    const removeBuff = $.removeBuff;
    for (let id in players) {
        const p = players[id];
        if (!p || !p.isBot || !p.isAlive) continue;

        const cls = CLASSES[p.className];
        if (!cls) continue;

        let target = null;
        let minDist = 9999;

        // 우선순위 1: 지정된 타겟
        if (p.targetId && players[p.targetId] && players[p.targetId].isAlive) {
            target = players[p.targetId];
        } else {
            p.targetId = null;

            // 우선순위 2: 적 플레이어
            if (p.team !== 'peace') {
                for (let eId in players) {
                    const enemy = players[eId];
                    if (enemy.isAlive && enemy.team !== 'peace' && enemy.team !== p.team) {
                        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
                        const rangeLimit = (p.className === 'GuardianTower') ? 15 : 9999;
                        if (dist < minDist && dist <= rangeLimit) {
                            minDist = dist;
                            target = enemy;
                        }
                    }
                }
            }

            // 우선순위 3: 몬스터
            if (!target) {
                for (let mId in monsters) {
                    if (!monsters[mId].isAlive) continue;
                    const dist = Math.hypot(p.x - monsters[mId].x, p.y - monsters[mId].y);
                    const rangeLimit = (p.className === 'GuardianTower') ? 15 : 9999;
                    if (dist < minDist && dist <= rangeLimit) {
                        minDist = dist;
                        target = monsters[mId];
                    }
                }
            }
        }

        if (target) {
            const dx = target.x - p.x;
            const dy = target.y - p.y;
            const mag = Math.hypot(dx, dy);
            if (mag > 0) {
                p.dirX = dx / mag;
                p.dirY = dy / mag;
            }

            // 이동 (타워 제외) — 탈것 속도 적용
            if (cls.speed > 0) {
                let moveSpeed = cls.speed;
                // 탈것 속도 보너스 (본인 또는 오너)
                const speedOwner = p.ownerId ? players[p.ownerId] : p;
                if (speedOwner) {
                    const mountBonus = getMountSpeed(speedOwner);
                    moveSpeed *= (1 + mountBonus);
                    moveSpeed += (speedOwner.equipBonusSpd || 0);
                }
                p.x += p.dirX * (moveSpeed / 100);
                p.y += p.dirY * (moveSpeed / 100);
            }

            // 공격 확률 — 용병 공격 스타일별 분기
            const throwChance = (p.className === 'GuardianTower') ? 0.12 : 0.06;
            if (Math.random() < throwChance) {
                const atkStyle = p.attackStyle || 'melee';
                if (atkStyle === 'charge' && target && minDist < 4) {
                    // 돌진: 타겟에게 순간 접근 + 강타
                    const dx = target.x - p.x, dy = target.y - p.y;
                    const mag = Math.hypot(dx, dy);
                    if (mag > 1) { p.x += (dx/mag) * 2; p.y += (dy/mag) * 2; }
                    const chargeDmg = Math.floor((p.atk || 10) * 1.5 * (p.dmgMulti || 1));
                    if (target.hp !== undefined) {
                        target.hp -= chargeDmg;
                        if (target.id) io.emit('player_hit', { id: target.id, hp: target.hp, damage: chargeDmg, isCrit: false, skillName: '돌진' });
                    }
                } else if (atkStyle === 'aoe' && target && minDist < 5) {
                    // 광역: 주변 적에게 범위 데미지
                    const aoeDmg = Math.floor((p.atk || 10) * 0.8 * (p.dmgMulti || 1));
                    for (const [eid, enemy] of Object.entries(players)) {
                        if (eid === id || !enemy.isAlive || enemy.team === p.team) continue;
                        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < 3) {
                            enemy.hp -= aoeDmg;
                            if (enemy.id) io.emit('player_hit', { id: eid, hp: enemy.hp, damage: aoeDmg, isCrit: false, skillName: '광역' });
                        }
                    }
                    for (const mi in monsters) {
                        const mob = monsters[mi];
                        if (mob && mob.isAlive && Math.hypot(mob.x - p.x, mob.y - p.y) < 3) {
                            mob.hp -= aoeDmg;
                        }
                    }
                } else if (atkStyle === 'breath' && target && minDist < 8) {
                    // 브레스: 직선 범위 공격
                    const breathDmg = Math.floor((p.atk || 10) * 1.8 * (p.dmgMulti || 1));
                    const dx = target.x - p.x, dy = target.y - p.y;
                    const mag = Math.hypot(dx, dy);
                    if (mag > 0.1) {
                        const bdx = dx/mag, bdy = dy/mag;
                        for (const [eid, enemy] of Object.entries(players)) {
                            if (eid === id || !enemy.isAlive || enemy.team === p.team) continue;
                            const px = enemy.x - p.x, py = enemy.y - p.y;
                            const proj = px*bdx + py*bdy;
                            if (proj > 0 && proj < 6 && Math.abs(px*bdy - py*bdx) < 1.5) {
                                enemy.hp -= breathDmg;
                                if (enemy.id) io.emit('player_hit', { id: eid, hp: enemy.hp, damage: breathDmg, isCrit: false, skillName: '브레스' });
                            }
                        }
                    }
                } else {
                    // melee (기본): 투사체 발사
                    executeThrow(id);
                }
            }

            // 스킬 쿨타임 초기화 (패시브는 updatePassives에서 처리)
            if (!p.skillCooldowns) p.skillCooldowns = {};
            const baseClassName = p.baseClassName || p.className;
            const classSkills = SKILLS[baseClassName];

            // 스킬 자동 시전 (클래스별 액티브/궁극기)
            if (classSkills && target && minDist < 8) {
                for (const skill of classSkills) {
                    if (skill.type === 'passive') continue;
                    if (p.level < skill.level) continue;
                    // MP 체크
                    if (skill.mpCost && (p.mp || 0) < skill.mpCost) continue;
                    const lastUsed = p.skillCooldowns[skill.name] || 0;
                    if (Date.now() - lastUsed > skill.cooldown * 1000) {
                        p.skillCooldowns[skill.name] = Date.now();
                        // MP 소모
                        if (skill.mpCost) p.mp = Math.max(0, (p.mp || 0) - skill.mpCost);

                        // 은신 스킬 (버프만, 데미지 없음)
                        if (skill.stealth) {
                            applyBuff(p, 'stealth');
                            p.stealthNextAtkMulti = skill.nextAtkMulti || 2.0;
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'stealth' });
                            break;
                        }

                        // 전투 함성 (아군 버프)
                        if (skill.allyAtkMulti) {
                            for (const [aid, ally] of Object.entries(players)) {
                                if (!ally.isAlive) continue;
                                if (ally.team !== p.team && !(ally.ownerId === p.ownerId || ally.ownerId === id || aid === p.ownerId)) continue;
                                const buffDist = Math.hypot(ally.x - p.x, ally.y - p.y);
                                if (buffDist <= (skill.range || 6)) {
                                    applyBuff(ally, 'war_cry');
                                }
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'ally_buff' });
                            break;
                        }

                        // 도발 (주변 몬스터의 타겟을 자신으로 변경)
                        if (skill.taunt) {
                            let tauntCount = 0;
                            for (const monsterId in monsters) {
                                const mob = monsters[monsterId];
                                if (!mob.isAlive) continue;
                                const dist = Math.hypot(mob.x - p.x, mob.y - p.y);
                                if (dist <= (skill.range || 8)) {
                                    mob.tauntTarget = id;
                                    tauntCount++;
                                    // 3초 후 도발 해제
                                    setTimeout(() => {
                                        if (monsters[monsterId]) monsters[monsterId].tauntTarget = null;
                                    }, 3000);
                                }
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'aoe' });
                            io.to(id).emit('combat_log', { msg: `도발! ${tauntCount}마리 몬스터의 주의를 끌었다!` });
                            break;
                        }

                        // 철벽 방어 (자기 버프, 받는 데미지 70% 감소)
                        if (skill.dmgReduce) {
                            applyBuff(p, 'iron_wall');
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'self_buff' });
                            break;
                        }

                        // 신성한 방벽 (주변 아군 무적)
                        if (skill.allyInvincible) {
                            for (const [aid, ally] of Object.entries(players)) {
                                if (!ally.isAlive) continue;
                                if (ally.team !== p.team && !(ally.ownerId === p.ownerId || ally.ownerId === id || aid === p.ownerId)) continue;
                                const buffDist = Math.hypot(ally.x - p.x, ally.y - p.y);
                                if (buffDist <= (skill.range || 6)) {
                                    applyBuff(ally, 'divine_shield');
                                }
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'ally_invincible' });
                            break;
                        }

                        // 체인 라이트닝 (연쇄 타격)
                        if (skill.chainCount) {
                            let chainTarget = target;
                            const hitTargets = new Set();
                            for (let c = 0; c < skill.chainCount; c++) {
                                if (!chainTarget || hitTargets.has(chainTarget.id || chainTarget.idx)) break;
                                hitTargets.add(chainTarget.id || chainTarget.idx);
                                const chainDmg = Math.floor((p.atk || 10) * (skill.dmgMulti || 1) * (p.dmgMulti || 1));
                                chainTarget.hp -= chainDmg;
                                if (chainTarget.id) io.emit('player_hit', { id: chainTarget.id, hp: chainTarget.hp, damage: chainDmg, isCrit: true, skillName: skill.name });
                                // 다음 타겟 찾기
                                let nextTarget = null, nextDist = skill.chainRange || 4;
                                for (const [eid, enemy] of Object.entries(players)) {
                                    if (!enemy.isAlive || hitTargets.has(eid)) continue;
                                    if (enemy.team === p.team) continue;
                                    const d = Math.hypot(enemy.x - (chainTarget.x||0), enemy.y - (chainTarget.y||0));
                                    if (d < nextDist) { nextDist = d; nextTarget = enemy; }
                                }
                                if (!nextTarget) {
                                    for (let mi = 0; mi < monsters.length; mi++) {
                                        const m = monsters[mi];
                                        if (!m || hitTargets.has(mi)) continue;
                                        const d = Math.hypot(m.x - (chainTarget.x||0), m.y - (chainTarget.y||0));
                                        if (d < nextDist) { nextDist = d; nextTarget = m; }
                                    }
                                }
                                chainTarget = nextTarget;
                            }
                            io.emit('skill_effect', { casterId: id, skillName: skill.name, type: 'chain' });
                            break;
                        }

                        // 일반 데미지 스킬
                        const atkValue = p.atk || 10;
                        const passiveBonus = p.passiveAtkBonus || 0;
                        const effectiveAtk = atkValue * (1 + passiveBonus);
                        let skillDmg = Math.floor(effectiveAtk * (skill.dmgMulti || 1) * (p.dmgMulti || 1));

                        // 은신 상태에서 공격 시 2배
                        if (p.stealthNextAtkMulti && p.activeBuffs && p.activeBuffs['stealth']) {
                            skillDmg = Math.floor(skillDmg * p.stealthNextAtkMulti);
                            removeBuff(p, 'stealth');
                            p.stealthNextAtkMulti = 0;
                        }

                        // 암살 스킬 - HP 30% 이하 적에게 처형 데미지
                        if (skill.executeThreshold && target.hp !== undefined && target.maxHp) {
                            if (target.hp / target.maxHp <= skill.executeThreshold) {
                                skillDmg = Math.floor(skillDmg * 2);
                            }
                        }

                        // 그림자 일격 - 크리티컬 확률 2배
                        if (skill.critBonus) {
                            const critRate = (CLASSES[baseClassName]?.critRate || 0.1) * 2;
                            if (Math.random() < critRate) skillDmg = Math.floor(skillDmg * 2);
                        }

                        // 다중 히트 (연속 베기)
                        const hitCount = skill.hits || 1;
                        for (let h = 0; h < hitCount; h++) {
                            if (target.hp !== undefined) {
                                target.hp -= skillDmg;
                                if (target.id) io.emit('player_hit', { id: target.id, hp: target.hp, damage: skillDmg, isCrit: true, skillName: skill.name });
                            }
                        }

                        // 어쌔신 독 바르기 패시브 - 스킬 적중 시 독 적용
                        const poisonPassive = classSkills.find(s => s.type === 'passive' && s.poisonDot);
                        if (poisonPassive && p.level >= poisonPassive.level && target.activeBuffs !== undefined) {
                            applyBuff(target, 'poison');
                        }

                        // 아이스 볼트 슬로우 적용
                        if (skill.slow && target.activeBuffs !== undefined) {
                            applyBuff(target, 'slow');
                        }

                        // 스턴 적용 (방패 강타)
                        if (skill.stun && target.activeBuffs !== undefined) {
                            applyBuff(target, 'stun');
                        }

                        // 버서커 버프 적용
                        if (skill.buff && skill.dmgMulti && skill.spdMulti) {
                            applyBuff(p, 'berserker');
                            if (skill.defPenalty) {
                                applyBuff(p, 'berserk_penalty');
                            }
                        }

                        // AOE 데미지 (광역 스킬)
                        if (skill.aoe && target) {
                            const aoeR = skill.aoeRadius || 3;
                            for (const [eid, enemy] of Object.entries(players)) {
                                if (eid === id || !enemy.isAlive || eid === (target.id || '')) continue;
                                if (enemy.team === p.team) continue;
                                const d = Math.hypot(enemy.x - target.x, enemy.y - target.y);
                                if (d <= aoeR) {
                                    enemy.hp -= skillDmg;
                                    if (enemy.id) io.emit('player_hit', { id: enemy.id, hp: enemy.hp, damage: skillDmg, isCrit: true, skillName: skill.name });
                                }
                            }
                            for (let mi = 0; mi < monsters.length; mi++) {
                                const m = monsters[mi];
                                if (!m || m === target) continue;
                                const d = Math.hypot(m.x - target.x, m.y - target.y);
                                if (d <= aoeR) {
                                    m.hp -= skillDmg;
                                }
                            }
                        }

                        io.emit('skill_effect', { casterId: id, skillName: skill.name, type: skill.aoe ? 'aoe' : 'single', targetX: target.x, targetY: target.y });
                        break; // 한 틱에 스킬 1개만
                    }
                }
            }

            // 주인과 거리 체크 → 너무 멀면 강제 복귀
            if (p.ownerId && players[p.ownerId] && players[p.ownerId].isAlive && cls.speed > 0) {
                const ownerDist = Math.hypot(p.x - players[p.ownerId].x, p.y - players[p.ownerId].y);
                if (ownerDist > 15 && ownerDist > 0) {
                    // 주인에게 강제 복귀 (타겟 포기)
                    target = null;
                    const owner = players[p.ownerId];
                    p.dirX = (owner.x - p.x) / ownerDist;
                    p.dirY = (owner.y - p.y) / ownerDist;
                    p.x += p.dirX * (cls.speed / 50); // 빠르게 복귀
                    p.y += p.dirY * (cls.speed / 50);
                }
            }

        } else if (cls.speed > 0) {
            // 주인 따라가기 (타겟 없을 때) — 탈것 속도 적용
            if (p.ownerId && players[p.ownerId] && players[p.ownerId].isAlive) {
                const owner = players[p.ownerId];
                const dx = owner.x - p.x;
                const dy = owner.y - p.y;
                const mag = Math.hypot(dx, dy);
                if (mag > 2.0) {
                    let followSpeed = cls.speed;
                    const mountBonus = getMountSpeed(owner);
                    followSpeed *= (1 + mountBonus);
                    p.dirX = dx / mag;
                    p.dirY = dy / mag;
                    p.x += p.dirX * (followSpeed / 100);
                    p.y += p.dirY * (cls.speed / 100);
                }
            }
        }
    }
}


function giveExp(playerObj, amount) {
    const players = $.getPlayers();
    const io = $.getIo();
    const getExpRequired = $.getExpRequired;
    const MAX_LEVEL = $.MAX_LEVEL;
    const capResources = $.capResources;
    const skillTree = $.skillTree;
    const savePlayer = $.savePlayer;
    const trackQuest = $.trackQuest;
    const getPetEffect = $.getPetEffect;
    const parties = $.getParties();
    let target = playerObj;
    if (playerObj.isBot && playerObj.ownerId && players[playerObj.ownerId]) {
        target = players[playerObj.ownerId];
    }

    // 파티 EXP 공유 (거리 10 이내 파티원에게 분배)
    if (target.partyId && parties[target.partyId]) {
        const party = parties[target.partyId];
        const nearbyMembers = party.members.filter(mid => {
            const m = players[mid];
            if (!m || !m.isAlive || mid === target.id) return false;
            return Math.hypot(m.x - target.x, m.y - target.y) <= 10;
        });
        if (nearbyMembers.length > 0) {
            const baseShare = Math.floor(amount * 0.8 / (nearbyMembers.length + 1));
            for (const mid of nearbyMembers) {
                const member = players[mid];
                if (member) {
                    // 레벨차 패널티: 20레벨 이상 차이 시 EXP 50% 감소
                    const lvlDiff = Math.abs(target.level - member.level);
                    const penalty = lvlDiff >= 20 ? 0.5 : lvlDiff >= 10 ? 0.8 : 1.0;
                    const shareAmount = Math.floor(baseShare * penalty);
                    member.exp += shareAmount;
                    const req = getExpRequired(member.level);
                    if (member.exp >= req) {
                        member.exp -= req;
                        member.level++;
                        member.maxHp += 25;
                        member.hp = member.maxHp;
                        member.dmgMulti += 0.08;
                        member.statPoints = (member.statPoints || 0) + 3;
                        capResources(member);
                        io.emit('level_up', { id: member.id, level: member.level, className: member.displayName, statPoints: member.statPoints });
                        trackQuest(member, 'reach_level', 0);
                        savePlayer(member);
                    }
                    io.emit('player_update', member);
                }
            }
            amount = baseShare; // 본인도 분배 몫만 받음
        }
    }

    // 펫 EXP 보너스
    const petEffect = getPetEffect(target);
    if (petEffect && petEffect.effect === 'expBonus') amount = Math.floor(amount * (1 + petEffect.value));

    target.exp += amount;
    const required = getExpRequired(target.level);

    if (target.exp >= required && target.level < MAX_LEVEL) {
        target.exp -= required;
        target.level++;
        target.maxHp += 20;
        target.hp = target.maxHp;
        target.dmgMulti += 0.08;
        capResources(target);

        target.statPoints = (target.statPoints || 0) + 3; // 레벨업 시 스탯 3포인트
        // v1.35: 특성 포인트 +1
        if (!target.isBot) skillTree.awardPoints(target, 1);
        // v2.40: 별가루 +25
        if (!target.isBot && $.constellation) $.constellation.earnStardust(target, 'level_up');
        io.emit('level_up', { id: target.id, level: target.level, className: target.displayName, statPoints: target.statPoints, maxHp: target.maxHp, atk: target.atk, def: target.def, maxExp: getExpRequired(target.level) });
        trackQuest(target, 'reach_level', 0);

        // Lv.20 전직 알림
        if (target.level === 20 && !target.isAdvanced) {
            io.to(target.id).emit('server_msg', { msg: '전직이 가능합니다! 메뉴에서 전직하세요.', type: 'rare' });
        }
        // v2.51: 영웅의 전당 — Lv.50 최초 달성
        if (!target.isBot && target.level >= 50 && $.hallOfHeroes) {
            const hallResult = $.hallOfHeroes.tryRegister('first_lv50', target);
            if (hallResult) {
                io.emit('server_msg', { msg: `🏆 [영웅의 전당] ${target.displayName}이(가) "${hallResult.achievement.name}" 달성! 서버 전체 버프 적용!`, type: 'legendary' });
                io.emit('hall_achievement', { name: hallResult.achievement.name, icon: hallResult.achievement.icon, player: target.displayName, relic: hallResult.relic?.name });
            }
        }
        // 골드 100만 체크
        if (!target.isBot && (target.gold || 0) >= 1000000 && $.hallOfHeroes) {
            const hallResult = $.hallOfHeroes.tryRegister('first_million_gold', target);
            if (hallResult) {
                io.emit('server_msg', { msg: `🏆 [영웅의 전당] ${target.displayName}이(가) "${hallResult.achievement.name}" 달성!`, type: 'legendary' });
                savePlayer(target);
            }
        }
        savePlayer(target);
    } else {
        capResources(target);
    }
    io.emit('player_update', target);
}



// Phase 4d: handleCollisions, handleAoeDamage, handlePlayerDeath

function handleCollisions() {
    const players = $.getPlayers();
    const monsters = $.getMonsters();
    const io = $.getIo();
    const axes = $.getAxes();
    const drops = $.getDrops();
    const tickCounter = $.getTickCounter();
    const isNight = $.getIsNight();
    const SKILLS = $.getSKILLS();
    const savePlayer = $.savePlayer;
    const getExpRequired = $.getExpRequired;
    const ZONES = $.ZONES;
    const ZONE_MONSTERS = $.ZONE_MONSTERS;
    const MONSTER_TIERS = $.MONSTER_TIERS;
    const MONSTER_LORE = $.MONSTER_LORE;
    const EQUIP_STATS = $.EQUIP_STATS;
    const GRADE_INFO = $.GRADE_INFO;
    const CLAN_SKILLS = $.CLAN_SKILLS;
    const QUESTS = $.QUESTS;
    const KARMA = $.KARMA;
    const FACTIONS = $.getFACTIONS();
    const RUNES = $.getRUNES();
    const clans = $.getClans();
    const worldBoss = $.getWorldBoss();
    const meteorShower = $.getMeteorShower();
    const goldenRain = $.getGoldenRain();
    const goldFeverZone = $.getGoldFeverZone();
    const goldFeverEnd = $.getGoldFeverEnd();
    const treasureGoblin = $.getTreasureGoblin();
    const zoneConquest = $.getZoneConquest();
    const factionState = $.getFactionState();
    const calcDamage = $.calcDamage;
    const spawnDrop = $.spawnDrop;
    const spawnMonster = $.spawnMonster;
    const trackQuest = $.trackQuest;
    const applyBuff = $.applyBuff;
    const removeBuff = $.removeBuff;
    const alertArmy = $.alertArmy;
    const generateRandomOptions = $.generateRandomOptions;
    const getZone = $.getZone;
    const getWeekNumber = $.getWeekNumber;
    const checkTitles = $.checkTitles;
    const getThisWeekChallenge = $.getThisWeekChallenge;
    const getTodaysChallenge = $.getTodaysChallenge;
    const nextEntityId = $.nextEntityId;
    for (const axeId in axes) {
        const axe = axes[axeId];
        const owner = players[axe.ownerId];
        if (!owner) continue;

        let axeDestroyed = false;

        // 몬스터 충돌
        for (const mId in monsters) {
            const mob = monsters[mId];
            if (!mob.isAlive) continue;

            const dx = axe.x - mob.x, dy = axe.y - mob.y;
            if (dx * dx + dy * dy < 1.0) {
                // axe.dmg를 우선 사용 (executeThrow에서 계산된 값) — fallback으로 재계산
                let damage = axe.dmg;
                if (!Number.isFinite(damage) || damage <= 0) {
                    const calc = calcDamage(owner.atk || 10, mob.def, owner.dmgMulti || 1, owner.critRate || 0.1, owner.element, mob.element);
                    damage = calc.damage;
                }
                mob.hp -= damage;

                // 월드보스 기여도 추적
                if (mob.isWorldBoss && mob.damageContrib) {
                    let realOwnerId = (owner.isBot && owner.ownerId) ? owner.ownerId : owner.id;
                    mob.damageContrib[realOwnerId] = (mob.damageContrib[realOwnerId] || 0) + damage;
                    // 보스 HP 바 업데이트
                    if (tickCounter % 5 === 0) {
                        // 보스 페이즈 전환
                        const hpPct = mob.hp / mob.maxHp;
                        if (!mob._phase) mob._phase = 'normal';
                        if (hpPct <= 0.25 && mob._phase !== 'desperate') {
                            mob._phase = 'desperate';
                            mob.atk = Math.floor(mob.atk * 1.8);
                            mob.aiType = 'aoe';
                            io.emit('boss_phase', { id: mId, phase: 'desperate', msg: '보스가 필사적으로 발악합니다! ATK x1.8 + 광역 공격!' });
                            io.emit('server_msg', { msg: `[월드 보스] 필사 페이즈! ATK 대폭 증가!`, type: 'danger' });
                        } else if (hpPct <= 0.5 && mob._phase === 'normal') {
                            mob._phase = 'enrage';
                            mob.atk = Math.floor(mob.atk * 1.3);
                            mob.aiType = 'breath';
                            io.emit('boss_phase', { id: mId, phase: 'enrage', msg: '보스가 분노합니다! ATK x1.3 + 브레스!' });
                            io.emit('server_msg', { msg: `[월드 보스] 분노 페이즈! 브레스 공격 시작!`, type: 'danger' });
                        }
                        io.emit('world_boss_update', { id: mId, hp: mob.hp, maxHp: mob.maxHp, phase: mob._phase });
                    }
                }

                if (mob.hp <= 0) {
                    mob.isAlive = false;

                    // 월드보스 처치 시 기여도 기반 보상
                    if (mob.isWorldBoss) {
                        const totalDmg = Object.values(mob.damageContrib || {}).reduce((s, d) => s + d, 0);
                        const sorted = Object.entries(mob.damageContrib || {}).sort((a,b) => b[1] - a[1]);
                        io.emit('server_msg', { msg: `[월드 보스] ${mob.name} 처치 완료! MVP: ${players[sorted[0]?.[0]]?.displayName || '???'}`, type: 'boss' });
                        // totalDmg가 0이면 (오직 DOT/poison으로 처치된 엣지케이스) NaN 보상 방지
                        if (totalDmg <= 0) {
                            const safeOwner = (owner.isBot && owner.ownerId && players[owner.ownerId]) ? players[owner.ownerId] : owner;
                            safeOwner.gold = Math.min(999999999, safeOwner.gold + mob.goldReward || 0);
                            giveExp(safeOwner, mob.expReward || 0);
                            worldBoss = null;
                            io.emit('world_boss_dead', { id: mId, name: mob.name });
                            delete monsters[mId];
                            destroyAxe(axeId);
                            axeDestroyed = true;
                            break;
                        }

                        for (const [pid, dmg] of sorted) {
                            const p = players[pid];
                            if (!p) continue;
                            const ratio = dmg / totalDmg;
                            const goldReward = Math.floor(mob.goldReward * ratio * 2);
                            const expReward = Math.floor(mob.expReward * ratio * 2);
                            p.gold = Math.min(999999999, p.gold + goldReward);
                            giveExp(p, expReward);
                            $.trackQuest(p, 'worldboss_kill', 1);
                            // MVP (1위)에게 전설 재료 보너스
                            if (pid === sorted[0][0]) {
                                $.trackQuest(p, 'worldboss_mvp', 1);
                                if (!p.inventory) p.inventory = {};
                                p.inventory['mat_dragon'] = (p.inventory['mat_dragon']||0) + 3;
                                io.to(pid).emit('combat_log', { msg: `MVP 보너스! 드래곤 비늘 x3, ${goldReward}G, ${expReward} EXP` });
                            } else {
                                io.to(pid).emit('combat_log', { msg: `월드 보스 보상: ${goldReward}G, ${expReward} EXP (기여 ${Math.floor(ratio*100)}%)` });
                            }
                            // 상위 기여자 장비 드롭 기회
                            if (ratio > 0.05 && Math.random() < ratio) {
                                const bossDrops = ['equip_sword_4','equip_armor_4','equip_ring_3','equip_neck_3'];
                                const dropItem = bossDrops[Math.floor(Math.random() * bossDrops.length)];
                                if (!p.inventory) p.inventory = {};
                                p.inventory[dropItem] = (p.inventory[dropItem]||0) + 1;
                                const eName = EQUIP_STATS[dropItem]?.name || dropItem;
                                io.to(pid).emit('combat_log', { msg: `${eName} 획득!` });
                                io.emit('server_msg', { msg: `${p.displayName}이(가) 월드 보스에서 ${eName} 획득!`, type: 'rare' });
                            }
                            io.emit('player_update', p);
                        }

                        worldBoss = null;
                        io.emit('world_boss_dead', { id: mId, name: mob.name });
                        delete monsters[mId];
                        destroyAxe(axeId);
                        axeDestroyed = true;
                        break;
                    }

                    const tier = MONSTER_TIERS[mob.tier];
                    // 존 스케일링된 보상 사용 (없으면 기본 티어 보상)
                    const mobExpReward = mob.expReward || tier.expReward;
                    const mobGoldReward = mob.goldReward || tier.goldReward;

                    let realOwner = (owner.isBot && owner.ownerId && players[owner.ownerId])
                        ? players[owner.ownerId] : owner;

                    // 존 보너스 + 혈맹 버프 + 장비 보너스 적용
                    let goldMulti = 1, expMulti = 1;
                    // 존 보너스 (몬스터가 위치한 존의 보너스)
                    const mobZone = mob.zoneId && ZONE_MONSTERS[mob.zoneId];
                    if (mobZone) {
                        goldMulti += mobZone.goldBonus || 0;
                        expMulti += mobZone.expBonus || 0;
                    }
                    // 혈맹 버프
                    if (realOwner.clanName && clans[realOwner.clanName]) {
                        const clanLv = clans[realOwner.clanName].level;
                        if (clanLv >= 5) goldMulti += CLAN_SKILLS[5].multi;
                        if (clanLv >= 3) expMulti += CLAN_SKILLS[3].multi;
                        clans[realOwner.clanName].exp += 1;
                    }
                    // 장비 보너스
                    goldMulti += (realOwner.equipGoldBonus || 0);
                    expMulti += (realOwner.equipExpBonus || 0);
                    // 밤 보너스 (+20% EXP)
                    if (isNight) expMulti += 0.2;
                    // 골드 피버 보너스 (해당 존 3배)
                    if (goldFeverZone && mob.zoneId === goldFeverZone && Date.now() < goldFeverEnd) {
                        goldMulti *= 3; expMulti *= 3;
                    }
                    // 킬 스트릭 보너스
                    if (!realOwner._killStreak) realOwner._killStreak = { count:0, lastTime:0 };
                    const ks = realOwner._killStreak;
                    const ksNow = Date.now();
                    if (ksNow - ks.lastTime < 10000) { ks.count++; } else { ks.count = 1; }
                    ks.lastTime = ksNow;
                    if (ks.count >= 100) { goldMulti *= 5; expMulti *= 5; }
                    else if (ks.count >= 50) { goldMulti *= 3; expMulti *= 3; }
                    else if (ks.count >= 25) { goldMulti *= 2; expMulti *= 2; }
                    else if (ks.count >= 10) { goldMulti *= 1.5; expMulti *= 1.5; }
                    // 스트릭 공지 (25/50/100)
                    if (ks.count === 25 || ks.count === 50 || ks.count === 100) {
                        io.emit('server_msg', { msg: `${realOwner.displayName}이(가) ${ks.count}킬 스트릭 달성!`, type: 'rare' });
                    }
                    if (ks.count % 10 === 0 && ks.count >= 10) {
                        io.to(realOwner.id).emit('kill_streak_bonus', { count: ks.count, multi: goldMulti });
                    }
                    $.trackQuest(realOwner, 'kill_streak', ks.count); // 최대 스트릭 추적

                    const earnedGold = Math.floor(mobGoldReward * goldMulti);
                    realOwner.gold = Math.min(999999999, realOwner.gold + earnedGold);
                    realOwner._totalGoldEarned = (realOwner._totalGoldEarned || 0) + earnedGold;
                    $.trackQuest(realOwner, 'total_gold', realOwner._totalGoldEarned);
                    giveExp(owner, Math.floor(mobExpReward * expMulti));

                    // v2.31: 영혼 흡수
                    if (!realOwner.isBot && $.soulSystem) {
                        const soulResult = $.soulSystem.absorbSoul(realOwner, mob.tier);
                        if (soulResult.success) {
                            io.to(realOwner.id).emit('soul_absorbed', { soul: soulResult.soul });
                            io.to(realOwner.id).emit('combat_log', { msg: `${soulResult.soul.icon} ${soulResult.msg}` });
                        }
                    }

                    // v2.23: 사냥꾼 의뢰 진행
                    if (!realOwner.isBot && $.bountyHunter) {
                        const huntResults = $.bountyHunter.updateMissionProgress(realOwner, 'kill_monster', 1, {
                            zone: mob.zoneId, monsterTier: mob.tier, isNight: isNight, weather: $.getCurrentWeather?.()?.id,
                        });
                        for (const hr of huntResults) {
                            io.to(realOwner.id).emit('combat_log', { msg: `[사냥 의뢰] ${hr.name} 완료!` });
                        }
                    }

                    // v2.20: 소환석 드롭 (15% 확률)
                    if (!realOwner.isBot && Math.random() < 0.15) {
                        const stoneKeys = Object.keys($.SUMMON_STONES || {});
                        if (stoneKeys.length > 0) {
                            // 가중치 기반 선택
                            const stones = $.SUMMON_STONES;
                            const totalW = stoneKeys.reduce((s, k) => s + (stones[k].dropWeight || 1), 0);
                            let roll = Math.random() * totalW;
                            let picked = stoneKeys[0];
                            for (const k of stoneKeys) {
                                roll -= (stones[k].dropWeight || 1);
                                if (roll <= 0) { picked = k; break; }
                            }
                            if (!realOwner.inventory) realOwner.inventory = {};
                            realOwner.inventory[picked] = (realOwner.inventory[picked] || 0) + 1;
                            io.to(realOwner.id).emit('combat_log', { msg: `${stones[picked].icon} ${stones[picked].name} 획득!` });
                        }
                    }

                    // 변신 처치 카운트
                    if (!realOwner.morphKills) realOwner.morphKills = {};
                    if (mob.tier === 'normal') realOwner.morphKills['slime'] = (realOwner.morphKills['slime']||0) + 1;
                    if (mob.tier === 'elite') realOwner.morphKills['orc'] = (realOwner.morphKills['orc']||0) + 1;
                    if (mob.tier === 'rare') realOwner.morphKills['darkknight'] = (realOwner.morphKills['darkknight']||0) + 1;
                    if (mob.tier === 'boss' || mob.tier === 'legendary') realOwner.morphKills['dragon'] = (realOwner.morphKills['dragon']||0) + 1;

                    // 몬스터 도감 기록
                    if (!realOwner.bestiary) realOwner.bestiary = {};
                    if (!realOwner.bestiary[mob.name]) {
                        realOwner.bestiary[mob.name] = 1;
                        // 몬스터 도감 로어 표시
                        const lore = MONSTER_LORE[mob.name];
                        if (lore) io.to(realOwner.id).emit('monster_lore', { name: mob.name, lore, tier: mob.tier });
                        const discovered = Object.keys(realOwner.bestiary).length;
                        if (discovered === 10) { realOwner.gold = Math.min(999999999, realOwner.gold + 500); io.to(realOwner.id).emit('combat_log', { msg: '도감 10종 달성! +500G' }); }
                        if (discovered === 25) { realOwner.gold = Math.min(999999999, realOwner.gold + 1000); io.to(realOwner.id).emit('achievement_unlock', { name: '몬스터 학자', desc: '25종 처치', reward: {gold:1000} }); }
                        if (discovered === 50) { realOwner.gold = Math.min(999999999, realOwner.gold + 5000); realOwner.diamonds = Math.min(999999999, (realOwner.diamonds || 0) + 100); io.to(realOwner.id).emit('achievement_unlock', { name: '도감 마스터', desc: '50종 처치', reward: {gold:5000, diamonds:100} }); }
                    } else {
                        realOwner.bestiary[mob.name]++;
                    }

                    // 트레저 고블린 처치 보상
                    if (mob.tier === 'treasure' && treasureGoblin) {
                        const zoneGold = (ZONE_MONSTERS[mob.zoneId]?.goldBonus || 0) + 1;
                        const goblinReward = Math.floor(500 * zoneGold);
                        realOwner.gold = Math.min(999999999, realOwner.gold + goblinReward);
                        if (!realOwner.inventory) realOwner.inventory = {};
                        realOwner.inventory['mat_dragon'] = (realOwner.inventory['mat_dragon']||0) + 1;
                        io.emit('server_msg', { msg: `${realOwner.displayName}이(가) 보물 도깨비를 잡았다! +${goblinReward}G + 드래곤 비늘!`, type: 'boss' });
                        treasureGoblin = null;
                        nextTreasureTime = Date.now() + 180000 + Math.random() * 300000;
                    }

                    // 존 정복 킬 카운트
                    if (mob.zoneId && realOwner.clanName) {
                        if (!zoneConquest[mob.zoneId]) zoneConquest[mob.zoneId] = { kills: {}, lordClan: null };
                        const zc = zoneConquest[mob.zoneId].kills;
                        zc[realOwner.clanName] = (zc[realOwner.clanName] || 0) + 1;
                    }
                    // 존 정복 영주 보너스
                    if (mob.zoneId && zoneConquest[mob.zoneId]?.lordClan === realOwner.clanName) {
                        goldMulti += 0.15; expMulti += 0.15;
                    }

                    // 진영 킬 카운트
                    if (realOwner.faction && mob.zoneId) {
                        if (factionState[realOwner.faction]) {
                            factionState[realOwner.faction].kills++;
                            if (!factionState[realOwner.faction].zones[mob.zoneId]) factionState[realOwner.faction].zones[mob.zoneId] = 0;
                            factionState[realOwner.faction].zones[mob.zoneId]++;
                            realOwner.factionRep = (realOwner.factionRep || 0) + 1;
                            $.trackQuest(realOwner, 'faction_rep', realOwner.factionRep);
                        }
                        // 진영 보너스 (ATK/DEF는 recalcStats에서 적용, EXP만 여기서)
                        const fb = FACTIONS[realOwner.faction];
                        if (fb) {
                            if (fb.bonus === 'exp') expMulti += fb.bonusValue;
                        }
                    }

                    // 룬 드롭 (5% 확률)
                    if (Math.random() < 0.05) {
                        const runeKeys = Object.keys(RUNES);
                        const droppedRune = runeKeys[Math.floor(Math.random() * runeKeys.length)];
                        if (!realOwner.inventory) realOwner.inventory = {};
                        realOwner.inventory[droppedRune] = (realOwner.inventory[droppedRune]||0) + 1;
                        io.to(realOwner.id).emit('combat_log', { msg: `룬 [${droppedRune}] 획득!` });
                    }

                    // 유성우 존 보너스 (x2)
                    if (meteorShower && mob.zoneId === meteorShower.zoneId) {
                        goldMulti *= 2; expMulti *= 2;
                    }
                    // 황금 비 존 보너스 (골드 x3, EXP x1.5)
                    if (goldenRain && mob.zoneId === goldenRain.zoneId) {
                        goldMulti *= 3; expMulti *= 1.5;
                        if (!realOwner.isBot) $.trackQuest(realOwner, 'golden_rain_kills', 1);
                    }

                    // 현상금 처치 체크
                    if (!realOwner.isBot && realOwner._activeBounty) {
                        const bounty = realOwner._activeBounty;
                        // (이건 PvP 킬에서 처리 — 몬스터 킬과 무관)
                    }

                    // 전설 몬스터 처치 특별 보상
                    if (mob.tier === 'legendary') {
                        if (!realOwner.inventory) realOwner.inventory = {};
                        realOwner.inventory['mat_dragon'] = (realOwner.inventory['mat_dragon']||0) + 3;
                        realOwner.inventory['mat_soul'] = (realOwner.inventory['mat_soul']||0) + 5;
                        io.emit('server_msg', { msg: `${realOwner.displayName}이(가) ${mob.name}을(를) 처치! 전설 재료 획득!`, type: 'rare' });
                    }

                    // 퀘스트 추적
                    trackQuest(realOwner, 'kill_monster', 1);
                    if (mob.tier === 'elite' || mob.tier === 'rare' || mob.tier === 'boss' || mob.tier === 'legendary') trackQuest(realOwner, 'kill_elite', 1);
                    if (mob.tier === 'boss' || mob.tier === 'legendary') trackQuest(realOwner, 'kill_boss', 1);
                    // 별가루 획득 (v2.40)
                    if (!realOwner.isBot && $.constellation) {
                        const sdSource = mob.tier === 'legendary' ? 'kill_legendary' : mob.tier === 'boss' ? 'kill_boss' : (mob.tier === 'elite' || mob.tier === 'rare') ? 'kill_elite' : null;
                        if (sdSource) $.constellation.earnStardust(realOwner, sdSource);
                    }
                    // 신앙심 획득 (v2.45)
                    if (!realOwner.isBot && $.divineBlessing) {
                        const faithSource = mob.tier === 'legendary' ? 'kill_legendary' : mob.tier === 'boss' ? 'kill_boss' : null;
                        if (faithSource) $.divineBlessing.earnFaith(realOwner, faithSource);
                    }
                    // 신화 무기 친밀도/경험치 (v2.53)
                    if (!realOwner.isBot && $.mythicWeapon) {
                        const mwResult = $.mythicWeapon.onCombat(realOwner, mob.tier);
                        if (mwResult) {
                            if (mwResult.dialogue) io.to(realOwner.id).emit('mythweapon_dialogue', { msg: mwResult.dialogue, leveledUp: mwResult.leveledUp });
                            if (mwResult.leveledUp) savePlayer(realOwner);
                        }
                    }
                    // 정령 경험치 (v2.52)
                    if (!realOwner.isBot && $.spiritPact) {
                        const spiritExp = mob.tier === 'legendary' ? 30 : mob.tier === 'boss' ? 15 : mob.tier === 'rare' ? 8 : mob.tier === 'elite' ? 4 : 1;
                        const spiritLvUp = $.spiritPact.grantSpiritExp(realOwner, spiritExp);
                        if (spiritLvUp?.leveledUp) {
                            io.to(realOwner.id).emit('server_msg', { msg: `[정령] 정령 Lv.${spiritLvUp.level} 달성!`, type: 'rare' });
                        }
                    }
                    trackQuest(realOwner, 'earn_gold', mobGoldReward);
                    // 실시간 퀘스트 진행도 알림 (가장 가까운 미완료 퀘스트)
                    if (!realOwner.isBot && realOwner.questProgress) {
                        for (const [qId, q] of Object.entries(QUESTS)) {
                            if ((q.type === 'daily' || q.type === 'main') && !(realOwner.questCompleted?.[qId])) {
                                const prog = realOwner.questProgress[qId] || 0;
                                if (prog > 0 && prog <= q.goal) {
                                    io.to(realOwner.id).emit('quest_progress', { name: q.name, current: Math.min(prog, q.goal), goal: q.goal, remaining: Math.max(0, q.goal - prog) });
                                    if (prog >= q.goal) {
                                        io.to(realOwner.id).emit('server_msg', { msg: `[퀘스트] "${q.name}" 완료! 보상을 수령하세요!`, type: 'rare' });
                                    }
                                    break;
                                }
                            }
                        }
                    }

                    // 주간 챌린지 진행도
                    if (!realOwner.isBot) {
                        const thisWeek = getWeekNumber();
                        if (realOwner._weeklyChallengeWeek !== thisWeek) {
                            realOwner._weeklyChallengeWeek = thisWeek;
                            realOwner._weeklyChallengeProgress = 0;
                            realOwner._weeklyChallengeClaimed = false;
                        }
                        const wch = getThisWeekChallenge();
                        if (!realOwner._weeklyChallengeClaimed) {
                            if (wch.target === 'kill_monster') realOwner._weeklyChallengeProgress = (realOwner._weeklyChallengeProgress||0) + 1;
                            else if (wch.target === 'kill_legendary' && (mob.tier === 'legendary' || mob.tier === 'mythic')) realOwner._weeklyChallengeProgress = (realOwner._weeklyChallengeProgress||0) + 1;
                            else if (wch.target === 'earn_gold') realOwner._weeklyChallengeProgress = (realOwner._weeklyChallengeProgress||0) + Math.floor(mobGoldReward * goldMulti);
                        }
                    }

                    // 일일 챌린지 진행도 업데이트
                    if (!realOwner.isBot && !realOwner._dailyChallengeClaimed) {
                        const challenge = getTodaysChallenge();
                        if (!realOwner._dailyChallengeProgress) realOwner._dailyChallengeProgress = 0;
                        let shouldIncrement = false;
                        if (challenge.target === 'kill_monster') {
                            shouldIncrement = !challenge.zone || mob.zoneId === challenge.zone;
                        } else if (challenge.target === 'kill_boss' && (mob.tier === 'boss' || mob.tier === 'legendary' || mob.tier === 'mythic')) {
                            shouldIncrement = true;
                        } else if (challenge.target === 'kill_elite' && (mob.tier === 'elite' || mob.tier === 'rare' || mob.tier === 'boss')) {
                            shouldIncrement = true;
                        } else if (challenge.target === 'kill_night' && isNight) {
                            shouldIncrement = true;
                        }
                        if (shouldIncrement) {
                            realOwner._dailyChallengeProgress++;
                            if (realOwner._dailyChallengeProgress >= challenge.goal && !realOwner._dailyChallengeCompleted) {
                                realOwner._dailyChallengeCompleted = true;
                                io.to(realOwner.id).emit('server_msg', { msg: `[일일 챌린지] "${challenge.name}" 완료! 보상을 수령하세요!`, type: 'rare' });
                            }
                        }
                    }

                    // 재료 드롭 (인벤토리에 직접 추가)
                    if (!realOwner.inventory) realOwner.inventory = {};
                    if (mob.tier === 'normal' && Math.random() < 0.3) realOwner.inventory['mat_iron'] = (realOwner.inventory['mat_iron']||0) + 1;
                    if (mob.tier === 'elite' && Math.random() < 0.4) realOwner.inventory['mat_magic'] = (realOwner.inventory['mat_magic']||0) + 1;
                    if (mob.tier === 'rare' && Math.random() < 0.3) realOwner.inventory['mat_soul'] = (realOwner.inventory['mat_soul']||0) + 1;
                    if (mob.tier === 'boss' && Math.random() < 0.2) realOwner.inventory['mat_dragon'] = (realOwner.inventory['mat_dragon']||0) + 1;
                    if (Math.random() < 0.15) realOwner.inventory['pot_hp_s'] = (realOwner.inventory['pot_hp_s']||0) + 1;

                    // 장��� 드롭 (등급별 확장)
                    const equipDrops = {
                        normal: [
                            { id:'equip_sword_1', rate:0.05 }, { id:'equip_armor_1', rate:0.05 },
                            { id:'equip_helm_1', rate:0.03 }, { id:'equip_glove_1', rate:0.03 },
                            { id:'equip_boots_1', rate:0.03 },
                        ],
                        elite: [
                            { id:'equip_sword_2', rate:0.08 }, { id:'equip_armor_2', rate:0.08 },
                            { id:'equip_helm_2', rate:0.05 }, { id:'equip_glove_2', rate:0.05 },
                            { id:'equip_boots_2', rate:0.05 }, { id:'equip_ring_1', rate:0.04 },
                            { id:'equip_neck_1', rate:0.03 },
                        ],
                        rare: [
                            { id:'equip_sword_3', rate:0.10 }, { id:'equip_armor_3', rate:0.10 },
                            { id:'equip_helm_3', rate:0.07 }, { id:'equip_glove_3', rate:0.07 },
                            { id:'equip_boots_3', rate:0.07 }, { id:'equip_ring_2', rate:0.05 },
                            { id:'equip_neck_2', rate:0.04 },
                        ],
                        boss: [
                            { id:'equip_sword_4', rate:0.04 }, { id:'equip_armor_4', rate:0.04 },
                            { id:'equip_sword_3', rate:0.15 }, { id:'equip_armor_3', rate:0.15 },
                            { id:'equip_ring_3', rate:0.05 }, { id:'equip_neck_3', rate:0.04 },
                            { id:'equip_sword_5', rate:0.01 }, { id:'equip_armor_5', rate:0.01 },
                        ],
                        legendary: [
                            { id:'equip_sword_5', rate:0.15 }, { id:'equip_armor_5', rate:0.15 },
                            { id:'equip_sword_4', rate:0.30 }, { id:'equip_armor_4', rate:0.30 },
                            { id:'equip_ring_3', rate:0.20 }, { id:'equip_neck_3', rate:0.15 },
                        ],
                    };
                    const dropTable = equipDrops[mob.tier] || [];
                    for (const d of dropTable) {
                        const effectiveRate = d.rate * (1 + (realOwner.dropRateBonus || 0));
                        if (Math.random() < effectiveRate) {
                            const eqInfo = EQUIP_STATS[d.id];
                            // 자동 분해 (일반 등급)
                            if (realOwner.autoDismantle && eqInfo && eqInfo.grade === 'normal') {
                                const dGold = Math.floor((eqInfo.atk + eqInfo.def) * 5 + 50);
                                realOwner.gold = Math.min(999999999, realOwner.gold + dGold);
                                io.to(realOwner.id).emit('combat_log', { msg: (eqInfo.name||d.id) + ' 자동 분해! +' + dGold + 'G' });
                                break;
                            }
                            realOwner.inventory[d.id] = (realOwner.inventory[d.id]||0) + 1;
                            if (eqInfo) {
                                const gradeInfo = GRADE_INFO[eqInfo.grade] || GRADE_INFO.normal;
                                if (gradeInfo.randomOpts > 0) {
                                    if (!realOwner.equipOptions) realOwner.equipOptions = {};
                                    realOwner.equipOptions[d.id] = generateRandomOptions(gradeInfo.randomOpts);
                                }
                            }
                            const eName = eqInfo?.name || d.id;
                            const gradeColor = GRADE_INFO[eqInfo?.grade]?.color || '#ccc';
                            io.to(realOwner.id).emit('combat_log', { msg: eName + ' 획득!', color: gradeColor });
                            if (eqInfo?.grade === 'epic' || eqInfo?.grade === 'legendary') {
                                io.to(realOwner.id).emit('rare_drop_celebration', { grade: eqInfo.grade, name: eName });
                            }
                            if (mob.tier === 'boss' || eqInfo?.grade === 'epic' || eqInfo?.grade === 'legendary') {
                                io.emit('server_msg', { msg: `${realOwner.displayName}이(가) ${eName}을(를) 획득!`, type: 'rare' });
                            }
                            break;
                        }
                    }

                    // 골드 드롭
                    spawnDrop(mob.x, mob.y, Math.floor(mobGoldReward * 0.5), mId);

                    // 크리티컬 루트 (5% 확률 — 반짝이 드롭)
                    if (Math.random() < 0.05) {
                        const critDropId = 'crit_loot_' + (++entityIdCounter);
                        drops[critDropId] = {
                            id: critDropId, x: mob.x, y: mob.y, gold: 0,
                            type: 'critical_loot', spawnTime: Date.now(), pickupRadius: 5.0,
                        };
                        io.emit('drop_spawn', { ...drops[critDropId], isCritical: true });
                        io.to(realOwner.id).emit('critical_loot', { dropId: critDropId, x: mob.x, y: mob.y });
                        // 3초 후 소멸
                        setTimeout(() => { if (drops[critDropId]) { io.emit('drop_destroy', critDropId); delete drops[critDropId]; } }, 3000);
                    }

                    // 금지된 마법서 드롭 (v2.39)
                    if (!realOwner.isBot && $.forbiddenGrimoire) {
                        const grimDrop = $.forbiddenGrimoire.tryDropGrimoire(realOwner, mob.tier);
                        if (grimDrop.dropped) {
                            io.to(realOwner.id).emit('grimoire_drop', { name: grimDrop.grimoire.name, icon: grimDrop.grimoire.icon, tier: grimDrop.grimoire.tier });
                            io.emit('server_msg', { msg: `[금서] ${realOwner.displayName}이(가) ${grimDrop.grimoire.icon} ${grimDrop.grimoire.name}을(를) 발견했다!`, type: 'legendary' });
                            savePlayer(realOwner);
                        }
                    }

                    // 영혼 파편 드롭 (v2.43)
                    if (!realOwner.isBot && $.soulContract) {
                        const soulDrops = $.soulContract.tryDropFragment(realOwner, mob.tier);
                        for (const sd of soulDrops) {
                            io.to(realOwner.id).emit('soul_fragment_drop', { name: sd.soul.name, icon: sd.soul.icon, tier: sd.soul.tier });
                            io.emit('server_msg', { msg: `[영혼] ${realOwner.displayName}이(가) ${sd.soul.icon} ${sd.soul.name}의 영혼 파편을 획득!`, type: 'rare' });
                            savePlayer(realOwner);
                        }
                    }

                    // 고대 문자 드롭 (v2.44)
                    if (!realOwner.isBot && $.ancientLanguage) {
                        const glyphDrop = $.ancientLanguage.tryDropGlyph(realOwner, mob.tier);
                        if (glyphDrop) {
                            io.to(realOwner.id).emit('glyph_drop', { name: glyphDrop.glyph.name, icon: glyphDrop.glyph.icon });
                            savePlayer(realOwner);
                        }
                    }

                    // 변이체 처치 기록 (v2.47)
                    if (!realOwner.isBot && mob.isMutant && mob.mutationId && $.mutation) {
                        const mutKill = $.mutation.onMutantKill(realOwner, mob.mutationId);
                        if (mutKill.newDiscovery) {
                            io.emit('server_msg', { msg: `[변이 도감] ${realOwner.displayName}: ${mutKill.mutation.prefix} ${mutKill.mutation.name} 최초 발견!`, type: 'legendary' });
                        }
                        if (mutKill.dropItem) {
                            io.to(realOwner.id).emit('mutation_drop', { name: mutKill.dropName, item: mutKill.dropItem });
                        }
                        savePlayer(realOwner);
                    }

                    // 저주 장비 드롭 + 정화 진행 (v2.48)
                    if (!realOwner.isBot && $.cursedEquipment) {
                        const cursedDrop = $.cursedEquipment.tryDropCursed(realOwner, mob.tier);
                        if (cursedDrop.dropped) {
                            io.to(realOwner.id).emit('cursed_drop', { name: cursedDrop.item.name, icon: cursedDrop.item.icon });
                            io.emit('server_msg', { msg: `⚠️ ${realOwner.displayName}이(가) ${cursedDrop.item.icon} ${cursedDrop.item.name}을(를) 발견!`, type: 'legendary' });
                            savePlayer(realOwner);
                        }
                        $.cursedEquipment.updateProgress(realOwner, 'kills', 1);
                        if (mob.tier === 'boss' || mob.tier === 'legendary' || mob.tier === 'worldboss') {
                            $.cursedEquipment.updateProgress(realOwner, 'bossKills', 1);
                        }
                    }

                    const goldEarned = Math.floor(mobGoldReward * goldMulti);
                    const expEarned = Math.floor(mobExpReward * expMulti);
                    const expPct = Math.floor((realOwner.exp / getExpRequired(realOwner.level)) * 100);
                    io.emit('monster_die', { id: mId, tier: mob.tier, killer: realOwner.id, zone: mob.zoneId, name: mob.name, goldEarned, expEarned, expPct, isMutant: mob.isMutant, mutationName: mob.mutationName });
                    io.emit('player_update', realOwner);

                    delete monsters[mId];
                    spawnMonster();
                    io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                } else {
                    io.emit('monster_hit', { id: mId, hp: mob.hp, damage, maxHp: mob.maxHp });
                }
                destroyAxe(axeId);
                axeDestroyed = true;
                break;
            }
        }

        if (axeDestroyed) continue;

        // 플레이어 충돌
        for (const targetId in players) {
            const target = players[targetId];
            if (targetId === axe.ownerId || !target.isAlive) continue;
            if (owner.team === 'peace' && target.team === 'peace') continue;
            if (owner.team === target.team) continue;
            // 안전지대 보호: 피격자가 마을 안에 있으면 공격 무효
            const targetZone = getZone(target.x, target.y);
            if (targetZone && ZONES[targetZone.id]?.safe) continue;
            // 공격자가 안전지대에서 공격하는 것도 차단
            const ownerZone = getZone(owner.x, owner.y);
            if (ownerZone && ZONES[ownerZone.id]?.safe) continue;

            // 회피 판정
            if (Math.random() < (target.dodgeRate || 0)) {
                io.to(targetId).emit('dodge_event', { attackerName: owner.displayName || '적' });
                continue;
            }

            const dx = axe.x - target.x, dy = axe.y - target.y;
            if (dx * dx + dy * dy < 0.6 * 0.6) {
                // 무적 상태 체크
                if (target.activeBuffs && target.activeBuffs['divine_shield']) {
                    destroyAxe(axeId);
                    break;
                }

                let { damage, isCrit } = calcDamage(
                    owner.atk || 10, target.def || 0, owner.dmgMulti, owner.critRate || 0.1, owner.element, target.element
                );

                // 철벽 방어 (데미지 감소) 체크
                if (target.activeBuffs && target.activeBuffs['iron_wall']) {
                    damage = Math.floor(damage * 0.3);
                }

                // 수호 오라 방어 보너스 체크
                if (target.auraDefMulti && target.auraDefMulti > 1) {
                    damage = Math.floor(damage / target.auraDefMulti);
                }

                // 은신 상태에서 공격 시 2배 데미지
                if (owner.stealthNextAtkMulti && owner.activeBuffs && owner.activeBuffs['stealth']) {
                    damage = Math.floor(damage * owner.stealthNextAtkMulti);
                    removeBuff(owner, 'stealth');
                    owner.stealthNextAtkMulti = 0;
                }

                target.hp -= damage;

                // 어쌔신 독 바르기 패시브 (일반 공격 시 독 적용)
                const ownerBaseClass = owner.baseClassName || owner.className;
                const ownerSkills = SKILLS[ownerBaseClass];
                if (ownerSkills) {
                    const poisonPassive = ownerSkills.find(s => s.type === 'passive' && s.poisonDot);
                    if (poisonPassive && (owner.level || 1) >= poisonPassive.level) {
                        if (!target.activeBuffs) target.activeBuffs = {};
                        applyBuff(target, 'poison');
                    }
                }

                io.emit('player_hit', {
                    id: targetId, hp: target.hp, damage, isCrit,
                    attackerClass: owner.displayName
                });

                alertArmy(targetId, axe.ownerId);
                destroyAxe(axeId);

                if (target.hp <= 0) {
                    handlePlayerDeath(target, targetId, owner, axe.ownerId);
                }
                break;
            }
        }
    }
}


function handleAoeDamage() {
    const players = $.getPlayers();
    const monsters = $.getMonsters();
    const io = $.getIo();
    const aoes = $.getAoes();
    const getBuffedStat = $.getBuffedStat;
    const calcDamage = $.calcDamage;
    const spawnDrop = $.spawnDrop;
    const spawnMonster = $.spawnMonster;
    const getZone = $.getZone;
    const ZONES = $.ZONES;
    const MONSTER_TIERS = $.MONSTER_TIERS;
    const worldBoss = $.getWorldBoss();
    const meteorShower = $.getMeteorShower();
    const goldenRain = $.getGoldenRain();
    const alertArmy = $.alertArmy;
    const nextEntityId = $.nextEntityId;
    for (const aoeId in aoes) {
        const aoe = aoes[aoeId];
        const owner = players[aoe.ownerId];
        if (!owner) continue;

        // 버프 적용된 공격력 (음식/물약/스킬 버프 반영)
        const ownerAtk = getBuffedStat(owner, 'atk') || owner.atk || 10;

        // 몬스터
        for (const mId in monsters) {
            const mob = monsters[mId];
            if (!mob.isAlive) continue;
            const dx = aoe.x - mob.x, dy = aoe.y - mob.y;
            if (dx * dx + dy * dy <= aoe.radius * aoe.radius) {
                const { damage } = calcDamage(ownerAtk, mob.def, owner.dmgMulti * 0.8, owner.critRate || 0.1, owner.element, mob.element, owner);
                mob.hp -= damage;

                // 월드보스 기여도 추적 (AOE도 포함)
                if (mob.isWorldBoss && mob.damageContrib) {
                    const realOwnerId = (owner.isBot && owner.ownerId) ? owner.ownerId : owner.id;
                    mob.damageContrib[realOwnerId] = (mob.damageContrib[realOwnerId] || 0) + damage;
                }

                if (mob.hp <= 0) {
                    mob.isAlive = false;
                    let realOwner = (owner.isBot && owner.ownerId && players[owner.ownerId])
                        ? players[owner.ownerId] : owner;

                    // 월드보스: 기여도 기반 보상 + 일반 몬스터 리스폰 안 함
                    if (mob.isWorldBoss) {
                        const totalDmg = Object.values(mob.damageContrib || {}).reduce((s, d) => s + d, 0);
                        const sorted = Object.entries(mob.damageContrib || {}).sort((a,b) => b[1] - a[1]);
                        io.emit('server_msg', { msg: `[월드 보스] ${mob.name} 처치 완료! MVP: ${players[sorted[0]?.[0]]?.displayName || realOwner.displayName}`, type: 'boss' });
                        if (totalDmg > 0) {
                            for (const [pid, dmg] of sorted) {
                                const pp = players[pid];
                                if (!pp) continue;
                                const ratio = dmg / totalDmg;
                                pp.gold = Math.min(999999999, pp.gold + Math.floor((mob.goldReward || 0) * ratio * 2));
                                giveExp(pp, Math.floor((mob.expReward || 0) * ratio * 2));
                                io.emit('player_update', pp);
                            }
                        } else {
                            // damageContrib이 비어있으면 처치자에게 전체 보상
                            realOwner.gold = Math.min(999999999, realOwner.gold + mob.goldReward || 0);
                            giveExp(realOwner, mob.expReward || 0);
                        }
                        worldBoss = null;
                        io.emit('world_boss_dead', { id: mId, name: mob.name });
                        delete monsters[mId];
                        // 월드보스는 spawnMonster로 대체하지 않음
                    } else {
                        const tier = MONSTER_TIERS[mob.tier];
                        if (tier) {
                            // 월드 이벤트 보너스 (메테오/황금 비)
                            let goldMulti = 1, expMulti = 1;
                            if (meteorShower && mob.zoneId === meteorShower.zoneId) { goldMulti *= 2; expMulti *= 2; }
                            if (goldenRain && mob.zoneId === goldenRain.zoneId) { goldMulti *= 3; expMulti *= 1.5; }

                            realOwner.gold = Math.min(999999999, realOwner.gold + Math.floor(tier.goldReward * goldMulti));
                            giveExp(owner, Math.floor(tier.expReward * expMulti));
                            spawnDrop(mob.x, mob.y, Math.floor(tier.goldReward * 0.5 * goldMulti), mId);
                        }
                        io.emit('monster_die', { id: mId, tier: mob.tier, killer: realOwner.id });
                        io.emit('player_update', realOwner);
                        delete monsters[mId];
                        spawnMonster();
                        io.emit('monster_spawn', monsters['monster_' + entityIdCounter]);
                    }
                } else {
                    io.emit('monster_hit', { id: mId, hp: mob.hp, damage, maxHp: mob.maxHp });
                }
            }
        }

        // 플레이어
        for (const targetId in players) {
            const target = players[targetId];
            if (!target.isAlive || targetId === aoe.ownerId) continue;
            if (owner.team === 'peace' && target.team === 'peace') continue;
            if (owner.team === target.team) continue;
            // 안전지대 보호
            const tgtZ = getZone(target.x, target.y);
            if (tgtZ && ZONES[tgtZ.id]?.safe) continue;
            // 무적 체크
            if (target.activeBuffs && target.activeBuffs['divine_shield']) continue;
            // 회피 판정
            if (Math.random() < (target.dodgeRate || 0)) continue;

            const dx = aoe.x - target.x, dy = aoe.y - target.y;
            if (dx * dx + dy * dy <= aoe.radius * aoe.radius) {
                let { damage } = calcDamage(ownerAtk, target.def || 0, owner.dmgMulti * 0.6, owner.critRate || 0.1, owner.element, target.element, owner);
                // 철벽 방어 데미지 감소
                if (target.activeBuffs && target.activeBuffs['iron_wall']) damage = Math.floor(damage * 0.3);
                // 수호 오라 방어 보너스
                if (target.auraDefMulti && target.auraDefMulti > 1) damage = Math.floor(damage / target.auraDefMulti);
                target.hp -= damage;

                io.emit('player_hit', { id: targetId, hp: target.hp, damage, isCrit: false });
                alertArmy(targetId, aoe.ownerId);

                if (target.hp <= 0) {
                    handlePlayerDeath(target, targetId, owner, aoe.ownerId);
                }
            }
        }
    }
}


function handlePlayerDeath(target, targetId, owner, attackerId) {
    const players = $.getPlayers();
    const io = $.getIo();
    const arenaMatches = $.getArenaMatches();
    const clans = $.getClans();
    const KARMA = $.KARMA;
    const ZONES = $.ZONES;
    const getPetEffect = $.getPetEffect;
    const endArenaMatch = $.endArenaMatch;
    const checkTitles = $.checkTitles;
    const trackQuest = $.trackQuest;
    const createBot = $.createBot;
    const getExpRequired = $.getExpRequired;
    const recalcStats = $.recalcStats;
    const savePlayer = $.savePlayer;
    // 자동 부활 체크 (펫 + 프레스티지)
    if (!target.isBot) {
        const petEff = getPetEffect(target);
        const hasLegacyRevive = target.legacyPerks?.some(pk => pk.stat === 'autoRevive');
        const canRevive = (petEff && petEff.effect === 'autoRevive') || hasLegacyRevive;
        if (canRevive) {
            const now = Date.now();
            if (!target.lastAutoRevive || now - target.lastAutoRevive > 600000) {
                target.lastAutoRevive = now;
                const reviveHp = hasLegacyRevive ? 0.1 : 0.5; // 프레스티지: 10%, 펫: 50%
                target.hp = Math.floor(target.maxHp * Math.max(reviveHp, petEff?.effect === 'autoRevive' ? 0.5 : 0));
                if (target.hp < 1) target.hp = 1;
                const source = (petEff?.effect === 'autoRevive') ? '천사 펫' : '환생 특성';
                io.to(targetId).emit('combat_log', { msg: `${source}이(가) 당신을 부활시켰습니다! (HP ${Math.floor(target.hp/target.maxHp*100)}%)` });
                io.emit('player_update', target);
                return;
            }
        }
    }

    target.isAlive = false;

    let realKiller = owner;
    if (owner.isBot && owner.ownerId && players[owner.ownerId]) {
        realKiller = players[owner.ownerId];
    }

    // 아레나 매치 종료 체크
    if (target.arenaMatchId && arenaMatches[target.arenaMatchId]) {
        const match = arenaMatches[target.arenaMatchId];
        const winnerId = (match.player1 === targetId) ? match.player2 : match.player1;
        target.isAlive = true; // 아레나에서는 실제 사망 안함
        target.hp = 1;
        endArenaMatch(target.arenaMatchId, winnerId, targetId, 'KO');
        return; // 아레나는 별도 처리, 일반 사망 로직 스킵
    }

    realKiller.killCount++;
    if (!target.isBot) {
        realKiller.pvpWins = (realKiller.pvpWins || 0) + 1;
        trackQuest(realKiller, 'pvp_win', 1);
        trackQuest(realKiller, 'pvp_fight', 1);
        checkTitles(realKiller);
        // 현상금 처치 보상
        if (realKiller._activeBounty && realKiller._activeBounty.targetId === targetId) {
            const bounty = realKiller._activeBounty;
            realKiller.gold = Math.min(999999999, realKiller.gold + bounty.reward);
            realKiller.diamonds = Math.min(999999999, (realKiller.diamonds || 0) + 50);
            realKiller._activeBounty = null;
            io.emit('server_msg', { msg: `[현상금] ${realKiller.displayName}이(가) ${target.displayName}의 현상금을 수령! +${bounty.reward}G +50D`, type: 'rare' });
            io.to(realKiller.id).emit('bounty_result', { msg: `현상금 완료! +${bounty.reward}G +50D` });
        }
        // 카오틱 상자 드롭
        if ((target.karma||0) >= 200) {
            const chestGold = Math.floor(target.gold * 0.2);
            let chestItem = null;
            if (target.equipped) {
                const slots = Object.keys(target.equipped).filter(s => target.equipped[s]);
                if (slots.length > 0) {
                    const rSlot = slots[Math.floor(Math.random() * slots.length)];
                    chestItem = target.equipped[rSlot];
                    delete target.equipped[rSlot];
                    recalcStats(target);
                }
            }
            const chestId = 'chaotic_chest_' + (++entityIdCounter);
            drops[chestId] = {
                id: chestId, x: target.x, y: target.y,
                gold: chestGold, item: chestItem, spawnTime: Date.now(), pickupRadius: 3.0,
                type: 'chaotic_chest'
            };
            setTimeout(() => { if (drops[chestId]) { io.emit('drop_destroy', chestId); delete drops[chestId]; } }, 30000);
            io.emit('drop_spawn', drops[chestId]);
            io.emit('server_msg', { msg: `[카오틱 상자] ${target.displayName}의 상자가 ${getZone(target.x,target.y)?.id||'필드'}에 나타났다!`, type: 'danger' });
        }
    }

    // ── PK 카르마 판정 ──
    let isPK = false;
    // 혈맹 전쟁 중이면 PK 페널티 없음
    const killerClan = realKiller.clanName && clans[realKiller.clanName];
    const targetClan = target.clanName && clans[target.clanName];
    const inClanWar = killerClan?.war?.target === target.clanName || targetClan?.war?.target === realKiller.clanName;

    if (!target.isBot && target.team === 'peace' && !inClanWar) {
        // 평화 모드 유저를 죽이면 PK (혈맹 전쟁 중 제외)
        isPK = true;
        realKiller.karma += KARMA.PK_PENALTY;
        io.emit('pk_alert', {
            killerId: realKiller.id,
            killerName: realKiller.displayName,
            victimId: targetId,
            karma: realKiller.karma
        });
        io.emit('server_msg', { msg: `${realKiller.displayName}이(가) PK! 카르마: ${realKiller.karma}`, type: 'danger' });
    }

    // 카오틱 처치 시 보너스 보상
    let goldReward = 50;
    let expReward = 30;
    if (target.karma >= KARMA.CHAOTIC_THRESHOLD) {
        goldReward = Math.floor(goldReward * KARMA.BOUNTY_BONUS);
        expReward = Math.floor(expReward * KARMA.BOUNTY_BONUS);
    }

    realKiller.gold = Math.min(999999999, realKiller.gold + goldReward);
    giveExp(realKiller, expReward);

    // 왕의 5% 병사 탈취
    let stolen = false;
    if (realKiller.isKing && Math.random() < 0.05) {
        stolen = true;
        createBot(target, realKiller.team, realKiller.id);
    }

    // ── 카오틱 사망 페널티 ──
    if (target.karma >= KARMA.CHAOTIC_THRESHOLD) {
        const goldLoss = Math.floor(target.gold * KARMA.DEATH_GOLD_LOSS);
        const expLoss = Math.floor(target.exp * KARMA.DEATH_EXP_LOSS);
        target.gold = Math.max(0, target.gold - goldLoss);
        target.exp = Math.max(0, target.exp - expLoss);

        io.emit('chaotic_death_penalty', {
            playerId: targetId,
            goldLoss,
            expLoss,
            karma: target.karma
        });
    }

    // 사망 패널티 (알비온 스타일 — 약탈)
    const expLoss = Math.floor(getExpRequired(target.level) * 0.1);
    target.exp = Math.max(0, (target.exp || 0) - expLoss);

    // 인벤토리 아이템 30% 드롭 (약탈 가능)
    if (target.inventory && !target.isBot) {
        const droppedItems = [];
        for (const [itemId, qty] of Object.entries(target.inventory)) {
            const dropQty = Math.floor(qty * 0.3);
            if (dropQty > 0) {
                target.inventory[itemId] -= dropQty;
                if (target.inventory[itemId] <= 0) delete target.inventory[itemId];
                // 킬러에게 전달
                if (!realKiller.inventory) realKiller.inventory = {};
                realKiller.inventory[itemId] = (realKiller.inventory[itemId] || 0) + dropQty;
                droppedItems.push(itemId + ' x' + dropQty);
            }
        }
        if (droppedItems.length > 0) {
            io.emit('server_msg', { msg: `${realKiller.displayName}이(가) ${target.displayName}에게서 아이템 약탈!`, type: 'danger' });
        }
    }

    // 골드 50% 약탈
    if (!target.isBot && target.gold > 0) {
        const goldDrop = Math.floor(target.gold * 0.5);
        target.gold -= goldDrop;
        realKiller.gold = Math.min(999999999, realKiller.gold + goldDrop);
        io.to(realKiller.id).emit('combat_log', { msg: `${goldDrop}G 약탈!` });
    }

    if (target.karma >= KARMA.CHAOTIC_THRESHOLD) {
        target.level = Math.max(1, target.level - 1);
        target.exp = 0;
    }
    target.killCount = 0;
    target.team = 'peace';
    target.isKing = false;
    target.targetId = null;

    // 군대 소멸
    for (const bId of Object.keys(players)) {
        if (players[bId] && players[bId].isBot && players[bId].ownerId === targetId) {
            players[bId].isAlive = false;
            io.emit('player_die', { victimId: bId, attackerId, stolen: false });
            delete players[bId];
        }
    }

    savePlayer(target);
    savePlayer(realKiller);

    io.emit('player_update', target);
    io.emit('player_update', realKiller);
    io.emit('player_die', {
        victimId: targetId, attackerId, stolen, isPK,
        killerName: realKiller.displayName || '몬스터',
        killerClass: realKiller.className || '',
        killerLevel: realKiller.level || 0,
        victimLevel: target.level || 0,
        goldLost: Math.floor((target._deathGoldLost || 0)),
    });

    // ── 3초 후 자동 마을 리스폰 (실제 플레이어만) ──
    if (!target.isBot) {
        setTimeout(() => {
            const p = players[targetId];
            if (!p || p.isAlive) return; // 이미 부활했거나 접속 종료
            recalcStats(p);
            p.hp = p.maxHp;
            p.isAlive = true;
            // 시작 마을(아덴)로 이동
            const startZone = ZONES.aden;
            p.x = startZone.x + startZone.w / 2 + (Math.random() * 10 - 5);
            p.y = startZone.y + startZone.h / 2 + (Math.random() * 10 - 5);
            p.team = 'peace';
            savePlayer(p);
            io.emit('player_respawn', p);
            io.to(targetId).emit('combat_log', { msg: '마을에서 부활했습니다.' });
        }, 3000);
    }
}


module.exports = {
    init,
    expireMarketListings, destroyAxe, syncGameState,
    updatePassives, updatePlayerAutoSkills,
    updateBots, giveExp,
    handleCollisions, handleAoeDamage, handlePlayerDeath,
};
