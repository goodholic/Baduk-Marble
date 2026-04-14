// 용병 육성 시스템 — v3.0
// 거상 스타일 용병 수집 + 스펙업 + 편성 + 공성/서바이벌 연동
// 핵심: 용병을 키우는 재미!

// ═══ 용병 등급 & 스탯 성장 ═══
const GRADES = ['일반','고급','희귀','영웅','전설','신화'];
const GRADE_COLORS = { 0:'#888', 1:'#44cc44', 2:'#4488ff', 3:'#aa44ff', 4:'#ff8800', 5:'#ff00ff' };
const GRADE_STAT_MULT = [1.0, 1.3, 1.7, 2.2, 3.0, 5.0]; // 등급별 스탯 배율
const MAX_LEVEL = 100;
const EXP_PER_LEVEL = (lv) => Math.floor(50 * Math.pow(1.08, lv - 1));

// ═══ 용병 목록 (수집형) ═══
const MERCENARIES = [
  // ── 일반 (서바이벌에서 쉽게 획득) ──
  { id: 'merc_soldier',  name: '보병',       icon: '🗡️', grade: 0, role: '전사',   atk: 12, def: 10, hp: 120, spd: 8,  element: null, skill: { name: '강타', dmg: 1.5, cd: 8,  desc: '단일 1.5배' } },
  { id: 'merc_archer',   name: '궁수',       icon: '🏹', grade: 0, role: '사수',   atk: 14, def: 5,  hp: 80,  spd: 10, element: 'wind', skill: { name: '연사', dmg: 0.8, hits: 3, cd: 6, desc: '3연사' } },
  { id: 'merc_acolyte',  name: '수습 사제',  icon: '📿', grade: 0, role: '치유',   atk: 6,  def: 6,  hp: 90,  spd: 7,  element: 'light', skill: { name: '치유', heal: 30, cd: 10, desc: 'HP 30 회복' } },

  // ── 고급 (서바이벌 보스 드롭) ──
  { id: 'merc_knight',   name: '기사',       icon: '⚔️', grade: 1, role: '전사',   atk: 18, def: 16, hp: 180, spd: 7,  element: 'earth', skill: { name: '방패 돌진', dmg: 2.0, stun: 2, cd: 12, desc: '2배+스턴 2초' } },
  { id: 'merc_ranger',   name: '레인저',     icon: '🌿', grade: 1, role: '사수',   atk: 20, def: 8,  hp: 100, spd: 12, element: 'earth', skill: { name: '독화살', dmg: 1.2, dot: 5, cd: 8, desc: '독 5초' } },
  { id: 'merc_wizard',   name: '마법사',     icon: '🔮', grade: 1, role: '마법',   atk: 22, def: 4,  hp: 70,  spd: 9,  element: 'fire', skill: { name: '파이어볼', dmg: 2.5, aoe: true, cd: 10, desc: '광역 2.5배' } },

  // ── 희귀 (가챠/이벤트) ──
  { id: 'merc_paladin',  name: '성기사',     icon: '✝️', grade: 2, role: '전사',   atk: 25, def: 22, hp: 250, spd: 8,  element: 'light', skill: { name: '신성 일격', dmg: 3.0, heal: 50, cd: 15, desc: '3배+자힐 50' } },
  { id: 'merc_assassin',  name: '암살자',    icon: '🌙', grade: 2, role: '암살',   atk: 30, def: 6,  hp: 90,  spd: 16, element: 'dark', skill: { name: '급소', dmg: 4.0, critGuarantee: true, cd: 14, desc: '확정 크리 4배' } },
  { id: 'merc_priest',   name: '사제',       icon: '💚', grade: 2, role: '치유',   atk: 10, def: 12, hp: 140, spd: 8,  element: 'light', skill: { name: '전체 치유', healAll: 40, cd: 18, desc: '아군 전원 HP 40' } },
  { id: 'merc_warlock',  name: '흑마법사',   icon: '☠️', grade: 2, role: '마법',   atk: 28, def: 5,  hp: 85,  spd: 9,  element: 'dark', skill: { name: '저주', dmg: 2.0, debuff: 'atk-30%', cd: 12, desc: '2배+ATK감소' } },

  // ── 영웅 (매우 희귀) ──
  { id: 'merc_dragon_knight', name: '드래곤나이트', icon: '🐲', grade: 3, role: '전사', atk: 40, def: 30, hp: 400, spd: 10, element: 'fire', skill: { name: '드래곤 브레스', dmg: 5.0, aoe: true, cd: 20, desc: '광역 5배 화염' } },
  { id: 'merc_archmage', name: '대마법사',   icon: '🌟', grade: 3, role: '마법',   atk: 45, def: 8,  hp: 150, spd: 11, element: 'fire', skill: { name: '메테오', dmg: 6.0, aoe: true, cd: 25, desc: '메테오 6배' } },
  { id: 'merc_shadow_lord',name:'그림자 군주', icon: '🌑', grade: 3, role: '암살',  atk: 42, def: 15, hp: 200, spd: 18, element: 'dark', skill: { name: '분신', summon: 2, cd: 22, desc: '분신 2체 소환' } },

  // ── 전설 (극히 희귀) ──
  { id: 'merc_death_knight',name:'죽음의 기사', icon: '💀', grade: 4, role: '전사', atk: 55, def: 35, hp: 500, spd: 9,  element: 'dark', skill: { name: '망자의 군대', summon: 5, dmg: 3.0, cd: 30, desc: '해골 5체+3배' } },
  { id: 'merc_seraph',   name: '세라핌',     icon: '👼', grade: 4, role: '치유',   atk: 35, def: 25, hp: 400, spd: 12, element: 'light', skill: { name: '부활', revive: true, cd: 60, desc: '아군 1체 부활' } },

  // ── 신화 (전설 중의 전설) ──
  { id: 'merc_bahamut',  name: '용왕 바하무트', icon: '🐲', grade: 5, role: '전사', atk: 100, def: 60, hp: 1000, spd: 15, element: 'fire', skill: { name: '멸망의 브레스', dmg: 10.0, aoe: true, cd: 35, desc: '전체 10배!' } },
  { id: 'merc_god_of_war',name:'전쟁의 신',  icon: '⚡', grade: 5, role: '전사',   atk: 90, def: 50, hp: 800, spd: 20, element: 'light', skill: { name: '천둥 심판', dmg: 8.0, stun: 3, aoe: true, cd: 30, desc: '전체 8배+스턴' } },

  // ── v3.0 확장 용병 (50종 목표) ──
  // 일반 추가
  { id: 'merc_spearman',  name: '창병',       icon: '🔱', grade: 0, role: '전사',   atk: 11, def: 12, hp: 130, spd: 7,  element: 'earth', skill: { name: '찌르기', dmg: 1.8, cd: 7, desc: '관통 1.8배' } },
  { id: 'merc_monk',      name: '수도승',     icon: '🙏', grade: 0, role: '전사',   atk: 13, def: 8,  hp: 110, spd: 11, element: 'wind', skill: { name: '연타', dmg: 0.6, hits: 4, cd: 6, desc: '4연타' } },
  { id: 'merc_thief',     name: '도둑',       icon: '💰', grade: 0, role: '암살',   atk: 10, def: 3,  hp: 65,  spd: 14, element: 'dark', skill: { name: '금화 훔치기', steal: 50, cd: 12, desc: '골드 50 훔침' } },
  // 고급 추가
  { id: 'merc_cavalry',   name: '기마병',     icon: '🐴', grade: 1, role: '전사',   atk: 20, def: 10, hp: 160, spd: 14, element: 'wind', skill: { name: '돌격', dmg: 2.5, cd: 10, desc: '돌진 2.5배' } },
  { id: 'merc_crossbow',  name: '석궁병',     icon: '🏹', grade: 1, role: '사수',   atk: 22, def: 6,  hp: 85,  spd: 8,  element: null, skill: { name: '관통 사격', dmg: 3.0, pierce: true, cd: 12, desc: '관통 3배' } },
  { id: 'merc_shaman',    name: '주술사',     icon: '🪬', grade: 1, role: '마법',   atk: 18, def: 5,  hp: 80,  spd: 9,  element: 'dark', skill: { name: '저주', debuff: 'def-30%', cd: 14, desc: '적 DEF-30%' } },
  { id: 'merc_dancer',    name: '무희',       icon: '💃', grade: 1, role: '치유',   atk: 8,  def: 6,  hp: 90,  spd: 13, element: 'wind', skill: { name: '고무의 춤', buffAll: 'spd+20%', cd: 16, desc: '아군 SPD+20%' } },
  // 희귀 추가
  { id: 'merc_samurai',   name: '사무라이',   icon: '⚔️', grade: 2, role: '전사',   atk: 30, def: 14, hp: 190, spd: 12, element: 'wind', skill: { name: '거합', dmg: 4.5, critGuarantee: true, cd: 16, desc: '확정크리 4.5배' } },
  { id: 'merc_sniper',    name: '저격수',     icon: '🎯', grade: 2, role: '사수',   atk: 35, def: 3,  hp: 70,  spd: 8,  element: null, skill: { name: '헤드샷', dmg: 6.0, cd: 20, desc: '단일 6배!' } },
  { id: 'merc_druid',     name: '드루이드',   icon: '🌿', grade: 2, role: '치유',   atk: 14, def: 10, hp: 150, spd: 9,  element: 'earth', skill: { name: '자연 치유', healAll: 50, hpRegen: 3, cd: 18, desc: '전체 50+재생' } },
  { id: 'merc_pyromancer', name: '화염술사',  icon: '🔥', grade: 2, role: '마법',   atk: 32, def: 4,  hp: 75,  spd: 10, element: 'fire', skill: { name: '화염 폭풍', dmg: 3.5, aoe: true, dot: 8, cd: 14, desc: '광역 3.5배+화상' } },
  // 영웅 추가
  { id: 'merc_demon_lord', name: '마왕',      icon: '👿', grade: 3, role: '마법',   atk: 48, def: 18, hp: 280, spd: 11, element: 'dark', skill: { name: '지옥불', dmg: 6.0, aoe: true, cd: 22, desc: '광역 6배 암흑' } },
  { id: 'merc_angel',     name: '수호천사',   icon: '😇', grade: 3, role: '치유',   atk: 20, def: 25, hp: 320, spd: 12, element: 'light', skill: { name: '천상의 빛', healAll: 80, shield: 50, cd: 24, desc: '전체 80힐+보호막' } },
  { id: 'merc_blade_master',name:'검성',      icon: '🗡️', grade: 3, role: '전사',   atk: 46, def: 16, hp: 260, spd: 16, element: 'wind', skill: { name: '천검', dmg: 3.0, hits: 5, cd: 18, desc: '5연참 3배' } },
  // 전설 추가
  { id: 'merc_world_tree', name: '세계수 정령',icon: '🌳', grade: 4, role: '치유',  atk: 25, def: 30, hp: 600, spd: 8,  element: 'earth', skill: { name: '생명의 나무', healAll: 150, revive: true, cd: 45, desc: '전체 150힐+부활' } },
  { id: 'merc_void_king',  name: '공허의 왕', icon: '🌀', grade: 4, role: '마법',   atk: 65, def: 20, hp: 400, spd: 14, element: 'dark', skill: { name: '차원 붕괴', dmg: 8.0, aoe: true, cd: 32, desc: '전체 8배 공허' } },

  // ── 50종 완성 추가분 ──
  // 일반
  { id: 'merc_farmer',    name: '농부 전사',   icon: '🌾', grade: 0, role: '전사',   atk: 9,  def: 11, hp: 140, spd: 7,  element: 'earth', skill: { name: '낫 휘두르기', dmg: 1.6, cd: 8, desc: '광역 1.6배' } },
  // 고급
  { id: 'merc_pirate',    name: '해적',       icon: '🏴‍☠️', grade: 1, role: '암살',  atk: 19, def: 7,  hp: 110, spd: 13, element: 'water', skill: { name: '약탈', dmg: 2.0, steal: 30, cd: 10, desc: '2배+골드30' } },
  { id: 'merc_templar',   name: '성전사',     icon: '⛪', grade: 1, role: '전사',   atk: 16, def: 15, hp: 170, spd: 8,  element: 'light', skill: { name: '신성 돌격', dmg: 2.2, heal: 20, cd: 12, desc: '2.2배+자힐' } },
  // 희귀
  { id: 'merc_alchemist',  name: '연금술사',  icon: '⚗️', grade: 2, role: '치유',   atk: 16, def: 8,  hp: 110, spd: 9,  element: 'fire', skill: { name: '만능약', healAll: 45, buffAll: 'atk+10%', cd: 16, desc: '전체힐+ATK↑' } },
  { id: 'merc_beast_tamer', name: '맹수 조련사',icon: '🦁', grade: 2, role: '전사', atk: 27, def: 10, hp: 160, spd: 11, element: 'earth', skill: { name: '맹수 소환', summon: 3, dmg: 1.5, cd: 14, desc: '맹수3+1.5배' } },
  // 영웅
  { id: 'merc_time_mage',  name: '시간 마법사', icon: '⏳', grade: 3, role: '마법', atk: 42, def: 10, hp: 170, spd: 14, element: 'wind', skill: { name: '시간 정지', stun: 4, aoe: true, cd: 24, desc: '전체 4초 정지!' } },
  // 전설
  { id: 'merc_chaos_lord', name: '혼돈의 군주', icon: '🌀', grade: 4, role: '마법', atk: 62, def: 22, hp: 420, spd: 13, element: 'dark', skill: { name: '차원 분열', dmg: 7.5, aoe: true, debuff: 'all-20%', cd: 30, desc: '7.5배+전스탯감소' } },
  // 신화
  { id: 'merc_world_ender',name: '세계의 끝',  icon: '💀', grade: 5, role: '전사',  atk: 95, def: 55, hp: 900, spd: 18, element: 'dark', skill: { name: '종말', dmg: 12.0, aoe: true, cd: 40, desc: '전체 12배!!!' } },

  // ── v3.0 추가 용병 ──
  // 고급
  { id: 'merc_berserker', name: '광전사',     icon: '😤', grade: 1, role: '전사',   atk: 24, def: 4,  hp: 130, spd: 11, element: 'fire', skill: { name: '분노', dmg: 3.0, selfDmg: 20, cd: 8, desc: '3배, 자해 20' } },
  { id: 'merc_bard',      name: '음유시인',   icon: '🎵', grade: 1, role: '치유',   atk: 8,  def: 7,  hp: 95,  spd: 10, element: 'wind', skill: { name: '전투가', buffAll: 'atk+15%', cd: 15, desc: '아군 ATK+15%' } },
  // 희귀
  { id: 'merc_ninja',     name: '닌자',       icon: '🥷', grade: 2, role: '암살',   atk: 32, def: 5,  hp: 85,  spd: 18, element: 'wind', skill: { name: '분신술', summon: 2, cd: 16, desc: '분신 2체' } },
  { id: 'merc_necro',     name: '강령술사',   icon: '💀', grade: 2, role: '마법',   atk: 26, def: 7,  hp: 100, spd: 8,  element: 'dark', skill: { name: '해골 소환', summon: 4, cd: 20, desc: '해골 4체 소환' } },
  { id: 'merc_valkyrie',  name: '발키리',     icon: '🦢', grade: 2, role: '전사',   atk: 28, def: 16, hp: 180, spd: 12, element: 'light', skill: { name: '창 돌진', dmg: 3.5, pierce: true, cd: 10, desc: '관통 3.5배' } },
  // 영웅
  { id: 'merc_phoenix',   name: '불사조 기사',icon: '🔥', grade: 3, role: '전사',   atk: 38, def: 20, hp: 350, spd: 13, element: 'fire', skill: { name: '불사', revive: true, cd: 60, desc: '사망 시 부활' } },
  { id: 'merc_frost_queen',name:'서리 여왕',  icon: '❄️', grade: 3, role: '마법',   atk: 44, def: 12, hp: 180, spd: 10, element: 'water', skill: { name: '절대영도', dmg: 5.5, aoe: true, stun: 3, cd: 22, desc: '전체 빙결+5.5배' } },
  // 전설
  { id: 'merc_celestial',  name: '천상의 기사',icon: '✨', grade: 4, role: '전사',  atk: 60, def: 40, hp: 550, spd: 14, element: 'light', skill: { name: '신성 심판', dmg: 7.0, aoe: true, heal: 100, cd: 28, desc: '7배+아군힐' } },

  // ── v3.7 신규 용병 (60종 완성) ──
  // 일반 (고용소 전용)
  { id: 'merc_militia',    name: '민병대원',   icon: '🪖', grade: 0, role: '전사', atk: 10, def: 9,  hp: 125, spd: 8,  element: null, skill: { name: '방패벽', def_buff: 20, cd: 10, desc: 'DEF+20 (5초)' }, personality: 'loyal' },
  { id: 'merc_herbalist',  name: '약초사',     icon: '🌱', grade: 0, role: '치유', atk: 5,  def: 5,  hp: 85,  spd: 8,  element: 'earth', skill: { name: '약초 치유', heal: 25, hpRegen: 2, cd: 8, desc: 'HP25+재생' }, personality: 'kind' },
  // 고급 (지역별 고용소 전용)
  { id: 'merc_pirate_cap',name: '해적 선장',   icon: '🏴', grade: 1, role: '암살', atk: 21, def: 8,  hp: 120, spd: 13, element: 'water', skill: { name: '포격', dmg: 2.8, aoe: true, cd: 12, desc: '광역 2.8배' }, personality: 'greedy', hireOnly: 'piratePort' },
  { id: 'merc_elf_scout', name: '엘프 정찰병', icon: '🧝', grade: 1, role: '사수', atk: 19, def: 6,  hp: 90,  spd: 15, element: 'wind', skill: { name: '정밀 사격', dmg: 2.2, critGuarantee: true, cd: 10, desc: '확크리 2.2배' }, personality: 'honest', hireOnly: 'spiritAltar' },
  // 희귀 (특수 조건 고용)
  { id: 'merc_rune_knight',name: '룬 기사',    icon: '🔷', grade: 2, role: '전사', atk: 28, def: 18, hp: 210, spd: 10, element: 'fire', skill: { name: '룬 폭발', dmg: 3.5, aoe: true, cd: 14, desc: '광역 3.5배+룬' }, personality: 'scholar' },
  { id: 'merc_shadow_dancer',name:'그림자 무희',icon: '🌙', grade: 2, role: '암살', atk: 31, def: 5,  hp: 80,  spd: 19, element: 'dark', skill: { name: '그림자 춤', dmg: 3.0, hits: 3, cd: 12, desc: '3연격 3배' }, personality: 'cheerful' },
  // 영웅 (합성/이벤트 전용)
  { id: 'merc_storm_lord', name: '폭풍의 군주', icon: '⛈️', grade: 3, role: '마법', atk: 47, def: 14, hp: 230, spd: 14, element: 'wind', skill: { name: '뇌신의 창', dmg: 6.5, aoe: true, stun: 2, cd: 20, desc: '전체 6.5배+스턴' }, personality: 'warlike' },
  { id: 'merc_blood_queen',name: '피의 여왕',  icon: '🩸', grade: 3, role: '암살', atk: 44, def: 12, hp: 250, spd: 16, element: 'dark', skill: { name: '피의 갈증', dmg: 5.0, lifesteal: 50, cd: 18, desc: '5배+HP50% 흡수' }, personality: 'mad' },
  // 전설 (최고 레어)
  { id: 'merc_time_lord',  name: '시간의 지배자',icon:'⏰', grade: 4, role: '마법', atk: 58, def: 18, hp: 380, spd: 16, element: 'wind', skill: { name: '시간 역행', rewind: true, aoe: true, cd: 45, desc: '3초 전 상태로 복원' }, personality: 'scholar' },
  { id: 'merc_nature_god', name: '자연신',      icon: '🌳', grade: 4, role: '치유', atk: 30, def: 35, hp: 650, spd: 10, element: 'earth', skill: { name: '대자연의 힘', healAll: 200, revive: true, shield: 100, cd: 50, desc: '전체 200힐+부활+보호막' }, personality: 'kind' },
  // 신화 (합성 전용 최강)
  { id: 'merc_emperor',    name: '패왕',        icon: '👑', grade: 5, role: '전사', atk: 110, def: 70, hp: 1200, spd: 16, element: 'light', skill: { name: '패왕의 위엄', dmg: 12.0, aoe: true, stun: 5, cd: 35, desc: '전체 12배+5초기절' }, personality: 'noble', fusionOnly: true },
  { id: 'merc_transcender',name: '초월자',      icon: '🌟', grade: 5, role: '마법', atk: 120, def: 45, hp: 800, spd: 25, element: 'light', skill: { name: '초월', dmg: 15.0, aoe: true, cd: 40, desc: '전체 15배!!! (궁극)' }, personality: 'scholar', fusionOnly: true },
];

