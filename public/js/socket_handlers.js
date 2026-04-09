// Socket event handlers (extracted from index.html)

    function setupSocketListeners() {
      window.socket.on('init', (data) => {
        try {
          myPlayerId = data.id;
          if (data.barriers) window._barriers = data.barriers;
          if (data.roads) window._roads = data.roads;
          if (data.zoneConnections) window._zoneConns = data.zoneConnections;
        } catch(e) { console.warn('[init error]', e); }
      });

      // 외부 스코프 변수 초기화 (선언은 setupSocketListeners 밖, line 2778 근처)
      lastGold = 0; lastDiamonds = 0; lastZone = ''; lastKills = 0;
      gameStats = { kills:0, startTime:Date.now() };
      killStreak = 0; lastKillTime = 0;

      window.socket.on('sync', (data) => {
        if (myPlayerId && data.players && data.players[myPlayerId]) {
          var me = data.players[myPlayerId];
          window._lastSelf = me; // 개인 기록/도움말 패널에서 사용

          // 골드 변동 팝업
          if (me.gold !== undefined) {
            var goldDelta = me.gold - lastGold;
            if (lastGold > 0 && goldDelta !== 0) showCurrencyPop('gold-val', goldDelta, goldDelta > 0 ? '#ffd700' : '#ff4444');
            if (sessionStartGold === 0) sessionStartGold = me.gold;
            lastGold = me.gold;
            animateCounter('gold-val', me.gold);
          }
          if (me.diamonds !== undefined) {
            var diaDelta = me.diamonds - lastDiamonds;
            if (lastDiamonds > 0 && diaDelta > 0) showCurrencyPop('diamond-val', diaDelta, '#44aaff');
            lastDiamonds = me.diamonds;
            document.getElementById('diamond-val').textContent = me.diamonds;
          }

          // HP 바 (내부 텍스트 + 피격 플래시)
          if (me.hp !== undefined && me.maxHp) {
            var hpPct = Math.max(0, Math.min(100, me.hp / me.maxHp * 100));
            var hpFill = document.getElementById('hp-bar-fill');
            hpFill.style.width = hpPct + '%';
            // HP 색상 그라데이션
            if (hpPct > 60) hpFill.style.background = 'linear-gradient(90deg,#22aa22,#44cc44)';
            else if (hpPct > 30) hpFill.style.background = 'linear-gradient(90deg,#ccaa00,#ffdd00)';
            else hpFill.style.background = 'linear-gradient(90deg,#cc2222,#ff4444)';
            document.getElementById('hp-text').textContent = Math.ceil(me.hp) + ' / ' + me.maxHp;
            // 피격 플래시 (HP 감소 시)
            if (me.hp < (window._lastHp || me.maxHp)) {
              var hpBg = document.getElementById('hp-bar-bg');
              hpBg.style.boxShadow = '0 0 12px rgba(255,0,0,0.6)';
              setTimeout(function(){ hpBg.style.boxShadow = ''; }, 300);
            }
            window._lastHp = me.hp;
          }

          // MP 바
          if (me.mp !== undefined && me.maxMp) {
            var mpPct = Math.max(0, Math.min(100, me.mp / me.maxMp * 100));
            document.getElementById('mp-bar-fill').style.width = mpPct + '%';
            document.getElementById('mp-text').textContent = Math.ceil(me.mp) + '/' + Math.ceil(me.maxMp);
          }

          // EXP 바 (상세 — 바 내부에 수치)
          if (me.exp !== undefined && me.maxExp) {
            var expPct = Math.max(0, Math.min(100, me.exp / me.maxExp * 100));
            document.getElementById('exp-bar-fill').style.width = expPct + '%';
            document.getElementById('exp-text').textContent = Math.floor(me.exp) + ' / ' + me.maxExp;
          }

          // 레벨 표시 업데이트
          if (me.level) document.getElementById('level-display').textContent = 'Lv.' + me.level;

          // 킬 카운터
          if (me.killCount !== undefined && me.killCount > lastKills) {
            gameStats.kills = me.killCount;
            lastKills = me.killCount;
          }
        }
        if (data.playerCount !== undefined) window._lastPlayerCount = data.playerCount;
        // 미니맵 업데이트
        updateMinimapData(data);
        // 존 표시 업데이트
        if (myPlayerId && data.players && data.players[myPlayerId] && data.players[myPlayerId].zone) {
          var z = data.players[myPlayerId].zone;
          myCurrentZone = z;
          var zName = zones[z] ? zones[z].name : z;
          var isSafe = ['aden','harbor','oasis','mountain','frontier'].includes(z);
          // 존 보너스 표시
          var zoneBonus = {
            cave:'EXP+30%', ruins:'EXP+20% G+10%', volcano:'EXP+20% G+20%', graveyard:'EXP+15% G+15%',
            darkforest:'EXP+25% G+20%', dragon:'EXP+30% G+50%', abyss:'EXP+40% G+30%', hell:'EXP+50% G+40%',
            ancient:'EXP+35% G+30%', chaos:'EXP+40% G+40% [PK자유]', warzone:'EXP+30% G+30% [PK자유]',
            crystal_mine:'EXP+25% G+20%', sunken:'EXP+25% G+20%', haunted:'EXP+20% G+20%',
            magma_core:'EXP+30% G+25%', sky_ruins:'EXP+35% G+30%', shadow:'EXP+40% G+35%',
            frozen_deep:'EXP+40% G+30%', celestial:'EXP+50% G+50%', demon:'EXP+60% G+50%',
            world_tree:'EXP+70% G+60%', void_rift:'EXP+80% G+70%',
            blood_arena:'EXP+50% G+50% [PK자유]', lawless:'EXP+40% G+40% [PK자유]',
            training:'EXP+10% [안전 훈련]',
          };
          var bonus = zoneBonus[z] || '';
          var zLabel = zName + (isSafe ? ' [안전]' : '') + (bonus ? ' ' + bonus : '');
          document.getElementById('zone-display').textContent = zLabel;
          document.getElementById('zone-display').style.color = isSafe ? '#44ff44' : bonus ? '#ffd700' : '#ff6b6b';
          // 존 변경 시 풀스크린 공지
          if (z !== lastZone && lastZone !== '') {
            var za = document.getElementById('zone-announce');
            var nameColor = isSafe ? '#44ff44' : z.includes('chaos')||z.includes('warzone')||z.includes('blood')||z.includes('lawless') ? '#ff4444' : bonus ? '#ffd700' : '#ff6b6b';
            za.querySelector('.zone-name').textContent = zName;
            za.querySelector('.zone-name').style.color = nameColor;
            za.querySelector('.zone-info').textContent = (bonus || (isSafe ? '안전 지대' : ''));
            za.classList.remove('show');
            void za.offsetWidth; // reflow
            za.classList.add('show');
            setTimeout(function(){ za.classList.remove('show'); }, 2500);
          }
          lastZone = z;
          // 마을 진입 시 NPC 안내
          var townNpc = document.getElementById('town-npc');
          if (isSafe && townNpc) {
            townNpc.style.display = 'block';
            townNpc.textContent = '🏘 ' + zName + ' — 상점/대장장이/힐러 이용 가능';
          } else if (townNpc) {
            townNpc.style.display = 'none';
          }
        }
        // 낮/밤 적용
        if (data.isNight !== undefined) {
          document.getElementById('unity-container').style.filter = data.isNight ? 'brightness(0.6) saturate(0.7)' : 'none';
        }
        // 월드 시간 표시 (day/night clock)
        if (data.worldTime !== undefined) {
          var clockEl = document.getElementById('world-clock');
          if (clockEl) {
            var DAY_CYCLE = 600; // 10분 = 1일
            var pct = (data.worldTime % DAY_CYCLE) / DAY_CYCLE;
            var icon = data.isNight ? '🌙' : (pct < 0.25 ? '🌅' : pct < 0.5 ? '☀️' : '🌇');
            var phaseLabel = data.isNight ? '밤' : '낮';
            var remainSec = data.isNight ? Math.floor((DAY_CYCLE - data.worldTime % DAY_CYCLE)) : Math.floor(DAY_CYCLE/2 - data.worldTime % (DAY_CYCLE/2));
            if (remainSec < 0) remainSec = 0;
            clockEl.innerHTML = icon + ' ' + phaseLabel + ' <span style="color:#888;font-size:9px">(' + Math.floor(remainSec/60) + ':' + (remainSec%60 < 10 ? '0':'') + (remainSec%60) + ')</span>';
            clockEl.style.color = data.isNight ? '#88aaff' : '#ffd700';
            clockEl.style.display = 'inline-flex';
          }
        }
      });

      // 플레이어 업데이트 (레벨/팀/HP)
      window.socket.on('player_update', (d) => {
        if (d.id === myPlayerId || (!myPlayerId && d.level)) {
          if (d.level) document.getElementById('level-display').textContent = 'Lv.' + d.level + ' ' + (d.displayName||d.className||'');
          if (d.hp !== undefined && d.maxHp) {
            var hpEl = document.getElementById('hp-text');
            if (hpEl) hpEl.textContent = Math.ceil(d.hp)+' / '+Math.ceil(d.maxHp);
            var pct = Math.max(0, Math.min(100, (d.hp/d.maxHp)*100));
            var hpFillEl = document.getElementById('hp-bar-fill');
            hpFillEl.style.width = pct+'%';
            // 위험 시 빨간 펄스 (HP < 30%)
            if (pct < 30) {
              hpFillEl.style.animation = 'hpDangerPulse 0.6s ease-in-out infinite';
              hpFillEl.style.background = 'linear-gradient(90deg,#ff0000,#ff6644)';
            } else {
              hpFillEl.style.animation = '';
              hpFillEl.style.background = 'linear-gradient(90deg,#cc2222,#44cc44)';
            }
          }
          if (d.team) {
            var teamEl = document.getElementById('team-display');
            if (d.team === 'peace') { teamEl.textContent = '평화 모드'; teamEl.style.color = '#88ff88'; document.getElementById('pvp-btn').textContent='PvP 선언'; }
            else if (d.team.startsWith('king_')) { teamEl.textContent = '👑 왕'; teamEl.style.color = '#ffd700'; document.getElementById('pvp-btn').textContent='평화 복귀'; }
            else { teamEl.textContent = 'PvP'; teamEl.style.color = '#ff6b6b'; document.getElementById('pvp-btn').textContent='평화 복귀'; }
          }
          if (d.karma >= 200) document.getElementById('team-display').textContent += ' [카오틱]';
        }
      });
      window.socket.on('shop_result', (d) => { showToast(d.msg); playSFX('buy'); });
      window.socket.on('market_result', (d) => { showToast(d.msg); playSFX('buy'); });
      window.socket.on('daily_result', (d) => { showToast(d.msg); playSFX('gold'); if(d.diamonds) document.getElementById('diamond-val').textContent=d.diamonds; });
      window.socket.on('online_players', (d) => {
        var html = '<p class="text-gold" style="text-align:center">현재 접속자: <b>' + d.count + '명</b> (상위 30명 표시)</p>';
        html += '<div style="max-height:55vh;overflow-y:auto;margin-top:10px"><table style="width:100%;font-size:12px;color:#ddd;border-collapse:collapse">';
        html += '<thead><tr style="border-bottom:1px solid #444;color:#888"><th style="text-align:left;padding:4px">#</th><th style="text-align:left;padding:4px">이름</th><th style="text-align:left;padding:4px">Lv</th><th style="text-align:left;padding:4px">클래스</th><th style="text-align:left;padding:4px">위치</th></tr></thead><tbody>';
        d.players.forEach(function(p, i) {
          var karmaBadge = p.karma >= 200 ? ' <span style="color:#ff4444">[PK]</span>' : '';
          var clanBadge = p.clan ? ' <span style="color:#aa44ff">[' + p.clan + ']</span>' : '';
          html += '<tr style="border-bottom:1px solid #222"><td style="padding:4px;color:#ffd700">' + (i+1) + '</td><td style="padding:4px">' + escapeHtml(p.name) + karmaBadge + clanBadge + '</td><td style="padding:4px;color:#88ccff">' + p.level + '</td><td style="padding:4px">' + p.className + '</td><td style="padding:4px;color:#aaa">' + p.zone + '</td></tr>';
        });
        html += '</tbody></table></div>';
        showModal('👥 온라인 플레이어', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });

      window.socket.on('mail_delivered', (d) => {
        showToast(d.msg);
        playSFX('gold');
        if (typeof showModal === 'function' && d.count > 0) {
          var html = '<p class="text-gold" style="text-align:center;font-size:14px">📬 ' + d.count + '건의 우편이 배달되었습니다!</p>';
          if (d.gold > 0) html += '<p style="text-align:center;color:#ffd700;margin:8px 0">💰 +' + d.gold + 'G</p>';
          if (d.items && d.items.length > 0) html += '<p style="text-align:center;color:#88ccff">📦 ' + d.items.join(', ') + '</p>';
          showModal('우편 도착', html, [{label:'확인', action:'closeModal()'}]);
        }
      });

      window.socket.on('clan_storage_data', (d) => {
        if (!d.success) { showToast(d.msg); return; }
        var gradeColors = {normal:'#ccc',uncommon:'#44cc44',rare:'#4488ff',epic:'#aa44ff',legendary:'#ff8800'};
        var html = '<p class="text-gold" style="text-align:center">📦 ' + d.clanName + ' 창고</p>';
        var items = d.items || {};
        var keys = Object.keys(items);
        if (keys.length === 0) {
          html += '<p style="text-align:center;color:#666;margin:20px 0">창고가 비어있습니다</p>';
        } else {
          html += '<div style="max-height:40vh;overflow-y:auto;margin:8px 0">';
          keys.forEach(function(k) {
            var it = items[k];
            var color = gradeColors[it.grade] || '#ccc';
            html += '<div class="panel-item" style="border-left:3px solid '+color+'">' +
              '<span class="name" style="color:'+color+'">'+it.name+' <b style="color:#888">x'+it.count+'</b></span>' +
              '<button onclick="window.socket.emit(\'clan_storage_withdraw\',{itemId:\''+k+'\',count:1});setTimeout(function(){window.socket.emit(\'get_clan_storage\');},200)" style="background:#2a4a2a;font-size:10px">꺼내기</button>' +
              '</div>';
          });
          html += '</div>';
        }
        html += '<div style="border-top:1px solid #444;padding-top:8px;margin-top:8px">' +
          '<p class="text-muted text-sm" style="text-align:center">내 인벤토리에서 보관</p>' +
          '<input id="clan-deposit-id" placeholder="아이템 ID (예: mat_dragon)" style="width:100%;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:4px 0;font-size:11px">' +
          '<input id="clan-deposit-cnt" type="number" value="1" min="1" placeholder="수량" style="width:100%;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:4px 0;font-size:11px">' +
          '</div>';
        showModal('🏛️ 혈맹 창고', html, [
          {label:'보관!', action:"window.socket.emit('clan_storage_deposit',{itemId:getModalInput('clan-deposit-id'),count:parseInt(getModalInput('clan-deposit-cnt'))||1});setTimeout(function(){window.socket.emit('get_clan_storage');},200);"},
          {label:'새로고침', action:"window.socket.emit('get_clan_storage');closeModal();"},
          {label:'닫기', type:'cancel', action:'closeModal()'}
        ]);
      });

      window.socket.on('auto_skill_status', (d) => {
        var btn = document.getElementById('btn-skill');
        if (btn) {
          btn.textContent = 'AutoSkill ' + (d.enabled ? 'ON' : 'OFF');
          btn.style.color = d.enabled ? '#ffd700' : '';
        }
      });

      window.socket.on('potion_result', (d) => {
        if (!d.success) { showToast(d.msg); return; }
        showToast('💊 ' + d.msg);
        playSFX('heal');
      });

      window.socket.on('lucky_spin_result', (d) => {
        if (!d.success) { showToast(d.msg); return; }
        showToast('🎰 ' + d.msg);
        playSFX(d.tier === 'legend' || d.tier === 'epic' ? 'levelup' : 'gold');
      });
      window.spinLuckyRoulette = function() { window.socket.emit('lucky_spin'); };

      // 도박 도전 수신 (라운드8 신규: offer/accept 패턴)
      window.socket.on('dice_incoming', (d) => {
        showToast('🎲 ' + escapeHtml(d.fromName) + '님이 ' + d.bet + 'G 도박 신청! 30초 내 수락');
        playSFX('hit');
        if (typeof showModal === 'function') {
          showModal('주사위 도박 신청', '<p>'+escapeHtml(d.fromName)+'님이 '+d.bet+'G 판돈으로 도박을 신청했습니다.</p>',
            [
              { label:'수락', action:"window.socket.emit('dice_accept','"+d.fromId+"');closeModal();" },
              { label:'거절', action:"closeModal();" }
            ]);
        }
      });

      // 용병 판매 제안 수신 (라운드4 신규)
      window.socket.on('unit_offer', (d) => {
        showToast('🪙 ' + d.sellerName + '님이 용병('+d.unitClass+')을 ' + d.price + 'G에 판매 제안! 60초 내 수락');
        playSFX('buy');
        if (typeof showModal === 'function') {
          showModal('용병 구매 제안', '<p>'+escapeHtml(d.sellerName)+'님이 '+escapeHtml(d.unitClass)+' 용병을 '+d.price+'G에 판매합니다.</p>',
            [
              { label:'구매', action:"window.socket.emit('unit_buy_accept','"+d.unitId+"');closeModal();" },
              { label:'거절', action:"closeModal();" }
            ]);
        }
      });
      window.socket.on('quest_result', (d) => { showToast(d.msg); playSFX('levelup'); });
      window.socket.on('unit_result', (d) => showToast(d.msg));
      window.socket.on('equip_result', (d) => { showToast(d.msg); playSFX('buy'); });
      window.socket.on('player_hit', (d) => {
        playSFX(d.isCrit ? 'crit' : 'hit');
        if (d.skillName) addCombatLog(d.skillName + '! ' + d.damage + ' 데미지', 'log-crit');
        showFloatingDamage(d.damage, d.isCrit, d.skillName);
        // DPS 샘플 기록
        dpsSamples.push({ time: Date.now(), damage: d.damage || 0 });
        // 크리 화면 플래시
        if (d.isCrit) showCritFlash();
      });
      window.socket.on('monster_hit', (d) => {
        showFloatingDamage(d.damage, false, null);
        dpsSamples.push({ time: Date.now(), damage: d.damage || 0 });
      });
      // 회피 이벤트
      window.socket.on('dodge_event', (d) => {
        showDodgePopup();
        playSFX('buff');
      });
      // 가이드 메시지 (온보딩)
      window.socket.on('guide_msg', (d) => {
        showModal('가이드', '<p style="color:#88ccff;font-size:14px;line-height:1.6">' + d.msg + '</p>' +
          (d.target ? '<p style="color:#ffd700;font-size:12px;margin-top:8px">미니맵에서 <b>' + d.target + '</b>을 찾아보세요!</p>' : ''),
          [{label:'알겠습니다!', action:'closeModal()'}]);
        playSFX('buff');
      });
      // 퀘스트 진행도 알림
      window.socket.on('quest_progress', (d) => {
        var nmText = document.getElementById('nm-text');
        var nmFill = document.getElementById('nm-fill');
        if (nmText) nmText.textContent = d.name + ': ' + d.current + '/' + d.goal + ' (' + d.remaining + '남음)';
        if (nmFill) nmFill.style.width = Math.floor(d.current / d.goal * 100) + '%';
      });
      window.socket.on('skill_effect', (d) => {
        const skillMsgs = {
          stealth: d.skillName + ' 발동! 은신 상태',
          ally_buff: d.skillName + ' 발동! 아군 버프',
          self_buff: d.skillName + ' 발동!',
          ally_invincible: d.skillName + ' 발동! 아군 무적',
          chain: d.skillName + ' 발동! 연쇄 타격',
          aoe: d.skillName + ' 발동! 광역 공격',
          single: d.skillName + ' 발동!',
        };
        addCombatLog(skillMsgs[d.type] || d.skillName + ' 발동!', 'log-crit');
        playSFX('crit');
      });
      window.socket.on('level_up', (d) => {
        if (d.id === myPlayerId) {
          playSFX('levelup'); playSFX('buff');
          var ol = document.getElementById('levelup-overlay');
          ol.querySelector('.lvl-text').textContent = 'LEVEL UP!';
          ol.querySelector('.lvl-sub').innerHTML = 'Lv.' + d.level + ' ' + d.className + '<br><small style="color:#ffd700">HP:' + d.maxHp + ' ATK:' + d.atk + ' DEF:' + d.def + ' 스탯포인트:+3</small>';
          ol.classList.add('show');
          setTimeout(function() { ol.classList.remove('show'); }, 2500);
        }
      });
      window.socket.on('player_die', (d) => {
        if(d.victimId === myPlayerId) {
          playSFX('die');
          // 킬러 이름 표시
          var deathInfo = document.getElementById('death-info');
          if (deathInfo) {
            var killerInfo = d.killerName ? '<span style="color:#ff4444;font-size:16px">'+d.killerName+'</span>' : '';
            if (d.killerClass) killerInfo += ' <span style="color:#888;font-size:11px">['+d.killerClass+' Lv.'+d.killerLevel+']</span>';
            var surviveMin = Math.floor((Date.now()-gameStats.startTime)/60000);
            var surviveSec = Math.floor(((Date.now()-gameStats.startTime)%60000)/1000);
            deathInfo.innerHTML = (killerInfo ? killerInfo + '에게 처치당함' : '사망') +
              (d.goldLost > 0 ? '<br><span style="color:#ff8800">골드 -'+d.goldLost+'G 약탈당함</span>' : '') +
              '<br><div style="margin-top:8px;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px;font-size:11px;color:#aaa">' +
              '⏱ 생존 ' + surviveMin + ':' + (surviveSec<10?'0':'') + surviveSec +
              ' | 💀 처치 ' + (gameStats.kills||0) + '마리' +
              ' | 💰 획득 ' + (lastGold - sessionStartGold) + 'G' +
              ' | 🔥 최고 스트릭 ' + (personalBests.maxStreak||0) + 'x</div>';
          }
          sessionDeaths++;
          // 자동 부활 카운트다운 (서버가 3초 후 마을에 부활시킴)
          var rs = document.getElementById('respawn-screen');
          rs.style.display = 'flex';
          var btns = rs.querySelectorAll('.class-btn');
          btns.forEach(function(b){b.style.display='none';});
          // 카운트다운 표시
          var countdownEl = document.getElementById('respawn-countdown');
          if (!countdownEl) {
            countdownEl = document.createElement('div');
            countdownEl.id = 'respawn-countdown';
            countdownEl.style.cssText = 'text-align:center;font-size:18px;color:#ffd700;margin-top:12px;font-weight:bold';
            rs.appendChild(countdownEl);
          }
          var sec = 3;
          countdownEl.textContent = '🏘 ' + sec + '초 후 마을에서 부활...';
          countdownEl.style.display = 'block';
          var cdTimer = setInterval(function() {
            sec--;
            if (sec <= 0) {
              clearInterval(cdTimer);
              countdownEl.textContent = '부활 중...';
            } else {
              countdownEl.textContent = '🏘 ' + sec + '초 후 마을에서 부활...';
            }
          }, 1000);
          // player_respawn 이벤트로 화면 닫힘 (line 1890)
          // 화면 빨간색 플래시
          document.getElementById('unity-container').style.filter = 'brightness(0.3) saturate(0) sepia(1) hue-rotate(-50deg)';
          setTimeout(function(){ document.getElementById('unity-container').style.filter = ''; }, 3000);
        }
      });
      window.socket.on('drop_spawn', () => { playSFX('gold'); });

      // 월드 보스 이벤트
      window.socket.on('world_boss_spawn', (d) => {
        showToast('[월드 보스] ' + d.name + ' 출현!');
        playSFX('levelup');
      });
      window.socket.on('world_boss_update', (d) => {
        const pct = Math.floor(d.hp / d.maxHp * 100);
        document.title = 'AutoBattle.io - 보스 HP: ' + pct + '%';
      });
      window.socket.on('world_boss_dead', (d) => {
        showToast('[월드 보스] ' + d.name + ' 처치 완료!');
        document.title = 'AutoBattle.io';
        playSFX('levelup');
      });
      // 던전 이벤트
      window.socket.on('dungeon_enter', (d) => {
        showToast(d.name + ' 입장! (' + d.stage + '/' + d.totalStages + ' 스테이지)');
        addCombatLog(d.name + ' 던전 시작! 몬스터 ' + d.monstersLeft + '마리', 'log-crit');
      });
      window.socket.on('dungeon_stage', (d) => {
        showToast('스테이지 ' + d.stage + '/' + d.totalStages + ' - 몬스터 ' + d.monstersLeft + '마리');
        playSFX('levelup');
      });
      window.socket.on('dungeon_clear', (d) => {
        showToast(d.name + ' 클리어! +' + d.gold + 'G, +' + d.exp + ' EXP');
        playSFX('levelup');
      });
      window.socket.on('dungeon_result', (d) => showToast(d.msg));

      // 경매장 이벤트
      window.socket.on('market_result', (d) => showToast(d.msg));
      window.socket.on('market_listings', (list) => {
        var el = document.getElementById('market-list');
        if (!el) return;
        if (!list.length) { el.innerHTML = '<p style="color:#888">매물이 없습니다</p>'; return; }
        var html = '';
        list.forEach(l => {
          var gradeColor = l.grade ? {'normal':'#ccc','uncommon':'#4c4','rare':'#48f','epic':'#a4f','legendary':'#f80'}[l.grade] || '#ccc' : '#ccc';
          html += '<div class="panel-item" style="border-left:3px solid '+gradeColor+'">';
          html += '<span class="name" style="color:'+gradeColor+'">'+l.itemName+'</span>';
          html += '<small style="color:#888"> 판매: '+escapeHtml(l.sellerName)+' | '+l.timeLeft+'분 남음</small><br>';
          html += '<small>즉구: '+l.price+'G | 최고입찰: '+l.highestBid+'G</small>';
          html += '<button onclick="window.socket.emit(\'market_buy\','+l.id+')" style="margin-left:5px">구매</button>';
          html += '</div>';
        });
        el.innerHTML = html;
      });

      // 아레나 이벤트
      window.socket.on('arena_result', (d) => showToast(d.msg));
      window.socket.on('arena_start', (d) => {
        showToast('[아레나] VS ' + d.opponent + ' (' + d.opponentClass + ') 대결 시작!');
        addCombatLog('아레나 대결 시작! VS ' + d.opponent, 'log-crit');
        playSFX('levelup');
      });
      window.socket.on('arena_end', (d) => {
        var msg = d.result === 'win' ? '승리! +200G (' + d.reason + ')' : '패배... (' + d.reason + ')';
        showToast('[아레나] ' + msg + ' 포인트: ' + d.points);
        addCombatLog('아레나 ' + msg, d.result === 'win' ? 'log-gold' : 'log-crit');
        playSFX(d.result === 'win' ? 'levelup' : 'die');
      });
      window.socket.on('arena_ranking_list', (list) => {
        var el = document.getElementById('arena-ranking');
        if (!el) return;
        var html = '<table style="width:100%;color:#eee;font-size:11px"><tr><th>#</th><th>이름</th><th>승</th><th>패</th><th>점수</th></tr>';
        list.forEach(r => {
          html += '<tr><td>'+r.rank+'</td><td>'+escapeHtml(r.name)+'</td><td style="color:#4f4">'+r.wins+'</td><td style="color:#f44">'+r.losses+'</td><td style="color:#ff0">'+r.points+'</td></tr>';
        });
        html += '</table>';
        el.innerHTML = html;
      });

      // 출석 체크
      window.socket.on('attendance_reward', (d) => {
        showToast(d.msg);
        playSFX('gold');
      });

      // 무한의 탑
      window.socket.on('tower_enter', (d) => {
        showToast('무한의 탑 ' + d.floor + '층 입장! 몬스터 ' + d.monstersLeft + '마리');
        addCombatLog('탑 ' + d.floor + '층 - ' + d.tier + ' x' + d.monstersLeft, 'log-crit');
      });
      window.socket.on('tower_stage', (d) => {
        showToast('탑 ' + d.floor + '층! 몬스터 ' + d.monstersLeft + '마리');
        playSFX('levelup');
      });
      window.socket.on('tower_clear', (d) => {
        showToast('탑 ' + d.floor + '층 클리어! +' + d.reward.gold + 'G, +' + d.reward.exp + 'EXP');
        playSFX('levelup');
      });
      window.socket.on('tower_update', (d) => { addCombatLog('남은 몬스터: ' + d.monstersLeft, 'normal'); });
      window.socket.on('tower_result', (d) => showToast(d.msg));

      // 희귀 상자
      window.socket.on('box_result', (d) => { showToast(d.msg); playSFX('levelup'); });

      // 친구 시스템
      window.socket.on('friend_result', (d) => showToast(d.msg));
      window.socket.on('friend_request_received', (d) => {
        showModal('친구 요청', '<p><b style="color:#44aaff">'+escapeHtml(d.fromName)+'</b>님이 친구 요청을 보냈습니다.</p>', [
          {label:'수락', action:"window.socket.emit('friend_accept','"+d.fromId+"');closeModal();"},
          {label:'거절', type:'cancel', action:'closeModal()'}
        ]);
        playSFX('buff');
      });
      window.socket.on('friend_list', (d) => {
        // 미니맵 친구 표시용 ID 세트 갱신
        window._friendIds = new Set((d.friends || []).map(function(f) { return f.id; }));
        var el = document.getElementById('friend-list');
        if (!el) return;
        var html = '';
        if (d.requests && d.requests.length > 0) {
          html += '<p style="color:#ffd700;font-size:11px">친구 요청:</p>';
          d.requests.forEach(r => {
            html += '<div class="panel-item"><span class="name">' + escapeHtml(r.fromName) + '</span><button onclick="window.socket.emit(\'friend_accept\',\'' + r.fromId + '\')">수락</button></div>';
          });
        }
        if (d.friends.length === 0) { html += '<p style="color:#888">친구가 없습니다</p>'; }
        else {
          d.friends.forEach(f => {
            var statusColor = f.online ? '#4f4' : '#888';
            html += '<div class="panel-item"><span class="name" style="color:' + statusColor + '">' + escapeHtml(f.name) + ' Lv.' + f.level + ' (' + f.className + ')</span>';
            html += '<button onclick="showModal(\'귓속말\',\'<p style=&quot;color:#888&quot;>'+f.name+'에게 보낼 메시지</p><input id=&quot;wh-msg&quot; maxlength=&quot;100&quot; style=&quot;width:100%;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin-top:8px&quot; autofocus>\',[{label:&quot;전송&quot;,action:&quot;var m=getModalInput(\\\'wh-msg\\\');if(m)window.socket.emit(\\\'whisper\\\',{targetId:\\\''+f.id+'\\\',msg:m});closeModal();&quot;},{label:&quot;취소&quot;,type:&quot;cancel&quot;,action:&quot;closeModal()&quot;}])" style="font-size:10px">귓말</button>';
            html += '</div>';
          });
        }
        el.innerHTML = html;
      });

      // 귓속말
      window.socket.on('whisper_received', (d) => {
        addCombatLog('[귓속말] ' + escapeHtml(d.fromName) + ': ' + escapeHtml(d.msg), 'log-crit');
        showToast('[귓] ' + escapeHtml(d.fromName) + ': ' + escapeHtml(d.msg));
      });
      window.socket.on('whisper_sent', (d) => {
        addCombatLog('[귓속말 → ' + d.toName + '] ' + d.msg, 'normal');
      });

      // 우편 거래
      window.socket.on('mail_result', (d) => showToast(d.msg));
      window.socket.on('mail_received', (d) => {
        var msg = d.from + '님으로부터 우편: ';
        if (d.item) msg += d.item + ' x' + d.count;
        if (d.gold) msg += d.gold + 'G';
        showToast(msg);
        addCombatLog('[우편] ' + msg, 'log-gold');
        playSFX('gold');
      });

      // NPC 상호작용
      window.socket.on('npc_result', (d) => { showToast(d.msg); if(d.type==='healer')playSFX('heal'); });

      // 버프/디버프 상태 표시
      window.socket.on('buff_status', (buffs) => {
        var bar = document.getElementById('buff-bar');
        if (!bar) return;
        var html = '';
        var buffIcons = { 'buff':'🛡️', 'skill':'⚔️', 'food':'🍖', 'debuff':'💀' };
        var buffColors = { 'buff':'rgba(0,100,200,0.4)', 'skill':'rgba(200,150,0,0.4)', 'food':'rgba(0,150,50,0.4)', 'debuff':'rgba(200,0,0,0.4)' };
        buffs.forEach(function(b) {
          var icon = buffIcons[b.icon] || '✨';
          var bg = buffColors[b.icon] || 'rgba(100,100,100,0.4)';
          var borderColor = b.icon === 'debuff' ? '#f44' : '#ffd700';
          html += '<div class="buff-icon" style="background:'+bg+';border:1px solid '+borderColor+'">';
          html += '<span style="font-size:14px">'+icon+'</span>';
          html += '<span>'+b.name+'<br><b style="color:#ffd700;font-size:10px">'+b.remaining+'s</b></span></div>';
        });
        bar.innerHTML = html;
      });
      window.socket.on('npc_smith', (d) => {
        if (!d.items || d.items.length === 0) { showToast('강화 가능한 장비가 없습니다'); return; }
        var gradeColors = {normal:'#ccc',uncommon:'#4c4',rare:'#48f',epic:'#a4f',legendary:'#f80'};
        var html = '';
        d.items.forEach(function(it) {
          var gc = gradeColors[it.grade] || '#ccc';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #333">';
          html += '<span style="color:'+gc+'">'+it.name+' <b>+'+it.level+'</b>/'+it.maxEnchant+'</span>';
          html += '<button style="padding:4px 10px;background:#4a3a1a;color:#ffd700;border:none;border-radius:4px;cursor:pointer" onclick="closeModal();enchantItem(\''+it.id+'\')">강화</button></div>';
        });
        showModal('대장장이 - 장비 강화', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });
      window.socket.on('npc_travel', (d) => {
        if (!d.towns || d.towns.length === 0) { showToast('이동 가능한 마을이 없습니다'); return; }
        var html = '<p style="color:#888;font-size:12px;margin-bottom:8px">이동 비용: 100G</p>';
        var btns = [];
        d.towns.forEach(function(t) {
          btns.push({label: t.name, action: "closeModal();window.socket.emit('npc_travel_to','"+t.id+"')"});
        });
        btns.push({label:'취소', type:'cancel', action:'closeModal()'});
        showModal('항해사 - 마을 이동', html, btns);
      });

      // 전투 로그
      window.socket.on('combat_log', (d) => {
        // 메시지 종류별 SFX
        if (d.msg && d.msg.indexOf('치유') !== -1) playSFX('heal');
        else if (d.msg && d.msg.indexOf('획득') !== -1) playSFX('gold');
        addCombatLog(d.msg, 'normal');
      });
      window.socket.on('monster_die', (d) => {
        if (typeof d === 'object' && d.killer === myPlayerId) {
          var name = d.name || d.tier;
          gameStats.kills++;
          // 킬 스트릭 (5초 이내 연속 킬)
          var now = Date.now();
          if (now - lastKillTime < 5000) { killStreak++; } else { killStreak = 1; }
          lastKillTime = now;
          showKillStreak(killStreak);
          // 골드/EXP 플로팅 숫자
          if (d.goldEarned) showFloatingDamage('+' + d.goldEarned + 'G', false, null);
          if (d.expEarned) {
            var expEl = document.getElementById('exp-bar-fill');
            if (expEl) { expEl.parentElement.classList.add('exp-pulse'); setTimeout(function(){ expEl.parentElement.classList.remove('exp-pulse'); }, 400); }
          }
          // 전투 상태 + 루트 로그
          var zName = zones[d.zone] ? zones[d.zone].name : '';
          updateCombatStatus(zName, d.tier);
          var tierColors = {normal:'rgba(136,204,136,0.3)',elite:'rgba(204,170,68,0.4)',rare:'rgba(170,68,204,0.4)',boss:'rgba(255,68,68,0.5)',legendary:'rgba(255,136,0,0.5)',mythic:'rgba(255,0,255,0.5)',treasure:'rgba(255,215,0,0.5)'};
          addLootEntry(name + ' +'+(d.goldEarned||0)+'G +'+(d.expEarned||0)+'EXP', tierColors[d.tier] || 'rgba(100,100,100,0.3)');
          addCombatLog(name + ' 처치!' + (killStreak >= 3 ? ' ('+killStreak+'x)' : ''), 'log-gold');
          // 보스급 처치 시 화면 효과
          if (d.tier === 'boss' || d.tier === 'legendary' || d.tier === 'mythic' || d.tier === 'treasure') {
            playSFX('boss');
            document.getElementById('unity-container').classList.add('shake');
            setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 500);
          }
          // 마일스톤 (50/100/500/1000)
          var milestones = [50,100,250,500,1000,2500,5000];
          if (milestones.includes(gameStats.kills)) {
            showToast(gameStats.kills + '마리 처치 달성!');
            playSFX('levelup');
            if (gameStats.kills > (personalBests.maxKills || 0)) {
              personalBests.maxKills = gameStats.kills;
              localStorage.setItem('ab_records', JSON.stringify(personalBests));
            }
          }
        } else if (typeof d === 'object') {
          addCombatLog((d.name||d.tier) + ' 처치됨', 'normal');
        }
      });

      // 서버 공지
      window.socket.on('server_msg', (d) => {
        showServerMsg(d.msg, d.type);
        // 알림 센터에 저장
        if (!window._notifLog) window._notifLog = [];
        window._notifLog.unshift({ msg: d.msg, type: d.type || 'normal', time: Date.now() });
        if (window._notifLog.length > 100) window._notifLog.length = 100;
        // 알림 뱃지
        var badge = document.getElementById('notif-badge');
        if (badge) {
          window._notifUnread = (window._notifUnread || 0) + 1;
          badge.textContent = window._notifUnread;
          badge.style.display = 'inline-block';
        }
        // 공성전 상태 표시
        if (d.msg.includes('공성전') || d.msg.includes('공성')) {
          var siegeEl = document.getElementById('siege-display');
          siegeEl.textContent = '⚔ 공성전 진행 중';
          siegeEl.style.display = 'inline';
          setTimeout(() => { siegeEl.style.display = 'none'; }, 300000);
        }
      });

      // 변신 결과
      window.socket.on('morph_result', (d) => { showToast(d.msg); if(d.success) playSFX('levelup'); });

      // 강화 결과
      window.socket.on('enchant_result', (d) => {
        showToast(d.msg);
        if (d.jackpot) {
          playSFX('boss'); playSFX('levelup');
          document.getElementById('unity-container').classList.add('shake');
          setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 500);
          showFloatingDamage(d.jackpot, true, null);
        } else {
          playSFX(d.success ? 'levelup' : 'die');
        }
      });

      // 보스 카운트다운
      // 보스 페이즈
      window.socket.on('boss_phase', (d) => {
        var phaseNames = { enrage:'분노', desperate:'필사' };
        addCombatLog('[보스] ' + (phaseNames[d.phase]||d.phase) + ' 페이즈!', 'log-crit');
        showToast(d.msg);
        playSFX('boss');
        document.getElementById('unity-container').classList.add('shake');
        setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 500);
      });

      // 날씨
      window.socket.on('weather_change', (d) => {
        var overlays = { clear:'none', rain:'sepia(0.1) brightness(0.9)', fog:'contrast(0.8) brightness(0.85)', snow:'saturate(0.5) brightness(1.1)', storm:'contrast(1.2) brightness(0.8)' };
        document.getElementById('unity-container').style.filter = overlays[d.id] || 'none';
        if (d.id !== 'clear') showToast('[날씨] ' + d.name);
        currentWeather = d;
        startWeatherParticles(d.id);
      });

      // 캐릭터 프로필
      window.socket.on('profile_data', (d) => {
        var el = document.getElementById('profile-body');
        if (!el) return;
        var gradeColors = {normal:'#ccc',uncommon:'#4c4',rare:'#48f',epic:'#a4f',legendary:'#f80'};
        var html = '<div style="text-align:center;margin-bottom:12px">';
        html += '<div class="text-gold" style="font-size:16px;font-weight:900">' + d.name + '</div>';
        html += '<div class="text-muted text-sm">' + (d.advancedClass||d.class) + ' Lv.' + d.level;
        if (d.prestige > 0) html += ' <span style="color:#ff8800">★' + d.prestige + '</span>';
        html += '</div>';
        if (d.faction !== '없음') html += '<div class="text-sm" style="color:#88ccff">' + d.faction + ' (기여: ' + d.factionRep + ')</div>';
        html += '</div>';
        // 스탯
        html += '<div class="card" style="margin-bottom:8px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">';
        html += '<div>⚔ ATK <b class="text-gold">' + d.atk + '</b></div>';
        html += '<div>🛡 DEF <b style="color:#4488ff">' + d.def + '</b></div>';
        html += '<div>❤ HP <b style="color:#44ff44">' + d.maxHp + '</b></div>';
        html += '<div>⚡ CRIT <b style="color:#ff6666">' + d.critRate + '%</b></div>';
        html += '<div>💨 DODGE <b style="color:#44ffff">' + d.dodgeRate + '%</b></div>';
        html += '<div>📈 DMG <b style="color:#ffa500">x' + d.dmgMulti + '</b></div>';
        html += '</div></div>';
        // 장비
        html += '<div class="card" style="margin-bottom:8px"><b class="text-sm text-gold">장착 장비</b>';
        if (d.equipped.length === 0) html += '<div class="text-muted text-xs">없음</div>';
        d.equipped.forEach(function(e) {
          var gc = gradeColors[e.grade] || '#ccc';
          html += '<div style="font-size:10px;color:'+gc+';padding:2px 0">['+e.slot+'] '+e.name+' +'+(e.enchant||0);
          if (e.runes.length > 0) html += ' <span style="color:#ffd700">['+e.runes.join('')+']</span>';
          html += '</div>';
        });
        html += '</div>';
        // 업적 요약
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;color:#aaa">';
        html += '<div>💀 킬: ' + d.kills + '</div><div>⚔ PvP승: ' + d.pvpWins + '</div>';
        html += '<div>🏰 탑: ' + d.towerHighest + '층</div><div>📖 도감: ' + d.bestiary + '종</div>';
        html += '<div>🗺 탐험: ' + d.exploration + '/50</div><div>🎣 낚시: Lv.' + d.fishingLevel + '</div>';
        html += '</div>';
        el.innerHTML = html;
      });

      // 다른 플레이어 조회
      window.socket.on('inspect_data', (d) => {
        var gradeColors = {normal:'#ccc',uncommon:'#4c4',rare:'#48f',epic:'#a4f',legendary:'#f80'};
        var html = '<div style="text-align:center"><b class="text-gold" style="font-size:14px">' + d.name + '</b>';
        html += '<div class="text-muted text-sm">' + d.class + ' Lv.' + d.level;
        if (d.prestige > 0) html += ' ★' + d.prestige;
        html += '</div>';
        if (d.faction) html += '<div class="text-sm" style="color:#88ccff">' + d.faction + '</div>';
        html += '<div class="text-xs" style="color:#888">킬: ' + d.kills + '</div></div>';
        html += '<div style="margin-top:8px">';
        d.equipped.forEach(function(e) {
          html += '<div style="font-size:10px;color:' + (gradeColors[e.grade]||'#ccc') + '">['+e.slot+'] '+e.name+' +'+e.enchant+'</div>';
        });
        html += '</div>';
        showModal('플레이어 정보', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });

      // 길드 채팅
      window.socket.on('guild_chat_msg', (d) => {
        addCombatLog('[길드] ' + d.sender + ': ' + d.msg, 'log-morph');
      });
      window.socket.on('guild_members', (d) => {
        showModal('길드 멤버 — ' + d.name + ' Lv.' + d.level,
          d.members.map(function(m) {
            var color = m.online ? '#44ff44' : '#888';
            return '<div class="panel-item"><span class="text-sm" style="color:'+color+'">'+m.name+' Lv.'+m.level+' ('+m.class+')</span></div>';
          }).join(''), [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      // 월드 이벤트 로그
      window.socket.on('world_events', (list) => {
        var el = document.getElementById('events-body');
        if (!el) return;
        if (!list.length) { el.innerHTML = '<p class="text-muted text-sm">이벤트 없음</p>'; return; }
        var typeColors = {boss:'#ff4444',rare:'#4488ff',danger:'#ff8800',normal:'#888'};
        el.innerHTML = list.map(function(e) {
          return '<div class="panel-item" style="border-left:3px solid '+(typeColors[e.type]||'#888')+'"><span class="text-sm">'+e.msg+'</span><span class="text-xs text-muted">'+e.time+'분 전</span></div>';
        }).join('');
      });

      // 스킬 쿨타임
      window.socket.on('skill_cooldowns', (cds) => {
        var html = '';
        cds.forEach(function(s) {
          var color = s.ready ? '#44ff44' : '#ff8800';
          var pct = s.cooldown > 0 ? Math.floor((1 - s.remaining/s.cooldown) * 100) : 100;
          html += '<div style="display:inline-flex;flex-direction:column;align-items:center;width:60px;font-size:9px;color:'+color+'">';
          html += '<div style="width:40px;height:4px;background:#333;border-radius:2px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:2px"></div></div>';
          html += s.name.slice(0,4) + (s.ready ? ' ✓' : ' '+s.remaining+'s');
          html += '</div>';
        });
        var skillBar = document.getElementById('skill-cooldown-bar');
        if (skillBar) skillBar.innerHTML = html;
      });

      // 전직 선택
      window.socket.on('advance_options', (options) => {
        var html = '<p class="text-muted text-sm" style="margin-bottom:10px">Lv.20 전직 — 2가지 경로 중 선택하세요 (되돌릴 수 없음!)</p>';
        var btns = options.map(function(o) {
          return { label: o.name + ' — ' + o.desc, action: "window.socket.emit('class_advance'," + o.idx + ");closeModal();" };
        });
        btns.push({label:'취소',type:'cancel',action:'closeModal()'});
        showModal('전직 선택', html + options.map(function(o) {
          return '<div class="card" style="margin-bottom:6px"><b class="text-gold">' + o.name + '</b><div class="text-sm text-muted">' + o.desc + '</div><div class="text-xs" style="color:#aaa;margin-top:2px">' + o.stats + '</div></div>';
        }).join(''), btns);
      });

      window.socket.on('boss_countdown', (d) => {
        showToast('[월드 보스] ' + d.seconds + '초 후 출현!');
        if (d.seconds <= 30) playSFX('boss');
      });

      // 골드 피버
      window.socket.on('gold_fever', (d) => {
        showToast('[골드 피버!] ' + d.zoneName + ' - ' + d.duration + '초간 x3 보상!');
        playSFX('boss'); playSFX('gold');
        if (window.pushWorldEvent) pushWorldEvent('🔥 골드피버 ' + d.zoneName, '#ff8800', d.duration);
      });

      // 레어 몬스터 출현
      window.socket.on('rare_spawn', (d) => {
        addCombatLog('[!] ' + d.name + ' 출현: ' + d.zoneName, 'log-crit');
      });

      // 킬 스트릭 보너스
      window.socket.on('kill_streak_bonus', (d) => {
        showToast(d.count + 'x 스트릭! 보상 x' + d.multi.toFixed(1) + '!');
        playSFX('buff');
      });

      // 랭킹 추월
      window.socket.on('rank_change', (d) => {
        var msg = d.type + ' 랭킹 ' + (d.oldRank > 0 ? d.oldRank+'위→' : '') + d.newRank + '위!';
        showToast(msg);
        playSFX('levelup');
        addCombatLog('[랭킹] ' + msg, 'log-crit');
      });

      // 업적 달성
      window.socket.on('achievement_unlock', (d) => {
        var ol = document.getElementById('levelup-overlay');
        ol.querySelector('.lvl-text').innerHTML = '🏆 업적 달성!';
        ol.querySelector('.lvl-sub').innerHTML = '<b style="color:#ffd700">"'+d.name+'"</b><br><small style="color:#aaa">'+d.desc+'</small>';
        ol.classList.add('show');
        playSFX('levelup'); playSFX('buff'); playSFX('gold');
        setTimeout(function(){ ol.classList.remove('show'); }, 3000);
      });

      // 현상금
      window.socket.on('bounty_update', (list) => {
        var el = document.getElementById('bounty-list');
        if (!el) return;
        if (!list.length) { el.innerHTML = '<p style="color:#888">현상금 없음</p>'; return; }
        var html = '';
        list.forEach(function(b) {
          var clr = b.claimed ? '#888' : '#ff4444';
          html += '<div class="panel-item" style="border-left:3px solid '+clr+'"><span class="name" style="color:'+clr+'">'+escapeHtml(b.targetName)+' <b style="color:#ffd700">'+b.reward+'G</b></span>';
          if (!b.claimed) html += '<button onclick="window.socket.emit(\'claim_bounty\',\''+escapeHtml(b.targetName)+'\')">수락</button>';
          else html += '<span style="color:#888;font-size:10px">수락됨</span>';
          html += '</div>';
        });
        el.innerHTML = html;
      });
      window.socket.on('bounty_result', (d) => showToast(d.msg));

      // 떠돌이 상인
      window.socket.on('rogue_merchant', (d) => {
        showModal('떠돌이 상인 — '+d.townName, '<p style="color:#ffd700;font-size:12px">'+d.expiresIn+'초 한정! 선착순 1명!</p>', d.deals.map(function(dl) {
          return { label: dl.name+' ('+dl.price+(dl.currency==='diamond'?'D':'G')+')', action: "window.socket.emit('rogue_buy',"+dl.idx+");closeModal();" };
        }).concat([{label:'닫기',type:'cancel',action:'closeModal()'}]));
        playSFX('buff');
      });
      window.socket.on('rogue_result', (d) => { showToast(d.msg); playSFX('gold'); });

      // 월드 이벤트 상단 표시기
      window.activeWorldEvents = window.activeWorldEvents || [];
      window.pushWorldEvent = function(label, color, durationSec) {
        window.activeWorldEvents.push({ label: label, color: color, endAt: Date.now() + durationSec * 1000 });
        renderWorldEvent();
      };
      const pushWorldEvent = window.pushWorldEvent;
      function renderWorldEvent() {
        const el = document.getElementById('world-event-display');
        if (!el) return;
        const now = Date.now();
        window.activeWorldEvents = window.activeWorldEvents.filter(e => e.endAt > now);
        if (window.activeWorldEvents.length === 0) { el.style.display = 'none'; return; }
        const parts = window.activeWorldEvents.map(e => {
          const remain = Math.max(0, Math.ceil((e.endAt - now) / 1000));
          const m = Math.floor(remain / 60), s = remain % 60;
          return '<span style="color:'+e.color+'">'+e.label+' '+m+':'+(s<10?'0':'')+s+'</span>';
        });
        el.innerHTML = parts.join(' · ');
        el.style.display = 'inline-flex';
      }
      setInterval(renderWorldEvent, 1000);

      // 유성우
      window.socket.on('meteor_shower', (d) => {
        showToast('[유성우] '+d.zoneName+' — '+d.duration+'초간! 파편 수집 + x2 보상!');
        playSFX('boss');
        pushWorldEvent('☄️ 유성우 ' + d.zoneName, '#ff6644', d.duration);
      });

      // 황금 비
      window.socket.on('golden_rain', (d) => {
        showToast('[황금 비] '+d.zoneName+' — '+d.duration+'초간! 골드 x3, EXP x1.5!');
        playSFX('gold');
        pushWorldEvent('💰 황금 비 ' + d.zoneName, '#ffd700', d.duration);
      });

      // 별똥별 소나기
      window.socket.on('star_shower', (d) => {
        showToast('[별똥별 소나기] '+d.zoneName+' — '+d.duration+'초간! 골드 드롭!');
        playSFX('levelup');
        pushWorldEvent('⭐ 별똥별 ' + d.zoneName, '#88ccff', d.duration);
      });

      // 주사위
      window.socket.on('dice_result', (d) => {
        showToast(d.msg);
        if (d.tie) playSFX('hit'); else playSFX(d.winner ? 'gold' : 'die');
      });

      // 합성/리롤/일괄판매/분해/웨이포인트/액티브/크리루트/버프연장/몬스터경고
      window.socket.on('fuse_result', (d) => { showToast(d.msg); playSFX(d.msg.includes('성공') ? 'levelup' : 'die'); });
      window.socket.on('reroll_result', (d) => { showToast(d.msg); playSFX('buff'); });
      window.socket.on('bulk_sell_result', (d) => { showToast(d.msg); if (d.count > 0) playSFX('gold'); });
      window.socket.on('dismantle_result', (d) => { showToast(d.msg); playSFX('hit'); });
      window.socket.on('waypoint_result', (d) => { showToast(d.msg); });
      window.socket.on('waypoint_list', (list) => {
        showModal('웨이포인트 이동', '<p style="color:#888;font-size:12px;margin-bottom:8px">방문한 마을로 무료 이동 (60초 쿨타임)</p>',
          list.map(function(w) { return { label: w.name, action: "window.socket.emit('waypoint_teleport','"+w.id+"');closeModal();" }; })
          .concat([{label:'닫기',type:'cancel',action:'closeModal()'}]));
      });
      window.socket.on('active_bonus', (d) => {
        showFloatingDamage('BOOST! x1.3', true, null);
        playSFX('buff');
      });
      window.socket.on('critical_loot', (d) => {
        // 크리티컬 루트 3초 제한 버튼
        showModal('반짝이 드롭!', '<p style="color:#ffd700;font-size:16px;text-align:center;animation:lvlPop 0.3s">✨ CRITICAL LOOT! ✨</p><p style="color:#888;font-size:12px;text-align:center">3초 내에 수집하세요!</p>',
          [{label:'수집!', action:"window.socket.emit('claim_critical_loot','"+d.dropId+"');closeModal();"}]);
        playSFX('boss'); playSFX('gold');
        setTimeout(closeModal, 3200);
      });
      window.socket.on('loot_result', (d) => { showToast(d.msg); playSFX('levelup'); });
      window.socket.on('buff_result', (d) => showToast(d.msg));
      window.socket.on('monster_telegraph', (d) => {
        // 몬스터 공격 경고: 화면에 빨간 경고 표시
        var warn = document.createElement('div');
        warn.style.cssText = 'position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);color:#ff4444;font-size:24px;font-weight:900;text-shadow:0 0 20px #f00;pointer-events:none;z-index:30;animation:lvlPop 0.3s';
        warn.textContent = d.type === 'charge' ? '⚠ 돌진!' : d.type === 'breath' ? '⚠ 브레스!' : '⚠ 공격!';
        document.body.appendChild(warn);
        setTimeout(function(){ warn.remove(); }, 800);
      });

      // ── 5대 시스템 이벤트 ──
      // 균열
      window.socket.on('rift_floor', (d) => { showToast(`[균열] ${d.theme} ${d.depth}층 — HP:${d.monsterHp} ATK:${d.monsterAtk}`); playSFX('boss'); });
      window.socket.on('rift_result', (d) => { showToast(d.msg); playSFX('gold'); });
      window.socket.on('rift_ranking', (d) => {
        var html = '<p class="text-gold">' + d.theme + ' 랭킹</p>';
        d.rankings.forEach(function(r) { html += '<div class="panel-item"><span class="text-sm">#'+r.rank+' '+escapeHtml(r.name)+'</span><span class="text-gold text-sm">'+r.depth+'층</span></div>'; });
        document.getElementById('rift-info').innerHTML = html;
      });
      // 룬
      window.socket.on('rune_result', (d) => { showToast(d.msg); playSFX(d.msg.includes('발동') ? 'boss' : 'buff'); });
      // 진영
      window.socket.on('faction_result', (d) => showToast(d.msg));
      window.socket.on('faction_info', (d) => {
        var el = document.getElementById('faction-body');
        if (!el) return;
        var html = '<p class="text-muted text-sm" style="margin-bottom:8px">Lv.20 이상 가입 가능. 진영전에서 존을 점령하세요!</p>';
        for (var fId in d.factions) {
          var f = d.factions[fId];
          var isMine = d.myFaction === fId;
          html += '<div class="card" style="margin-bottom:6px;border-left:3px solid '+f.color+'">';
          html += '<b style="color:'+f.color+'">'+f.name+'</b>' + (isMine ? ' <span class="text-gold text-xs">[내 진영]</span>' : '');
          html += '<div class="text-sm text-muted">점령 '+f.zones+'존 | 총 '+f.kills+'킬</div>';
          if (!d.myFaction && !isMine) html += '<button class="btn btn-sm" onclick="window.socket.emit(\'faction_join\',\''+fId+'\')">가입</button>';
          html += '</div>';
        }
        if (d.myFaction) html += '<p class="text-sm" style="margin-top:8px">내 기여도: <b class="text-gold">'+d.myRep+'</b></p>';
        el.innerHTML = html;
      });
      // 프레스티지
      window.socket.on('prestige_result', (d) => {
        showToast(d.msg); playSFX('boss'); playSFX('levelup');
        if (d.perk) { var ol = document.getElementById('levelup-overlay'); ol.querySelector('.lvl-text').textContent = '환생!'; ol.querySelector('.lvl-sub').innerHTML = d.perk.name+' — '+d.perk.desc; ol.classList.add('show'); setTimeout(function(){ ol.classList.remove('show'); }, 3000); }
      });
      // 의뢰
      window.socket.on('contract_result', (d) => showToast(d.msg));
      window.socket.on('contract_list', (list) => {
        var el = document.getElementById('contract-body');
        if (!el) return;
        if (!list.length) { el.innerHTML = '<p class="text-muted text-sm">의뢰가 없습니다</p>'; return; }
        var html = '';
        list.forEach(function(c) {
          html += '<div class="panel-item"><span class="name text-sm">'+c.type+' <span class="text-muted">by '+c.creator+'</span> | <b class="text-gold">'+c.reward+'G</b> | '+c.timeLeft+'분</span>';
          if (c.status === 'open') html += '<button class="btn btn-sm" onclick="window.socket.emit(\'contract_accept\','+c.id+')">수락</button>';
          else html += '<span class="text-muted text-xs">수락됨</span>';
          html += '</div>';
        });
        el.innerHTML = html;
      });

      // ── 낚시 ──
      window.socket.on('fish_cast', (d) => { showToast(d.msg); addCombatLog('🎣 ' + d.msg, 'normal'); });
      window.socket.on('fish_bite', (d) => {
        showModal('입질!', '<p style="text-align:center;font-size:20px;animation:lvlPop 0.3s">🐟 입질이다!</p><p class="text-muted text-sm" style="text-align:center">1.5초 안에 버튼을 누르세요!</p>',
          [{label:'낚아올려!', action:"window.socket.emit('hook_fish');closeModal();"}]);
        playSFX('boss');
      });
      window.socket.on('fish_result', (d) => {
        closeModal();
        showToast(d.msg);
        if (d.grade) addLootEntry('🐟 '+d.name+' (+'+d.msg.match(/\d+G/)?.[0]+')', d.color ? 'rgba(0,100,200,0.3)' : 'rgba(100,100,100,0.3)');
        playSFX(d.grade === 'legendary' || d.grade === 'epic' ? 'levelup' : 'gold');
      });

      // ── 이모트 ──
      window.socket.on('emote_show', (d) => {
        addCombatLog(d.playerName + ': ' + d.emote, 'log-morph');
        showFloatingDamage(d.emote, false, null);
      });

      // ── 출석 캘린더 ──
      window.socket.on('attendance_calendar', (d) => {
        var html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';
        d.calendar.forEach(function(day) {
          var bg = day.claimed ? 'rgba(68,255,68,0.15)' : day.today ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.03)';
          var border = day.today ? '2px solid var(--c-gold)' : '1px solid var(--c-border)';
          var check = day.claimed ? '✅' : day.today ? '📦' : '';
          html += '<div style="background:'+bg+';border:'+border+';border-radius:var(--r-sm);padding:4px;text-align:center;font-size:9px">';
          html += '<div class="text-muted">'+day.day+'일</div>';
          html += '<div style="font-size:8px;color:#ddd;margin-top:2px">'+day.reward+'</div>';
          if (check) html += '<div>'+check+'</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '<p class="text-gold text-sm" style="text-align:center;margin-top:8px">연속 출석: '+d.streak+'일</p>';
        showModal('출석 캘린더', html, [{label:'확인',action:'closeModal()'}]);
      });

      // ── 탐험도 ──
      window.socket.on('zone_discovered', (d) => {
        showToast('[탐험] ' + d.zone + ' 발견! (' + d.discovered + '/' + d.total + ' — ' + d.pct + '%)');
        playSFX('buff');
      });
      window.socket.on('exploration_data', (d) => {
        showModal('탐험도', '<p class="text-gold" style="font-size:14px;text-align:center">'+d.discovered+' / '+d.total+' 지역 ('+d.pct+'%)</p><div style="width:100%;height:10px;background:#222;border-radius:5px;margin:8px 0;overflow:hidden"><div style="width:'+d.pct+'%;height:100%;background:linear-gradient(90deg,var(--c-blue),var(--c-gold));border-radius:5px;transition:width 0.5s"></div></div><p class="text-muted text-sm">새로운 지역을 방문하면 자동 등록됩니다. +5 EXP/지역</p>', [{label:'확인',action:'closeModal()'}]);
      });

      // 스킬 상세
      window.socket.on('skill_data', (skills) => {
        var el = document.getElementById('skills-body');
        if (!el) return;
        var typeNames = {active:'액티브',passive:'패시브',ultimate:'궁극기'};
        var typeColors = {active:'#44aaff',passive:'#44ff44',ultimate:'#ffd700'};
        var html = '';
        skills.forEach(function(s) {
          var tc = typeColors[s.type] || '#ccc';
          var locked = !s.unlocked;
          html += '<div class="panel-item" style="border-left:3px solid '+tc+';opacity:'+(locked?'0.4':'1')+'">';
          html += '<div><b style="color:'+tc+'">'+s.name+'</b> <small style="color:#888">['+(typeNames[s.type]||s.type)+']</small>';
          if (locked) html += ' <span style="color:#f44;font-size:9px">Lv.'+s.level+' 필요</span>';
          html += '</div>';
          html += '<div style="font-size:10px;color:#aaa;margin-top:2px">';
          if (s.dmgMulti) html += '데미지 x'+s.dmgMulti+' ';
          if (s.cooldown) html += '쿨타임 '+s.cooldown+'초 ';
          if (s.mpCost) html += 'MP '+s.mpCost+' ';
          if (s.range) html += '사거리 '+s.range+' ';
          if (s.aoe) html += '[광역] ';
          html += '</div>';
          html += '<div style="font-size:10px;color:#ddd;margin-top:2px">'+s.desc+'</div>';
          if (s.cooldownLeft > 0) html += '<div style="font-size:9px;color:#ff8800">쿨타임: '+s.cooldownLeft+'초 남음</div>';
          html += '</div>';
        });
        el.innerHTML = html;
      });

      // 장비 비교 (+ 자동 장착)
      window.socket.on('equip_compare', (d) => {
        // 자동 장착 설정 시 더 강하면 바로 장착
        if (window._autoEquip && d.atkDiff + d.defDiff > 0) {
          // 서버에 장착 요청 (itemId 필요)
          showToast('자동 장착: ' + d.new.name + ' (ATK+' + d.atkDiff + ')');
          return;
        }
        var gradeColors = {normal:'#ccc',uncommon:'#4c4',rare:'#48f',epic:'#a4f',legendary:'#f80'};
        var diffColor = function(v) { return v > 0 ? '#44ff44' : v < 0 ? '#ff4444' : '#888'; };
        var diffStr = function(v) { return v > 0 ? '▲+'+v : v < 0 ? '▼'+v : '='; };
        var html = '<div style="display:flex;gap:10px;justify-content:center">';
        // 현재 장비
        html += '<div style="flex:1;padding:10px;background:rgba(255,0,0,0.05);border:1px solid #333;border-radius:8px;text-align:center">';
        html += '<div style="color:#888;font-size:10px;margin-bottom:4px">현재 장착</div>';
        if (d.current) {
          html += '<div style="color:'+(gradeColors[d.current.grade]||'#ccc')+';font-weight:bold">'+d.current.name+' +'+d.current.enchant+'</div>';
          html += '<div style="font-size:11px;color:#ccc">ATK +'+d.current.atk+' / DEF +'+d.current.def+'</div>';
        } else { html += '<div style="color:#555">없음</div>'; }
        html += '</div>';
        // 화살표
        html += '<div style="display:flex;align-items:center;font-size:20px;color:#ffd700">→</div>';
        // 새 장비
        html += '<div style="flex:1;padding:10px;background:rgba(0,255,0,0.05);border:1px solid #333;border-radius:8px;text-align:center">';
        html += '<div style="color:#888;font-size:10px;margin-bottom:4px">새 아이템</div>';
        html += '<div style="color:'+(gradeColors[d.new.grade]||'#ccc')+';font-weight:bold">'+d.new.name+' +'+d.new.enchant+'</div>';
        html += '<div style="font-size:11px;color:#ccc">ATK +'+d.new.atk+' / DEF +'+d.new.def+'</div>';
        html += '</div></div>';
        // 차이
        html += '<div style="text-align:center;margin-top:10px;font-size:13px">';
        html += 'ATK <span style="color:'+diffColor(d.atkDiff)+'">'+diffStr(d.atkDiff)+'</span> | ';
        html += 'DEF <span style="color:'+diffColor(d.defDiff)+'">'+diffStr(d.defDiff)+'</span>';
        html += '</div>';
        showModal('장비 비교', html, [
          {label:'장착', action:"window.socket.emit('equip_item','"+(d.itemId||'')+"');closeModal();"},
          {label:'취소', type:'cancel', action:'closeModal()'}
        ]);
      });

      // 도감
      window.socket.on('bestiary_data', (d) => {
        var el = document.getElementById('bestiary-body');
        if (!el) return;
        var pct = d.total > 0 ? Math.floor(d.discovered / d.total * 100) : 0;
        var html = '<p style="color:#ffd700">발견: '+d.discovered+'/'+d.total+' ('+pct+'%)</p><div style="width:100%;height:8px;background:#333;border-radius:4px;margin:5px 0"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,#aa44ff,#ffd700);border-radius:4px;transition:width 0.5s"></div></div>';
        var sorted = Object.entries(d.bestiary).sort((a,b)=>b[1]-a[1]);
        sorted.forEach(function(e) { html += '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px;border-bottom:1px solid #222"><span style="color:#eee">'+e[0]+'</span><span style="color:#ffd700">x'+e[1]+'</span></div>'; });
        el.innerHTML = html;
      });

      // 누락 핸들러 보완
      window.socket.on('shop_list_result', (d) => { /* 상점 목록은 클라이언트에서 렌더링 */ });
      window.socket.on('whisper_result', (d) => showToast(d.msg));
      window.socket.on('pk_alert', (d) => { addCombatLog('[PK] '+d.killerName+' PK! 카르마:'+d.karma, 'log-crit'); });
      window.socket.on('chaotic_death_penalty', (d) => { addCombatLog('[카오틱] 골드/EXP 손실!', 'log-crit'); });
      window.socket.on('player_respawn', (d) => {
        if(d.id===myPlayerId) {
          document.getElementById('respawn-screen').style.display='none';
          var cd = document.getElementById('respawn-countdown');
          if (cd) cd.style.display = 'none';
          showToast('🏘 마을에서 부활!');
          playSFX('levelup');
        }
      });
      window.socket.on('dungeon_update', (d) => { addCombatLog('남은 몬스터: '+d.monstersLeft, 'normal'); });
      window.socket.on('recipe_list', (d) => { /* 제작 레시피는 craft 패널에서 처리 */ });

      // 자동 물약 상태
      // 채팅
      window.socket.on('chat_msg', (d) => {
        var cls = d.isKing ? 'chat-king' : (d.karma >= 200 ? 'chat-chaotic' : '');
        var prefix = d.isKing ? '[King] ' : (d.karma >= 200 ? '[PK] ' : '');
        addChatMsg(prefix + d.sender + ': ' + d.msg, cls);
      });

      // 일일 챌린지
      window.socket.on('daily_challenge', (d) => {
        var pct = d.goal > 0 ? Math.floor(d.progress / d.goal * 100) : 0;
        var html = '<div style="text-align:center"><b class="text-gold" style="font-size:16px">🏅 ' + d.name + '</b>';
        html += '<p class="text-muted" style="margin:6px 0">' + d.desc + '</p>';
        html += '<div style="width:100%;height:12px;background:#222;border-radius:6px;margin:8px 0;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,var(--c-gold),var(--c-orange));border-radius:6px;transition:width 0.5s"></div></div>';
        html += '<p style="font-size:13px;color:#ddd">' + d.progress + ' / ' + d.goal + ' (' + pct + '%)</p>';
        html += '<p class="text-gold text-sm" style="margin-top:6px">보상: ' + d.reward.gold + 'G' + (d.reward.diamonds ? ' + ' + d.reward.diamonds + 'D' : '') + '</p></div>';
        var btns = d.completed && !d.claimed ? [{label:'보상 수령!', action:"window.socket.emit('claim_daily_challenge');closeModal();"}] : [];
        btns.push({label:'닫기', type:'cancel', action:'closeModal()'});
        showModal('일일 챌린지', html, btns);
      });
      window.socket.on('challenge_result', (d) => { showToast(d.msg); playSFX('levelup'); });
      window.socket.on('weekly_challenge', (d) => {
        var pct = d.goal > 0 ? Math.floor(d.progress / d.goal * 100) : 0;
        var html = '<div style="text-align:center"><b style="color:#aa44ff;font-size:16px">📅 ' + d.name + '</b>';
        html += '<p class="text-muted" style="margin:6px 0">' + d.desc + '</p>';
        html += '<div style="width:100%;height:14px;background:#222;border-radius:7px;margin:8px 0;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,#aa44ff,#ff44aa);border-radius:7px;transition:width 0.5s"></div></div>';
        html += '<p style="font-size:13px;color:#ddd">' + d.progress + ' / ' + d.goal + ' (' + pct + '%)</p>';
        html += '<p class="text-gold text-sm" style="margin-top:6px">보상: ' + d.reward.gold + 'G' + (d.reward.diamonds ? ' + ' + d.reward.diamonds + 'D' : '') + (d.reward.item ? ' + ' + d.reward.item + ' x' + (d.reward.itemQty||1) : '') + '</p></div>';
        var btns = d.completed && !d.claimed ? [{label:'보상 수령!', action:"window.socket.emit('claim_weekly_challenge');closeModal();"}] : [];
        btns.push({label:'닫기', type:'cancel', action:'closeModal()'});
        showModal('주간 챌린지', html, btns);
      });

      // 결투
      window.socket.on('duel_result', (d) => showToast(d.msg));
      window.socket.on('duel_incoming', (d) => {
        showModal('결투 요청!', '<p style="text-align:center"><b class="text-gold" style="font-size:16px">⚔ 결투 요청!</b></p><p style="text-align:center;margin:8px 0"><span style="color:var(--c-red)">' + escapeHtml(d.fromName) + '</span> <span class="text-muted">Lv.' + d.fromLevel + ' ' + escapeHtml(d.fromClass) + '</span></p><p class="text-muted text-sm" style="text-align:center">수락하면 아레나에서 1:1 대결!</p>', [
          {label:'수락!', action:"window.socket.emit('duel_accept','"+d.fromId+"');closeModal();"},
          {label:'거절', type:'cancel', action:'closeModal()'}
        ]);
        playSFX('pvp');
      });

      // 레어 드롭 축하
      window.socket.on('rare_drop_celebration', (d) => {
        celebrateRareDrop(d.grade);
        showToast('✨ ' + d.name + ' (' + (d.grade==='legendary'?'전설':'영웅') + ') 획득! ✨');
      });

      // 맵 핑 수신
      window.socket.on('map_ping', (d) => {
        addCombatLog('[핑] ' + d.name + ': 여기로 모여! (' + Math.floor(d.x) + ',' + Math.floor(d.y) + ')', 'log-morph');
        playSFX('buy');
      });

      // 환영 메시지
      window.socket.on('welcome_back', (d) => {
        showToast('다시 오셨군요! Lv.' + d.level + (d.prestige>0?' ★'+d.prestige:'') + ' | ' + d.kills + '킬 | ' + d.gold + 'G');
      });
      // 추천 존
      window.socket.on('recommend_zone', (d) => {
        setTimeout(function() {
          addCombatLog('[추천] ' + d.name + ' (Lv.' + d.lvl[0] + '~' + d.lvl[1] + ', 보너스+' + d.bonus + '%)', 'log-gold');
        }, 5500);
      });

      // 존 위험 요소 데미지
      window.socket.on('hazard_damage', (d) => {
        showFloatingDamage('-'+d.dps+' '+d.type, false, null);
        addCombatLog(d.msg, 'log-crit');
      });

      // 길드 레이드
      window.socket.on('raid_result', (d) => { showToast(d.msg); playSFX(d.msg.includes('완료') ? 'boss' : 'hit'); });

      // PvP 시즌
      window.socket.on('arena_season', (d) => {
        // 다음 티어 찾기
        var currentTier = null, nextTier = null;
        for (var i = 0; i < d.allTiers.length; i++) {
          if (d.points >= d.allTiers[i].min) currentTier = d.allTiers[i];
          else { nextTier = d.allTiers[i]; break; }
        }
        var pct = 0, progressLabel = 'MAX 티어';
        if (nextTier && currentTier) {
          var range = nextTier.min - currentTier.min;
          pct = Math.min(100, Math.floor((d.points - currentTier.min) / range * 100));
          progressLabel = (d.points - currentTier.min) + ' / ' + range + ' (다음: ' + nextTier.name + ')';
        }
        var totalGames = d.wins + d.losses;
        var winRate = totalGames > 0 ? Math.floor(d.wins / totalGames * 100) : 0;

        var html = '<div style="text-align:center">' +
          '<div style="font-size:32px;font-weight:900;color:'+d.tierColor+';text-shadow:0 0 12px '+d.tierColor+'66;margin:8px 0">⚔ '+d.tier+'</div>' +
          '<div class="text-gold" style="font-size:18px;font-weight:bold;margin:6px 0">'+d.points+' 포인트</div>' +
          // 진행도 바
          '<div style="width:90%;height:14px;background:#222;border-radius:7px;margin:10px auto;overflow:hidden;border:1px solid '+d.tierColor+'44">' +
            '<div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,'+d.tierColor+','+d.tierColor+'aa);border-radius:7px;transition:width 0.5s"></div>' +
          '</div>' +
          '<div class="text-muted text-sm">'+progressLabel+'</div>' +
          // 통계
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:14px 8px">' +
            '<div style="background:rgba(68,255,68,0.05);border-left:3px solid #44ff44;padding:6px"><div style="color:#888;font-size:10px">승</div><div style="color:#44ff44;font-size:16px;font-weight:bold">'+d.wins+'</div></div>' +
            '<div style="background:rgba(255,68,68,0.05);border-left:3px solid #ff4444;padding:6px"><div style="color:#888;font-size:10px">패</div><div style="color:#ff4444;font-size:16px;font-weight:bold">'+d.losses+'</div></div>' +
            '<div style="background:rgba(255,215,0,0.05);border-left:3px solid #ffd700;padding:6px"><div style="color:#888;font-size:10px">승률</div><div style="color:#ffd700;font-size:16px;font-weight:bold">'+winRate+'%</div></div>' +
          '</div>' +
          // 티어 바
          '<div style="margin-top:14px;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px">' +
            '<div style="font-size:10px;color:#888;margin-bottom:4px">시즌 티어</div>' +
            d.allTiers.map(function(t) {
              var active = d.points >= t.min;
              var isCurrent = currentTier && t.name === currentTier.name;
              return '<div style="display:flex;justify-content:space-between;padding:3px 6px;font-size:11px;color:'+t.color+';opacity:'+(active?1:0.4)+';' + (isCurrent?'background:'+t.color+'22;border-radius:4px;font-weight:bold':'') + '">' +
                '<span>'+t.name+'</span><span>'+t.min+'pt</span></div>';
            }).join('') +
          '</div>' +
          '<div class="text-muted text-sm" style="margin-top:10px">⏳ 시즌 종료까지 '+d.seasonRemain+'일</div>' +
        '</div>';
        showModal('🏆 PvP 시즌', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });

      // 티어 승급
      window.socket.on('tier_promotion', (d) => {
        var ol = document.getElementById('levelup-overlay');
        ol.querySelector('.lvl-text').innerHTML = '🏆 TIER UP!';
        ol.querySelector('.lvl-sub').innerHTML = '<span style="color:'+d.color+';font-size:24px">'+d.tier+'</span>';
        ol.classList.add('show');
        playSFX('boss'); playSFX('levelup');
        setTimeout(function(){ ol.classList.remove('show'); }, 3000);
      });

      // 존 분위기 텍스트
      window.socket.on('zone_ambient', (d) => {
        var el = document.createElement('div');
        el.style.cssText = 'position:fixed;bottom:55%;left:50%;transform:translateX(-50%);z-index:40;color:rgba(200,200,200,0.8);font-size:12px;font-style:italic;text-align:center;max-width:400px;pointer-events:none;text-shadow:0 1px 4px #000;animation:lvlFade 4s ease-out forwards';
        el.textContent = d.text;
        document.body.appendChild(el);
        setTimeout(function(){ el.remove(); }, 4000);
      });

      // 몬스터 도감 로어
      window.socket.on('monster_lore', (d) => {
        var tierColors = {normal:'#88cc88',elite:'#ccaa44',rare:'#aa44cc',boss:'#ff4444',legendary:'#ff8800',mythic:'#ff00ff'};
        showModal('새로운 발견!', '<div style="text-align:center"><div style="font-size:18px;color:'+(tierColors[d.tier]||'#fff')+'">'+escapeHtml(d.name)+'</div><p style="color:#ccc;font-size:12px;font-style:italic;margin-top:8px;line-height:1.6">"'+escapeHtml(d.lore)+'"</p><p class="text-muted text-xs" style="margin-top:6px">📖 도감에 기록되었습니다</p></div>',
          [{label:'확인', action:'closeModal()'}]);
        playSFX('buff');
      });

      window.socket.on('auto_potion_status', (d) => {
        document.getElementById('btn-potion').textContent = 'AutoPot ' + (d.enabled ? 'ON' : 'OFF');
      });

      // 스탯 결과
      window.socket.on('stat_result', (d) => {
        document.getElementById('stat-points').textContent = d.statPoints;
        document.getElementById('stat-str').textContent = '+' + d.str;
        document.getElementById('stat-dex').textContent = '+' + d.dex;
        document.getElementById('stat-int').textContent = '+' + d.int;
        document.getElementById('stat-con').textContent = '+' + d.con;
      });

      // 전직 결과
      window.socket.on('advance_result', (d) => { showToast(d.msg); if(d.success) playSFX('levelup'); });

      // 혈맹
      window.socket.on('clan_result', (d) => showToast(d.msg));
      window.socket.on('clan_list', (list) => {
        var el = document.getElementById('clan-list');
        if (!list.length) { el.innerHTML = '<p style="color:#888">혈맹이 없습니다</p>'; return; }
        var html = '';
        list.forEach(c => {
          var skillsStr = c.skills && c.skills.length > 0 ? '<br><small style="color:#88f">스킬: '+c.skills.join(', ')+'</small>' : '';
          html += '<div class="panel-item"><span class="name">['+escapeHtml(c.name)+'] Lv.'+c.level+' (EXP:'+c.exp+')<br><small style="color:#888">군주:'+escapeHtml(c.leader)+' ('+c.memberCount+'/'+c.maxMembers+'명)</small>'+skillsStr+'</span><button onclick="window.socket.emit(\'join_clan\',\''+escapeHtml(c.name)+'\')">가입</button></div>';
        });
        el.innerHTML = html;
      });

      // 파티
      window.socket.on('party_result', (d) => {
        showToast(d.msg);
        if (d.success) {
          var el = document.getElementById('party-status');
          el.style.display = 'block';
          el.textContent = '파티: ' + d.msg;
        }
      });
      window.socket.on('party_info', (d) => {
        var el = document.getElementById('party-status');
        if (!d) { el.style.display = 'none'; return; }
        el.style.display = 'block';
        if (d.memberNames && Array.isArray(d.memberNames)) {
          var html = '<b style="color:#ffd700">' + (d.name||'파티') + '</b><br>';
          d.memberNames.forEach(function(m) {
            if (typeof m === 'object') {
              var hpPct = Math.floor(m.hp/m.maxHp*100);
              var hpColor = hpPct > 50 ? '#4f4' : hpPct > 20 ? '#ff0' : '#f44';
              html += (m.isLeader ? '★ ' : '  ') + escapeHtml(m.name) + ' Lv.' + m.level + ' <span style="color:'+hpColor+'">HP:'+hpPct+'%</span><br>';
            } else {
              html += '  ' + m + '<br>';
            }
          });
          html += '<button onclick="window.socket.emit(\'leave_party\')" style="margin-top:4px;padding:3px 8px;background:#a33;color:#fff;border:none;border-radius:3px;font-size:10px;cursor:pointer">탈퇴</button>';
          el.innerHTML = html;
        }
      });

      // 낮/밤
      window.socket.on('day_night', (d) => {
        document.getElementById('unity-container').style.filter = d.isNight ? 'brightness(0.6) saturate(0.7)' : 'none';
      });

      // 창고
      window.socket.on('warehouse_data', (d) => { showToast('창고 업데이트'); });

      // 교역 가격
      window.socket.on('town_prices', renderTownPrices);
      window.socket.on('trade_goods_result', (d) => { showToast(d.msg); if(d.success) playSFX('gold'); });
      // 테이밍
      window.socket.on('tame_result', (d) => { showToast(d.msg); if(d.success) playSFX('levelup'); else playSFX('hit'); });
      // 제작
      window.socket.on('craft_result', (d) => { showToast(d.msg); playSFX(d.success ? 'levelup' : 'die'); });
      // 펫/탈것
      window.socket.on('pet_result', (d) => { showToast(d.msg); if(d.success) playSFX('levelup'); });
      window.socket.on('mount_result', (d) => { showToast(d.msg); if(d.success) playSFX('gold'); });
      // 버프
      window.socket.on('buff_result', (d) => { showToast(d.msg); });
      // 공성전
      window.socket.on('siege_result', (d) => showToast(d.msg));
      // 1:1 거래
      window.socket.on('trade_result', (d) => showToast(d.msg));
      window.socket.on('trade_incoming', (d) => {
        showModal('거래 요청', '<p><b style="color:#ffd700">'+escapeHtml(d.fromName)+'</b>님이 거래를 요청합니다.</p><input id="trade-my-item" placeholder="보낼 아이템 ID (선택)" style="width:100%;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin-top:8px">', [
          {label:'수락', action:"var item=getModalInput('trade-my-item');window.socket.emit('trade_accept',JSON.stringify({fromId:'"+d.fromId+"',myItem:item||'',theirItem:''}));closeModal();"},
          {label:'거절', type:'cancel', action:'closeModal()'}
        ]);
        playSFX('buff');
      });

      window.socket.on('inventory_data', renderInventory);
      window.socket.on('inventory_update', (d) => { if(d.inventory) showToast('인벤토리 업데이트!'); });
      window.socket.on('market_data', renderMarket);
      window.socket.on('market_update', renderMarket);
      window.socket.on('quest_data', renderQuests);
      window.socket.on('unit_data', renderUnits);
      window.socket.on('ranking_data', renderRanking);

      window.socket.on('player_die', (d) => {
        // 내가 죽으면 클래스 선택 다시 표시
        // Unity 측에서 처리하므로 여기서는 패스
      });
    }
