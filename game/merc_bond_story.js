/**
 * merc_bond_story.js — 용병 유대 스토리 퀘스트 시스템
 * 유대도 100/300/600/900 달성 시 스토리 퀘스트 발동, 분기 선택으로 성장 결정
 */

const BOND_MILESTONES = [100, 300, 600, 900];

// ═══════════════════════════════════════════════════
//  유대 스토리 데이터 — 13 성격 × 4 단계
// ═══════════════════════════════════════════════════
const BOND_STORIES = {
  warlike: {
    100: {
      title: '전사의 시험',
      dialogue: [
        '용병이 당신에게 다가온다.',
        '"주인, 나는 더 강한 적이 필요하다. 함께 사냥을 나가자!"',
      ],
      choiceA: { text: '좋아, 필드 보스를 사냥하자!', effect: { atk: 5, loyalty: 20 }, unlock: '분노의 일격', unlockDesc: 'HP 30% 이하 시 ATK×2' },
      choiceB: { text: '아직 이르다, 더 훈련하자.', effect: { def: 3, loyalty: 10 }, unlock: '인내의 반격', unlockDesc: '피격 시 50% 확률 반격' },
    },
    300: {
      title: '피의 서약',
      dialogue: [
        '용병이 피 묻은 검을 들어 보인다.',
        '"이 검으로 수백 명을 베었다. 하지만 주인과 함께라면 수천도 가능하지."',
        '"나와 피의 서약을 맺겠는가?"',
      ],
      choiceA: { text: '서약을 받아들인다.', effect: { atk: 8, hp: 50, loyalty: 25 }, unlock: '혈전사', unlockDesc: '킬 시 HP 5% 회복' },
      choiceB: { text: '서약 대신 동료로서의 약속을 한다.', effect: { def: 5, spd: 3, loyalty: 15 }, unlock: '전우의 맹세', unlockDesc: '파티원 근처 시 ATK/DEF +10%' },
    },
    600: {
      title: '전쟁의 갈림길',
      dialogue: [
        '전장에서 돌아온 용병의 눈빛이 변했다.',
        '"주인... 나는 깨달았다. 전쟁은 끝이 없다."',
        '"파괴의 길을 걷겠는가, 아니면 전쟁을 끝낼 힘을 찾겠는가?"',
      ],
      choiceA: { text: '파괴의 길이다! 모든 적을 쓸어버리자!', effect: { atk: 15, loyalty: 20 }, unlock: '전쟁광', unlockDesc: '연속 킬 시 ATK 중첩 +5%', personalityShift: 'mad' },
      choiceB: { text: '전쟁을 끝낼 힘을 함께 찾자.', effect: { atk: 8, def: 8, loyalty: 30 }, unlock: '종전자', unlockDesc: '보스전 시 전체 파티 ATK +15%', personalityShift: 'noble' },
    },
    900: {
      title: '최후의 도전',
      dialogue: [
        '용병이 검을 겨눈다.',
        '"나를 막을 자는 없다... 주인, 당신조차도!"',
        '"증명하라. 내가 따를 가치가 있는 자인지!"',
      ],
      choiceA: { text: '검을 들어 결투를 받아들인다.', effect: { atk: 20, spd: 10, loyalty: 50 }, unlock: '패왕의 기세', unlockDesc: '전투 시작 시 적 전체 DEF -20%', title: '패왕의 주인' },
      choiceB: { text: '검을 내려놓고 신뢰로 답한다.', effect: { def: 15, hp: 100, loyalty: 40 }, unlock: '불굴의 유대', unlockDesc: '치명타 피격 시 HP 1로 생존 (1회)', title: '전사의 벗' },
    },
  },

  guardian: {
    100: {
      title: '수호의 맹세',
      dialogue: [
        '용병이 무릎을 꿇는다.',
        '"주인, 당신을 지키는 것이 나의 사명입니다. 제 방패를 받아주십시오."',
      ],
      choiceA: { text: '방패를 받고 함께 전선에 선다.', effect: { def: 5, loyalty: 20 }, unlock: '철벽 방어', unlockDesc: '파티원 피격 시 대신 맞기' },
      choiceB: { text: '방패 대신 어깨를 나란히 한다.', effect: { hp: 30, loyalty: 15 }, unlock: '성스러운 보호막', unlockDesc: '30초 무적 보호막 (쿨 5분)' },
    },
    300: {
      title: '시련의 밤',
      dialogue: [
        '야습을 받은 캠프. 용병이 홀로 적을 막아서고 있다.',
        '"물러서십시오, 주인! 여기는 제가 막겠습니다!"',
        '"...설마, 함께 싸우시겠다는 겁니까?"',
      ],
      choiceA: { text: '함께 싸운다. 혼자 보낼 수 없다.', effect: { atk: 5, def: 5, loyalty: 25 }, unlock: '공동 방어선', unlockDesc: '주인 근처 시 DEF +20%' },
      choiceB: { text: '후방에서 지원 사격을 한다.', effect: { def: 8, loyalty: 15 }, unlock: '수호 결계', unlockDesc: '피격 시 10% 확률 피해 무효화' },
    },
    600: {
      title: '수호자의 딜레마',
      dialogue: [
        '동료가 적에게 잡혔다. 구하러 가면 주인이 위험해진다.',
        '"주인... 저는 둘 다 지킬 수 없습니다."',
        '"누구를 먼저 지켜야 합니까?"',
      ],
      choiceA: { text: '동료를 구하라. 나는 스스로 지킨다.', effect: { def: 12, loyalty: 30 }, unlock: '만인의 방패', unlockDesc: '파티 전체 DEF +10%', personalityShift: 'kind' },
      choiceB: { text: '주인인 내 곁을 지켜라.', effect: { def: 15, hp: 80, loyalty: 20 }, unlock: '절대 수호', unlockDesc: '주인 HP 30% 이하 시 모든 피해 대신 받기', personalityShift: 'loyal' },
    },
    900: {
      title: '최후의 방패',
      dialogue: [
        '거대한 적 앞에서 용병의 방패에 금이 간다.',
        '"이 방패가 부서져도... 제 몸이 곧 방패입니다."',
        '"주인, 제가 마지막까지 지켜드리겠습니다."',
      ],
      choiceA: { text: '네 희생을 받아들인다.', effect: { def: 25, loyalty: 50 }, unlock: '불멸의 방패', unlockDesc: '전투 중 1회 파티 전체 무적 (3초)', title: '수호신의 주인' },
      choiceB: { text: '함께 살아남는다. 그것이 진정한 수호다.', effect: { def: 15, hp: 150, loyalty: 40 }, unlock: '생환의 맹세', unlockDesc: '파티원 HP 0 시 20% 확률 부활', title: '함께하는 방패' },
    },
  },

  cunning: {
    100: {
      title: '첫 번째 속임수',
      dialogue: [
        '용병이 의미심장하게 웃는다.',
        '"주인, 정면 돌파만이 능사가 아니죠. 제가 좋은 방법을 알려드릴까요?"',
      ],
      choiceA: { text: '좋아, 네 방식대로 해보자.', effect: { spd: 3, loyalty: 15 }, unlock: '기습의 달인', unlockDesc: '선공 시 크리티컬 확률 +30%' },
      choiceB: { text: '정정당당하게 가자.', effect: { atk: 3, loyalty: 10 }, unlock: '약점 간파', unlockDesc: '적 DEF의 20% 무시' },
    },
    300: {
      title: '이중 계약',
      dialogue: [
        '적 세력에서 용병에게 접근했다.',
        '"주인, 적들이 저에게 이중 스파이 노릇을 하라더군요."',
        '"...이걸 역이용할 수 있습니다."',
      ],
      choiceA: { text: '역스파이 작전을 실행하라.', effect: { spd: 5, atk: 3, loyalty: 20 }, unlock: '이중첩자', unlockDesc: '적 정보 획득 시 보상 2배' },
      choiceB: { text: '위험하다. 거절하라.', effect: { def: 5, loyalty: 25 }, unlock: '신중한 계략', unlockDesc: '함정 감지 확률 100%' },
    },
    600: {
      title: '사기꾼의 진심',
      dialogue: [
        '용병이 처음으로 진지한 얼굴을 한다.',
        '"주인... 사실 저는 과거에 동료를 배신한 적이 있습니다."',
        '"하지만 당신에게만은... 솔직해지고 싶습니다."',
      ],
      choiceA: { text: '과거는 과거다. 지금의 너를 믿는다.', effect: { atk: 8, spd: 8, loyalty: 35 }, unlock: '진심의 독', unlockDesc: '독 데미지 2배 + 치유 불가 부여', personalityShift: 'honest' },
      choiceB: { text: '교활함이 네 무기다. 버릴 필요 없다.', effect: { spd: 12, loyalty: 20 }, unlock: '천의 얼굴', unlockDesc: '전투 시 랜덤 디버프 부여', personalityShift: 'mad' },
    },
    900: {
      title: '최후의 사기',
      dialogue: [
        '죽음의 문턱에서 용병이 웃는다.',
        '"주인, 제가 마지막 속임수를 보여드릴까요?"',
        '"...죽음마저 속여보겠습니다."',
      ],
      choiceA: { text: '보여줘, 네 최고의 속임수를.', effect: { spd: 15, atk: 10, loyalty: 45 }, unlock: '사기사', unlockDesc: '사망 시 50% 확률로 HP 30% 부활', title: '사기의 제왕' },
      choiceB: { text: '속이지 마. 함께 살아남자.', effect: { def: 10, hp: 80, loyalty: 50 }, unlock: '진실의 칼날', unlockDesc: '크리티컬 시 적 버프 전부 해제', title: '교활한 자의 진심' },
    },
  },

  honest: {
    100: {
      title: '정직한 고백',
      dialogue: [
        '용병이 조용히 입을 연다.',
        '"주인, 솔직히 말씀드리겠습니다. 저는 아직 많이 부족합니다."',
        '"하지만 거짓 없이 성장하겠습니다."',
      ],
      choiceA: { text: '그 정직함이 네 최대 무기다.', effect: { atk: 3, def: 3, loyalty: 20 }, unlock: '정직한 일격', unlockDesc: '크리티컬 시 추가 데미지 +20%' },
      choiceB: { text: '부족함을 인정하는 것이 시작이다.', effect: { hp: 30, loyalty: 15 }, unlock: '강철 의지', unlockDesc: '디버프 지속시간 -50%' },
    },
    300: {
      title: '거짓말쟁이의 유혹',
      dialogue: [
        '부정한 거래를 제안받았다.',
        '"주인, 이 거래는 거짓입니다. 이득이 크지만..."',
        '"정의롭지 못합니다."',
      ],
      choiceA: { text: '네 판단을 믿는다. 거절하자.', effect: { def: 5, loyalty: 30 }, unlock: '정의구현', unlockDesc: '언데드/악마 계열 추가 데미지 +25%' },
      choiceB: { text: '때로는 유연해질 필요가 있다.', effect: { atk: 5, spd: 3, loyalty: 10 }, unlock: '현실주의', unlockDesc: '골드 획득 +15%' },
    },
    600: {
      title: '진실의 무게',
      dialogue: [
        '동료의 배신을 목격했다.',
        '"주인, 저는 진실을 말해야 합니다. 하지만 그렇게 하면 파티가 깨집니다."',
        '"그래도... 진실을 말해야 할까요?"',
      ],
      choiceA: { text: '진실을 밝혀라. 거짓 위에 세운 건 무너진다.', effect: { atk: 10, def: 5, loyalty: 35 }, unlock: '파사현정', unlockDesc: '은신/투명 적 자동 감지', personalityShift: 'noble' },
      choiceB: { text: '때를 기다려라. 지혜롭게 행동하자.', effect: { spd: 8, def: 8, loyalty: 25 }, unlock: '참을 인', unlockDesc: '3턴 이상 전투 시 ATK/DEF +20%', personalityShift: 'scholar' },
    },
    900: {
      title: '진실의 검',
      dialogue: [
        '용병의 검에 맑은 빛이 깃든다.',
        '"주인, 제 검은 거짓을 벨 수 있게 되었습니다."',
        '"이 힘으로... 세상의 모든 거짓을 바로잡겠습니다."',
      ],
      choiceA: { text: '가거라, 정의의 검이여.', effect: { atk: 18, loyalty: 50 }, unlock: '심판의 칼날', unlockDesc: '보스에게 데미지 +30%', title: '정의의 주인' },
      choiceB: { text: '함께 하자. 정의는 혼자 세우는 게 아니다.', effect: { atk: 10, def: 10, hp: 50, loyalty: 45 }, unlock: '진실의 빛', unlockDesc: '파티 전체 명중률 +15%', title: '진실의 동반자' },
    },
  },

  greedy: {
    100: {
      title: '첫 번째 보수',
      dialogue: [
        '용병이 눈을 반짝이며 다가온다.',
        '"주인! 이번 전리품 분배... 제 몫 좀 더 주시면 안 됩니까?"',
      ],
      choiceA: { text: '특별 보너스를 지급한다.', effect: { loyalty: 25 }, unlock: '황금 촉수', unlockDesc: '골드 드롭 +50%', cost: { gold: 500 } },
      choiceB: { text: '계약대로 받아라.', effect: { atk: 3, loyalty: 5 }, unlock: '탐욕의 대가', unlockDesc: 'ATK +30% 단 충성도 감소 2배' },
    },
    300: {
      title: '숨겨진 보물',
      dialogue: [
        '용병이 낡은 지도를 꺼낸다.',
        '"주인, 이 지도대로 가면 엄청난 보물이... 하지만 위험합니다."',
        '"보물의 절반은 제 것입니다. 어떻습니까?"',
      ],
      choiceA: { text: '반반으로 나누자. 출발하자!', effect: { atk: 5, loyalty: 20 }, unlock: '보물 사냥꾼', unlockDesc: '레어 드롭 확률 +20%' },
      choiceB: { text: '보물보다 안전이 우선이다.', effect: { def: 5, hp: 30, loyalty: 10 }, unlock: '가치 판별', unlockDesc: '아이템 감정 시 숨겨진 옵션 발견' },
    },
    600: {
      title: '탐욕의 시험',
      dialogue: [
        '거대한 보물 더미 앞에서 용병의 눈이 이상하게 빛난다.',
        '"이 보물의 절반은 내 것이다!"',
        '"...아니, 전부... 전부 내 것이 되어야 해!"',
      ],
      choiceA: { text: '정신 차려! 욕심에 눈이 멀었구나!', effect: { def: 10, loyalty: 30 }, unlock: '절제의 미덕', unlockDesc: '골드 소비 -20%', personalityShift: 'honest' },
      choiceB: { text: '좋아, 원하는 만큼 가져가라.', effect: { atk: 12, loyalty: 15 }, unlock: '끝없는 탐욕', unlockDesc: '킬 시 골드 +100% 단 피해 +10% 받음', personalityShift: 'mad' },
    },
    900: {
      title: '황금의 왕',
      dialogue: [
        '용병이 금화 더미 위에 앉아 있다.',
        '"주인... 이제야 알겠습니다. 진정한 보물은..."',
        '"...역시 돈이죠! 하하하!"',
        '"농담입니다. 당신과의 인연이 가장 값진 보물입니다."',
      ],
      choiceA: { text: '함께 부자가 되자!', effect: { atk: 10, spd: 10, loyalty: 45 }, unlock: '미다스의 손', unlockDesc: '공격 적중 시 골드 획득', title: '황금왕의 파트너' },
      choiceB: { text: '돈보다 소중한 것을 보여주마.', effect: { def: 15, hp: 80, loyalty: 50 }, unlock: '진정한 가치', unlockDesc: '골드 소비 시 일정 확률 미소비', title: '탐욕을 넘은 자' },
    },
  },

  scholar: {
    100: {
      title: '첫 번째 강의',
      dialogue: [
        '용병이 두꺼운 책을 펼친다.',
        '"주인, 전투도 중요하지만 지식이 진정한 힘입니다."',
        '"제가 가르쳐 드릴까요?"',
      ],
      choiceA: { text: '좋아, 배워보겠다.', effect: { def: 3, loyalty: 15 }, unlock: '마력 감응', unlockDesc: '마법 데미지 +15%' },
      choiceB: { text: '실전에서 배우는 게 낫지 않나?', effect: { atk: 3, loyalty: 10 }, unlock: '실전 학습', unlockDesc: '전투 경험치 +10%' },
    },
    300: {
      title: '금서의 유혹',
      dialogue: [
        '용병이 금지된 마법서를 발견했다.',
        '"이 책에는 엄청난 지식이... 하지만 금서입니다."',
        '"열어볼까요?"',
      ],
      choiceA: { text: '지식에 금기란 없다.', effect: { atk: 8, loyalty: 15 }, unlock: '금단의 지식', unlockDesc: '마법 스킬 쿨타임 -20%' },
      choiceB: { text: '금서에는 이유가 있다. 봉인하라.', effect: { def: 8, loyalty: 25 }, unlock: '현자의 판단', unlockDesc: '마법 저항 +25%' },
    },
    600: {
      title: '진리의 탐구',
      dialogue: [
        '용병이 며칠째 연구에 몰두하고 있다.',
        '"주인... 저는 진리에 가까워졌습니다."',
        '"하지만 이 길의 끝에는 광기가 기다리고 있을지도..."',
      ],
      choiceA: { text: '끝까지 탐구하라. 진리를 두려워하지 마라.', effect: { atk: 12, loyalty: 20 }, unlock: '진리의 눈', unlockDesc: '적 약점 자동 분석 +20% 추가 데미지', personalityShift: 'mad' },
      choiceB: { text: '쉬어가자. 지식은 삶을 위한 것이다.', effect: { def: 8, hp: 60, loyalty: 30 }, unlock: '균형의 지혜', unlockDesc: '모든 스탯 +5%', personalityShift: 'kind' },
    },
    900: {
      title: '현자의 경지',
      dialogue: [
        '용병의 눈에서 빛이 난다.',
        '"주인, 저는 마침내 깨달았습니다."',
        '"모든 지식은 하나로 통합니다. 그리고 그 중심에는..."',
        '"...당신과의 인연이 있습니다."',
      ],
      choiceA: { text: '함께 세상의 비밀을 풀어보자.', effect: { atk: 12, def: 12, loyalty: 50 }, unlock: '전지의 서', unlockDesc: '모든 적 정보 완전 공개', title: '현자의 동반자' },
      choiceB: { text: '지식을 나눠 세상을 이롭게 하자.', effect: { hp: 100, def: 10, loyalty: 45 }, unlock: '지혜의 샘', unlockDesc: '파티 전체 경험치 +20%', title: '지혜의 수호자' },
    },
  },

  cheerful: {
    100: {
      title: '즐거운 첫 만남',
      dialogue: [
        '용병이 활짝 웃으며 노래를 부른다.',
        '"주인~! 오늘도 좋은 날이네요! 함께 모험하니까 더 즐거워요!"',
      ],
      choiceA: { text: '같이 노래하자!', effect: { spd: 3, loyalty: 20 }, unlock: '전투의 노래', unlockDesc: '파티 전체 SPD +10%' },
      choiceB: { text: '그 에너지를 전투에 쏟아봐.', effect: { atk: 3, loyalty: 15 }, unlock: '즐거운 일격', unlockDesc: '크리티컬 시 사기 버프 부여' },
    },
    300: {
      title: '슬픔의 밤',
      dialogue: [
        '항상 밝던 용병이 처음으로 울고 있다.',
        '"...죄송해요, 주인. 오늘만... 오늘만 울게 해주세요."',
        '"사실 저도 슬플 때가 있어요."',
      ],
      choiceA: { text: '옆에 앉아 함께 있어준다.', effect: { def: 5, loyalty: 30 }, unlock: '진심의 미소', unlockDesc: '파티원 사기 저하 면역' },
      choiceB: { text: '내일은 다시 웃을 수 있을 거야.', effect: { atk: 3, spd: 3, loyalty: 20 }, unlock: '불굴의 미소', unlockDesc: 'HP 50% 이하에서 회피율 +20%' },
    },
    600: {
      title: '광대의 가면',
      dialogue: [
        '용병의 밝은 표정 뒤에 숨겨진 과거가 드러났다.',
        '"주인... 사실 저는 항상 웃는 게 아니에요."',
        '"웃지 않으면 무너질 것 같아서..."',
      ],
      choiceA: { text: '가면을 벗어도 괜찮아. 있는 그대로의 너를 원해.', effect: { atk: 8, def: 8, loyalty: 35 }, unlock: '진짜 웃음', unlockDesc: '전투 시작 시 파티 전체 버프', personalityShift: 'honest' },
      choiceB: { text: '웃음이 네 힘이야. 그걸 무기로 만들자.', effect: { spd: 12, loyalty: 20 }, unlock: '광대의 춤', unlockDesc: '회피 성공 시 반격', personalityShift: 'cunning' },
    },
    900: {
      title: '축제의 왕',
      dialogue: [
        '용병이 모두를 위한 축제를 열었다.',
        '"주인! 오늘은 우리의 날이에요!"',
        '"지금까지의 모든 여정이... 정말 즐거웠어요."',
        '"앞으로도 계속 함께해요!"',
      ],
      choiceA: { text: '영원히 함께하자!', effect: { atk: 10, spd: 15, loyalty: 50 }, unlock: '축제의 불꽃', unlockDesc: '킬 시 주변 적에게 폭발 데미지', title: '축제의 주인' },
      choiceB: { text: '네 웃음이 최고의 무기야.', effect: { def: 10, hp: 80, loyalty: 45 }, unlock: '행복 전파', unlockDesc: '파티 전체 모든 스탯 +5%', title: '웃음의 동반자' },
    },
  },

  gloomy: {
    100: {
      title: '어둠 속의 대화',
      dialogue: [
        '용병이 구석에 홀로 앉아 있다.',
        '"...주인이시군요. 저한테 무슨 용건이..."',
        '"...그냥 같이 있어주시는 건가요?"',
      ],
      choiceA: { text: '말없이 옆에 앉는다.', effect: { loyalty: 25 }, unlock: '어둠의 위안', unlockDesc: '야간 전투 시 DEF +20%' },
      choiceB: { text: '너도 파티의 일원이야. 함께하자.', effect: { atk: 3, loyalty: 15 }, unlock: '고독한 칼날', unlockDesc: '단독 전투 시 ATK +25%' },
    },
    300: {
      title: '달빛 아래의 시',
      dialogue: [
        '용병이 달빛 아래서 시를 쓰고 있다.',
        '"...이건 죽음에 대한 시입니다."',
        '"아름답지 않나요? 모든 것의 끝이..."',
      ],
      choiceA: { text: '아름다운 시다. 더 들려줘.', effect: { def: 5, loyalty: 25 }, unlock: '비가(悲歌)', unlockDesc: '아군 사망 시 ATK/SPD +30% (60초)' },
      choiceB: { text: '삶의 시를 써보는 건 어때?', effect: { hp: 30, loyalty: 20 }, unlock: '새벽의 시', unlockDesc: '전투 후 HP 10% 자동 회복' },
    },
    600: {
      title: '절망의 심연',
      dialogue: [
        '용병이 깊은 절망에 빠져 있다.',
        '"주인... 이 세상에 의미가 있을까요?"',
        '"모든 것이 사라지고, 잊혀지고..."',
        '"저도... 사라져야 하는 것 아닐까요?"',
      ],
      choiceA: { text: '사라지지 마. 네가 필요해.', effect: { atk: 10, def: 5, loyalty: 40 }, unlock: '존재의 이유', unlockDesc: '주인 근처 시 모든 스탯 +10%', personalityShift: 'loyal' },
      choiceB: { text: '어둠 속에서 빛나는 것도 있어.', effect: { atk: 12, loyalty: 25 }, unlock: '심연의 힘', unlockDesc: 'HP가 낮을수록 ATK 증가 (최대 +50%)', personalityShift: 'wild' },
    },
    900: {
      title: '어둠과의 화해',
      dialogue: [
        '용병이 고요히 미소 짓는다. 처음 보는 표정이다.',
        '"주인... 어둠이 두렵지 않게 되었습니다."',
        '"당신이 제 빛이었으니까요."',
      ],
      choiceA: { text: '네 어둠도 너의 일부야.', effect: { atk: 18, loyalty: 50 }, unlock: '칠흑의 날개', unlockDesc: '그림자 분신 소환 (본체 ATK 50%)', title: '어둠의 이해자' },
      choiceB: { text: '함께 새벽을 맞이하자.', effect: { hp: 100, def: 12, loyalty: 45 }, unlock: '여명의 빛', unlockDesc: '전투 시작 시 파티 HP 15% 회복', title: '새벽의 동반자' },
    },
  },

  wild: {
    100: {
      title: '야수의 본능',
      dialogue: [
        '용병이 숲에서 짐승처럼 움직이고 있다.',
        '"크르르... 주인, 이 숲의 냄새를 맡아봐. 사냥감이 가까워."',
      ],
      choiceA: { text: '좋아, 함께 사냥하자!', effect: { atk: 5, loyalty: 20 }, unlock: '야수의 발톱', unlockDesc: '연속 공격 확률 +20%' },
      choiceB: { text: '본능을 다스려라.', effect: { def: 3, spd: 3, loyalty: 10 }, unlock: '야성의 감각', unlockDesc: '적 기습 무효화' },
    },
    300: {
      title: '늑대의 울음',
      dialogue: [
        '보름달 아래 용병이 울부짖는다.',
        '"아우우우! ...죄송합니다, 주인. 이건 제가 통제할 수 없는..."',
        '"달이 뜨면 야수의 피가 끓어오릅니다."',
      ],
      choiceA: { text: '두려워하지 마. 그것도 네 힘이다.', effect: { atk: 8, loyalty: 25 }, unlock: '만월의 광기', unlockDesc: '야간 전투 시 ATK +30%' },
      choiceB: { text: '함께 통제하는 법을 배우자.', effect: { def: 5, spd: 5, loyalty: 20 }, unlock: '조화의 본능', unlockDesc: 'SPD +15% 상시' },
    },
    600: {
      title: '인간과 야수 사이',
      dialogue: [
        '용병의 몸이 변하기 시작한다.',
        '"주인... 저는 점점 인간이 아니게 되어가고 있습니다."',
        '"야수로 완전히 변하면... 당신을 알아볼 수 있을까요?"',
      ],
      choiceA: { text: '야수의 힘을 받아들여라.', effect: { atk: 15, loyalty: 20 }, unlock: '완전한 야수화', unlockDesc: '변신 시 ATK/SPD +40%, DEF -20%', personalityShift: 'mad' },
      choiceB: { text: '인간으로 남아라. 내가 도와주마.', effect: { atk: 8, def: 8, loyalty: 35 }, unlock: '야수 인간', unlockDesc: '인간/야수 상태 전환 가능', personalityShift: 'loyal' },
    },
    900: {
      title: '숲의 왕',
      dialogue: [
        '거대한 숲의 정령이 용병을 인정했다.',
        '"주인... 숲이 저를 왕으로 부릅니다."',
        '"하지만 저는 당신의 용병이고 싶습니다."',
      ],
      choiceA: { text: '숲의 왕이 되어라. 우리의 연결은 변하지 않는다.', effect: { atk: 20, spd: 10, loyalty: 50 }, unlock: '숲의 군주', unlockDesc: '야외 전투 시 동물 소환', title: '숲의 왕의 주인' },
      choiceB: { text: '왕관보다 동료가 더 소중해.', effect: { atk: 12, def: 12, loyalty: 45 }, unlock: '자연의 축복', unlockDesc: '전투 중 HP/MP 자연 회복', title: '야수의 동반자' },
    },
  },

  noble: {
    100: {
      title: '귀족의 품격',
      dialogue: [
        '용병이 우아하게 인사한다.',
        '"주인, 예절을 모르는 자들과는 함께할 수 없습니다."',
        '"당신은... 다행히 품위가 있으시군요."',
      ],
      choiceA: { text: '정중하게 답례한다.', effect: { def: 3, loyalty: 20 }, unlock: '귀족의 위엄', unlockDesc: '약한 적 자동 위협 (전투 회피)' },
      choiceB: { text: '품위보다 실력이 중요하다.', effect: { atk: 5, loyalty: 10 }, unlock: '실력 증명', unlockDesc: '크리티컬 데미지 +15%' },
    },
    300: {
      title: '몰락한 가문',
      dialogue: [
        '용병의 과거가 밝혀졌다. 몰락한 귀족 가문의 후손.',
        '"네, 맞습니다. 저는 한때 백작가의 자제였습니다."',
        '"지금은 용병에 불과하지만..."',
      ],
      choiceA: { text: '과거 따위 상관없다. 지금의 너를 본다.', effect: { atk: 5, loyalty: 30 }, unlock: '잃어버린 가문의 검술', unlockDesc: '검 계열 무기 데미지 +20%' },
      choiceB: { text: '가문을 다시 세우자.', effect: { def: 8, loyalty: 20 }, unlock: '귀족의 자부심', unlockDesc: '파티 전체 DEF +5%' },
    },
    600: {
      title: '왕좌의 유혹',
      dialogue: [
        '누군가 용병에게 왕위 계승권을 제안했다.',
        '"주인... 저는 왕이 될 수 있습니다."',
        '"하지만 그러면 당신의 용병이 아니게 됩니다."',
      ],
      choiceA: { text: '왕이 되어라. 너의 꿈을 응원한다.', effect: { def: 12, loyalty: 25 }, unlock: '왕의 카리스마', unlockDesc: '파티 전체 모든 스탯 +8%', personalityShift: 'guardian' },
      choiceB: { text: '왕좌보다 함께하는 것을 택하라.', effect: { atk: 10, loyalty: 40 }, unlock: '포기한 왕관', unlockDesc: '주인 위기 시 무조건 가호 (피해 -50%)', personalityShift: 'loyal' },
    },
    900: {
      title: '진정한 귀족',
      dialogue: [
        '용병이 당당히 선언한다.',
        '"혈통이 귀족을 만드는 것이 아닙니다."',
        '"마음이 귀족을 만드는 것입니다."',
        '"주인, 당신이 저에게 그것을 알려주셨습니다."',
      ],
      choiceA: { text: '네가 진정한 귀족이다.', effect: { atk: 12, def: 12, loyalty: 50 }, unlock: '노블레스 오블리주', unlockDesc: '약한 아군 보호 + 강화 동시 발동', title: '귀공자의 주인' },
      choiceB: { text: '함께 새로운 길을 만들자.', effect: { spd: 12, hp: 80, loyalty: 45 }, unlock: '새로운 귀족도', unlockDesc: '골드 획득 시 파티 전체 힐', title: '품격의 동반자' },
    },
  },

  mad: {
    100: {
      title: '광기의 시작',
      dialogue: [
        '용병이 이상하게 웃고 있다.',
        '"히히... 주인, 피 냄새가 나요. 좋은 냄새..."',
      ],
      choiceA: { text: '...전투에 집중해라.', effect: { atk: 5, loyalty: 15 }, unlock: '광기의 칼날', unlockDesc: '공격 시 5% 확률 3연타' },
      choiceB: { text: '진정하고 숨을 쉬어봐.', effect: { def: 3, loyalty: 20 }, unlock: '억제된 광기', unlockDesc: 'HP 50% 이하 시 DEF +20%' },
    },
    300: {
      title: '속삭이는 목소리',
      dialogue: [
        '용병이 머리를 감싸쥐고 있다.',
        '"목소리가... 목소리가 들려요, 주인."',
        '"파괴하라고... 모든 것을 부수라고..."',
      ],
      choiceA: { text: '그 목소리에 귀 기울여봐.', effect: { atk: 10, loyalty: 15 }, unlock: '심연의 속삭임', unlockDesc: '공격 시 적 공포 부여 (10%)' },
      choiceB: { text: '내 목소리에 집중해. 여기 있잖아.', effect: { def: 5, hp: 30, loyalty: 25 }, unlock: '정신 지배', unlockDesc: '정신 계열 디버프 면역' },
    },
    600: {
      title: '광기의 심연',
      dialogue: [
        '용병의 눈이 붉게 변했다.',
        '"주인... 아직 저를 알아보시겠어요?"',
        '"모든 것이 붉게 보여요... 아름답지 않나요?"',
      ],
      choiceA: { text: '광기를 받아들여라. 그것이 네 힘이다.', effect: { atk: 18, loyalty: 15 }, unlock: '완전한 광기', unlockDesc: '전투 시 ATK +40% 단 아군 오인 공격 10%', personalityShift: null },
      choiceB: { text: '돌아와! 넌 아직 인간이야!', effect: { atk: 8, def: 8, loyalty: 35 }, unlock: '이성의 끈', unlockDesc: '광기 발동 시 제어 가능 (ATK +25%, 오인 없음)', personalityShift: 'warlike' },
    },
    900: {
      title: '혼돈의 끝',
      dialogue: [
        '용병이 파괴의 힘으로 가득 차 있다.',
        '"모든 것을 태워버리자... 아름답지 않은가?"',
        '"주인... 당신도 함께... 이 아름다운 파괴를..."',
      ],
      choiceA: { text: '좋아. 함께 세상을 불태우자.', effect: { atk: 25, loyalty: 40 }, unlock: '종말의 불꽃', unlockDesc: '전투 종료 시 광역 폭발 (적 전체 30% 데미지)', title: '혼돈의 제왕' },
      choiceB: { text: '아니. 이건 네가 원하는 게 아니야.', effect: { atk: 12, def: 12, hp: 50, loyalty: 50 }, unlock: '광기의 제어자', unlockDesc: '광기 버프 완전 제어 (ATK +30%, 부작용 없음)', title: '광기를 다스리는 자' },
    },
  },

  loyal: {
    100: {
      title: '변함없는 충성',
      dialogue: [
        '용병이 묵묵히 뒤를 따른다.',
        '"주인, 어디든 따르겠습니다. 명령만 하십시오."',
      ],
      choiceA: { text: '명령이 아닌 부탁이다. 함께 가자.', effect: { def: 3, loyalty: 25 }, unlock: '충성의 방패', unlockDesc: '주인 피격 시 30% 확률 대신 맞기' },
      choiceB: { text: '좋아, 선봉에 서라.', effect: { atk: 5, loyalty: 15 }, unlock: '선봉의 칼', unlockDesc: '첫 번째 공격 데미지 +30%' },
    },
    300: {
      title: '시험당하는 충성',
      dialogue: [
        '적이 용병에게 배신을 제안했다.',
        '"주인, 적이 제게 열 배의 보수를 제안했습니다."',
        '"물론 거절했습니다만... 보고드려야 한다고 생각했습니다."',
      ],
      choiceA: { text: '보고해줘서 고맙다. 역시 너를 믿길 잘했어.', effect: { def: 5, loyalty: 30 }, unlock: '철의 충성', unlockDesc: '배신 확률 0% 고정' },
      choiceB: { text: '당연한 거 아닌가? 대단한 건 아니야.', effect: { atk: 5, loyalty: 15 }, unlock: '당연한 충성', unlockDesc: '주인 근처 시 ATK +15%' },
    },
    600: {
      title: '충성의 무게',
      dialogue: [
        '주인을 지키기 위해 용병이 크게 부상당했다.',
        '"이 정도는... 아무것도 아닙니다, 주인."',
        '"주인을 위해서라면... 이 몸 하나쯤..."',
      ],
      choiceA: { text: '무리하지 마! 네 목숨도 소중하다!', effect: { def: 12, hp: 80, loyalty: 35 }, unlock: '상호 수호', unlockDesc: '주인-용병 상호 피해 분담 (30%)', personalityShift: 'guardian' },
      choiceB: { text: '네 충성을 기억하겠다.', effect: { atk: 10, def: 5, loyalty: 30 }, unlock: '충성의 보답', unlockDesc: '충성도에 비례하여 ATK 보너스', personalityShift: null },
    },
    900: {
      title: '최후의 충성',
      dialogue: [
        '용병이 당신 앞에 무릎 꿇는다.',
        '"주인을 위해서라면 목숨이라도..."',
        '"아니, 목숨을 바치는 것이 아닙니다."',
        '"영원히 곁에서 함께하는 것. 그것이 진정한 충성입니다."',
      ],
      choiceA: { text: '영원한 맹세를 받아들인다.', effect: { atk: 15, def: 15, loyalty: 50 }, unlock: '영원한 충성', unlockDesc: '사망 시 주인에게 10초간 무적 부여 후 부활', title: '충성의 주인' },
      choiceB: { text: '맹세가 아닌 친구로서 함께하자.', effect: { atk: 10, def: 10, hp: 100, loyalty: 50 }, unlock: '영원한 동료', unlockDesc: '주인과 함께 시 모든 스탯 +12%', title: '충직한 벗' },
    },
  },

  kind: {
    100: {
      title: '작은 친절',
      dialogue: [
        '용병이 부상당한 적병을 치료하고 있다.',
        '"주인, 적이라도 죽어가는 자를 그냥 두면 안 됩니다."',
      ],
      choiceA: { text: '네 마음이 아름답구나.', effect: { loyalty: 25 }, unlock: '치유의 손길', unlockDesc: '전투 중 아군 HP 회복 (매 턴 3%)' },
      choiceB: { text: '적에게 자비를 베풀 여유가 있나?', effect: { atk: 3, loyalty: 10 }, unlock: '자비의 대가', unlockDesc: '적 처치 시 HP 10% 회복' },
    },
    300: {
      title: '구원의 선택',
      dialogue: [
        '마을이 불타고 있다. 용병이 주민들을 구하러 뛰어든다.',
        '"주인! 저 아이를 구해야 합니다!"',
        '"전투보다... 사람이 먼저입니다!"',
      ],
      choiceA: { text: '함께 구하러 가자!', effect: { def: 5, hp: 30, loyalty: 30 }, unlock: '구원자', unlockDesc: '아군 HP 30% 이하 시 자동 힐' },
      choiceB: { text: '위험하지만... 알았다. 가자.', effect: { atk: 3, def: 3, loyalty: 20 }, unlock: '희생의 불꽃', unlockDesc: '아군 보호 시 DEF +30%' },
    },
    600: {
      title: '자비의 한계',
      dialogue: [
        '용병이 적의 수장 앞에 서 있다. 수장은 항복을 구하고 있다.',
        '"주인... 이 자를 살려야 합니다. 자비를 베풀어야..."',
        '"하지만 이 자는... 수많은 사람을 죽였습니다."',
      ],
      choiceA: { text: '자비에도 한계가 있다. 심판하라.', effect: { atk: 12, loyalty: 20 }, unlock: '정의로운 분노', unlockDesc: '악 속성 적에게 ATK +35%', personalityShift: 'honest' },
      choiceB: { text: '그래도 살려줘라. 그것이 네 길이다.', effect: { def: 10, hp: 50, loyalty: 35 }, unlock: '무한한 자비', unlockDesc: '적 처치 시 전체 아군 힐', personalityShift: null },
    },
    900: {
      title: '성자의 길',
      dialogue: [
        '용병의 몸에서 따뜻한 빛이 난다.',
        '"주인... 저는 이 힘으로 모든 사람을 치유하고 싶습니다."',
        '"전쟁 없는 세상을... 꿈꿔도 될까요?"',
      ],
      choiceA: { text: '네 꿈을 함께 이루자.', effect: { def: 15, hp: 120, loyalty: 50 }, unlock: '성자의 축복', unlockDesc: '파티 전체 매 턴 HP 5% 회복 + 디버프 해제', title: '성자의 동반자' },
      choiceB: { text: '꿈은 꿈으로. 지금은 함께 싸우자.', effect: { atk: 12, def: 8, loyalty: 45 }, unlock: '자비로운 전사', unlockDesc: '힐 스킬 사용 시 다음 공격 +50%', title: '자비의 검' },
    },
  },
};