// ═══ v3.7 성격 시스템 ═══
const PERSONALITIES = {
  warlike:  { name: '호전적',   atkMod: 1.10, defMod: 0.95, spdMod: 1.0,  betrayBase: 0.02, likes: ['weapons','battle_records'], dislikes: ['peaceful'], synergy: { guardian: -3, berserker: 5 } },
  guardian: { name: '수호자',   atkMod: 1.0,  defMod: 1.10, spdMod: 1.0,  betrayBase: 0.0,  likes: ['shields','holy_oath'],     dislikes: ['pk','betrayal'], synergy: { warlike: -3, healer: 5 } },
  cunning:  { name: '교활한',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.05, likes: ['poisons','daggers'],       dislikes: ['frontal_combat'], synergy: { honest: -3, cunning: 3 }, critMod: 1.15 },
  honest:   { name: '정직한',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.0,  likes: ['books','fine_swords'],     dislikes: ['assassination','pk'], synergy: { cunning: -3, guardian: 5 }, hitMod: 1.10 },
  greedy:   { name: '탐욕스러운', atkMod: 1.0, defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.03, likes: ['gold','gems','luxury'],    dislikes: ['cheap_gifts'], synergy: { merchant: 3, monk: -3 }, goldMod: 1.20 },
  scholar:  { name: '수도자',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.0,  likes: ['books','mana_orbs'],       dislikes: ['violence','gambling'], synergy: { greedy: -3, sage: 5 }, magicMod: 1.10 },
  cheerful: { name: '쾌활한',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.05, betrayBase: 0.01, likes: ['toys','instruments'],      dislikes: ['gloomy'], synergy: { all: 1 }, moraleMod: 1.10 },
  gloomy:   { name: '우울한',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.02, likes: ['poetry','black_roses'],    dislikes: ['noisy'], synergy: { cheerful: 0, loner: 3 }, lowHpAtkMod: 1.25 },
  wild:     { name: '야성적',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.02, likes: ['raw_meat','beast_hide'],   dislikes: ['city','confined'], synergy: { beast: 5 }, nightAtkMod: 1.20 },
  noble:    { name: '고귀한',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.0,  likes: ['crown','fine_wine'],       dislikes: ['filth'], synergy: { knight: 3, thief: -3 }, teamDefMod: 1.05 },
  mad:      { name: '광기의',   atkMod: 1.20, defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.05, likes: ['cursed_items','blood'],    dislikes: ['healing','purify'], synergy: { dark: 3, holy: -5 }, friendlyFire: 0.05 },
  loyal:    { name: '충직한',   atkMod: 1.0,  defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.0,  likes: ['handmade','anything'],     dislikes: ['separation'], synergy: { all: 2 }, nearOwnerMod: 1.08 },
  kind:     { name: '자비로운', atkMod: 0.95, defMod: 1.0,  spdMod: 1.0,  betrayBase: 0.0,  likes: ['flowers','healing_herbs'], dislikes: ['cruelty'], synergy: { healer: 5 }, healMod: 1.15 },
};

