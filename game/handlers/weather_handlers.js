// 기상 소켓 핸들러 — v1.94
function registerWeatherHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, weather } = ctx;

  socket.on('weather_status', () => {
    const p = players[playerId];
    socket.emit('weather_status_result', weather.getStatus(p || {}));
  });

  socket.on('weather_current', () => {
    socket.emit('weather_current_result', weather.getCurrent());
  });

  socket.on('weather_forecast', (hours) => {
    socket.emit('weather_forecast_result', weather.getForecast(Number(hours) || 24));
  });

  socket.on('weather_witness', () => {
    const p = players[playerId]; if (!p) return;
    const result = weather.witness(p);
    if (result.success) { savePlayer(p); io.emit('player_update', p); }
    if (result.completed && !p.weatherSagePosted) {
      p.weatherSagePosted = true;
      io.emit('server_msg', {
        msg: `🌦️ ${p.displayName}이(가) 모든 날씨를 기록 — 기상 현자!`,
        type: 'rare',
      });
    }
    socket.emit('weather_result', result);
  });
}

module.exports = { registerWeatherHandlers };