// ═══════════════════════════════════════════════════
//  유대 스토리 함수
// ═══════════════════════════════════════════════════

/**
 * 용병의 유대 스토리 발생 여부 확인
 * @returns {{ available: boolean, milestone: number|null, title: string|null }}
 */
function checkBondStory(player, mercUid) {
  const merc = _getMerc(player, mercUid);
  if (!merc) return { available: false, milestone: null, title: null };

  const personality = merc.personality || 'warlike';
  const stories = BOND_STORIES[personality];
  if (!stories) return { available: false, milestone: null, title: null };

  const completed = merc.bondStoriesCompleted || [];
  const bond = merc.bond || 0;

  for (const ms of BOND_MILESTONES) {
    if (bond >= ms && !completed.includes(ms) && stories[ms]) {
      return { available: true, milestone: ms, title: stories[ms].title };
    }
  }
  return { available: false, milestone: null, title: null };
}

/**
 * 유대 스토리 시작 — 대화와 선택지 반환
 */
function startBondStory(player, mercUid) {
  const merc = _getMerc(player, mercUid);
  if (!merc) return { ok: false, reason: '용병을 찾을 수 없습니다.' };

  const check = checkBondStory(player, mercUid);
  if (!check.available) return { ok: false, reason: '현재 진행 가능한 유대 스토리가 없습니다.' };

  const personality = merc.personality || 'warlike';
  const story = BOND_STORIES[personality][check.milestone];

  return {
    ok: true,
    mercUid,
    mercName: merc.name || mercUid,
    personality,
    milestone: check.milestone,
    title: story.title,
    dialogue: story.dialogue,
    choiceA: { text: story.choiceA.text },
    choiceB: { text: story.choiceB.text },
  };
}

