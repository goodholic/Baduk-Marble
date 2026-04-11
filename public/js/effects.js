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

    // ── 공격 버튼 (쿨다운 적용) ──
    function doAttack(e) {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      if (!canAttack()) return; // 쿨다운 체크
      if (window.socket) {
        window.socket.emit('throw', '{}');
        playSFX('hit');
      }
      var btn = document.getElementById('attack-btn');
      if (btn) {
        btn.style.transform = 'scale(0.85)';
        btn.style.filter = 'brightness(1.5)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.filter = ''; }, 120);
      }
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

    // ═══ 속성 컬러 매핑 ═══
    var ELEMENT_COLORS = {
      fire:    { color:'#ff6622', glow:'rgba(255,68,0,0.5)', cls:'dmg-fire', icon:'🔥' },
      ice:     { color:'#66ddff', glow:'rgba(0,170,255,0.5)', cls:'dmg-ice', icon:'❄' },
      lightning:{ color:'#ffee44', glow:'rgba(255,221,0,0.5)', cls:'dmg-lightning', icon:'⚡' },
      dark:    { color:'#cc66ff', glow:'rgba(153,51,255,0.5)', cls:'dmg-dark', icon:'☽' },
      holy:    { color:'#ffffaa', glow:'rgba(255,215,0,0.6)', cls:'dmg-holy', icon:'✝' },
      poison:  { color:'#88ff44', glow:'rgba(68,204,0,0.5)', cls:'dmg-poison', icon:'☠' },
      normal:  { color:'#ffffff', glow:'rgba(255,255,255,0.3)', cls:'', icon:'' },
    };

    function showFloatingDamage(damage, isCrit, skillName, element) {
      var el = document.createElement('div');
      el.className = 'dmg-number';
      var x = 40 + Math.random() * 20;
      var y = 25 + Math.random() * 25;
      var elem = ELEMENT_COLORS[element] || ELEMENT_COLORS.normal;
      var color = isCrit ? '#ff4444' : elem.color;
      var size = isCrit ? '26px' : (skillName ? '18px' : '15px');
      if (skillName && !isCrit) color = '#ffd700';

      // 속성 아이콘 + 데미지
      var prefix = elem.icon && element !== 'normal' ? elem.icon + ' ' : '';
      var skillPrefix = skillName ? skillName + ' ' : '';
      el.textContent = prefix + skillPrefix + '-' + damage;
      el.style.cssText = 'left:'+x+'%;top:'+y+'%;color:'+color+';font-size:'+size;

      // 속성별 CSS 클래스
      if (elem.cls) el.classList.add(elem.cls);
      if (isCrit) el.classList.add('crit');

      dmgContainer.appendChild(el);

      requestAnimationFrame(function() {
        el.style.top = (y - 12) + '%';
        el.style.opacity = '0';
      });

      // 크리티컬 시 추가 이펙트
      if (isCrit) {
        showCritSlash();
        showHitSparks(x, y, element || 'fire');
      }

      setTimeout(function() { el.remove(); }, 1300);
    }

    // ═══ 크리티컬 슬래시 이펙트 ═══
    function showCritSlash() {
      var el = document.createElement('div');
      el.className = 'crit-slash';
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 500);
    }

    // ═══ 타격 스파크 파티클 ═══
    function showHitSparks(centerX, centerY, element) {
      var elem = ELEMENT_COLORS[element] || ELEMENT_COLORS.normal;
      var count = 6 + Math.floor(Math.random() * 4);
      for (var i = 0; i < count; i++) {
        var spark = document.createElement('div');
        spark.className = 'hit-spark';
        var angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        var dist = 30 + Math.random() * 50;
        var sx = Math.cos(angle) * dist;
        var sy = Math.sin(angle) * dist;
        spark.style.cssText = 'left:'+centerX+'%;top:'+centerY+'%;background:'+elem.color+';box-shadow:0 0 4px '+elem.glow+';--sx:'+sx+'px;--sy:'+sy+'px';
        spark.style.width = (2 + Math.random() * 3) + 'px';
        spark.style.height = spark.style.width;
        document.body.appendChild(spark);
        setTimeout(function() { spark.remove(); }, 600);
      }
    }

    // ═══ 마법진 이펙트 (스킬 시전) ═══
    function showMagicCircle(element, size) {
      var el = document.createElement('div');
      el.className = 'magic-circle ' + (element || '');
      var s = size || 120;
      el.style.width = s + 'px';
      el.style.height = s + 'px';
      el.style.left = '50%';
      el.style.top = '50%';
      document.body.appendChild(el);
      playSFX('skill');
      setTimeout(function() { el.remove(); }, 1200);
    }

    // ═══ 보스 등장 시네마틱 ═══
    function showBossEntrance(bossName, subtitle) {
      var container = document.createElement('div');
      container.className = 'boss-entrance';
      var topBar = document.createElement('div');
      topBar.className = 'boss-entrance-bars top';
      var btmBar = document.createElement('div');
      btmBar.className = 'boss-entrance-bars bottom';
      var name = document.createElement('div');
      name.className = 'boss-entrance-name';
      name.textContent = bossName || 'UNKNOWN';
      var title = document.createElement('div');
      title.className = 'boss-entrance-title';
      title.textContent = subtitle || '— 공포의 지배자 —';
      container.appendChild(topBar);
      container.appendChild(btmBar);
      container.appendChild(name);
      container.appendChild(title);
      document.body.appendChild(container);
      playSFX('boss');

      // 화면 흔들림
      var uc = document.getElementById('unity-container');
      if (uc) { uc.classList.add('shake'); setTimeout(function(){ uc.classList.remove('shake'); }, 500); }

      setTimeout(function() { container.remove(); }, 3000);
    }

    // ═══ 힐 이펙트 ═══
    function showHealEffect() {
      var symbols = ['+','✦','❤','♥','✚'];
      for (var i = 0; i < 8; i++) {
        var p = document.createElement('div');
        p.className = 'heal-particle';
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        p.style.left = (35 + Math.random() * 30) + '%';
        p.style.top = (50 + Math.random() * 20) + '%';
        p.style.color = '#44ff88';
        p.style.textShadow = '0 0 8px rgba(68,255,136,0.6)';
        p.style.animationDelay = (Math.random() * 0.5) + 's';
        document.body.appendChild(p);
        setTimeout(function() { p.remove(); }, 2000);
      }
      playSFX('heal');
    }

    // ═══ 번개 번쩍임 (폭풍우용) ═══
    function showLightningFlash() {
      var el = document.createElement('div');
      el.className = 'lightning-flash';
      document.body.appendChild(el);
      // 번개 소리
      if (audioCtx && soundEnabled) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var sfxVol = (typeof window._sfxVol === 'number') ? window._sfxVol : 1;
        osc.type = 'square';
        osc.frequency.setValueAtTime(60, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06 * sfxVol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
      }
      setTimeout(function() { el.remove(); }, 300);
    }

    // ═══ 환경 파티클 시스템 ═══
    var _ambientParticles = [];
    var _ambientZone = '';

    var ZONE_AMBIENT = {
      forest:     { type:'firefly', count:12, color:'#ffee88' },
      darkforest: { type:'firefly', count:8, color:'#88ff44' },
      mushroom:   { type:'sparkle', count:10, color:'#aa88ff' },
      world_tree: { type:'leaf', count:15, color:'#88aa44' },
      volcano:    { type:'ember', count:18, color:'#ff6622' },
      magma_core: { type:'ember', count:25, color:'#ff4400' },
      dragon:     { type:'ember', count:12, color:'#ff8844' },
      cave:       { type:'sparkle', count:6, color:'#6688ff' },
      crystal_mine: { type:'sparkle', count:15, color:'#88ddff' },
      ruins:      { type:'mist', count:6, color:'rgba(150,170,200,0.15)' },
      graveyard:  { type:'mist', count:10, color:'rgba(100,130,100,0.12)' },
      haunted:    { type:'mist', count:12, color:'rgba(100,80,150,0.15)' },
      glacier:    { type:'snow-large', count:10, color:'#ffffff' },
      tundra:     { type:'snow-large', count:14, color:'#eef4ff' },
      frozen_deep:{ type:'snow-large', count:8, color:'#aaddff' },
      abyss:      { type:'sparkle', count:8, color:'#ff44ff' },
      hell:       { type:'ember', count:20, color:'#ff2200' },
      chaos:      { type:'sparkle', count:10, color:'#ff0088' },
      void_rift:  { type:'sparkle', count:12, color:'#cc44ff' },
      celestial:  { type:'sparkle', count:18, color:'#ffd700' },
      shadow:     { type:'mist', count:8, color:'rgba(50,0,80,0.15)' },
      ancient:    { type:'firefly', count:6, color:'#ffcc44' },
      coral:      { type:'sparkle', count:8, color:'#44ddff' },
      meadow:     { type:'firefly', count:10, color:'#ffee66' },
    };

    function startAmbientParticles(zoneName) {
      // 기존 파티클 정리
      _ambientParticles.forEach(function(p) { if (p.parentNode) p.remove(); });
      _ambientParticles = [];
      _ambientZone = zoneName;

      var config = ZONE_AMBIENT[zoneName];
      if (!config) return;

      var isMobile = window.innerWidth < 768;
      var count = isMobile ? Math.floor(config.count * 0.5) : config.count;

      for (var i = 0; i < count; i++) {
        var p = document.createElement('div');
        p.className = 'ambient-particle ambient-' + config.type;
        var dur = 4 + Math.random() * 6;
        var size = config.type === 'mist' ? (40 + Math.random() * 60) :
                   config.type === 'firefly' ? (2 + Math.random() * 3) :
                   config.type === 'ember' ? (2 + Math.random() * 2) :
                   config.type === 'snow-large' ? (3 + Math.random() * 4) :
                   (2 + Math.random() * 3);
        p.style.cssText =
          'left:'+(Math.random()*100)+'%;top:'+(Math.random()*100)+'%;' +
          'width:'+size+'px;height:'+size+'px;' +
          '--dur:'+dur+'s;' +
          '--dx1:'+(Math.random()*60-30)+'px;--dy1:'+(Math.random()*40-20)+'px;' +
          '--dx2:'+(Math.random()*80-40)+'px;--dy2:'+(Math.random()*60-30)+'px;' +
          '--dx3:'+(Math.random()*40-20)+'px;--dy3:'+(Math.random()*30-15)+'px;' +
          'animation-delay:'+(Math.random()*dur)+'s;';
        document.body.appendChild(p);
        _ambientParticles.push(p);
      }
    }

    // ═══ 낮/밤 오버레이 ═══
    var _daynightEl = null;
    function updateDayNightOverlay(timeOfDay) {
      if (!_daynightEl) {
        _daynightEl = document.createElement('div');
        _daynightEl.className = 'daynight-overlay';
        document.body.appendChild(_daynightEl);
      }
      _daynightEl.className = 'daynight-overlay daynight-' + (timeOfDay || 'day');
    }

    // ═══ 비네팅 (위험 지대) ═══
    var _vignetteEl = null;
    function updateVignette(type) {
      if (!_vignetteEl) {
        _vignetteEl = document.createElement('div');
        _vignetteEl.className = 'vignette-overlay';
        document.body.appendChild(_vignetteEl);
      }
      _vignetteEl.className = 'vignette-overlay' + (type ? ' vignette-' + type : '');
    }

    // ═══ 강화된 SFX ═══
    function playSFX2(type) {
      if (!soundEnabled || !audioCtx) return;
      var sfxVol = (typeof window._sfxVol === 'number') ? window._sfxVol : 1;
      if (sfxVol <= 0) return;

      switch(type) {
        case 'fireball':
          _playSynth('sawtooth', 200, 600, 0.08 * sfxVol, 0.3);
          setTimeout(function(){ _playSynth('square', 100, 50, 0.06 * sfxVol, 0.2); }, 100);
          break;
        case 'ice_spell':
          _playSynth('sine', 1200, 800, 0.05 * sfxVol, 0.4);
          _playSynth('triangle', 2000, 1500, 0.03 * sfxVol, 0.3);
          break;
        case 'thunder':
          _playSynth('square', 60, 30, 0.12 * sfxVol, 0.5);
          setTimeout(function(){ _playSynth('sawtooth', 100, 200, 0.06 * sfxVol, 0.3); }, 150);
          break;
        case 'dark_magic':
          _playSynth('sawtooth', 150, 80, 0.06 * sfxVol, 0.5);
          _playSynth('sine', 300, 100, 0.04 * sfxVol, 0.6);
          break;
        case 'holy_light':
          _playSynth('sine', 800, 1400, 0.06 * sfxVol, 0.5);
          _playSynth('sine', 1200, 1800, 0.03 * sfxVol, 0.4);
          break;
        case 'boss_roar':
          _playSynth('sawtooth', 50, 180, 0.15 * sfxVol, 0.8);
          _playSynth('square', 40, 100, 0.1 * sfxVol, 1.0);
          setTimeout(function(){ _playSynth('sawtooth', 80, 40, 0.08 * sfxVol, 0.5); }, 400);
          break;
        case 'equip':
          _playSynth('sine', 500, 700, 0.06 * sfxVol, 0.15);
          setTimeout(function(){ _playSynth('sine', 700, 900, 0.04 * sfxVol, 0.1); }, 100);
          break;
        case 'enchant':
          _playSynth('sine', 600, 1200, 0.08 * sfxVol, 0.4);
          _playSynth('triangle', 900, 1500, 0.04 * sfxVol, 0.5);
          break;
      }
    }

    function _playSynth(waveType, freqStart, freqEnd, volume, duration) {
      if (!audioCtx) return;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = waveType;
      osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(freqEnd, audioCtx.currentTime + duration * 0.7);
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    }

    // ═══ 등급별 토스트 ═══
    var _toastTimer = null;
    function showFantasyToast(message, grade) {
      var el = document.getElementById('toast');
      if (!el) return;
      el.textContent = message;
      el.className = 'show';
      if (grade === 'epic') el.classList.add('toast-epic');
      else if (grade === 'legendary') el.classList.add('toast-legendary');
      else if (grade === 'mythic') el.classList.add('toast-mythic');
      if (_toastTimer) clearTimeout(_toastTimer);
      _toastTimer = setTimeout(function() { el.className = ''; el.style.display = 'none'; }, 3000);
      el.style.display = 'block';
    }

    // ═══ 폭풍우 번개 자동 발생 ═══
    var _stormInterval = null;
    function startStormLightning() {
      if (_stormInterval) return;
      _stormInterval = setInterval(function() {
        if (currentWeather && (currentWeather.id === 'storm')) {
          if (Math.random() < 0.3) showLightningFlash();
        }
      }, 3000);
    }
    startStormLightning();

    // ═══ 존 변경 시 환경 이펙트 업데이트 ═══
    function onZoneChange(newZone) {
      startAmbientParticles(newZone);
      // 위험 지대 비네팅
      var dangerZones = ['abyss','hell','chaos','void_rift','demon','blood_arena','shadow','lawless'];
      var bossZones = ['dragon','volcano','magma_core'];
      if (dangerZones.indexOf(newZone) >= 0) updateVignette('danger');
      else if (bossZones.indexOf(newZone) >= 0) updateVignette('boss');
      else updateVignette('safe');

      // 존별 분위기 오버레이
      var atmoEl = document.getElementById('game-atmosphere');
      if (atmoEl) {
        atmoEl.className = '';
        var safeZones = ['aden','harbor','oasis','mountain','frontier','shrine','bazaar','port_east','fishing'];
        var forestZones = ['forest','meadow','darkforest','ancient','toxic_marsh','mushroom','world_tree'];
        var dungeonZones = ['cave','ruins','graveyard','haunted','sky_ruins','frozen_deep','castle','sunken','crystal_mine'];
        var fireZones = ['volcano','magma_core','hell'];
        var iceZones = ['glacier','tundra','frozen_deep'];
        var darkZones = ['abyss','shadow','void_rift','demon'];
        var chaosZones = ['chaos','warzone','blood_arena','lawless'];

        if (safeZones.indexOf(newZone) >= 0) atmoEl.className = 'atmo-village';
        else if (forestZones.indexOf(newZone) >= 0) atmoEl.className = 'atmo-forest';
        else if (fireZones.indexOf(newZone) >= 0) atmoEl.className = 'atmo-fire';
        else if (iceZones.indexOf(newZone) >= 0) atmoEl.className = 'atmo-ice';
        else if (darkZones.indexOf(newZone) >= 0) atmoEl.className = 'atmo-dark';
        else if (chaosZones.indexOf(newZone) >= 0) atmoEl.className = 'atmo-chaos';
        else if (dungeonZones.indexOf(newZone) >= 0) atmoEl.className = 'atmo-dungeon';
      }
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
        {label:'🏰 심층 던전', action:()=>{window.socket.emit('deep_dungeon_list');}},
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
        {label:'🌟 펫 진화 (신규)', action:()=>{window.socket.emit('pet_evo_status');}},
        {label:'🐾 펫 진화 (구)', action:()=>{showModal('🐾 펫 진화','<p class="text-gold">기본 펫을 상위 진화체로 업그레이드합니다.</p><p class="text-muted text-sm">비용: 드래곤 비늘 x10 + 영혼석 x20 + 50,000G</p><div style="margin-top:10px">' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_slime\');closeModal();">미니 슬라임 → 슬라임 킹 (HP+8%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_wolf\');closeModal();">아기 늑대 → 다이어 울프 (ATK+18%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_fairy\');closeModal();">요정 → 대요정 (EXP+30%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_dragon\');closeModal();">미니 드래곤 → 고대 드래곤 (ATK+30%)</button>' +
          '<button class="btn" style="width:100%;margin:3px 0" onclick="window.socket.emit(\'evolve_pet\',\'pet_angel\');closeModal();">천사 → 세라핌 (자동 부활 강화)</button>' +
          '</div>',[{label:'닫기',type:'cancel',action:'closeModal()'}]);}},
        {label:'🏅 랭크 시즌', action:()=>{window.socket.emit('ranked_status');}},
        {label:'📋 미션 보드', action:()=>{window.socket.emit('mission_board');}},
        {label:'⭐ 소환', action:()=>{window.socket.emit('gacha_pool_list');}},
        {label:'🎮 미니게임', action:()=>{showModal('🎮 미니게임','<div style="display:flex;flex-direction:column;gap:6px">'+
          '<button class="btn" onclick="window.socket.emit(\'fish_tournament_start\');closeModal();" style="text-align:left">🎣 낚시 대회 — 5분간 가장 많이 낚아라!</button>'+
          '<button class="btn" onclick="window.socket.emit(\'treasure_hunt_start\');closeModal();" style="text-align:left">🗺️ 보물지도 — 단서를 따라 보물을 찾아라!</button>'+
          '<button class="btn" onclick="window.socket.emit(\'card_game_start\');closeModal();" style="text-align:left">🃏 카드 뒤집기 — 짝 맞추기 (300G)</button>'+
          '<button class="btn" onclick="window.socket.emit(\'quiz_start\');closeModal();" style="text-align:left">❓ 몬스터 퀴즈 — 15초 안에 정답!</button>'+
          '</div>',[{label:'닫기',type:'cancel',action:'closeModal()'}]);}},
        {label:'🏆 업적', action:()=>{window.socket.emit('achievement_status');}},
        {label:'👿 전설 변신', action:()=>{window.socket.emit('legendary_morph_list');}},
        {label:'🐲 드래곤', action:()=>{window.socket.emit('dragon_list');}},
        {label:'🏁 드래곤 레이스', action:()=>{window.socket.emit('dragon_race_status');}},
        {label:'🏠 내 집', action:()=>{window.socket.emit('house_status');}},
        {label:'📖 메인 스토리', action:()=>{window.socket.emit('story_status');}},
        {label:'❓ 도움말', action:()=>window.showWelcomeGuide()},
        {label:'🎯 추천 활동', action:()=>window.showLevelGuide()},
        {label:'📜 패치 노트', action:()=>window.showPatchNotes()},
        {label:'🏆 개인 기록', action:()=>window.showPersonalRecords()},
        {label:'🔔 알림 센터', action:()=>window.showNotifications()},
        {label:'🏟️ 배틀로얄', action:()=>{window.socket.emit('br_status');showModal('🏟️ 배틀로얄','<div id="br-modal-body"><p class="text-muted">상태 로딩 중...</p></div>',[{label:'닫기',type:'cancel',action:'closeModal()'}]);}},
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
        {label:'🩸 현상수배', action:()=>{window.socket.emit('get_pvp_bounties');}},
        {label:'⚔️ 전장 버프', action:()=>{window.socket.emit('get_battlefield_buffs');}},
        {label:'⚔️ 친구 대전', action:()=>{showModal('⚔️ 친구 대전','<p class="text-muted text-sm">상대 이름과 베팅 금액을 입력하세요</p><input id="duel-friend" placeholder="상대 이름" style="width:100%;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:4px 0"><input id="duel-bet" type="number" value="0" placeholder="베팅 (0=무료)" style="width:100%;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin:4px 0">',[{label:'⚔️ 대전!',action:"window.socket.emit('friend_duel_challenge',{targetName:getModalInput('duel-friend'),bet:parseInt(getModalInput('duel-bet'))||0});closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'결투', action:()=>{showModal('결투 신청','<p class="text-muted text-sm">결투할 플레이어 이름을 입력하세요</p><input id="duel-target" placeholder="플레이어 이름" style="width:100%;padding:8px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;margin-top:8px">',[{label:'결투!',action:"var names=getModalInput('duel-target');for(var pid in (window._syncPlayers||{})){if(window._syncPlayers[pid]&&players&&players[pid]?.displayName===names){window.socket.emit('duel_request',pid);break;}}closeModal();"},{label:'취소',type:'cancel',action:'closeModal()'}]);}},
        {label:'🐲 월드 레이드', action:()=>{window.socket.emit('world_events_status');}},
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

    // Space키 → 마우스 방향 공격 (쿨다운 적용, 키 반복 차단)
    // 1/2/3/4 → 포션 단축키 (HP 하/중/상, MP)
    var _attackCooldown = 400; // 0.4초 쿨다운
    var _lastAttackTime = 0;
    function canAttack() {
      var now = Date.now();
      if (now - _lastAttackTime < _attackCooldown) return false;
      _lastAttackTime = now;
      return true;
    }

    window.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return; // 키 반복 차단
        if (!canAttack()) return; // 쿨다운 체크
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
      // 방향 + 공격을 하나의 이벤트로 전송 (타이밍 불일치 방지)
      window.socket.emit('throw_directed', JSON.stringify({ dirX: dx, dirY: dy }));
      playSFX('hit');
      var btn = document.getElementById('attack-btn');
      if (btn) { btn.style.transform = 'scale(0.85)'; btn.style.filter = 'brightness(1.5)'; setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.filter = ''; }, 120); }
    }

    // ── 전투 화려 연출 (v2.59) ──

    // 연속 히트 카운터
    var _hitComboCount = 0, _hitComboTimer = null;
    function showHitCombo(damage) {
      _hitComboCount++;
      if (_hitComboTimer) clearTimeout(_hitComboTimer);
      _hitComboTimer = setTimeout(function() { _hitComboCount = 0; hideHitCombo(); }, 2000);

      var el = document.getElementById('hit-combo-display');
      if (!el) {
        el = document.createElement('div');
        el.id = 'hit-combo-display';
        el.style.cssText = 'position:fixed;top:15%;right:20px;z-index:55;text-align:right;pointer-events:none;transition:all 0.15s';
        document.body.appendChild(el);
      }
      var size = Math.min(42, 16 + _hitComboCount * 2);
      var color = _hitComboCount >= 20 ? '#ff00ff' : _hitComboCount >= 10 ? '#00ffff' : _hitComboCount >= 5 ? '#ffd700' : '#ffffff';
      el.innerHTML = '<div style="font-size:' + size + 'px;font-weight:900;color:' + color + ';text-shadow:0 0 12px currentColor;font-family:Cinzel,serif;animation:streakPop 0.2s ease-out">' + _hitComboCount + ' <span style="font-size:12px;color:#888">HITS</span></div>' +
        '<div style="font-size:11px;color:#ff8800;margin-top:2px">DMG: ' + damage + '</div>';
    }
    function hideHitCombo() {
      var el = document.getElementById('hit-combo-display');
      if (el) el.innerHTML = '';
    }

    // 킬 시 영혼 흡수 이펙트
    function showSoulAbsorb() {
      for (var i = 0; i < 5; i++) {
        var soul = document.createElement('div');
        var startX = 30 + Math.random() * 40;
        var startY = 25 + Math.random() * 30;
        soul.style.cssText = 'position:fixed;left:' + startX + '%;top:' + startY + '%;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:35;' +
          'background:radial-gradient(circle,rgba(150,200,255,0.9),rgba(100,150,255,0.3));box-shadow:0 0 8px rgba(100,150,255,0.6);' +
          'transition:all 0.8s ease-in;animation-delay:' + (i * 0.1) + 's';
        document.body.appendChild(soul);
        // 화면 중앙으로 빨려오기
        requestAnimationFrame(function() {
          soul.style.left = '50%';
          soul.style.top = '50%';
          soul.style.opacity = '0';
          soul.style.transform = 'scale(0.2)';
        });
        setTimeout(function() { soul.remove(); }, 900);
      }
    }

    // 광역 스킬 화면 이펙트
    function showFullScreenSkillEffect(element) {
      var overlay = document.createElement('div');
      var colors = {
        fire: 'radial-gradient(circle,rgba(255,100,0,0.4),rgba(255,50,0,0.1),transparent)',
        ice: 'radial-gradient(circle,rgba(100,200,255,0.4),rgba(0,150,255,0.1),transparent)',
        lightning: 'radial-gradient(circle,rgba(255,255,100,0.4),rgba(255,220,0,0.1),transparent)',
        dark: 'radial-gradient(circle,rgba(150,50,255,0.4),rgba(80,0,150,0.1),transparent)',
        holy: 'radial-gradient(circle,rgba(255,255,200,0.5),rgba(255,215,0,0.15),transparent)',
      };
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:60;' +
        'background:' + (colors[element] || colors.fire) + ';animation:flashOut 1s ease-out forwards';
      document.body.appendChild(overlay);

      // 파티클 링
      for (var i = 0; i < 12; i++) {
        var p = document.createElement('div');
        var angle = (Math.PI * 2 / 12) * i;
        var r = 30 + Math.random() * 10;
        p.style.cssText = 'position:fixed;left:calc(50% + ' + (Math.cos(angle)*r) + 'vw);top:calc(50% + ' + (Math.sin(angle)*r) + 'vh);' +
          'width:4px;height:4px;border-radius:50%;pointer-events:none;z-index:61;opacity:0.8;' +
          'background:' + (element === 'ice' ? '#88ddff' : element === 'dark' ? '#aa66ff' : element === 'holy' ? '#ffd700' : '#ff6622') + ';' +
          'box-shadow:0 0 8px currentColor;transition:all 0.6s ease-in';
        document.body.appendChild(p);
        requestAnimationFrame(function() { p.style.left = '50%'; p.style.top = '50%'; p.style.opacity = '0'; });
        setTimeout(function() { p.remove(); }, 700);
      }

      setTimeout(function() { overlay.remove(); }, 1000);
    }

    // HP 비율에 따른 화면 흔들림 강도
    function shakeByDamage(hpPct) {
      var container = document.getElementById('unity-container');
      if (!container) return;
      if (hpPct < 0.2) {
        // 위험! 강한 흔들림 + 붉은 비네팅
        container.style.animation = 'screenShake 0.5s ease-out';
        container.style.boxShadow = 'inset 0 0 80px rgba(255,0,0,0.4)';
        setTimeout(function() { container.style.animation = ''; container.style.boxShadow = ''; }, 500);
      } else if (hpPct < 0.5) {
        container.style.animation = 'screenShake 0.3s ease-out';
        setTimeout(function() { container.style.animation = ''; }, 300);
      }
    }

    // 궁극기 준비 완료 이펙트 (게이지 풀 시)
    var _ultReadyShown = false;
    function showUltimateReady() {
      if (_ultReadyShown) return;
      _ultReadyShown = true;
      var el = document.createElement('div');
      el.id = 'ult-ready-glow';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;' +
        'box-shadow:inset 0 0 60px rgba(255,215,0,0.15);animation:ultReadyPulse 2s ease-in-out infinite';
      document.body.appendChild(el);
      // CSS 추가
      if (!document.getElementById('ult-ready-style')) {
        var style = document.createElement('style');
        style.id = 'ult-ready-style';
        style.textContent = '@keyframes ultReadyPulse{0%,100%{box-shadow:inset 0 0 40px rgba(255,215,0,0.1)}50%{box-shadow:inset 0 0 80px rgba(255,215,0,0.25)}}';
        document.head.appendChild(style);
      }
    }
    function hideUltimateReady() {
      _ultReadyShown = false;
      var el = document.getElementById('ult-ready-glow');
      if (el) el.remove();
    }
    // 멀티킬 연출
    var _multiKillCount = 0, _multiKillTimer = null;
    function showMultiKill() {
      _multiKillCount++;
      if (_multiKillTimer) clearTimeout(_multiKillTimer);
      _multiKillTimer = setTimeout(function() { _multiKillCount = 0; }, 4000);

      if (_multiKillCount < 2) return;
      var names = ['','','더블 킬!','트리플 킬!','쿼드라 킬!','펜타 킬!','헥사 킬!','갓라이크!!!'];
      var colors = ['','','#ffd700','#ff8800','#ff4444','#ff00ff','#00ffff','#ffffff'];
      var idx = Math.min(_multiKillCount, names.length - 1);

      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:70;font-family:Cinzel,serif;font-size:' + (28 + _multiKillCount * 4) + 'px;font-weight:900;color:' + colors[idx] + ';text-shadow:0 0 20px currentColor,0 0 40px currentColor;pointer-events:none;animation:comboPop 2s ease-out forwards;letter-spacing:4px';
      el.textContent = names[idx];
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 2000);

      if (_multiKillCount >= 5) {
        document.getElementById('unity-container').classList.add('shake');
        setTimeout(function() { document.getElementById('unity-container').classList.remove('shake'); }, 500);
      }
      playSFX(_multiKillCount >= 4 ? 'boss' : 'levelup');
    }

    // 오버킬 연출 (큰 데미지)
    function showOverkill(damage) {
      if (damage < 200) return;
      var el = document.createElement('div');
      var size = Math.min(48, 20 + Math.floor(damage / 100) * 4);
      el.style.cssText = 'position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);z-index:65;font-size:' + size + 'px;font-weight:900;color:#ff0000;text-shadow:0 0 30px #ff0000,0 4px 8px rgba(0,0,0,0.8);pointer-events:none;animation:comboPop 1.5s ease-out forwards;font-family:Cinzel,serif';
      el.textContent = '💥 OVERKILL! ' + damage;
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 1500);
    }

    // 화면 슬로우 모션 효과 (보스 처치 시)
    function showSlowMotion(duration) {
      var container = document.getElementById('unity-container');
      container.style.transition = 'filter 0.2s';
      container.style.filter = 'contrast(1.3) saturate(1.5)';
      setTimeout(function() {
        container.style.filter = 'brightness(1.5) contrast(1.2)';
        setTimeout(function() {
          container.style.transition = 'filter 1s';
          container.style.filter = '';
        }, duration || 500);
      }, 200);
    }

    // ── NPC 대화 ──
    function closeNpcDialog() {
      var dlg = document.getElementById('npc-dialog');
      if (dlg) { dlg.classList.remove('show'); dlg.style.display = 'none'; }
    }
    function npcAction(npcId, action) {
      if (action === 'close') { closeNpcDialog(); return; }
      // 기존 시스템 연동
      if (action === 'shop') { closeNpcDialog(); openSubMenu('items'); return; }
      if (action === 'craft') { closeNpcDialog(); togglePanel('craft'); return; }
      if (action === 'enchant') { closeNpcDialog(); window.socket.emit('interact_npc','대장장이'); return; }
      if (action === 'auction') { closeNpcDialog(); togglePanel('market'); window.socket.emit('market_browse',{}); return; }
      if (action === 'caravan') { closeNpcDialog(); window.socket.emit('caravan_status'); return; }
      if (action === 'train_skills') { closeNpcDialog(); togglePanel('skills'); window.socket.emit('get_skills'); return; }
      if (action === 'class_info') { closeNpcDialog(); togglePanel('stats'); return; }
      if (action === 'combat_analysis') { closeNpcDialog(); window.socket.emit('get_profile'); return; }
      if (action === 'board') { closeNpcDialog(); window.socket.emit('get_contracts'); return; }
      if (action === 'cook_menu') { closeNpcDialog(); window.socket.emit('cooking_status'); return; }
      if (action === 'recipe_shop') { closeNpcDialog(); window.socket.emit('cooking_status'); return; }
      if (action === 'premium_shop') { closeNpcDialog(); togglePanel('shop'); return; }
      if (action === 'price_check') { closeNpcDialog(); window.socket.emit('get_town_prices','{}'); togglePanel('trade'); return; }
      // 서버에 NPC 액션 전달
      window.socket.emit('npc_action', { npcId: npcId, action: action });
    }
    // NPC 대화창 바깥 클릭시 닫기
    document.getElementById('npc-dialog').addEventListener('click', function(e) { if (e.target === this) closeNpcDialog(); });

    // ── 채팅 ──
    function sendChat() {
      var input = document.getElementById('chat-input');
      if (!input) return;
      var msg = input.value.trim();
      if (!msg || !window.socket) return;
      window.socket.emit('chat', msg);
      input.value = '';
    }

