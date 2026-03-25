// ==========================================
// Node.js Multiplay Server with Socket.IO
// Railway Deployment Ready
// ==========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// CORS 설정: 모든 도메인에서의 접속을 허용합니다 (보안이 필요하면 나중에 특정 도메인만 지정 가능)
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 클라이언트 웹페이지 배포를 위한 정적 파일 서빙 (유니티 WebGL 빌드 파일 위치)
app.use(express.static(path.join(__dirname, 'public')));

// 기본 포트 설정 (Railway 환경에 맞춤)
const PORT = process.env.PORT || 3000;

// 서버 상태 확인용 엔드포인트
app.get('/health', (req, res) => {
    res.send('Server is running normally');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});

// ==========================================
// 게임 논리 데이터 및 통신 관리
// ==========================================

// 현재 접속한 플레이어 정보 저장소
const players = {};
// 맵에 존재하는 도끼(투사체) 정보 저장소
let axes = {};
let axeIdCounter = 0;

// 도끼 관련 상수 설정
const AXE_SPEED = 15;        // 도끼 비행 속도
const AXE_LIFETIME = 1500;   // 도끼 수명 (ms)
const AXE_DAMAGE = 20;       // 도끼 데미지
const MAX_PLAYERS = 20;      // 동시 접속 최대 인원

