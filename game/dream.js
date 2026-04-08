// 꿈 시스템 — v2.10
// 잠들면 무작위 꿈에 들어가 선택지를 고름 → 결과는 보상 또는 디버프
// 단편 텍스트 어드벤처 (분기 1단계)

const DREAMS = [
  {
    id:'falling',
    title:'끝없는 추락',
    text:'어두운 심연으로 끝없이 떨어지고 있다. 발 아래로 보이는 불빛은 점점 가까워진다.',
    choices: [
      { id:'embrace',  text:'추락을 받아들인다',     outcome:{ stat:'def', value:5,  text:'바닥에 닿는 순간 너의 영혼이 단단해진다' } },
      { id:'struggle', text:'필사적으로 발버둥친다',  outcome:{ gold:200,             text:'손에 닿은 무언가를 움켜쥐고 깨어난다 — 200G 발견' } },
      { id:'wake',     text:'깨어나려 한다',         outcome:{ msg:'아무 일도 없이 아침이 온다' } },
    ],
  },
  {
    id:'feast',
    title:'끝나지 않는 연회',
    text:'화려한 연회장. 낯선 사람들이 너에게 잔을 권한다. 음식 냄새가 코를 찌른다.',
    choices: [
      { id:'drink',  text:'잔을 받아 마신다',  outcome:{ stat:'maxHp', value:20, text:'달콤한 술이 영혼을 채운다' } },
      { id:'eat',    text:'음식을 먹는다',     outcome:{ stat:'atk',   value:5,  text:'고기의 힘이 너의 팔에 깃든다' } },
      { id:'leave',  text:'조용히 떠난다',     outcome:{ stat:'evasion',value:3, text:'그림자처럼 빠져나오는 법을 배운다' } },
    ],
  },
  {
    id:'forest',
    title:'은빛 숲',
    text:'달빛에 빛나는 은빛 나무들. 작은 여우 한 마리가 너를 응시한다.',
    choices: [
      { id:'follow', text:'여우를 따라간다',  outcome:{ gold:500, text:'여우는 너를 보물 둔덕으로 인도한다 — 500G' } },
      { id:'pet',    text:'여우를 쓰다듬는다', outcome:{ stat:'allStats', value:2, text:'여우가 너의 영혼에 축복을 남긴다' } },
      { id:'scare',  text:'위협한다',         outcome:{ stat:'maxHp', value:-10, text:'여우가 송곳니를 드러낸다' } },
    ],
  },
  {
    id:'mirror',
    title:'거울 속의 또 다른 나',
    text:'거울에 비친 모습이 너와 다르게 움직인다. 그것이 너를 향해 손을 내민다.',
    choices: [
      { id:'shake',  text:'손을 잡는다',     outcome:{ stat:'crit', value:5, text:'거울 속의 자아와 하나가 된다' } },
      { id:'break',  text:'거울을 깬다',     outcome:{ gold:300, text:'거울 조각이 금화로 변한다 — 300G' } },
      { id:'turn',   text:'등을 돌린다',     outcome:{ msg:'거울 너머에서 슬픈 목소리가 들려온다' } },
    ],
  },
  {
    id:'desert',
    title:'끝없는 사막',
    text:'뜨거운 모래바람. 멀리 신기루가 오아시스의 모습을 그린다.',
    choices: [
      { id:'walk',   text:'신기루를 향해 걷는다', outcome:{ stat:'def', value:8, text:'헛된 추구가 너를 단련시킨다' } },
      { id:'dig',    text:'땅을 파본다',         outcome:{ gold:400, text:'모래 속에 묻힌 보물 — 400G' } },
      { id:'rest',   text:'그늘을 찾아 쉰다',    outcome:{ stat:'maxHp', value:30, text:'평온한 휴식이 너를 회복시킨다' } },
    ],
  },
  {
    id:'starfield',
    title:'별들의 들판',
    text:'발 아래로 별이 빛나는 들판이 펼쳐진다. 한 별이 너에게 노래를 부른다.',
    choices: [
      { id:'listen', text:'노래에 귀를 기울인다', outcome:{ stat:'expBonus', value:15, text:'별의 지혜가 너의 영혼에 새겨진다' } },
      { id:'sing',   text:'함께 노래한다',       outcome:{ stat:'allStats', value:3, text:'우주가 너와 화음을 맞춘다' } },
      { id:'catch',  text:'별을 잡으려 한다',    outcome:{ gold:1000, text:'별이 너의 손에서 금화로 부서진다 — 1000G' } },
    ],
  },
];

