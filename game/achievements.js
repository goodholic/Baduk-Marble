// ==========================================
// 도전 과제 시스템 — v2.27
// 100개 업적, 5단계, 보상 + 칭호 + 프로필 장식
// ==========================================

const ACHIEVEMENT_TIERS = {
    bronze:   { name:'브론즈',   icon:'🥉', color:'#cd7f32', rewardMult:1.0 },
    silver:   { name:'실버',     icon:'🥈', color:'#c0c0c0', rewardMult:1.5 },
    gold:     { name:'골드',     icon:'🥇', color:'#ffd700', rewardMult:2.0 },
    platinum: { name:'플래티넘', icon:'💎', color:'#44ddff', rewardMult:3.0 },
    diamond:  { name:'다이아',   icon:'💠', color:'#aa44ff', rewardMult:5.0 },
};

// ── 도전 과제 100개 ──
const ACHIEVEMENTS = [
    // ═══ 전투 (1-20) ═══
    { id:'a1',  cat:'전투', name:'첫 번째 피',       desc:'몬스터 1마리 처치',            target:'kill_monster',    goals:[1,10,100,500,2000],     baseReward:{gold:100,exp:50} },
    { id:'a2',  cat:'전투', name:'엘리트 사냥꾼',    desc:'엘리트 몬스터 처치',            target:'kill_elite',      goals:[1,5,20,50,200],         baseReward:{gold:300,exp:200} },
    { id:'a3',  cat:'전투', name:'보스 슬레이어',    desc:'보스 등급 처치',               target:'kill_boss',       goals:[1,3,10,25,50],          baseReward:{gold:500,diamonds:10} },
    { id:'a4',  cat:'전투', name:'전설 사냥',        desc:'전설 몬스터 처치',             target:'kill_legendary',  goals:[1,3,5,10,25],           baseReward:{gold:1000,diamonds:30} },
    { id:'a5',  cat:'전투', name:'킬 스트릭',        desc:'연속 처치 달성',               target:'kill_streak',     goals:[10,25,50,100,200],      baseReward:{gold:200,exp:100} },
    { id:'a6',  cat:'전투', name:'월드 보스 헌터',   desc:'월드 보스 처치 참여',           target:'worldboss_kill',  goals:[1,5,10,25,50],          baseReward:{gold:2000,diamonds:50} },
    { id:'a7',  cat:'전투', name:'MVP',              desc:'월드 보스 MVP',                target:'worldboss_mvp',   goals:[1,3,5,10,20],           baseReward:{gold:5000,diamonds:100} },
    { id:'a8',  cat:'전투', name:'PvP 전사',         desc:'PvP 승리',                    target:'pvp_win',         goals:[1,10,50,100,500],       baseReward:{gold:300,diamonds:5} },
    { id:'a9',  cat:'전투', name:'아레나 챔피언',    desc:'아레나 티어 달성',             target:'arena_tier',      goals:[1,2,3,4,5],             baseReward:{gold:1000,diamonds:30} },
    { id:'a10', cat:'전투', name:'스킬 웨이브',      desc:'스킬 웨이브 발동',             target:'skill_wave',      goals:[1,10,30,50,100],        baseReward:{gold:500,exp:300} },
    { id:'a11', cat:'전투', name:'크리티컬 마스터',  desc:'크리티컬 히트',               target:'crit_count',      goals:[10,50,200,500,2000],    baseReward:{gold:100,exp:50} },
    { id:'a12', cat:'전투', name:'던전 탐험가',      desc:'던전 클리어',                 target:'dungeon_clear',   goals:[1,5,15,30,50],          baseReward:{gold:500,diamonds:10} },
    { id:'a13', cat:'전투', name:'탑 등반가',        desc:'무한의 탑 층 도달',            target:'tower_floor',     goals:[5,10,25,50,100],        baseReward:{gold:300,diamonds:15} },
    { id:'a14', cat:'전투', name:'차원 정복자',      desc:'차원 균열 층 돌파',            target:'rift_clear',      goals:[5,10,20,30,50],         baseReward:{gold:800,diamonds:30} },
    { id:'a15', cat:'전투', name:'보스 소환사',      desc:'소환 보스 처치',               target:'summon_boss_kill',goals:[1,3,5,10,20],           baseReward:{gold:2000,diamonds:50} },
    { id:'a16', cat:'전투', name:'날씨 던전 마스터', desc:'날씨 던전 클리어',             target:'weather_dungeon', goals:[1,5,10,20,50],          baseReward:{gold:1000,diamonds:20} },
    { id:'a17', cat:'전투', name:'레이드 전사',      desc:'길드 레이드 클리어',           target:'guild_raid',      goals:[1,5,10,20,30],          baseReward:{gold:1500,diamonds:30} },
    { id:'a18', cat:'전투', name:'보스 러시 왕',     desc:'보스 러시 웨이브',             target:'boss_rush_wave',  goals:[5,10,15,20,20],         baseReward:{gold:1000,diamonds:25} },
    { id:'a19', cat:'전투', name:'사냥꾼 의뢰',      desc:'사냥 의뢰 완료',               target:'hunt_clear',      goals:[3,10,30,60,100],        baseReward:{gold:500,diamonds:10} },
    { id:'a20', cat:'전투', name:'연쇄 웨이브',      desc:'연쇄 웨이브 달성',             target:'wave_streak',     goals:[2,3,4,5,7],             baseReward:{gold:1000,diamonds:30} },

    // ═══ 성장 (21-40) ═══
    { id:'a21', cat:'성장', name:'레벨 업',           desc:'레벨 달성',                   target:'reach_level',     goals:[10,20,30,40,50],        baseReward:{gold:500,exp:300} },
    { id:'a22', cat:'성장', name:'전직',              desc:'전직 완료',                   target:'class_advance',   goals:[1,1,1,1,1],             baseReward:{diamonds:50} },
    { id:'a23', cat:'성장', name:'환생의 길',         desc:'환생 완료',                   target:'prestige_count',  goals:[1,2,3,5,10],            baseReward:{diamonds:100} },
    { id:'a24', cat:'성장', name:'강화 장인',         desc:'장비 강화 달성',               target:'enchant_level',   goals:[3,5,7,10,15],           baseReward:{gold:500,diamonds:15} },
    { id:'a25', cat:'성장', name:'세트 수집가',       desc:'장비 세트 보너스 활성',        target:'set_bonus',       goals:[1,2,3,4,5],             baseReward:{gold:1000,diamonds:20} },
    { id:'a26', cat:'성장', name:'스킬 트리 마스터',  desc:'특성 포인트 투자',             target:'skill_points',    goals:[10,30,50,80,100],       baseReward:{gold:300,exp:200} },
    { id:'a27', cat:'성장', name:'유물 수집가',       desc:'유물 보유',                   target:'relic_count',     goals:[1,3,5,8,10],            baseReward:{gold:500,diamonds:15} },
    { id:'a28', cat:'성장', name:'유물 조합사',       desc:'유물 조합 완료',               target:'relic_fusion',    goals:[1,3,5,8,11],            baseReward:{gold:1000,diamonds:30} },
    { id:'a29', cat:'성장', name:'룬 마스터',         desc:'룬 워드 완성',                target:'rune_word',       goals:[1,3,5,8,12],            baseReward:{gold:500,diamonds:15} },
    { id:'a30', cat:'성장', name:'별자리 관측자',     desc:'별자리 관측',                 target:'constellation',   goals:[1,4,8,12,12],           baseReward:{gold:300,diamonds:10} },
    { id:'a31', cat:'성장', name:'종족의 힘',         desc:'종족 스킬 사용',              target:'race_skill',      goals:[1,10,30,50,100],        baseReward:{gold:200,exp:100} },
    { id:'a32', cat:'성장', name:'명상가',            desc:'명상 세션 완료',              target:'meditation',      goals:[1,10,30,50,100],        baseReward:{gold:200,exp:150} },
    { id:'a33', cat:'성장', name:'요리사',            desc:'요리 완료',                   target:'cook_count',      goals:[1,10,30,50,100],        baseReward:{gold:200,exp:100} },
    { id:'a34', cat:'성장', name:'연금술사',          desc:'제작 완료',                   target:'craft_count',     goals:[1,10,30,50,100],        baseReward:{gold:300,diamonds:5} },
    { id:'a35', cat:'성장', name:'정원사',            desc:'꽃 수확',                    target:'garden_harvest',  goals:[1,10,30,50,100],        baseReward:{gold:200,exp:100} },
    { id:'a36', cat:'성장', name:'타로 마스터',       desc:'타로 리딩',                   target:'tarot_read',      goals:[1,10,30,50,100],        baseReward:{gold:200,diamonds:5} },
    { id:'a37', cat:'성장', name:'훈련 광',           desc:'훈련 완료',                   target:'training_done',   goals:[5,20,50,100,200],       baseReward:{gold:200,exp:100} },
    { id:'a38', cat:'성장', name:'소환수 육성',       desc:'소환수 합성',                 target:'summon_synth',    goals:[1,5,10,20,30],          baseReward:{gold:500,diamonds:15} },
    { id:'a39', cat:'성장', name:'소환수 진화',       desc:'소환수 진화 완료',             target:'summon_evolve',   goals:[1,3,5,10,15],           baseReward:{gold:800,diamonds:25} },
    { id:'a40', cat:'성장', name:'퀘스트 마스터',     desc:'메인 퀘스트 완료',             target:'story_quest',     goals:[5,10,15,20,30],         baseReward:{gold:500,diamonds:20} },

    // ═══ 경제 (41-60) ═══
    { id:'a41', cat:'경제', name:'골드 수집가',       desc:'골드 누적 획득',              target:'total_gold',      goals:[10000,100000,500000,1000000,5000000], baseReward:{gold:1000} },
    { id:'a42', cat:'경제', name:'교역왕',            desc:'교역 완료',                   target:'trade_count',     goals:[1,10,30,50,100],        baseReward:{gold:500,diamonds:10} },
    { id:'a43', cat:'경제', name:'경매장 달인',       desc:'경매 등록',                   target:'auction_list',    goals:[1,5,15,30,50],          baseReward:{gold:300,diamonds:5} },
    { id:'a44', cat:'경제', name:'낚시꾼',            desc:'물고기 낚기',                 target:'fish_catch',      goals:[5,20,50,100,300],       baseReward:{gold:200,exp:100} },
    { id:'a45', cat:'경제', name:'전설의 낚시꾼',     desc:'전설 물고기 낚기',             target:'legendary_fish',  goals:[1,2,3,5,10],            baseReward:{gold:2000,diamonds:50} },
    { id:'a46', cat:'경제', name:'보물 사냥꾼',       desc:'보물 지도 완료',              target:'treasure_found',  goals:[1,5,15,30,50],          baseReward:{gold:500,diamonds:15} },
    { id:'a47', cat:'경제', name:'탐험가',            desc:'존 발견',                    target:'explore_count',   goals:[3,5,8,12,20],           baseReward:{gold:300,exp:200} },
    { id:'a48', cat:'경제', name:'도박사',            desc:'카지노 승리',                target:'casino_win',      goals:[1,10,30,50,100],        baseReward:{gold:500} },
    { id:'a49', cat:'경제', name:'원정대장',          desc:'원정 완료',                   target:'expedition_done', goals:[1,3,5,10,20],           baseReward:{gold:1000,diamonds:30} },
    { id:'a50', cat:'경제', name:'복권 당첨',         desc:'복권 레어+ 당첨',             target:'lottery_rare',    goals:[1,3,5,10,20],           baseReward:{gold:500,diamonds:10} },

    // ═══ 소셜 (61-75) ═══
    { id:'a51', cat:'소셜', name:'혈맹 가입',         desc:'혈맹 활동',                   target:'join_clan',       goals:[1,1,1,1,1],             baseReward:{gold:500} },
    { id:'a52', cat:'소셜', name:'혈맹 기부',         desc:'혈맹 기부',                   target:'clan_donate',     goals:[1,10,30,50,100],        baseReward:{gold:300,diamonds:5} },
    { id:'a53', cat:'소셜', name:'친구 만들기',       desc:'친구 추가',                   target:'friend_add',      goals:[1,3,5,10,20],           baseReward:{gold:200} },
    { id:'a54', cat:'소셜', name:'파티 플레이',       desc:'파티 던전 클리어',             target:'party_dungeon',   goals:[1,5,10,20,50],          baseReward:{gold:500,diamonds:10} },
    { id:'a55', cat:'소셜', name:'우편 배달부',       desc:'우편 발송',                   target:'mail_send',       goals:[1,10,30,50,100],        baseReward:{gold:200} },
    { id:'a56', cat:'소셜', name:'거래의 신',         desc:'거래 완료',                   target:'trade_done',      goals:[1,10,30,50,100],        baseReward:{gold:500,diamonds:10} },
    { id:'a57', cat:'소셜', name:'혈맹 전쟁',         desc:'혈맹 전쟁 참여',              target:'guild_war',       goals:[1,3,5,10,20],           baseReward:{gold:1000,diamonds:20} },
    { id:'a58', cat:'소셜', name:'도전장',            desc:'결투 완료',                   target:'duel_done',       goals:[1,10,30,50,100],        baseReward:{gold:300,diamonds:5} },
    { id:'a59', cat:'소셜', name:'PvP 매칭',          desc:'매칭 PvP 참여',               target:'pvp_match_done',  goals:[1,10,30,50,100],        baseReward:{gold:500,diamonds:10} },
    { id:'a60', cat:'소셜', name:'도감 수집가',       desc:'도감 등록',                   target:'codex_discover',  goals:[10,25,50,75,100],       baseReward:{gold:300,diamonds:10} },

    // ═══ 생존 (61-75) ═══
    { id:'a61', cat:'생존', name:'생존자',            desc:'연속 생존 시간(초)',           target:'survive_time',    goals:[300,600,1800,3600,7200],baseReward:{gold:300,exp:200} },
    { id:'a62', cat:'생존', name:'불사신',            desc:'부활 횟수',                   target:'revive_count',    goals:[1,5,10,20,50],          baseReward:{gold:200,exp:100} },
    { id:'a63', cat:'생존', name:'화산 생존자',       desc:'화산 존 생존(초)',             target:'volcano_survive', goals:[60,180,300,600,1200],   baseReward:{gold:500,diamonds:15} },
    { id:'a64', cat:'생존', name:'심연 탐험',         desc:'심연 존 체류(초)',             target:'abyss_survive',   goals:[60,180,300,600,1200],   baseReward:{gold:800,diamonds:20} },
    { id:'a65', cat:'생존', name:'밤의 사냥꾼',       desc:'밤 시간 처치',                target:'kill_night',      goals:[10,30,50,100,200],      baseReward:{gold:300,diamonds:10} },

    // ═══ 수집 (76-90) ═══
    { id:'a66', cat:'수집', name:'테이머',            desc:'몬스터 테이밍',               target:'tame_count',      goals:[1,5,10,20,50],          baseReward:{gold:500,diamonds:10} },
    { id:'a67', cat:'수집', name:'펫 수집가',         desc:'펫 보유',                    target:'pet_count',       goals:[1,3,5,8,12],            baseReward:{gold:300,diamonds:10} },
    { id:'a68', cat:'수집', name:'펫 진화',           desc:'펫 진화 완료',                target:'pet_evolve',      goals:[1,3,5,8,10],            baseReward:{gold:500,diamonds:15} },
    { id:'a69', cat:'수집', name:'칭호 수집가',       desc:'칭호 획득',                   target:'title_count',     goals:[3,5,10,15,25],          baseReward:{gold:300,diamonds:10} },
    { id:'a70', cat:'수집', name:'스킨 수집가',       desc:'스킨 보유',                   target:'skin_count',      goals:[1,3,5,8,12],            baseReward:{gold:300,diamonds:10} },
    { id:'a71', cat:'수집', name:'히든 발견자',       desc:'히든 퀘스트/조합 발견',        target:'hidden_discover', goals:[1,3,5,8,12],            baseReward:{gold:1000,diamonds:30} },
    { id:'a72', cat:'수집', name:'진영 충성',         desc:'진영 기여',                   target:'faction_rep',     goals:[10,50,100,200,500],     baseReward:{gold:500,diamonds:15} },
    { id:'a73', cat:'수집', name:'날씨 경험자',       desc:'날씨 변화 경험',              target:'weather_count',   goals:[5,15,30,50,100],        baseReward:{gold:200,exp:100} },
    { id:'a74', cat:'수집', name:'용병 지휘관',       desc:'용병 보유',                   target:'army_count',      goals:[5,10,15,20,30],         baseReward:{gold:500,diamonds:10} },
    { id:'a75', cat:'수집', name:'전설 장비',         desc:'전설 등급 장비 보유',          target:'legendary_equip', goals:[1,3,5,8,10],            baseReward:{gold:1000,diamonds:30} },

    // ═══ 마스터 (91-100) ═══
    { id:'a76', cat:'마스터', name:'플레이 시간',      desc:'누적 플레이 시간(초)',         target:'playtime',        goals:[3600,36000,180000,360000,720000], baseReward:{gold:500,diamonds:10} },
    { id:'a77', cat:'마스터', name:'출석왕',           desc:'연속 출석(일)',               target:'attendance',      goals:[3,7,14,30,60],          baseReward:{gold:500,diamonds:20} },
    { id:'a78', cat:'마스터', name:'시즌 패스',        desc:'시즌 패스 티어',              target:'season_tier',     goals:[5,10,15,20,30],         baseReward:{gold:1000,diamonds:30} },
    { id:'a79', cat:'마스터', name:'도감 마스터',      desc:'도감 완성률',                 target:'codex_pct',       goals:[10,25,50,75,100],       baseReward:{gold:1000,diamonds:50} },
    { id:'a80', cat:'마스터', name:'만렙 달성',        desc:'최대 레벨 도달',              target:'reach_level',     goals:[50,50,50,50,50],        baseReward:{diamonds:200} },
    { id:'a81', cat:'마스터', name:'PvP 랭커',        desc:'PvP ELO 달성',               target:'elo_rating',      goals:[1100,1300,1500,1800,2100], baseReward:{gold:2000,diamonds:50} },
    { id:'a82', cat:'마스터', name:'올클리어',         desc:'모든 챕터 클리어',            target:'chapter_clear',   goals:[1,2,3,4,5],             baseReward:{gold:5000,diamonds:100} },
    { id:'a83', cat:'마스터', name:'종합 업적',        desc:'업적 달성 수',                target:'achievement_count', goals:[10,25,50,75,100],     baseReward:{gold:2000,diamonds:50} },
    { id:'a84', cat:'마스터', name:'콘텐츠 정복자',    desc:'모든 시스템 1회 이상 이용',    target:'system_count',    goals:[5,10,15,20,25],         baseReward:{gold:3000,diamonds:80} },
    { id:'a85', cat:'마스터', name:'전설이 되다',      desc:'전설 칭호 획득',              target:'legend_title',    goals:[1,1,1,1,1],             baseReward:{diamonds:500} },

    // ═══ 특수 (86-100) ═══
    { id:'a86',  cat:'특수', name:'첫 사망',          desc:'처음으로 사망',               target:'first_death',     goals:[1,1,1,1,1],             baseReward:{gold:100} },
    { id:'a87',  cat:'특수', name:'카르마 제로',      desc:'카르마 0 유지 Lv.20+',        target:'peaceful_lv20',   goals:[1,1,1,1,1],             baseReward:{gold:5000,diamonds:50} },
    { id:'a88',  cat:'특수', name:'도박 20연승',      desc:'주사위 20연승',               target:'dice_streak',     goals:[5,10,15,20,20],         baseReward:{gold:10000,diamonds:100} },
    { id:'a89',  cat:'특수', name:'신화 낚시',        desc:'신화 크라켄 낚기',            target:'mythic_fish',     goals:[1,1,1,1,1],             baseReward:{gold:20000,diamonds:200} },
    { id:'a90',  cat:'특수', name:'풀클리어 보스러시', desc:'보스 러시 20웨이브',          target:'boss_rush_full',  goals:[1,2,3,5,10],            baseReward:{gold:5000,diamonds:100} },
    { id:'a91',  cat:'특수', name:'히든 웨이브',      desc:'히든 스킬 웨이브 발견',        target:'hidden_wave',     goals:[1,2,2,2,2],             baseReward:{gold:3000,diamonds:80} },
    { id:'a92',  cat:'특수', name:'히든 조합',        desc:'히든 유물 조합 발견',          target:'hidden_fusion',   goals:[1,2,2,2,2],             baseReward:{gold:3000,diamonds:80} },
    { id:'a93',  cat:'특수', name:'혼자서도 잘해요',  desc:'솔로 Lv.40 달성',             target:'solo_40',         goals:[1,1,1,1,1],             baseReward:{gold:5000,diamonds:50} },
    { id:'a94',  cat:'특수', name:'4종족 파티',       desc:'4종족 파티 구성',              target:'all_race_party',  goals:[1,2,3,5,10],            baseReward:{gold:1000,diamonds:30} },
    { id:'a95',  cat:'특수', name:'무한 탑 50층',     desc:'무한의 탑 50층 돌파',          target:'tower_floor',     goals:[50,50,50,50,50],        baseReward:{gold:10000,diamonds:200} },
    { id:'a96',  cat:'특수', name:'그랜드마스터',     desc:'PvP 그랜드마스터 달성',        target:'elo_rating',      goals:[2500,2500,2500,2500,2500], baseReward:{diamonds:500} },
    { id:'a97',  cat:'특수', name:'태초신 유물',      desc:'태초신의 유물 조합',           target:'primordial_craft',goals:[1,1,1,1,1],             baseReward:{diamonds:300} },
    { id:'a98',  cat:'특수', name:'마왕 강림',        desc:'마왕의 강림 웨이브 발동',      target:'demon_wave',      goals:[1,3,5,10,20],           baseReward:{gold:3000,diamonds:80} },
    { id:'a99',  cat:'특수', name:'올 시스템 마스터', desc:'100개 업적 중 90개 달성',      target:'achievement_90',  goals:[1,1,1,1,1],             baseReward:{diamonds:1000} },
    { id:'a100', cat:'특수', name:'완벽한 전설',      desc:'100개 업적 전부 다이아 달성',  target:'achievement_100', goals:[1,1,1,1,1],             baseReward:{diamonds:2000,title:'title_perfect_legend',cosmetic:'rainbow_aura'} },
];

