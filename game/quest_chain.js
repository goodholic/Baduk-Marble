// ==========================================
// 메인 스토리 퀘스트 체인 시스템 — v2.19
// 5챕터 30+ 순차 퀘스트 + 숨겨진 퀘스트 + 분기 선택
// ==========================================

// ── 메인 스토리 퀘스트 정의 ──
const STORY_QUESTS = {
    // Chapter 1: 초보 모험가 (Lv.1-10)
    '1-1': { chapter:1, name:'첫 발걸음', desc:'몬스터 3마리를 처치하세요', reqLevel:1, prereq:null, target:'kill_monster', goal:3, reward:{gold:200,exp:100}, guide:'숲 지역으로 이동하여 몬스터를 사냥하세요' },
    '1-2': { chapter:1, name:'장비의 중요성', desc:'장비를 1개 장착하세요', reqLevel:3, prereq:'1-1', target:'equip_item', goal:1, reward:{gold:300,item:'equip_sword_1'}, guide:'인벤토리(I)를 열어 장비를 장착하세요' },
    '1-3': { chapter:1, name:'마을 탐험', desc:'마을 NPC 3명과 대화하세요', reqLevel:5, prereq:'1-2', target:'npc_talk', goal:3, reward:{gold:500,item:'potion_hp',itemQty:5}, guide:'아덴 마을의 NPC를 클릭하세요' },
    '1-4': { chapter:1, name:'더 강한 적', desc:'엘리트 몬스터를 처치하세요', reqLevel:7, prereq:'1-3', target:'kill_elite', goal:1, reward:{gold:800,item:'equip_armor_1'}, guide:'엘리트 몬스터는 이름이 황금색입니다' },
    '1-5': { chapter:1, name:'10킬 스트릭', desc:'10킬 연속 처치를 달성하세요', reqLevel:8, prereq:'1-4', target:'kill_streak', goal:10, reward:{gold:1000,diamonds:20,title:'title_novice'}, guide:'빠르게 연속으로 몬스터를 사냥하세요' },
    '1-6': { chapter:1, name:'첫 번째 전직', desc:'전직을 완료하세요', reqLevel:10, prereq:'1-5', target:'class_advance', goal:1, reward:{diamonds:50,statPoints:5}, guide:'마을의 전직 NPC를 찾으세요' },

    // Chapter 2: 전사의 길 (Lv.10-20)
    '2-1': { chapter:2, name:'던전의 부름', desc:'던전을 1회 클리어하세요', reqLevel:10, prereq:'1-6', target:'dungeon_clear', goal:1, reward:{gold:2000,item:'mat_soul',itemQty:3}, guide:'던전 입구로 이동하세요' },
    '2-2': { chapter:2, name:'동료를 구해라', desc:'몬스터를 테이밍하세요', reqLevel:12, prereq:'2-1', target:'tame_count', goal:1, reward:{gold:1500,diamonds:30}, guide:'약한 몬스터 근처에서 테이밍을 시도하세요' },
    '2-3': { chapter:2, name:'대장장이의 부탁', desc:'장비를 +5까지 강화하세요', reqLevel:13, prereq:'2-2', target:'enchant_level', goal:5, reward:{gold:3000,item:'mat_magic',itemQty:10}, guide:'대장장이 NPC에서 강화하세요' },
    '2-4': { chapter:2, name:'펫 사육사', desc:'펫을 1마리 구매하세요', reqLevel:15, prereq:'2-3', target:'pet_count', goal:1, reward:{diamonds:30}, guide:'펫 상점에서 펫을 구매하세요' },
    '2-5': { chapter:2, name:'혈맹 가입', desc:'혈맹에 가입하거나 창설하세요', reqLevel:15, prereq:'2-4', target:'join_clan', goal:1, reward:{gold:5000}, guide:'혈맹 메뉴에서 가입/창설하세요' },
    '2-6': { chapter:2, name:'탑의 도전', desc:'무한의 탑 5층을 클리어하세요', reqLevel:18, prereq:'2-5', target:'tower_floor', goal:5, reward:{diamonds:80,item:'equip_sword_3'}, guide:'무한의 탑에 입장하세요' },
    '2-7': { chapter:2, name:'낚시의 여유', desc:'물고기 10마리를 낚으세요', reqLevel:20, prereq:'2-6', target:'fish_catch', goal:10, reward:{gold:3000,item:'rod_gold'}, guide:'낚시터로 이동하세요' },

    // Chapter 3: 대륙 탐험 (Lv.20-35)
    '3-1': { chapter:3, name:'미지의 존 발견', desc:'5개 존을 탐험하세요', reqLevel:20, prereq:'2-7', target:'explore_count', goal:5, reward:{gold:5000}, guide:'새로운 지역으로 이동하세요' },
    '3-2': { chapter:3, name:'교역의 길', desc:'교역 3회를 완료하세요', reqLevel:22, prereq:'3-1', target:'trade_count', goal:3, reward:{gold:8000}, guide:'마을 간 교역품을 사고 파세요' },
    '3-3': { chapter:3, name:'진영 선택', desc:'진영에 가입하세요', reqLevel:25, prereq:'3-2', target:'faction_join', goal:1, reward:{gold:5000,diamonds:100}, guide:'진영 NPC에서 태양/달/별 중 선택하세요', branch:true },
    '3-4': { chapter:3, name:'제작의 달인', desc:'아이템 5개를 제작하세요', reqLevel:28, prereq:'3-3', target:'craft_count', goal:5, reward:{diamonds:50,item:'blueprint_rare'}, guide:'제작대에서 아이템을 만드세요' },
    '3-5': { chapter:3, name:'레이드 도전', desc:'혈맹 레이드 1회 클리어', reqLevel:30, prereq:'3-4', target:'guild_raid', goal:1, reward:{gold:15000,item:'equip_armor_4'}, guide:'혈맹원과 함께 레이드에 도전하세요' },
    '3-6': { chapter:3, name:'PvP 세례', desc:'아레나 실버 티어 달성', reqLevel:32, prereq:'3-5', target:'arena_tier', goal:2, reward:{diamonds:150}, guide:'아레나에서 승리하여 포인트를 모으세요' },

    // Chapter 4: 영웅의 자격 (Lv.35-50)
    '4-1': { chapter:4, name:'월드 보스 토벌', desc:'월드 보스 3회 처치', reqLevel:35, prereq:'3-6', target:'worldboss_kill', goal:3, reward:{gold:20000,item:'mat_dragon',itemQty:10}, guide:'월드 보스 출현 시 용의 요람으로!' },
    '4-2': { chapter:4, name:'전설의 강화', desc:'장비 +10 강화 달성', reqLevel:38, prereq:'4-1', target:'enchant_level', goal:10, reward:{diamonds:200}, guide:'최고 등급 장비를 +10까지 강화하세요' },
    '4-3': { chapter:4, name:'세트 효과', desc:'장비 세트 보너스 활성화', reqLevel:40, prereq:'4-2', target:'set_bonus', goal:1, reward:{gold:25000,item:'rune_all'}, guide:'같은 세트의 장비를 모아 장착하세요' },
    '4-4': { chapter:4, name:'보스 러시', desc:'보스 러시 10웨이브 달성', reqLevel:42, prereq:'4-3', target:'boss_rush_wave', goal:10, reward:{diamonds:300}, guide:'보스 러시에 도전하세요' },
    '4-5': { chapter:4, name:'차원의 균열', desc:'차원 균열 10층 돌파', reqLevel:45, prereq:'4-4', target:'rift_clear', goal:10, reward:{gold:30000}, guide:'차원 균열에 입장하세요' },
    '4-6': { chapter:4, name:'영웅 등극', desc:'월드 보스 MVP 달성', reqLevel:50, prereq:'4-5', target:'worldboss_mvp', goal:1, reward:{diamonds:500,title:'title_hero'}, guide:'월드 보스에서 가장 많은 데미지를!' },

    // Chapter 5: 전설의 시작 (Lv.50+)
    '5-1': { chapter:5, name:'환생의 길', desc:'환생을 완료하세요', reqLevel:50, prereq:'4-6', target:'prestige_count', goal:1, reward:{diamonds:500}, guide:'Lv.50에서 환생을 선택하세요' },
    '5-2': { chapter:5, name:'마스터의 증명', desc:'아레나 골드 티어 달성', reqLevel:1, prereq:'5-1', target:'arena_tier', goal:3, reward:{gold:50000}, guide:'환생 후 다시 아레나에 도전!' },
    '5-3': { chapter:5, name:'차원 정복자', desc:'차원 균열 30층 돌파', reqLevel:1, prereq:'5-2', target:'rift_clear', goal:30, reward:{diamonds:800}, guide:'더 깊은 차원에 도전하세요' },
    '5-4': { chapter:5, name:'전설의 대장장이', desc:'전설 장비 10개 보유', reqLevel:1, prereq:'5-3', target:'legendary_equip', goal:10, reward:{diamonds:1000}, guide:'전설 장비를 수집하세요' },
    '5-5': { chapter:5, name:'최종 결전', desc:'월드 보스 MVP 5회', reqLevel:1, prereq:'5-4', target:'worldboss_mvp', goal:5, reward:{diamonds:2000,title:'title_legend'}, guide:'전설이 되세요!' },
};

