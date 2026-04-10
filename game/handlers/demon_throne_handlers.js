// 마왕의 옥좌 소켓 핸들러 — v2.52
function registerDemonThroneHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, demonThrone } = ctx;
    socket.on('throne_status', () => { const p = players[playerId]; if (!p) return; socket.emit('throne_status', demonThrone.getStatus(p)); });
    socket.on('throne_claim', () => { const p = players[playerId]; if (!p) return; const r = demonThrone.claimThrone(p); if (r.success) { savePlayer(p); io.emit('server_msg', { msg: `[마왕 즉위] ${p.displayName}이(가) 암흑의 옥좌에 올랐다!`, type: 'legendary' }); } socket.emit('throne_result', r); });
    socket.on('throne_skill', (skillId) => { const p = players[playerId]; if (!p) return; if (typeof skillId !== 'string') return; const r = demonThrone.learnSkill(p, skillId); if (r.success) savePlayer(p); socket.emit('throne_result', r); });
    socket.on('throne_hire', (type) => { const p = players[playerId]; if (!p) return; if (typeof type !== 'string') return; const r = demonThrone.hireMinion(p, type); if (r.success) savePlayer(p); socket.emit('throne_result', r); });
    socket.on('throne_defend', () => { const p = players[playerId]; if (!p) return; const r = demonThrone.defendThrone(p); if (r.success) { savePlayer(p); if (r.type === 'dethroned') io.emit('server_msg', { msg: `[마왕 퇴위] ${p.displayName}의 옥좌가 무너졌다!`, type: 'legendary' }); } socket.emit('throne_result', r); });
    socket.on('throne_reward', () => { const p = players[playerId]; if (!p) return; const r = demonThrone.claimReward(p); if (r.success) savePlayer(p); socket.emit('throne_result', r); });
    socket.on('throne_repair', () => { const p = players[playerId]; if (!p) return; const r = demonThrone.repairThrone(p); if (r.success) savePlayer(p); socket.emit('throne_result', r); });
}
module.exports = { registerDemonThroneHandlers };
