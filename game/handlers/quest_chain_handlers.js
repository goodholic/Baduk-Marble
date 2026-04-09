// 퀘스트 체인 소켓 핸들러 — v2.19

function registerQuestChainHandlers(socket, ctx) {
    const { io, players, playerId, savePlayer, questChain } = ctx;

    // 현재 퀘스트 상태 조회
    socket.on('quest_chain_status', () => {
        const p = players[playerId];
        if (!p) return;
        const status = questChain.getQuestStatus(p);
        socket.emit('quest_chain_status', status);
    });

    // 퀘스트 보상 수령
    socket.on('quest_chain_claim', (data) => {
        const p = players[playerId];
        if (!p) return;
        if (!data || !data.questId) return;
        const result = questChain.claimReward(p, data.questId, data.isHidden || false);
        if (result.success) {
            savePlayer(p);
            io.emit('player_update', p);
            // 다음 퀘스트 자동 안내
            const next = questChain.getNextQuest(p);
            socket.emit('quest_chain_next', next);
            if (!data.isHidden) {
                io.emit('server_msg', {
                    msg: `[스토리] ${p.displayName}이(가) "${result.questName}" 완료!`,
                    type: 'rare'
                });
            }
        }
        socket.emit('quest_chain_claim_result', result);
    });

    // 분기 선택
    socket.on('quest_chain_branch', (data) => {
        const p = players[playerId];
        if (!p || !data || !data.questId || !data.branch) return;
        const result = questChain.selectBranch(p, data.questId, data.branch);
        socket.emit('quest_chain_branch_result', result);
        if (result.success) savePlayer(p);
    });

    // 퀘스트 길잡이 (현재 진행 중 퀘스트)
    socket.on('quest_chain_guide', () => {
        const p = players[playerId];
        if (!p) return;
        const current = questChain.getNextQuest(p);
        socket.emit('quest_chain_guide', current);
    });
}

module.exports = { registerQuestChainHandlers };