// ── 숨겨진 퀘스트 정의 ──
const HIDDEN_QUESTS = {
    'H-1': { name:'밤의 사냥꾼', desc:'밤에 50마리 처치', target:'kill_night', goal:50, reward:{title:'title_nighthunter',gold:10000}, unlockCheck:'isNight', hidden:true },
    'H-2': { name:'폭풍의 전사', desc:'폭풍 날씨에 30마리 처치', target:'kill_storm', goal:30, reward:{item:'equip_storm_sword',diamonds:100}, unlockCheck:'stormWeather', hidden:true },
    'H-3': { name:'평화주의자', desc:'카르마 0으로 Lv.30 달성', target:'peaceful_30', goal:1, reward:{title:'title_saint',permDef:50}, unlockCheck:'peacefulLv30', hidden:true },
    'H-4': { name:'도박왕', desc:'주사위 도박 20연승', target:'dice_streak', goal:20, reward:{gold:50000,emote:'golden_dice'}, unlockCheck:'diceStreak20', hidden:true },
    'H-5': { name:'고독한 전사', desc:'혈맹 없이 Lv.40 달성', target:'solo_40', goal:1, reward:{title:'title_lonewolf'}, unlockCheck:'soloLv40', hidden:true },
    'H-6': { name:'낚시 마스터', desc:'전설 물고기 낚기', target:'legendary_fish', goal:1, reward:{item:'rod_legendary',diamonds:200}, unlockCheck:'legendaryFish', hidden:true },
    'H-7': { name:'화산 생존자', desc:'화산 존 10분 생존', target:'volcano_survive', goal:600, reward:{title:'title_phoenix'}, unlockCheck:'volcanoSurvive', hidden:true },
    'H-8': { name:'골드 파밍왕', desc:'골드 100만 누적 획득', target:'total_gold', goal:1000000, reward:{diamonds:300,goldCapBonus:0.5}, unlockCheck:'millionGold', hidden:true },
};

