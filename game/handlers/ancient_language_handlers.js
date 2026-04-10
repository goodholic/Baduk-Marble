// 고대 언어 소켓 핸들러 — v2.44

function registerAncientLanguageHandlers(socket, ctx) {
  const { io, players, playerId, savePlayer, ancientLanguage } = ctx;

  socket.on('ancient_lang_status', () => {
    const p = players[playerId]; if (!p) return;
    socket.emit('ancient_lang_status_result', ancientLanguage.getStatus(p));
  });

  socket.on('ancient_lang_cast', (glyphSequence) => {
    const p = players[playerId]; if (!p || !p.isAlive) return;
    if (!Array.isArray(glyphSequence)) return;
    // 길이 제한
    if (glyphSequence.length < 2 || glyphSequence.length > 4) return;
    // 문자열만 허용
    if (!glyphSequence.every(g => typeof g === 'string')) return;

    const result = ancientLanguage.castSpell(p, glyphSequence);
    if (result.success) {
      savePlayer(p);
      if (result.known) {
        // 알려진 주문
        if (result.newDiscovery) {
          io.emit('server_msg', { msg: `📜 ${p.displayName}이(가) 새로운 주문 [${result.spell.name}]을 발견했다!`, type: 'legendary' });
        }
        io.emit('ancient_spell_fx', { playerId, spell: result.spell, spellKey: result.spellKey });
      } else {
        // 실험 결과 적용
        const exp = result.experiment;
        if (exp.effect.hpLossPct) p.hp = Math.max(1, Math.floor(p.hp * (1 - exp.effect.hpLossPct)));
        if (exp.effect.mpHeal) p.mp = Math.min((p.maxMp || 200), (p.mp || 0) + exp.effect.mpHeal);
        if (exp.effect.exp) p.exp = (p.exp || 0) + exp.effect.exp;
        if (exp.effect.stardust && p.constellation) {
          p.constellation.stardust = (p.constellation.stardust || 0) + exp.effect.stardust;
        }
        savePlayer(p);
      }
      io.emit('player_update', p);
    }
    socket.emit('ancient_lang_result', result);
  });
}

module.exports = { registerAncientLanguageHandlers };
