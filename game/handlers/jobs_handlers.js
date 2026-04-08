// 부직업 소켓 핸들러 — v1.87
function registerJobsHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, MAX_GOLD, jobs } = ctx;

  socket.on('jobs_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('jobs_status_result', jobs.getStatus(p));
  });

  socket.on('jobs_claim_mission', (jobId) => {
    const p = players[playerId];
    if (!p) return;
    const result = jobs.claimMissionReward(p, jobId);
    if (result.success) {
      if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
      savePlayer(p);
      io.emit('player_update', p);
    }
    socket.emit('jobs_claim_result', result);
  });
}

module.exports = { registerJobsHandlers };
