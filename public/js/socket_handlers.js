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
          // 환경 이펙트 업데이트
          if (z !== lastZone) {
            if (typeof onZoneChange === 'function') onZoneChange(z);
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
          // 낮/밤 오버레이 효과
          if (typeof updateDayNightOverlay === 'function') {
            if (data.worldTime !== undefined) {
              var DAY_CYCLE_DN = 600;
              var pctDN = (data.worldTime % DAY_CYCLE_DN) / DAY_CYCLE_DN;
              var phase = data.isNight ? 'night' : (pctDN < 0.15 ? 'dawn' : pctDN > 0.4 ? 'sunset' : 'day');
              updateDayNightOverlay(phase);
            } else {
              updateDayNightOverlay(data.isNight ? 'night' : 'day');
            }
          }
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
        showFloatingDamage(d.damage, d.isCrit, d.skillName, d.element || 'normal');
        // DPS 샘플 기록
        dpsSamples.push({ time: Date.now(), damage: d.damage || 0 });
        // 크리 화면 플래시
        if (d.isCrit) showCritFlash();
        // 힐 이펙트
        if (d.isHeal && typeof showHealEffect === 'function') showHealEffect();
      });
      window.socket.on('monster_hit', (d) => {
        showFloatingDamage(d.damage, d.isCrit || false, d.skillName || null, d.element || 'normal');
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

        // 마법진 이펙트 (스킬 속성에 따라)
        if (typeof showMagicCircle === 'function') {
          var skillElement = d.element || '';
          var SKILL_ELEMENTS = {
            '파이어볼':'fire', '메테오':'fire', '체인 라이트닝':'lightning',
            '아이스 볼트':'ice', '홀리 라이트':'holy', '대천사 강림':'holy',
            '그림자 일격':'dark', '암살':'dark', '정화':'holy',
            '독 바르기':'poison', '마나 재생':'ice', '신성 방벽':'holy',
          };
          var elem = skillElement || SKILL_ELEMENTS[d.skillName] || '';
          if (d.type === 'aoe' || d.type === 'chain' || d.type === 'ally_invincible') {
            showMagicCircle(elem, 160);
          } else if (d.type !== 'stealth') {
            showMagicCircle(elem, 100);
          }
          // 속성별 SFX
          if (typeof playSFX2 === 'function') {
            if (elem === 'fire') playSFX2('fireball');
            else if (elem === 'ice') playSFX2('ice_spell');
            else if (elem === 'lightning') playSFX2('thunder');
            else if (elem === 'dark') playSFX2('dark_magic');
            else if (elem === 'holy') playSFX2('holy_light');
          }
        }
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
        // 보스 등장 시네마틱
        if (typeof showBossEntrance === 'function') {
          showBossEntrance(d.name, d.subtitle || '— 공포의 지배자 —');
        } else {
          showToast('[월드 보스] ' + d.name + ' 출현!');
        }
        if (typeof playSFX2 === 'function') playSFX2('boss_roar');
        else playSFX('levelup');
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
            // 등급별 축하 이펙트
            if (typeof celebrateRareDrop === 'function') {
              if (d.tier === 'mythic') celebrateRareDrop('mythic');
              else if (d.tier === 'legendary') celebrateRareDrop('legendary');
              else if (d.tier === 'boss') celebrateRareDrop('epic');
            }
            // 등급별 토스트
            if (typeof showFantasyToast === 'function') {
              showFantasyToast(name + ' 처치! +'+(d.goldEarned||0)+'G', d.tier === 'mythic' ? 'mythic' : d.tier === 'legendary' ? 'legendary' : 'epic');
            }
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
          if (typeof playSFX2 === 'function') playSFX2('enchant');
          playSFX('boss'); playSFX('levelup');
          document.getElementById('unity-container').classList.add('shake');
          setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 500);
          showFloatingDamage(d.jackpot, true, null, 'holy');
          if (typeof celebrateRareDrop === 'function') celebrateRareDrop('legendary');
        } else if (d.success) {
          if (typeof playSFX2 === 'function') playSFX2('enchant');
          else playSFX('levelup');
          if (typeof showMagicCircle === 'function') showMagicCircle('holy', 80);
        } else {
          playSFX('die');
        }
      });

      // 보스 카운트다운
      // 보스 페이즈
      window.socket.on('boss_phase', (d) => {
        var phaseNames = { enrage:'분노', desperate:'필사' };
        addCombatLog('[보스] ' + (phaseNames[d.phase]||d.phase) + ' 페이즈!', 'log-crit');
        if (typeof showFantasyToast === 'function') {
          showFantasyToast('[보스] ' + (phaseNames[d.phase]||d.phase) + ' 페이즈!', 'legendary');
        } else {
          showToast(d.msg);
        }
        if (typeof playSFX2 === 'function') playSFX2('boss_roar');
        else playSFX('boss');
        document.getElementById('unity-container').classList.add('shake');
        setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 500);
        // 보스 분노 시 비네팅 강화
        if (typeof updateVignette === 'function') updateVignette('danger');
      });

      // 날씨
      window.socket.on('weather_change', (d) => {
        var overlays = { clear:'none', rain:'sepia(0.1) brightness(0.9)', fog:'contrast(0.8) brightness(0.85)', snow:'saturate(0.5) brightness(1.1)', storm:'contrast(1.2) brightness(0.7)' };
        document.getElementById('unity-container').style.filter = overlays[d.id] || 'none';
        if (d.id !== 'clear') {
          var weatherIcons = { rain:'🌧', fog:'🌫', snow:'❄', storm:'⛈' };
          showToast((weatherIcons[d.id]||'') + ' [날씨] ' + d.name);
        }
        currentWeather = d;
        startWeatherParticles(d.id);
        // 폭풍우 진입 시 번개 한 번
        if (d.id === 'storm' && typeof showLightningFlash === 'function') {
          setTimeout(function() { showLightningFlash(); }, 500);
        }
      });

      // 캐릭터 프로필
      window.socket.on('profile_data', (d) => {
        var el = document.getElementById('profile-body');
        if (!el) return;
        var gradeColors = {normal:'#ccc',uncommon:'#4c4',rare:'#48f',epic:'#a4f',legendary:'#f80'};
        var html = '<div style="text-align:center;margin-bottom:12px">';
        html += '<div class="text-gold" style="font-size:16px;font-weight:900">' + d.name + '</div>';
        html += '<div class="text-muted text-sm">' + (d.awakenedClass||d.advancedClass||d.class) + ' Lv.' + d.level;
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

      // 2차 각성 선택 (v2.38)
      window.socket.on('awaken_options', (options) => {
        var html = '<p style="margin-bottom:10px;color:#ff8800;font-size:12px;font-weight:bold">⚡ Lv.40 2차 각성 — 궁극의 클래스로 진화하세요 (되돌릴 수 없음!)</p>';
        var btns = options.map(function(o) {
          return { label: o.name, action: "window.socket.emit('class_awaken'," + o.idx + ");closeModal();" };
        });
        btns.push({label:'취소',type:'cancel',action:'closeModal()'});
        showModal('⚡ 2차 각성', html + options.map(function(o) {
          return '<div class="card" style="margin-bottom:8px;border-left:3px solid '+(o.color||'#ffd700')+'">' +
            '<b style="color:'+(o.color||'#ffd700')+';font-size:14px">' + o.name + '</b>' +
            '<div class="text-sm text-muted" style="margin:3px 0">' + o.desc + '</div>' +
            '<div class="text-xs" style="color:#aaa">' + o.stats + '</div>' +
            (o.passive ? '<div class="text-xs" style="color:#ff8800;margin-top:4px">' + o.passive + '</div>' : '') +
            (o.skill ? '<div class="text-xs" style="color:#ff4444;margin-top:2px">' + o.skill + '</div>' : '') +
            '</div>';
        }).join(''), btns);
      });

      // 각성 결과
      window.socket.on('awaken_result', (d) => {
        if (d.success) {
          showToast('⚡ ' + d.msg);
          playSFX('levelup'); playSFX('boss');
        } else {
          showToast(d.msg);
        }
      });

      // ── 금지된 마법서 (v2.39) ──
      window.socket.on('grimoire_status', (data) => {
        var tierColors = {1:'#88ccff', 2:'#aa44ff', 3:'#ff4444'};
        var tierNames = {1:'고대', 2:'금단', 3:'금기'};
        var html = '<div style="margin-bottom:10px;text-align:center">' +
          '<div style="color:#ff4400;font-size:14px;font-weight:bold">숙련도: ' + data.masteryName + ' (Lv.' + data.masteryLevel + ')</div>' +
          '<div class="text-xs text-muted">EXP: ' + data.mastery + ' / ' + data.nextMasteryExp + ' | 대가 감소: ' + data.masteryBonus + '%</div>' +
          '</div>';

        // 수집된 마법서
        var collected = data.grimoires.filter(function(g){ return g.collected; });
        var uncollected = data.grimoires.filter(function(g){ return !g.collected; });

        if (collected.length > 0) {
          html += '<div style="margin-bottom:6px;color:#ffd700;font-size:12px;font-weight:bold">보유 마법서</div>';
          collected.forEach(function(g) {
            var borderColor = tierColors[g.tier] || '#888';
            html += '<div class="card" style="margin-bottom:6px;border-left:3px solid '+borderColor+';padding:8px">' +
              '<div style="display:flex;justify-content:space-between;align-items:center">' +
              '<b style="color:'+borderColor+'">' + g.icon + ' ' + g.name + ' <span style="font-size:9px;opacity:0.7">['+tierNames[g.tier]+']</span></b>';
            if (g.deciphered) {
              if (g.cooldown > 0) {
                html += '<span class="text-xs" style="color:#888">CD: '+g.cooldown+'초</span>';
              } else {
                html += '<button class="btn btn-sm" style="background:#ff4400;color:#fff;font-size:10px;padding:2px 8px" onclick="window.socket.emit(\'grimoire_cast\',\''+g.id+'\');closeModal();">시전</button>';
              }
            } else if (g.deciphering > 0) {
              html += '<span class="text-xs" style="color:#ffd700">해독 중... '+g.deciphering+'초</span>' +
                '<button class="btn btn-sm" style="font-size:10px;padding:2px 6px;margin-left:4px" onclick="window.socket.emit(\'grimoire_check_decipher\',\''+g.id+'\');">확인</button>';
            } else {
              html += '<button class="btn btn-sm" style="background:#6c5ce7;color:#fff;font-size:10px;padding:2px 8px" onclick="window.socket.emit(\'grimoire_decipher\',\''+g.id+'\');">해독</button>';
            }
            html += '</div>' +
              '<div class="text-xs text-muted" style="margin-top:3px">' + g.desc + '</div>' +
              '<div class="text-xs" style="color:#44ff44;margin-top:2px">효과: ' + g.effectDesc + '</div>' +
              '<div class="text-xs" style="color:#ff6b6b;margin-top:1px">대가: ' + g.costDesc + '</div>' +
              (g.lore ? '<div class="text-xs" style="color:#666;font-style:italic;margin-top:2px">"' + g.lore + '"</div>' : '') +
              '</div>';
          });
        }

        // 미발견 마법서 (이름만)
        if (uncollected.length > 0) {
          html += '<div style="margin-top:10px;margin-bottom:6px;color:#888;font-size:12px">미발견 마법서 (' + uncollected.length + '종)</div>';
          uncollected.forEach(function(g) {
            html += '<div class="text-xs" style="color:#555;margin:2px 0">' + g.icon + ' ??? ['+tierNames[g.tier]+'] — 몬스터 드롭으로 획득</div>';
          });
        }

        showModal('📕 금지된 마법서', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('grimoire_result', (d) => showToast(d.msg));
      window.socket.on('grimoire_decipher_result', (d) => {
        if (d.completed) {
          showToast(d.msg);
          if (!d.failed) { playSFX('levelup'); }
          window.socket.emit('grimoire_status');
        } else if (d.remaining) {
          showToast('해독 진행 중... ' + d.remaining + '초 남음');
        }
      });
      window.socket.on('grimoire_cast_result', (d) => {
        if (d.success) {
          showToast(d.msg);
          playSFX('boss');
        } else {
          showToast(d.msg);
        }
      });
      window.socket.on('grimoire_drop', (d) => {
        showToast(d.icon + ' 금서 발견: ' + d.name + '!');
        playSFX('levelup');
      });

      // ── 운명의 별자리 (v2.40) ──
      window.socket.on('constellation_status_result', (data) => {
        var tierColors = {1:'#88ccff', 2:'#44aaff', 3:'#aa44ff', 4:'#ffd700'};
        var html = '<div style="text-align:center;margin-bottom:10px">' +
          '<div style="font-size:14px;color:#ffd700">✨ 별가루: <b>' + data.stardust + '</b></div>' +
          '<div class="text-xs text-muted">노드: ' + data.totalNodesUnlocked + '/60' +
          (data.grandMaster ? ' <span style="color:#ffd700">🌌 별의 지배자!</span>' : '') + '</div>' +
          '</div>';

        // 오늘의 별자리
        var t = data.today;
        html += '<div class="card" style="margin-bottom:8px;border:1px solid #ffd700;padding:8px;text-align:center">' +
          '<div style="font-size:20px">' + t.icon + '</div>' +
          '<div style="color:#ffd700;font-size:13px">' + t.name + ' (오늘)</div>' +
          '<div class="text-xs text-muted">+' + t.value + ' ' + t.stat + ' (24시간)</div>';
        if (data.observedToday) {
          html += '<div class="text-xs" style="color:#44ff44;margin-top:4px">✓ 관측 완료</div>';
        } else {
          html += '<button class="btn btn-sm" style="margin-top:4px;background:#6c5ce7;color:#fff" onclick="window.socket.emit(\'constellation_observe\');closeModal();">관측하기 (+15 별가루)</button>';
        }
        html += '</div>';

        // 활성 버프
        if (data.activeBuff) {
          html += '<div class="text-xs" style="color:#88ccff;margin-bottom:8px;text-align:center">' +
            data.activeBuff.icon + ' 활성: +' + data.activeBuff.value + ' ' + data.activeBuff.stat +
            ' (' + Math.ceil((data.activeBuff.expiresAt - Date.now()) / 3600000) + '시간 남음)</div>';
        }

        // 12궁 패시브 트리
        html += '<div style="margin-top:8px;font-size:12px;color:#ffd700;font-weight:bold;margin-bottom:6px">12궁 패시브 트리</div>';
        var zodiacOrder = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
        var constMap = {};
        data.allConstellations.forEach(function(c){ constMap[c.id] = c; });

        zodiacOrder.forEach(function(zId) {
          var zs = data.zodiacStatus[zId];
          var info = constMap[zId];
          if (!info || !zs) return;
          var isComplete = zs.complete;
          var borderColor = isComplete ? '#ffd700' : '#333';
          html += '<div class="card" style="margin-bottom:4px;border-left:3px solid '+borderColor+';padding:6px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="color:'+(isComplete?'#ffd700':'#aaa')+';font-size:12px">' + info.icon + ' ' + info.name +
            ' <span style="font-size:10px;color:#888">(' + zs.unlocked + '/' + zs.total + ')</span></span>';
          if (isComplete && zs.completeBonus) {
            html += '<span class="text-xs" style="color:#ffd700">' + zs.completeBonus.desc + '</span>';
          }
          html += '</div>';

          // 노드들
          html += '<div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap">';
          zs.nodes.forEach(function(n) {
            var bg = n.unlocked ? '#2a5a2a' : n.available ? '#3a3a5a' : '#1a1a2a';
            var color = n.unlocked ? '#44ff44' : n.available ? '#88ccff' : '#555';
            var cursor = n.available && !n.unlocked ? 'pointer' : 'default';
            var onClick = n.available && !n.unlocked
              ? 'onclick="window.socket.emit(\'constellation_unlock\',\''+n.id+'\');closeModal();"'
              : '';
            var tierIcon = n.ultimate ? '⭐' : n.tier >= 3 ? '★' : '·';
            html += '<div style="background:'+bg+';color:'+color+';font-size:9px;padding:3px 6px;border-radius:3px;cursor:'+cursor+';border:1px solid '+(n.unlocked?'#44ff44':n.available?'#88ccff':'#333')+'" title="'+n.name+': '+n.desc+' ('+n.cost+' 별가루)" '+onClick+'>' +
              tierIcon + ' ' + n.name + (n.unlocked ? ' ✓' : n.available ? ' ['+n.cost+']' : '') + '</div>';
          });
          html += '</div></div>';
        });

        // 관측 도감
        html += '<div style="margin-top:8px;font-size:11px;color:#888">관측 도감: ' + data.collectedCount + '/' + data.totalCount;
        if (data.masterBonus) html += ' <span style="color:#ffd700">(별의 인도자 +' + data.masterBonus.value + ' 전 스탯)</span>';
        html += '</div>';

        showModal('🌌 운명의 별자리', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('constellation_result', (d) => {
        showToast(d.msg);
        if (d.success) playSFX('gold');
      });

      window.socket.on('constellation_unlock_result', (d) => {
        if (d.success) {
          showToast(d.msg);
          playSFX('levelup');
          window.socket.emit('constellation_status');
        } else {
          showToast(d.msg);
        }
      });

      // ── 예언의 타로 (v2.41) ──
      window.socket.on('tarot_status_result', (data) => {
        var rarityColors = {rare:'#44aaff', epic:'#aa44ff', legendary:'#ffd700'};
        var html = '<div style="text-align:center;margin-bottom:10px">' +
          '<div style="font-size:14px;color:#aa44ff">🔮 ' + data.fateLine + '</div>' +
          '<div class="text-xs text-muted">운명 점수: ' + data.fateScore + ' | 총 ' + data.readings + '회 점술</div>' +
          '</div>';

        // 오늘의 카드
        if (!data.readToday) {
          html += '<div style="text-align:center;margin:12px 0">' +
            '<button class="btn" style="background:linear-gradient(135deg,#6c5ce7,#aa44ff);color:#fff;padding:10px 30px;font-size:14px" ' +
            'onclick="window.socket.emit(\'tarot_read\');closeModal();">카드 뽑기 (3장)</button></div>';
        } else if (data.lastReading) {
          html += '<div style="display:flex;gap:6px;justify-content:center;margin:8px 0">';
          var positions = ['과거','현재','미래'];
          data.lastReading.cards.forEach(function(c, i) {
            var borderColor = c.reversed ? '#ff4444' : '#44ff44';
            html += '<div style="flex:1;background:#1a1a2e;border:2px solid '+borderColor+';border-radius:8px;padding:8px;text-align:center">' +
              '<div class="text-xs" style="color:#888">' + positions[i] + '</div>' +
              '<div style="font-size:24px;margin:4px 0">' + c.card.icon + '</div>' +
              '<div style="font-size:11px;color:'+borderColor+'">' + c.card.name + '</div>' +
              '<div class="text-xs" style="color:#aaa">' + (c.reversed ? '역: '+c.card.reversed : c.card.upright) + '</div>' +
              '</div>';
          });
          html += '</div>';

          // 활성 보너스
          if (data.activeBonus && data.activeBonus.stats) {
            var bonusText = Object.entries(data.activeBonus.stats).filter(function(e){return e[1]!==0;}).map(function(e){
              return e[0] + (e[1]>0?'+':'')+e[1];
            }).join(', ');
            if (bonusText) html += '<div class="text-xs" style="color:#88ccff;text-align:center;margin:4px 0">카드 보너스: ' + bonusText + '</div>';
          }

          // 조합 보너스
          if (data.comboBonus) {
            html += '<div class="card" style="border:1px solid '+(rarityColors[data.comboBonus.rarity]||'#888')+';margin:6px 0;padding:6px;text-align:center">' +
              '<div style="color:'+(rarityColors[data.comboBonus.rarity]||'#ffd700')+';font-size:13px">' + data.comboBonus.icon + ' ' + data.comboBonus.name + '</div>' +
              '<div class="text-xs text-muted">' + Object.entries(data.comboBonus.bonus).map(function(e){return e[0]+'+'+e[1];}).join(', ') + '</div>' +
              '</div>';
          }

          // 운명의 도전 / 역방향 수용 버튼
          var actionHtml = '<div style="display:flex;gap:6px;justify-content:center;margin:8px 0">';
          if (data.canGambit) {
            actionHtml += '<button class="btn btn-sm" style="background:#ff8800;color:#fff" onclick="window.socket.emit(\'tarot_gambit\');closeModal();">🎲 운명의 도전</button>';
          }
          if (data.canReversedChallenge) {
            actionHtml += '<button class="btn btn-sm" style="background:#8844aa;color:#fff" onclick="window.socket.emit(\'tarot_embrace_reversed\');closeModal();">🖤 역방향 수용</button>';
          }
          actionHtml += '</div>';
          html += actionHtml;
        }

        // 역방향 보너스
        if (data.reversedBonus && data.reversedBonus.stats) {
          var rText = Object.entries(data.reversedBonus.stats).map(function(e){return e[0]+'+'+e[1];}).join(', ');
          if (rText) html += '<div class="text-xs" style="color:#8844aa;text-align:center">역방향 보상: ' + rText + '</div>';
        }

        // 마일스톤
        html += '<div style="margin-top:10px;font-size:12px;color:#ffd700;font-weight:bold;margin-bottom:4px">운명 마일스톤</div>';
        data.milestones.forEach(function(m) {
          var bg = m.claimed ? '#2a5a2a' : m.achieved ? '#3a3a5a' : '#1a1a2a';
          var color = m.claimed ? '#44ff44' : m.achieved ? '#ffd700' : '#555';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;background:'+bg+';border-radius:3px;margin:2px 0">' +
            '<span style="color:'+color+';font-size:10px">' + m.icon + ' ' + m.name + ' ('+m.score+'점) — ' + m.desc + '</span>';
          if (m.achieved && !m.claimed) {
            html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 6px;background:#ffd700;color:#000" onclick="window.socket.emit(\'tarot_claim_milestone\','+m.score+');closeModal();">수령</button>';
          } else if (m.claimed) {
            html += '<span class="text-xs" style="color:#44ff44">✓</span>';
          }
          html += '</div>';
        });

        // 발견된 조합
        var triggeredCombos = data.allCombos.filter(function(c){return c.triggered;});
        if (triggeredCombos.length > 0 || data.allCombos.length > 0) {
          html += '<div style="margin-top:8px;font-size:12px;color:#aa44ff;font-weight:bold;margin-bottom:4px">카드 조합 (' + triggeredCombos.length + '/' + data.allCombos.length + ')</div>';
          data.allCombos.forEach(function(c) {
            var color = c.triggered ? (rarityColors[c.rarity]||'#888') : '#444';
            html += '<div class="text-xs" style="color:'+color+';margin:1px 0">' +
              c.icon + ' ' + (c.triggered ? c.name + ' — ' + c.desc : '??? [' + c.rarity + ']') +
              (c.count > 0 ? ' ('+c.count+'회)' : '') + '</div>';
          });
        }

        showModal('🔮 예언의 타로', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('tarot_result', (d) => {
        if (d.success) {
          showToast('🔮 ' + d.msg);
          playSFX('gold');
          window.socket.emit('tarot_status');
        } else {
          showToast(d.msg);
        }
      });

      window.socket.on('tarot_gambit_result', (d) => {
        if (d.success) {
          showToast(d.msg);
          if (d.won) playSFX('levelup');
          else playSFX('boss');
          window.socket.emit('tarot_status');
        } else {
          showToast(d.msg);
        }
      });

      window.socket.on('tarot_embrace_result', (d) => {
        if (d.success) {
          showToast(d.msg);
          playSFX('gold');
          window.socket.emit('tarot_status');
        } else {
          showToast(d.msg);
        }
      });

      window.socket.on('tarot_milestone_result', (d) => {
        if (d.success) {
          showToast(d.msg);
          playSFX('levelup');
          window.socket.emit('tarot_status');
        } else {
          showToast(d.msg);
        }
      });

      // ── 고대 혈맹 (v2.42) ──
      window.socket.on('bloodline_status_result', (data) => {
        var html = '';

        if (!data.hasBloodline) {
          // 혈통 선택 화면
          html += '<div style="text-align:center;margin-bottom:10px">' +
            '<div style="color:#ff4400;font-size:14px;font-weight:bold">고대의 피가 깨어나려 한다...</div>' +
            '<div class="text-xs text-muted">' + (data.canChoose ? '혈통을 선택하세요 (한 번 선택하면 변경 불가!)' : 'Lv.25 이상 필요') + '</div></div>';

          var types = ['dragon','angel','demon','spirit'];
          types.forEach(function(t) {
            var b = data.available[t];
            html += '<div class="card" style="margin-bottom:6px;border-left:3px solid '+b.color+';padding:8px;cursor:'+(data.canChoose?'pointer':'default')+'"' +
              (data.canChoose ? ' onclick="window.socket.emit(\'bloodline_choose\',\''+t+'\');closeModal();"' : '') + '>' +
              '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:24px">'+b.icon+'</span>' +
              '<div><b style="color:'+b.color+';font-size:13px">'+b.name+'</b>' +
              '<div class="text-xs text-muted">'+b.desc+'</div>' +
              '<div class="text-xs" style="color:#888;font-style:italic;margin-top:2px">"'+b.lore+'"</div></div></div></div>';
          });
        } else {
          // 혈통 상태
          html += '<div style="text-align:center;margin-bottom:10px">' +
            '<div style="font-size:28px">'+data.icon+'</div>' +
            '<div style="color:'+data.color+';font-size:16px;font-weight:bold">'+data.name+'</div>' +
            '<div class="text-xs" style="color:#aaa">'+data.stageName+' ('+data.stage+'/3단계)</div>' +
            '<div class="text-xs text-muted" style="margin-top:2px">'+data.stageDesc+'</div>' +
            '<div class="text-xs" style="color:#888;margin-top:4px">상성: '+data.matchup+'</div>' +
            '</div>';

          // 변신
          if (data.transformInfo) {
            html += '<div class="card" style="margin-bottom:6px;border:1px solid '+data.color+';padding:6px;text-align:center">';
            if (data.transformActive) {
              html += '<div style="color:'+data.color+';font-size:12px">'+data.transformInfo.name+' 활성! ('+data.transformRemaining+'초)</div>';
            } else if (data.canTransform) {
              html += '<button class="btn" style="background:'+data.color+';color:#fff;width:100%" onclick="window.socket.emit(\'bloodline_transform\');closeModal();">'+data.transformInfo.name+' ('+data.transformInfo.duration+'초)</button>';
            } else if (data.transformCdRemain > 0) {
              html += '<div class="text-xs" style="color:#888">변신 쿨다운: '+data.transformCdRemain+'초</div>';
            } else {
              html += '<div class="text-xs" style="color:#555">3단계 각성 필요</div>';
            }
            html += '<div class="text-xs text-muted" style="margin-top:2px">'+data.transformInfo.desc+'</div></div>';
          }

          // 스킬
          if (data.skills.length > 0) {
            html += '<div style="font-size:11px;color:'+data.color+';font-weight:bold;margin:6px 0 4px">혈맹 스킬</div>';
            data.skills.forEach(function(sk) {
              var bg = sk.locked ? '#1a1a1a' : sk.available ? '#2a2a4a' : '#1a1a2a';
              var color = sk.locked ? '#555' : sk.available ? data.color : '#888';
              html += '<div style="display:flex;justify-content:space-between;align-items:center;background:'+bg+';padding:4px 8px;border-radius:4px;margin:2px 0">' +
                '<div><span style="color:'+color+';font-size:11px">'+sk.name+'</span>' +
                '<div class="text-xs" style="color:#888">'+sk.desc+' (CD:'+sk.cd+'초, MP:'+sk.mpCost+')</div></div>';
              if (sk.available) {
                html += '<button class="btn btn-sm" style="background:'+data.color+';color:#fff;font-size:9px;padding:2px 8px" onclick="window.socket.emit(\'bloodline_skill\','+sk.index+');closeModal();">시전</button>';
              } else if (sk.cdRemain > 0) {
                html += '<span class="text-xs" style="color:#888">'+sk.cdRemain+'초</span>';
              } else if (sk.locked) {
                html += '<span class="text-xs" style="color:#555">잠김</span>';
              }
              html += '</div>';
            });
          }

          // 각성
          if (data.nextStage) {
            var ns = data.nextStage;
            html += '<div style="margin-top:8px;border-top:1px solid #333;padding-top:6px">' +
              '<div style="font-size:11px;color:#ffd700;font-weight:bold">다음 각성: '+ns.name+'</div>' +
              '<div class="text-xs text-muted">Lv.'+ns.reqLevel+' | '+Object.entries(ns.cost).map(function(e){return e[0]+': '+e[1];}).join(', ')+'</div>' +
              '<div class="text-xs" style="color:#aaa;margin-top:2px">'+ns.desc+'</div>';
            if (data.canAwaken) {
              html += '<button class="btn" style="width:100%;margin-top:4px;background:#ffd700;color:#000" onclick="window.socket.emit(\'bloodline_awaken\');closeModal();">각성!</button>';
            }
            html += '</div>';
          }
        }

        showModal('🩸 고대 혈맹', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('bloodline_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('levelup'); window.socket.emit('bloodline_status'); }
      });

      window.socket.on('bloodline_skill_result', (d) => {
        if (d.success) { showToast(d.msg); playSFX('boss'); }
        else showToast(d.msg);
      });

      // ── 영혼 계약 (v2.43) ──
      window.socket.on('soul_status_result', (data) => {
        var tierColors = {1:'#88ccff', 2:'#aa44ff', 3:'#ff4400'};
        var tierNames = {1:'필드', 2:'던전', 3:'월드'};
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#aa44ff;font-size:14px;font-weight:bold">👻 영혼 계약</div>' +
          '<div class="text-xs text-muted">계약: '+data.totalContracts+' | 소환: '+data.totalSummons+'회 | 총 '+data.totalSouls+'종</div></div>';

        // 활성 소환수
        if (data.activeSummon) {
          var as = data.activeSummon;
          html += '<div class="card" style="border:2px solid #ffd700;padding:6px;margin-bottom:8px;text-align:center">' +
            '<div style="font-size:20px">'+as.icon+'</div>' +
            '<div style="color:#ffd700;font-size:12px">'+as.name+' 소환 중 ('+as.remaining+'초)</div>' +
            '<button class="btn btn-sm" style="background:#ff4400;color:#fff;margin-top:4px'+(as.skillCdRemain>0?';opacity:0.5':'')+'" ' +
            (as.skillCdRemain>0?'disabled':'onclick="window.socket.emit(\'soul_skill\');closeModal();"') +
            '>'+(as.skillCdRemain>0?'스킬 CD: '+as.skillCdRemain+'초':'스킬 발동!')+'</button></div>';
        }

        // 계약된 영혼
        if (data.contracted.length > 0) {
          html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin-bottom:4px">계약된 영혼</div>';
          data.contracted.forEach(function(c) {
            html += '<div class="card" style="margin-bottom:4px;border-left:3px solid '+c.color+';padding:6px">' +
              '<div style="display:flex;justify-content:space-between;align-items:center">' +
              '<div><span style="color:'+c.color+';font-size:12px">'+c.icon+' '+c.name+' Lv.'+c.level+' <span class="text-xs" style="color:#888">['+tierNames[c.tier]+']</span></span>' +
              '<div class="text-xs text-muted">'+c.desc+'</div>' +
              '<div class="text-xs" style="color:#aaa">ATK:'+c.stats.atk+' DEF:'+c.stats.def+' HP:'+c.stats.hp+' (x'+c.multi+'%)</div>' +
              '<div class="text-xs" style="color:#88ccff">스킬: '+c.skillName+' — '+c.skillDesc+'</div>' +
              '<div class="text-xs" style="color:#888">EXP: '+c.exp+'/'+c.nextExp+'</div></div>';
            if (!data.activeSummon) {
              html += '<button class="btn btn-sm" style="background:#6c5ce7;color:#fff;font-size:9px" onclick="window.socket.emit(\'soul_summon\',\''+c.id+'\');closeModal();">소환</button>';
            }
            html += '</div></div>';
          });
        }

        // 영혼 파편
        if (data.fragments.length > 0) {
          html += '<div style="font-size:11px;color:#aa44ff;font-weight:bold;margin:8px 0 4px">영혼 파편</div>';
          data.fragments.forEach(function(f) {
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;background:#1a1a2a;border-radius:3px;margin:2px 0">' +
              '<span style="color:'+f.color+';font-size:10px">'+f.icon+' '+f.name+' ('+f.count+'/'+f.needed+')</span>';
            if (f.canContract) {
              html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 6px;background:#ffd700;color:#000" onclick="window.socket.emit(\'soul_contract\',\''+f.id+'\');closeModal();">계약</button>';
            } else if (f.contracted) {
              html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 6px" onclick="window.socket.emit(\'soul_feed\',\''+f.id+'\');closeModal();">강화</button>';
            }
            html += '</div>';
          });
        }

        // 미발견
        if (data.undiscovered.length > 0) {
          html += '<div style="margin-top:6px;font-size:10px;color:#555">미발견: '+data.undiscovered.length+'종 — 보스/엘리트 처치 시 파편 드롭</div>';
        }

        showModal('👻 영혼 계약', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('soul_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('levelup'); window.socket.emit('soul_status'); }
      });
      window.socket.on('soul_skill_result', (d) => {
        if (d.success) { showToast(d.msg); playSFX('boss'); }
        else showToast(d.msg);
      });
      window.socket.on('soul_feed_result', (d) => {
        showToast(d.msg);
        if (d.success) window.socket.emit('soul_status');
      });
      window.socket.on('soul_fragment_drop', (d) => {
        showToast(d.icon + ' 영혼 파편: ' + d.name);
        playSFX('gold');
      });

      // ── 고대 언어 (v2.44) ──
      window.socket.on('ancient_lang_status_result', (data) => {
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#ffd700;font-size:14px;font-weight:bold">📜 '+data.masteryName+' (Lv.'+data.masteryLevel+')</div>' +
          '<div class="text-xs text-muted">EXP: '+data.mastery+'/'+data.nextMasteryExp+' | 데미지 +'+data.masteryBonus+'% | 주문 '+data.discoveredCount+'/'+data.totalSpells+'</div></div>';

        // 보유 문자
        html += '<div style="display:flex;gap:4px;justify-content:center;margin:8px 0;flex-wrap:wrap">';
        data.allGlyphs.forEach(function(g) {
          html += '<div style="text-align:center;padding:6px 10px;background:'+(g.count>0?'#2a2a4a':'#1a1a1a')+';border:1px solid '+(g.count>0?g.color:'#333')+';border-radius:6px;min-width:50px">' +
            '<div style="font-size:18px">'+g.icon+'</div>' +
            '<div style="font-size:9px;color:'+(g.count>0?g.color:'#555')+'">'+g.name+'</div>' +
            '<div style="font-size:12px;color:'+(g.count>0?'#fff':'#555')+';font-weight:bold">'+g.count+'</div></div>';
        });
        html += '</div>';

        // 주문 조합 인터페이스
        html += '<div style="margin:8px 0;padding:8px;background:#1a1a2e;border-radius:6px">' +
          '<div style="font-size:11px;color:#ffd700;margin-bottom:4px">주문 조합 (2~4문자 선택)</div>' +
          '<div id="spell-combo" style="display:flex;gap:4px;min-height:36px;background:#111;border-radius:4px;padding:4px;margin-bottom:6px;flex-wrap:wrap"></div>' +
          '<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:6px">';
        data.allGlyphs.forEach(function(g) {
          if (g.count <= 0) return;
          html += '<button class="btn btn-sm" style="background:'+g.color+'22;color:'+g.color+';border:1px solid '+g.color+'" ' +
            'onclick="window._addGlyph(\''+g.id+'\',\''+g.icon+'\',\''+g.color+'\')">' +
            g.icon+' '+g.name+'</button>';
        });
        html += '</div>' +
          '<div style="display:flex;gap:4px">' +
          '<button class="btn btn-sm" style="flex:1;background:#6c5ce7;color:#fff" onclick="window._castSpell()">시전!</button>' +
          '<button class="btn btn-sm" style="background:#444;color:#aaa" onclick="window._spellCombo=[];document.getElementById(\'spell-combo\').innerHTML=\'\'">초기화</button>' +
          '</div></div>';

        // 발견된 주문
        if (data.discovered.length > 0) {
          html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:6px 0 4px">발견된 주문 ('+data.discovered.length+')</div>';
          data.discovered.forEach(function(s) {
            var tierColor = s.tier===1?'#88ccff':s.tier===2?'#aa44ff':'#ffd700';
            html += '<div class="card" style="margin-bottom:3px;border-left:2px solid '+tierColor+';padding:4px 6px">' +
              '<div style="display:flex;justify-content:space-between">' +
              '<span style="color:'+tierColor+';font-size:10px">'+s.icon+' '+s.name+'</span>' +
              '<span class="text-xs" style="color:#888">'+s.castCount+'회'+(s.cdRemain>0?' CD:'+s.cdRemain+'초':'')+'</span></div>' +
              '<div class="text-xs text-muted">'+s.desc+'</div></div>';
          });
        }

        // 미발견
        var undi = data.undiscoveredByTier;
        if (undi[1]+undi[2]+undi[3] > 0) {
          html += '<div class="text-xs" style="color:#555;margin-top:6px">미발견: 기본 '+undi[1]+'종 / 상위 '+undi[2]+'종 / 궁극 '+undi[3]+'종</div>';
        }

        showModal('📜 고대 언어', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);

        // 조합 헬퍼
        window._spellCombo = [];
        window._addGlyph = function(id, icon, color) {
          if (window._spellCombo.length >= 4) return;
          window._spellCombo.push(id);
          var el = document.getElementById('spell-combo');
          if (el) el.innerHTML += '<span style="font-size:18px;padding:2px 6px;background:'+color+'22;border:1px solid '+color+';border-radius:4px">'+icon+'</span>';
        };
        window._castSpell = function() {
          if (window._spellCombo.length >= 2) {
            window.socket.emit('ancient_lang_cast', window._spellCombo);
            closeModal();
          } else {
            showToast('2개 이상 문자를 선택하세요');
          }
        };
      });

      window.socket.on('ancient_lang_result', (d) => {
        if (d.success) {
          showToast(d.msg);
          if (d.newDiscovery) playSFX('levelup');
          else playSFX('boss');
          window.socket.emit('ancient_lang_status');
        } else {
          showToast(d.msg);
        }
      });

      window.socket.on('glyph_drop', (d) => {
        showToast(d.icon + ' 고대 문자: ' + d.name);
      });

      // ── 신의 축복 (v2.45) ──
      window.socket.on('divine_status_result', (data) => {
        var html = '';

        if (!data.hasGod) {
          html += '<div style="text-align:center;margin-bottom:10px">' +
            '<div style="color:#ffd700;font-size:14px">어떤 신에게 귀의하시겠습니까?</div>' +
            '<div class="text-xs text-muted">신은 변경 가능하지만 신앙심 50% 감소</div></div>';
          data.gods.forEach(function(g) {
            html += '<div class="card" style="margin-bottom:6px;border-left:3px solid '+g.color+';padding:8px;cursor:pointer" onclick="window.socket.emit(\'divine_choose\',\''+g.id+'\');closeModal();">' +
              '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:24px">'+g.icon+'</span>' +
              '<div><b style="color:'+g.color+';font-size:13px">'+g.name+'</b> <span class="text-xs" style="color:#888">['+g.domain+']</span>' +
              '<div class="text-xs text-muted">'+g.desc+'</div>' +
              '<div class="text-xs" style="color:#666;font-style:italic">'+g.lore+'</div></div></div></div>';
          });
        } else {
          var g = data.god;
          var fr = data.faithRank;
          html += '<div style="text-align:center;margin-bottom:10px">' +
            '<div style="font-size:28px">'+g.icon+'</div>' +
            '<div style="color:'+g.color+';font-size:16px;font-weight:bold">'+g.name+'</div>' +
            '<div style="color:#ffd700;font-size:12px">'+fr.icon+' '+fr.name+' (신앙: '+data.faith+')</div>' +
            '<div class="text-xs" style="color:#888;font-style:italic">'+g.lore+'</div></div>';

          // 기도 & 기적
          html += '<div style="display:flex;gap:6px;margin:8px 0">';
          if (data.prayer.canPray) {
            html += '<button class="btn" style="flex:1;background:'+g.color+';color:#fff" onclick="window.socket.emit(\'divine_pray\');closeModal();">🙏 '+data.prayer.name+'</button>';
          } else {
            html += '<button class="btn" style="flex:1;opacity:0.5" disabled>🙏 기도 CD: '+data.prayer.cdRemain+'초</button>';
          }
          if (data.miracle.canUse) {
            html += '<button class="btn" style="flex:1;background:linear-gradient(135deg,'+g.color+',#ffd700);color:#fff" onclick="window.socket.emit(\'divine_miracle\');closeModal();">⚡ '+data.miracle.name+'</button>';
          } else {
            html += '<button class="btn" style="flex:1;opacity:0.5" disabled>⚡ 기적'+(data.miracle.cdRemain>0?' CD:'+data.miracle.cdRemain+'초':' ('+data.miracle.faithCost+'신앙)')+'</button>';
          }
          html += '</div>';
          html += '<div class="text-xs text-muted" style="text-align:center">기도: '+data.prayer.desc+' | 기적: '+data.miracle.desc+'</div>';

          // 공양
          html += '<div style="display:flex;gap:4px;margin:6px 0">' +
            '<button class="btn btn-sm" style="flex:1;background:#333" onclick="window.socket.emit(\'divine_offering\',\'gold\');closeModal();">💰 골드 공양 (10,000G→+5)</button>' +
            '<button class="btn btn-sm" style="flex:1;background:#333" onclick="window.socket.emit(\'divine_offering\',\'item\');closeModal();">💎 영혼석 공양 (+15)</button></div>';

          // 패시브
          html += '<div style="font-size:11px;color:'+g.color+';font-weight:bold;margin:8px 0 4px">신의 은총</div>';
          data.unlockedPassives.forEach(function(p) {
            html += '<div style="padding:2px 6px;background:#2a5a2a;border-radius:3px;margin:2px 0">' +
              '<span class="text-xs" style="color:#44ff44">✓ '+p.name+' ('+p.faith+') — '+p.desc+'</span></div>';
          });
          if (data.nextPassive) {
            html += '<div style="padding:2px 6px;background:#1a1a2a;border-radius:3px;margin:2px 0">' +
              '<span class="text-xs" style="color:#888">🔒 '+data.nextPassive.name+' ('+data.nextPassive.faith+' 필요) — '+data.nextPassive.desc+'</span></div>';
          }
        }

        showModal('🙏 신의 축복', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('divine_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('levelup'); window.socket.emit('divine_status'); }
      });
      window.socket.on('divine_miracle_result', (d) => {
        if (d.success) { showToast(d.msg); playSFX('boss'); playSFX('levelup'); }
        else showToast(d.msg);
      });

      // ── 환생의 기억 (v2.46) ──
      window.socket.on('pastlife_status_result', (data) => {
        var tierColors = {rare:'#44aaff',epic:'#aa44ff',legendary:'#ffd700'};
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#aa44ff;font-size:14px;font-weight:bold">♻️ 환생의 기억</div>' +
          '<div class="text-xs text-muted">전생: '+data.totalLives+'회 | 기억: '+data.memories.length+'종 | 슬롯: '+data.equippedCount+'/'+data.memorySlots +
          (data.nextSlotAt ? ' ('+data.nextSlotAt+'회 환생 시 +1)' : ' (최대)') + '</div></div>';

        // 보유 기억 (장착/해제)
        if (data.memories.length > 0) {
          html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin-bottom:4px">보유 기억</div>';
          data.memories.forEach(function(m) {
            var bg = m.equipped ? '#2a3a2a' : '#1a1a2a';
            var border = m.equipped ? '#44ff44' : '#333';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:'+bg+';border:1px solid '+border+';border-radius:4px;margin:2px 0">' +
              '<div><span style="color:'+(m.color||'#aaa')+';font-size:11px">'+m.icon+' '+m.name+' <span style="color:#888;font-size:9px">x'+m.count+' ('+m.multi+'%)</span></span>' +
              '<div class="text-xs text-muted">'+m.desc+' — '+m.stat+' +'+(typeof m.baseValue==='number'&&m.baseValue<1?Math.floor(m.baseValue*100)+'%':m.baseValue)+'</div></div>';
            if (m.equipped) {
              html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 6px;background:#444" onclick="window.socket.emit(\'pastlife_unequip\',\''+m.id+'\');closeModal();">해제</button>';
            } else {
              html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 6px;background:#6c5ce7;color:#fff" onclick="window.socket.emit(\'pastlife_equip\',\''+m.id+'\');closeModal();">장착</button>';
            }
            html += '</div>';
          });
        } else {
          html += '<div class="text-xs text-muted" style="text-align:center;margin:12px 0">아직 전생의 기억이 없습니다.<br>Lv.50에서 환생하면 기억이 남습니다.</div>';
        }

        // 조합
        html += '<div style="font-size:11px;color:#aa44ff;font-weight:bold;margin:8px 0 4px">기억 조합 ('+data.activeCombos.length+'/'+data.combos.length+')</div>';
        data.combos.forEach(function(c) {
          var color = c.active ? (tierColors[c.tier]||'#888') : c.hasAll ? '#888' : '#444';
          var bg = c.active ? '#2a2a3a' : '#1a1a1a';
          html += '<div style="padding:3px 6px;background:'+bg+';border-radius:3px;margin:2px 0;border-left:2px solid '+color+'">' +
            '<div style="display:flex;justify-content:space-between">' +
            '<span style="color:'+color+';font-size:10px">'+c.icon+' '+(c.active||c.hasAll?c.name:'???')+' <span style="color:#555">['+c.tier+']</span></span>' +
            (c.active?'<span class="text-xs" style="color:#44ff44">활성</span>':'') + '</div>';
          if (c.active || c.hasAll) {
            html += '<div class="text-xs text-muted">'+c.desc+'</div>' +
              '<div class="text-xs" style="color:#666">필요: '+c.memories.map(function(m){return m.icon+m.name;}).join(' + ')+'</div>';
          } else {
            html += '<div class="text-xs" style="color:#555">기억 조건 미충족</div>';
          }
          html += '</div>';
        });

        showModal('♻️ 환생의 기억', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('pastlife_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('gold'); window.socket.emit('pastlife_status'); }
      });

      // ── 몬스터 변이 도감 (v2.47) ──
      window.socket.on('mutation_codex_result', (data) => {
        var tierNames = {1:'원소', 2:'특성', 3:'전설'};
        var tierColors = {1:'#44aaff', 2:'#aa44ff', 3:'#ffd700'};
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#ff44ff;font-size:14px;font-weight:bold">🧬 변이 도감</div>' +
          '<div class="text-xs text-muted">발견: '+data.discoveredCount+'/'+data.totalMutations+' ('+data.completionPct+'%) | 처치: '+data.totalMutantKills+'</div>';
        if (data.completeBonus.active) {
          html += '<div class="text-xs" style="color:#ffd700;margin-top:2px">🏆 '+data.completeBonus.name+': '+data.completeBonus.desc+'</div>';
        }
        html += '</div>';

        // 도감 표시 (등급별)
        [1,2,3].forEach(function(tier) {
          var entries = data.codex.filter(function(c){return c.tier===tier;});
          html += '<div style="font-size:11px;color:'+tierColors[tier]+';font-weight:bold;margin:6px 0 3px">'+tierNames[tier]+' 변이 ('+entries.filter(function(e){return e.discovered;}).length+'/'+entries.length+')</div>';
          entries.forEach(function(c) {
            var bg = c.discovered ? '#1a2a1a' : '#1a1a1a';
            var color = c.discovered ? c.color : '#444';
            html += '<div style="padding:4px 6px;background:'+bg+';border-left:2px solid '+color+';border-radius:3px;margin:2px 0">';
            if (c.discovered) {
              html += '<div style="display:flex;justify-content:space-between">' +
                '<span style="color:'+c.color+';font-size:11px">'+c.prefix+' '+c.name+'</span>' +
                '<span class="text-xs" style="color:#888">x'+c.killCount+'</span></div>' +
                '<div class="text-xs text-muted">'+c.desc+'</div>' +
                '<div class="text-xs" style="color:#ff8800">능력: '+c.abilityDesc+'</div>' +
                '<div class="text-xs" style="color:#888">스탯: HP x'+c.statMulti.hp+' ATK x'+c.statMulti.atk+' DEF x'+(c.statMulti.def||1)+' | 드롭: '+c.dropName+'</div>';
            } else {
              html += '<span class="text-xs" style="color:#555">??? — 아직 발견되지 않은 변이체</span>';
            }
            html += '</div>';
          });
        });

        showModal('🧬 변이 도감', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('mutation_drop', (d) => {
        showToast('🧬 변이 아이템: ' + d.name);
        playSFX('gold');
      });

      window.socket.on('mutant_spawn', (d) => {
        showToast('⚠️ 변이체 출현: ' + d.name);
        if (d.tier >= 3) playSFX('boss');
      });

      // ── 저주받은 장비 (v2.48) ──
      window.socket.on('cursed_status_result', (data) => {
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#ff4444;font-size:14px;font-weight:bold">⛓️ 저주받은 장비</div>' +
          '<div class="text-xs text-muted">정화: '+data.purifiedCount+' | 미발견: '+data.undiscovered+'종</div></div>';

        if (data.items.length === 0) {
          html += '<div class="text-xs text-muted" style="text-align:center;margin:12px 0">아직 저주 장비를 발견하지 못했습니다.<br>보스/전설 몬스터에게서 드롭됩니다.</div>';
        }

        data.items.forEach(function(item) {
          var borderColor = item.purified ? '#ffd700' : item.equipped ? '#ff4444' : '#666';
          var bg = item.purified ? '#2a3a1a' : item.equipped ? '#3a1a1a' : '#1a1a2a';
          html += '<div class="card" style="margin-bottom:6px;border-left:3px solid '+borderColor+';background:'+bg+';padding:8px">';

          // 헤더
          html += '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<b style="color:'+borderColor+';font-size:12px">'+item.icon+' '+item.name+' ['+item.slot+']</b>';
          if (item.purified) {
            html += '<span class="text-xs" style="color:#ffd700">✨ 정화됨</span>';
          } else if (item.equipped) {
            html += '<span class="text-xs" style="color:#ff4444">⛓️ 저주 장착</span>';
          } else {
            html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 6px;background:#ff4444;color:#fff" onclick="if(confirm(\'정말 장착하시겠습니까? 해제 불가!\')){window.socket.emit(\'cursed_equip\',\''+item.id+'\');closeModal();}">장착 (해제불가!)</button>';
          }
          html += '</div>';

          // 스탯
          html += '<div class="text-xs" style="color:#44ff44;margin-top:3px">ATK +'+item.stats.atk+' DEF +'+item.stats.def+'</div>';

          // 저주
          if (!item.purified) {
            html += '<div class="text-xs" style="color:#ff6666;margin-top:2px">저주: '+item.curse.name+' — '+item.curse.desc+'</div>';
          }

          // 정화 진행도
          if (item.equipped && !item.purified) {
            html += '<div style="margin-top:4px;font-size:10px;color:#ffd700">정화 조건:</div>';
            item.conditions.forEach(function(c) {
              var pct = Math.min(100, Math.floor(c.current / c.goal * 100));
              var barColor = pct >= 100 ? '#44ff44' : '#ffd700';
              html += '<div style="display:flex;align-items:center;gap:4px;margin:1px 0">' +
                '<span class="text-xs" style="color:#aaa;width:50px">'+c.name+'</span>' +
                '<div style="flex:1;height:6px;background:#333;border-radius:3px"><div style="width:'+pct+'%;height:100%;background:'+barColor+';border-radius:3px"></div></div>' +
                '<span class="text-xs" style="color:#888">'+c.current+'/'+c.goal+'</span></div>';
            });
            if (item.allMet) {
              html += '<button class="btn" style="width:100%;margin-top:4px;background:linear-gradient(135deg,#ffd700,#ff8800);color:#000;font-size:12px" onclick="window.socket.emit(\'cursed_purify\',\''+item.id+'\');closeModal();">✨ 정화하기!</button>';
            }
          }

          // 정화된 장비 정보
          if (item.purified) {
            html += '<div class="text-xs" style="color:#ffd700;margin-top:3px">→ '+item.purifiedName+': '+item.purifiedSpecial+'</div>';
          }

          // 로어
          html += '<div class="text-xs" style="color:#555;font-style:italic;margin-top:2px">"'+item.lore+'"</div>';
          html += '</div>';
        });

        showModal('⛓️ 저주받은 장비', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('cursed_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('levelup'); window.socket.emit('cursed_status'); }
      });
      window.socket.on('cursed_drop', (d) => {
        showToast('⛓️ 저주 장비 발견: ' + d.icon + ' ' + d.name);
        playSFX('boss');
      });

      // ── 금지된 연금술 (v2.49) ──
      window.socket.on('alchemy_status_result', (data) => {
        var tierColors = {1:'#88ccff',2:'#aa44ff',3:'#ff8800',4:'#ffd700'};
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#ff8800;font-size:14px;font-weight:bold">⚗️ '+data.masteryName+' (Lv.'+data.masteryLevel+')</div>' +
          '<div class="text-xs text-muted">EXP: '+data.mastery+'/'+data.nextMasteryExp+' | 성공률 +'+data.successBonus+'% | 레시피 '+data.discovered.length+'/'+data.totalRecipes+'</div></div>';

        // 보유 재료
        if (data.materials.length > 0) {
          html += '<div style="display:flex;gap:3px;flex-wrap:wrap;margin:6px 0">';
          data.materials.forEach(function(m) {
            html += '<div style="background:#1a1a2e;border:1px solid #444;border-radius:4px;padding:3px 6px;font-size:10px;cursor:pointer" ' +
              'onclick="window._addAlcIngr(\''+m.id+'\',\''+m.icon+'\',\''+m.name+'\')" title="클릭하여 추가">' +
              m.icon+' '+m.name+' x'+m.count+'</div>';
          });
          html += '</div>';
        } else {
          html += '<div class="text-xs text-muted" style="margin:6px 0">재료 없음 — 변이 몬스터/보스에서 획득</div>';
        }

        // 조합 인터페이스
        html += '<div style="margin:8px 0;padding:8px;background:#1a1a2e;border-radius:6px;border:1px solid #ff880044">' +
          '<div style="font-size:11px;color:#ff8800;margin-bottom:4px">연금 가마솥 (2~4개 재료)</div>' +
          '<div id="alc-pot" style="display:flex;gap:4px;min-height:36px;background:#111;border-radius:4px;padding:4px;margin-bottom:6px;flex-wrap:wrap"></div>' +
          '<div style="display:flex;gap:4px">' +
          '<button class="btn btn-sm" style="flex:1;background:#ff8800;color:#fff" onclick="window._alchBrew()">⚗️ 연성!</button>' +
          '<button class="btn btn-sm" style="background:#444;color:#aaa" onclick="window._alcList=[];document.getElementById(\'alc-pot\').innerHTML=\'\'">비우기</button></div></div>';

        // 발견된 레시피
        if (data.discovered.length > 0) {
          html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:6px 0 4px">발견된 레시피 ('+data.discovered.length+')</div>';
          data.discovered.forEach(function(r) {
            html += '<div class="card" style="margin-bottom:3px;border-left:2px solid '+(tierColors[r.tier]||'#888')+';padding:4px 6px">' +
              '<div style="display:flex;justify-content:space-between">' +
              '<span style="color:'+(tierColors[r.tier]||'#aaa')+';font-size:10px">'+r.icon+' '+r.name+' ('+r.successRate+'%)</span>' +
              '<span class="text-xs" style="color:#888">'+r.craftCount+'회 | '+r.goldCost+'G</span></div>' +
              '<div class="text-xs text-muted">→ '+r.result.name+': '+r.result.desc+'</div>' +
              '<div class="text-xs" style="color:#666">재료: '+r.ingredients.map(function(i){return i.icon+i.name;}).join(' + ')+'</div></div>';
          });
        }

        if (data.undiscoveredCount > 0) {
          html += '<div class="text-xs" style="color:#555;margin-top:4px">미발견: '+data.undiscoveredCount+'종 — 다양한 조합을 실험하세요!</div>';
        }

        showModal('⚗️ 금지된 연금술', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);

        // 조합 헬퍼
        window._alcList = [];
        window._addAlcIngr = function(id, icon, name) {
          if (window._alcList.length >= 4) return;
          window._alcList.push(id);
          var el = document.getElementById('alc-pot');
          if (el) el.innerHTML += '<span style="font-size:14px;padding:2px 6px;background:#ff880022;border:1px solid #ff8800;border-radius:4px">'+icon+' '+name+'</span>';
        };
        window._alchBrew = function() {
          if (window._alcList.length >= 2) {
            window.socket.emit('alchemy_brew', window._alcList);
            closeModal();
          } else {
            showToast('2개 이상 재료를 넣으세요');
          }
        };
      });

      window.socket.on('alchemy_result', (d) => {
        if (d.crafted) {
          showToast('⚗️ ' + d.msg);
          playSFX('levelup');
          if (d.isNew) playSFX('boss');
        } else if (d.failure) {
          showToast('💥 ' + d.msg);
          playSFX('boss');
        } else if (d.unknown) {
          showToast('⚗️ ' + d.msg);
          playSFX('gold');
        } else {
          showToast(d.msg);
        }
        window.socket.emit('alchemy_status');
      });

      // ── 마법 인형 (v2.50) ──
      window.socket.on('golem_status_result', (data) => {
        var tierColors = {1:'#888',2:'#44aaff',3:'#aa44ff',4:'#ffd700'};
        var slotNames = {head:'머리',body:'몸통',arms:'팔',legs:'다리'};
        var html = '';

        // 골렘 상태
        if (data.assembled && data.golemStats) {
          var gs = data.golemStats;
          html += '<div style="text-align:center;margin-bottom:8px;padding:8px;background:#1a1a2e;border:2px solid '+gs.rankColor+';border-radius:8px">' +
            '<div style="color:'+gs.rankColor+';font-size:16px;font-weight:bold">⚙️ '+gs.rankName+'</div>' +
            '<div class="text-xs" style="color:#aaa">HP:'+gs.currentHp+'/'+gs.maxHp+' ATK:'+gs.atk+' DEF:'+gs.def+' SPD:'+gs.spd+'</div>' +
            '<div class="text-xs" style="color:#888">AI: '+gs.aiDesc+' | 스탯 x'+gs.statMulti+'</div>' +
            '<button class="btn btn-sm" style="margin-top:4px;background:'+(data.active?'#ff4444':'#44ff44')+';color:#fff" onclick="window.socket.emit(\'golem_toggle\');closeModal();">'+(data.active?'귀환':'소환')+'</button></div>';
        }

        // 파츠 슬롯
        html += '<div style="font-size:12px;color:#ffd700;font-weight:bold;margin:6px 0 4px">파츠 조립</div>';
        ['head','body','arms','legs'].forEach(function(slot) {
          var info = data.parts[slot];
          var eq = info.equipped;
          html += '<div class="card" style="margin-bottom:4px;padding:6px">' +
            '<div style="font-size:11px;color:#aaa;margin-bottom:3px">'+slotNames[slot]+': '+(eq ? '<span style="color:'+(tierColors[eq.tier]||'#888')+'">'+eq.icon+' '+eq.name+'</span>' : '<span style="color:#555">없음</span>')+'</div>' +
            '<div style="display:flex;gap:3px;flex-wrap:wrap">';
          info.available.forEach(function(p) {
            var isEq = eq && eq.id === p.id;
            html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 5px;background:'+(isEq?'#2a5a2a':tierColors[p.tier]||'#333')+';color:#fff;border:1px solid '+(tierColors[p.tier]||'#555')+'" ' +
              (isEq?'disabled':'onclick="window.socket.emit(\'golem_equip_part\',{slot:\''+slot+'\',partId:\''+p.id+'\'});closeModal();"') + ' title="'+p.desc+' | '+JSON.stringify(p.bonus).replace(/[{}"]/g,'')+'">'+p.icon+' '+p.name+(isEq?' ✓':'')+'</button>';
          });
          html += '</div></div>';
        });

        // 코어
        html += '<div style="font-size:12px;color:#ff8800;font-weight:bold;margin:6px 0 4px">코어 (AI)</div>';
        var coreEq = data.core.equipped;
        html += '<div class="card" style="margin-bottom:4px;padding:6px">' +
          '<div style="font-size:11px;color:#aaa;margin-bottom:3px">코어: '+(coreEq ? '<span style="color:'+(tierColors[coreEq.tier]||'#888')+'">'+coreEq.icon+' '+coreEq.name+'</span> — '+coreEq.aiDesc : '<span style="color:#555">없음</span>')+'</div>' +
          '<div style="display:flex;gap:3px;flex-wrap:wrap">';
        data.core.available.forEach(function(c) {
          var isEq = coreEq && coreEq.id === c.id;
          html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 5px;background:'+(isEq?'#2a5a2a':tierColors[c.tier]||'#333')+';color:#fff;border:1px solid '+(tierColors[c.tier]||'#555')+'" ' +
            (isEq?'disabled':'onclick="window.socket.emit(\'golem_equip_core\',\''+c.id+'\');closeModal();"') + ' title="'+c.aiDesc+'">'+c.icon+' '+c.name+(isEq?' ✓':'')+'</button>';
        });
        html += '</div></div>';

        // 조립 버튼
        if (!data.assembled) {
          html += '<button class="btn" style="width:100%;margin-top:6px;background:linear-gradient(135deg,#ff8800,#ffd700);color:#000;font-size:14px" onclick="window.socket.emit(\'golem_assemble\');closeModal();">⚙️ 조립!</button>';
        }

        showModal('⚙️ 마법 인형', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('golem_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('levelup'); window.socket.emit('golem_status'); }
      });

      // ── 영웅의 전당 (v2.51) ──
      window.socket.on('hall_status_result', (data) => {
        var catNames = {growth:'성장',combat:'전투',collect:'수집',craft:'제작',economy:'경제'};
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#ffd700;font-size:16px;font-weight:bold">🏆 영웅의 전당</div>' +
          '<div class="text-xs text-muted">기록: '+data.claimedCount+'/'+data.totalAchievements+' | 내 유물: '+data.myRelicCount+'</div></div>';

        // 서버 버프
        var buffEntries = Object.entries(data.serverBuffs);
        if (buffEntries.length > 0) {
          html += '<div class="card" style="margin-bottom:8px;border:1px solid #ffd700;padding:6px;text-align:center">' +
            '<div style="color:#ffd700;font-size:11px;font-weight:bold">서버 전체 버프 (전당 등록 보상)</div>' +
            '<div class="text-xs" style="color:#44ff44">' + buffEntries.map(function(e){ return e[0]+' +'+(typeof e[1]==='number'&&e[1]<1?Math.floor(e[1]*100)+'%':e[1]); }).join(', ') + '</div></div>';
        }

        // 등록된 기록
        if (data.records.length > 0) {
          html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:4px 0">등록된 영웅</div>';
          data.records.forEach(function(r) {
            var bg = r.isMe ? '#2a3a1a' : '#1a1a2a';
            var border = r.isMe ? '#ffd700' : '#444';
            html += '<div style="padding:4px 6px;background:'+bg+';border-left:3px solid '+border+';border-radius:3px;margin:2px 0">' +
              '<div style="display:flex;justify-content:space-between">' +
              '<span style="color:#ffd700;font-size:10px">'+r.icon+' '+r.name+'</span>' +
              '<span class="text-xs" style="color:'+(r.isMe?'#44ff44':'#888')+'">'+r.holder+(r.isMe?' (나)':'')+'</span></div>' +
              '<div class="text-xs text-muted">'+r.desc+'</div>' +
              '<div class="text-xs" style="color:#aaa">유물: '+r.relic.icon+' '+r.relic.name+' — '+r.relic.special+'</div></div>';
          });
        }

        // 미등록 (도전 가능)
        if (data.unclaimed.length > 0) {
          html += '<div style="font-size:11px;color:#888;font-weight:bold;margin:8px 0 4px">미등록 업적 ('+data.unclaimed.length+')</div>';
          data.unclaimed.forEach(function(u) {
            html += '<div style="padding:3px 6px;background:#1a1a1a;border-radius:3px;margin:2px 0;border-left:2px solid #555">' +
              '<span class="text-xs" style="color:#aaa">'+u.icon+' '+u.name+' — '+u.desc+'</span>' +
              '<div class="text-xs" style="color:#666">보상: 서버 '+Object.entries(u.serverBuff).map(function(e){return e[0]+'+'+e[1];}).join(', ')+' + 유물 '+u.relic.icon+' '+u.relic.name+'</div></div>';
          });
        }

        // 내 유물
        if (data.myRelics.length > 0) {
          html += '<div style="font-size:11px;color:#ff8800;font-weight:bold;margin:8px 0 4px">내 유물</div>';
          data.myRelics.forEach(function(r) {
            html += '<div class="card" style="margin-bottom:3px;border-left:3px solid '+r.color+';padding:4px 6px">' +
              '<b style="color:'+r.color+';font-size:11px">'+r.icon+' '+r.name+'</b>' +
              '<div class="text-xs text-muted">'+JSON.stringify(r.stats).replace(/[{}"]/g,'')+' | '+r.special+'</div></div>';
          });
        }

        showModal('🏆 영웅의 전당', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('hall_achievement', (d) => {
        showToast('🏆 ' + d.icon + ' ' + d.name + ' — ' + d.player + '! 유물: ' + (d.relic||''));
        playSFX('boss'); playSFX('levelup');
      });

      // ── 정령 계약 (v2.52) ──
      window.socket.on('spirit_status_result', (data) => {
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#44ff88;font-size:14px;font-weight:bold">🧚 정령 계약</div>' +
          '<div class="text-xs text-muted">계약: '+data.totalContracts+'/4 | 활성: '+(data.activeInfo?data.activeInfo.icon+' '+data.activeInfo.name:'없음')+'</div></div>';

        // 기본 정령
        html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:4px 0">원소 정령</div>';
        data.baseSpirits.forEach(function(s) {
          var bg = s.isActive ? '#1a3a1a' : s.contracted ? '#1a1a2a' : '#1a1a1a';
          var border = s.isActive ? '#44ff44' : s.contracted ? s.color : '#333';
          html += '<div class="card" style="margin-bottom:4px;border-left:3px solid '+border+';background:'+bg+';padding:6px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<div><span style="color:'+s.color+';font-size:13px">'+s.icon+' '+s.name+'</span>' +
            (s.contracted ? ' <span class="text-xs" style="color:#888">Lv.'+s.level+' ('+s.exp+'/'+s.nextExp+')</span>' : '') +
            '<div class="text-xs text-muted">'+s.desc+'</div></div>';
          if (!s.contracted) {
            html += '<button class="btn btn-sm" style="font-size:9px;background:'+s.color+';color:#fff" onclick="window.socket.emit(\'spirit_contract\',\''+s.id+'\');closeModal();">계약</button>';
          } else if (s.isActive) {
            html += '<button class="btn btn-sm" style="font-size:9px;background:#ff4444;color:#fff" onclick="window.socket.emit(\'spirit_dismiss\');closeModal();">귀환</button>';
          } else {
            html += '<button class="btn btn-sm" style="font-size:9px;background:#44ff44;color:#000" onclick="window.socket.emit(\'spirit_summon\',{id:\''+s.id+'\',type:\'base\'});closeModal();">소환</button>';
          }
          html += '</div>';
          // 스킬
          if (s.contracted) {
            html += '<div style="display:flex;gap:3px;margin-top:3px;flex-wrap:wrap">';
            s.skills.forEach(function(sk) {
              var color = sk.unlocked ? '#44ff44' : '#555';
              html += '<span class="text-xs" style="color:'+color+';padding:1px 4px;background:#111;border-radius:2px" title="'+sk.desc+'">'+(sk.unlocked?'✓':'🔒')+' '+sk.name+' (Lv.'+sk.level+')</span>';
            });
            html += '</div>';
          }
          html += '</div>';
        });

        // 합체 정령
        html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:8px 0 4px">상위 정령 (합체)</div>';
        data.fusionSpirits.forEach(function(f) {
          var bg = f.isActive ? '#2a2a1a' : f.fused ? '#1a1a2a' : '#1a1a1a';
          var border = f.isActive ? '#ffd700' : f.fused ? f.color : '#333';
          html += '<div class="card" style="margin-bottom:4px;border-left:3px solid '+border+';background:'+bg+';padding:6px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<div><span style="color:'+f.color+';font-size:13px">'+f.icon+' '+f.name+'</span>' +
            (f.fused ? ' <span class="text-xs" style="color:#888">Lv.'+f.level+'</span>' : '') +
            '<div class="text-xs text-muted">'+f.desc+'</div>' +
            '<div class="text-xs" style="color:#666">필요: '+f.fusionReq.map(function(r){return r.icon+r.name+(r.met?' ✓':' Lv.3 필요');}).join(' + ')+'</div></div>';
          if (!f.fused && f.reqMet) {
            html += '<button class="btn btn-sm" style="font-size:9px;background:'+f.color+';color:#fff" onclick="window.socket.emit(\'spirit_fuse\',\''+f.id+'\');closeModal();">합체!</button>';
          } else if (f.fused && !f.isActive) {
            html += '<button class="btn btn-sm" style="font-size:9px;background:#ffd700;color:#000" onclick="window.socket.emit(\'spirit_summon\',{id:\''+f.id+'\',type:\'fusion\'});closeModal();">소환</button>';
          } else if (f.isActive) {
            html += '<button class="btn btn-sm" style="font-size:9px;background:#ff4444;color:#fff" onclick="window.socket.emit(\'spirit_dismiss\');closeModal();">귀환</button>';
          }
          html += '</div>';
          if (f.fused) {
            html += '<div style="display:flex;gap:3px;margin-top:3px;flex-wrap:wrap">';
            f.skills.forEach(function(sk) {
              var color = sk.unlocked ? '#ffd700' : '#555';
              html += '<span class="text-xs" style="color:'+color+';padding:1px 4px;background:#111;border-radius:2px">'+(sk.unlocked?'✓':'🔒')+' '+sk.name+'</span>';
            });
            html += '</div>';
          }
          html += '</div>';
        });

        showModal('🧚 정령 계약', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('spirit_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('levelup'); window.socket.emit('spirit_status'); }
      });

      // ── 신화 무기 각성 (v2.53) ──
      window.socket.on('mythweapon_status_result', (data) => {
        var html = '';
        if (!data.hasWeapon) {
          html += '<div style="text-align:center;margin-bottom:10px">' +
            '<div style="color:#ffd700;font-size:14px;font-weight:bold">신화 무기를 선택하세요</div>' +
            '<div class="text-xs text-muted">각성한 무기는 영혼이 깃들어 함께 성장합니다 (1회 선택)</div></div>';
          data.available.forEach(function(w) {
            html += '<div class="card" style="margin-bottom:6px;border-left:3px solid '+w.color+';padding:8px;cursor:pointer" onclick="window.socket.emit(\'mythweapon_awaken\',\''+w.id+'\');closeModal();">' +
              '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:24px">'+w.icon+'</span>' +
              '<div><b style="color:'+w.color+';font-size:13px">'+w.name+'</b> <span class="text-xs" style="color:#888">['+w.personality+' | '+w.element+']</span>' +
              '<div class="text-xs text-muted">'+w.desc+'</div>' +
              '<div class="text-xs" style="color:#666;font-style:italic">'+w.lore+'</div>' +
              '<div class="text-xs" style="color:#aaa">ATK +'+w.baseStats.atk+' DEF +'+(w.baseStats.def||0)+'</div></div></div></div>';
          });
        } else {
          // 무기 상태
          var br = data.bondRank;
          html += '<div style="text-align:center;margin-bottom:8px">' +
            '<div style="font-size:28px">'+data.icon+'</div>' +
            '<div style="color:'+data.color+';font-size:16px;font-weight:bold">'+data.name+'</div>' +
            '<div class="text-xs" style="color:#aaa">['+data.personality+'] Lv.'+data.level+' | '+data.element+'</div>' +
            '<div style="margin-top:4px">' +
            '<span style="color:'+data.color+';font-size:11px">친밀도: '+br.icon+' '+br.name+' ('+data.bond+'/100)</span>' +
            '<div style="width:100%;height:6px;background:#333;border-radius:3px;margin-top:2px"><div style="width:'+data.bond+'%;height:100%;background:'+data.color+';border-radius:3px"></div></div></div>' +
            '<div class="text-xs" style="color:#888;margin-top:2px">스탯 배율 x'+data.statMulti+' | EXP '+data.exp+'/'+data.nextExp+'</div></div>';

          // 대화 버튼
          html += '<button class="btn" style="width:100%;margin-bottom:8px;background:'+data.color+'44;color:'+data.color+';border:1px solid '+data.color+'" onclick="window.socket.emit(\'mythweapon_talk\');closeModal();">💬 대화하기 (친밀도 +3)</button>';

          // 현재 패시브
          var passives = Object.entries(data.passives).filter(function(e){return e[1]!==0;});
          if (passives.length > 0) {
            html += '<div class="text-xs" style="color:#44ff44;margin-bottom:6px">패시브: '+passives.map(function(e){return e[0]+'+'+(typeof e[1]==='number'&&e[1]<1?Math.floor(e[1]*100)+'%':e[1]);}).join(', ')+'</div>';
          }

          // 스킬
          html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:4px 0">무기 스킬</div>';
          data.skills.forEach(function(sk) {
            var color = sk.unlocked ? data.color : '#555';
            var bg = sk.unlocked ? '#1a2a1a' : '#1a1a1a';
            html += '<div style="padding:4px 6px;background:'+bg+';border-left:2px solid '+color+';border-radius:3px;margin:2px 0">' +
              '<span style="color:'+color+';font-size:10px">'+(sk.unlocked?'✓':'🔒')+' '+sk.name+' (친밀도 '+sk.bond+')</span>' +
              '<div class="text-xs text-muted">'+sk.desc+'</div></div>';
          });

          // 킬 스택 (서리한)
          if (data.killStacks !== undefined) {
            html += '<div class="text-xs" style="color:#88ddff;margin-top:4px">영혼 수확: ATK +'+data.killStacks+'/40</div>';
          }
        }

        showModal('⚔️ 신화 무기', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('mythweapon_result', (d) => {
        showToast(d.msg);
        if (d.success) { playSFX('boss'); playSFX('levelup'); window.socket.emit('mythweapon_status'); }
      });
      window.socket.on('mythweapon_talk_result', (d) => {
        if (d.success) { showToast(d.msg); window.socket.emit('mythweapon_status'); }
        else showToast(d.msg);
      });
      window.socket.on('mythweapon_dialogue', (d) => {
        showToast(d.msg);
        if (d.leveledUp) playSFX('levelup');
      });

      // ── 차원 여행자 (v2.54) ──
      window.socket.on('dim_status_result', (data) => {
        var html = '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="color:#aa44ff;font-size:14px;font-weight:bold">🌀 차원 여행자</div>' +
          '<div class="text-xs text-muted">차원석: <b style="color:#ffd700">'+data.dimStones+'</b> | 클리어: '+data.totalClears+' | 입장: '+data.dailyEntries+'/'+data.maxEntries+'</div></div>';

        // 현재 탐험 중
        if (data.inDimension) {
          var d = data.inDimension;
          html += '<div class="card" style="border:2px solid '+d.dim.color+';padding:8px;margin-bottom:8px;text-align:center">' +
            '<div style="color:'+d.dim.color+';font-size:13px">'+d.dim.icon+' '+d.dim.name+' 탐험 중!</div>' +
            '<div class="text-xs">스테이지: '+d.stagesCleared+'/'+d.dim.stages+' | 경과: '+d.elapsed+'초/'+d.dim.timeLimitSec+'초</div>' +
            '<div style="display:flex;gap:4px;margin-top:6px;justify-content:center">' +
            '<button class="btn btn-sm" style="background:#44ff44;color:#000" onclick="window.socket.emit(\'dim_clear_stage\');closeModal();">스테이지 클리어!</button>' +
            '<button class="btn btn-sm" style="background:#ff4444;color:#fff" onclick="window.socket.emit(\'dim_abandon\');closeModal();">포기</button></div></div>';
        }

        // 차원 목록
        html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:4px 0">평행 차원</div>';
        data.dimensions.forEach(function(dim) {
          var bg = dim.canEnter ? '#1a1a2a' : '#1a1a1a';
          html += '<div class="card" style="margin-bottom:4px;border-left:3px solid '+dim.color+';background:'+bg+';padding:6px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<div><span style="color:'+dim.color+';font-size:12px">'+dim.icon+' '+dim.name+'</span> <span class="text-xs" style="color:#888">Lv.'+dim.minLevel+'+ | '+dim.stages+'스테이지 | '+dim.timeLimit+'초</span>' +
            '<div class="text-xs text-muted">'+dim.desc+'</div>' +
            '<div class="text-xs" style="color:#ff8800">룰: '+dim.rules+'</div>' +
            (dim.clears>0 ? '<div class="text-xs" style="color:#44ff44">클리어: '+dim.clears+'회'+(dim.bestTime?' | 최고: '+dim.bestTime+'초':'')+'</div>' : '') +
            '</div>';
          if (dim.canEnter && !data.inDimension) {
            html += '<button class="btn btn-sm" style="background:'+dim.color+';color:#fff;font-size:9px" onclick="window.socket.emit(\'dim_enter\',\''+dim.id+'\');closeModal();">입장</button>';
          }
          html += '</div></div>';
        });

        // 차원석 상점
        html += '<div style="font-size:11px;color:#ffd700;font-weight:bold;margin:8px 0 4px">차원석 상점</div>';
        data.shop.forEach(function(item) {
          var bg = item.owned ? '#2a3a2a' : '#1a1a2a';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;background:'+bg+';border-radius:3px;margin:2px 0">' +
            '<span class="text-xs" style="color:'+(item.owned?'#44ff44':'#aaa')+'">'+item.icon+' '+item.name+' — '+item.desc+' <span style="color:#ffd700">['+item.price+'석]</span></span>';
          if (item.canBuy) {
            html += '<button class="btn btn-sm" style="font-size:9px;padding:1px 6px;background:#ffd700;color:#000" onclick="window.socket.emit(\'dim_buy\',\''+item.id+'\');closeModal();">구매</button>';
          } else if (item.owned) {
            html += '<span class="text-xs" style="color:#44ff44">✓</span>';
          }
          html += '</div>';
        });

        showModal('🌀 차원 여행자', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });

      window.socket.on('dim_result', (d) => {
        showToast(d.msg);
        if (d.success) {
          if (d.cleared) { playSFX('boss'); playSFX('levelup'); }
          else playSFX('gold');
          window.socket.emit('dim_status');
        }
      });

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

      // ═══ 하우징 & 요새 ═══
      window.socket.on('house_status', (d) => {
        var html = '';
        if (!d.hasHouse) {
          html = '<div style="text-align:center"><p style="color:#ffd700;font-size:16px;margin-bottom:10px">🏠 집 건설하기</p>' +
            '<p class="text-muted text-sm" style="margin-bottom:12px">자신만의 집을 건설하세요! 가구 배치, 자원 생산, 수비대 배치까지!</p></div>';
          d.tiers.forEach(function(t) {
            html += '<div class="panel-item" style="border-left:3px solid #ffd700;cursor:pointer" onclick="window.socket.emit(\'house_build\',\'' + t.id + '\');closeModal();">' +
              '<span class="name">' + t.icon + ' ' + t.name + '<br><small style="color:#888">' + t.cost.toLocaleString() + 'G</small>' +
              '<br><small style="color:#aaa">' + t.desc + '</small></span></div>';
          });
        } else {
          // 집 상태
          html = '<div style="text-align:center;margin-bottom:8px">' +
            '<span style="font-size:32px">' + d.tier.icon + '</span>' +
            '<p style="color:#ffd700;font-size:16px;font-weight:900">' + d.tier.name + '</p></div>';

          // 보너스
          var bonusText = Object.entries(d.bonuses).filter(function(e){return typeof e[1]==='number'&&e[1]>0;}).map(function(e){return e[0]+': +'+e[1];}).join(', ');
          if (bonusText) html += '<p style="color:#44ff88;font-size:10px;text-align:center;margin-bottom:8px">✨ ' + bonusText + '</p>';

          // 수집 가능
          if (d.pendingHours > 0) {
            html += '<button class="btn btn-primary" onclick="window.socket.emit(\'house_collect\');closeModal();" style="width:100%;margin-bottom:8px">📦 자원 수집 (' + d.pendingHours + '시간분)</button>';
          }

          // 업그레이드
          if (d.nextUpgrade) {
            html += '<button class="btn" onclick="window.socket.emit(\'house_upgrade\');closeModal();" style="width:100%;margin-bottom:8px">' + d.nextUpgrade.icon + ' 업그레이드: ' + d.nextUpgrade.name + ' (' + d.nextUpgrade.cost.toLocaleString() + 'G)</button>';
          }

          // 가구
          html += '<h4 style="color:#ffd700;margin:8px 0 4px;font-size:11px">🪑 가구 (' + d.furniture.length + '/' + d.maxFurniture + ')</h4>';
          if (d.furniture.length > 0) {
            d.furniture.forEach(function(f) { html += '<span style="font-size:11px;color:#ddd;margin-right:4px">' + (f.icon||'') + f.name + '</span>'; });
          }
          html += '<div style="margin:6px 0"><select id="furn-select" style="width:70%;padding:4px;background:#222;color:#ddd;border:1px solid #555;border-radius:4px;font-size:10px">';
          d.availableFurniture.forEach(function(f) { html += '<option value="' + f.id + '">' + f.icon + ' ' + f.name + ' (' + f.cost.toLocaleString() + 'G) — ' + f.desc + '</option>'; });
          html += '</select><button class="btn btn-sm" onclick="window.socket.emit(\'house_furniture\',document.getElementById(\'furn-select\').value);closeModal();" style="margin-left:4px">배치</button></div>';

          // 수비대
          html += '<h4 style="color:#ff4444;margin:8px 0 4px;font-size:11px">⚔️ 수비대 (' + d.guards.length + '/' + d.maxGuards + ')</h4>';
          if (d.guards.length > 0) {
            d.guards.forEach(function(g) {
              var hpPct = g.maxHp > 0 ? Math.floor(g.hp/g.maxHp*100) : 0;
              html += '<span style="font-size:11px;color:#ddd;margin-right:6px">' + (g.icon||'') + g.name + ' HP:' + hpPct + '%</span>';
            });
          }
          html += '<div style="margin:6px 0"><select id="guard-select" style="width:70%;padding:4px;background:#222;color:#ddd;border:1px solid #555;border-radius:4px;font-size:10px">';
          d.availableGuards.forEach(function(g) { html += '<option value="' + g.id + '">' + g.icon + ' ' + g.name + ' (' + g.cost.toLocaleString() + 'G) ATK:' + g.atk + ' DEF:' + g.def + '</option>'; });
          html += '</select><button class="btn btn-sm" onclick="window.socket.emit(\'house_guard\',document.getElementById(\'guard-select\').value);closeModal();" style="margin-left:4px">배치</button></div>';

          // 방명록
          if (d.guestbook && d.guestbook.length > 0) {
            html += '<h4 style="color:#888;margin:8px 0 4px;font-size:11px">📝 방명록</h4>';
            d.guestbook.slice(0,5).forEach(function(g) {
              html += '<div style="font-size:10px;color:#aaa;padding:2px 0"><b style="color:#ffd700">' + g.from + '</b>: ' + g.msg + '</div>';
            });
          }
        }
        showModal('🏠 내 집', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });

      window.socket.on('house_result', (d) => { showToast(d.msg); });
      window.socket.on('house_collect_result', (d) => {
        if (!d.success) { showToast(d.msg); return; }
        var msg = '📦 ' + d.msg + ' — +' + d.gold + 'G';
        var items = Object.entries(d.items || {});
        if (items.length > 0) msg += ', ' + items.map(function(e){return e[0]+' x'+e[1];}).join(', ');
        showToast(msg);
        playSFX('gold');
      });

      window.socket.on('house_raid_result', (d) => {
        var html = '<div style="text-align:center"><p style="color:' + (d.success ? '#ffd700' : '#ff4444') + ';font-size:16px">' + (d.success ? '⚔️ 침공 성공!' : '💀 침공 실패!') + '</p>';
        if (d.lootGold) html += '<p style="color:#ffd700;margin:8px 0">약탈: ' + d.lootGold + 'G</p>';
        if (d.results && d.results.length > 0) {
          html += '<div style="margin-top:8px">';
          d.results.forEach(function(r) { html += '<p style="font-size:11px;color:' + (r.survived?'#ff4444':'#44ff44') + '">' + r.guard + ': ' + (r.survived?'생존':'격파') + ' (' + r.rounds + '라운드)</p>'; });
          html += '</div>';
        }
        html += '</div>';
        showModal('⚔️ 요새 침공', html, [{label:'확인', action:'closeModal()'}]);
      });

      // ═══ 월드 레이드 & 이벤트 ═══
      window.socket.on('world_events_info', (d) => {
        var html = '';
        // 진행 중 레이드
        if (d.raid && d.raid.active) {
          var hpPct = d.raid.hpPct;
          var remain = d.raid.remaining;
          html += '<div style="border:1px solid rgba(255,68,68,0.3);border-radius:8px;padding:12px;margin-bottom:10px;background:rgba(255,0,0,0.05)">' +
            '<p style="color:#ff4444;font-size:14px;font-weight:900">' + d.raid.icon + ' ' + d.raid.bossName + ' <span style="color:#888;font-size:10px">진행 중</span></p>' +
            '<div style="width:100%;height:12px;background:#222;border-radius:6px;overflow:hidden;margin:6px 0"><div style="width:' + hpPct + '%;height:100%;background:linear-gradient(90deg,#cc2222,#ff4444);border-radius:6px;transition:width 0.5s"></div></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:10px;color:#888"><span>HP ' + hpPct + '%</span><span>' + d.raid.phase + '</span><span>⏱ ' + Math.floor(remain/60) + ':' + (remain%60<10?'0':'') + (remain%60) + '</span></div>' +
            '<p style="color:#888;font-size:10px;margin-top:4px">참가자: ' + d.raid.participantCount + '명</p>' +
            '<button class="btn btn-danger" onclick="window.socket.emit(\'raid_hit\');closeModal();" style="width:100%;margin-top:6px;font-size:14px">⚔ 공격!</button>' +
            '</div>';
        }
        // 진행 중 이벤트
        if (d.event) {
          html += '<div style="border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:10px;margin-bottom:10px;background:rgba(255,215,0,0.03)">' +
            '<p style="color:#ffd700;font-size:13px;font-weight:bold">' + d.event.icon + ' ' + d.event.name + ' <span style="color:#888;font-size:10px">진행 중 (' + Math.floor(d.event.remaining/60) + '분 남음)</span></p></div>';
        }
        // 레이드 보스 목록
        html += '<h4 style="color:#ff4444;margin:10px 0 6px;font-size:12px">🐲 월드 레이드 보스</h4>';
        d.availableRaids.forEach(function(r) {
          html += '<div class="panel-item" style="border-left:3px solid #ff4444;cursor:pointer" onclick="window.socket.emit(\'raid_start_manual\',\'' + r.id + '\');closeModal();">' +
            '<span class="name">' + r.icon + ' ' + r.name + '<br><small style="color:#888">HP ' + (r.hp/1000).toFixed(0) + 'K | 최소 ' + r.minPlayers + '명</small>' +
            '<br><small style="color:#aaa">' + r.desc + '</small></span></div>';
        });
        // 이벤트 목록
        html += '<h4 style="color:#ffd700;margin:10px 0 6px;font-size:12px">🎉 시즌 이벤트</h4>';
        d.availableEvents.forEach(function(e) {
          html += '<div class="panel-item" style="border-left:3px solid #ffd700;cursor:pointer" onclick="window.socket.emit(\'event_start_manual\',\'' + e.id + '\');closeModal();">' +
            '<span class="name">' + e.icon + ' ' + e.name + '<br><small style="color:#aaa">' + e.desc + '</small></span></div>';
        });
        showModal('🐲 월드 레이드 & 이벤트', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });

      window.socket.on('world_raid_start', (d) => {
        if (typeof showBossEntrance === 'function') showBossEntrance(d.name, '— 서버 전체 협력 레이드! —');
        showToast(d.icon + ' ' + d.name + ' 출현! 공격하라!');
      });

      window.socket.on('world_raid_phase', (d) => {
        if (typeof showFantasyToast === 'function') showFantasyToast('⚠️ ' + d.phase, 'legendary');
        addCombatLog('[레이드] ' + d.phase, 'log-crit');
        playSFX('boss');
        document.getElementById('unity-container').classList.add('shake');
        setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 500);
      });

      window.socket.on('world_raid_attack', (d) => {
        showToast(d.msg);
        if (d.damage) showFloatingDamage(d.damage, false, '보스', 'fire');
        playSFX('boss');
      });

      window.socket.on('world_raid_update', (d) => {
        if (!d.active) return;
        document.title = d.bossName + ' HP: ' + d.hpPct + '% (' + d.participantCount + '명)';
      });

      window.socket.on('raid_hit_result', (d) => {
        showFloatingDamage(d.damage, d.isCrit, null, 'fire');
        dpsSamples.push({ time: Date.now(), damage: d.damage || 0 });
      });

      window.socket.on('world_raid_end', (d) => {
        document.title = 'AutoBattle.io';
        var html = '<div style="text-align:center;margin-bottom:10px">' +
          '<p style="font-size:24px">' + d.icon + '</p>' +
          '<p style="color:' + (d.victory ? '#ffd700' : '#ff4444') + ';font-size:18px;font-weight:900">' + (d.victory ? '🏆 레이드 승리!' : '💀 레이드 실패') + '</p>' +
          '<p style="color:#ddd">' + d.bossName + '</p>' +
          '<p style="color:#888;font-size:11px">참가자 ' + d.totalParticipants + '명 | 총 데미지 ' + d.totalDamage.toLocaleString() + '</p></div>';
        if (d.victory && d.results.length > 0) {
          html += '<div style="max-height:35vh;overflow-y:auto">';
          var medals = ['🥇','🥈','🥉'];
          d.results.forEach(function(r) {
            var medal = medals[r.rank-1] || (r.rank + '위');
            html += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #222;font-size:11px">' +
              '<span style="width:28px;text-align:center">' + medal + '</span>' +
              '<span style="flex:1;color:#ddd;font-weight:bold">' + r.name + '</span>' +
              '<span style="color:#ff8800">' + r.damage.toLocaleString() + '</span>' +
              '<span style="color:#ffd700">' + r.reward.gold.toLocaleString() + 'G</span>' +
              (r.reward.item ? '<span style="color:#aa44ff">' + r.reward.item + '</span>' : '') + '</div>';
          });
          html += '</div>';
        }
        showModal(d.victory ? '🏆 레이드 승리' : '💀 레이드 실패', html, [{label:'확인', action:'closeModal()'}]);
        if (d.victory) { if (typeof celebrateRareDrop === 'function') celebrateRareDrop('mythic'); playSFX('levelup'); }
      });

      window.socket.on('world_event_start', (d) => {
        if (typeof showFantasyToast === 'function') showFantasyToast(d.icon + ' ' + d.name + ' 시작!', 'legendary');
        else showToast(d.icon + ' ' + d.name + ' 시작! ' + d.desc);
        playSFX('levelup');
        // 이벤트 표시
        var evEl = document.getElementById('world-event-display');
        if (evEl) { evEl.textContent = d.icon + ' ' + d.name; evEl.style.display = 'inline-flex'; }
      });

      window.socket.on('world_event_end', (d) => {
        showToast('이벤트 종료');
        var evEl = document.getElementById('world-event-display');
        if (evEl) evEl.style.display = 'none';
      });

      // ═══ 메인 스토리 시스템 ═══
      window.socket.on('story_status', (d) => {
        if (d.completed) {
          showModal('📖 메인 스토리', '<div style="text-align:center"><p style="color:#ffd700;font-size:18px;font-weight:900">🎊 스토리 완료!</p><p style="color:#ddd;margin-top:8px">당신은 <b style="color:#ff8800">전설의 영웅</b>입니다.</p><p style="color:#888;margin-top:4px">봉인석 ' + d.seals + '/6 수집</p></div>', [{label:'확인', action:'closeModal()'}]);
          return;
        }
        if (!d.quest) { showToast('스토리 데이터를 불러올 수 없습니다.'); return; }

        // 컷신이 있으면 먼저 재생
        if (d.quest.cutscene) {
          showStoryCutscene(d.quest.cutscene, function() { showStoryQuest(d); });
        } else {
          showStoryQuest(d);
        }
      });

      window.socket.on('story_quest_update', (d) => {
        if (d.type === 'progress') {
          showToast('📖 ' + d.questName + ': ' + d.progress + '/' + d.goal);
        } else if (d.type === 'complete') {
          // 퀘스트 완료!
          var html = '<div style="text-align:center">' +
            '<p style="color:#ffd700;font-size:18px;font-weight:900">✅ 퀘스트 완료!</p>' +
            '<p style="color:#ddd;font-size:14px;margin:8px 0">' + d.questName + '</p>';
          if (d.reward) {
            html += '<div style="margin:10px 0;padding:10px;background:rgba(255,215,0,0.05);border-radius:8px;border:1px solid rgba(255,215,0,0.15);font-size:12px">';
            if (d.reward.gold) html += '<p style="color:#ffd700">💰 ' + d.reward.gold + 'G</p>';
            if (d.reward.exp) html += '<p style="color:#aa44ff">✨ ' + d.reward.exp + ' EXP</p>';
            if (d.reward.diamonds) html += '<p style="color:#55ccff">💎 ' + d.reward.diamonds + '</p>';
            if (d.reward.itemName) html += '<p style="color:#ff8800">🎁 ' + d.reward.itemName + '</p>';
            if (d.reward.titleName) html += '<p style="color:#ff4444">👑 칭호: ' + d.reward.titleName + '</p>';
            html += '</div>';
          }
          if (d.nextQuest) {
            html += '<p style="color:#888;font-size:11px;margin-top:8px">다음: ' + d.nextQuest.chapter + ' — ' + d.nextQuest.name + '</p>';
          }
          if (d.storyCompleted) {
            html += '<p style="color:#ffd700;font-size:16px;margin-top:12px">🎊 메인 스토리 완료!</p>';
          }
          html += '</div>';
          showModal('📖 스토리', html, [{label:'계속', action:'closeModal()'}]);
          playSFX('levelup');
          if (typeof celebrateRareDrop === 'function') celebrateRareDrop('legendary');

          // 다음 컷신 자동 재생
          if (d.nextCutscene) {
            setTimeout(function() { showStoryCutscene(d.nextCutscene); }, 2000);
          }
        }
      });

      window.socket.on('story_choice_result', (d) => {
        if (d.dialog) {
          showModal('📖 선택의 결과', '<p style="color:#ddd;font-size:13px;line-height:1.6;text-align:center;font-style:italic">"' + d.dialog + '"</p>', [{label:'계속', action:"window.socket.emit('story_status');closeModal();"}]);
        }
      });

      // 컷신 재생 함수
      window.showStoryCutscene = function(cutscene, callback) {
        if (!cutscene || !cutscene.lines || cutscene.lines.length === 0) { if (callback) callback(); return; }
        var lines = cutscene.lines;
        var idx = 0;

        function showLine() {
          if (idx >= lines.length) {
            closeModal();
            if (callback) callback();
            return;
          }
          var line = lines[idx];
          var html = '<div style="text-align:center;padding:16px 0">' +
            '<div style="font-size:32px;margin-bottom:8px">' + (line.icon || '') + '</div>' +
            (line.speaker ? '<div style="color:#ffd700;font-size:12px;margin-bottom:6px;letter-spacing:2px;font-family:\'Cinzel\',serif">' + line.speaker + '</div>' : '') +
            '<div style="color:#d4cfc0;font-size:14px;line-height:1.8;max-width:350px;margin:0 auto">' + line.text + '</div>' +
            '<div style="color:#555;font-size:9px;margin-top:12px">' + (idx+1) + ' / ' + lines.length + '</div>' +
            '</div>';
          showModal('', html, [{label: idx < lines.length - 1 ? '다음 ▶' : '시작하기', action: 'window._storyCutsceneNext()'}]);
          idx++;
        }

        window._storyCutsceneNext = showLine;
        showLine();
      };

      // 스토리 퀘스트 UI
      window.showStoryQuest = function(d) {
        var q = d.quest;
        var pct = q.goal > 0 ? Math.floor(q.progress / q.goal * 100) : 0;
        var html = '<div>' +
          '<div style="text-align:center;margin-bottom:10px">' +
          '<p style="color:#888;font-size:10px;letter-spacing:2px">' + (d.chapter ? d.chapter.name : '') + '</p>' +
          '<p style="color:#ffd700;font-size:16px;font-weight:900">' + q.name + '</p>' +
          '</div>';

        // NPC 대화
        if (q.dialog) {
          var dialogText = pct >= 100 ? q.dialog.after : (q.progress > 0 ? q.dialog.task : q.dialog.before);
          if (dialogText) {
            html += '<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;margin:8px 0;border-left:3px solid rgba(255,215,0,0.3)">' +
              (q.npc ? '<span style="color:#ffd700;font-size:11px">' + q.npc + '</span><br>' : '') +
              '<span style="color:#d4cfc0;font-size:12px;line-height:1.6">' + dialogText + '</span></div>';
          }
        }

        // 진행도
        html += '<div style="margin:10px 0">' +
          '<div style="display:flex;justify-content:space-between;font-size:10px;color:#888;margin-bottom:3px"><span>진행도</span><span>' + q.progress + '/' + q.goal + '</span></div>' +
          '<div style="width:100%;height:8px;background:#222;border-radius:4px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#ffd700,#ff8800);border-radius:4px;transition:width 0.3s"></div></div>' +
          '</div>';

        // 보상 미리보기
        if (q.reward) {
          html += '<div style="font-size:10px;color:#888;margin-top:8px">보상: ';
          if (q.reward.gold) html += '💰' + q.reward.gold + 'G ';
          if (q.reward.exp) html += '✨' + q.reward.exp + 'EXP ';
          if (q.reward.diamonds) html += '💎' + q.reward.diamonds + ' ';
          if (q.reward.itemName) html += '🎁' + q.reward.itemName + ' ';
          html += '</div>';
        }

        // 선택지
        if (q.choice && pct >= 100) {
          html += '<div style="margin-top:12px;border-top:1px solid #333;padding-top:10px">' +
            '<p style="color:#ff8800;font-size:12px;text-align:center;margin-bottom:8px">' + q.choice.prompt + '</p>';
          q.choice.options.forEach(function(opt) {
            html += '<button class="btn" style="width:100%;margin:3px 0;text-align:left" onclick="window.socket.emit(\'story_choice\',\'' + opt.value + '\');closeModal();">' + opt.label + '</button>';
          });
          html += '</div>';
        }

        html += '</div>';

        var buttons = [{label:'닫기', type:'cancel', action:'closeModal()'}];
        if (pct >= 100 && !q.choice) {
          buttons.unshift({label:'✅ 완료 보고', action:"window.socket.emit('story_complete_report');closeModal();"});
        }

        showModal('📖 메인 스토리', html, buttons);
      };

      // ═══ 심층 던전 시스템 ═══
      window.socket.on('deep_dungeon_list', (d) => {
        var html = '<p style="text-align:center;color:#888;font-size:11px;margin-bottom:10px">10층 다층 던전 — 층별 테마, 함정, 보스 페이즈</p>';
        d.dungeons.forEach(function(dg) {
          html += '<div class="panel-item" style="border-left:3px solid #ffd700;cursor:pointer" onclick="window.socket.emit(\'deep_dungeon_enter\',\'' + dg.id + '\');closeModal();">' +
            '<span class="name"><span style="font-size:18px">' + dg.icon + '</span> ' + dg.name +
            '<br><small style="color:#888">Lv.' + dg.minLevel + '+ | ' + dg.floors + '층 | 입장료 ' + dg.entryFee + 'G</small>' +
            '<br><small style="color:#aaa">' + dg.desc + '</small></span></div>';
        });
        showModal('🏰 심층 던전', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });

      window.socket.on('deep_dungeon_result', (d) => {
        if (d.success === false) { showToast(d.msg); return; }

        if (d.type === 'abandon') {
          showToast(d.msg);
          return;
        }

        if (d.floor) {
          // 입장 또는 층 이동
          var floorInfo = d.floor || d.nextFloor;
          if (floorInfo) {
            var html = '<div style="text-align:center">' +
              '<p style="color:#ffd700;font-size:16px;font-weight:900">' + (floorInfo.name || '') + '</p>' +
              '<p style="color:#8a8470;font-size:11px;font-style:italic;margin:6px 0">' + (floorInfo.ambience || '') + '</p>';
            if (floorInfo.hasBoss && floorInfo.bossName) {
              html += '<p style="color:#ff4444;font-size:13px;margin-top:8px">⚠️ 보스: ' + floorInfo.bossName + '</p>';
            }
            html += '<p style="color:#888;font-size:11px">층 ' + (floorInfo.index+1) + '/' + (d.totalFloors||10) + '</p>';
            html += '<div style="margin-top:10px;display:flex;gap:6px;justify-content:center">' +
              '<button class="btn btn-primary" onclick="window.socket.emit(\'deep_dungeon_kill\');closeModal();">⚔ 전투!</button>' +
              '<button class="btn btn-danger" onclick="window.socket.emit(\'deep_dungeon_abandon\');closeModal();">포기</button></div></div>';
            showModal('🏰 ' + (d.dungeonName || '심층 던전'), html, []);
            // 존 공지 스타일 연출
            var za = document.getElementById('zone-announce');
            if (za) {
              za.querySelector('.zone-name').textContent = floorInfo.name;
              za.querySelector('.zone-name').style.color = floorInfo.hasBoss ? '#ff4444' : '#ffd700';
              za.querySelector('.zone-info').textContent = floorInfo.ambience || '';
              za.classList.remove('show'); void za.offsetWidth; za.classList.add('show');
              setTimeout(function(){ za.classList.remove('show'); }, 2500);
            }
            if (typeof playSFX2 === 'function') playSFX2('dark_magic');
          }
        }

        if (d.type === 'floor_clear') {
          showToast('✅ ' + d.clearedFloorName + ' 클리어! +' + d.reward.gold + 'G +' + d.reward.exp + 'EXP');
          playSFX('levelup');
          if (d.trap) {
            showToast(d.trap.msg);
            if (d.trap.damage) showFloatingDamage(d.trap.damage, false, '함정', 'fire');
          }
        }

        if (d.type === 'kill') {
          showFloatingDamage('Kill! ' + d.killed + '/' + d.total, false, null, 'normal');
        }

        if (d.type === 'boss_hit') {
          showFloatingDamage(d.damage, d.isCrit, null, 'dark');
          if (d.phaseChange) {
            if (typeof showBossEntrance === 'function') {
              showBossEntrance(d.bossName, '— ' + d.phaseChange.name + ' —');
            }
            addCombatLog('[보스] ' + d.phaseChange.name + ' — ' + d.phaseChange.desc, 'log-crit');
          }
          // 보스 HP 표시
          var hpPct = d.bossMaxHp > 0 ? Math.floor(d.bossHp / d.bossMaxHp * 100) : 0;
          document.title = d.bossName + ' HP: ' + hpPct + '%';
        }

        if (d.type === 'dungeon_complete') {
          document.title = 'AutoBattle.io';
          var html = '<div style="text-align:center">' +
            '<p style="color:#ffd700;font-size:20px;font-weight:900">🏆 던전 클리어!</p>' +
            '<p style="color:#ddd;font-size:14px;margin:8px 0">' + d.dungeonName + '</p>' +
            '<p style="color:#888;font-size:11px">클리어 시간: ' + Math.floor(d.elapsedSec/60) + '분 ' + (d.elapsedSec%60) + '초</p>' +
            '<div style="margin:12px 0;padding:12px;background:rgba(255,215,0,0.05);border-radius:8px;border:1px solid rgba(255,215,0,0.15)">' +
            '<p style="color:#ffd700">💰 ' + d.totalReward.gold + 'G</p>' +
            '<p style="color:#aa44ff">✨ ' + d.totalReward.exp + ' EXP</p>' +
            (d.totalReward.diamonds > 0 ? '<p style="color:#55ccff">💎 ' + d.totalReward.diamonds + '</p>' : '') +
            (d.totalReward.items.length > 0 ? '<p style="color:#ff8800">🎁 ' + d.totalReward.items.map(function(i){return i.name;}).join(', ') + '</p>' : '') +
            '</div></div>';
          showModal('🏆 던전 클리어', html, [{label:'확인', action:'closeModal()'}]);
          if (typeof celebrateRareDrop === 'function') celebrateRareDrop('legendary');
          playSFX('levelup'); playSFX('boss');
        }
      });

      window.socket.on('deep_dungeon_status', (d) => {
        if (!d.active) { showToast('진행 중인 심층 던전이 없습니다.'); return; }
        var html = '<p style="color:#ffd700;text-align:center">' + d.dungeonName + '</p>' +
          '<p style="text-align:center;color:#ddd">' + d.floor.name + ' (' + (d.floor.index+1) + '/' + d.totalFloors + ')</p>' +
          '<p style="text-align:center;color:#888;font-style:italic">' + d.floor.ambience + '</p>' +
          '<p style="text-align:center;color:#aaa">진행: ' + d.progress + '</p>';
        if (d.boss) {
          var hpPct = d.boss.maxHp > 0 ? Math.floor(d.boss.hp / d.boss.maxHp * 100) : 0;
          html += '<div style="margin:8px 0;text-align:center"><p style="color:#ff4444">보스: ' + d.boss.name + '</p>' +
            '<div style="width:100%;height:12px;background:#222;border-radius:6px;overflow:hidden;margin-top:4px"><div style="width:'+hpPct+'%;height:100%;background:linear-gradient(90deg,#cc2222,#ff4444);border-radius:6px"></div></div>' +
            '<p style="color:#888;font-size:10px">' + d.boss.hp + ' / ' + d.boss.maxHp + '</p></div>';
        }
        html += '<p style="text-align:center;color:#ffd700;font-size:11px;margin-top:8px">누적: ' + d.accumulated.gold + 'G, ' + d.accumulated.exp + 'EXP</p>';
        showModal('🏰 진행 상황', html, [
          {label:'⚔ 전투!', action:"window.socket.emit('deep_dungeon_kill');closeModal();"},
          {label:'포기', action:"window.socket.emit('deep_dungeon_abandon');closeModal();"},
          {label:'닫기', type:'cancel', action:'closeModal()'}
        ]);
      });

      // ═══ 전투 강화 시스템 ═══
      // 궁극기 게이지
      window.socket.on('ultimate_gauge', (d) => {
        var gaugeEl = document.getElementById('ultimate-gauge');
        var fillEl = document.getElementById('ult-gauge-fill');
        var btnEl = document.getElementById('ult-btn');
        if (!gaugeEl || !fillEl) return;
        gaugeEl.classList.add('show');
        var pct = Math.min(100, Math.floor(d.gauge / d.max * 100));
        fillEl.style.width = pct + '%';
        if (pct >= 100) {
          btnEl.style.display = 'inline-block';
          btnEl.textContent = '⚡ ' + (d.name || '궁극기');
        } else {
          btnEl.style.display = 'none';
        }
      });

      // 궁극기 발동
      window.socket.on('ultimate_activated', (d) => {
        if (typeof showBossEntrance === 'function') {
          showBossEntrance(d.name, '— ' + d.desc + ' —');
        }
        if (typeof showMagicCircle === 'function') showMagicCircle(d.animation || 'fire', 250);
        if (typeof playSFX2 === 'function') playSFX2('boss_roar');
        playSFX('boss'); playSFX('levelup');
        // 화면 효과
        document.getElementById('unity-container').classList.add('shake');
        setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 800);
        // 게이지 리셋
        var fillEl = document.getElementById('ult-gauge-fill');
        if (fillEl) fillEl.style.width = '0%';
        var btnEl = document.getElementById('ult-btn');
        if (btnEl) btnEl.style.display = 'none';
      });

      // 콤보 발동
      window.socket.on('combo_triggered', (d) => {
        var el = document.getElementById('combo-display');
        if (!el) return;
        el.style.display = 'block';
        el.innerHTML = '<div class="combo-text" style="font-size:' + (d.name.length > 6 ? '28' : '36') + 'px;color:' + (d.color || '#ffd700') + '">' +
          (d.icon || '⚔️') + ' ' + d.name + '</div>' +
          '<div style="color:#fff;font-size:14px;margin-top:4px;opacity:0.8;animation:lvlFade 2s ease-out forwards">' + (d.msg || '') + '</div>';
        playSFX('levelup');
        if (typeof showHitSparks === 'function') showHitSparks(50, 40, d.animation || 'fire');
        setTimeout(function() { el.style.display = 'none'; }, 2500);
      });

      // 상태이상 적용/해제
      window.socket.on('status_effect_applied', (d) => {
        addCombatLog(d.icon + ' ' + d.name + ' 상태이상! (' + d.duration + '초)', 'log-crit');
        showToast(d.icon + ' ' + d.targetName + '에게 ' + d.name + ' 적용!');
      });

      window.socket.on('status_effects_update', (d) => {
        var bar = document.getElementById('status-effects-bar');
        if (!bar) return;
        if (!d.effects || d.effects.length === 0) { bar.innerHTML = ''; return; }
        bar.innerHTML = d.effects.map(function(e) {
          var remaining = Math.max(0, Math.ceil((e.expiresAt - Date.now()) / 1000));
          return '<div class="status-icon" style="background:' + e.color + '22;border-color:' + e.color + '44">' +
            '<span>' + e.icon + '</span>' +
            (e.stacks > 1 ? '<span class="status-stacks">x' + e.stacks + '</span>' : '') +
            '<span class="status-timer">' + remaining + 's</span>' +
            '</div>';
        }).join('');
      });

      window.socket.on('status_dot_tick', (d) => {
        if (d.damage > 0) {
          showFloatingDamage(d.damage, false, d.icon, d.element || 'normal');
        }
      });

      // 세트 효과 알림
      window.socket.on('set_bonus_activated', (d) => {
        showToast('✨ ' + d.setName + ' 세트 효과 발동! ' + d.desc);
        if (typeof playSFX2 === 'function') playSFX2('enchant');
        else playSFX('levelup');
      });

      // ═══ NPC 대화 시스템 ═══
      window.socket.on('town_npc_list', (d) => {
        if (!d.npcs || d.npcs.length === 0) {
          showToast('이 마을에는 대화할 NPC가 없습니다.');
          return;
        }
        var html = '<div style="text-align:center;margin-bottom:8px"><span style="color:#44ff44;font-size:11px;letter-spacing:2px">TOWN NPCs</span></div>';
        d.npcs.forEach(function(npc) {
          html += '<div class="npc-card" onclick="window.socket.emit(\'npc_open_dialog\',\'' + npc.id + '\')">' +
            '<span class="npc-icon">' + (npc.icon || '👤') + '</span>' +
            '<div><div class="npc-name">' + npc.name + '</div><div class="npc-title">' + (npc.title || '') + '</div></div>' +
            '</div>';
        });
        showModal('🏘 마을 NPC', html, [{label:'닫기', type:'cancel', action:'closeModal()'}]);
      });

      window.socket.on('npc_dialog', (d) => {
        closeModal();
        var dlg = document.getElementById('npc-dialog');
        document.getElementById('npc-dialog-icon').textContent = d.icon || '👤';
        document.getElementById('npc-dialog-name').textContent = d.name;
        document.getElementById('npc-dialog-title').textContent = d.title || '';
        document.getElementById('npc-dialog-greeting').textContent = d.greeting;
        var menuHtml = '';
        d.menu.forEach(function(m) {
          menuHtml += '<button class="npc-menu-btn" onclick="npcAction(\'' + d.npcId + '\',\'' + m.action + '\')">' + m.label + '</button>';
        });
        document.getElementById('npc-dialog-menu').innerHTML = menuHtml;
        dlg.classList.add('show');
        dlg.style.display = 'flex';
        if (typeof playSFX2 === 'function') playSFX2('equip');
        else playSFX('buy');
      });

      window.socket.on('npc_dialog_text', (d) => {
        // NPC 대화 텍스트 — 대화창 업데이트
        var greeting = document.getElementById('npc-dialog-greeting');
        if (greeting) {
          greeting.innerHTML = '<div style="color:#ffd700;font-size:11px;margin-bottom:4px">' + (d.icon || '') + ' ' + d.name + '</div>' + d.text;
        }
      });

      window.socket.on('npc_storage', (d) => {
        closeNpcDialog();
        var html = '<p style="text-align:center;color:#ffd700;margin-bottom:8px">' + (d.npcName || '창고') + ' (' + Object.keys(d.items).length + '/' + d.slots + '칸)</p>';
        var keys = Object.keys(d.items);
        if (keys.length === 0) {
          html += '<p style="text-align:center;color:#666;margin:20px 0">창고가 비어있습니다</p>';
        } else {
          html += '<div style="max-height:40vh;overflow-y:auto">';
          keys.forEach(function(k) {
            html += '<div class="panel-item"><span class="name">' + k + ' <b style="color:#888">x' + d.items[k] + '</b></span>' +
              '<button onclick="window.socket.emit(\'storage_action\',{action:\'withdraw\',itemId:\'' + k + '\',count:1})" style="background:#2a4a2a;font-size:10px">꺼내기</button></div>';
          });
          html += '</div>';
        }
        html += '<div style="border-top:1px solid #444;padding-top:8px;margin-top:8px">' +
          '<p class="text-muted text-sm" style="text-align:center">인벤토리에서 보관</p>' +
          '<input id="storage-item-id" placeholder="아이템 ID" style="width:100%;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:4px 0;font-size:11px">' +
          '</div>';
        showModal('📦 창고', html, [
          {label:'보관', action:"window.socket.emit('storage_action',{action:'deposit',itemId:getModalInput('storage-item-id'),count:1})"},
          {label:'닫기', type:'cancel', action:'closeModal()'}
        ]);
      });

      window.socket.on('teleport_effect', (d) => {
        if (typeof showMagicCircle === 'function') showMagicCircle('', 180);
        showToast('🌀 ' + d.name + '(으)로 이동합니다!');
        playSFX('buff');
      });

      window.socket.on('buff_applied', (d) => {
        showToast('✨ 버프: ' + d.type + ' +' + d.value + (d.from ? ' (' + d.from + ')' : ''));
        playSFX('buff');
      });

      // ═══ 배틀로얄 이벤트 ═══
      window.socket.on('br_result', (d) => { showToast(d.msg); });

      window.socket.on('battle_royale_status', (d) => {
        var body = document.getElementById('br-modal-body');
        if (!body) return;
        var html = '';
        if (d.phase === 'idle') {
          html = '<div style="text-align:center">' +
            '<p style="color:#ffd700;font-size:16px;margin-bottom:12px">🏟️ 배틀로얄</p>' +
            '<p class="text-muted">최대 20명이 전투하여 최후의 1인을 가립니다!</p>' +
            '<p class="text-muted text-sm" style="margin:8px 0">참가비: 2,000G | 상금: 풀 적립식</p>' +
            '<p style="color:#888;font-size:11px">현재 대기 중 — 곧 자동 개최됩니다</p>' +
            '<button class="btn btn-primary" onclick="window.socket.emit(\'br_start_manual\');closeModal();" style="margin-top:12px">수동 개최</button>' +
            '</div>';
        } else if (d.phase === 'registration') {
          html = '<div style="text-align:center">' +
            '<p style="color:#ff8800;font-size:16px;margin-bottom:8px">⚔️ 참가 등록 중!</p>' +
            '<p class="text-gold" style="font-size:20px">' + d.playerCount + ' / ' + d.maxPlayers + '</p>' +
            '<p class="text-muted">상금 풀: ' + d.prizePool + 'G</p>' +
            '<button class="btn btn-primary" onclick="window.socket.emit(\'br_register\');closeModal();" style="margin-top:12px;font-size:16px;padding:12px 24px">⚔️ 참가 등록 (2,000G)</button>' +
            '</div>';
        } else if (d.phase === 'active') {
          html = '<div>' +
            '<div style="text-align:center;margin-bottom:10px">' +
            '<p style="color:#ff4444;font-size:16px">🔥 배틀로얄 진행 중!</p>' +
            '<p class="text-gold">생존자: ' + d.aliveCount + ' / ' + d.playerCount + '</p>' +
            '<p class="text-muted text-sm">경과: ' + Math.floor(d.elapsed/60) + ':' + (d.elapsed%60<10?'0':'') + (d.elapsed%60) + ' | 안전지대: ' + d.safeZone.radius + '</p>' +
            '</div>';
          // 참가자 목록
          html += '<div style="max-height:30vh;overflow-y:auto">';
          d.players.sort(function(a,b){ return b.alive-a.alive || b.kills-a.kills; }).forEach(function(p) {
            var color = p.alive ? '#44ff44' : '#ff4444';
            var hpPct = p.maxHp > 0 ? Math.floor(p.hp/p.maxHp*100) : 0;
            html += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #222;opacity:'+(p.alive?1:0.4)+'">' +
              '<span style="color:'+color+';font-size:11px;width:14px">'+(p.alive?'⚔':'💀')+'</span>' +
              '<span style="flex:1;font-size:11px;color:#ddd">'+p.name+' <span style="color:#888">Lv.'+p.level+'</span></span>' +
              '<span style="font-size:10px;color:#ffd700">'+p.kills+' kills</span>' +
              (p.alive ? '<span style="width:50px;height:6px;background:#222;border-radius:3px;overflow:hidden"><span style="display:block;width:'+hpPct+'%;height:100%;background:'+(hpPct>50?'#44cc44':hpPct>25?'#ccaa00':'#cc2222')+'"></span></span>' : '') +
              '</div>';
          });
          html += '</div></div>';
        } else if (d.phase === 'finished') {
          html = '<div style="text-align:center"><p class="text-gold" style="font-size:16px">🏆 배틀로얄 종료!</p></div>';
        }
        body.innerHTML = html;
      });

      window.socket.on('battle_royale_start', (d) => {
        if (typeof showBossEntrance === 'function') {
          showBossEntrance('BATTLE ROYALE', '— ' + d.playerCount + '명의 전사가 격돌한다 —');
        }
        showToast('🏟️ 배틀로얄 시작! 상금: ' + d.prizePool + 'G');
      });

      window.socket.on('battle_royale_zone_shrink', (d) => {
        showToast('⚠️ 안전지대 축소! 반경 ' + d.safeZone.radius);
        if (typeof playSFX2 === 'function') playSFX2('thunder');
        else playSFX('boss');
      });

      window.socket.on('battle_royale_zone_damage', (d) => {
        showFloatingDamage(d.damage, false, '독가스', 'poison');
      });

      window.socket.on('battle_royale_combat', (d) => {
        addCombatLog(d.attackerName + ' → ' + d.targetName + ' ' + d.damage + (d.isCrit ? ' 크리!' : ''), d.isCrit ? 'log-crit' : 'normal');
      });

      window.socket.on('battle_royale_eliminate', (d) => {
        var msg = '💀 ' + d.victimName + ' 탈락! (' + d.killerName + ') — 잔여 ' + d.remaining + '명';
        addCombatLog(msg, 'log-crit');
        if (d.remaining <= 5) {
          if (typeof showFantasyToast === 'function') showFantasyToast(msg, 'legendary');
          else showToast(msg);
        }
      });

      window.socket.on('battle_royale_supply', (d) => {
        showToast('📦 보급 상자 투하! — ' + d.name);
        playSFX('gold');
      });

      window.socket.on('battle_royale_pickup', (d) => {
        showToast('📦 ' + d.item + ' 획득!');
        playSFX('buff');
      });

      window.socket.on('battle_royale_end', (d) => {
        var html = '<div style="text-align:center;margin-bottom:12px">' +
          '<p style="color:#ffd700;font-size:18px;font-weight:900">🏆 배틀로얄 결과</p>' +
          '<p class="text-muted">상금 풀: ' + d.prizePool + 'G</p>' +
          (d.topKiller ? '<p style="color:#ff4444;font-size:11px">최다 킬: ' + d.topKiller.name + ' (' + d.topKiller.kills + '킬)</p>' : '') +
          '</div>';
        html += '<div style="max-height:40vh;overflow-y:auto">';
        var medals = ['🥇','🥈','🥉'];
        d.results.forEach(function(r) {
          var medal = medals[r.rank-1] || (r.rank + '위');
          var color = r.rank === 1 ? '#ffd700' : r.rank === 2 ? '#c0c0c0' : r.rank === 3 ? '#cd7f32' : '#888';
          html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #222">' +
            '<span style="font-size:16px;width:30px;text-align:center">' + medal + '</span>' +
            '<span style="flex:1;color:' + color + ';font-weight:bold">' + r.name + '</span>' +
            '<span style="font-size:10px;color:#aaa">' + r.kills + ' kills</span>' +
            '<span style="font-size:10px;color:#ffd700">' + r.goldReward + 'G</span>' +
            (r.diamondReward ? '<span style="font-size:10px;color:#55ccff">+' + r.diamondReward + '💎</span>' : '') +
            '</div>';
        });
        html += '</div>';
        showModal('🏆 배틀로얄', html, [{label:'확인', action:'closeModal()'}]);
        if (typeof celebrateRareDrop === 'function') celebrateRareDrop('legendary');
        playSFX('levelup');
      });

      window.socket.on('inventory_data', renderInventory);
      window.socket.on('inventory_update', (d) => { if(d.inventory) showToast('인벤토리 업데이트!'); });
      window.socket.on('market_data', renderMarket);
      window.socket.on('market_update', renderMarket);
      window.socket.on('quest_data', renderQuests);
      window.socket.on('unit_data', renderUnits);
      window.socket.on('ranking_data', renderRanking);

      // ── 퀘스트 체인 길잡이 HUD ──
      window.socket.on('quest_chain_next', function(q) {
        var el = document.getElementById('quest-guide');
        if (!q) { el.classList.add('qg-hidden'); return; }
        el.classList.remove('qg-hidden', 'qg-complete');
        var pct = q.goal > 0 ? Math.min(100, Math.floor(q.progress / q.goal * 100)) : 0;
        el.innerHTML =
          '<div class="qg-chapter">Chapter ' + q.chapter + '</div>' +
          '<div class="qg-name">' + escapeHtml(q.name) + '</div>' +
          '<div class="qg-desc">' + escapeHtml(q.desc) + '</div>' +
          '<div class="qg-progress"><div class="qg-progress-fill" style="width:' + pct + '%"></div>' +
          '<div class="qg-progress-text">' + q.progress + ' / ' + q.goal + '</div></div>' +
          '<div class="qg-hint">' + escapeHtml(q.guide || '') + '</div>';
      });
      window.socket.on('quest_chain_progress', function(d) {
        if (!d) return;
        var fill = document.querySelector('#quest-guide .qg-progress-fill');
        var text = document.querySelector('#quest-guide .qg-progress-text');
        if (fill && text) {
          var el = document.getElementById('quest-guide');
          // quest goal을 기존 텍스트에서 추출
          var parts = text.textContent.split('/');
          var goal = parseInt(parts[1]) || 1;
          var pct = Math.min(100, Math.floor(d.progress / goal * 100));
          fill.style.width = pct + '%';
          text.textContent = d.progress + ' / ' + goal;
        }
      });
      window.socket.on('quest_chain_complete', function(d) {
        var el = document.getElementById('quest-guide');
        el.classList.add('qg-complete');
        showToast('✨ 퀘스트 완료: ' + d.name + '!');
        playSFX('levelup');
        // 보상 자동 수령
        window.socket.emit('quest_chain_claim', { questId: d.id });
      });
      window.socket.on('quest_chain_hidden_complete', function(d) {
        showToast('🔮 숨겨진 퀘스트 발견 & 완료: ' + d.name + '!');
        playSFX('boss');
        window.socket.emit('quest_chain_claim', { questId: d.id, isHidden: true });
      });
      window.socket.on('quest_chain_claim_result', function(d) {
        if (d.success) showToast('보상 수령: ' + d.questName);
      });
      window.socket.on('quest_chain_status', function(status) {
        if (!status) return;
        var html = '<div style="text-align:center;margin-bottom:8px"><b class="text-gold" style="font-size:14px">📜 메인 스토리</b></div>';
        html += '<div style="margin-bottom:6px;color:#888;font-size:10px">완료: ' + status.totalCompleted + '/' + status.totalQuests + '</div>';
        for (var ch in status.chapters) {
          var c = status.chapters[ch];
          html += '<div style="margin:4px 0;padding:4px;background:rgba(255,255,255,0.03);border-radius:4px">';
          html += '<b style="color:#ffd700;font-size:11px">Chapter ' + ch + '</b> <span style="color:#888;font-size:9px">' + c.completed + '/' + c.total + '</span>';
          html += '</div>';
        }
        if (status.hidden.length > 0) {
          html += '<div style="margin-top:8px;color:#aa44ff;font-size:11px;font-weight:700">🔮 숨겨진 퀘스트</div>';
          for (var i = 0; i < status.hidden.length; i++) {
            var h = status.hidden[i];
            html += '<div style="color:' + (h.completed ? '#44ff44' : h.discovered ? '#aaa' : '#555') + ';font-size:10px">' +
              (h.completed ? '✅ ' : h.discovered ? '🔍 ' : '❓ ') + escapeHtml(h.name) +
              (h.discovered && !h.completed ? ' (' + h.progress + '/' + h.goal + ')' : '') + '</div>';
          }
        }
        showModal('스토리 퀘스트', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
      });
      // 접속 시 현재 퀘스트 요청
      setTimeout(function() { window.socket.emit('quest_chain_guide'); }, 2000);

      window.socket.on('player_die', (d) => {
        // 내가 죽으면 클래스 선택 다시 표시
        // Unity 측에서 처리하므로 여기서는 패스
      });
    }
