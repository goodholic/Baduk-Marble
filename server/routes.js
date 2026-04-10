// ==========================================
// HTTP Routes (extracted from server.js, Phase 1 refactor)
// ==========================================
// register(app, ctx) — registers /health, /status, /payment/*, /api/products
//
// ctx (lazy: 핸들러 내부에서만 접근, register() 호출 시점엔 TDZ 가능):
//   io                  socket.io 서버
//   getPlayers          () => players 글로벌 객체
//   savePlayer          (player) => Promise<void>
//   getMonsterCount     () => number
//   getWorldState       () => { worldBoss, meteorShower, goldenRain, starShower, isNight, weather }
//   festival            festival 모듈
//   DIAMOND_PRODUCTS    상품 카탈로그
//   TOSS_SECRET_KEY     토스페이먼츠 시크릿 키
//   serverStartTime     Date.now() 부트 타임스탬프
//   getMaxPlayers       () => number

const express = require('express');

function register(app, ctx) {
    app.get('/health', (req, res) => res.send('AutoBattle.io Server Running'));

    // ── 디버그: 서버 로그 (최근 200줄) ──
    app.get('/debug/logs', (req, res) => {
        const buf = global._logBuffer || [];
        const filter = req.query.filter || '';
        const lines = filter ? buf.filter(l => l.includes(filter)) : buf;
        res.type('text/plain').send(lines.join('\n') || '(no logs)');
    });

    // ── 디버그: 클라이언트 에러 수신 ──
    const _clientErrors = [];
    app.post('/debug/client-error', express.json(), (req, res) => {
        const { msg, stack, url } = req.body || {};
        if (msg) {
            const entry = `[${new Date().toISOString().slice(11,19)}][CLIENT] ${msg}${stack ? '\n  ' + stack.split('\n')[0] : ''}`;
            _clientErrors.push(entry);
            if (_clientErrors.length > 50) _clientErrors.shift();
            console.warn('[CLIENT-ERR]', msg);
        }
        res.json({ ok: true });
    });
    app.get('/debug/client-errors', (req, res) => {
        res.type('text/plain').send(_clientErrors.join('\n') || '(no client errors)');
    });

    // 서버 상태 JSON 엔드포인트 (모니터링/대시보드)
    app.get('/status', (req, res) => {
        try {
            const players = ctx.getPlayers();
            const uptimeSec = Math.floor((Date.now() - ctx.serverStartTime) / 1000);
            const onlineCount = Object.values(players).filter(p => !p.isBot && p.isAlive).length;
            const botCount = Object.values(players).filter(p => p.isBot && p.isAlive).length;
            const monsterCount = ctx.getMonsterCount();
            const world = ctx.getWorldState();
            res.json({
                status: 'ok',
                uptime: uptimeSec,
                uptimeFormatted: `${Math.floor(uptimeSec/3600)}h ${Math.floor((uptimeSec%3600)/60)}m ${uptimeSec%60}s`,
                players: {
                    online: onlineCount,
                    bots: botCount,
                    max: ctx.getMaxPlayers(),
                },
                monsters: monsterCount,
                world: {
                    worldBoss: world.worldBoss ? world.worldBoss.name : null,
                    meteorShower: world.meteorShower ? world.meteorShower.zoneId : null,
                    goldenRain: world.goldenRain ? world.goldenRain.zoneId : null,
                    starShower: world.starShower ? world.starShower.zoneId : null,
                    isNight: world.isNight,
                    weather: world.weather?.id || null,
                },
                db: 'connected', // initDB가 실패하면 catch에서 로그
                festival: (() => {
                    const ev = ctx.festival.getActiveEvent();
                    return ev ? { id: ev.id, name: ev.name, color: ev.color, buff: ev.globalBuff } : null;
                })(),
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            res.status(500).json({ status: 'error', message: e.message });
        }
    });

    // 결제 성공 페이지
    app.get('/payment/success', async (req, res) => {
        const { paymentKey, orderId, amount } = req.query;

        try {
            // 토스페이먼츠 결제 승인 API 호출
            const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(ctx.TOSS_SECRET_KEY + ':').toString('base64'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
            });

            const result = await response.json();

            if (result.status === 'DONE') {
                // 결제 성공 → 다이아몬드 지급
                const parts = orderId.split('_');
                const productId = parts[0] + '_' + parts[1];
                const deviceId = parts.slice(2, -1).join('_');
                const product = ctx.DIAMOND_PRODUCTS[productId];

                if (product && Number(amount) === product.price) {
                    const players = ctx.getPlayers();
                    // 접속 중인 플레이어 찾기
                    for (const pId in players) {
                        if (players[pId].deviceId === deviceId && !players[pId].isBot) {
                            players[pId].diamonds = (players[pId].diamonds || 0) + product.diamonds;
                            ctx.savePlayer(players[pId]);
                            ctx.io.to(pId).emit('player_update', players[pId]);
                            ctx.io.to(pId).emit('shop_result', {
                                success: true,
                                msg: `${product.name} 구매 완료! +${product.diamonds} 다이아`,
                                diamonds: players[pId].diamonds
                            });
                            break;
                        }
                    }
                }

                res.send(`<html><head><meta charset="utf-8"><script>
                    alert('결제 완료! ${product ? product.diamonds : 0} 다이아몬드가 지급되었습니다.');
                    window.close(); setTimeout(()=>location.href='/',1000);
                </script></head></html>`);
            } else {
                res.send(`<html><head><meta charset="utf-8"><script>
                    alert('결제 확인 실패: ${result.message || "알 수 없는 오류"}');
                    window.close(); setTimeout(()=>location.href='/',1000);
                </script></head></html>`);
            }
        } catch (err) {
            console.error('[Payment] Error:', err.message);
            res.send(`<html><head><meta charset="utf-8"><script>
                alert('결제 처리 중 오류가 발생했습니다.');
                window.close(); setTimeout(()=>location.href='/',1000);
            </script></head></html>`);
        }
    });

    // 결제 실패 페이지
    app.get('/payment/fail', (req, res) => {
        res.send(`<html><head><meta charset="utf-8"><script>
            alert('결제가 취소되었습니다.');
            window.close(); setTimeout(()=>location.href='/',1000);
        </script></head></html>`);
    });

    // 상품 목록 API
    app.get('/api/products', (req, res) => {
        res.json(ctx.DIAMOND_PRODUCTS);
    });

    // 결제 클라이언트 키 API (하드코딩 방지)
    app.get('/api/payment-key', (req, res) => {
        res.json({ clientKey: process.env.TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq' });
    });
}

module.exports = { register };