// ═══ v3.7 진급 트리 ═══
const PROMOTION_TREE = {
  merc_soldier:  { stage1: { name: '숙련 전사',  cost: 2000,  mats: { warrior_mark: 5 } },
                   stage2: { name: '근위 전사',  cost: 10000, mats: { warrior_mark: 15, steel: 10 } },
                   branchA: { name: '검성',     bonus: { atk: 1.3 } },
                   branchB: { name: '철벽장군', bonus: { def: 1.3 } } },
  merc_wizard:   { stage1: { name: '정식 마법사', cost: 2000,  mats: { mana_orb: 5 } },
                   stage2: { name: '대마법사',   cost: 10000, mats: { mana_orb: 15, mana_stone: 10 } },
                   branchA: { name: '원소의 현자', bonus: { atk: 1.2, elementalDmg: 1.3 } },
                   branchB: { name: '시간의 주인', bonus: { cdReduction: 0.3 } } },
  merc_assassin: { stage1: { name: '숙련 도적',  cost: 2000,  mats: { rogue_blade: 5 } },
                   stage2: { name: '암살 마스터', cost: 10000, mats: { rogue_blade: 15, poison: 10 } },
                   branchA: { name: '그림자 군주', bonus: { stealth: true, critDmg: 1.5 } },
                   branchB: { name: '쾌도',       bonus: { spd: 1.4 } } },
  merc_dragon_knight: { stage1: { name: '용기사', cost: 50000, mats: { dragon_scale: 30 } },
                        stage2: { name: '드래곤 마스터', cost: 200000, mats: { dragon_scale: 80, dragon_heart: 5 } },
                        branchA: { name: '용제',   bonus: { dragonMerge: true, atk: 1.5 } },
                        branchB: { name: '용살자', bonus: { antiDragon: 3.0 } } },
};

