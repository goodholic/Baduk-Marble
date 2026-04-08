// 지역(Zone) 데이터 — v1.38 Phase 2 추출
// server.js에서 분리된 데이터 모듈 (함수 종속성 0)
// 포함: ZONES, ZONE_AMBIENCE, MONSTER_LORE, ZONE_CONNECTIONS,
//       TERRAIN_BARRIERS, ROADS, ZONE_MONSTERS, ZONE_MONSTER_NAMES

const ZONES = {
    // ── 마을 5곳 (안전지대, 교역 거점) ──
    aden:       { name:'바람개비 마을',    x:-500, y:-500, w:60, h:60, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이','힐러','제작소'] },
    harbor:     { name:'별빛 항구',       x:350,  y:-450, w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','펫 상인','항해사'] },
    oasis:      { name:'달빛 오아시스',    x:-100, y:0,    w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','제작소'] },
    mountain:   { name:'구름마루 산장',    x:300,  y:100,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이'] },
    frontier:   { name:'끝자락 전초기지',  x:-300, y:350,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','힐러'] },
    // ── 초보 사냥터 (마을 주변) ──
    forest:     { name:'이슬숲',          x:-420, y:-400, w:80, h:70, lvl:[1,10],  safe:false, bg:'map_forest' },
    plains:     { name:'해바라기 들판',    x:-300, y:-450, w:80, h:60, lvl:[3,12],  safe:false, bg:'map_plains' },
    meadow:     { name:'꽃잎 초원',       x:-150, y:-400, w:70, h:60, lvl:[5,15],  safe:false, bg:'map_plains' },
    // ── 중급 사냥터 (교역로 중간) ──
    swamp:      { name:'안개골 늪지',     x:50,   y:-350, w:70, h:70, lvl:[10,20], safe:false, bg:'map_forest' },
    desert:     { name:'붉은모래 사막',    x:200,  y:-350, w:80, h:70, lvl:[12,22], safe:false, bg:'map_plains' },
    cave:       { name:'수정 동굴',       x:-400, y:-200, w:70, h:70, lvl:[15,25], safe:false, bg:'map_dungeon' },
    ruins:      { name:'달그림자 유적',    x:-250, y:-200, w:70, h:60, lvl:[18,28], safe:false, bg:'map_dungeon' },
    coral:      { name:'산호초 해안',     x:400,  y:-250, w:60, h:60, lvl:[10,18], safe:false, bg:'map_plains' },
    // ── 고급 사냥터 ──
    volcano:    { name:'불꽃산',          x:150,  y:-150, w:80, h:70, lvl:[25,40], safe:false, bg:'map_dragon' },
    graveyard:  { name:'고요한 무덤',     x:-400, y:-50,  w:70, h:60, lvl:[28,38], safe:false, bg:'map_dungeon' },
    darkforest: { name:'그림자숲',        x:200,  y:-50,  w:70, h:70, lvl:[30,45], safe:false, bg:'map_forest' },
    glacier:    { name:'얼음 협곡',       x:-350, y:100,  w:70, h:60, lvl:[25,35], safe:false, bg:'map_dungeon' },
    // ── 최상급/보스 ──
    dragon:     { name:'용의 요람',       x:350,  y:150,  w:70, h:70, lvl:[35,99], safe:false, bg:'map_dragon' },
    abyss:      { name:'어둠의 심연',     x:-400, y:200,  w:80, h:70, lvl:[40,99], safe:false, bg:'map_chaos' },
    hell:       { name:'혼돈의 문',       x:-200, y:250,  w:70, h:70, lvl:[45,99], safe:false, bg:'map_chaos' },
    ancient:    { name:'태고의 숲',       x:100,  y:300,  w:80, h:70, lvl:[35,50], safe:false, bg:'map_forest' },
    // ── PK 존 ──
    chaos:      { name:'피의 골짜기',     x:100,  y:200,  w:80, h:70, lvl:[20,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    warzone:    { name:'전쟁의 벌판',     x:-100, y:350,  w:90, h:70, lvl:[15,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    // ── 특수 ──
    castle:     { name:'하늘의 성채',     x:0,    y:400,  w:80, h:70, lvl:[20,99], safe:false, bg:'map_dungeon', isCastle:true },
    arena:      { name:'투기장',          x:350,  y:350,  w:50, h:50, lvl:[10,99], safe:true,  bg:'map_dungeon', isArena:true },
    // ── 확장 맵: 동부 (x:500~1000) ──
    port_east:  { name:'동쪽 항구',       x:700,  y:-700, w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','항해사','힐러'] },
    mushroom:   { name:'버섯 골짜기',     x:600,  y:-500, w:80, h:70, lvl:[5,12],  safe:false, bg:'map_forest' },
    riverbank:  { name:'강변 평야',       x:800,  y:-300, w:80, h:60, lvl:[8,18],  safe:false, bg:'map_plains' },
    sandstorm:  { name:'모래폭풍 협곡',    x:600,  y:-100, w:80, h:70, lvl:[15,25], safe:false, bg:'map_plains' },
    sunken:     { name:'수몰 신전',       x:700,  y:100,  w:70, h:70, lvl:[20,30], safe:false, bg:'map_dungeon' },
    shadow:     { name:'그림자 영역',     x:800,  y:400,  w:70, h:70, lvl:[32,45], safe:false, bg:'map_chaos' },
    celestial:  { name:'천공의 정상',     x:700,  y:700,  w:80, h:80, lvl:[40,60], safe:false, bg:'map_dragon' },
    void_rift:  { name:'공허의 균열',     x:900,  y:900,  w:70, h:70, lvl:[50,99], safe:false, bg:'map_chaos' },
    fishing:    { name:'낚시 만',         x:900,  y:0,    w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_plains', npcs:['낚시꾼','상점'] },
    blood_arena:{ name:'피의 투기장',     x:500,  y:-800, w:70, h:70, lvl:[20,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    colosseum:  { name:'대투기장',        x:900,  y:-900, w:60, h:60, lvl:[15,99], safe:true,  bg:'map_dungeon', isArena:true },
    // ── 확장 맵: 서부 (x:-500~-1000) ──
    shrine:     { name:'신전 마을',       x:-800, y:200,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','대장장이','힐러','제작소'] },
    tundra:     { name:'얼어붙은 평원',    x:-700, y:-700, w:80, h:70, lvl:[1,8],   safe:false, bg:'map_plains' },
    crystal_mine:{ name:'수정 광산',      x:-800, y:-200, w:70, h:70, lvl:[18,28], safe:false, bg:'map_dungeon' },
    toxic_marsh:{ name:'독안개 습지',     x:-700, y:400,  w:80, h:70, lvl:[12,22], safe:false, bg:'map_forest' },
    haunted:    { name:'유령의 저택',     x:-600, y:600,  w:70, h:70, lvl:[22,35], safe:false, bg:'map_dungeon' },
    sky_ruins:  { name:'하늘 유적',       x:-800, y:700,  w:80, h:70, lvl:[30,45], safe:false, bg:'map_dungeon' },
    frozen_deep:{ name:'빙결 심연',       x:-600, y:-800, w:70, h:70, lvl:[35,50], safe:false, bg:'map_dungeon' },
    demon:      { name:'마왕성',          x:-800, y:900,  w:80, h:80, lvl:[45,60], safe:false, bg:'map_chaos' },
    lawless:    { name:'무법 황야',       x:-500, y:800,  w:80, h:70, lvl:[25,99], safe:false, bg:'map_chaos', noPKpenalty:true },
    // ── 확장 맵: 중앙 확장 ──
    bazaar:     { name:'사막 시장',       x:500,  y:500,  w:50, h:50, lvl:[1,99],  safe:true,  bg:'map_village', npcs:['상점','요리사','제작소'] },
    world_tree: { name:'세계수',          x:0,    y:800,  w:80, h:80, lvl:[50,99], safe:false, bg:'map_forest' },
    fortress:   { name:'북부 요새',       x:0,    y:-900, w:70, h:70, lvl:[25,99], safe:false, bg:'map_dungeon', isCastle:true },
    training:   { name:'훈련장',          x:-900, y:0,    w:60, h:60, lvl:[1,15],  safe:false, bg:'map_plains' },
    magma_core: { name:'용암 핵심부',     x:500,  y:300,  w:70, h:70, lvl:[28,42], safe:false, bg:'map_dragon' },
    // ── 신규 존 ──
    mist_vale:  { name:'안개의 골짜기',    x:-700, y:300,  w:60, h:60, lvl:[12,22], safe:false, bg:'map_forest' },
    obsidian:   { name:'흑요석 광산',      x:700,  y:-300, w:60, h:60, lvl:[22,35], safe:false, bg:'map_dungeon' },
    thunder:    { name:'뇌전 고원',        x:-200, y:-900, w:70, h:60, lvl:[30,45], safe:false, bg:'map_plains' },
};

// 존 분위기 텍스트 (진입 시 표시)
const ZONE_AMBIENCE = {
    aden:      '따스한 햇살이 내리쬐는 평화로운 마을. 대장장이의 망치 소리가 들린다.',
    harbor:    '짭짤한 바닷바람이 불어온다. 갈매기 울음소리와 파도 소리.',
    oasis:     '사막 한가운데 맑은 샘물. 야자수 그늘에서 잠시 쉬어가자.',
    mountain:  '구름 위의 산장. 저 멀리 드래곤 둥지가 보인다.',
    frontier:  '문명의 끝자락. 이곳을 넘어서면 위험한 전장이 펼쳐진다.',
    forest:    '이슬 맺힌 나뭇잎 사이로 햇살이 들어온다. 슬라임이 통통 튀어다닌다.',
    plains:    '끝없이 펼쳐진 해바라기 들판. 바람에 꽃이 출렁인다.',
    meadow:    '알록달록한 꽃들이 만발한 초원. 나비가 날아다닌다.',
    swamp:     '안개가 자욱하다. 발밑에서 꿀렁거리는 소리가 난다... 조심하자.',
    desert:    '뜨거운 모래바람이 분다. 신기루가 아른거린다.',
    cave:      '동굴 입구에서 차가운 바람이 불어온다. 수정이 희미하게 빛난다.',
    ruins:     '고대 문명의 흔적. 달빛 아래 그림자가 흔들린다.',
    coral:     '투명한 바닷물 아래 산호가 반짝인다. 물고기가 헤엄친다.',
    volcano:   '대지가 뜨겁다. 용암이 부글거리며 화염 기둥이 솟는다.',
    graveyard: '서늘한 기운이 감돈다. 저 멀리서 신음 소리가...',
    darkforest:'빛이 닿지 않는 어둠의 숲. 눈빛 같은 것이 스쳐간다.',
    glacier:   '매서운 바람이 뼈를 파고든다. 눈보라 속에서 무언가 움직인다.',
    dragon:    '하늘을 뒤덮는 거대한 날개 그림자. 드래곤의 울음소리가 대지를 뒤흔든다.',
    abyss:     '빛이 사라진 곳. 심연에서 올라오는 공포가 온몸을 감싼다.',
    hell:      '불길과 유황 냄새. 이곳에 오래 있으면 정신이 갈라진다.',
    ancient:   '거대한 고목들이 하늘을 가린다. 수천 년의 기운이 느껴진다.',
    chaos:     '광기가 넘치는 곳. 누구도 믿을 수 없다. PK 자유 구역.',
    warzone:   '전투의 함성이 끊이지 않는다. 여기서는 강한 자만 살아남는다.',
    castle:    '왕의 성채. 공성전의 흔적이 성벽에 새겨져 있다.',
    celestial: '구름 위로 솟은 신성한 정상. 빛의 기둥이 하늘로 뻗어있다.',
    void_rift: '현실과 공허의 경계. 차원이 찢어진 틈에서 무언가 엿보고 있다.',
    demon:     '마왕의 성. 어둠의 군단이 이곳을 지키고 있다.',
    world_tree:'생명의 근원. 세계수의 잎에서 빛의 입자가 흩날린다.',
    fishing:    '잔잔한 물결과 갈대. 낚시하기 좋은 평화로운 곳.',
    shrine:     '신성한 기운이 흐르는 고요한 마을. 종소리가 은은히 울린다.',
    bazaar:     '향신료와 보석의 향기. 상인들의 호객 소리가 가득하다.',
    // 확장 존
    mushroom:   '거대한 버섯들이 우산처럼 펼쳐져 있다. 포자가 공기 중에 떠다닌다.',
    riverbank:  '맑은 강물이 졸졸 흐른다. 강변에 물새들이 쉬고 있다.',
    sandstorm:  '모래바람이 시야를 가린다. 협곡 사이로 바람이 울부짖는다.',
    sunken:     '물에 잠긴 고대 신전. 벽면의 문양이 희미하게 빛나고 있다.',
    shadow:     '빛조차 삼키는 어둠. 그림자가 살아 움직이는 것 같다.',
    tundra:     '끝없는 설원. 발이 빠지는 눈 속에서 차가운 바람이 몰아친다.',
    training:   '연습용 허수아비가 줄지어 서 있다. 초보 전사들의 함성이 들린다.',
    toxic_marsh:'독안개가 코를 찌른다. 한 발짝 한 발짝이 위험하다.',
    crystal_mine:'수정이 천장에서 반짝인다. 곡괭이 소리가 메아리친다.',
    haunted:    '삐걱거리는 문. 벽에서 피가 스며나오는 것 같은 착각이...',
    sky_ruins:  '구름 위에 떠 있는 유적. 바람이 귓속말을 하는 것 같다.',
    frozen_deep:'빙하 아래 얼어붙은 세계. 수천 년 전의 생물이 얼음 속에 보인다.',
    blood_arena:'피가 마르지 않는 투기장. 관중의 함성 대신 비명만 가득하다.',
    lawless:    '법이 없는 황야. 여기서는 힘만이 정의다.',
    magma_core: '대지의 심장부. 용암이 맥박처럼 맥동한다. 열기가 숨을 막는다.',
    mist_vale:  '짙은 안개 속에 속삭임이 들린다. 발밑의 풀이 소리없이 흔들린다.',
    obsidian:   '검은 유리 같은 흑요석 절벽. 광부들의 망치 소리가 깊은 곳에서 울린다.',
    thunder:    '하늘에서 번개가 끝없이 내리친다. 전기가 공기를 가른다.',
    port_east:  '이국적인 향이 풍기는 동쪽 항구. 멀리서 배의 기적 소리.',
    colosseum:  '거대한 원형 투기장. 전설의 전사들이 여기서 싸웠다.',
    fortress:   '북방의 거대한 요새. 눈보라 속에서도 굳건히 서 있다.',
    world_tree: '세계의 중심. 거대한 나무에서 생명의 빛이 쏟아진다. 성스러운 기운.',
};

// 몬스터 도감 로어 (첫 처치 시 표시)
const MONSTER_LORE = {
    '숲 슬라임':'숲의 이슬이 모여 생명을 얻은 존재. 무해하지만 끈적끈적하다.',
    '야생토끼':'해바라기 들판에 서식하는 토끼. 놀라면 엄청 빠르다.',
    '꽃 요정':'꽃에서 태어난 작은 정령. 화가 나면 꽃가루를 뿌린다.',
    '독거미':'이슬숲 깊은 곳에 사는 독거미. 거미줄에 걸리면 위험하다.',
    '늑대':'들판의 포식자. 무리를 지어 사냥한다.',
    '독 두꺼비':'늪지대의 맹독 두꺼비. 독을 뿜으며 접근하면 안 된다.',
    '늪지 골렘':'늪의 진흙이 마력으로 뭉쳐진 존재. 느리지만 단단하다.',
    '전갈':'사막의 맹독 전갈. 꼬리의 독침 한 방은 치명적이다.',
    '모래 웜':'사막 지하에 서식하는 거대 지렁이. 진동에 반응해 튀어나온다.',
    '박쥐':'동굴 천장에 매달려 있다가 습격하는 야행성 생물.',
    '동굴 트롤':'수정 동굴을 지키는 거인. 돌을 던지며 침입자를 쫓는다.',
    '수정 골렘':'수정이 모여 만들어진 광물 생명체. 마법에 강하다.',
    '유령':'달그림자 유적을 떠도는 영혼. 물리 공격이 잘 통하지 않는다.',
    '가고일':'유적 위에 석상처럼 앉아있다가 기습하는 마물.',
    '화염 정령':'불꽃산에서 태어난 순수 화염 존재. 물에 약하다.',
    '용암 골렘':'용암이 굳어 만들어진 거인. 가까이 가면 화상을 입는다.',
    '좀비':'무덤에서 되살아난 시체. 느리지만 수가 많다.',
    '뱀파이어':'밤에만 나타나는 흡혈 귀족. 은에 약하다.',
    '그림자 늑대':'그림자숲의 야수. 어둠 속에서 눈만 빛난다.',
    '다크 엘프':'타락한 엘프 전사. 독 화살을 쏜다.',
    '와이번':'드래곤의 하위 종. 날개가 있지만 브레스는 못 쓴다.',
    '레드 드래곤':'용의 요람을 지키는 고대 드래곤. 브레스 한 방에 전멸 가능.',
    '고대 드래곤':'수천 년을 살아온 전설의 존재. 세계를 멸할 힘을 가졌다.',
    '태초의 존재':'세상이 만들어지기 전부터 존재한 신화적 생명체.',
    '보물 도깨비':'금화를 잔뜩 안고 도망치는 장난꾸러기. 잡으면 대박!',
    '심연의 그림자':'어둠의 심연에서 기어나온 형체 없는 공포.',
    '천사':'천공의 정상을 지키는 빛의 전사. 순수하지만 강하다.',
    '세라핌':'6개의 날개를 가진 상위 천사. 신성한 불꽃을 다룬다.',
    '하급 악마':'마왕성의 잡졸. 수는 많지만 약하다.',
    '악마 장군':'마왕의 오른팔. 어둠의 마법을 구사한다.',
    '보물 도깨비':'반짝이는 보물 주머니를 들고 도망치는 수상한 녀석.',
    // 확장 존 몬스터
    '독버섯':'포자를 뿌리는 맹독 버섯. 가까이 가면 환각을 본다.',
    '버섯 골렘':'버섯이 뭉쳐 만들어진 생명체. 의외로 단단하다.',
    '물고기 요정':'강에 사는 작은 정령. 물 밖에서는 약해진다.',
    '강 트롤':'강변에 사는 거인. 바위를 던져 물고기를 잡는다.',
    '수룡':'강의 수호자. 물속에서 엄청난 속도로 헤엄친다.',
    '눈토끼':'설원의 하얀 토끼. 추위에 강하고 발이 매우 빠르다.',
    '설인':'전설 속의 눈 괴물. 목격자는 많지만 생환자는 적다.',
    '먼지 요정':'모래 속에서 태어난 정령. 눈에 모래를 뿌린다.',
    '사막 전갈':'사막의 왕. 독침 한 방에 코끼리도 쓰러뜨린다.',
    '사막 거인':'모래 폭풍 속에 숨어 사는 거인. 발소리로 위치를 안다.',
    '광석 박쥐':'수정 광산에 사는 박쥐. 수정을 먹고 몸이 단단해졌다.',
    '보석 수호자':'광산의 보물을 지키는 골렘. 보석으로 이루어진 몸.',
    '미스릴 드래곤':'미스릴 비늘을 가진 희귀한 드래곤.',
    '물의 정령':'수몰 신전에서 깨어난 고대 정령. 물을 자유자재로 다룬다.',
    '해저 기사':'바다에 빠진 기사의 영혼. 녹슨 갑옷을 입고 있다.',
    '크라켄':'심해의 괴물. 촉수로 배를 부수고 사람을 집어삼킨다.',
    '폴터가이스트':'유령의 저택을 떠도는 장난꾸러기 유령.',
    '밤의 백작':'유령 저택의 주인. 밤에만 모습을 드러낸다.',
    '유령왕':'유령들의 왕. 저택 가장 깊은 곳에 숨어있다.',
    '마그마 슬라임':'용암으로 이루어진 슬라임. 만지면 화상을 입는다.',
    '화염 원소':'순수 화염 에너지가 응축된 존재.',
    '화산 거인':'용암 속에서 태어난 거인. 주먹 한 방에 대지가 갈라진다.',
    '하피':'하늘 유적에 사는 새 인간. 날카로운 발톱으로 공격한다.',
    '천공 기사':'하늘에서 추락한 기사. 빛의 검을 휘두른다.',
    '천둥 드래곤':'번개를 부르는 드래곤. 폭풍이 그의 날개짓이다.',
    '폭풍의 왕':'하늘을 지배하는 전설적 존재. 천둥과 번개의 화신.',
    '그림자 암살자':'어둠 속에서 기습하는 살인마. 소리 없이 다가온다.',
    '허무의 기사':'모든 것을 포기한 기사. 검에서 절망이 흘러나온다.',
    '그림자 군주':'그림자 영역의 지배자. 빛을 두려워한다.',
    '빙결 골렘':'영원한 얼음으로 만들어진 골렘. 녹지 않는다.',
    '프로스트 리치':'빙결 심연의 마법사. 모든 것을 얼린다.',
    '빙하의 여왕':'빙결 심연의 여왕. 눈보라가 그녀의 분노다.',
    '대천사장':'천공의 최고 사령관. 6개의 금빛 날개.',
    '하늘의 심판자':'신이 보낸 심판자. 정의의 불꽃을 다룬다.',
    '혼돈의 지배자':'마왕성의 진정한 주인. 현실을 뒤틀 수 있다.',
    '악마 장군':'마왕의 오른팔. 어둠의 군단을 이끈다.',
    '마왕':'모든 악의 근원. 세계를 어둠으로 뒤덮으려 한다.',
    '엔트 수호자':'세계수를 지키는 고대 나무 정령.',
    '세계수 정령':'생명의 근원에서 태어난 최상위 정령.',
    '생명의 어머니':'세계수 그 자체의 화신. 만물의 어머니.',
    '공허의 감시자':'차원의 틈을 지키는 존재. 침입자를 용납하지 않는다.',
    '차원 포식자':'차원 사이를 떠도는 괴물. 공간을 먹어치운다.',
    '광전사':'분노에 눈이 먼 전사. 아군도 적도 구분 못 한다.',
    '카오스 나이트':'혼돈에 빠진 기사. 이성을 잃었지만 강하다.',
    '혼돈의 용':'혼돈의 기운을 먹고 자란 변이 드래곤.',
    '용병 대장':'금화만 주면 누구든 죽이는 비정한 지휘관.',
    '전쟁 기계':'마법으로 움직이는 전쟁 병기. 파괴만이 목적이다.',
    '전장의 왕':'무법 지대의 왕. 가장 많이 죽인 자가 왕이다.',
    '투기장 챔피언':'피의 투기장 무패 전적의 전설.',
    '피의 군주':'피로 힘을 얻는 뱀파이어 군주.',
};

// ══════════════════════════════════════
// 맵 동선 시스템 — 존 연결 + 지형 장벽 + 도로
// ══════════════════════════════════════

// 존 연결 그래프 (이웃한 존끼리만 이동 가능, 레벨 게이트 포함)
const ZONE_CONNECTIONS = {
    // ── 서쪽 대륙 (초보~중급) ──
    aden:     ['forest','plains','tundra'],           // 시작 마을 → 초보 사냥터
    forest:   ['aden','plains','cave'],               // 숲 → 마을, 들판, 동굴
    plains:   ['aden','forest','meadow','harbor'],    // 들판 → 넓은 연결
    meadow:   ['plains','swamp','oasis'],             // 초원 → 중급 진입
    tundra:   ['aden','frozen_deep','training'],      // 극서 초보
    training: ['tundra','shrine','crystal_mine'],     // 훈련장 → 서쪽 마을

    // ── 중앙 대륙 (중급) ──
    oasis:    ['meadow','ruins','volcano','warzone'], // 중앙 마을 허브
    swamp:    ['meadow','desert','cave'],             // 늪 → 사막/동굴
    desert:   ['swamp','harbor','coral'],             // 사막 → 항구
    harbor:   ['plains','desert','coral','mushroom'], // 동쪽 관문
    cave:     ['forest','swamp','graveyard','crystal_mine'], // 던전 루트
    ruins:    ['oasis','graveyard','volcano'],        // 유적 → 고급 진입
    coral:    ['desert','harbor','riverbank'],        // 해안 → 동쪽

    // ── 서쪽 대륙 (고급) ──
    shrine:       ['training','crystal_mine','toxic_marsh','glacier'],
    crystal_mine: ['training','cave','shrine'],
    graveyard:    ['cave','ruins','glacier','abyss'],
    glacier:      ['shrine','graveyard','abyss'],
    abyss:        ['graveyard','glacier','hell'],
    hell:         ['abyss','warzone','demon'],
    toxic_marsh:  ['shrine','haunted','lawless'],
    haunted:      ['toxic_marsh','sky_ruins'],
    sky_ruins:    ['haunted','demon'],
    frozen_deep:  ['tundra','fortress'],
    demon:        ['hell','sky_ruins','world_tree'],

    // ── 중앙 고급 ──
    volcano:    ['ruins','oasis','darkforest','magma_core'],
    darkforest: ['volcano','dragon','chaos','ancient'],
    dragon:     ['darkforest','mountain','shadow'],
    ancient:    ['darkforest','chaos','castle','world_tree'],
    chaos:      ['ancient','darkforest','warzone'],
    warzone:    ['oasis','chaos','hell','frontier','castle'],
    castle:     ['warzone','ancient','world_tree'],
    frontier:   ['warzone','lawless'],
    mountain:   ['dragon','sunken','bazaar'],

    // ── 동쪽 대륙 ──
    mushroom:   ['harbor','riverbank','port_east'],
    port_east:  ['mushroom','colosseum','blood_arena'],
    riverbank:  ['mushroom','coral','sandstorm','fishing'],
    sandstorm:  ['riverbank','sunken','magma_core'],
    fishing:    ['riverbank','sunken'],
    sunken:     ['sandstorm','mountain','fishing','shadow'],
    shadow:     ['dragon','sunken','celestial'],
    celestial:  ['shadow','bazaar','void_rift'],
    void_rift:  ['celestial'],
    blood_arena:['port_east','colosseum'],
    colosseum:  ['port_east','blood_arena','fortress'],
    magma_core: ['volcano','sandstorm','bazaar'],
    bazaar:     ['magma_core','celestial','mountain','arena'],
    arena:      ['bazaar'],

    // ── 최종 ──
    lawless:    ['frontier','toxic_marsh','world_tree'],
    world_tree: ['castle','demon','lawless'],
    fortress:   ['frozen_deep','colosseum'],
};

// 지형 장벽 (산맥/강/바다/절벽 — 이동 불가, 동선을 자연스럽게 유도)
const TERRAIN_BARRIERS = [
    // ── 서쪽 대산맥 (초보→고급 경계, 동굴/광산 입구로만 통과) ──
    { x:-470, y:-350, w:35, h:100, type:'mountain', name:'북서 산맥' },
    { x:-470, y:-150, w:35, h:80,  type:'mountain', name:'서쪽 산등성이' },
    { x:-470, y:0,    w:35, h:100, type:'mountain', name:'서쪽 절벽' },
    { x:-470, y:150,  w:35, h:80,  type:'mountain', name:'남서 산맥' },
    // ── 동쪽 바다 (항구→동대륙, 배/항해사로만 이동) ──
    { x:440, y:-700, w:50, h:120, type:'water', name:'북해' },
    { x:460, y:-500, w:40, h:180, type:'water', name:'동해 북부' },
    { x:470, y:-250, w:30, h:100, type:'water', name:'동해 중부' },
    { x:460, y:-100, w:40, h:150, type:'water', name:'동해 남부' },
    // ── 중앙 대하 (강 — 다리 위치에서만 건너기) ──
    { x:-200, y:-280, w:300, h:20, type:'water', name:'은빛 강 서쪽' },
    { x:150,  y:-280, w:200, h:20, type:'water', name:'은빛 강 동쪽' },
    // ── 용암 지대 (중급→고급 경계) ──
    { x:30,   y:-120, w:100, h:25, type:'lava', name:'용암 강' },
    { x:180,  y:-90,  w:80,  h:25, type:'lava', name:'용암 삼각주' },
    // ── 북쪽 빙하 (최상급 존 경계, 빙결 심연으로만 진입) ──
    { x:-650, y:-760, w:200, h:25, type:'ice', name:'영원의 빙벽 서' },
    { x:-350, y:-760, w:200, h:25, type:'ice', name:'영원의 빙벽 중' },
    { x:-50,  y:-820, w:200, h:25, type:'ice', name:'영원의 빙벽 동' },
    // ── 남쪽 혼돈 장벽 (엔드게임 존 경계) ──
    { x:-300, y:680, w:150, h:25, type:'chaos', name:'혼돈의 균열 서' },
    { x:0,    y:720, w:200, h:25, type:'chaos', name:'혼돈의 균열 중' },
    { x:300,  y:680, w:150, h:25, type:'chaos', name:'혼돈의 균열 동' },
    // ── 숲 밀림 (시야 제한 구간, 통과 가능하지만 속도 -30%) ──
    { x:-450, y:-420, w:20, h:60, type:'forest_wall', name:'울창한 수풀 1' },
    { x:170,  y:-70,  w:20, h:60, type:'forest_wall', name:'울창한 수풀 2' },
    // ── 동대륙 산맥 ──
    { x:650, y:-200, w:30, h:200, type:'mountain', name:'동쪽 산맥 남' },
    { x:650, y:100,  w:30, h:200, type:'mountain', name:'동쪽 산맥 북' },
    // ── 남쪽 늪지대 ──
    { x:-650, y:350, w:80, h:25, type:'swamp_wall', name:'깊은 늪' },
];

// 도로 (존 사이 안전 통로, 금색 표시, 이동속도 +20%, 몬스터 없음)
const ROADS = [
    // ── 서쪽 대륙 도로 (초보 루트) ──
    { from:'aden', to:'forest',  path:[{x:-490,y:-470},{x:-450,y:-430},{x:-430,y:-400}], name:'숲길' },
    { from:'aden', to:'plains',  path:[{x:-470,y:-490},{x:-380,y:-480},{x:-320,y:-460}], name:'들판길' },
    { from:'forest', to:'cave',  path:[{x:-410,y:-370},{x:-400,y:-300},{x:-400,y:-230}], name:'동굴 입구' },
    { from:'plains', to:'meadow', path:[{x:-260,y:-440},{x:-200,y:-420},{x:-160,y:-400}], name:'초원길' },
    // ── 대 교역로 (서→동 관통, 가장 긴 도로) ──
    { from:'plains', to:'harbor', path:[{x:-260,y:-445},{x:-100,y:-440},{x:50,y:-430},{x:200,y:-435},{x:320,y:-440}], name:'대교역로' },
    { from:'harbor', to:'mushroom', path:[{x:370,y:-440},{x:500,y:-460},{x:580,y:-490}], name:'동쪽 교역로' },
    // ── 중앙 도로 ──
    { from:'meadow', to:'oasis', path:[{x:-130,y:-380},{x:-110,y:-200},{x:-100,y:-30},{x:-90,y:10}], name:'오아시스 도로' },
    { from:'oasis', to:'ruins',  path:[{x:-80,y:20},{x:-150,y:-50},{x:-230,y:-180}], name:'유적 탐험로' },
    { from:'oasis', to:'volcano', path:[{x:-70,y:10},{x:0,y:-40},{x:80,y:-100},{x:150,y:-140}], name:'화산 등반로' },
    { from:'ruins', to:'volcano', path:[{x:-220,y:-180},{x:-100,y:-170},{x:50,y:-160},{x:150,y:-150}], name:'화산 우회로' },
    // ── 고급 존 도로 ──
    { from:'volcano', to:'darkforest', path:[{x:190,y:-130},{x:200,y:-80},{x:210,y:-50}], name:'그림자 산길' },
    { from:'darkforest', to:'dragon', path:[{x:230,y:-40},{x:280,y:50},{x:340,y:140}], name:'용의 길' },
    { from:'cave', to:'graveyard', path:[{x:-400,y:-170},{x:-400,y:-100},{x:-400,y:-50}], name:'지하 통로' },
    // ── 남쪽 위험 도로 (PK존 연결) ──
    { from:'frontier', to:'warzone', path:[{x:-280,y:360},{x:-200,y:360},{x:-120,y:360}], name:'전쟁 가도' },
    { from:'warzone', to:'castle', path:[{x:-80,y:360},{x:-30,y:380},{x:10,y:400}], name:'공성 진입로' },
    // ── 동대륙 도로 ──
    { from:'riverbank', to:'sandstorm', path:[{x:800,y:-270},{x:750,y:-200},{x:650,y:-100}], name:'사막 도로' },
    { from:'sandstorm', to:'sunken', path:[{x:640,y:-60},{x:670,y:30},{x:700,y:100}], name:'신전 참배길' },
    { from:'sunken', to:'shadow', path:[{x:730,y:140},{x:770,y:250},{x:800,y:370}], name:'그림자 계곡길' },
    // ── 최종 존 도로 ──
    { from:'shadow', to:'celestial', path:[{x:810,y:430},{x:770,y:550},{x:730,y:670}], name:'천공의 계단' },
    { from:'celestial', to:'void_rift', path:[{x:750,y:740},{x:800,y:800},{x:860,y:870}], name:'차원의 통로' },
    // ── 마을 간 연결 도로 ──
    { from:'shrine', to:'training', path:[{x:-810,y:210},{x:-850,y:100},{x:-880,y:20}], name:'서쪽 마을길' },
    { from:'mountain', to:'bazaar', path:[{x:320,y:120},{x:380,y:250},{x:450,y:400},{x:490,y:490}], name:'상인의 길' },
];

const ZONE_MONSTERS = {
    // 초보: 노말 위주
    forest:    { tiers:{ normal:80, elite:15, rare:5 },  expBonus:0, goldBonus:0 },
    plains:    { tiers:{ normal:75, elite:20, rare:5 },  expBonus:0, goldBonus:0 },
    meadow:    { tiers:{ normal:70, elite:25, rare:5 },  expBonus:0, goldBonus:0 },
    // 중급: 엘리트 혼합
    swamp:     { tiers:{ normal:40, elite:45, rare:15 }, expBonus:0.1, goldBonus:0 },
    desert:    { tiers:{ normal:35, elite:45, rare:18, boss:2 }, expBonus:0.1, goldBonus:0.1 },
    cave:      { tiers:{ normal:20, elite:40, rare:30, boss:10 }, expBonus:0.3, goldBonus:0 },
    ruins:     { tiers:{ normal:20, elite:35, rare:35, boss:10 }, expBonus:0.2, goldBonus:0.1 },
    coral:     { tiers:{ normal:50, elite:35, rare:15 }, expBonus:0, goldBonus:0.1 },
    // 고급: 레어+보스
    volcano:   { tiers:{ elite:30, rare:50, boss:20 }, expBonus:0.2, goldBonus:0.2 },
    graveyard: { tiers:{ elite:25, rare:50, boss:25 }, expBonus:0.15, goldBonus:0.15 },
    darkforest:{ tiers:{ elite:20, rare:45, boss:35 }, expBonus:0.25, goldBonus:0.2 },
    glacier:   { tiers:{ elite:30, rare:45, boss:25 }, expBonus:0.2, goldBonus:0.15 },
    // 최상급: 보스 다수
    dragon:    { tiers:{ rare:25, boss:60, legendary:15 }, expBonus:0.3, goldBonus:0.5 },
    abyss:     { tiers:{ rare:20, boss:60, legendary:20 }, expBonus:0.4, goldBonus:0.3 },
    hell:      { tiers:{ rare:15, boss:60, legendary:25 }, expBonus:0.5, goldBonus:0.4 },
    ancient:   { tiers:{ rare:30, boss:55, legendary:15 }, expBonus:0.35, goldBonus:0.3 },
    // PK존: 모든 등급 강화
    chaos:     { tiers:{ elite:20, rare:40, boss:40 }, expBonus:0.4, goldBonus:0.4 },
    warzone:   { tiers:{ elite:30, rare:40, boss:30 }, expBonus:0.3, goldBonus:0.3 },
    // 확장 존
    mushroom:    { tiers:{ normal:70, elite:25, rare:5 },  expBonus:0, goldBonus:0 },
    riverbank:   { tiers:{ normal:55, elite:35, rare:10 }, expBonus:0.05, goldBonus:0.05 },
    tundra:      { tiers:{ normal:85, elite:15 },          expBonus:0, goldBonus:0 },
    training:    { tiers:{ normal:90, elite:10 },          expBonus:0.1, goldBonus:0 },
    toxic_marsh: { tiers:{ normal:35, elite:45, rare:20 }, expBonus:0.15, goldBonus:0.1 },
    sandstorm:   { tiers:{ normal:25, elite:40, rare:30, boss:5 }, expBonus:0.2, goldBonus:0.15 },
    crystal_mine:{ tiers:{ normal:20, elite:35, rare:35, boss:10 }, expBonus:0.25, goldBonus:0.2 },
    sunken:      { tiers:{ elite:30, rare:45, boss:25 }, expBonus:0.25, goldBonus:0.2 },
    haunted:     { tiers:{ elite:25, rare:45, boss:30 }, expBonus:0.2, goldBonus:0.2 },
    magma_core:  { tiers:{ elite:15, rare:50, boss:35 }, expBonus:0.3, goldBonus:0.25 },
    sky_ruins:   { tiers:{ elite:10, rare:45, boss:40, legendary:5 }, expBonus:0.35, goldBonus:0.3 },
    shadow:      { tiers:{ rare:35, boss:50, legendary:15 }, expBonus:0.4, goldBonus:0.35 },
    frozen_deep: { tiers:{ rare:30, boss:50, legendary:20 }, expBonus:0.4, goldBonus:0.3 },
    celestial:   { tiers:{ rare:20, boss:45, legendary:30, mythic:5 }, expBonus:0.5, goldBonus:0.5 },
    demon:       { tiers:{ rare:15, boss:40, legendary:35, mythic:10 }, expBonus:0.6, goldBonus:0.5 },
    world_tree:  { tiers:{ boss:30, legendary:40, mythic:30 }, expBonus:0.7, goldBonus:0.6 },
    void_rift:   { tiers:{ boss:25, legendary:35, mythic:40 }, expBonus:0.8, goldBonus:0.7 },
    blood_arena: { tiers:{ elite:20, rare:35, boss:35, legendary:10 }, expBonus:0.5, goldBonus:0.5 },
    lawless:     { tiers:{ elite:25, rare:40, boss:30, legendary:5 }, expBonus:0.4, goldBonus:0.4 },
    // ── 신규 존 몬스터 배치 ──
    mist_vale:   { tiers:{ normal:45, elite:35, rare:18, boss:2 }, expBonus:0.1, goldBonus:0.05 },
    obsidian:    { tiers:{ elite:30, rare:45, boss:20, legendary:5 }, expBonus:0.25, goldBonus:0.3 },
    thunder:     { tiers:{ elite:20, rare:45, boss:30, legendary:5 }, expBonus:0.3, goldBonus:0.2 },
};

const ZONE_MONSTER_NAMES = {
    forest:     { normal:'숲 슬라임', elite:'독거미' },
    plains:     { normal:'야생토끼', elite:'늑대' },
    meadow:     { normal:'꽃 요정', elite:'꿀벌 여왕' },
    swamp:      { normal:'독 두꺼비', elite:'늪지 골렘', rare:'해골 기사' },
    desert:     { normal:'전갈', elite:'모래 웜', rare:'사막 미라' },
    cave:       { normal:'박쥐', elite:'동굴 트롤', rare:'수정 골렘', boss:'동굴 보스' },
    ruins:      { normal:'유령', elite:'가고일', rare:'리치', boss:'고대 수호자' },
    volcano:    { elite:'화염 정령', rare:'용암 골렘', boss:'불의 드래곤' },
    graveyard:  { elite:'좀비', rare:'뱀파이어', boss:'데스나이트' },
    darkforest: { elite:'그림자 늑대', rare:'다크 엘프', boss:'숲의 군주' },
    glacier:    { elite:'얼음 골렘', rare:'프로스트 위치', boss:'빙룡' },
    dragon:     { rare:'와이번', boss:'레드 드래곤', legendary:'고대 드래곤' },
    abyss:      { rare:'심연의 그림자', boss:'암흑 군주', legendary:'심연의 왕' },
    hell:       { rare:'악마', boss:'지옥의 문지기', legendary:'대마왕' },
    ancient:    { rare:'트렌트', boss:'고대 엔트', legendary:'세계수 수호자' },
    chaos:      { elite:'광전사', rare:'카오스 나이트', boss:'혼돈의 용' },
    warzone:    { elite:'용병 대장', rare:'전쟁 기계', boss:'전장의 왕' },
    // 확장 존
    mushroom:    { normal:'독버섯', elite:'버섯 골렘' },
    riverbank:   { normal:'물고기 요정', elite:'강 트롤', rare:'수룡' },
    tundra:      { normal:'눈토끼', elite:'설인' },
    training:    { normal:'허수아비', elite:'훈련용 골렘' },
    toxic_marsh: { normal:'독두꺼비', elite:'독안개 정령', rare:'늪지 히드라' },
    sandstorm:   { normal:'먼지 요정', elite:'사막 전갈', rare:'사막 거인', boss:'모래폭풍 워름' },
    crystal_mine:{ normal:'광석 박쥐', elite:'수정 골렘', rare:'보석 수호자', boss:'미스릴 드래곤' },
    sunken:      { elite:'물의 정령', rare:'해저 기사', boss:'크라켄' },
    haunted:     { elite:'폴터가이스트', rare:'밤의 백작', boss:'유령왕' },
    magma_core:  { elite:'마그마 슬라임', rare:'화염 원소', boss:'화산 거인' },
    sky_ruins:   { elite:'하피', rare:'천공 기사', boss:'천둥 드래곤', legendary:'폭풍의 왕' },
    shadow:      { rare:'그림자 암살자', boss:'허무의 기사', legendary:'그림자 군주' },
    frozen_deep: { rare:'빙결 골렘', boss:'프로스트 리치', legendary:'빙하의 여왕' },
    celestial:   { rare:'천사', boss:'세라핌', legendary:'대천사장', mythic:'하늘의 심판자' },
    demon:       { rare:'하급 악마', boss:'악마 장군', legendary:'마왕', mythic:'혼돈의 지배자' },
    world_tree:  { boss:'엔트 수호자', legendary:'세계수 정령', mythic:'생명의 어머니' },
    void_rift:   { boss:'공허의 감시자', legendary:'차원 포식자', mythic:'태초의 존재' },
    blood_arena: { elite:'광전사', rare:'피의 기사', boss:'투기장 챔피언', legendary:'피의 군주' },
    lawless:     { elite:'도적 대장', rare:'현상금 사냥꾼', boss:'무법자 왕' },
    // ── 신규 존 몬스터 이름 ──
    mist_vale:   { normal:'안개 정령', elite:'유령 늑대', rare:'안개 마녀', boss:'골짜기의 군주' },
    obsidian:    { elite:'흑요석 골렘', rare:'심연 광부', boss:'어둠의 제련사', legendary:'흑요석 거인' },
    thunder:     { elite:'번개 정령', rare:'폭풍 매', boss:'뇌전 거인', legendary:'번개의 왕' },
};

module.exports = {
    ZONES,
    ZONE_AMBIENCE,
    MONSTER_LORE,
    ZONE_CONNECTIONS,
    TERRAIN_BARRIERS,
    ROADS,
    ZONE_MONSTERS,
    ZONE_MONSTER_NAMES,
};
