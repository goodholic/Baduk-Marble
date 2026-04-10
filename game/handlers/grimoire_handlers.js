// 금지된 마법서 소켓 핸들러 — v2.39

function registerGrimoireHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, forbiddenGrimoire, applyBuff } = ctx;

    // 상태 조회
    socket.on('grimoire_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('grimoire_status', forbiddenGrimoire.getStatus(p));
    });

    // 해독 시작
    socket.on('grimoire_decipher', (grimoireId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof grimoireId !== 'string') return;
        const result = forbiddenGrimoire.startDecipher(p, grimoireId);
        if (result.success) savePlayer(p);
        socket.emit('grimoire_result', result);
    });

    // 해독 완료 확인
    socket.on('grimoire_check_decipher', (grimoireId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof grimoireId !== 'string') return;
        const result = forbiddenGrimoire.checkDecipher(p, grimoireId);
        if (result.completed) {
            if (result.failed && result.curse) {
                // 해독 실패 — 저주 적용
                const c = result.curse;
                if (c.effect.mpDrain) p.mp = 0;
                if (c.effect.expLoss) p.exp = Math.max(0, (p.exp || 0) - c.effect.expLoss);
                if (c.effect.hpLossPct) p.hp = Math.max(1, Math.floor(p.hp * (1 - c.effect.hpLossPct)));
                if (c.effect.goldLoss) p.gold = Math.max(0, p.gold - c.effect.goldLoss);
                if (c.effect.atkReduce && applyBuff) {
                    applyBuff(p, 'grimoire_curse', { atkMulti: 1 - c.effect.atkReduce }, c.effect.duration * 1000);
                }
                io.emit('server_msg', { msg: `[금서] ${p.displayName} 해독 실패! ${c.name}에 걸렸다...`, type: 'danger' });
            } else {
                io.emit('server_msg', { msg: `[금서] ${p.displayName}: ${result.grimoire.icon} ${result.grimoire.name} 해독 성공!`, type: 'legendary' });
            }
            savePlayer(p);
        }
        socket.emit('grimoire_decipher_result', result);
    });

    // 마법 시전
    socket.on('grimoire_cast', (grimoireId) => {
        const p = players[playerId]; if (!p || !p.isAlive) return;
        if (typeof grimoireId !== 'string') return;
        const result = forbiddenGrimoire.castGrimoire(p, grimoireId);
        if (!result.success) {
            socket.emit('grimoire_result', result);
            return;
        }

        const eff = result.effect;
        const cost = result.cost;

        // ── 효과 적용 ──
        if (eff.type === 'selfBuff') {
            if (applyBuff) {
                const buffData = {};
                if (eff.atkMulti) buffData.atkMulti = eff.atkMulti;
                if (eff.spdMulti) buffData.spdMulti = eff.spdMulti;
                if (eff.dodgeBonus) buffData.dodgeBonus = eff.dodgeBonus;
                applyBuff(p, 'grimoire_' + grimoireId, buffData, eff.duration * 1000);
            }
        }

        // 대가 디버프 적용
        if (cost.defDebuff && applyBuff) {
            applyBuff(p, 'grimoire_def_debuff', { defMulti: 1 - cost.defDebuff.value }, cost.defDebuff.duration * 1000);
        }
        if (cost.spdDebuff && applyBuff) {
            applyBuff(p, 'grimoire_spd_debuff', { spdMulti: 1 - cost.spdDebuff.value }, cost.spdDebuff.duration * 1000);
        }
        if (cost.selfStun) {
            p._grimoireStun = Date.now() + cost.selfStun * 1000;
        }
        if (cost.curse && applyBuff) {
            const curseData = {};
            if (cost.curse.atkReduce) curseData.atkMulti = 1 - cost.curse.atkReduce;
            if (cost.curse.defReduce) curseData.defMulti = 1 - cost.curse.defReduce;
            applyBuff(p, 'grimoire_curse_' + grimoireId, curseData, cost.curse.duration * 1000);
        }

        savePlayer(p);

        // 서버 공지
        const g = result.grimoire;
        io.emit('server_msg', { msg: `⚠️ ${p.displayName}이(가) 금서 [${g.name}]을 시전했다!`, type: 'legendary' });
        io.emit('grimoire_cast_fx', { playerId, grimoireId, effect: eff, x: p.x, y: p.y, color: _getElementColor(g.element) });

        socket.emit('grimoire_cast_result', result);
        io.emit('player_update', p);
    });
}

function _getElementColor(element) {
    const colors = { dark: '#8844aa', fire: '#ff4400', ice: '#44ccff', wind: '#44ff88', arcane: '#ff88ff', void: '#6622cc', holy: '#ffd700' };
    return colors[element] || '#ffffff';
}

module.exports = { registerGrimoireHandlers };
