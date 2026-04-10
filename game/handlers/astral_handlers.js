// 영체 이탈 소켓 핸들러 — v2.41

function registerAstralHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, astralProjection } = ctx;

    socket.on('astral_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('astral_status', astralProjection.getStatus(p));
    });

    socket.on('astral_project', (realmId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof realmId !== 'string') return;
        const result = astralProjection.startProjection(p, realmId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영체 이탈] ${p.displayName}의 영혼이 육체를 떠났다... ${result.realm.icon}`, type: 'normal' });
        }
        socket.emit('astral_result', result);
    });

    socket.on('astral_explore', () => {
        const p = players[playerId]; if (!p) return;
        const result = astralProjection.exploreAstral(p);
        if (result.success) {
            savePlayer(p);
            if (result.type === 'treasure') {
                io.emit('server_msg', { msg: `[영계] ${p.displayName}: ${result.item.icon} ${result.item.name} 발견!`, type: 'normal' });
            }
        }
        socket.emit('astral_result', result);
    });

    socket.on('astral_npc', (npcId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof npcId !== 'string') return;
        const result = astralProjection.interactNpc(p, npcId);
        if (result.success) savePlayer(p);
        socket.emit('astral_result', result);
    });

    socket.on('astral_buy', ({ npcId, itemId }) => {
        const p = players[playerId]; if (!p) return;
        if (typeof npcId !== 'string' || typeof itemId !== 'string') return;
        const result = astralProjection.buyFromNpc(p, npcId, itemId);
        if (result.success) savePlayer(p);
        socket.emit('astral_result', result);
    });

    socket.on('astral_gift', () => {
        const p = players[playerId]; if (!p) return;
        const result = astralProjection.receiveGift(p);
        if (result.success) savePlayer(p);
        socket.emit('astral_result', result);
    });

    socket.on('astral_return', () => {
        const p = players[playerId]; if (!p) return;
        const result = astralProjection.endProjection(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영체 이탈] ${p.displayName}의 영혼이 육체로 돌아왔다.`, type: 'normal' });
        }
        socket.emit('astral_result', result);
    });

    socket.on('astral_quest_start', (questId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof questId !== 'string') return;
        const result = astralProjection.startQuest(p, questId);
        if (result.success) savePlayer(p);
        socket.emit('astral_result', result);
    });

    socket.on('astral_quest_complete', () => {
        const p = players[playerId]; if (!p) return;
        const result = astralProjection.completeQuest(p);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[영혼 퀘스트] ${p.displayName}: ${result.quest.icon} ${result.quest.name} 완료!`, type: 'rare' });
        }
        socket.emit('astral_result', result);
    });
}

module.exports = { registerAstralHandlers };
