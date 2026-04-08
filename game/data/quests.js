// 퀘스트/스킬/전직 데이터 — v1.40 Phase 4 추출
// server.js → game/data/quests.js (함수 종속성 0)
// 포함: QUESTS, SKILLS, CLASS_ADVANCE

const QUESTS = {
    // ── 일일 퀘스트 (매일 초기화) ──
    daily_hunt:    { name:'일일 사냥', desc:'몬스터 50마리 처치', target:'kill_monster', goal:50, reward:{gold:200,exp:500}, type:'daily', minLevel:5 },
    daily_elite:   { name:'필드 보스', desc:'엘리트 이상 몬스터 3마리', target:'kill_elite', goal:3, reward:{gold:500,exp:800}, type:'daily', minLevel:15 },
    daily_gold:    { name:'골드 수집', desc:'골드 500 획득', target:'earn_gold', goal:500, reward:{gold:200,exp:300}, type:'daily', minLevel:5 },
    daily_pvp:     { name:'PvP 도전', desc:'PvP 3회 참여', target:'pvp_fight', goal:3, reward:{gold:300,exp:400}, type:'daily', minLevel:10 },
    // ── 주간 퀘스트 (매주 초기화) ──
    weekly_boss:   { name:'보스 레이드', desc:'보스 5회 처치', target:'kill_boss', goal:5, reward:{gold:5000,exp:8000,diamonds:30}, type:'weekly', minLevel:20 },
    weekly_guild:  { name:'길드 미션', desc:'길드 던전 2회 클리어', target:'dungeon_clear', goal:2, reward:{gold:3000,exp:5000}, type:'weekly', minLevel:15 },
    weekly_pvp:    { name:'PvP 전적', desc:'PvP 20승', target:'pvp_win', goal:20, reward:{gold:2000,exp:3000,diamonds:20}, type:'weekly', minLevel:15 },
    weekly_trade:  { name:'교역 달인', desc:'교역 10회', target:'trade_count', goal:10, reward:{gold:3000,exp:2000}, type:'weekly', minLevel:10 },
    // ── 메인 퀘스트 (1회) ──
    main_hunt1:    { name:'첫 번째 사냥', desc:'슬라임 5마리 처치', target:'kill_monster', goal:5, reward:{gold:100,exp:200}, type:'main', minLevel:1 },
    main_lv5:      { name:'성장의 시작', desc:'레벨 5 달성', target:'reach_level', goal:5, reward:{gold:500,diamonds:30}, type:'main' },
    main_lv10:     { name:'전사의 길', desc:'레벨 10 달성', target:'reach_level', goal:10, reward:{gold:1000,diamonds:50}, type:'main' },
    main_orc:      { name:'오크의 위협', desc:'오크전사(엘리트) 10마리 처치', target:'kill_elite', goal:10, reward:{gold:500,diamonds:20}, type:'main', minLevel:10 },
    main_lv20:     { name:'영웅의 각성', desc:'레벨 20 달성', target:'reach_level', goal:20, reward:{gold:3000,diamonds:100}, type:'main' },
    main_dungeon:  { name:'어둠의 동굴', desc:'던전 클리어', target:'dungeon_clear', goal:1, reward:{gold:2000,diamonds:50}, type:'main', minLevel:15 },
    main_lv30:     { name:'전설의 시작', desc:'레벨 30 달성', target:'reach_level', goal:30, reward:{gold:5000,diamonds:150}, type:'main' },
    main_boss:     { name:'드래곤 토벌', desc:'보스 몬스터 처치', target:'kill_boss', goal:1, reward:{gold:5000,diamonds:80}, type:'main' },
    main_pvp:      { name:'PvP 입문', desc:'PvP 모드로 전환', target:'toggle_pvp', goal:1, reward:{gold:1000,diamonds:30}, type:'main' },
    main_army:     { name:'군단장', desc:'용병 10명 보유', target:'army_count', goal:10, reward:{gold:2000,diamonds:50}, type:'main' },
    // ── 업적 (1회, 특별 보상) ──
    // ── 업적 (30종) ──
    ach_first_pk:    { name:'피의 세례', desc:'다른 유저 첫 처치', target:'pvp_win', goal:1, reward:{gold:500}, type:'achievement' },
    ach_pk10:        { name:'헌터', desc:'PvP 10승', target:'pvp_win', goal:10, reward:{gold:2000,diamonds:30}, type:'achievement' },
    ach_pk100:       { name:'학살자', desc:'PvP 100승', target:'pvp_win', goal:100, reward:{gold:10000,diamonds:100}, type:'achievement' },
    ach_kill100:     { name:'사냥꾼', desc:'몬스터 100 처치', target:'kill_monster', goal:100, reward:{gold:500}, type:'achievement' },
    ach_kill1000:    { name:'전투 전문가', desc:'몬스터 1,000 처치', target:'kill_monster', goal:1000, reward:{gold:3000,diamonds:50}, type:'achievement' },
    ach_kill10000:   { name:'전설의 사냥꾼', desc:'몬스터 10,000 처치', target:'kill_monster', goal:10000, reward:{gold:20000,diamonds:300}, type:'achievement' },
    ach_elite100:    { name:'엘리트 헌터', desc:'엘리트+ 100 처치', target:'kill_elite', goal:100, reward:{gold:5000,diamonds:80}, type:'achievement' },
    ach_boss10:      { name:'보스 사냥꾼', desc:'보스 10 처치', target:'kill_boss', goal:10, reward:{gold:3000,diamonds:50}, type:'achievement' },
    ach_dragon100:   { name:'드래곤 슬레이어', desc:'보스 100 처치', target:'kill_boss', goal:100, reward:{gold:10000,diamonds:200}, type:'achievement' },
    ach_millionaire: { name:'백만장자', desc:'골드 1,000,000 보유', target:'total_gold', goal:1000000, reward:{diamonds:500}, type:'achievement' },
    ach_dungeon5:    { name:'던전 탐험가', desc:'던전 5회 클리어', target:'dungeon_clear', goal:5, reward:{gold:3000,diamonds:30}, type:'achievement' },
    ach_dungeon20:   { name:'던전 마스터', desc:'던전 20회 클리어', target:'dungeon_clear', goal:20, reward:{gold:10000,diamonds:100}, type:'achievement' },
    ach_tower30:     { name:'탑 정복자', desc:'무한의 탑 30층', target:'reach_level', goal:30, reward:{gold:5000,diamonds:50}, type:'achievement' },
    ach_trade50:     { name:'상인', desc:'교역 50회', target:'trade_count', goal:50, reward:{gold:5000}, type:'achievement' },
    ach_craft30:     { name:'장인', desc:'제작 30회', target:'craft_count', goal:30, reward:{gold:3000,diamonds:30}, type:'achievement' },
    ach_fish50:      { name:'낚시왕', desc:'물고기 50마리', target:'fish_catch', goal:50, reward:{gold:2000,diamonds:20}, type:'achievement' },
    ach_explore25:   { name:'모험가', desc:'25개 존 탐험', target:'explore_count', goal:25, reward:{gold:2000,diamonds:50}, type:'achievement' },
    ach_explore50:   { name:'세계 여행자', desc:'50개 존 탐험', target:'explore_count', goal:50, reward:{gold:10000,diamonds:200}, type:'achievement' },
    ach_prestige:    { name:'불사', desc:'첫 환생', target:'prestige_count', goal:1, reward:{gold:5000,diamonds:100}, type:'achievement' },
    ach_prestige5:   { name:'전설의 귀환', desc:'5차 환생', target:'prestige_count', goal:5, reward:{gold:30000,diamonds:500}, type:'achievement' },
    ach_streak20:    { name:'연쇄 살인마', desc:'20킬 스트릭', target:'kill_streak', goal:20, reward:{gold:3000}, type:'achievement' },
    ach_arena_gold:  { name:'투기장 골드', desc:'아레나 골드 티어', target:'arena_tier', goal:1300, reward:{gold:5000,diamonds:80}, type:'achievement' },
    ach_arena_diamond:{ name:'투기장 다이아', desc:'아레나 다이아 티어', target:'arena_tier', goal:1800, reward:{gold:20000,diamonds:300}, type:'achievement' },
    ach_guild_raid:  { name:'레이드 히어로', desc:'길드 레이드 클리어', target:'guild_raid', goal:1, reward:{gold:3000,diamonds:50}, type:'achievement' },
    ach_rune_word:   { name:'룬 마스터', desc:'첫 룬 워드 발동', target:'rune_word', goal:1, reward:{gold:2000,diamonds:30}, type:'achievement' },
    ach_tame10:      { name:'조련사', desc:'몬스터 10마리 테이밍', target:'tame_count', goal:10, reward:{gold:2000}, type:'achievement' },
    ach_enchant10:   { name:'강화 도사', desc:'강화 +10 달성', target:'enchant_level', goal:10, reward:{gold:5000,diamonds:50}, type:'achievement' },
    ach_set_bonus:   { name:'세트 수집가', desc:'세트 보너스 2개 이상', target:'set_bonus', goal:2, reward:{gold:5000,diamonds:80}, type:'achievement' },
    ach_weather_all: { name:'기상 관측자', desc:'5가지 날씨 모두 경험', target:'weather_count', goal:5, reward:{gold:1000}, type:'achievement' },
    ach_faction:     { name:'진영 전사', desc:'진영 기여도 500', target:'faction_rep', goal:500, reward:{gold:5000,diamonds:100}, type:'achievement' },
    // ── 신규 업적 10종 (v1.7) ──
    ach_healer:      { name:'치유의 손길', desc:'클레릭으로 레벨 20 도달', target:'reach_level', goal:20, reward:{gold:3000,diamonds:50}, type:'achievement' },
    ach_speed_run:   { name:'스피드러너', desc:'레벨 30 2시간 내 달성', target:'reach_level', goal:30, reward:{gold:5000,diamonds:100}, type:'achievement' },
    ach_collector:   { name:'수집가', desc:'펫 5종 보유', target:'pet_count', goal:5, reward:{gold:5000,diamonds:100}, type:'achievement' },
    ach_evolve:      { name:'진화의 증인', desc:'펫 진화 1회', target:'pet_evolve', goal:1, reward:{gold:3000,diamonds:50}, type:'achievement' },
    ach_world_boss:  { name:'월드 보스 처단자', desc:'월드 보스 10회 처치', target:'worldboss_kill', goal:10, reward:{gold:15000,diamonds:200}, type:'achievement' },
    ach_mvp:         { name:'MVP', desc:'월드 보스 MVP 5회', target:'worldboss_mvp', goal:5, reward:{gold:20000,diamonds:300}, type:'achievement' },
    ach_golden_rain: { name:'행운의 아이', desc:'황금 비 이벤트 중 100킬', target:'golden_rain_kills', goal:100, reward:{gold:5000,diamonds:80}, type:'achievement' },
    ach_marathon:    { name:'마라톤', desc:'누적 100시간 플레이', target:'playtime', goal:360000, reward:{gold:10000,diamonds:200}, type:'achievement' },
    ach_lucky:       { name:'행운의 손', desc:'행운의 룰렛 30회', target:'lucky_spin', goal:30, reward:{gold:3000,diamonds:50}, type:'achievement' },
    ach_weekly_all:  { name:'주간 챔피언', desc:'모든 주간 챌린지 완료', target:'weekly_all', goal:5, reward:{gold:20000,diamonds:300}, type:'achievement' },
    // ── v1.14 신규 업적 (v1.9~v1.13 컨텐츠 연계) ──
    ach_storm_giant:    { name:'폭풍 정복자',   desc:'폭풍의 거인 처치',     target:'worldboss_kill', goal:1, reward:{gold:10000,diamonds:150}, type:'achievement' },
    ach_alchemist:      { name:'연금술사',      desc:'엘릭서 10회 제작',      target:'craft_count',    goal:10, reward:{gold:5000,diamonds:80},  type:'achievement' },
    ach_shadow_clear:   { name:'그림자 정복자', desc:'그림자 미궁 클리어',    target:'dungeon_clear',  goal:1, reward:{gold:8000,diamonds:120}, type:'achievement' },
    ach_legendary_pet:  { name:'전설의 동반자', desc:'전설급 펫 진화 1회',    target:'pet_evolve',     goal:1, reward:{gold:6000,diamonds:100}, type:'achievement' },
    ach_exotic_trader:  { name:'이국의 상인',   desc:'사치품 교역 5회',       target:'trade_count',    goal:5, reward:{gold:4000,diamonds:60},  type:'achievement' },
};

