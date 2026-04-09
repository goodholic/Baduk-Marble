// Utility functions (extracted from index.html)

    function addChatMsg(text, cls) {
      var log = document.getElementById('chat-log');
      var div = document.createElement('div');
      div.className = cls || '';
      div.textContent = text;
      log.appendChild(div);
      if (log.children.length > 100) log.removeChild(log.firstChild);
      log.scrollTop = log.scrollHeight;
    }

    // ── 토스페이먼츠 결제 ──
    // 결제 키는 서버에서 주입 (하드코딩 방지)
    var tossPayments = null;
    fetch('/api/payment-key').then(r=>r.json()).then(d=>{ tossPayments = TossPayments(d.clientKey); }).catch(()=>{});

    function buyDiamond(productId, amount) {
      if (!tossPayments) { showToast('결제 모듈 로딩 중...'); return; }
      var orderId = productId + '_' + deviceId + '_' + Date.now();
      var host = location.origin;

      tossPayments.requestPayment('카드', {
        amount: amount,
        orderId: orderId,
        orderName: productId.replace('diamond_','') + ' 다이아몬드',
        customerName: 'Player',
        successUrl: host + '/payment/success',
        failUrl: host + '/payment/fail',
      }).catch(function(err) {
        if (err.code === 'USER_CANCEL') showToast('결제가 취소되었습니다');
        else showToast('결제 오류: ' + err.message);
      });
    }

    function doMorph(type) { window.socket.emit('morph', type); }
    function toggleAutoPotion() { window.socket.emit('toggle_auto_potion','{}'); }
    function toggleAutoSkill() { window.socket.emit('toggle_auto_skill'); }

    // 전투 로그
    function addCombatLog(msg, cls) {
      var log = document.getElementById('combat-log');
      var div = document.createElement('div');
      div.className = cls || '';
      div.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
      log.appendChild(div);
      if (log.children.length > 50) log.removeChild(log.firstChild);
      log.scrollTop = log.scrollHeight;
    }

    // 서버 공지
    function showServerMsg(msg, type) {
      var el = document.getElementById('server-msg');
      el.textContent = msg;
      el.className = (type || 'normal') + ' show';
      addCombatLog('[공지] ' + msg, 'log-morph');
      // 이벤트 타입별 효과
      if (type === 'boss') {
        playSFX('boss');
        document.getElementById('unity-container').classList.add('shake');
        setTimeout(function(){ document.getElementById('unity-container').classList.remove('shake'); }, 500);
      } else if (type === 'rare') {
        playSFX('levelup');
      } else if (type === 'danger') {
        playSFX('pvp');
      }
      setTimeout(() => { el.classList.remove('show'); }, 5000);
    }

    function showToast(msg) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }
