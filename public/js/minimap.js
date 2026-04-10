// Minimap (extracted from index.html)

    function mapToMinimap(x, y) {
      return {
        mx: ((x - MAP_MIN) / (MAP_MAX - MAP_MIN)) * MAP_SIZE,
        my: MAP_SIZE - ((y - MAP_MIN) / (MAP_MAX - MAP_MIN)) * MAP_SIZE  // Y축 뒤집기 (위=북)
      };
    }

    function drawMinimap() {
      var ctx = minimapCtx;
      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

      // 배경
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      // 지형 장벽 (산맥/바다/용암)
      var barrierColors = {mountain:'#4a3a2a',water:'#1a2a4a',lava:'#5a1a0a',ice:'#4a5a6a',chaos:'#3a0a3a',forest_wall:'#1a3a1a',swamp_wall:'#2a3a1a'};
      (window._barriers||[]).forEach(function(b) {
        var tl = mapToMinimap(b.x, b.y);
        var br = mapToMinimap(b.x + b.w, b.y + b.h);
        ctx.fillStyle = barrierColors[b.type] || '#333';
        ctx.fillRect(tl.mx, tl.my, br.mx - tl.mx, br.my - tl.my);
      });

      // 도로 (안전 통로 — 금색 점선)
      ctx.strokeStyle = 'rgba(255,215,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3,3]);
      (window._roads||[]).forEach(function(r) {
        if (r.path.length < 2) return;
        ctx.beginPath();
        var start = mapToMinimap(r.path[0].x, r.path[0].y);
        ctx.moveTo(start.mx, start.my);
        for (var i = 1; i < r.path.length; i++) {
          var pt = mapToMinimap(r.path[i].x, r.path[i].y);
          ctx.lineTo(pt.mx, pt.my);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 존 영역
      Object.values(zones).forEach(z => {
        var tl = mapToMinimap(z.x, z.y);
        var br = mapToMinimap(z.x + z.w, z.y + z.h);
        ctx.fillStyle = z.color;
        ctx.fillRect(tl.mx, tl.my, br.mx - tl.mx, br.my - tl.my);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tl.mx, tl.my, br.mx - tl.mx, br.my - tl.my);
        // 존 이름
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(z.name, (tl.mx + br.mx) / 2, (tl.my + br.my) / 2 + 3);
        ctx.textAlign = 'left';
      });

      // 몬스터 (작은 점, 등급별 색상)
      var tierColors = { normal:'#ff4444', elite:'#ffaa44', rare:'#aa44ff', boss:'#ff0044', legendary:'#ff8800', mythic:'#ff00ff', worldboss:'#ff0000' };
      Object.values(lastSyncMonsters).forEach(m => {
        if (!m || m.x == null || m.y == null) return;
        var p = mapToMinimap(m.x, m.y);
        var c = tierColors[m.tier] || '#ff4444';
        // 일반 몬스터 작게, 보스급 크게
        if (m.tier === 'boss' || m.tier === 'legendary' || m.tier === 'mythic' || m.tier === 'worldboss') {
          // 펄스 효과 (시간 기반)
          var pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(p.mx, p.my, 4 * pulse, 0, Math.PI * 2);
          ctx.fill();
          // 외곽 링
          ctx.strokeStyle = c;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.mx, p.my, 6, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = c;
          ctx.fillRect(p.mx - 1, p.my - 1, 2, 2);
        }
      });

      // 플레이어
      var myZone = '';
      Object.entries(lastSyncPlayers).forEach(([pid, pl]) => {
        var p = mapToMinimap(pl.x, pl.y);
        var isMe = (pid === myPlayerId);
        if (isMe) {
          // 내 캐릭터: 큰 초록 삼각형
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.moveTo(p.mx, p.my - 5);
          ctx.lineTo(p.mx - 4, p.my + 3);
          ctx.lineTo(p.mx + 4, p.my + 3);
          ctx.closePath();
          ctx.fill();
          // 시야 원
          ctx.strokeStyle = 'rgba(0,255,0,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.mx, p.my, 15, 0, Math.PI * 2);
          ctx.stroke();
          myZone = pl.zone || '';
        } else {
          // 친구 우선 — 노란 별, 그 외 흰 점
          var isFriend = window._friendIds && window._friendIds.has(pid);
          if (isFriend) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(p.mx, p.my, 3, 0, Math.PI * 2);
            ctx.fill();
            // 외곽 링
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.mx, p.my, 5, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p.mx - 2, p.my - 2, 4, 4);
          }
        }
      });

      // 동서남북 표시
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', MAP_SIZE/2, 10);
      ctx.fillText('S', MAP_SIZE/2, MAP_SIZE-3);
      ctx.textAlign = 'left';
      ctx.fillText('W', 3, MAP_SIZE/2+3);
      ctx.textAlign = 'right';
      ctx.fillText('E', MAP_SIZE-3, MAP_SIZE/2+3);
      ctx.textAlign = 'left';

      // 존 이름 + 좌표 표시
      if (myZone && zones[myZone]) {
        minimapZoneLabel.textContent = zones[myZone].name;
      }
      var me = lastSyncPlayers[myPlayerId];
      if (me) {
        var coordEl = document.getElementById('minimap-coords');
        if (coordEl) coordEl.textContent = Math.floor(me.x) + ', ' + Math.floor(me.y);
      }
    }

    // sync에서 미니맵 데이터 수집
    function updateMinimapData(data) {
      if (data.players) lastSyncPlayers = data.players;
      if (data.monsters) {
        for (var mId in data.monsters) {
          lastSyncMonsters[mId] = data.monsters[mId];
        }
      }
      if (data.removedMonsters) {
        for (var i = 0; i < data.removedMonsters.length; i++) {
          delete lastSyncMonsters[data.removedMonsters[i]];
        }
      }
      drawMinimap();
    }

    // ── 사운드 시스템 (Web Audio API) ──
    var audioCtx = null;
    var soundEnabled = true;
    var bgmPlaying = false;
    // 볼륨 설정 (localStorage 영속화)
    try {
      var _savedAudio = JSON.parse(localStorage.getItem('ab_audio') || '{}');
      window._bgmVol = typeof _savedAudio.bgm === 'number' ? _savedAudio.bgm : 1;
      window._sfxVol = typeof _savedAudio.sfx === 'number' ? _savedAudio.sfx : 1;
      if (_savedAudio.muted === true) soundEnabled = false;
    } catch(e) { window._bgmVol = 1; window._sfxVol = 1; }