// Socket.IO 이벤트 리스너
io.on('connection', (socket) => {
    const playerId = socket.id;
    console.log(`New user connected: ${playerId}`);

    // 서버 풀 상태 체크
    if (Object.keys(players).length >= MAX_PLAYERS) {
        console.log(`Connection rejected: Server full (${MAX_PLAYERS}/${MAX_PLAYERS})`);
        socket.emit('server_full', { message: 'The server is currently full.' });
        socket.disconnect();
        return;
    }

    // 1. 유니티 클라이언트가 준비 완료되었을 때 호출 (초기 데이터 전송)
    socket.on('init_request', () => {
        // 새 플레이어 객체 생성 및 초기화
        players[playerId] = {
            id: playerId,
            
            // ==========================================
            // [수정 사항] 플레이어 초기 스폰 위치 Y축 변경
            // ==========================================
            // 기존: 맵 중앙 근처 랜덤 (Y: -15 ~ 15)
            // x: Math.random() * 30 - 15,
            // y: Math.random() * 30 - 15,

            // 수정: 플레이어 위치를 위로 올려서 조이스틱과 겹치지 않게 함.
            // X는 좌우로 넓게 배치 (-15 ~ 15)
            x: Math.random() * 30 - 15,
            // Y는 맵의 위쪽 영역에 배치 (5 ~ 15 사이 양수 영역)
            y: Math.random() * 10 + 5, 
            
            hp: 100,
            dirX: 0,
            dirY: -1, // 초기에는 아래를 바라봄
            score: 0,
            isAlive: true,
            killCount: 0
        };

        // 요청한 클라이언트에게 현재 서버 상태 전송 (내 ID, 다른 플레이어 목록, 도끼 목록)
        socket.emit('init', {
            id: playerId,
            players: players,
            axes: axes
        });

        // 다른 모든 클라이언트에게 새 플레이어 접속 알림
        socket.broadcast.emit('player_join', players[playerId]);
    });

    // 2. 플레이어 이동 및 방향 데이터 수신 (주기적인 동기화)
    socket.on('move', (data) => {
        try {
            const moveData = JSON.parse(data);
            if (players[playerId] && players[playerId].isAlive) {
                // 클라이언트에서 계산된 위치를 서버 데이터에 즉시 반영
                players[playerId].x = moveData.x;
                players[playerId].y = moveData.y;
                
                // 플레이어가 바라보는 방향 업데이트 (도끼 발사 방향용)
                if (moveData.dirX !== undefined && moveData.dirY !== undefined) {
                    players[playerId].dirX = moveData.dirX;
                    players[playerId].dirY = moveData.dirY;
                }
            }
        } catch (e) {
            console.error('Invalid move data from ' + playerId);
        }
    });

    // 3. 도끼 투척 (공격) 요청 수신
    socket.on('throw', (data) => {
        const player = players[playerId];
        // 살아있고, 바라보는 방향이 정의되어 있을 때만 발사 가능
        if (player && player.isAlive && player.dirX !== undefined) {
            
            // 바라보는 방향 벡터 크기 계산 (정규화용)
            const mag = Math.sqrt(player.dirX * player.dirX + player.dirY * player.dirY);
            
            // 방향 데이터가 비정상적일 경우 기본값 설정
            let finalDirX = 0;
            let finalDirY = 1;

            if (mag > 0.01) {
                finalDirX = player.dirX / mag;
                finalDirY = player.dirY / mag;
            } else if (player.dirX === 0 && player.dirY === 0) {
                // 움직임이 없을 때 기본 방향 (위쪽)
                finalDirX = 0;
                finalDirY = 1;
            }

            // 도끼 객체 생성
            axeIdCounter++;
            const currentAxeId = axeIdCounter;
            
            axes[currentAxeId] = {
                id: currentAxeId,
                ownerId: playerId,
                // 플레이어의 위치(발치)보다 살짝 앞(0.5)에서 생성
                x: player.x + finalDirX * 0.5, 
                y: player.y + finalDirY * 0.5,
                dirX: finalDirX,
                dirY: finalDirY,
                speed: AXE_SPEED,
                timer: null // 서버 내부 관리용 타이머
            };

            // 모든 클라이언트에게 도끼 생성 이벤트 전송
            io.emit('axe_spawn', axes[currentAxeId]);

            // 일정 시간(LIFETIME) 후 도끼 자동 소멸 타이머 설정
            axes[currentAxeId].timer = setTimeout(() => {
                if (axes[currentAxeId]) {
                    // 클라이언트에 소멸 알림
                    io.emit('axe_destroy', currentAxeId);
                    delete axes[currentAxeId];
                }
            }, AXE_LIFETIME);
        }
    });

    // 4. 플레이어 부활 요청 수신
    socket.on('respawn', () => {
        if (players[playerId] && !players[playerId].isAlive) {
            
            // ==========================================
            // [수정 사항] 플레이어 부활 위치 Y축 변경
            // ==========================================
            // 기존: 맵 중앙 근처 랜덤 부활 (Y: -10 ~ 10)
            // players[playerId].x = Math.random() * 20 - 10;
            // players[playerId].y = Math.random() * 20 - 10;

            // 수정: 부활 위치도 초기 스폰과 동일하게 위쪽 영역으로 설정
            players[playerId].x = Math.random() * 30 - 15;
            players[playerId].y = Math.random() * 10 + 5; 

            // 능력치 초기화
            players[playerId].hp = 100;
            players[playerId].isAlive = true;
            players[playerId].killCount = 0;

            // 모든 클라이언트에게 부활 사실과 새로운 위치 알림
            io.emit('player_respawn', {
                id: playerId,
                x: players[playerId].x,
                y: players[playerId].y
            });
            console.log(`Player respawned: ${playerId}`);
        }
    });

    // 5. 접속 종료 처리
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${playerId}`);
        if (players[playerId]) {
            delete players[playerId];
            // 다른 클라이언트에게 퇴장 알림
            io.emit('player_leave', playerId);
        }
    });
});

// ==========================================
// 서버 핵심 로직 루프 (메인 타이머)
// ==========================================

// 게임 상태 업데이트 주기 (1초에 약 33번 업데이트 - 30 FPS 수준)
const TICK_RATE = 30;
const TICK_TIME = 1000 / TICK_RATE;

setInterval(() => {
    handleCollisions();  // 충돌 감지
    syncGameState();     // 상태 동기화 패킷 전송
}, TICK_TIME);

// 1. 도끼와 타 플레이어 간의 충돌 판정 루틴
function handleCollisions() {
    for (const axeId in axes) {
        const axe = axes[axeId];
        
        // 도끼 소유자 정보가 없으면 무시
        if (!players[axe.ownerId]) continue;

        // 모든 플레이어를 대상으로 충돌 체크
        for (const targetId in players) {
            const target = players[targetId];

            // 자기 자신이나 이미 죽은 플레이어는 무시
            if (targetId === axe.ownerId || !target.isAlive) continue;

            // 도끼 중심과 타겟 중심 간의 2D 평면 거리 계산
            const dx = axe.x - target.x;
            const dy = axe.y - target.y;
            // 거리의 제곱값 (성능을 위해 제곱근 계산 생략)
            const distSq = dx * dx + dy * dy; 

            // 충돌 반경 설정 (예: 0.6 미터 이내면 충돌로 간주)
            const hitRadius = 0.6;
            
            // 충돌 발생 시
            if (distSq < hitRadius * hitRadius) {
                // 타겟 플레이어 체력 차감
                target.hp -= AXE_DAMAGE;
                
                // 타겟 데미지 이벤트 전송
                io.emit('player_hit', { id: targetId, hp: target.hp });

                // 도끼 적중 즉시 소멸
                clearTimeout(axe.timer); // 수명 타이머 취소
                io.emit('axe_destroy', axeId);
                delete axes[axeId];

                // 타겟이 사망했는지 확인
                if (target.hp <= 0) {
                    target.isAlive = false;
                    
                    // 공격자 킬 카운트 및 점수 증가
                    players[axe.ownerId].killCount++;
                    players[axe.ownerId].score += 100; // 1킬당 100점

                    // 모든 클라이언트에게 사망 정보 및 처치 정보 전송
                    io.emit('player_die', { 
                        victimId: targetId, 
                        attackerId: axe.ownerId 
                    });
                    console.log(`Player ${targetId} was killed by ${axe.ownerId}`);
                }
                
                // 하나의 도끼는 한 프레임에 한 명의 대상만 타격 (관통 없음)
                break; 
            }
        }
    }
}

// 2. 모든 클라이언트에게 동기화된 게임 상태 패킷 전송
function syncGameState() {
    if (Object.keys(players).length === 0) return;
    
    const syncData = {};
    for (const pId in players) {
        // 네트워크 대역폭 절약을 위해 꼭 필요한 데이터만 추출하여 전송
        syncData[pId] = {
            x: players[pId].x,
            y: players[pId].y,
            score: players[pId].score
        };
    }
    
    // 'sync' 이벤트를 통해 상태 데이터 일괄 전송 (Unreliable)
    io.volatile.emit('sync', syncData);
}