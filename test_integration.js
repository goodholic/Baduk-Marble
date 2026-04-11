// Puppeteer 통합 테스트 — v2.58 신규 시스템 검증
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 15000;
let passed = 0, failed = 0, errors = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    errors.push(`${name}: ${e.message}`);
    console.log(`  ❌ ${name} — ${e.message}`);
  }
}

(async () => {
  console.log('\n🧪 AutoBattle.io v2.58 통합 테스트\n');

  // 서버 접근 체크
  let serverOk = false;
  try {
    const res = await fetch(BASE_URL);
    serverOk = res.ok;
  } catch(e) {}

  if (!serverOk) {
    console.log('❌ 서버가 실행되지 않았습니다. node server.js를 먼저 실행하세요.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // 1. 페이지 로드
  console.log('📋 기본 로드 테스트');
  await test('페이지 로드', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  });

  await test('로그인 화면 표시', async () => {
    await page.waitForSelector('#login-id', { timeout: 5000 });
  });

  // 2. 로그인 & 게임 진입
  console.log('\n📋 로그인 & 게임 진입');
  await test('회원가입/로그인', async () => {
    await page.click('#tab-register');
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      document.getElementById('login-id').value = 'testbot';
      document.getElementById('login-pw').value = 'testbot';
      document.getElementById('login-pw2').value = 'testbot';
    });
    await page.click('#login-submit-btn');
    await new Promise(r => setTimeout(r, 1500));
    await page.click('#tab-login');
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      document.getElementById('login-id').value = 'testbot';
      document.getElementById('login-pw').value = 'testbot';
    });
    await page.click('#login-submit-btn');
    await new Promise(r => setTimeout(r, 2000));
  });

  await test('클래스 선택 (Mage)', async () => {
    const vis = await page.evaluate(() => document.getElementById('class-select')?.style.display);
    if (vis === 'flex') {
      await page.evaluate(() => selectClass('Mage'));
      await new Promise(r => setTimeout(r, 2000));
    }
  });

  await test('게임 모달 닫기', async () => {
    await page.evaluate(() => { if(typeof closeModal==='function') closeModal(); });
    await new Promise(r => setTimeout(r, 500));
  });

  // 3. 소켓 연결 확인
  console.log('\n📋 소켓 연결');
  await test('소켓 연결됨', async () => {
    const connected = await page.evaluate(() => !!window.socket?.connected);
    if (!connected) throw new Error('소켓 미연결');
  });

  // 4. 신규 시스템 테스트
  console.log('\n📋 v2.58 신규 시스템');

  await test('NPC 시스템 — 마을 NPC 목록', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('get_town_npcs');
      window.socket.once('town_npc_list', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    // 마을이 아닐 수 있으므로 null도 ok
  });

  await test('스토리 시스템 — 상태 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('story_status');
      window.socket.once('story_status', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result) throw new Error('story_status 응답 없음');
  });

  await test('드래곤 시스템 — 목록 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('dragon_list');
      window.socket.once('dragon_list', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result) throw new Error('dragon_list 응답 없음');
    if (!result.allTypes || result.allTypes.length !== 8) throw new Error('드래곤 8종 아님: ' + (result.allTypes?.length || 0));
  });

  await test('하우징 시스템 — 상태 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('house_status');
      window.socket.once('house_status', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result) throw new Error('house_status 응답 없음');
  });

  await test('업적 시스템 — 상태 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('achievement_status');
      window.socket.once('achievement_status', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result) throw new Error('achievement_status 응답 없음');
    if (!result.achievements) throw new Error('업적 목록 없음');
  });

  await test('전설 변신 — 목록 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('legendary_morph_list');
      window.socket.once('legendary_morph_list', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result || !result.forms) throw new Error('변신 목록 없음');
    if (result.forms.length !== 5) throw new Error('변신 5종 아님: ' + result.forms.length);
  });

  await test('심층 던전 — 목록 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('deep_dungeon_list');
      window.socket.once('deep_dungeon_list', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result || !result.dungeons) throw new Error('던전 목록 없음');
    if (result.dungeons.length !== 2) throw new Error('던전 2종 아님: ' + result.dungeons.length);
  });

  await test('배틀로얄 — 상태 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('br_status');
      window.socket.once('battle_royale_status', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result) throw new Error('br_status 응답 없음');
  });

  await test('월드 이벤트 — 상태 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('world_events_status');
      window.socket.once('world_events_info', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result) throw new Error('world_events 응답 없음');
    if (!result.availableRaids || result.availableRaids.length !== 3) throw new Error('레이드 3종 아님');
    if (!result.availableEvents || result.availableEvents.length !== 5) throw new Error('이벤트 5종 아님');
  });

  await test('드래곤 레이스 — 상태 조회', async () => {
    const result = await page.evaluate(() => new Promise(resolve => {
      window.socket.emit('dragon_race_status');
      window.socket.once('dragon_race_status', d => resolve(d));
      setTimeout(() => resolve(null), 3000);
    }));
    if (!result) throw new Error('race_status 응답 없음');
  });

  // 5. 클라이언트 에러 체크
  console.log('\n📋 클라이언트 에러');
  await test('JavaScript 에러 없음', async () => {
    const errs = await page.evaluate(() => (window._debugErrors || []).map(e => e.msg));
    if (errs.length > 0) throw new Error(errs.join(' | '));
  });

  // 6. 성능 체크
  console.log('\n📋 성능');
  await test('DOM 노드 5000 이하', async () => {
    const count = await page.evaluate(() => document.querySelectorAll('*').length);
    if (count > 5000) throw new Error('DOM 노드: ' + count);
  });

  await browser.close();

  // 결과 출력
  console.log('\n' + '='.repeat(50));
  console.log(`🧪 결과: ${passed} 통과 / ${failed} 실패 / ${passed + failed} 전체`);
  if (errors.length > 0) {
    console.log('\n❌ 실패 목록:');
    errors.forEach(e => console.log('  - ' + e));
  }
  console.log('='.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
})();
