// 종합 랭킹 소켓 핸들러 — v1.87
function registerLeaderboardHandlers(socket, ctx) {
  const { players, playerId, leaderboard } = ctx;

  socket.on('leaderboard_status', (data) => {
    const categoryId = data && data.category;
    const result = leaderboard.getLeaderboard(players, categoryId);
    socket.emit('leaderboard_status_result', { categoryId, data: result });
  });

  socket.on('leaderboard_my_rank', (categoryId) => {
    const result = leaderboard.getMyRank(players, playerId, categoryId);
    socket.emit('leaderboard_my_rank_result', { categoryId, ...result });
  });
}

module.exports = { registerLeaderboardHandlers };
