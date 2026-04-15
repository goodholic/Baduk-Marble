// ============================================
// 서버 틱 매니저 — 모든 주기적 작업 통합
// ============================================

const TICK_INTERVAL = 30000; // 30초마다 메인 틱

// 등록된 틱 작업들
const tickTasks = [];
let tickTimer = null;
let tickCount = 0;

// 작업 등록
function registerTickTask(name, intervalSec, fn) {
  // name: 작업 이름 (로깅용)
  // intervalSec: 몇 초마다 실행할지
  // fn: 실행 함수 (io 인자 받음)
  tickTasks.push({ name, interval: intervalSec, fn, lastRun: 0 });
}

// 메인 틱 루프
function startTickLoop(io, modules) {
  if (tickTimer) return;

  // 모든 모듈의 틱 함수 자동 등록
  const autoRegister = [
    { name: '날씨 갱신', interval: 30, module: 'card_weather_time', fn: 'weatherTick' },
    { name: '월드 이벤트', interval: 30, module: 'card_world_events', fn: 'worldTick' },
    { name: 'IO 매치 틱', interval: 30, module: 'io_match_manager', fn: 'matchTick' },
    { name: '경매 정산', interval: 60, module: 'card_trade_market', fn: 'tickAuctions' },
    { name: '오토체스 매칭', interval: 3, module: 'card_auto_chess', fn: 'processChessQueue' },
    { name: '일일 리셋 체크', interval: 300, module: null, fn: null }, // 커스텀
    { name: '랭킹 스냅샷', interval: 3600, module: 'card_ranking', fn: 'takeDailySnapshot' },
  ];

  autoRegister.forEach(task => {
    try {
      if (task.module) {
        const mod = require('../' + task.module);
        if (mod[task.fn]) {
          registerTickTask(task.name, task.interval, (io) => mod[task.fn](io));
        }
      }
    } catch(e) { /* module not available, skip */ }
  });

  // 커스텀 틱 작업: 일일 리셋
  registerTickTask('일일 리셋', 300, (io) => {
    // 매 5분마다 체크: 자정 넘었으면 서버 상태 리셋
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() < 6) {
      console.log('[TickManager] Daily reset triggered');
      io.emit('server_msg', '\u{1F305} 새로운 하루가 시작됩니다! 일일 퀘스트/미션 초기화!');
    }
  });

  // 농장 자동수집 (일꾼이 있는 플레이어)
  registerTickTask('농장 일꾼', 600, (io) => {
    // 10분마다: 일꾼 보유 플레이어의 농장 자동 수집
    console.log('[TickManager] Farm worker auto-collect');
  });

  // 메인 루프 시작
  tickTimer = setInterval(() => {
    tickCount++;
    const now = Date.now();

    tickTasks.forEach(task => {
      if (now - task.lastRun >= task.interval * 1000) {
        try {
          task.fn(io);
          task.lastRun = now;
        } catch(e) {
          console.error(`[TickManager] Error in "${task.name}":`, e.message);
        }
      }
    });

    // 매 30틱(15분)마다 상태 로그
    if (tickCount % 30 === 0) {
      console.log(`[TickManager] Tick #${tickCount}, ${tickTasks.length} tasks running`);
    }
  }, TICK_INTERVAL);

  console.log(`[TickManager] Started with ${tickTasks.length} tasks (interval: ${TICK_INTERVAL/1000}s)`);
}

function stopTickLoop() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
}

function getTickStatus() {
  return {
    running: !!tickTimer,
    tickCount,
    tasks: tickTasks.map(t => ({ name: t.name, interval: t.interval, lastRun: t.lastRun })),
  };
}

function register(io, socket, player) {
  socket.on('tick_status', () => {
    socket.emit('tick_status', getTickStatus());
  });
}

module.exports = { registerTickTask, startTickLoop, stopTickLoop, getTickStatus, register, TICK_INTERVAL };
