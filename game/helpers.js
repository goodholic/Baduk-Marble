// 순수 헬퍼 함수 — v1.43 (첫 함수 추출)
// server.js → game/helpers.js
// 의존성 0인 작은 유틸리티 함수들

// 레벨 → 필요 경험치 (지수 증가)
function getExpRequired(level) {
    return Math.floor(100 * Math.pow(1.12, level - 1));
}

// 어제 날짜 (YYYY-MM-DD)
function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

// ISO 주차 (YYYY-Wnn)
function getWeekNumber() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-W' + Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
}

// 오늘 날짜 (YYYY-MM-DD) — 일관된 시드/날짜 키용
function getToday() {
    return new Date().toISOString().slice(0, 10);
}

// 안전한 정수 클램프
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// 거리 계산 (유클리드)
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

module.exports = {
    getExpRequired,
    getYesterday,
    getWeekNumber,
    getToday,
    clamp,
    distance,
};
