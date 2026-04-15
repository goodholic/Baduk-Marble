// ============================================
// 카드게임 메인 화면 UI (로그인 후 기본 화면)
// ============================================

(function() {
  'use strict';

  // 화면 상태: 'login' | 'cardgame' | 'io_lobby' | 'io_battle' | 'io_result'
  window.screenState = 'login';

  // ── 화면 전환 ──
  window.switchScreen = function(newState) {
    const prev = window.screenState;
    window.screenState = newState;
    console.log(`[Screen] ${prev} → ${newState}`);

    // 모든 화면 숨기기
    const screens = ['login-screen', 'cardgame-main', 'io-lobby', 'unity-canvas', 'hud-bar', 'bottom-bar', 'io-result'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    switch (newState) {
      case 'login':
        show('login-screen', 'flex');
        break;

      case 'cardgame':
        show('cardgame-main', 'flex');
        // 카드 목록 + 매치 상태 요청
        if (window.socket) {
          window.socket.emit('card_list_request');
          window.socket.emit('br_match_status'); // 현재 매치 진행 여부
        }
        break;

      case 'io_lobby':
        show('cardgame-main', 'flex'); // 카드 화면 유지
        show('io-lobby', 'flex');      // 로비 오버레이
        break;

      case 'io_battle':
        show('unity-canvas', 'block');
        show('hud-bar', 'flex');
        show('bottom-bar', 'flex');
        // Unity에 게임 시작 알림
        if (window.myUnityInstance) {
          try { window.myUnityInstance.SendMessage('GameManager', 'OnIOBattleStart'); } catch(e) {}
        }
        break;

      case 'io_result':
        show('io-result', 'flex');
        break;
    }
  };

  function show(id, display) {
    const el = document.getElementById(id);
    if (el) el.style.display = display || 'block';
  }

  // ── IO 출전 요청 ──
  window.requestIOMatch = function() {
    if (!window.socket) return alert('서버 연결 안됨');
    // Unity를 이때 로드 (로그인 전 로드 방지)
    if (typeof loadUnityForIO === 'function') {
      loadUnityForIO();
    }
    window.socket.emit('br_request_match');
    switchScreen('io_lobby');
  };

  // ── IO 출전 취소 ──
  window.cancelIOMatch = function() {
    if (window.socket) window.socket.emit('br_cancel_match');
    switchScreen('cardgame');
  };

  // ── IO 사망 → 부활 or 카드게임 선택 ──
  window.showDeathChoice = function(data) {
    const el = document.getElementById('io-result');
    if (!el) return;
    const reviveCost = data.reviveCost || 50; // 다이아
    const myDiamonds = data.diamonds || 0;
    const canRevive = myDiamonds >= reviveCost;
    const matchTimeLeft = data.matchTimeLeft || 0; // 남은 시간(초)
    const matchMin = Math.floor(matchTimeLeft / 60);

    el.innerHTML = `
      <div style="background:rgba(0,0,0,0.95);padding:30px;border-radius:16px;text-align:center;color:#fff;max-width:420px;border:1px solid rgba(255,0,0,0.3)">
        <h2 style="color:#ff4444">💀 사망!</h2>
        <p style="color:#aaa;margin:8px 0">킬: ${data.kills || 0} | 생존: ${Math.floor((data.survivalTime || 0) / 60)}분</p>
        <p style="color:#666;font-size:12px;margin-bottom:16px">현재 매치 남은 시간: ${matchMin}분</p>

        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
          <button onclick="requestRevive()" style="padding:14px;background:${canRevive ? 'linear-gradient(135deg,#ff4400,#ff8800)' : '#333'};border:none;border-radius:10px;color:#fff;font-size:16px;font-weight:bold;cursor:${canRevive ? 'pointer' : 'not-allowed'}" ${canRevive ? '' : 'disabled'}>
            💎 ${reviveCost} 다이아로 부활!
            <div style="font-size:11px;color:${canRevive ? '#ffd700' : '#666'};margin-top:4px">${canRevive ? `보유: ${myDiamonds}💎` : `부족! (보유: ${myDiamonds}💎)`}</div>
          </button>

          <button onclick="returnToCardgameFromDeath()" style="padding:12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:#aaa;font-size:14px;cursor:pointer">
            🃏 카드게임으로 돌아가기
            <div style="font-size:11px;color:#666;margin-top:4px">매치 종료(${matchMin}분 후)까지 카드게임 플레이</div>
          </button>
        </div>
      </div>
    `;
    switchScreen('io_result');
  };

  // 부활 요청
  window.requestRevive = function() {
    if (window.socket) window.socket.emit('br_revive_request');
  };

  // 사망 후 카드게임 복귀
  window.returnToCardgameFromDeath = function() {
    switchScreen('cardgame');
    if (window.socket) window.socket.emit('card_list_request');
  };

  // ── IO 매치 완전 종료 → 결과 ──
  window.returnToCardgame = function(result) {
    if (result) {
      const el = document.getElementById('io-result');
      if (el) {
        el.innerHTML = `
          <div style="background:rgba(0,0,0,0.9);padding:30px;border-radius:16px;text-align:center;color:#fff;max-width:400px">
            <h2 style="color:${result.rank <= 3 ? '#ffd700' : '#aaa'}">${result.rank === 1 ? '🏆 치킨 디너!' : `#${result.rank}위`}</h2>
            <p>생존 시간: ${Math.floor((result.survivalTime || 0) / 60)}분 ${(result.survivalTime || 0) % 60}초</p>
            <p>킬: ${result.kills || 0} | 보상: ${result.gold || 0}G</p>
            <button onclick="switchScreen('cardgame')" style="margin-top:15px;padding:10px 30px;background:linear-gradient(135deg,#ffd700,#ff8800);border:none;border-radius:8px;color:#000;font-weight:bold;font-size:16px;cursor:pointer">카드게임으로 돌아가기</button>
          </div>
        `;
      }
      switchScreen('io_result');
    } else {
      switchScreen('cardgame');
    }
  };

  // ── 카드 목록 렌더링 ──
  window.renderCardHand = function(cards) {
    const container = document.getElementById('card-hand');
    if (!container) return;
    if (!cards || cards.length === 0) {
      container.innerHTML = '<div style="color:#888;text-align:center;padding:20px">보유한 카드가 없습니다. IO에 출전하여 카드를 획득하세요!</div>';
      return;
    }

    const gradeColors = { normal:'#888', rare:'#4488ff', epic:'#aa44ff', legend:'#ff8800', myth:'#ff4444' };
    const gradeBgs = { normal:'#33333344', rare:'#4488ff22', epic:'#aa44ff22', legend:'#ff880022', myth:'#ff444422' };
    container.innerHTML = cards.map(c => {
      var gc = gradeColors[c.grade] || '#444';
      var gb = gradeBgs[c.grade] || '#33333344';
      var starsStr = c.stars ? '\u2605'.repeat(c.stars) : '';
      return '<div class="card-item" onclick="selectCard(\'' + c.id + '\')" style="' +
        'min-width:120px;height:180px;background:linear-gradient(180deg,' + gc + '33,#1a1a2e);' +
        'border:2px solid ' + gc + ';border-radius:12px;padding:8px;' +
        'cursor:pointer;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;' +
        'transition:transform 0.2s;user-select:none;position:relative"' +
        ' onmouseenter="this.style.transform=\'translateY(-10px)\'" onmouseleave="this.style.transform=\'\'">' +
        (c.awakened ? '<div style="position:absolute;top:4px;right:6px;font-size:10px">✨</div>' : '') +
        '<div style="font-size:28px">' + (c.icon || '\u2694\uFE0F') + '</div>' +
        '<div style="font-size:11px;font-weight:bold;color:' + gc + ';text-align:center">' + c.name + '</div>' +
        '<div style="font-size:9px;color:#aaa">' + (c.raceIcon || '') + ' ' + (c.classIcon || '') + ' Lv.' + (c.level || 1) + ' ' + starsStr + '</div>' +
        '<div style="font-size:9px;color:#ff8844">ATK:' + (c.atk || 0) + ' DEF:' + (c.def || 0) + '</div>' +
        (c.hp ? '<div style="font-size:9px;color:#44ff44">HP:' + c.hp + '</div>' : '') +
        '<div style="font-size:8px;color:' + gc + '">' + (c.grade || 'normal').toUpperCase() + '</div>' +
      '</div>';
    }).join('');
  };

  // ── 카드 선택 ──
  window.selectCard = function(cardId) {
    if (window.socket) window.socket.emit('card_detail_request', { cardId });
  };

  // ── 카드 상세 렌더링 ──
  window.renderCardDetail = function(card) {
    const panel = document.getElementById('card-detail');
    if (!panel || !card) return;
    const gradeColors = { normal:'#888', rare:'#4488ff', epic:'#aa44ff', legend:'#ff8800', myth:'#ff4444' };
    var gc = gradeColors[card.grade] || '#fff';
    var starsStr = card.stars ? '\u2605'.repeat(card.stars) : '\u2606';
    var raceName = card.raceName || card.race || '';
    var className = card.className || card.class || '';
    var raceIcon = card.raceIcon || '';
    var classIcon = card.classIcon || '';

    // Equipment slots
    var equipSlots = ['weapon','armor','accessory'];
    var equipHTML = equipSlots.map(function(s) {
      var eq = card.equipment && card.equipment[s];
      var icon = eq ? (eq.icon || '\u2B1C') : '\u2B1C';
      var name = eq ? (eq.name || s) : '\uBE48\uCE78';
      return '<div style="flex:1;padding:4px;background:rgba(255,255,255,0.05);border-radius:4px;text-align:center;font-size:10px">' + icon + ' ' + name + '</div>';
    }).join('');

    // Skills
    var skillsArr = card.skills || [];
    var skillsHTML = skillsArr.length > 0
      ? skillsArr.map(function(s) {
          return '<div style="padding:4px 8px;background:rgba(170,68,255,0.15);border-radius:4px;font-size:10px">' + (s.icon || '\u2728') + ' ' + s.name + '</div>';
        }).join('')
      : '<div style="color:#555;font-size:10px">\uC2A4\uD0AC \uC5C6\uC74C</div>';

    // Enchants
    var enchantsArr = card.enchants || [];
    var enchantsHTML = enchantsArr.length > 0
      ? '<div style="color:#888;font-size:10px;margin-bottom:4px">\uC778\uCC48\uD2B8</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:8px">' +
        enchantsArr.map(function(e) {
          return '<div style="padding:3px 6px;background:rgba(100,200,255,0.15);border-radius:4px;font-size:9px">' + (e.icon || '\u2728') + ' ' + e.name + '</div>';
        }).join('') + '</div>'
      : '';

    // MATK row (if exists)
    var matkHTML = card.matk
      ? '<div style="text-align:center;background:rgba(170,68,255,0.15);padding:6px 12px;border-radius:6px"><div style="color:#aa44ff;font-size:14px;font-weight:bold">' + card.matk + '</div><div style="color:#888;font-size:9px">MATK</div></div>'
      : '';

    // Awakening / Transcendence
    var awakeHTML = '';
    if (card.awakened || card.transcendence) {
      awakeHTML = '<div style="text-align:center;margin-bottom:8px;font-size:10px">';
      if (card.awakened) awakeHTML += '<span style="color:#aa44ff">\u2728 \uAC01\uC131\uC644\uB8CC</span> ';
      if (card.transcendence) awakeHTML += '<span style="color:#ffd700">\uD83C\uDF1F \uCD08\uC6D4 ' + card.transcendence + '\uB2E8\uACC4</span>';
      awakeHTML += '</div>';
    }

    panel.innerHTML =
      '<div style="padding:12px">' +
        // Header
        '<div style="text-align:center;margin-bottom:12px">' +
          '<div style="font-size:36px">' + (card.icon || '\u2694\uFE0F') + '</div>' +
          '<div style="font-size:16px;color:' + gc + ';font-weight:bold">' + card.name + (card.awakened ? ' \u2728' : '') + '</div>' +
          '<div style="color:#aaa;font-size:11px">' + raceIcon + ' ' + raceName + ' ' + classIcon + ' ' + className + ' | Lv.' + (card.level || 1) + ' | ' + starsStr + ' | ' + (card.grade || 'normal').toUpperCase() + '</div>' +
          (card.desc ? '<div style="color:#666;font-size:10px;margin-top:4px">' + card.desc + '</div>' : '') +
          (card.destiny ? '<div style="color:#ffd700;font-size:10px;margin-top:4px">\u2728 ' + (card.destiny.name || card.destiny) + '</div>' : '') +
        '</div>' +
        // Awakening status
        awakeHTML +
        // Stats
        '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap">' +
          '<div style="text-align:center;background:rgba(255,68,68,0.15);padding:6px 12px;border-radius:6px"><div style="color:#ff4444;font-size:14px;font-weight:bold">' + (card.atk || 0) + '</div><div style="color:#888;font-size:9px">ATK</div></div>' +
          '<div style="text-align:center;background:rgba(68,170,255,0.15);padding:6px 12px;border-radius:6px"><div style="color:#44aaff;font-size:14px;font-weight:bold">' + (card.def || 0) + '</div><div style="color:#888;font-size:9px">DEF</div></div>' +
          '<div style="text-align:center;background:rgba(68,255,68,0.15);padding:6px 12px;border-radius:6px"><div style="color:#44ff44;font-size:14px;font-weight:bold">' + (card.hp || 0) + '</div><div style="color:#888;font-size:9px">HP</div></div>' +
          matkHTML +
        '</div>' +
        // Equipment
        '<div style="color:#888;font-size:10px;margin-bottom:4px">\uC7A5\uBE44</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:8px">' + equipHTML + '</div>' +
        // Skills
        '<div style="color:#888;font-size:10px;margin-bottom:4px">\uC2A4\uD0AC</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">' + skillsHTML + '</div>' +
        // Enchants
        enchantsHTML +
        // Action Buttons
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">' +
          '<button onclick="socket.emit(\'card_upgrade\',{cardId:\'' + card.id + '\'})" style="flex:1;padding:6px;background:rgba(68,255,68,0.2);border:1px solid #44ff44;border-radius:6px;color:#44ff44;font-size:10px;cursor:pointer">\u2B06\uFE0F\uAC15\uD654</button>' +
          '<button onclick="socket.emit(\'card_evolve\',{cardId:\'' + card.id + '\'})" style="flex:1;padding:6px;background:rgba(255,136,0,0.2);border:1px solid #ff8800;border-radius:6px;color:#ff8800;font-size:10px;cursor:pointer">\uD83D\uDD25\uC9C4\uD654</button>' +
          '<button onclick="socket.emit(\'card_promote\',{cardId:\'' + card.id + '\'})" style="flex:1;padding:6px;background:rgba(255,215,0,0.2);border:1px solid #ffd700;border-radius:6px;color:#ffd700;font-size:10px;cursor:pointer">\u2B50\uC9C4\uAE09</button>' +
          '<button onclick="socket.emit(\'card_awaken\',{cardId:\'' + card.id + '\'})" style="flex:1;padding:6px;background:rgba(170,68,255,0.2);border:1px solid #aa44ff;border-radius:6px;color:#aa44ff;font-size:10px;cursor:pointer">\uD83C\uDF1F\uAC01\uC131</button>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' +
          '<button onclick="socket.emit(\'card_fuse\',{cardIds:[\'' + card.id + '\']})" style="flex:1;padding:6px;background:rgba(136,136,255,0.2);border:1px solid #8888ff;border-radius:6px;color:#8888ff;font-size:10px;cursor:pointer">\uD83D\uDD04\uD569\uC131</button>' +
          '<button onclick="socket.emit(\'card_set_loadout\',{cardId:\'' + card.id + '\'})" style="flex:1;padding:6px;background:rgba(255,136,0,0.2);border:1px solid #ff8800;border-radius:6px;color:#ff8800;font-size:10px;cursor:pointer">\u2694\uFE0F\uCD9C\uC804</button>' +
          '<button onclick="socket.emit(\'card_enchant\',{cardId:\'' + card.id + '\'})" style="flex:1;padding:6px;background:rgba(100,200,255,0.2);border:1px solid #64c8ff;border-radius:6px;color:#64c8ff;font-size:10px;cursor:pointer">\u2728\uC778\uCC48</button>' +
          '<button onclick="socket.emit(\'card_equip_open\',{cardId:\'' + card.id + '\'})" style="flex:1;padding:6px;background:rgba(200,200,200,0.15);border:1px solid #aaa;border-radius:6px;color:#aaa;font-size:10px;cursor:pointer">\uD83D\uDEE1\uFE0F\uC7A5\uCC29</button>' +
        '</div>' +
      '</div>';
    panel.style.display = 'block';
  };

  // ── 행동 카드 핸드 렌더링 (하단, 5장 선택) ──
  window.renderActionHand = function(cards) {
    const container = document.getElementById('action-hand');
    if (!container) return;
    if (!cards || cards.length === 0) {
      container.innerHTML = '<div style="color:#666;text-align:center;width:100%;font-size:12px">행동 카드를 뽑아주세요</div>';
      return;
    }
    const rarityColors = { common:'#888', uncommon:'#44aa44', rare:'#4488ff', epic:'#aa44ff', legend:'#ff8800' };
    container.innerHTML = cards.map(c => `
      <div onclick="socket.emit('action_card_play',{cardId:'${c.drawId}'})" style="
        min-width:90px;height:120px;background:linear-gradient(180deg,${rarityColors[c.rarity] || '#444'}44,#0a0a1a);
        border:1px solid ${rarityColors[c.rarity] || '#444'};border-radius:8px;padding:6px;
        cursor:pointer;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;
        transition:transform 0.15s;font-size:10px;color:#fff;text-align:center"
        onmouseenter="this.style.transform='translateY(-8px) scale(1.05)'" onmouseleave="this.style.transform=''">
        <div style="font-size:22px">${c.icon || '🃏'}</div>
        <div style="font-size:10px;font-weight:bold">${c.name}</div>
        <div style="font-size:8px;color:${rarityColors[c.rarity] || '#888'}">${c.desc || ''}</div>
      </div>
    `).join('');
  };

  // ── IO 로비 렌더링 ──
  window.renderIOLobby = function(data) {
    const el = document.getElementById('io-lobby-status');
    if (!el) return;
    el.innerHTML = `
      <div style="font-size:20px;margin-bottom:10px">⏳ 매칭 중...</div>
      <div style="font-size:14px;color:#aaa">현재 대기: ${data.waiting || 0} / ${data.max || 100}명</div>
      <div style="font-size:12px;color:#666;margin-top:8px">매치 시작까지: ${data.countdown || '대기중'}초</div>
    `;
  };

})();
