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
        // 카드 목록 요청
        if (window.socket) window.socket.emit('card_list_request');
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

  // ── IO 종료 → 카드게임 복귀 ──
  window.returnToCardgame = function(result) {
    // 결과 표시
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
    container.innerHTML = cards.map(c => `
      <div class="card-item" onclick="selectCard('${c.id}')" style="
        min-width:120px;height:170px;background:linear-gradient(180deg,${gradeColors[c.grade] || '#444'}33,#1a1a2e);
        border:2px solid ${gradeColors[c.grade] || '#444'};border-radius:12px;padding:8px;
        cursor:pointer;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;
        transition:transform 0.2s;user-select:none"
        onmouseenter="this.style.transform='translateY(-10px)'" onmouseleave="this.style.transform=''">
        <div style="font-size:28px">${c.icon || '⚔️'}</div>
        <div style="font-size:11px;font-weight:bold;color:#fff;text-align:center">${c.name}</div>
        <div style="font-size:9px;color:${gradeColors[c.grade] || '#888'}">${(c.grade || 'normal').toUpperCase()}</div>
        <div style="font-size:9px;color:#aaa">ATK ${c.atk || 0} / DEF ${c.def || 0}</div>
        <div style="font-size:9px;color:#ffd700">Lv.${c.level || 1}</div>
      </div>
    `).join('');
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
    panel.innerHTML = `
      <div style="text-align:center;padding:15px">
        <div style="font-size:48px">${card.icon || '⚔️'}</div>
        <h3 style="color:${gradeColors[card.grade] || '#fff'};margin:8px 0">${card.name}</h3>
        <div style="color:#aaa;font-size:12px">${card.desc || ''}</div>
        <div style="margin:10px 0;display:flex;gap:15px;justify-content:center">
          <span style="color:#ff6644">ATK ${card.atk || 0}</span>
          <span style="color:#4488ff">DEF ${card.def || 0}</span>
          <span style="color:#44ff44">HP ${card.hp || 0}</span>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">
          <button onclick="socket.emit('card_upgrade',{cardId:'${card.id}'})" style="padding:6px 14px;background:#4488ff;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px">⬆️ 강화</button>
          <button onclick="socket.emit('card_fuse',{cardId:'${card.id}'})" style="padding:6px 14px;background:#aa44ff;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px">🔄 합성</button>
          <button onclick="socket.emit('card_set_loadout',{cardId:'${card.id}'})" style="padding:6px 14px;background:#ff8800;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px">⚔️ 출전 세팅</button>
        </div>
      </div>
    `;
    panel.style.display = 'block';
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