// ── 프로필 장식 (업적 보상) ──
const PROFILE_DECORATIONS = {
    frame_bronze: { name:'브론즈 프레임', req:10 },
    frame_silver: { name:'실버 프레임', req:25 },
    frame_gold: { name:'골드 프레임', req:50 },
    frame_diamond: { name:'다이아 프레임', req:75 },
    frame_rainbow: { name:'레인보우 프레임', req:100 },
    aura_fire: { name:'화염 오라', req:30, cat:'전투' },
    aura_ice: { name:'빙결 오라', req:30, cat:'수집' },
    aura_rainbow: { name:'무지개 오라', req:100 },
};

function _ensure(player) {
    if (!player._achievements) {
        player._achievements = {
            progress: {},     // { achievementId: { tier, count } }
            claimed: {},      // { achievementId: maxTierClaimed }
            totalCompleted: 0,
            profileFrame: null,
            profileAura: null,
        };
    }
    return player._achievements;
}

const TIER_NAMES = ['bronze','silver','gold','platinum','diamond'];

// 업적 진행 업데이트
function updateProgress(player, target, amount) {
    const state = _ensure(player);
    const results = [];

    for (const ach of ACHIEVEMENTS) {
        if (ach.target !== target) continue;
        if (!state.progress[ach.id]) state.progress[ach.id] = { tier: 0, count: 0 };
        const p = state.progress[ach.id];

        // 최대값 추적 vs 누적 추적
        const isMaxType = ['reach_level','enchant_level','arena_tier','tower_floor','rift_clear',
            'kill_streak','elo_rating','codex_pct','faction_rep','playtime','total_gold'].includes(target);
        if (isMaxType) {
            p.count = Math.max(p.count, amount);
        } else {
            p.count += (typeof amount === 'number' ? amount : 1);
        }

        // 티어 달성 체크
        while (p.tier < 5 && p.count >= ach.goals[p.tier]) {
            p.tier++;
            results.push({ id: ach.id, name: ach.name, tier: p.tier, tierName: TIER_NAMES[p.tier - 1] });
        }
    }

    return results;
}

