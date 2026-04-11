// NPC 대화 시스템 — v2.58
// 리니지풍 마을 NPC: 이름, 대화 트리, 고유 서비스
// 각 마을별 고유 NPC + 공통 서비스 NPC

// ═══ NPC 정의 ═══
const TOWN_NPCS = {
  // ── 바람개비 마을 (시작 마을) ──
  aden: [
    {
      id: 'aden_elder', name: '촌장 아르덴', title: '바람개비 마을 촌장',
      icon: '👴', type: 'quest',
      greeting: '어서 오게, 젊은 모험가여. 이 마을은 자네 같은 용사를 기다리고 있었네.',
      menu: [
        { label: '📜 마을 이야기', action: 'talk', dialog: '이 마을은 오래전 바람의 정령이 축복한 땅이지. 마을 중앙의 풍차가 그 증거라네. 하지만 최근 이슬숲에서 몬스터들이 늘어나고 있어 걱정이야...' },
        { label: '❓ 도움이 필요해요', action: 'talk', dialog: '마을 밖으로 나가면 몬스터를 만날 수 있네. 처음에는 이슬숲의 슬라임부터 사냥해보게. 레벨이 오르면 대장장이에게서 장비를 강화하고, 힐러에게 치료를 받을 수 있어.' },
        { label: '🎁 오늘의 선물', action: 'daily_gift', cooldown: 86400 },
        { label: '👋 안녕히 계세요', action: 'close' },
      ]
    },
    {
      id: 'aden_smith', name: '대장장이 볼칸', title: '전설의 제련사',
      icon: '🔨', type: 'smith',
      greeting: '쇳소리가 좋은 날이군! 장비를 강화하겠나?',
      menu: [
        { label: '🔨 장비 강화', action: 'enchant' },
        { label: '⚒️ 장비 제작', action: 'craft' },
        { label: '🔍 장비 감정', action: 'appraise' },
        { label: '💬 이야기', action: 'talk', dialog: '나는 드워프 왕국에서 기술을 배웠지. 미스릴을 다룰 수 있는 대장장이는 이 대륙에 셋뿐이야. 좋은 재료를 가져오면 전설급 무기도 만들어 줄 수 있어!' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'aden_healer', name: '신관 루미아', title: '빛의 사제',
      icon: '💚', type: 'healer',
      greeting: '빛의 축복이 함께하길. 상처를 치유해 드릴까요?',
      menu: [
        { label: '💚 체력 회복 (무료)', action: 'heal' },
        { label: '✨ 축복 (30분 EXP+10%, 500G)', action: 'blessing', cost: 500, buff: { type: 'exp_boost', value: 10, duration: 1800 } },
        { label: '🧹 저주 해제 (1000G)', action: 'remove_curse', cost: 1000 },
        { label: '💬 이야기', action: 'talk', dialog: '저는 신성한 빛의 신전에서 수련한 사제입니다. 이 마을의 모험가들을 돌보는 것이 제 사명이지요. 어둠의 기운이 강해지고 있어 걱정이에요...' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'aden_storage', name: '창고지기 하겐', title: '마을 창고 관리인',
      icon: '📦', type: 'storage',
      greeting: '물건을 맡기시겠소? 안전하게 보관해 드리리다.',
      menu: [
        { label: '📦 창고 열기', action: 'open_storage' },
        { label: '📦 창고 확장 (다이아 100)', action: 'expand_storage', cost: { diamonds: 100 } },
        { label: '💬 이야기', action: 'talk', dialog: '이 창고는 마법 결계로 보호되고 있소. 어떤 도둑도 뚫지 못하지! 처음엔 20칸이지만, 확장하면 50칸까지 늘릴 수 있다오.' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'aden_teleporter', name: '마법사 텔라', title: '공간 마법사',
      icon: '🌀', type: 'teleporter',
      greeting: '공간의 문을 열어드리겠습니다. 어디로 가시겠어요?',
      menu: [
        { label: '🌀 별빛 항구 (200G)', action: 'teleport', target: 'harbor', cost: 200 },
        { label: '🌀 달빛 오아시스 (200G)', action: 'teleport', target: 'oasis', cost: 200 },
        { label: '🌀 구름마루 산장 (300G)', action: 'teleport', target: 'mountain', cost: 300 },
        { label: '🌀 신전 마을 (400G)', action: 'teleport', target: 'shrine', cost: 400 },
        { label: '🌀 사막 시장 (500G)', action: 'teleport', target: 'bazaar', cost: 500 },
        { label: '🌀 동쪽 항구 (600G)', action: 'teleport', target: 'port_east', cost: 600 },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'aden_innkeeper', name: '여관주인 마르타', title: '따뜻한 쉼터',
      icon: '🏠', type: 'inn',
      greeting: '어서 오세요! 따뜻한 수프와 포근한 침대가 준비되어 있답니다.',
      menu: [
        { label: '🛏️ 휴식 (EXP+15%, 200G/시간)', action: 'rest', cost: 200, buff: { type: 'rested_exp', value: 15, duration: 3600 } },
        { label: '🍖 식사 (HP+30%, ATK+5, 300G)', action: 'meal', cost: 300, buff: { type: 'well_fed', value: 5, duration: 1800 } },
        { label: '🍺 모험가 게시판', action: 'board' },
        { label: '💬 소문 듣기', action: 'rumor' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
  ],

  // ── 별빛 항구 ──
  harbor: [
    {
      id: 'harbor_captain', name: '선장 네모', title: '항해의 달인',
      icon: '⚓', type: 'travel',
      greeting: '바다 너머의 세계가 기다리고 있다! 어디로 항해할 텐가?',
      menu: [
        { label: '⛵ 동쪽 항구 (300G)', action: 'teleport', target: 'port_east', cost: 300 },
        { label: '⛵ 낚시 만 (200G)', action: 'teleport', target: 'fishing', cost: 200 },
        { label: '⛵ 산호초 해안 (150G)', action: 'teleport', target: 'coral', cost: 150 },
        { label: '💬 바다 이야기', action: 'talk', dialog: '나는 40년간 이 바다를 항해했지. 동쪽 심해에는 거대한 해룡이 산다는 전설이 있어. 바하무트... 그 이름만으로도 뱃사람들은 벌벌 떤다네.' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'harbor_merchant', name: '상인 길드장 로제', title: '무역의 여왕',
      icon: '💰', type: 'shop',
      greeting: '오호~ 안목 있는 손님이시군요! 특별한 물건을 보여드릴까요?',
      menu: [
        { label: '🛒 상점', action: 'shop' },
        { label: '💎 희귀 아이템 (다이아)', action: 'premium_shop' },
        { label: '📊 시세 확인', action: 'price_check' },
        { label: '💬 이야기', action: 'talk', dialog: '이 항구는 대륙 최대의 무역항이에요. 동쪽 대륙에서 들여오는 향신료와 마법 결정이 특히 인기지요. 교역으로 큰 돈을 벌고 싶다면 캐러밴을 시작해보세요!' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'harbor_storage', name: '창고지기 바르도', title: '항구 창고 관리인',
      icon: '📦', type: 'storage',
      greeting: '짐을 맡기시오? 바다 소금에도 끄떡없는 튼튼한 창고요!',
      menu: [
        { label: '📦 창고 열기', action: 'open_storage' },
        { label: '📦 창고 확장 (다이아 100)', action: 'expand_storage', cost: { diamonds: 100 } },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'harbor_healer', name: '의사 히포', title: '항해사의 의원',
      icon: '💚', type: 'healer',
      greeting: '바다에서 다쳤나요? 치료해 드리지요.',
      menu: [
        { label: '💚 체력 회복 (무료)', action: 'heal' },
        { label: '🧪 해독 (500G)', action: 'remove_curse', cost: 500 },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'harbor_teleporter', name: '마법사 포르타', title: '차원의 문지기',
      icon: '🌀', type: 'teleporter',
      greeting: '순간이동을 원하시나요? 마법의 대가를 치르셔야 합니다.',
      menu: [
        { label: '🌀 바람개비 마을 (200G)', action: 'teleport', target: 'aden', cost: 200 },
        { label: '🌀 달빛 오아시스 (300G)', action: 'teleport', target: 'oasis', cost: 300 },
        { label: '🌀 사막 시장 (400G)', action: 'teleport', target: 'bazaar', cost: 400 },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
  ],

  // ── 신전 마을 ──
  shrine: [
    {
      id: 'shrine_priest', name: '대신관 엘리아스', title: '신전의 수호자',
      icon: '⛪', type: 'quest',
      greeting: '신의 빛이 그대를 인도하기를. 무엇을 원하시나요?',
      menu: [
        { label: '🙏 기도 (HP/MP 완전회복)', action: 'heal' },
        { label: '✨ 신성 축복 (30분 전체스탯+5, 1000G)', action: 'blessing', cost: 1000, buff: { type: 'divine_blessing', value: 5, duration: 1800 } },
        { label: '📜 신전 퀘스트', action: 'talk', dialog: '최근 유령의 저택에서 사악한 기운이 감지되고 있습니다. 저택의 리치를 처치하고 돌아오면 성스러운 보상을 내리겠습니다.' },
        { label: '🔮 전직/각성 상담', action: 'class_info' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'shrine_trainer', name: '검술 교관 발두르', title: '전장의 노장',
      icon: '⚔️', type: 'trainer',
      greeting: '실력을 갈고닦으려는 건가? 좋아, 가르쳐 주지.',
      menu: [
        { label: '⚔️ 스킬 훈련 (스킬포인트 사용)', action: 'train_skills' },
        { label: '📊 전투 분석', action: 'combat_analysis' },
        { label: '💬 전투 조언', action: 'talk', dialog: '전사는 힘과 체력, 암살자는 민첩, 마법사는 지능에 투자해라. 그리고 장비 강화를 절대 소홀히 하지 마라. +7 이상 장비는 전장에서 확실한 차이를 만든다.' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'shrine_storage', name: '수호기사 카이', title: '신전 금고 수호자',
      icon: '📦', type: 'storage',
      greeting: '신전의 금고는 가장 안전한 곳입니다. 맡기시겠습니까?',
      menu: [
        { label: '📦 창고 열기', action: 'open_storage' },
        { label: '📦 창고 확장 (다이아 100)', action: 'expand_storage', cost: { diamonds: 100 } },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'shrine_teleporter', name: '사제 미스트랄', title: '신성 포탈 관리자',
      icon: '🌀', type: 'teleporter',
      greeting: '신성한 포탈을 열겠습니다. 목적지를 선택하세요.',
      menu: [
        { label: '🌀 바람개비 마을 (400G)', action: 'teleport', target: 'aden', cost: 400 },
        { label: '🌀 별빛 항구 (500G)', action: 'teleport', target: 'harbor', cost: 500 },
        { label: '🌀 끝자락 전초기지 (300G)', action: 'teleport', target: 'frontier', cost: 300 },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
  ],

  // ── 달빛 오아시스 ──
  oasis: [
    {
      id: 'oasis_sage', name: '현자 오시리스', title: '사막의 지혜',
      icon: '🧙', type: 'quest',
      greeting: '사막의 별이 그대를 이끌었구나. 무엇이 궁금한가?',
      menu: [
        { label: '📜 세계의 비밀', action: 'talk', dialog: '이 오아시스는 고대 정령왕이 남긴 축복이지. 사막 깊숙이에는 잊혀진 문명의 유적이 잠들어 있다네. 붉은모래 사막 너머에는...' },
        { label: '🔮 운세 보기 (500G)', action: 'fortune', cost: 500 },
        { label: '📚 마법 연구', action: 'talk', dialog: '마법의 근원은 마나. 마나는 세계를 이루는 원소의 힘이지. 화(火), 수(水), 뇌(雷), 지(地), 암(暗), 광(光)... 6원소의 균형이 깨지면 세계가 멸망한다네.' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'oasis_merchant', name: '대상인 카심', title: '오아시스 상회 주인',
      icon: '💰', type: 'shop',
      greeting: '사막에서 가장 귀한 것은 물이지만, 두 번째는 정보라오!',
      menu: [
        { label: '🛒 상점', action: 'shop' },
        { label: '🐫 캐러밴 출발', action: 'caravan' },
        { label: '💬 교역 정보', action: 'talk', dialog: '별빛 항구의 향신료가 이곳에선 3배 가격에 팔린다오. 반대로 이곳의 마법결정은 항구에서 2배! 캐러밴을 시작하면 큰돈을 벌 수 있지.' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'oasis_healer', name: '약초사 파티마', title: '사막의 치유사',
      icon: '🌿', type: 'healer',
      greeting: '사막의 약초로 상처를 치유해 드리겠어요.',
      menu: [
        { label: '💚 체력 회복 (무료)', action: 'heal' },
        { label: '🧪 해독/저주 해제 (800G)', action: 'remove_curse', cost: 800 },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
  ],

  // ── 사막 시장 ──
  bazaar: [
    {
      id: 'bazaar_auctioneer', name: '경매사 알리', title: '사막 경매장 주인',
      icon: '🏛️', type: 'shop',
      greeting: '오늘의 경매 품목이 매우 특별합니다! 구경해 보시겠습니까?',
      menu: [
        { label: '🏛️ 경매장 열기', action: 'auction' },
        { label: '🛒 상점', action: 'shop' },
        { label: '💬 시장 소식', action: 'talk', dialog: '최근 드래곤 비늘 가격이 폭등했어요! 용의 요람에서 나오는 재료가 줄었거든요. 지금이 팔 기회입니다!' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'bazaar_cook', name: '요리왕 하산', title: '대륙 최고의 요리사',
      icon: '🍖', type: 'cook',
      greeting: '배고픈 모험가에겐 든든한 한 끼가 최고의 무기지!',
      menu: [
        { label: '🍖 요리 주문 (버프 음식)', action: 'cook_menu' },
        { label: '📖 레시피 구매', action: 'recipe_shop' },
        { label: '💬 요리 비법', action: 'talk', dialog: '최고의 스테이크는 용의 불꽃으로 구운 것이지! 드래곤 비늘과 최상급 고기를 가져오면 ATK+20 버프 음식을 만들어줄게.' },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
    {
      id: 'bazaar_storage', name: '금고지기 자말', title: '사막 금고',
      icon: '📦', type: 'storage',
      greeting: '세상에서 가장 안전한 금고입니다. 사막의 도적도 뚫지 못하죠.',
      menu: [
        { label: '📦 창고 열기', action: 'open_storage' },
        { label: '📦 창고 확장 (다이아 100)', action: 'expand_storage', cost: { diamonds: 100 } },
        { label: '👋 돌아가기', action: 'close' },
      ]
    },
  ],
};

// ═══ 소문 시스템 ═══
const RUMORS = [
  '용의 요람에서 새로운 보스가 목격되었다는 소문이 있어요.',
  '최근 그림자숲에서 희귀한 약초가 발견되었대요.',
  '대투기장에서 열리는 토너먼트 우승 상금이 올랐다더군요.',
  '어둠의 심연 깊숙이에 고대 무기가 잠들어 있다는 전설이...',
  '별빛 항구의 상인이 동쪽 대륙에서 희귀한 룬을 가져왔대요.',
  '수정 광산에서 미스릴 광맥이 발견되었다는 소문이 돌고 있어요.',
  '마왕성의 문이 곧 열린다는 예언이 있답니다... 준비하세요.',
  '세계수의 열매를 먹으면 영원한 생명을 얻는다는 전설이 있지요.',
  '피의 투기장에서 전설의 검사가 나타났다더군요. 100연승 중이래!',
  '천공의 정상에서 하늘 드래곤을 본 사람이 있다고 해요.',
  '신전 마을의 대신관이 새로운 축복 마법을 연구 중이래요.',
  '최근 배틀로얄 우승자가 엄청난 상금을 받았다더군요!',
];

// ═══ NPC 상호작용 핸들러 ═══
function handleNpcInteraction(socket, playerId, players, io, npcId, menuAction, extraData) {
  const player = players[playerId];
  if (!player) return;

  // NPC 찾기
  const zone = player.zone;
  const townNpcs = TOWN_NPCS[zone];
  if (!townNpcs) { socket.emit('npc_result', { msg: '이곳에는 NPC가 없습니다.' }); return; }

  const npc = townNpcs.find(n => n.id === npcId);
  if (!npc) { socket.emit('npc_result', { msg: 'NPC를 찾을 수 없습니다.' }); return; }

  // 메뉴 아이템 찾기
  const menuItem = npc.menu.find(m => m.label === menuAction || m.action === menuAction);

  switch (menuAction) {
    case 'open_dialog':
      // NPC 대화창 열기 — 메뉴 목록 전송
      socket.emit('npc_dialog', {
        npcId: npc.id,
        name: npc.name,
        title: npc.title,
        icon: npc.icon,
        greeting: npc.greeting,
        menu: npc.menu.map(m => ({ label: m.label, action: m.action })),
      });
      break;

    case 'heal':
      player.hp = player.maxHp;
      if (player.mp !== undefined) player.mp = player.maxMp || player.mp;
      socket.emit('npc_result', { msg: npc.name + ': 빛의 축복이 함께하기를. 완전히 회복되었습니다.' });
      socket.emit('player_update', { id: playerId, hp: player.hp, maxHp: player.maxHp });
      break;

    case 'talk':
      if (menuItem && menuItem.dialog) {
        socket.emit('npc_dialog_text', { npcId: npc.id, name: npc.name, icon: npc.icon, text: menuItem.dialog });
      }
      break;

    case 'blessing':
      if (menuItem && menuItem.cost) {
        if ((player.gold || 0) < menuItem.cost) { socket.emit('npc_result', { msg: '골드가 부족합니다.' }); return; }
        player.gold -= menuItem.cost;
        // 버프 적용
        if (!player.npcBuffs) player.npcBuffs = [];
        player.npcBuffs.push({
          type: menuItem.buff.type,
          value: menuItem.buff.value,
          expiresAt: Date.now() + menuItem.buff.duration * 1000,
          from: npc.name,
        });
        socket.emit('npc_result', { msg: npc.name + ': 축복을 내립니다! (' + menuItem.buff.type + ' +' + menuItem.buff.value + ', ' + (menuItem.buff.duration/60) + '분)' });
        socket.emit('buff_applied', { type: menuItem.buff.type, value: menuItem.buff.value, duration: menuItem.buff.duration, from: npc.name });
      }
      break;

    case 'remove_curse':
      if (menuItem && menuItem.cost) {
        if ((player.gold || 0) < menuItem.cost) { socket.emit('npc_result', { msg: '골드가 부족합니다.' }); return; }
        player.gold -= menuItem.cost;
        // 디버프 제거
        if (player.debuffs) player.debuffs = [];
        if (player.npcBuffs) player.npcBuffs = player.npcBuffs.filter(b => b.value > 0);
        socket.emit('npc_result', { msg: npc.name + ': 저주가 해제되었습니다. 마음이 맑아졌군요.' });
      }
      break;

    case 'teleport':
      if (menuItem && menuItem.target && menuItem.cost) {
        if ((player.gold || 0) < menuItem.cost) { socket.emit('npc_result', { msg: '골드가 부족합니다. (필요: ' + menuItem.cost + 'G)' }); return; }
        const ZONES = require('./data/zones').ZONES;
        const targetZone = ZONES[menuItem.target];
        if (!targetZone) { socket.emit('npc_result', { msg: '목적지를 찾을 수 없습니다.' }); return; }
        player.gold -= menuItem.cost;
        player.x = targetZone.x + Math.floor(Math.random() * 20 - 10);
        player.y = targetZone.y + Math.floor(Math.random() * 20 - 10);
        player.zone = menuItem.target;
        socket.emit('npc_result', { msg: npc.name + ': 공간의 문이 열립니다! ' + targetZone.name + '(으)로 이동합니다.' });
        socket.emit('teleport_effect', { target: menuItem.target, name: targetZone.name });
      }
      break;

    case 'open_storage':
      // 개인 창고 열기
      if (!player.storage) player.storage = { slots: 20, items: {} };
      socket.emit('npc_storage', {
        npcName: npc.name,
        slots: player.storage.slots,
        items: player.storage.items,
      });
      break;

    case 'expand_storage':
      if (!player.storage) player.storage = { slots: 20, items: {} };
      if (player.storage.slots >= 50) { socket.emit('npc_result', { msg: '창고가 이미 최대입니다. (50칸)' }); return; }
      if ((player.diamonds || 0) < 100) { socket.emit('npc_result', { msg: '다이아가 부족합니다. (필요: 100💎)' }); return; }
      player.diamonds -= 100;
      player.storage.slots += 10;
      socket.emit('npc_result', { msg: npc.name + ': 창고를 확장했습니다! (' + player.storage.slots + '칸)' });
      break;

    case 'daily_gift': {
      const today = new Date().toISOString().slice(0, 10);
      if (player.lastNpcGift === today) { socket.emit('npc_result', { msg: npc.name + ': 오늘 선물은 이미 드렸습니다. 내일 다시 오세요!' }); return; }
      player.lastNpcGift = today;
      const giftGold = 200 + Math.floor(Math.random() * 300);
      player.gold = (player.gold || 0) + giftGold;
      socket.emit('npc_result', { msg: npc.name + ': 작은 선물이지만 받아주게. +' + giftGold + 'G' });
      break;
    }

    case 'rest':
    case 'meal':
      if (menuItem && menuItem.cost) {
        if ((player.gold || 0) < menuItem.cost) { socket.emit('npc_result', { msg: '골드가 부족합니다.' }); return; }
        player.gold -= menuItem.cost;
        if (!player.npcBuffs) player.npcBuffs = [];
        player.npcBuffs.push({
          type: menuItem.buff.type,
          value: menuItem.buff.value,
          expiresAt: Date.now() + menuItem.buff.duration * 1000,
          from: npc.name,
        });
        socket.emit('npc_result', { msg: npc.name + ': ' + (menuAction === 'rest' ? '편안히 쉬세요!' : '맛있게 드세요!') + ' (' + menuItem.buff.type + ' +' + menuItem.buff.value + ')' });
        socket.emit('buff_applied', { type: menuItem.buff.type, value: menuItem.buff.value, duration: menuItem.buff.duration, from: npc.name });
      }
      break;

    case 'rumor':
      var rumor = RUMORS[Math.floor(Math.random() * RUMORS.length)];
      socket.emit('npc_dialog_text', { npcId: npc.id, name: npc.name, icon: npc.icon, text: rumor });
      break;

    case 'fortune':
      if (menuItem && menuItem.cost) {
        if ((player.gold || 0) < menuItem.cost) { socket.emit('npc_result', { msg: '골드가 부족합니다.' }); return; }
        player.gold -= menuItem.cost;
        var fortunes = [
          { msg: '대길! 오늘 드롭률 UP!', buff: { type: 'luck', value: 10, duration: 1800 } },
          { msg: '중길. 평범한 하루가 될 것입니다.', buff: null },
          { msg: '소길. 조심하세요... 하지만 위기에 기회가!', buff: { type: 'dodge', value: 5, duration: 1800 } },
          { msg: '대대길!!! 경험치 보너스!', buff: { type: 'exp_boost', value: 20, duration: 1800 } },
        ];
        var f = fortunes[Math.floor(Math.random() * fortunes.length)];
        socket.emit('npc_dialog_text', { npcId: npc.id, name: npc.name, icon: '🔮', text: f.msg });
        if (f.buff) {
          if (!player.npcBuffs) player.npcBuffs = [];
          player.npcBuffs.push({ ...f.buff, expiresAt: Date.now() + f.buff.duration * 1000, from: npc.name });
          socket.emit('buff_applied', f.buff);
        }
      }
      break;

    default:
      // 기존 시스템 연동 (shop, craft, enchant 등)
      socket.emit('npc_result', { msg: npc.name + ': ' + (menuItem ? menuItem.label : '무엇을 도와드릴까요?') });
      break;
  }
}

// 창고 아이템 보관/인출
function handleStorageAction(socket, playerId, players, action, itemId, count) {
  const player = players[playerId];
  if (!player) return;
  if (!player.storage) player.storage = { slots: 20, items: {} };

  if (action === 'deposit') {
    if (!player.inventory || !player.inventory[itemId] || player.inventory[itemId] < count) {
      socket.emit('npc_result', { msg: '아이템이 부족합니다.' }); return;
    }
    var usedSlots = Object.keys(player.storage.items).length;
    if (!player.storage.items[itemId] && usedSlots >= player.storage.slots) {
      socket.emit('npc_result', { msg: '창고가 가득 찼습니다. (' + usedSlots + '/' + player.storage.slots + ')' }); return;
    }
    player.inventory[itemId] -= count;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
    player.storage.items[itemId] = (player.storage.items[itemId] || 0) + count;
    socket.emit('npc_result', { msg: itemId + ' x' + count + ' 보관 완료' });
    socket.emit('npc_storage', { slots: player.storage.slots, items: player.storage.items });
  } else if (action === 'withdraw') {
    if (!player.storage.items[itemId] || player.storage.items[itemId] < count) {
      socket.emit('npc_result', { msg: '창고에 해당 아이템이 없습니다.' }); return;
    }
    player.storage.items[itemId] -= count;
    if (player.storage.items[itemId] <= 0) delete player.storage.items[itemId];
    if (!player.inventory) player.inventory = {};
    player.inventory[itemId] = (player.inventory[itemId] || 0) + count;
    socket.emit('npc_result', { msg: itemId + ' x' + count + ' 인출 완료' });
    socket.emit('npc_storage', { slots: player.storage.slots, items: player.storage.items });
  }
}

// 특정 존의 NPC 목록 반환
function getTownNpcList(zone) {
  return TOWN_NPCS[zone] || [];
}

module.exports = {
  TOWN_NPCS,
  RUMORS,
  handleNpcInteraction,
  handleStorageAction,
  getTownNpcList,
};