/**
 * 유대 스토리 선택 적용
 * @param {'A'|'B'} choice
 */
function chooseBondStory(player, mercUid, choice) {
  if (choice !== 'A' && choice !== 'B') {
    return { ok: false, reason: '선택지는 A 또는 B만 가능합니다.' };
  }

  const merc = _getMerc(player, mercUid);
  if (!merc) return { ok: false, reason: '용병을 찾을 수 없습니다.' };

  const check = checkBondStory(player, mercUid);
  if (!check.available) return { ok: false, reason: '현재 진행 가능한 유대 스토리가 없습니다.' };

  const personality = merc.personality || 'warlike';
  const story = BOND_STORIES[personality][check.milestone];
  const chosen = choice === 'A' ? story.choiceA : story.choiceB;

  // 효과 적용
  const result = { ok: true, mercUid, milestone: check.milestone, choice, effects: [] };

  // 스탯 보너스 (영구)
  const eff = chosen.effect;
  if (eff.atk) { merc.bonusAtk = (merc.bonusAtk || 0) + eff.atk; result.effects.push(`ATK +${eff.atk}`); }
  if (eff.def) { merc.bonusDef = (merc.bonusDef || 0) + eff.def; result.effects.push(`DEF +${eff.def}`); }
  if (eff.hp)  { merc.bonusHp  = (merc.bonusHp  || 0) + eff.hp;  result.effects.push(`HP +${eff.hp}`); }
  if (eff.spd) { merc.bonusSpd = (merc.bonusSpd || 0) + eff.spd; result.effects.push(`SPD +${eff.spd}`); }
  if (eff.loyalty) { merc.bond = (merc.bond || 0) + eff.loyalty; result.effects.push(`충성도 +${eff.loyalty}`); }

  // 스킬 해금
  if (chosen.unlock) {
    if (!merc.bondSkills) merc.bondSkills = [];
    if (!merc.bondSkills.find(s => s.name === chosen.unlock)) {
      merc.bondSkills.push({ name: chosen.unlock, desc: chosen.unlockDesc || '', milestone: check.milestone });
      result.effects.push(`스킬 해금: ${chosen.unlock}`);
      result.unlockedSkill = { name: chosen.unlock, desc: chosen.unlockDesc || '' };
    }
  }

  // 성격 변화 (600 단계)
  if (chosen.personalityShift) {
    const oldP = merc.personality;
    merc.personality = chosen.personalityShift;
    result.effects.push(`성격 변화: ${oldP} → ${chosen.personalityShift}`);
    result.personalityShift = { from: oldP, to: chosen.personalityShift };
  }

  // 칭호 부여 (900 단계)
  if (chosen.title) {
    merc.bondTitle = chosen.title;
    result.effects.push(`칭호 획득: ${chosen.title}`);
    result.title = chosen.title;
  }

  // 골드 비용 (일부 선택지)
  if (chosen.cost && chosen.cost.gold) {
    const gold = player.gold || 0;
    if (gold < chosen.cost.gold) {
      return { ok: false, reason: `골드가 부족합니다. (필요: ${chosen.cost.gold}, 보유: ${gold})` };
    }
    player.gold -= chosen.cost.gold;
    result.effects.push(`골드 -${chosen.cost.gold}`);
  }

  // 완료 기록
  if (!merc.bondStoriesCompleted) merc.bondStoriesCompleted = [];
  merc.bondStoriesCompleted.push(check.milestone);
  merc.bondStoriesCompleted.sort((a, b) => a - b);

  // 선택 기록 (어떤 선택을 했는지)
  if (!merc.bondStoryChoices) merc.bondStoryChoices = {};
  merc.bondStoryChoices[check.milestone] = choice;

  return result;
}