// 성격 적용 함수
function applyPersonality(merc, baseStat) {
  const p = PERSONALITIES[merc.personality];
  if (!p) return baseStat;
  return {
    atk: Math.floor(baseStat.atk * (p.atkMod || 1)),
    def: Math.floor(baseStat.def * (p.defMod || 1)),
    hp:  baseStat.hp,
    spd: Math.floor(baseStat.spd * (p.spdMod || 1)),
  };
}

// ═══ 용병 장비 (용병 전용) ═══
const MERC_EQUIPMENT = {
  weapon: [
    { id: 'mw_iron',   name: '철 검',     grade: 0, atk: 3 },
    { id: 'mw_steel',  name: '강철 검',   grade: 1, atk: 6 },
    { id: 'mw_magic',  name: '마법 검',   grade: 2, atk: 12, critRate: 5 },
    { id: 'mw_legend', name: '전설의 검',  grade: 3, atk: 20, critRate: 10 },
    { id: 'mw_divine', name: '신성 검',    grade: 4, atk: 35, critRate: 15, lifesteal: 5 },
  ],
  armor: [
    { id: 'ma_leather', name: '가죽 갑옷', grade: 0, def: 3, hp: 10 },
    { id: 'ma_chain',   name: '사슬 갑옷', grade: 1, def: 6, hp: 25 },
    { id: 'ma_plate',   name: '판금 갑옷', grade: 2, def: 12, hp: 50 },
    { id: 'ma_dragon',  name: '용린 갑옷', grade: 3, def: 20, hp: 100 },
    { id: 'ma_divine',  name: '신성 갑옷', grade: 4, def: 35, hp: 200 },
  ],
};

