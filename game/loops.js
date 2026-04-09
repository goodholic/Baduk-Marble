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
                    seller.gold += Math.floor(winBid.amount * (1 - MARKET_FEE));
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
        for (const skill of classSkills) {
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
        io.emit('level_up', { id: target.id, level: target.level, className: target.displayName, statPoints: target.statPoints, maxHp: target.maxHp, atk: target.atk, def: target.def, maxExp: getExpRequired(target.level) });
        trackQuest(target, 'reach_level', 0);

        // Lv.20 전직 알림
        if (target.level === 20 && !target.isAdvanced) {
            io.to(target.id).emit('server_msg', { msg: '전직이 가능합니다! 메뉴에서 전직하세요.', type: 'rare' });
        }
        savePlayer(target);
    }
    io.emit('player_update', target);
}


module.exports = {
    init,
    expireMarketListings, destroyAxe, syncGameState,
    updatePassives, updatePlayerAutoSkills,
    updateBots, giveExp,
};
