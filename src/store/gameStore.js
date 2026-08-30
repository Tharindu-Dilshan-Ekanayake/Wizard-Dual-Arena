import { create } from 'zustand';
import { ONE_SHOT_ANIM_STATES, ARENA_BOUNDS, AI_ATTACK_RANGE, DEFAULT_DIFFICULTY } from '../constants.js';

const MAX_HP = 100;

// Scaled off the arena itself rather than a fixed number: spawning closer
// together than AI_ATTACK_RANGE means the AI is already "in range" the
// instant the round starts and never has a reason to approach -- it just
// stands at spawn casting, with no walk/run animation ever playing. Spawning
// past AI_ATTACK_RANGE guarantees a real approach phase.
const SPAWN_DISTANCE = Math.min(ARENA_BOUNDS.x * 0.85, AI_ATTACK_RANGE * 1.4);
const START_TRANSFORMS = {
  harry: { position: [-SPAWN_DISTANCE, 0, 0], rotation: [0, Math.PI / 2, 0] },
  malfoi: { position: [SPAWN_DISTANCE, 0, 0], rotation: [0, -Math.PI / 2, 0] },
};

const VICTORY_STATE = { harry: 'victory', malfoi: 'jump' };

function freshCharacters() {
  return {
    harry: { animState: 'idle', hp: MAX_HP, isGuarding: false, seq: 0 },
    malfoi: { animState: 'idle', hp: MAX_HP, isGuarding: false, seq: 0 },
  };
}

/**
 * Central game state. Kept flat and serializable (position/rotation live on
 * refs via characterRefs, not here, to avoid a store write every frame) so
 * the same shape can later be piped through Socket.io for multiplayer sync
 * without restructuring -- not wired up yet, single-player only for now.
 */
export const useGameStore = create((set, get) => ({
  phase: 'menu', // 'menu' | 'select' | 'playing' | 'roundEnd'
  playerId: null,
  aiId: null,
  winner: null, // 'player' | 'ai' | null
  difficulty: DEFAULT_DIFFICULTY, // 'easy' | 'medium' | 'hard'
  setDifficulty: (difficulty) => set({ difficulty }),
  characters: freshCharacters(),
  startTransforms: START_TRANSFORMS,
  // pointerLocked: raw browser pointer-lock state (Esc, alt-tab, etc. all
  // clear it automatically). controlsActive: gameplay simulation actually
  // running -- false while paused/unlocked AND during the resume countdown,
  // so WASD/AI/casting all freeze together. countdown: null when not
  // counting down, else 3/2/1 while resuming.
  pointerLocked: false,
  controlsActive: false,
  countdown: null,
  // The loss/victory pose plays the instant phase flips to 'roundEnd' (so
  // AI/input freeze right away), but the Play Again overlay is held back
  // separately until that animation has actually finished -- see the
  // roundEndTimer effect in App.jsx, which flips this after the real clip
  // duration.
  roundEndScreenVisible: false,
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setControlsActive: (controlsActive) => set({ controlsActive }),
  setCountdown: (countdown) => set({ countdown }),
  showRoundEndScreen: () => set({ roundEndScreenVisible: true }),
  mouseSensitivity: 0.0025,

  goToSelect: () => set({ phase: 'select' }),
  goToMenu: () => set({ phase: 'menu', playerId: null, aiId: null, winner: null }),

  confirmSelect: (playerId) => {
    const aiId = playerId === 'harry' ? 'malfoi' : 'harry';
    set({
      playerId,
      aiId,
      phase: 'playing',
      winner: null,
      characters: freshCharacters(),
      controlsActive: false,
      countdown: null,
      roundEndScreenVisible: false,
    });
  },

  // `seq` bumps on every one-shot trigger even when re-casting the same pose
  // (e.g. attack mid-swing), since a same-value primitive set() alone
  // wouldn't cause subscribed selectors to re-render.
  setAnimState: (characterId, animState) =>
    set((state) => {
      const current = state.characters[characterId];
      const isOneShot = ONE_SHOT_ANIM_STATES.has(animState);
      if (!isOneShot && current.animState === animState) return state;
      return {
        characters: {
          ...state.characters,
          [characterId]: { ...current, animState, seq: isOneShot ? current.seq + 1 : current.seq },
        },
      };
    }),

  // Movement-driven idle/run only takes effect between locomotion states --
  // never interrupts a one-shot fight/guard/loss/victory pose.
  setLocomotion: (characterId, animState) =>
    set((state) => {
      const current = state.characters[characterId].animState;
      if (current !== 'idle' && current !== 'run') return state;
      if (current === animState) return state;
      return {
        characters: {
          ...state.characters,
          [characterId]: { ...state.characters[characterId], animState },
        },
      };
    }),

  setGuarding: (characterId, isGuarding) =>
    set((state) => ({
      characters: {
        ...state.characters,
        [characterId]: { ...state.characters[characterId], isGuarding },
      },
    })),

  damageCharacter: (characterId, amount) => {
    const state = get();
    if (state.phase !== 'playing') return;
    const current = state.characters[characterId];
    const hp = Math.max(0, current.hp - amount);
    const dead = hp === 0;

    set({
      characters: {
        ...state.characters,
        [characterId]: { ...current, hp },
      },
    });

    if (dead) {
      const winnerId = characterId === state.playerId ? state.aiId : state.playerId;
      const loserId = characterId;
      set((s) => ({
        phase: 'roundEnd',
        winner: winnerId === state.playerId ? 'player' : 'ai',
        controlsActive: false,
        characters: {
          ...s.characters,
          [loserId]: { ...s.characters[loserId], animState: 'loss' },
          [winnerId]: { ...s.characters[winnerId], animState: VICTORY_STATE[winnerId] },
        },
      }));
    }
  },

  playAgain: () =>
    set(() => ({
      phase: 'playing',
      winner: null,
      characters: freshCharacters(),
      controlsActive: false,
      countdown: null,
      roundEndScreenVisible: false,
    })),
}));

if (import.meta.env.DEV) {
  window.__gameStore = useGameStore;
}
