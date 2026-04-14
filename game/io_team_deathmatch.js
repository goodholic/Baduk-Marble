// v5.9 — IO 팀 데스매치 모드
// 5v5 / 10v10 팀전, 역할 분담, 리스폰, 킬 스코어

const TEAM_SIZES = { small: 5, large: 10 };
const MATCH_DURATION = 300; // 5분
const RESPAWN_TIME = 5; // 5초

// 팀 역할
const TEAM_ROLES = {
  carry:    { name: '캐리', icon: '⚔️🌟', bonus: { atk: 1.2, def: 0.9 }, desc: '팀의 핵심 딜러' },
  tank:     { name: '탱커', icon: '🛡️', bonus: { hp: 1.4, def: 1.2, atk: 0.8 }, desc: '전선 유지' },
  healer:   { name: '힐러', icon: '💚', bonus: { healPow: 1.5, hp: 1.1 }, desc: '팀원 치유' },
  assassin: { name: '암살자', icon: '🗡️💨', bonus: { atk: 1.1, spd: 1.3, stealth: 3 }, desc: '적 캐리 저격' },
  support:  { name: '서포터', icon: '🔮', bonus: { teamBuff: 1.1, ccPow: 1.3 }, desc: '버프+디버프 전문' },
};

// 맵
const TDM_MAPS = [
  { id: 'colosseum', name: '콜로세움', icon: '🏟️', size: 1000, features: ['원형 경기장', '중앙 기둥 엄폐', '관중석 위 보급'] },
  { id: 'twin_castles', name: '쌍둥이 성', icon: '🏰🏰', size: 1200, features: ['양쪽 성 거점', '다리 3개', '지하 통로'] },
  { id: 'forest_arena', name: '숲 투기장', icon: '🌲⚔️', size: 800, features: ['나무 엄폐', '안개 지역', '야수 출몰'] },
  { id: 'sky_platform', name: '하늘 플랫폼', icon: '☁️⚔️', size: 900, features: ['낙사 가능!', '이동 플랫폼', '바람 밀기'] },
  { id: 'lava_pit', name: '용암 구덩이', icon: '🌋⚔️', size: 700, features: ['용암 지역', '좁은 다리', '화산 폭발 이벤트'] },
];

// 킬 스트릭 보너스
const KILL_STREAKS = [
  { kills: 3, name: '더블킬+', bonus: 'ATK+10% (15초)', announce: true },
  { kills: 5, name: '킬링 스프리', bonus: 'SPD+15% + 은신 5초', announce: true },
  { kills: 7, name: '도미네이팅', bonus: 'HP 전체 회복 + ATK+20%', announce: true },
  { kills: 10, name: '갓라이크!', bonus: '30초간 전 스탯+30%', announce: true, serverWide: true },
  { kills: 15, name: '레전더리!!', bonus: '60초간 전 스탯+50% + 무적 5초', announce: true, serverWide: true },
];

// 특수 모드 (주간 로테이션)
const SPECIAL_MODES = [
  { id: 'one_hit', name: '원히트 킬', desc: '모든 공격이 즉사!', mod: { allHp: 1 } },
  { id: 'big_head', name: '빅헤드 모드', desc: '머리 5배, 크리 확정', mod: { headSize: 5, autoCrit: true } },
  { id: 'low_gravity', name: '저중력', desc: '점프 높이 5배', mod: { gravity: 0.2 } },
  { id: 'merc_war', name: '용병 전쟁', desc: '플레이어 대신 용병이 전투', mod: { mercOnly: true } },
  { id: 'random_weapon', name: '랜덤 무기', desc: '킬마다 무기 랜덤 변경', mod: { randomWeapon: true } },
  { id: 'capture_point', name: '거점 쟁탈', desc: '3개 거점 점령 점수제', mod: { capturePoints: 3 } },
];

// 보상
const TDM_REWARDS = {
  mvp:     { gold: 20000, exp: 2000, title: 'MVP', frame: 'mvp_frame' },
  winner:  { gold: 10000, exp: 1000 },
  loser:   { gold: 3000, exp: 300 },
  godlike: { gold: 30000, title: '갓라이크', specialItem: 'godlike_trophy' },
};

function register(io, socket, player) {
  socket.on('tdm_info', () => {
    socket.emit('tdm_info', { roles: TEAM_ROLES, maps: TDM_MAPS, streaks: KILL_STREAKS, modes: SPECIAL_MODES, rewards: TDM_REWARDS, sizes: TEAM_SIZES });
  });
  socket.on('tdm_join', (data) => {
    player.tdmRole = data.role || 'carry';
    socket.emit('tdm_join_result', { ok: true, role: TEAM_ROLES[player.tdmRole] });
    io.emit('server_msg', `⚔️ [팀 데스매치] ${player.name}이(가) ${TEAM_ROLES[player.tdmRole]?.name || '캐리'}로 참가!`);
  });
}

module.exports = { TEAM_ROLES, TDM_MAPS, KILL_STREAKS, SPECIAL_MODES, TDM_REWARDS, register };