// ═══ 용병 스킬 강화 ═══
const SKILL_UPGRADE_COST = (lv) => ({ gold: lv * 500, material: Math.ceil(lv / 2) });
const SKILL_MAX_LEVEL = 10;

// ═══ 핵심 함수들 ═══

function getPlayerMercs(player) {
  if (!player._mercs) player._mercs = { roster: [], party: [], maxRoster: 20 };
  return player._mercs;
}

// 용병 획득
function addMercenary(player, mercId) {
  const template = MERCENARIES.find(m => m.id === mercId);
  if (!template) return { success: false, msg: '존재하지 않는 용병' };
  const mercs = getPlayerMercs(player);
  if (mercs.roster.length >= mercs.maxRoster) return { success: false, msg: '용병 보관함이 가득찼습니다 (' + mercs.maxRoster + ')' };

  const merc = {
    uid: 'mu_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
    ...template,
    level: 1, exp: 0,
    skillLevel: 1,
    equipment: { weapon: null, armor: null },
    stars: 0, // 각성 단계 (0~5)
    bond: 0,  // 유대도 (0~100)
  };
  mercs.roster.push(merc);

  return { success: true, msg: template.icon + ' ' + template.name + ' 획득!', merc };
}

// 용병 레벨업 (EXP)
function addMercExp(player, mercUid, expAmount) {
  const mercs = getPlayerMercs(player);
  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return null;

  merc.exp += expAmount;
  let leveled = false;
  while (merc.level < MAX_LEVEL && merc.exp >= EXP_PER_LEVEL(merc.level)) {
    merc.exp -= EXP_PER_LEVEL(merc.level);
    merc.level++;
    leveled = true;
    // 레벨당 스탯 성장
    const mult = GRADE_STAT_MULT[merc.grade] || 1;
    merc.atk += Math.floor(1.5 * mult);
    merc.def += Math.floor(1.0 * mult);
    merc.hp += Math.floor(5 * mult);
  }

  return { leveled, level: merc.level, exp: merc.exp, expToNext: EXP_PER_LEVEL(merc.level) };
}

