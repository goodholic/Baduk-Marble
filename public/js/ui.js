// UI rendering functions (extracted from index.html)

    function togglePanel(name) {
      var panel = document.getElementById('panel-' + name);
      var isVisible = panel.classList.contains('show');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('show'));
      if (!isVisible) {
        panel.classList.add('show');
        if (name === 'shop') renderShop();
        else if (name === 'market') window.socket.emit('market_browse',{});
        else if (name === 'inventory') window.socket.emit('get_inventory','{}');
        else if (name === 'units') window.socket.emit('get_units','{}');
        else if (name === 'quests') window.socket.emit('get_quests','{}');
        else if (name === 'ranking') window.socket.emit('get_ranking','{}');
      }
    }

    function closePanel(name) { document.getElementById('panel-'+name).classList.remove('show'); }

    function claimDaily() { window.socket.emit('daily_reward','{}'); }

    function renderShop() {
      var cats = ['소모품','부스터','장비','코스메틱','편의'];
      var tabHtml = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">';
      cats.forEach(c => {
        var active = c === currentShopCat;
        tabHtml += '<button class="btn btn-sm" style="' + (active ? 'background:var(--c-gold-dim);color:var(--c-gold);border-color:var(--c-border-gold)' : '') + '" onclick="currentShopCat=\''+c+'\';renderShop();">'+c+'</button>';
      });
      tabHtml += '</div>';
      var html = tabHtml;
      shopItems.filter(item => item.cat === currentShopCat).forEach(item => {
        var nameStyle = item.color ? 'color:'+item.color : '';
        html += '<div class="panel-item"' + (item.color ? ' style="border-left:3px solid '+item.color+'"' : '') + '><span class="name" style="'+nameStyle+'">'+item.name+'</span><button onclick="window.socket.emit(\'shop_buy\',\''+item.id+'\')">'+item.price+'</button></div>';
      });
      document.getElementById('shop-body').innerHTML = html;
    }

    function renderMarket(data) {
      var body = document.getElementById('market-body');
      if (!data.listings || data.listings.length === 0) { body.innerHTML = '<p style="color:#888">등록된 물건이 없습니다</p>'; return; }
      var html = '';
      data.listings.forEach(l => {
        html += '<div class="panel-item"><span class="name">'+l.itemName+' <small style="color:#888">by '+l.sellerName+'</small></span><button onclick="window.socket.emit(\'market_buy\','+l.id+')">'+l.price+'G</button></div>';
      });
      body.innerHTML = html;
    }

    // 인벤토리 상태 (검색/정렬)
    window._invState = window._invState || { data: null, search: '', sort: 'cat' };
    function renderInventory(data) {
      if (data) window._invState.data = data;
      data = window._invState.data;
      if (!data) return;
      var body = document.getElementById('inventory-body');
      var inv = data.inventory || {};
      var items = data.items || {};
      var keys = Object.keys(inv);
      if (keys.length === 0) { body.innerHTML = '<p style="color:#666">인벤토리가 비어있습니다</p>'; return; }

      // 검색 필터 (이름 또는 ID)
      var search = (window._invState.search || '').toLowerCase().trim();
      if (search) {
        keys = keys.filter(k => {
          var name = (items[k] && items[k].name || k).toLowerCase();
          return k.toLowerCase().includes(search) || name.includes(search);
        });
      }

      // 정렬 옵션
      var sortMode = window._invState.sort || 'cat';
      if (sortMode === 'name') {
        keys.sort((a, b) => (items[a]?.name || a).localeCompare(items[b]?.name || b));
      } else if (sortMode === 'count') {
        keys.sort((a, b) => (inv[b] || 0) - (inv[a] || 0));
      } else if (sortMode === 'grade') {
        var gradeOrder = { legendary:0, epic:1, rare:2, uncommon:3, normal:4 };
        keys.sort((a, b) => (gradeOrder[items[a]?.grade] ?? 5) - (gradeOrder[items[b]?.grade] ?? 5));
      }

      // 툴바 (검색 + 정렬)
      var toolbar = '<div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">' +
        '<input type="text" placeholder="🔍 검색..." value="' + search + '" ' +
        'oninput="window._invState.search=this.value;renderInventory();" ' +
        'style="flex:1;min-width:120px;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;font-size:12px">' +
        '<select onchange="window._invState.sort=this.value;renderInventory();" ' +
        'style="padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;font-size:11px">' +
        '<option value="cat"' + (sortMode==='cat'?' selected':'') + '>카테고리</option>' +
        '<option value="name"' + (sortMode==='name'?' selected':'') + '>이름순</option>' +
        '<option value="count"' + (sortMode==='count'?' selected':'') + '>수량순</option>' +
        '<option value="grade"' + (sortMode==='grade'?' selected':'') + '>등급순</option>' +
        '</select></div>';

      // 카테고리 분류 (sortMode가 'cat'일 때만 분류)
      var cats = {equip:[], pot:[], mat:[], goods:[], etc:[]};
      keys.forEach(k => {
        if (k.startsWith('equip_')) cats.equip.push(k);
        else if (k.startsWith('pot_') || k.startsWith('food_')) cats.pot.push(k);
        else if (k.startsWith('mat_')) cats.mat.push(k);
        else if (k.startsWith('goods_')) cats.goods.push(k);
        else cats.etc.push(k);
      });

      var catNames = {equip:'장비', pot:'물약/음식', mat:'재료', goods:'교역품', etc:'기타'};
      var catColors = {equip:'#44aaff', pot:'#44ff44', mat:'#ffd700', goods:'#ff9944', etc:'#aaa'};

      var equipped = data.equipped || {};
      var gradeColors = {normal:'#ccc',uncommon:'#44cc44',rare:'#4488ff',epic:'#aa44ff',legendary:'#ff8800'};
      var gradeNames = {normal:'일반',uncommon:'고급',rare:'희귀',epic:'영웅',legendary:'전설'};
      var slotNames = {weapon:'무기',armor:'방어구',helmet:'투구',gloves:'장갑',boots:'신발',ring:'반지',necklace:'목걸이'};

      var html = toolbar;

      // 장착 중인 장비 먼저 표시
      var equippedKeys = Object.values(equipped).filter(Boolean);
      if (equippedKeys.length > 0 && !search && sortMode === 'cat') {
        html += '<h4 style="color:#ffd700;margin:8px 0 4px;font-size:12px">장착 중</h4>';
        for (var slot in equipped) {
          var eqId = equipped[slot];
          if (!eqId) continue;
          var eqInfo = items[eqId] || {};
          var gc = gradeColors[eqInfo.grade] || '#ccc';
          var enchLv = data.enchantLevels && data.enchantLevels[eqId] ? ' +'+data.enchantLevels[eqId] : '';
          var itemCls = 'item-' + (eqInfo.grade || 'normal');
          html += '<div class="panel-item '+itemCls+'" style="background:rgba(255,215,0,0.05)"><span class="name" style="color:'+gc+'">[' + (slotNames[slot]||slot) + '] '+(eqInfo.name||eqId)+enchLv+'</span>';
          html += '<button onclick="window.socket.emit(\'unequip_item\',\''+slot+'\')" style="background:#4a2a2a">해제</button></div>';
        }
      }

      // 평면 리스트 렌더러 (sortMode !== 'cat' 또는 검색 중)
      function renderItemRow(k) {
          var name = items[k] ? items[k].name : k.replace(/_/g,' ');
          var isEquip = k.startsWith('equip_');
          var grade = items[k]?.grade || '';
          var gColor = gradeColors[grade] || '#ccc';
          var gName = gradeNames[grade] || '';
          var enchant = data.enchantLevels && data.enchantLevels[k] ? ' +'+data.enchantLevels[k] : '';
          var boundTag = items[k]?.bound ? ' <span style="color:#f44;font-size:9px">[귀속]</span>' : '';
          var isWorn = equippedKeys.includes(k);
          var itemCls2 = grade ? 'item-'+grade : '';
          var row = '<div class="panel-item '+itemCls2+'" style="'+(isWorn?'opacity:0.5':'')+'"><span class="name" style="color:'+gColor+'">'+name+enchant;
          if (gName) row += ' <small style="color:'+gColor+';opacity:0.7">('+gName+')</small>';
          if (isWorn) row += ' <span style="color:#ffd700;font-size:9px">[장착중]</span>';
          row += boundTag+' <b style="color:#888">x'+inv[k]+'</b></span>';
          if (isEquip && !isWorn) {
            row += '<button onclick="equipItem(\''+k+'\')" style="background:#2a4a2a">착용</button>';
            row += '<button onclick="window.socket.emit(\'compare_equip\',\''+k+'\')" style="background:#1a3a4a;margin-left:2px;font-size:9px">비교</button>';
          }
          if (isEquip) row += '<button onclick="enchantItem(\''+k+'\')" style="background:#4a3a1a;margin-left:3px">강화</button>';
          row += '<button onclick="sellItem(\''+k+'\')" style="margin-left:3px">판매</button></div>';
          return row;
      }

      // 카테고리 모드가 아니거나 검색 중이면 평면 리스트
      if (sortMode !== 'cat' || search) {
        html += '<h4 style="color:#aaa;margin:8px 0 4px;font-size:12px">결과 ('+keys.length+'개)</h4>';
        keys.forEach(k => { html += renderItemRow(k); });
        body.innerHTML = html;
        return;
      }

      for (var cat in cats) {
        if (cats[cat].length === 0) continue;
        html += '<h4 style="color:'+catColors[cat]+';margin:8px 0 4px;font-size:12px">'+catNames[cat]+' ('+cats[cat].length+')</h4>';
        cats[cat].forEach(k => {
          var name = items[k] ? items[k].name : k.replace(/_/g,' ');
          var isEquip = cat === 'equip';
          var grade = items[k]?.grade || '';
          var gColor = gradeColors[grade] || '#ccc';
          var gName = gradeNames[grade] || '';
          var enchant = data.enchantLevels && data.enchantLevels[k] ? ' +'+data.enchantLevels[k] : '';
          var boundTag = items[k]?.bound ? ' <span style="color:#f44;font-size:9px">[귀속]</span>' : '';
          var isWorn = equippedKeys.includes(k);
          var itemCls3 = grade ? 'item-'+grade : '';
          html += '<div class="panel-item '+itemCls3+'" style="'+(isWorn?'opacity:0.5':'')+'"><span class="name" style="color:'+gColor+'">'+name+enchant;
          if (gName) html += ' <small style="color:'+gColor+';opacity:0.7">('+gName+')</small>';
          if (isWorn) html += ' <span style="color:#ffd700;font-size:9px">[장착중]</span>';
          html += boundTag+' <b style="color:#888">x'+inv[k]+'</b></span>';
          if (isEquip && !isWorn) {
            html += '<button onclick="equipItem(\''+k+'\')" style="background:#2a4a2a">착용</button>';
            html += '<button onclick="window.socket.emit(\'compare_equip\',\''+k+'\')" style="background:#1a3a4a;margin-left:2px;font-size:9px">비교</button>';
          }
          if (isEquip) html += '<button onclick="enchantItem(\''+k+'\')" style="background:#4a3a1a;margin-left:3px">강화</button>';
          html += '<button onclick="sellItem(\''+k+'\')" style="margin-left:3px">판매</button></div>';
        });
      }
      body.innerHTML = html;
    }

    function equipItem(id) { window.socket.emit('equip_item', id); }
    function enchantItem(id) {
      showModal('장비 강화', '<p style="color:#ffd700">이 장비를 강화하시겠습니까?</p><p style="color:#888;font-size:11px">+8 이상 실패 시 등급 하락, +11 이상 실패 시 파괴</p><label style="color:#aaa;font-size:12px;display:flex;align-items:center;gap:5px;margin-top:8px"><input type="checkbox" id="enchant-protect"> 보호 주문서 사용</label>', [
        {label:'강화!', action:"closeModal();window.socket.emit('enchant_item',{itemId:'"+id+"',useProtect:document.getElementById('enchant-protect').checked})"},
        {label:'취소', type:'cancel', action:'closeModal()'}
      ]);
    }

    function sellItem(itemId) {
      showModal('경매장 등록', '<p style="color:#aaa;font-size:12px">판매 가격을 입력하세요 (수수료 5%)</p><input id="sell-price" type="number" value="100" min="1" style="width:100%;padding:8px;background:#222;color:#ffd700;border:1px solid #555;border-radius:4px;font-size:14px;margin-top:8px">', [
        {label:'등록', action:"var p=parseInt(getModalInput('sell-price'));if(p>0){window.socket.emit('market_list_item',{itemId:'"+itemId+"',price:p});}closeModal();"},
        {label:'취소', type:'cancel', action:'closeModal()'}
      ]);
    }

    function renderUnits(data) {
      var body = document.getElementById('units-body');
      var units = data.units || [];
      if (units.length === 0) { body.innerHTML = '<p style="color:#888">용병이 없습니다</p>'; return; }
      var html = '<p style="color:#aaa;margin-bottom:8px">보유: '+units.length+'/'+data.maxArmy+'</p>';
      units.forEach(u => {
        html += '<div class="panel-item"><span class="name">Lv.'+u.level+' '+u.displayName+'<br><small style="color:#888">HP:'+Math.ceil(u.hp)+'/'+Math.ceil(u.maxHp)+'</small></span><button onclick="window.socket.emit(\'sell_unit\',\''+u.id+'\')" style="background:#6a5a2a;margin-right:3px">판매</button><button onclick="window.socket.emit(\'dismiss_unit\',\''+u.id+'\')">해고</button></div>';
      });
      body.innerHTML = html;
    }

    function renderQuests(data) {
      var body = document.getElementById('quests-body');
      var quests = data.quests || {};
      var progress = data.progress || {};
      var completed = data.completed || {};
      // 카테고리 분류
      var groups = { daily: [], weekly: [], achievement: [], story: [] };
      Object.entries(quests).forEach(([qId, q]) => {
        var key = q.type || 'story';
        if (!groups[key]) groups[key] = [];
        groups[key].push([qId, q]);
      });
      var groupLabels = { daily:'📅 일일', weekly:'📆 주간', achievement:'🏆 업적', story:'📖 스토리' };
      var groupColors = { daily:'#88ccff', weekly:'#aa44ff', achievement:'#ffd700', story:'#44ff44' };
      var html = '';
      var summary = { total:0, done:0, claimable:0 };
      for (var key in groups) {
        if (groups[key].length === 0) continue;
        summary.total += groups[key].length;
        var doneCount = groups[key].filter(([qId,q]) => completed[qId]).length;
        var claimableCount = groups[key].filter(([qId,q]) => !completed[qId] && (progress[qId]||0) >= q.goal).length;
        summary.done += doneCount;
        summary.claimable += claimableCount;
        html += '<h3 style="color:'+groupColors[key]+';margin:10px 0 6px;font-size:13px">'+groupLabels[key]+' <span style="color:#888;font-size:11px">('+doneCount+'/'+groups[key].length+')</span>';
        if (claimableCount > 0) html += ' <span style="color:#ffd700;font-size:11px">🎁 '+claimableCount+'건 수령가능</span>';
        html += '</h3>';
        groups[key].forEach(([qId, q]) => {
          var prog = progress[qId] || 0;
          var done = !!completed[qId];
          var canClaim = prog >= q.goal && !done;
          var statusColor = done ? '#44ff44' : (canClaim ? '#ffd700' : '#aaa');
          var pct = Math.min(100, Math.floor(prog / q.goal * 100));
          html += '<div class="panel-item" style="flex-wrap:wrap"><span class="name" style="width:100%">'+q.name+' <span style="color:'+statusColor+'">'+(done?'[완료]':prog+'/'+q.goal)+'</span><br><small style="color:#888">'+q.desc+'</small></span>';
          if (!done) html += '<div style="width:100%;height:6px;background:#1a1a3a;border-radius:3px;margin-top:4px"><div style="width:'+pct+'%;height:100%;background:'+statusColor+';border-radius:3px;transition:width 0.3s"></div></div>';
          if (canClaim) html += '<button onclick="window.socket.emit(\'quest_claim\',\''+qId+'\');" style="margin-top:6px;width:100%">보상 수령</button>';
          html += '</div>';
        });
      }
      // 상단 요약
      var summaryHtml = '<div style="background:rgba(255,215,0,0.05);border-left:3px solid #ffd700;padding:8px 10px;margin-bottom:10px;font-size:12px;color:#ddd">' +
        '📊 총 진행도: <b style="color:#ffd700">'+summary.done+'/'+summary.total+'</b>' +
        (summary.claimable > 0 ? ' · <span style="color:#ffd700">🎁 '+summary.claimable+'건 수령 가능!</span>' : '') +
        '</div>';
      body.innerHTML = summaryHtml + html;
    }

    function renderRanking(data) {
      var body = document.getElementById('ranking-body');
      var html = '<h3 style="color:#ffd700;margin-bottom:8px">레벨 랭킹</h3>';
      (data.level||[]).forEach((r,i) => { html += '<div style="padding:4px 0;color:#ddd">'+(i+1)+'. Lv.'+r.level+' '+r.name+' ('+r.className+')</div>'; });
      html += '<h3 style="color:#ff6b6b;margin:12px 0 8px">PvP 랭킹</h3>';
      (data.pvp||[]).forEach((r,i) => { html += '<div style="padding:4px 0;color:#ddd">'+(i+1)+'. '+r.kills+'킬 '+r.name+'</div>'; });
      body.innerHTML = html;
    }

    // ── 미니맵 ──
    var minimapCanvas = document.getElementById('minimap');
    var minimapCtx = minimapCanvas.getContext('2d');
    var minimapContainer = document.getElementById('minimap-container');
    var minimapZoneLabel = document.getElementById('minimap-zone');
    var MAP_MIN = -1000, MAP_MAX = 1000, MAP_SIZE = 220;

    var zones = {
      // 마을 (초록)
      aden:{name:'바람개비',x:-500,y:-500,w:60,h:60,color:'#2d5a1e'},
      harbor:{name:'별빛항구',x:350,y:-450,w:50,h:50,color:'#1e5a2d'},
      oasis:{name:'달빛',x:-100,y:0,w:50,h:50,color:'#2d5a1e'},
      mountain:{name:'구름마루',x:300,y:100,w:50,h:50,color:'#1e4a2d'},
      frontier:{name:'끝자락',x:-300,y:350,w:50,h:50,color:'#2d4a1e'},
      // 초보
      forest:{name:'이슬숲',x:-420,y:-400,w:80,h:70,color:'#1a3a0a'},
      plains:{name:'해바라기',x:-300,y:-450,w:80,h:60,color:'#4a6a2a'},
      meadow:{name:'꽃잎',x:-150,y:-400,w:70,h:60,color:'#3a5a1a'},
      // 중급
      swamp:{name:'안개골',x:50,y:-350,w:70,h:70,color:'#2a4a1a'},
      desert:{name:'붉은모래',x:200,y:-350,w:80,h:70,color:'#6a5a2a'},
      cave:{name:'수정동굴',x:-400,y:-200,w:70,h:70,color:'#2a1a3a'},
      ruins:{name:'달그림자',x:-250,y:-200,w:70,h:60,color:'#3a2a1a'},
      coral:{name:'산호초',x:400,y:-250,w:60,h:60,color:'#1a4a5a'},
      // 고급
      volcano:{name:'불꽃산',x:150,y:-150,w:80,h:70,color:'#5a2a1a'},
      graveyard:{name:'무덤',x:-400,y:-50,w:70,h:60,color:'#3a2a3a'},
      darkforest:{name:'그림자숲',x:200,y:-50,w:70,h:70,color:'#0a2a0a'},
      glacier:{name:'얼음협곡',x:-350,y:100,w:70,h:60,color:'#1a3a5a'},
      // 최상급
      dragon:{name:'용의요람',x:350,y:150,w:70,h:70,color:'#5a1a1a'},
      abyss:{name:'심연',x:-400,y:200,w:80,h:70,color:'#1a1a3a'},
      hell:{name:'혼돈의문',x:-200,y:250,w:70,h:70,color:'#4a0a0a'},
      ancient:{name:'태고의숲',x:100,y:300,w:80,h:70,color:'#0a3a0a'},
      // PK
      chaos:{name:'피의골짜기',x:100,y:200,w:80,h:70,color:'#3a1a4a'},
      warzone:{name:'전쟁벌판',x:-100,y:350,w:90,h:70,color:'#4a1a1a'},
      // 특수
      castle:{name:'하늘성채',x:0,y:400,w:80,h:70,color:'#5a4a1a'},
      arena:{name:'투기장',x:350,y:350,w:50,h:50,color:'#4a4a1a'},
      // 확장 동부
      port_east:{name:'동쪽항구',x:700,y:-700,w:50,h:50,color:'#1e5a2d'},
      mushroom:{name:'버섯골짜기',x:600,y:-500,w:80,h:70,color:'#3a2a1a'},
      riverbank:{name:'강변평야',x:800,y:-300,w:80,h:60,color:'#2a4a3a'},
      sandstorm:{name:'모래폭풍',x:600,y:-100,w:80,h:70,color:'#5a4a1a'},
      sunken:{name:'수몰신전',x:700,y:100,w:70,h:70,color:'#1a3a5a'},
      shadow:{name:'그림자영역',x:800,y:400,w:70,h:70,color:'#2a1a3a'},
      celestial:{name:'천공정상',x:700,y:700,w:80,h:80,color:'#5a5a1a'},
      void_rift:{name:'공허균열',x:900,y:900,w:70,h:70,color:'#3a0a3a'},
      fishing:{name:'낚시만',x:900,y:0,w:50,h:50,color:'#1a4a5a'},
      blood_arena:{name:'피의투기장',x:500,y:-800,w:70,h:70,color:'#4a0a0a'},
      colosseum:{name:'대투기장',x:900,y:-900,w:60,h:60,color:'#4a4a1a'},
      // 확장 서부
      shrine:{name:'신전마을',x:-800,y:200,w:50,h:50,color:'#2d5a1e'},
      tundra:{name:'얼어붙은평원',x:-700,y:-700,w:80,h:70,color:'#5a5a6a'},
      crystal_mine:{name:'수정광산',x:-800,y:-200,w:70,h:70,color:'#3a3a5a'},
      toxic_marsh:{name:'독안개습지',x:-700,y:400,w:80,h:70,color:'#1a3a1a'},
      haunted:{name:'유령저택',x:-600,y:600,w:70,h:70,color:'#3a1a3a'},
      sky_ruins:{name:'하늘유적',x:-800,y:700,w:80,h:70,color:'#4a4a5a'},
      frozen_deep:{name:'빙결심연',x:-600,y:-800,w:70,h:70,color:'#1a2a4a'},
      demon:{name:'마왕성',x:-800,y:900,w:80,h:80,color:'#4a0a1a'},
      lawless:{name:'무법황야',x:-500,y:800,w:80,h:70,color:'#4a2a0a'},
      // 확장 중앙
      bazaar:{name:'사막시장',x:500,y:500,w:50,h:50,color:'#5a4a1a'},
      world_tree:{name:'세계수',x:0,y:800,w:80,h:80,color:'#0a4a0a'},
      fortress:{name:'북부요새',x:0,y:-900,w:70,h:70,color:'#4a3a1a'},
      training:{name:'훈련장',x:-900,y:0,w:60,h:60,color:'#3a3a2a'},
      magma_core:{name:'용암핵심',x:500,y:300,w:70,h:70,color:'#5a1a0a'},
    };

    var lastSyncPlayers = {};
    var lastSyncMonsters = {};
    var myPlayerId = null;

