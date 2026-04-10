// Audio + Visual Effects (extracted from index.html)

    function saveAudioPrefs() {
      try {
        localStorage.setItem('ab_audio', JSON.stringify({
          bgm: window._bgmVol, sfx: window._sfxVol, muted: !soundEnabled
        }));
      } catch(e) {}
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      var btn = document.getElementById('btn-sound');
      if (btn) btn.textContent = 'Sound ' + (soundEnabled ? 'ON' : 'OFF');
      if (soundEnabled) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (!bgmPlaying) playBGM();
      } else {
        bgmPlaying = false;
      }
      saveAudioPrefs();
    }

    // 사운드 설정 모달 열기 (설정 메뉴에서 호출)
    window.openAudioSettings = function() {
      var html = '<div style="display:flex;flex-direction:column;gap:14px;padding:8px">' +
        '<div><label style="color:#ddd;font-size:13px">🎵 BGM 볼륨: <span id="bgm-vol-label">' + Math.round(window._bgmVol*100) + '%</span></label>' +
        '<input id="bgm-vol-slider" type="range" min="0" max="100" value="' + Math.round(window._bgmVol*100) + '" style="width:100%" oninput="window._bgmVol=this.value/100;document.getElementById(\'bgm-vol-label\').textContent=this.value+\'%\';saveAudioPrefs();"></div>' +
        '<div><label style="color:#ddd;font-size:13px">🔊 효과음 볼륨: <span id="sfx-vol-label">' + Math.round(window._sfxVol*100) + '%</span></label>' +
        '<input id="sfx-vol-slider" type="range" min="0" max="100" value="' + Math.round(window._sfxVol*100) + '" style="width:100%" oninput="window._sfxVol=this.value/100;document.getElementById(\'sfx-vol-label\').textContent=this.value+\'%\';saveAudioPrefs();"></div>' +
        '<div style="text-align:center"><button class="btn" onclick="toggleSound();this.textContent=\'사운드 \'+(soundEnabled?\'ON\':\'OFF\');">사운드 ' + (soundEnabled ? 'ON' : 'OFF') + '</button></div>' +
        '<p class="text-muted text-sm" style="text-align:center">설정은 자동 저장됩니다</p></div>';
      showModal('🔊 사운드 설정', html, [{label:'닫기',type:'cancel',action:'closeModal()'}]);
    };

    // 존별 BGM 프로필
    var ZONE_BGM = {
      map_village:{notes:[261,329,392,440,523,440],type:'sine',tempo:1200,vol:0.025},
      map_forest: {notes:[261,293,329,392,440,392],type:'sine',tempo:1000,vol:0.03},
      map_plains: {notes:[329,392,440,523,440,392],type:'sine',tempo:900,vol:0.03},
      map_dungeon:{notes:[196,220,261,293,261,220],type:'triangle',tempo:1400,vol:0.025},
      map_dragon: {notes:[196,261,329,196,220,293],type:'sawtooth',tempo:700,vol:0.04},
      map_chaos:  {notes:[146,174,196,220,196,174],type:'square',tempo:600,vol:0.035},
    };
    var ZONE_BG_MAP = {};
    // 존→배경 매핑 (zones 객체에서 추출 불가하므로 간단 매핑)
    ['aden','harbor','oasis','mountain','frontier','shrine','bazaar','port_east','fishing'].forEach(function(z){ZONE_BG_MAP[z]='map_village';});
    ['forest','meadow','darkforest','ancient','toxic_marsh','mushroom','world_tree'].forEach(function(z){ZONE_BG_MAP[z]='map_forest';});
    ['plains','desert','coral','riverbank','sandstorm','tundra','training'].forEach(function(z){ZONE_BG_MAP[z]='map_plains';});
    ['cave','ruins','graveyard','glacier','crystal_mine','haunted','sky_ruins','frozen_deep','castle','colosseum','fortress','sunken'].forEach(function(z){ZONE_BG_MAP[z]='map_dungeon';});
    ['volcano','dragon','magma_core','celestial'].forEach(function(z){ZONE_BG_MAP[z]='map_dragon';});
    ['abyss','hell','chaos','warzone','shadow','void_rift','demon','blood_arena','lawless'].forEach(function(z){ZONE_BG_MAP[z]='map_chaos';});

    function playBGM() {
      if (!soundEnabled || !audioCtx) return;
      bgmPlaying = true;
      function playNote() {
        if (!bgmPlaying || !soundEnabled) return;
        var bgType = ZONE_BG_MAP[myCurrentZone] || 'map_plains';
        var profile = ZONE_BGM[bgType] || ZONE_BGM.map_plains;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var note = profile.notes[Math.floor(Math.random() * profile.notes.length)];
        osc.type = profile.type;
        osc.frequency.value = note * (0.5 + Math.random() * 0.02);
        var vol = profile.vol * (window._bgmVol !== undefined ? window._bgmVol : 1);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 2);
        setTimeout(playNote, profile.tempo + Math.random() * (profile.tempo * 0.5));
      }
      playNote();
    }

    function playSFX(type) {
      if (!soundEnabled || !audioCtx) return;
      var sfxVol = (typeof window._sfxVol === 'number') ? window._sfxVol : 1;
      if (sfxVol <= 0) return;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var master = audioCtx.createGain();
      master.gain.value = sfxVol;
      osc.connect(gain);
      gain.connect(master);
      master.connect(audioCtx.destination);

      switch(type) {
        case 'hit':
          osc.type = 'square';
          osc.frequency.value = 200 + Math.random() * 100;
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
          osc.start(); osc.stop(audioCtx.currentTime + 0.1);
          break;
        case 'crit':
          osc.type = 'sawtooth';
          osc.frequency.value = 400;
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
          osc.start(); osc.stop(audioCtx.currentTime + 0.2);
          break;
        case 'levelup':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.start(); osc.stop(audioCtx.currentTime + 0.5);
          break;
        case 'buy':
          osc.type = 'sine';
          osc.frequency.value = 600;
          gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          osc.start(); osc.stop(audioCtx.currentTime + 0.15);
          break;
        case 'die':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.start(); osc.stop(audioCtx.currentTime + 0.5);
          break;
        case 'gold':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          osc.start(); osc.stop(audioCtx.currentTime + 0.15);
          break;
        case 'skill': // 스킬 시전
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
          osc.start(); osc.stop(audioCtx.currentTime + 0.25);
          break;
        case 'buff': // 버프 획득
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          osc.start(); osc.stop(audioCtx.currentTime + 0.3);
          break;
        case 'pvp': // PvP 전환
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          osc.start(); osc.stop(audioCtx.currentTime + 0.4);
          break;
        case 'boss': // 보스 출현
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(80, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
          osc.start(); osc.stop(audioCtx.currentTime + 0.8);
          break;
        case 'heal': // 힐 효과
          osc.type = 'sine';
          osc.frequency.setValueAtTime(700, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(1100, audioCtx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          osc.start(); osc.stop(audioCtx.currentTime + 0.4);
          break;
        case 'tame': // 테이밍 성공
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(700, audioCtx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.start(); osc.stop(audioCtx.currentTime + 0.5);
          break;
      }
    }

    function doCraft(recipeId) { window.socket.emit('craft', recipeId); }

    // ── 공격 버튼 ──
    function doAttack(e) {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      if (window.socket) {
        window.socket.emit('throw', '{}');
        playSFX('hit');
      }
      var btn = document.getElementById('attack-btn');
      btn.style.transform = 'scale(0.85)';
      btn.style.filter = 'brightness(1.5)';
      setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.filter = ''; }, 120);
    }

    var attackTouchStart = null;
    function startAttack(e) {
      e.stopPropagation(); e.preventDefault();
      attackTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    function endAttack(e) {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      doAttack();
      attackTouchStart = null;
    }

    function respawnAs(className) {
      window.socket.emit('respawn', JSON.stringify({className}));
      document.getElementById('respawn-screen').style.display = 'none';
    }

    // ── 숫자 스무스 애니메이션 ──
    var _counterAnims = {};
    function animateCounter(elId, toVal) {
      var el = document.getElementById(elId);
      if (!el) return;
      var from = parseInt(el.textContent.replace(/[^0-9-]/g,'')) || 0;
      if (from === toVal) return;
      if (_counterAnims[elId]) cancelAnimationFrame(_counterAnims[elId]);
      var start = performance.now(), dur = 400;
      function step(now) {
        var t = Math.min(1, (now - start) / dur);
        var val = Math.round(from + (toVal - from) * t);
        el.textContent = val.toLocaleString();
        if (t < 1) _counterAnims[elId] = requestAnimationFrame(step);
      }
      _counterAnims[elId] = requestAnimationFrame(step);
    }

    // ── 레어 드롭 축하 ──
    function celebrateRareDrop(grade) {
      var colors = {epic:'#aa44ff',legendary:'#ff8800',mythic:'#ff00ff'};
      var c = colors[grade] || '#ffd700';
      // 화면 플래시
      var flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:'+c+';opacity:0.3;pointer-events:none;z-index:50;transition:opacity 0.6s';
      document.body.appendChild(flash);
      requestAnimationFrame(function(){ flash.style.opacity = '0'; });
      setTimeout(function(){ flash.remove(); }, 700);
      // 파티클
      for (var i = 0; i < 25; i++) {
        var p = document.createElement('div');
        var x = 20 + Math.random() * 60, startY = 30 + Math.random() * 40;
        p.style.cssText = 'position:fixed;left:'+x+'%;top:'+startY+'%;width:4px;height:4px;border-radius:50%;background:'+c+';pointer-events:none;z-index:51;opacity:1;transition:all 1.5s ease-out';
        document.body.appendChild(p);
        requestAnimationFrame(function(){ p.style.top = (startY + 20 + Math.random()*30) + '%'; p.style.opacity = '0'; p.style.transform = 'scale(0.3)'; });
        setTimeout(function(){ p.remove(); }, 1600);
      }
      playSFX('boss'); playSFX('levelup');
    }

    // ── 날씨 파티클 ──
    var weatherCanvas = document.createElement('canvas');
    weatherCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2';
    document.body.appendChild(weatherCanvas);
    var wxCtx = weatherCanvas.getContext('2d');
    var wxParticles = [];
    var wxActive = false;

    function resizeWeatherCanvas() { weatherCanvas.width = window.innerWidth; weatherCanvas.height = window.innerHeight; }
    window.addEventListener('resize', resizeWeatherCanvas);
    resizeWeatherCanvas();

    function startWeatherParticles(type) {
      wxParticles = [];
      wxActive = type !== 'clear' && type !== 'fog';
      if (!wxActive) { wxCtx.clearRect(0,0,weatherCanvas.width,weatherCanvas.height); return; }
      var count = window.innerWidth < 768 ? 15 : 30;
      for (var i = 0; i < count; i++) {
        wxParticles.push({ x:Math.random()*weatherCanvas.width, y:Math.random()*weatherCanvas.height, speed:2+Math.random()*3, size:type==='snow'?2+Math.random()*2:1, drift:type==='snow'?Math.random()*2-1:0 });
      }
    }

    function drawWeatherParticles() {
      if (!wxActive) { requestAnimationFrame(drawWeatherParticles); return; }
      wxCtx.clearRect(0,0,weatherCanvas.width,weatherCanvas.height);
      var currentWx = currentWeather?.id || 'clear';
      wxParticles.forEach(function(p) {
        if (currentWx === 'rain' || currentWx === 'storm') {
          wxCtx.strokeStyle = 'rgba(180,200,255,0.3)';
          wxCtx.lineWidth = p.size;
          wxCtx.beginPath();
          wxCtx.moveTo(p.x, p.y);
          wxCtx.lineTo(p.x - 2, p.y + 8);
          wxCtx.stroke();
          p.y += p.speed * 2; p.x -= 1;
        } else if (currentWx === 'snow') {
          wxCtx.fillStyle = 'rgba(255,255,255,0.5)';
          wxCtx.beginPath();
          wxCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
          wxCtx.fill();
          p.y += p.speed * 0.5; p.x += Math.sin(p.y * 0.02) * p.drift;
        }
        if (p.y > weatherCanvas.height) { p.y = -5; p.x = Math.random() * weatherCanvas.width; }
        if (p.x < 0) p.x = weatherCanvas.width;
      });
      requestAnimationFrame(drawWeatherParticles);
    }
    requestAnimationFrame(drawWeatherParticles);

    var currentWeather = {id:'clear'};

    // ── 도파민 루프 시스템 ──
    var dpsSamples = []; // [{time, damage}]
    // setupSocketListeners 내부 setInterval(line 2804+)에서도 접근 가능하도록 외부 스코프 선언
    var lastGold = 0, lastDiamonds = 0, lastZone = '', lastKills = 0;
    var gameStats = { kills:0, startTime:Date.now() };
    var killStreak = 0, lastKillTime = 0;
    var sessionStartGold = 0;
    var sessionStartTime = Date.now();
    var sessionDeaths = 0;
    var recentLoots = [];
    var personalBests = JSON.parse(localStorage.getItem('ab_records') || '{}');

    // DPS 히스토리 (스파크라인용)
    var dpsHistory = []; // 최근 20초간 1초당 dps
    // DPS 계산 (1초마다)
    setInterval(function() {
      var now = Date.now();
      dpsSamples = dpsSamples.filter(function(s) { return now - s.time < 10000; });
      var totalDmg = dpsSamples.reduce(function(sum, s) { return sum + s.damage; }, 0);
      var dps = Math.floor(totalDmg / 10);

      // 히스토리 업데이트 (마지막 1초 내 데미지)
      var lastSecDmg = dpsSamples.filter(function(s) { return now - s.time < 1000; })
                                  .reduce(function(sum, s) { return sum + s.damage; }, 0);
      dpsHistory.push(lastSecDmg);
      if (dpsHistory.length > 20) dpsHistory.shift();

      var el = document.getElementById('dps-meter');
      if (el) {
        // 스파크라인 (Unicode 블록 문자)
        var maxVal = Math.max.apply(null, dpsHistory.length > 0 ? dpsHistory : [1]);
        var blocks = '▁▂▃▄▅▆▇█';
        var spark = dpsHistory.map(function(v) {
          if (v <= 0 || maxVal <= 0) return '▁';
          var idx = Math.min(7, Math.floor(v / maxVal * 7));
          return blocks[idx];
        }).join('');
        var color = dps > 500 ? '#ff4444' : dps > 200 ? '#ff8800' : dps > 50 ? '#ffd700' : '#aaa';
        el.innerHTML = 'DPS: <b>' + dps + '</b> <span style="opacity:0.7;font-size:11px;letter-spacing:-1px">' + spark + '</span>';
        el.style.color = color;
      }
      // DPS 개인 기록
      if (dps > (personalBests.maxDps || 0)) {
        personalBests.maxDps = dps;
        localStorage.setItem('ab_records', JSON.stringify(personalBests));
        if (dps > 100) showToast('NEW RECORD! 최고 DPS: ' + dps);
      }
    }, 1000);

    // 세션 스탯 업데이트 (1초마다)
    setInterval(function() {
      var elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      var min = Math.floor(elapsed / 60), sec = elapsed % 60;
      var timeStr = min + ':' + (sec < 10 ? '0' : '') + sec;
      document.getElementById('ss-time').textContent = '⏱ ' + timeStr;
      document.getElementById('ss-kills').textContent = '💀 ' + (gameStats.kills || 0);
      var goldDelta = lastGold - sessionStartGold;
      document.getElementById('ss-gold').textContent = '💰 ' + (goldDelta >= 0 ? '+' : '') + goldDelta + 'G';
      document.getElementById('ss-deaths').textContent = '☠ ' + sessionDeaths;
      // 접속자 수 (sync에서)
      if (window._lastPlayerCount !== undefined) document.getElementById('ss-online').textContent = '👥 ' + window._lastPlayerCount;
      // 킬 스트릭 개인 기록
      if (killStreak > (personalBests.maxStreak || 0)) {
        personalBests.maxStreak = killStreak;
        localStorage.setItem('ab_records', JSON.stringify(personalBests));
      }
      // 스킬 쿨타임 갱신
      if (window.socket && gameStarted) window.socket.emit('get_skill_cooldowns');
    }, 1000);

    // 루트 로그 추가
    function addLootEntry(text, color) {
      var log = document.getElementById('loot-log');
      if (!log) return;
      var el = document.createElement('div');
      el.className = 'loot-entry';
      el.style.background = color || 'rgba(100,100,100,0.5)';
      el.textContent = text;
      log.appendChild(el);
      recentLoots.push({ el: el, time: Date.now() });
      // 최대 5개 유지
      while (recentLoots.length > 5) { var old = recentLoots.shift(); if (old.el.parentNode) old.el.remove(); }
      // 30초 후 제거
      setTimeout(function() { el.style.opacity = '0'; el.style.transition = 'opacity 0.5s'; setTimeout(function() { el.remove(); }, 500); }, 15000);
    }

    // 회피 팝업
    function showDodgePopup() {
      var el = document.createElement('div');
      el.className = 'dodge-popup';
      el.textContent = '회피!';
      el.style.left = (40 + Math.random() * 20) + '%';
      el.style.top = (35 + Math.random() * 15) + '%';
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 800);
    }

    // 크리티컬 화면 플래시
    function showCritFlash() {
      var el = document.createElement('div');
      el.className = 'crit-flash';
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 300);
    }

    // 전투 상태 텍스트
    function updateCombatStatus(zoneName, tier) {
      var el = document.getElementById('combat-status');
      if (!el) return;
      var tierNames = {normal:'슬라임',elite:'엘리트',rare:'레어',boss:'보스',legendary:'전설',mythic:'신화',treasure:'보물 도깨비'};
      var action = tier ? (tierNames[tier] || tier) + ' 전투 중!' : '사냥 중...';
      el.textContent = (zoneName || '') + ' — ' + action;
      el.style.color = tier === 'boss' ? '#ff4444' : tier === 'legendary' ? '#ff8800' : tier === 'rare' ? '#aa44ff' : '#88ccff';
    }

    // ── 데미지 숫자 플로팅 ──
    var dmgContainer = document.createElement('div');
    dmgContainer.id = 'dmg-container';
    dmgContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:30;overflow:hidden';
    document.body.appendChild(dmgContainer);

    // ── 골드 변동 팝업 ──
    function showCurrencyPop(elementId, delta, color) {
      var parent = document.getElementById(elementId);
      if (!parent) return;
      var el = document.createElement('span');
      el.className = 'currency-popup';
      el.textContent = (delta > 0 ? '+' : '') + delta + (elementId.includes('gold') ? 'G' : 'D');
      el.style.color = color;
      el.style.left = parent.offsetLeft + 'px';
      el.style.top = (parent.offsetTop - 5) + 'px';
      parent.parentElement.appendChild(el);
      // 카운터 플래시
      parent.style.transform = 'scale(1.2)';
      parent.style.transition = 'transform 0.2s';
      setTimeout(function(){ parent.style.transform = 'scale(1)'; }, 200);
      setTimeout(function(){ el.remove(); }, 1500);
    }

    // ── 킬 스트릭 ──
    function showKillStreak(count) {
      var el = document.getElementById('kill-streak');
      if (count < 2) { el.innerHTML = ''; return; }
      var combos = [
        {min:2, name:'더블 킬!', color:'#ffffff', size:16},
        {min:3, name:'트리플 킬!', color:'#ffd700', size:18},
        {min:5, name:'연쇄 처형!', color:'#ff8800', size:20},
        {min:7, name:'학살자!', color:'#ff4444', size:22},
        {min:10,name:'전설의 사냥꾼!', color:'#ff00ff', size:26},
        {min:15,name:'신의 분노!', color:'#00ffff', size:28},
        {min:20,name:'불멸의 전사!', color:'#ffd700', size:32},
      ];
      var combo = combos[0];
      for (var c of combos) { if (count >= c.min) combo = c; }
      el.innerHTML = '<div class="streak-text" style="font-size:'+combo.size+'px;color:'+combo.color+'">'+combo.name+'<br><span style="font-size:12px;color:#888">'+count+'x</span></div>';
      if (count >= 10) { document.getElementById('unity-container').classList.add('shake'); setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); },300); }
    }

    function showFloatingDamage(damage, isCrit, skillName) {
      var el = document.createElement('div');
      var x = 40 + Math.random() * 20; // 화면 중앙 부근
      var y = 30 + Math.random() * 20;
      var color = isCrit ? '#ff4444' : '#fff';
      var size = isCrit ? '22px' : '16px';
      if (skillName) color = '#ffd700';
      el.textContent = (skillName ? skillName + ' ' : '') + '-' + damage;
      el.style.cssText = 'position:absolute;left:'+x+'%;top:'+y+'%;color:'+color+';font-size:'+size+';font-weight:bold;text-shadow:0 0 4px rgba(0,0,0,0.8);transition:all 1s ease-out;opacity:1;pointer-events:none;font-family:sans-serif';
      dmgContainer.appendChild(el);
      requestAnimationFrame(function() {
        el.style.top = (y - 10) + '%';
        el.style.opacity = '0';
      });
      setTimeout(function() { el.remove(); }, 1200);
    }

    // ── 게임 모달 시스템 ──
    function showModal(title, bodyHtml, buttons) {
      var m = document.getElementById('game-modal');
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').innerHTML = bodyHtml;
      var btnHtml = '';
      buttons.forEach(function(b) {
        var cls = b.type === 'cancel' ? 'btn' : 'btn btn-primary';
        btnHtml += '<button class="'+cls+'" onclick="'+b.action+'">'+b.label+'</button>';
      });
      document.getElementById('modal-buttons').innerHTML = btnHtml;
      m.style.display = 'flex';
    }
    function closeModal() { document.getElementById('game-modal').style.display = 'none'; }
    document.getElementById('game-modal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    function getModalInput(id) { var el = document.getElementById(id); return el ? el.value : ''; }

    // ── 서브메뉴 시스템 ──
    var currentSubMenu = '';
    var subMenuDefs = {
      combat: [
        {label:'유닛 관리', action:()=>togglePanel('units'), sub:'get_units'},
        {label:'변신', action:()=>togglePanel('morph')},
        {label:'스탯 배분', action:()=>togglePanel('stats')},
        {label:'스킬 보기', action:()=>{togglePanel('skills');window.socket.emit('get_skills');}},
        {label:'캐릭터', action:()=>{togglePanel('profile');window.socket.emit('get_profile');}},
        {label:'펫 & 탈것', action:()=>togglePanel('petmount')},
        {label:'NPC 힐러', action:()=>window.socket.emit('interact_npc','힐러')},
        {label:'NPC 대장장이', action:()=>window.socket.emit('interact_npc','대장장이')},
        {label:'NPC 항해사', action:()=>window.socket.emit('interact_npc','항해사')},
        {label:'📕 금서', action:()=>window.socket.emit('grimoire_status')},
        {label:'🌌 별자리', action:()=>window.socket.emit('constellation_status')},
        {label:'🔮 타로', action:()=>window.socket.emit('tarot_status')},
        {label:'🩸 혈맹', action:()=>window.socket.emit('bloodline_status')},
        {label:'👻 영혼계약', action:()=>window.socket.emit('soul_status')},
        {label:'📜 고대어', action:()=>window.socket.emit('ancient_lang_status')},
        {label:'🙏 신전', action:()=>window.socket.emit('divine_status')},
        {label:'♻️ 전생', action:()=>window.socket.emit('pastlife_status')},
        {label:'🧬 변이도감', action:()=>window.socket.emit('mutation_codex')},
        {label:'⛓️ 저주장비', action:()=>window.socket.emit('cursed_status')},
        {label:'⚗️ 연금술', action:()=>window.socket.emit('alchemy_status')},
        {label:'⚙️ 골렘', action:()=>window.socket.emit('golem_status')},
        {label:'🏆 전당', action:()=>window.socket.emit('hall_status')},
        {label:'🧚 정령', action:()=>window.socket.emit('spirit_status')},
        {label:'⚔️ 신화무기', action:()=>window.socket.emit('mythweapon_status')},
        {label:'🌀 차원여행', action:()=>window.socket.emit('dim_status')},
        {label:'부스트!', action:()=>window.socket.emit('active_tap')},
      ],
      items: [
        {label:'인벤토리', action:()=>{togglePanel('inventory');}, sub:'get_inventory'},
        {label:'장비 제작', action:()=>togglePanel('craft')},
        {label:'상점', action:()=>togglePanel('shop')},
      ],
      trade: [
        {label:'마을 교역', action:()=>{togglePanel('trade');window.socket.emit('get_town_prices','{}');}},
        {label:'경매장', action:()=>{togglePanel('market');window.socket.emit('market_browse',{});}},
        {label:'우편', action:()=>{showModal('우편 보내기','<div style="display:flex;flex-direction:column;gap:8px"><input id="mail-to" placeholder="받는 사람 이름" style="padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px"><select id="mail-type" style="padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px" onchange="document.getElementById(\'mail-item-row\').style.display=this.value===\'item\'?\'flex\':\'none\';document.getElementById(\'mail-gold-row\').style.display=this.value===\'gold\'?\'flex\':\'none\'"><option value="item">아이템 전송</option><option value="gold">골드 전송</option></select><div id="mail-item-row" style="display:flex;gap:4px"><input id="mail-item" placeholder="아이템 ID" style="flex:1;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px"><input id="mail-cnt" type="number" value="1" min="1" style="width:60px;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px"></div><div id="mail-gold-row" style="display:none;gap:4px"><input id="mail-gold" type="number" placeholder="골드 금액" style="flex:1;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px"></div></div>',[{label:'전송 (50G+)',action:"var t=getModalInput('mail-type')||'item';if(t==='gold'){var g=parseInt(getModalInput('mail-gold'));if(g>0)window.socket.emit('mail_send',{targetName:getModalInput('mail-to'),gold:g});}else{window.socket.emit('mail_send',{targetName:getModalInput('mail-to'),itemId:getModalInput('mail-item'),itemCount:parseInt(getModalInput('mail-cnt'))||1});}closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'일일 보상', action:()=>claimDaily()},
        {label:'🎰 행운의 룰렛', action:()=>{showModal('🎰 행운의 룰렛','<p class="text-gold" style="text-align:center">일일 1회 무료 스핀!</p><p class="text-muted text-sm" style="text-align:center;margin:8px 0">100G ~ 드래곤 비늘까지 8가지 보상</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;font-size:11px;color:#aaa;margin-top:8px"><div>💰 100G</div><div>💰 500G</div><div>💎 5</div><div>💰 2,000G</div><div>EXP +5%</div><div>🍖 황금 수프</div><div>💎 50</div><div>🐉 드래곤 비늘</div></div>',[{label:'스핀!',action:"window.spinLuckyRoulette();closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
      ],
      social: [
        {label:'혈맹', action:()=>togglePanel('clan')},
        {label:'랭킹', action:()=>{togglePanel('ranking');window.socket.emit('get_ranking','{}');}},
        {label:'퀘스트', action:()=>{togglePanel('quests');window.socket.emit('get_quests','{}');}},
        {label:'투기장', action:()=>{togglePanel('arena');window.socket.emit('arena_rankings');}},
        {label:'친구', action:()=>{togglePanel('friends');window.socket.emit('get_friends');}},
        {label:'👥 접속자', action:()=>window.socket.emit('get_online_players')},
        {label:'현상금', action:()=>{togglePanel('bounty');window.socket.emit('get_bounties');}},
        {label:'도감', action:()=>{togglePanel('bestiary');window.socket.emit('get_bestiary');}},
      ],
      etc: [
        {label:'던전', action:()=>{showModal('던전 입장','<p style="color:#888;font-size:12px;margin-bottom:10px">입장할 던전을 선택하세요</p>',[
          {label:'어둠의 동굴 (Lv.15) - 3스테이지',action:"closeModal();window.socket.emit('enter_dungeon','cave_dungeon')"},
          {label:'얼어붙은 신전 (Lv.18) - 4스테이지 ✨',action:"closeModal();window.socket.emit('enter_dungeon','frozen_temple')"},
          {label:'지하 감옥 (Lv.20) - 5스테이지',action:"closeModal();window.socket.emit('enter_dungeon','ruins_dungeon')"},
          {label:'드래곤 레이드 (Lv.25) - 25인 레이드',action:"closeModal();window.socket.emit('enter_dungeon','dragon_raid')"},
          {label:'신성한 성역 (Lv.30) - 5스테이지 ✨',action:"closeModal();window.socket.emit('enter_dungeon','holy_sanctuary')"},
          {label:'공허의 심연 (Lv.35) - 6스테이지 🆕',action:"closeModal();window.socket.emit('enter_dungeon','void_abyss')"},
          {label:'취소',type:'cancel',action:'closeModal()'}
        ]);}},
        {label:'무한의 탑', action:()=>togglePanel('tower')},
        {label:'상자 오픈', action:()=>window.socket.emit('open_rare_box')},
        {label:'스탯 리셋', action:()=>{showModal('스탯 초기화','<p style="color:#ff8800">모든 스탯 포인트가 반환됩니다.</p><p style="color:#888;font-size:11px">비용: 500G + 레벨×100G</p>',[{label:'초기화',action:"closeModal();window.socket.emit('reset_stats')"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'장비 합성', action:()=>{showModal('장비 합성','<p style="color:#ffd700">같은 등급 장비 3개 → 상위 등급 1개</p><p style="color:#888;font-size:11px">일반:500G / 고급:2000G / 희귀:5000G / 영웅:15000G</p><input id="fuse1" placeholder="장비ID 1" style="width:100%;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:3px 0"><input id="fuse2" placeholder="장비ID 2" style="width:100%;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:3px 0"><input id="fuse3" placeholder="장비ID 3" style="width:100%;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:3px 0">',[{label:'합성!',action:"window.socket.emit('fuse_equipment',{item1:getModalInput('fuse1'),item2:getModalInput('fuse2'),item3:getModalInput('fuse3')});closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'옵션 리롤', action:()=>{showModal('옵션 리롤','<p style="color:#ffd700">장착 중인 장비의 랜덤 옵션을 다시 뽑습니다 (100D)</p><input id="reroll-id" placeholder="장비 ID" style="width:100%;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin-top:8px">',[{label:'리롤!',action:"window.socket.emit('reroll_options',getModalInput('reroll-id'));closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'일괄 판매', action:()=>{showModal('일괄 판매','<p style="color:#ff8800">선택한 등급 이하의 모든 미장착 장비를 판매합니다 (60% 가격)</p>',[{label:'일반 이하',action:"window.socket.emit('bulk_sell','normal');closeModal();"},{label:'고급 이하',action:"window.socket.emit('bulk_sell','uncommon');closeModal();"},{label:'희귀 이하',action:"window.socket.emit('bulk_sell','rare');closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'웨이포인트', action:()=>window.socket.emit('get_waypoints')},
        {label:'설정', action:()=>togglePanel('settings')},
        {label:'🔊 사운드', action:()=>window.openAudioSettings()},
        {label:'⚔️ 자동 스킬 토글', action:()=>window.socket.emit('toggle_auto_skill')},
        {label:'⚔️ 자동 장착', action:()=>{showModal('⚔️ 장비 자동 최적화','<p class="text-gold">인벤토리에서 슬롯별 최고 등급 장비를 자동으로 장착합니다.</p><p class="text-muted text-sm">기준: 등급 → 강화 레벨 → ATK+DEF 합계</p><p class="text-muted text-sm">레벨 제한을 만족하는 장비만 후보로 선정됩니다.</p>',[{label:'자동 장착!',action:"window.socket.emit('auto_equip_best');closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'🐾 펫 진화', action:()=>{showModal('🐾 펫 진화','<p class="text-gold">기본 펫을 상위 진화체로 업그레이드합니다.</p><p class="text-muted text-sm">비용: 드래곤 비늘 x10 + 영혼석 x20 + 50,000G</p><div style="margin-top:10px">' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_slime\');closeModal();">미니 슬라임 → 슬라임 킹 (HP+8%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_wolf\');closeModal();">아기 늑대 → 다이어 울프 (ATK+18%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_fairy\');closeModal();">요정 → 대요정 (EXP+30%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_dragon\');closeModal();">미니 드래곤 → 고대 드래곤 (ATK+30%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_angel\');closeModal();">천사 → 세라핌 (자동 부활 강화)</button>' +
          '</div>',[{label:'닫기',type:'cancel',action:'closeModal()'}]);}},
        {label:'❓ 도움말', action:()=>window.showWelcomeGuide()},
        {label:'🎯 추천 활동', action:()=>window.showLevelGuide()},
        {label:'📜 패치 노트', action:()=>window.showPatchNotes()},
        {label:'🏆 개인 기록', action:()=>window.showPersonalRecords()},
        {label:'🔔 알림 센터', action:()=>window.showNotifications()},
        {label:'시즌 균열', action:()=>togglePanel('rift')},
        {label:'환생', action:()=>{showModal('환생 (프레스티지)','<p class="text-gold">Lv.50 달성 시 레벨을 1로 리셋하고 영구 보너스를 획득합니다.</p><p class="text-muted text-sm">장비/인벤/다이아는 유지. 최대 10회.</p>',[{label:'환생!',action:"window.socket.emit('prestige');closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'의뢰', action:()=>{togglePanel('contracts');window.socket.emit('get_contracts');}},
        {label:'진영', action:()=>{togglePanel('faction');window.socket.emit('get_faction_info');}},
        {label:'낚시', action:()=>window.socket.emit('start_fishing')},
        {label:'출석 캘��더', action:()=>window.socket.emit('get_attendance_calendar')},
        {label:'탐험도', action:()=>window.socket.emit('get_exploration')},
        {label:'길드멤버', action:()=>window.socket.emit('get_guild_members')},
        {label:'🏛️ 혈맹 창고', action:()=>window.socket.emit('get_clan_storage')},
        {label:'길드 레이드', action:()=>{showModal('길드 레이드','<p class="text-muted text-sm">혈맹장만 시작 가능. 주 1회. 온라인 멤버 필요.</p>',[
          {label:'동굴 (Lv.2, 3명) - 30k 보상', action:"window.socket.emit('clan_raid_start','raid_cave');closeModal();"},
          {label:'드래곤 (Lv.3, 4명) - 80k 보상', action:"window.socket.emit('clan_raid_start','raid_dragon');closeModal();"},
          {label:'거인 (Lv.4, 6명) - 드래곤비늘 x5 ✨', action:"window.socket.emit('clan_raid_start','raid_titan');closeModal();"},
          {label:'공허 (Lv.5, 5명) - 200k 보상', action:"window.socket.emit('clan_raid_start','raid_void');closeModal();"},
          {label:'천상 (Lv.5, 8명) - 신화 갑옷 🆕', action:"window.socket.emit('clan_raid_start','raid_celestial');closeModal();"},
          {label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'PvP 시즌', action:()=>window.socket.emit('get_arena_season')},
        {label:'일일 챌린지', action:()=>window.socket.emit('get_daily_challenge')},
        {label:'📅 주간 챌린지', action:()=>window.socket.emit('get_weekly_challenge')},
        {label:'결투', action:()=>{showModal('결투 신청','<p class="text-muted text-sm">결투할 플레이어 이름을 입력하세요</p><input id="duel-target" placeholder="플레이어 이름" style="width:100%;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin-top:8px">',[{label:'결투!',action:"var names=getModalInput('duel-target');for(var pid in (window._syncPlayers||{})){if(window._syncPlayers[pid]&&players&&players[pid]?.displayName===names){window.socket.emit('duel_request',pid);break;}}closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'이벤트', action:()=>{togglePanel('events');window.socket.emit('get_world_events');}},
        {label:'이모트', action:()=>{showModal('이모트','<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">' +
          Object.entries({taunt:'😤 도발',cheer:'🎉 환호',greet:'👋 인사',laugh:'😂 ㅋㅋ',cry:'😢 ㅠㅠ',gg:'🤝 GG',help:'🆘 도움',thanks:'❤ 감사'}).map(function(e) {
            return '<button class="btn btn-sm" onclick="window.socket.emit(\'emote\',\''+e[0]+'\');closeModal();">'+e[1]+'</button>';
          }).join('') + '</div>', [{label:'닫기',type:'cancel',action:'closeModal()'}]);}},
        {label:'일일 보상', action:()=>claimDaily()},
      ],
    };

    function openSubMenu(cat) {
      var el = document.getElementById('sub-menu');
      if (currentSubMenu === cat && el.classList.contains('show')) {
        el.classList.remove('show');
        currentSubMenu = '';
        return;
      }
      currentSubMenu = cat;
      var items = subMenuDefs[cat] || [];
      el.innerHTML = '';
      items.forEach(function(item) {
        var btn = document.createElement('button');
        btn.textContent = item.label;
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          closeSubMenu();
          if (typeof item.action === 'function') item.action();
          else if (typeof item.action === 'string') new Function(item.action)();
        });
        el.appendChild(btn);
      });
      el.classList.add('show');
    }

    function closeSubMenu() {
      document.getElementById('sub-menu').classList.remove('show');
      currentSubMenu = '';
    }

    // ── 교역 가격 렌더링 ──
    var myCurrentZone = '';
    function renderTownPrices(data) {
      var body = document.getElementById('trade-body');
      var locEl = document.getElementById('trade-location');

      // 현재 위치 체크
      var townNames = {aden:'바람개비 마을', harbor:'별빛 항구', oasis:'달빛 오아시스', mountain:'구름마루 산장', frontier:'끝자락 전초기지', village:'바람개비 마을', port_town:'별빛 항구'};
      var inTown = townNames[myCurrentZone];
      if (inTown) {
        locEl.style.background = 'rgba(0,180,0,0.15)';
        locEl.style.color = '#44ff44';
        locEl.textContent = '현재 위치: ' + inTown + ' (거래 가능!)';
      } else {
        locEl.style.background = 'rgba(255,0,0,0.15)';
        locEl.style.color = '#ff6b6b';
        locEl.textContent = '현재 위치: ' + (zones[myCurrentZone]?.name || '야외') + ' — 마을로 이동하세요';
      }

      var html = '';
      for (var town in data) {
        var tName = townNames[town] || town;
        var isHere = (town === myCurrentZone);
        html += '<h3 style="color:' + (isHere ? '#44ff44' : '#ffd700') + ';margin:10px 0 5px">' + tName + (isHere ? ' (현재 위치)' : '') + '</h3>';
        for (var gId in data[town]) {
          var g = data[town][gId];
          var canTrade = isHere;
          html += '<div class="panel-item"><span class="name">'+g.name+'<br><small>매수:<b style="color:#ff6b6b">'+g.buyPrice+'G</b> / 매도:<b style="color:#44ff44">'+g.sellPrice+'G</b></small></span>';
          if (canTrade) {
            html += '<button onclick="townBuy(\''+gId+'\',\''+town+'\')" style="margin-right:3px">구매</button>';
            html += '<button onclick="townSell(\''+gId+'\',\''+town+'\')">판매</button>';
          } else {
            html += '<span style="color:#555;font-size:11px">이동 필요</span>';
          }
          html += '</div>';
        }
      }
      body.innerHTML = html;
    }

    function townBuy(goodsId, town) {
      showModal('교역품 구매', '<p style="color:#ffd700">수량을 입력하세요</p><input id="trade-qty" type="number" value="1" min="1" max="99" style="width:100%;padding:10px;background:#222;color:#ffd700;border:1px solid #555;border-radius:4px;font-size:16px;text-align:center;margin-top:8px">', [
        {label:'구매', action:"var q=parseInt(getModalInput('trade-qty'));if(q>0)window.socket.emit('town_buy',JSON.stringify({goodsId:'"+goodsId+"',town:'"+town+"',qty:q}));closeModal();"},
        {label:'취소', type:'cancel', action:'closeModal()'}
      ]);
    }

    function townSell(goodsId, town) {
      showModal('교역품 판매', '<p style="color:#44ff44">수량을 입력하세요</p><input id="trade-qty" type="number" value="1" min="1" max="99" style="width:100%;padding:10px;background:#222;color:#44ff44;border:1px solid #555;border-radius:4px;font-size:16px;text-align:center;margin-top:8px">', [
        {label:'판매', action:"var q=parseInt(getModalInput('trade-qty'));if(q>0)window.socket.emit('town_sell',JSON.stringify({goodsId:'"+goodsId+"',town:'"+town+"',qty:q}));closeModal();"},
        {label:'취소', type:'cancel', action:'closeModal()'}
      ]);
    }

    // ── 스탯/전직/혈맹/파티 ──
    function addStat(stat) { window.socket.emit('add_stat', stat); }
    function classAdvance() { window.socket.emit('get_advance_options'); }
    function classAwaken() { window.socket.emit('get_awaken_options'); }
    function createClan() {
      var name = document.getElementById('clan-name-input').value.trim();
      if (name) window.socket.emit('create_clan', name);
    }
    function createParty() { window.socket.emit('create_party','{}'); }
    function partyInvite() { window.socket.emit('party_invite_nearby','{}'); }

    // Space키 → 마우스 방향 공격 (브라우저 스크롤 차단)
    // 1/2/3/4 → 포션 단축키 (HP 하/중/상, MP)
    window.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        doAttackTowardMouse();
      } else if (e.key === '1') { window.socket?.emit('use_potion','pot_hp_s'); }
      else if (e.key === '2') { window.socket?.emit('use_potion','pot_hp_m'); }
      else if (e.key === '3') { window.socket?.emit('use_potion','pot_hp_l'); }
      else if (e.key === '4') { window.socket?.emit('use_potion','mp_potion'); }
    });

    // 포션 결과 토스트
    if (window.socket) {
      // (setupSocketListeners 시점에 등록)
    }
    window.usePotionHotkey = function(id) { window.socket?.emit('use_potion', id); };

    // 마우스 위치 추적
    var lastMouseX = window.innerWidth / 2, lastMouseY = window.innerHeight / 2;
    window.addEventListener('mousemove', function(e) {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    function doAttackTowardMouse() {
      if (!window.socket) return;
      // 캔버스 중심 = 내 캐릭터 위치
      var canvas = document.getElementById('unity-canvas');
      var rect = canvas.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = lastMouseX - cx;
      var dy = -(lastMouseY - cy); // Y축 반전 (화면↓ = 게임↑)
      var mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0.01) { dx /= mag; dy /= mag; }
      else { dx = 0; dy = 1; }
      // 방향만 업데이트 후 공격
      window.socket.emit('update_dir', JSON.stringify({ dirX: dx, dirY: dy }));
      window.socket.emit('throw', '{}');
      playSFX('hit');
      var btn = document.getElementById('attack-btn');
      if (btn) { btn.style.transform = 'scale(0.85)'; btn.style.filter = 'brightness(1.5)'; setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.filter = ''; }, 120); }
    }

    // ── 채팅 ──
    function sendChat() {
      var input = document.getElementById('chat-input');
      if (!input) return;
      var msg = input.value.trim();
      if (!msg || !window.socket) return;
      window.socket.emit('chat', msg);
      input.value = '';
    }