// 용병 각성 (★)
function awakenMerc(player, mercUid) {
  const mercs = getPlayerMercs(player);
  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '용병을 찾을 수 없습니다' };
  if (merc.stars >= 5) return { success: false, msg: '이미 최대 각성!' };

  // 같은 ID의 다른 용병이 필요 (재료로 소모)
  const dupeIdx = mercs.roster.findIndex(m => m.uid !== mercUid && m.id === merc.id);
  if (dupeIdx === -1) return { success: false, msg: '같은 용병 카드가 필요합니다 (중복 카드 소모)' };

  const goldCost = (merc.stars + 1) * 5000 * (merc.grade + 1);
  if ((player.gold || 0) < goldCost) return { success: false, msg: '골드 부족 (필요: ' + goldCost + 'G)' };

  // 각성!
  player.gold -= goldCost;
  mercs.roster.splice(dupeIdx, 1); // 중복 카드 소모
  merc.stars++;

  // 각성 보너스
  const bonus = Math.floor(merc.stars * 5 * GRADE_STAT_MULT[merc.grade]);
  merc.atk += bonus;
  merc.def += Math.floor(bonus * 0.7);
  merc.hp += bonus * 5;

  return { success: true, msg: '⭐'.repeat(merc.stars) + ' ' + merc.name + ' 각성 완료!', merc };
}

// 스킬 강화
function upgradeSkill(player, mercUid) {
  const mercs = getPlayerMercs(player);
  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false };
  if (merc.skillLevel >= SKILL_MAX_LEVEL) return { success: false, msg: '스킬 최대 레벨' };

  const cost = SKILL_UPGRADE_COST(merc.skillLevel);
  if ((player.gold || 0) < cost.gold) return { success: false, msg: '골드 부족 (' + cost.gold + 'G)' };

  player.gold -= cost.gold;
  merc.skillLevel++;

  // 스킬 데미지 증가
  if (merc.skill.dmg) merc.skill.dmg = Math.round((merc.skill.dmg + 0.3) * 10) / 10;
  if (merc.skill.heal) merc.skill.heal += 10;
  if (merc.skill.healAll) merc.skill.healAll += 8;

  return { success: true, msg: merc.skill.name + ' Lv.' + merc.skillLevel + '!' };
}

// 장비 장착
function equipMerc(player, mercUid, equipId) {
  const mercs = getPlayerMercs(player);
  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false };

  // 장비 찾기
  let equip = null, slot = null;
  for (const s of ['weapon', 'armor']) {
    equip = MERC_EQUIPMENT[s].find(e => e.id === equipId);
    if (equip) { slot = s; break; }
  }
  if (!equip) return { success: false, msg: '장비를 찾을 수 없습니다' };

  // 인벤토리 체크
  if (!player.inventory || !player.inventory[equipId]) return { success: false, msg: '장비가 없습니다' };
  player.inventory[equipId]--;
  if (player.inventory[equipId] <= 0) delete player.inventory[equipId];

  // 기존 장비 반환
  if (merc.equipment[slot]) {
    if (!player.inventory) player.inventory = {};
    player.inventory[merc.equipment[slot].id] = (player.inventory[merc.equipment[slot].id] || 0) + 1;
  }

  merc.equipment[slot] = equip;

  return { success: true, msg: merc.name + '에게 ' + equip.name + ' 장착!' };
}

// 파티 편성 (최대 6명)
function setParty(player, mercUids) {
  const mercs = getPlayerMercs(player);
  const party = [];
  for (const uid of mercUids.slice(0, 6)) {
    const merc = mercs.roster.find(m => m.uid === uid);
    if (merc) party.push(merc);
  }
  mercs.party = party.map(m => m.uid);
  return { success: true, party: party.map(m => ({ uid: m.uid, name: m.name, icon: m.icon, level: m.level, stars: m.stars })) };
}

// 전투력 계산 (v3.8 — 성격 보정 + 유대 보너스 반영)
function calcCombatPower(merc) {
  let atk = merc.atk, def = merc.def, hp = merc.hp;
  if (merc.equipment.weapon) { atk += merc.equipment.weapon.atk || 0; }
  if (merc.equipment.armor) { def += merc.equipment.armor.def || 0; hp += merc.equipment.armor.hp || 0; }

  // 성격 스탯 보정
  const p = PERSONALITIES[merc.personality];
  if (p) {
    atk = Math.floor(atk * (p.atkMod || 1));
    def = Math.floor(def * (p.defMod || 1));
  }

  // 유대 보너스 (loyalty / 1000, 최대 25%)
  let bondMult = 1;
  if (merc._bond && merc._bond.loyalty) {
    bondMult = 1 + Math.min(merc._bond.loyalty / 1000, 0.25);
  }

  return Math.floor((atk * 2 + def * 1.5 + hp * 0.3) * (1 + merc.stars * 0.15) * bondMult);
}

// 파티 시너지 계산 (v3.8)
function calcPartySynergy(party) {
  let synergyScore = 0;
  for (let i = 0; i < party.length; i++) {
    for (let j = i + 1; j < party.length; j++) {
      const pA = PERSONALITIES[party[i].personality];
      const pB = PERSONALITIES[party[j].personality];
      if (pA && pA.synergy) {
        // 'all' 키는 모든 파트너에게 적용
        if (pA.synergy.all !== undefined) synergyScore += pA.synergy.all;
        if (pA.synergy[party[j].personality] !== undefined) synergyScore += pA.synergy[party[j].personality];
      }
      if (pB && pB.synergy) {
        if (pB.synergy.all !== undefined) synergyScore += pB.synergy.all;
        if (pB.synergy[party[i].personality] !== undefined) synergyScore += pB.synergy[party[i].personality];
      }
    }
  }
  return synergyScore;
}

// 파티 총 전투력 (시너지 반영) (v3.8)
function calcPartyPower(player) {
  const mercs = getPlayerMercs(player);
  const partyMercs = mercs.roster.filter(m => mercs.party.includes(m.uid));
  const basePower = partyMercs.reduce((s, m) => s + calcCombatPower(m), 0);
  const synergy = calcPartySynergy(partyMercs);

  let synergyMult = 1;
  if (synergy > 0) {
    synergyMult = 1 + synergy * 0.02; // +2% per positive point
  } else if (synergy < 0) {
    synergyMult = 1 + synergy * 0.01; // -1% per negative point (penalty)
  }
  synergyMult = Math.max(synergyMult, 0.5); // floor at 50%

  return { basePower, synergyScore: synergy, synergyMult, totalPower: Math.floor(basePower * synergyMult) };
}