/**
 * 전체 용병 유대 스토리 현황 조회
 */
function getBondStoryStatus(player) {
  const mercs = player.mercenaries || player.mercs || [];
  const statusList = [];

  for (const merc of mercs) {
    const uid = merc.uid || merc.id;
    const personality = merc.personality || 'warlike';
    const bond = merc.bond || 0;
    const completed = merc.bondStoriesCompleted || [];
    const choices = merc.bondStoryChoices || {};
    const skills = merc.bondSkills || [];

    const available = [];
    for (const ms of BOND_MILESTONES) {
      if (bond >= ms && !completed.includes(ms) && BOND_STORIES[personality] && BOND_STORIES[personality][ms]) {
        available.push(ms);
      }
    }

    statusList.push({
      uid,
      name: merc.name || uid,
      personality,
      bond,
      completedStories: completed.map(ms => ({
        milestone: ms,
        choice: choices[ms] || '?',
        title: BOND_STORIES[personality] && BOND_STORIES[personality][ms] ? BOND_STORIES[personality][ms].title : '?',
      })),
      availableStories: available,
      unlockedSkills: skills,
      bondTitle: merc.bondTitle || null,
    });
  }

  return statusList;
}

// ═══════════════════════════════════════════════════
//  소켓 핸들러
// ═══════════════════════════════════════════════════