const SLEEP_COOLDOWN_HOURS = 4;

function _ensure(player) {
  if (!player.dream) {
    player.dream = {
      activeDream: null, // {dreamId, startedAt}
      lastDreamAt: 0,
      dreamCount: 0,
      log: [],           // [{dreamId, choiceId, when}]
    };
  }
  return player.dream;
}

function getStatus(player) {
  const d = _ensure(player);
  const now = Date.now();
  const cdMs = SLEEP_COOLDOWN_HOURS * 60 * 60 * 1000;
  return {
    activeDream: d.activeDream ? DREAMS.find(x => x.id === d.activeDream.dreamId) : null,
    canSleep: now >= d.lastDreamAt + cdMs,
    cooldownSecondsLeft: Math.max(0, Math.ceil((d.lastDreamAt + cdMs - now) / 1000)),
    dreamCount: d.dreamCount,
    log: d.log.slice(0, 20),
  };
}

function sleep(player) {
  const d = _ensure(player);
  if (d.activeDream) return { success:false, msg:'이미 꿈에 들어가 있음' };
  const now = Date.now();
  const cdMs = SLEEP_COOLDOWN_HOURS * 60 * 60 * 1000;
  if (now < d.lastDreamAt + cdMs) {
    const left = Math.ceil((d.lastDreamAt + cdMs - now) / 60000);
    return { success:false, msg:`수면 쿨다운 ${left}분 남음` };
  }
  const dream = DREAMS[Math.floor(Math.random() * DREAMS.length)];
  d.activeDream = { dreamId: dream.id, startedAt: now };
  return { success:true, msg:`💭 꿈에 빠진다 — ${dream.title}`, dream };
}

function choose(player, choiceId) {
  const d = _ensure(player);
  if (!d.activeDream) return { success:false, msg:'꿈을 꾸는 중이 아님' };
  const dream = DREAMS.find(x => x.id === d.activeDream.dreamId);
  if (!dream) {
    d.activeDream = null;
    return { success:false, msg:'꿈이 사라졌다' };
  }
  const choice = dream.choices.find(c => c.id === choiceId);
  if (!choice) return { success:false, msg:'존재하지 않는 선택' };

  // 결과 적용
  const outcome = choice.outcome;
  if (outcome.gold) {
    player.gold = (player.gold || 0) + outcome.gold;
  }
  if (outcome.stat && typeof outcome.value === 'number') {
    if (!player.dreamBonus) player.dreamBonus = {};
    player.dreamBonus[outcome.stat] = (player.dreamBonus[outcome.stat] || 0) + outcome.value;
  }

  d.activeDream = null;
  d.lastDreamAt = Date.now();
  d.dreamCount += 1;
  d.log.unshift({
    dreamId: dream.id,
    title: dream.title,
    choiceId,
    choiceText: choice.text,
    outcomeText: outcome.text || outcome.msg || '',
    when: Date.now(),
  });
  if (d.log.length > 100) d.log.length = 100;

  return {
    success:true,
    msg:`${outcome.text || outcome.msg || ''}`,
    outcome,
  };
}

function getActiveBonuses(player) {
  return player.dreamBonus || {};
}

module.exports = {
  DREAMS,
  SLEEP_COOLDOWN_HOURS,
  getStatus,
  sleep,
  choose,
  getActiveBonuses,
};