// 용병 상태 조회
function getMercStatus(player) {
  const mercs = getPlayerMercs(player);
  const partyMercs = mercs.roster.filter(m => mercs.party.includes(m.uid));
  const synergyScore = calcPartySynergy(partyMercs);
  const partyPowerInfo = calcPartyPower(player);

  return {
    roster: mercs.roster.map(m => {
      const pInfo = PERSONALITIES[m.personality];
      const bondBonus = (m._bond && m._bond.loyalty) ? Math.min(m._bond.loyalty / 1000, 0.25) : 0;
      // 속성 정보
      const baseDef = MERCENARIES.find(md => md.id === m.id);
      const element = m.element || (baseDef ? baseDef.element : null);
      const ELEM_ICONS = { fire: '🔥', water: '💧', earth: '🪨', wind: '🌪️', light: '✨', dark: '🌑' };
      const ELEM_NAMES = { fire: '화', water: '수', earth: '지', wind: '풍', light: '광', dark: '암' };

      // 진형 정보
      const formation = player._mercFormation || {};
      const posMap = formation.customPositions || {};
      const myPos = posMap[m.uid] || null;

      return {
        uid: m.uid, id: m.id, name: m.name, icon: m.icon,
        grade: m.grade, gradeColor: GRADE_COLORS[m.grade],
        level: m.level, exp: m.exp, expToNext: EXP_PER_LEVEL(m.level),
        atk: m.atk, def: m.def, hp: m.hp, spd: m.spd,
        stars: m.stars, skillLevel: m.skillLevel, skillName: m.skill.name,
        equipment: m.equipment, combatPower: calcCombatPower(m),
        role: m.role,
        personalityName: pInfo ? pInfo.name : '없음',
        bondBonus: Math.floor(bondBonus * 100) + '%',
        inParty: mercs.party.includes(m.uid),
        // v4.4: 속성/진형
        element, elementIcon: ELEM_ICONS[element] || '', elementName: ELEM_NAMES[element] || '무',
        position: myPos,
      };
    }),
    party: mercs.party,
    maxRoster: mercs.maxRoster,
    synergyScore,
    파티시너지: synergyScore > 0 ? `+${synergyScore} (ATK +${synergyScore * 2}%)` : synergyScore < 0 ? `${synergyScore} (DEF ${synergyScore}%)` : '0 (보통)',
    partyPower: partyPowerInfo,
    totalPower: partyPowerInfo.totalPower,
  };
}