const SKILLS = {
    Assassin: [
        { name:'그림자 일격', type:'active', dmgMulti:3.0, cooldown:5, range:3, aoe:false, level:1, mpCost:20, critBonus:true },
        { name:'독 바르기', type:'passive', level:5, poisonDot:15, poisonDuration:3 },
        { name:'은신', type:'active', cooldown:15, duration:5, level:10, mpCost:30, buff:true, stealth:true, nextAtkMulti:2.0 },
        { name:'연속 베기', type:'active', dmgMulti:1.5, hits:4, cooldown:8, range:2, aoe:false, level:15, mpCost:25 },
        { name:'암살', type:'ultimate', dmgMulti:8.0, cooldown:60, range:2, aoe:false, level:25, mpCost:80, executeThreshold:0.3 },
        // v1.15 각성기
        { name:'천 개의 칼날', type:'ultimate', dmgMulti:3.5, hits:7, cooldown:150, range:3, aoe:true, level:40, mpCost:200, critBonus:true },
    ],
    Warrior: [
        { name:'파워 스트라이크', type:'active', dmgMulti:2.5, cooldown:4, range:4, aoe:false, level:1, mpCost:15, knockback:true },
        { name:'전투 함성', type:'active', cooldown:20, duration:10, range:6, level:5, mpCost:25, buff:true, allyAtkMulti:1.2 },
        { name:'분노', type:'passive', level:10, hpThreshold:0.5, atkBonus:0.3 },
        { name:'회전 베기', type:'active', dmgMulti:2.0, cooldown:6, range:3, aoe:true, level:15, mpCost:20 },
        { name:'버서커', type:'ultimate', dmgMulti:2.0, spdMulti:1.5, cooldown:90, duration:15, level:25, mpCost:100, buff:true, defPenalty:0.5 },
        // v1.15 각성기
        { name:'대지 가르기', type:'ultimate', dmgMulti:6.0, cooldown:150, range:5, aoe:true, aoeRadius:5, level:40, mpCost:200, knockback:true, stun:2 },
    ],
    Knight: [
        { name:'방패 강타', type:'active', dmgMulti:2.0, cooldown:6, range:3, aoe:false, level:1, mpCost:15, stun:1 },
        { name:'수호 오라', type:'passive', level:5, allyDefMulti:1.15, auraRange:5 },
        { name:'도발', type:'active', cooldown:10, range:8, aoe:true, level:10, mpCost:20, taunt:true },
        { name:'철벽 방어', type:'active', cooldown:15, duration:5, level:15, mpCost:30, buff:true, dmgReduce:0.7 },
        { name:'신성한 방벽', type:'ultimate', cooldown:120, duration:3, range:6, level:25, mpCost:120, buff:true, allyInvincible:true },
        // v1.15 각성기
        { name:'불멸의 수호자', type:'ultimate', cooldown:180, duration:10, range:8, level:40, mpCost:220, buff:true, dmgReduce:0.9, allyDefMulti:1.5, taunt:true },
    ],
    Mage: [
        { name:'파이어볼', type:'active', dmgMulti:3.0, cooldown:3, range:6, aoe:true, level:1, mpCost:15 },
        { name:'아이스 볼트', type:'active', dmgMulti:2.0, cooldown:5, range:5, aoe:false, level:5, mpCost:20, slow:0.5, slowDuration:3 },
        { name:'마나 재생', type:'passive', level:10, mpRegenMulti:1.5 },
        { name:'체인 라이트닝', type:'active', dmgMulti:2.5, cooldown:8, range:6, level:15, mpCost:35, chainCount:3, chainRange:4 },
        { name:'메테오', type:'ultimate', dmgMulti:10.0, cooldown:90, range:8, aoe:true, level:25, mpCost:150, aoeRadius:4 },
        // v1.15 각성기
        { name:'시간 정지', type:'ultimate', dmgMulti:12.0, cooldown:180, range:10, aoe:true, aoeRadius:6, level:40, mpCost:250, slow:0.1, slowDuration:5 },
    ],
    Cleric: [
        { name:'홀리 라이트', type:'active', dmgMulti:2.0, cooldown:4, range:5, aoe:false, level:1, mpCost:15 },
        { name:'치유의 손길', type:'passive', level:1, healAuraTick:8, auraRange:5 }, // 매 틱(약 4초)마다 주변 아군 +8 HP
        { name:'축복', type:'active', cooldown:25, duration:15, range:6, level:5, mpCost:25, buff:true, allyAtkMulti:1.2 },
        { name:'정화', type:'active', cooldown:15, range:5, level:10, mpCost:20, cleanseDebuff:true },
        { name:'대천사의 강림', type:'ultimate', cooldown:120, range:8, level:25, mpCost:150, healAllPct:0.5, buff:true },
        // v1.15 각성기
        { name:'신의 은총', type:'ultimate', cooldown:200, duration:8, range:10, level:40, mpCost:250, buff:true, healAllPct:1.0, allyAtkMulti:1.5, allyDefMulti:1.5, cleanseDebuff:true },
    ],
};