// 보상 수령
function claimReward(player, achievementId, tier) {
    const state = _ensure(player);
    const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return { success: false, msg: '업적 없음' };
    const p = state.progress[achievementId];
    if (!p || p.tier < tier) return { success: false, msg: '미달성' };
    if ((state.claimed[achievementId] || 0) >= tier) return { success: false, msg: '이미 수령' };

    state.claimed[achievementId] = tier;
    const mult = ACHIEVEMENT_TIERS[TIER_NAMES[tier - 1]]?.rewardMult || 1;
    const r = ach.baseReward;
    if (r.gold) player.gold = Math.min(999999999, (player.gold || 0) + Math.floor(r.gold * mult));
    if (r.exp) player.exp = (player.exp || 0) + Math.floor(r.exp * mult);
    if (r.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + Math.floor(r.diamonds * mult));
    if (r.title && tier === 5) {
        if (!player.titles) player.titles = [];
        if (!player.titles.includes(r.title)) player.titles.push(r.title);
    }

    // 총 완료 수 갱신
    state.totalCompleted = Object.values(state.claimed).filter(v => v >= 1).length;

    return { success: true, reward: r, mult, tierName: TIER_NAMES[tier - 1], totalCompleted: state.totalCompleted };
}

// 상태 조회
function getStatus(player) {
    const state = _ensure(player);
    const categories = {};
    for (const ach of ACHIEVEMENTS) {
        if (!categories[ach.cat]) categories[ach.cat] = { total: 0, completed: 0, achievements: [] };
        categories[ach.cat].total++;
        const p = state.progress[ach.id] || { tier: 0, count: 0 };
        const claimed = state.claimed[ach.id] || 0;
        if (claimed >= 1) categories[ach.cat].completed++;
        categories[ach.cat].achievements.push({
            id: ach.id, name: ach.name, desc: ach.desc, cat: ach.cat,
            tier: p.tier, maxTier: 5, count: p.count,
            goals: ach.goals, claimed,
            currentGoal: p.tier < 5 ? ach.goals[p.tier] : ach.goals[4],
            tierName: p.tier > 0 ? TIER_NAMES[p.tier - 1] : null,
        });
    }
    return {
        categories,
        totalCompleted: state.totalCompleted,
        totalAchievements: ACHIEVEMENTS.length,
        profileFrame: state.profileFrame,
        profileAura: state.profileAura,
        decorations: Object.entries(PROFILE_DECORATIONS).map(([id, d]) => ({
            id, ...d, unlocked: state.totalCompleted >= d.req,
        })),
    };
}

module.exports = {
    ACHIEVEMENTS, ACHIEVEMENT_TIERS, PROFILE_DECORATIONS,
    updateProgress, claimReward, getStatus,
};