function registerBondStoryHandlers(io, socket, player, players) {
  socket.on('bond_story_check', (data, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      if (data && data.mercUid) {
        const result = checkBondStory(player, data.mercUid);
        cb({ ok: true, ...result });
      } else {
        const status = getBondStoryStatus(player);
        cb({ ok: true, mercs: status });
      }
    } catch (e) {
      cb({ ok: false, reason: e.message });
    }
  });

  socket.on('bond_story_start', (data, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      if (!data || !data.mercUid) return cb({ ok: false, reason: 'mercUid 필요' });
      const result = startBondStory(player, data.mercUid);
      cb(result);
      if (result.ok) {
        socket.emit('bond_story_dialogue', result);
      }
    } catch (e) {
      cb({ ok: false, reason: e.message });
    }
  });

  socket.on('bond_story_choose', (data, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      if (!data || !data.mercUid || !data.choice) {
        return cb({ ok: false, reason: 'mercUid와 choice(A/B) 필요' });
      }
      const result = chooseBondStory(player, data.mercUid, data.choice);
      cb(result);
      if (result.ok) {
        socket.emit('bond_story_result', result);
      }
    } catch (e) {
      cb({ ok: false, reason: e.message });
    }
  });
}

// ═══════════════════════════════════════════════════
//  내부 헬퍼
// ═══════════════════════════════════════════════════

function _getMerc(player, mercUid) {
  const mercs = player.mercenaries || player.mercs || [];
  return mercs.find(m => (m.uid || m.id) === mercUid) || null;
}

// ═══════════════════════════════════════════════════
//  Export
// ═══════════════════════════════════════════════════

module.exports = {
  BOND_MILESTONES,
  BOND_STORIES,
  checkBondStory,
  startBondStory,
  chooseBondStory,
  getBondStoryStatus,
  registerBondStoryHandlers,
};