// ═══ 소켓 핸들러 ═══
function registerMercHandlers(socket, playerId, players, io) {
  socket.on('merc_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('merc_status', getMercStatus(p));
  });

  socket.on('merc_level_up', (data) => {
    const p = players[playerId];
    if (!p) return;
    // 골드로 경험치 구매 (100G = 50 EXP)
    const cost = 100;
    if ((p.gold || 0) < cost) { socket.emit('merc_result', { success: false, msg: '골드 부족' }); return; }
    p.gold -= cost;
    const result = addMercExp(p, data.uid, 50);
    socket.emit('merc_result', { success: true, msg: result?.leveled ? '레벨 업!' : 'EXP +50', ...result });
  });

  socket.on('merc_awaken', (uid) => {
    const p = players[playerId];
    if (!p) return;
    const result = awakenMerc(p, uid);
    socket.emit('merc_result', result);
    if (result.success) io.emit('server_msg', { msg: '⭐ ' + (p.displayName||p.className) + '의 ' + result.merc.name + ' 각성!', type: 'rare' });
  });

  socket.on('merc_skill_up', (uid) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('merc_result', upgradeSkill(p, uid));
  });

  socket.on('merc_equip', (data) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('merc_result', equipMerc(p, data.uid, data.equipId));
  });

  socket.on('merc_set_party', (uids) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('merc_party_result', setParty(p, uids));
  });

  // ══════ 가챠 시스템 (천장 + 10연차 + 포인트) ══════
  function getGachaState(p) {
    if (!p._gacha) p._gacha = { pity: 0, mythicPity: 0, points: 0, freeDaily: 0, freeWeekly: 0, totalPulls: 0 };
    return p._gacha;
  }

  function doSinglePull(p) {
    const g = getGachaState(p);
    g.pity++;
    g.mythicPity++;
    g.totalPulls++;
    g.points++;

    // 기본 확률: 일반50/고급25/희귀15/영웅7/전설2.5/신화0.5
    let weights = { 0: 50, 1: 25, 2: 15, 3: 7, 4: 2.5, 5: 0.5 };

    // 소프트 천장: 50회 후 영웅+ 확률 매회 +3%
    if (g.pity >= 50) {
      const bonus = (g.pity - 49) * 3;
      weights[3] += bonus;         // 영웅 확률 증가
      weights[0] = Math.max(5, weights[0] - bonus); // 일반 확률 감소
    }

    // 하드 천장: 80회 = 영웅 확정
    if (g.pity >= 80) {
      weights = { 3: 85, 4: 12, 5: 3 };
    }

    // 신화 천장: 200회 = 신화 확정
    if (g.mythicPity >= 200) {
      weights = { 5: 100 };
    }

    // 가중치 롤
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    let roll = Math.random() * total;
    let targetGrade = 0;
    for (const [grade, w] of Object.entries(weights)) {
      roll -= w;
      if (roll <= 0) { targetGrade = parseInt(grade); break; }
    }

    // 천장 리셋
    if (targetGrade >= 3) g.pity = 0;     // 영웅 이상 → 영웅 천장 리셋
    if (targetGrade >= 5) g.mythicPity = 0; // 신화 → 신화 천장 리셋

    const pool = MERCENARIES.filter(m => m.grade === targetGrade);
    const selected = pool[Math.floor(Math.random() * pool.length)] || MERCENARIES[0];
    return { grade: targetGrade, merc: selected };
  }

  // 단일 소환 (30💎)
  socket.on('merc_gacha', () => {
    const p = players[playerId];
    if (!p) return;
    if ((p.diamonds || 0) < 30) { socket.emit('merc_result', { success: false, msg: '다이아 부족 (30💎)' }); return; }
    p.diamonds -= 30;

    const pull = doSinglePull(p);
    const result = addMercenary(p, pull.merc.id);
    const g = getGachaState(p);
    socket.emit('merc_gacha_result', { ...result, grade: pull.grade, pity: g.pity, mythicPity: g.mythicPity, points: g.points });
    if (pull.grade >= 4) io.emit('server_msg', { msg: '⭐ ' + (p.displayName||p.className) + '님이 ' + GRADES[pull.grade] + ' 용병 획득! ' + pull.merc.icon + ' ' + pull.merc.name, type: 'boss' });
  });

  // 10연차 (300💎, 고급+ 1체 보장, 포인트 ×2)
  socket.on('merc_gacha_10', () => {
    const p = players[playerId];
    if (!p) return;
    if ((p.diamonds || 0) < 300) { socket.emit('merc_result', { success: false, msg: '다이아 부족 (300💎)' }); return; }
    p.diamonds -= 300;

    const results = [];
    let hasHighGrade = false;
    for (let i = 0; i < 10; i++) {
      const pull = doSinglePull(p);
      if (pull.grade >= 1) hasHighGrade = true;
      const r = addMercenary(p, pull.merc.id);
      results.push({ ...r, grade: pull.grade, icon: pull.merc.icon, name: pull.merc.name });
    }

    // 10연차 보장: 고급+ 없으면 마지막 1체를 고급으로 교체
    if (!hasHighGrade) {
      const lastIdx = results.length - 1;
      const pool = MERCENARIES.filter(m => m.grade === 1);
      const bonus = pool[Math.floor(Math.random() * pool.length)];
      if (bonus) {
        // 기존 마지막 용병 제거 후 교체
        const mercs = getPlayerMercs(p);
        const oldMerc = mercs.roster[mercs.roster.length - 1];
        if (oldMerc) mercs.roster.pop();
        const r = addMercenary(p, bonus.id);
        results[lastIdx] = { ...r, grade: 1, icon: bonus.icon, name: bonus.name, guaranteed: true };
      }
    }

    // 포인트 보너스 (10연차 = ×2)
    const g = getGachaState(p);
    g.points += 10; // 기본 10 + 추가 10 = 총 20

    const bestGrade = Math.max(...results.map(r => r.grade));
    socket.emit('merc_gacha_10_result', { results, pity: g.pity, mythicPity: g.mythicPity, points: g.points, bestGrade });
    if (bestGrade >= 4) io.emit('server_msg', { msg: '🌟 ' + (p.displayName||p.className) + '님이 10연차에서 ' + GRADES[bestGrade] + ' 용병 획득!', type: 'boss' });
  });

  // 무료 골드 소환 (1일 1회, 3000G)
  socket.on('merc_gacha_free', () => {
    const p = players[playerId];
    if (!p) return;
    const g = getGachaState(p);
    const today = new Date().toDateString();
    if (g.freeDaily === today) { socket.emit('merc_result', { success: false, msg: '오늘 무료 소환 완료! 내일 다시' }); return; }
    if ((p.gold || 0) < 3000) { socket.emit('merc_result', { success: false, msg: '골드 부족 (3,000G)' }); return; }
    p.gold -= 3000;
    g.freeDaily = today;

    // 일반~고급 위주 (일반60/고급35/희귀5)
    const weights = { 0: 60, 1: 35, 2: 5 };
    const total = 100;
    let roll = Math.random() * total;
    let targetGrade = 0;
    for (const [grade, w] of Object.entries(weights)) {
      roll -= w;
      if (roll <= 0) { targetGrade = parseInt(grade); break; }
    }
    const pool = MERCENARIES.filter(m => m.grade === targetGrade);
    const selected = pool[Math.floor(Math.random() * pool.length)] || MERCENARIES[0];
    const result = addMercenary(p, selected.id);
    socket.emit('merc_gacha_result', { ...result, grade: targetGrade, free: true });
  });

  // 포인트 교환 (30: 고급 선택, 80: 희귀 선택, 200: 영웅 선택)
  socket.on('merc_gacha_exchange', (data) => {
    const p = players[playerId];
    if (!p) return;
    const g = getGachaState(p);
    const tiers = { 1: 30, 2: 80, 3: 200 }; // 등급: 필요 포인트
    const cost = tiers[data.grade];
    if (!cost) { socket.emit('merc_result', { success: false, msg: '교환 등급 오류' }); return; }
    if (g.points < cost) { socket.emit('merc_result', { success: false, msg: '포인트 부족 (' + g.points + '/' + cost + ')' }); return; }

    const target = MERCENARIES.find(m => m.id === data.mercId && m.grade === data.grade);
    if (!target) { socket.emit('merc_result', { success: false, msg: '대상 용병 없음' }); return; }

    g.points -= cost;
    const result = addMercenary(p, target.id);
    socket.emit('merc_gacha_result', { ...result, exchanged: true, pointsLeft: g.points });
  });

  // 가챠 상태 조회
  socket.on('merc_gacha_status', () => {
    const p = players[playerId];
    if (!p) return;
    const g = getGachaState(p);
    socket.emit('merc_gacha_status', {
      pity: g.pity, mythicPity: g.mythicPity, points: g.points,
      totalPulls: g.totalPulls,
      nextHeroPity: Math.max(0, 80 - g.pity),
      nextMythicPity: Math.max(0, 200 - g.mythicPity),
      freeAvailable: g.freeDaily !== new Date().toDateString(),
    });
  });
}

module.exports = { MERCENARIES, MERC_EQUIPMENT, GRADES, GRADE_COLORS, GRADE_STAT_MULT, PERSONALITIES, PROMOTION_TREE, applyPersonality, addMercenary, addMercExp, getMercStatus, registerMercHandlers, calcCombatPower, calcPartySynergy, calcPartyPower, getPlayerMercs };