// ── 플레이어 퀘스트 체인 상태 관리 ──
function _ensure(player) {
    if (!player._storyQuests) {
        player._storyQuests = {
            completed: {},     // { questId: completedAt }
            current: null,     // 현재 진행 중인 메인 퀘스트 ID
            progress: {},      // { questId: currentProgress }
            branch: {},        // { questId: selectedBranch }
            hiddenDiscovered: {},  // { questId: true }
            hiddenProgress: {},    // { questId: currentProgress }
            hiddenCompleted: {},   // { questId: completedAt }
        };
    }
    return player._storyQuests;
}

// 현재 진행 가능한 다음 메인 퀘스트 찾기
function getNextQuest(player) {
    const state = _ensure(player);
    // 이미 진행 중이면 반환
    if (state.current && STORY_QUESTS[state.current]) {
        const q = STORY_QUESTS[state.current];
        return {
            id: state.current,
            ...q,
            progress: state.progress[state.current] || 0,
            isActive: true,
        };
    }
    // 다음 퀘스트 탐색
    for (const [qId, q] of Object.entries(STORY_QUESTS)) {
        if (state.completed[qId]) continue;
        if (q.prereq && !state.completed[q.prereq]) continue;
        if (q.reqLevel && typeof q.reqLevel === 'number' && player.level < q.reqLevel) continue;
        // 자동으로 다음 퀘스트 시작
        state.current = qId;
        if (!state.progress[qId]) state.progress[qId] = 0;
        return { id: qId, ...q, progress: state.progress[qId], isActive: true };
    }
    return null; // 모든 퀘스트 완료
}

