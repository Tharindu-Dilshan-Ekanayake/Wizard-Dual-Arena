import { useEffect } from 'react';
import { characterRefs } from '../store/characterRefs.js';
import { useGameStore } from '../store/gameStore.js';
import { playVictory, playDefeat } from '../audio/soundManager.js';

const FALLBACK_MS = 3000;
const VICTORY_STATE = { harry: 'victory', malfoi: 'jump' };

function clipDurationMs(characterId, animState) {
  const action = characterRefs[characterId]?.actions?.[animState];
  return action ? action.getClip().duration * 1000 : FALLBACK_MS;
}

/**
 * Holds the Play Again overlay back until the loss/victory pose triggered by
 * `damageCharacter` has actually finished playing, instead of popping up
 * over it immediately. AI/input already froze the instant `phase` became
 * 'roundEnd' -- this only delays the screen.
 */
export function useRoundEndTimer() {
  const phase = useGameStore((s) => s.phase);
  const playerId = useGameStore((s) => s.playerId);
  const aiId = useGameStore((s) => s.aiId);
  const winner = useGameStore((s) => s.winner);
  const showRoundEndScreen = useGameStore((s) => s.showRoundEndScreen);

  useEffect(() => {
    if (phase !== 'roundEnd') return;

    const winnerId = winner === 'player' ? playerId : aiId;
    const loserId = winner === 'player' ? aiId : playerId;
    const delay = Math.max(clipDurationMs(loserId, 'loss'), clipDurationMs(winnerId, VICTORY_STATE[winnerId]));

    const timer = setTimeout(showRoundEndScreen, delay);
    return () => clearTimeout(timer);
  }, [phase, playerId, aiId, winner, showRoundEndScreen]);

  // Separate effect (fires immediately, not delayed like the screen) so the
  // sting plays right as the loss/victory pose starts, not once it's over.
  useEffect(() => {
    if (phase !== 'roundEnd') return;
    if (winner === 'player') playVictory();
    else if (winner === 'ai') playDefeat();
  }, [phase, winner]);
}