const CLASS_ADVANCE = {
    Assassin: [
        { name: 'ShadowLord', displayName: '쉐도우로드', desc: '극한의 암살 — 크리 특화', bonusAtk: 20, bonusCrit: 0.12, bonusSpeed: 5 },
        { name: 'Nightblade',  displayName: '나이트블레이드', desc: '독+회피 — 지속 전투', bonusAtk: 10, bonusCrit: 0.05, bonusDodge: 0.1, bonusSpeed: 3 },
    ],
    Warrior: [
        { name: 'Warlord',    displayName: '워로드', desc: '공방 균형 — 만능 전사', bonusAtk: 15, bonusDef: 15, bonusHp: 100 },
        { name: 'Berserker',   displayName: '버서커', desc: '극한 공격 — 방어 포기', bonusAtk: 35, bonusDef: -5, bonusHp: 50, bonusCrit: 0.08 },
    ],
    Knight: [
        { name: 'HolyKnight', displayName: '홀리나이트', desc: '철벽 수비 — 팀 수호', bonusDef: 25, bonusHp: 200, bonusDodge: 0.05 },
        { name: 'DarkKnight',  displayName: '다크나이트', desc: '공격형 탱커 — HP 흡수', bonusAtk: 15, bonusDef: 15, bonusHp: 100 },
    ],
    Mage: [
        { name: 'Archmage',   displayName: '아크메이지', desc: '순수 마법 — 극한 데미지', bonusAtk: 30, bonusCrit: 0.15 },
        { name: 'Elementalist', displayName: '엘리멘탈리스트', desc: '속성 마스터 — 광역+상태이상', bonusAtk: 15, bonusDef: 10, bonusHp: 50, bonusCrit: 0.05 },
    ],
    Cleric: [
        { name: 'Saint',      displayName: '세인트', desc: '신성 치유의 대가 — 힐 효율 +50%', bonusDef: 10, bonusHp: 150, bonusAtk: 8 },
        { name: 'Templar',    displayName: '템플러', desc: '전투형 사제 — 공격+힐 균형', bonusAtk: 18, bonusDef: 12, bonusHp: 80 },
    ],
};

module.exports = { QUESTS, SKILLS, CLASS_ADVANCE };
