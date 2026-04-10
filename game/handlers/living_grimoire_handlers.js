// 살아있는 마도서 소켓 핸들러 — v2.54
function registerLivingGrimoireHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, livingGrimoire } = ctx;
    socket.on('lgrim_status', () => { const p = players[playerId]; if (!p) return; socket.emit('lgrim_status', livingGrimoire.getStatus(p)); });
    socket.on('lgrim_bind', (id) => { const p = players[playerId]; if (!p) return; if (typeof id !== 'string') return; const r = livingGrimoire.bindGrimoire(p, id); if (r.success) { savePlayer(p); io.emit('server_msg', { msg: `[마도서] ${p.displayName}: ${r.grimoire.icon} ${r.grimoire.name} 계약!`, type: 'rare' }); } socket.emit('lgrim_result', r); });
    socket.on('lgrim_switch', (id) => { const p = players[playerId]; if (!p) return; if (typeof id !== 'string') return; const r = livingGrimoire.switchGrimoire(p, id); if (r.success) savePlayer(p); socket.emit('lgrim_result', r); });
    socket.on('lgrim_talk', (ctx2) => { const p = players[playerId]; if (!p) return; const r = livingGrimoire.talkToGrimoire(p, ctx2 || 'idle'); if (r.success) savePlayer(p); socket.emit('lgrim_result', r); });
    socket.on('lgrim_cast', () => { const p = players[playerId]; if (!p) return; const r = livingGrimoire.castGrimoireSpell(p); if (r.success) savePlayer(p); socket.emit('lgrim_result', r); });
}
module.exports = { registerLivingGrimoireHandlers };
