// 모험자 길드 소켓 핸들러 — v2.36

function registerAdvGuildHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, advGuild } = ctx;

    socket.on('adv_guild_status', () => {
        const p = players[playerId]; if (!p) return;
        socket.emit('adv_guild_status', advGuild.getStatus(p));
    });

    socket.on('adv_guild_create', (name) => {
        const p = players[playerId]; if (!p) return;
        if (typeof name !== 'string') return;
        const result = advGuild.createGuild(p, name.trim());
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[모험자 길드] ${p.displayName}이(가) ⚔️ [${name}] 길드 창설!`, type: 'rare' });
            io.emit('player_update', p);
        }
        socket.emit('adv_guild_result', result);
    });

    socket.on('adv_guild_join', (guildId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof guildId !== 'string') return;
        const result = advGuild.joinGuild(p, guildId);
        if (result.success) {
            savePlayer(p);
            io.emit('server_msg', { msg: `[길드] ${p.displayName} → [${result.guild.name}] 가입!`, type: 'normal' });
        }
        socket.emit('adv_guild_result', result);
    });

    socket.on('adv_guild_donate', (amount) => {
        const p = players[playerId]; if (!p) return;
        const amt = Math.floor(Number(amount));
        if (!Number.isFinite(amt) || amt <= 0) return;
        const result = advGuild.donate(p, amt);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            if (result.leveledUp) {
                io.emit('server_msg', { msg: `[길드 레벨업!] Lv.${result.guildLevel}!`, type: 'rare' });
            }
        }
        socket.emit('adv_guild_result', result);
    });

    socket.on('adv_guild_shop', (itemId) => {
        const p = players[playerId]; if (!p) return;
        if (typeof itemId !== 'string') return;
        const result = advGuild.buyFromShop(p, itemId);
        if (result.success) savePlayer(p);
        socket.emit('adv_guild_result', result);
    });
}

module.exports = { registerAdvGuildHandlers };