// 퀘스트 진행 업데이트
function updateProgress(player, target, amount) {
    const state = _ensure(player);
    const result = { storyUpdated: false, hiddenUpdated: false, completed: [], hiddenCompleted: [] };

    // 메인 스토리 퀘스트 진행
    if (state.current) {
        const q = STORY_QUESTS[state.current];
        if (q && q.target === target) {
            if (target === 'enchant_level' || target === 'arena_tier' || target === 'kill_streak' ||
                target === 'tower_floor' || target === 'rift_clear' || target === 'total_gold' ||
                target === 'faction_rep' || target === 'playtime') {
                // 최대값 추적 타입
                state.progress[state.current] = Math.max(state.progress[state.current] || 0, amount);
            } else {
                // 누적 추적 타입
                state.progress[state.current] = (state.progress[state.current] || 0) + (typeof amount === 'number' ? amount : 1);
            }
            result.storyUpdated = true;

            // 완료 체크
            if (state.progress[state.current] >= q.goal) {
                state.completed[state.current] = Date.now();
                result.completed.push({ id: state.current, quest: q });
                state.current = null; // 다음 퀘스트를 getNextQuest에서 찾음
            }
        }
    }

    // 숨겨진 퀘스트 진행
    for (const [hId, hq] of Object.entries(HIDDEN_QUESTS)) {
        if (state.hiddenCompleted[hId]) continue;
        if (hq.target !== target) continue;
        if (!state.hiddenDiscovered[hId]) {
            state.hiddenDiscovered[hId] = true; // 첫 진행 시 발견
        }
        if (target === 'total_gold' || target === 'volcano_survive' || target === 'dice_streak') {
            state.hiddenProgress[hId] = Math.max(state.hiddenProgress[hId] || 0, amount);
        } else {
            state.hiddenProgress[hId] = (state.hiddenProgress[hId] || 0) + (typeof amount === 'number' ? amount : 1);
        }
        result.hiddenUpdated = true;
        if (state.hiddenProgress[hId] >= hq.goal) {
            state.hiddenCompleted[hId] = Date.now();
            result.hiddenCompleted.push({ id: hId, quest: hq });
        }
    }

    return result;
}

// 분기 선택
function selectBranch(player, questId, branchChoice) {
    const state = _ensure(player);
    const q = STORY_QUESTS[questId];
    if (!q || !q.branch) return { success: false, msg: '분기 퀘스트가 아닙니다' };
    state.branch[questId] = branchChoice;
    return { success: true, branch: branchChoice };
}

// 퀘스트 보상 수령
function claimReward(player, questId, isHidden) {
    const state = _ensure(player);
    const quests = isHidden ? HIDDEN_QUESTS : STORY_QUESTS;
    const completed = isHidden ? state.hiddenCompleted : state.completed;
    if (!completed[questId]) return { success: false, msg: '미완료' };
    const q = quests[questId];
    if (!q) return { success: false, msg: '퀘스트 없음' };

    const reward = q.reward;
    if (reward.gold) player.gold = Math.min(999999999, (player.gold || 0) + reward.gold);
    if (reward.exp) player.exp = (player.exp || 0) + reward.exp;
    if (reward.diamonds) player.diamonds = Math.min(9999999, (player.diamonds || 0) + reward.diamonds);
    if (reward.item) {
        if (!player.inventory) player.inventory = {};
        player.inventory[reward.item] = (player.inventory[reward.item] || 0) + (reward.itemQty || 1);
    }
    if (reward.statPoints) player.statPoints = (player.statPoints || 0) + reward.statPoints;
    if (reward.title) {
        if (!player.titles) player.titles = [];
        if (!player.titles.includes(reward.title)) player.titles.push(reward.title);
    }

    return { success: true, reward, questName: q.name };
}

// 전체 진행 상황 조회
function getQuestStatus(player) {
    const state = _ensure(player);
    const current = getNextQuest(player);
    const chapters = {};
    for (const [qId, q] of Object.entries(STORY_QUESTS)) {
        if (!chapters[q.chapter]) chapters[q.chapter] = { total: 0, completed: 0, quests: [] };
        chapters[q.chapter].total++;
        const isCompleted = !!state.completed[qId];
        if (isCompleted) chapters[q.chapter].completed++;
        chapters[q.chapter].quests.push({
            id: qId, name: q.name, desc: q.desc, completed: isCompleted,
            progress: state.progress[qId] || 0, goal: q.goal,
        });
    }
    const hidden = Object.entries(HIDDEN_QUESTS).map(([id, q]) => ({
        id, name: state.hiddenDiscovered[id] ? q.name : '???',
        discovered: !!state.hiddenDiscovered[id],
        completed: !!state.hiddenCompleted[id],
        progress: state.hiddenProgress[id] || 0, goal: q.goal,
    }));
    return { current, chapters, hidden, totalCompleted: Object.keys(state.completed).length, totalQuests: Object.keys(STORY_QUESTS).length };
}

module.exports = {
    STORY_QUESTS, HIDDEN_QUESTS,
    getNextQuest, updateProgress, selectBranch, claimReward, getQuestStatus,
};
