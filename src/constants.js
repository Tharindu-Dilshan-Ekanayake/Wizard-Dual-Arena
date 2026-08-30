// Shared gameplay tuning values. Central so movement, AI, and the spell
// system stay consistent without importing each other.

// One-shot poses must be able to re-trigger even while already "in" that
// state (e.g. re-casting attack mid-swing), unlike idle/run which should
// only change when the state actually changes.
export const ONE_SHOT_ANIM_STATES = new Set(['fight', 'loss', 'victory', 'jump']);

// Ground is now a tiled grid of the decorative mesh (see Ground.jsx) instead
// of one giant stretched copy -- a real repeating floor instead of a mostly-
// flat-colored fallback plane. Backing plane covers the whole grid, so
// there's no need for the old conservative "25% of scale" safety margin;
// ARENA_BOUNDS can use most of the actual tiled extent.
export const GROUND_TILE_SCALE_XZ = 10;
export const GROUND_TILE_SCALE_Y = 0.85;
export const GROUND_GRID_SIZE = 7; // tiles per side (odd, so one tile centers on origin)
const GROUND_HALF_EXTENT = (GROUND_GRID_SIZE * GROUND_TILE_SCALE_XZ) / 2;
export const ARENA_BOUNDS = { x: GROUND_HALF_EXTENT * 0.85, z: GROUND_HALF_EXTENT * 0.85 };
export const GROUND_Y = 0;

// Characters render noticeably bigger than the source mesh's native 1-unit
// height for legibility against the ground/arena scale. Everything sized or
// offset relative to character height (health bar, shield, chest-height
// spell origin, foot-shadow stride) derives from this so it all scales
// together instead of drifting out of proportion.
export const CHARACTER_SCALE = 10;
// A small deliberate overlap into the ground rather than sitting exactly
// flush -- any tiny residual misalignment then reads as feet planted in the
// dirt, not a gap underneath them.
export const FEET_EMBED = 0.06;

// Scaled with CHARACTER_SCALE so a bigger character doesn't suddenly feel
// slower crossing the (also bigger) arena.
export const MOVE_SPEED = CHARACTER_SCALE * 2.05; // units/sec
export const MOVE_ACCEL = 10; // lerp rate, higher = snappier

// NOT fully proportional to CHARACTER_SCALE on purpose: distance/height used
// to scale 1:1 with it (x7 and x3), which means the camera pulled back
// exactly as fast as the character grew -- the character's actual on-screen
// size barely changed no matter how many times CHARACTER_SCALE went up,
// only its size *relative to the ground tiles* did. A large fixed base with
// only a small per-scale term means a bigger CHARACTER_SCALE now actually
// reads as a bigger character in view, while still pulling back a little at
// very large sizes so the camera doesn't clip into it.
export const CAMERA_DISTANCE = 25 + CHARACTER_SCALE * 1.5;
export const CAMERA_HEIGHT = 10 + CHARACTER_SCALE * 0.7;
export const CAMERA_LOOK_HEIGHT = CHARACTER_SCALE * 0.405;
export const CAMERA_LERP = 6;

export const ATTACK_COOLDOWN = 1.3; // seconds
export const ATTACK_DAMAGE = [10, 15]; // min, max
export const ATTACK_RANGE = 12;
export const PROJECTILE_SPEED = CHARACTER_SCALE * 4.4;
export const PROJECTILE_HIT_RADIUS = 0.55 * CHARACTER_SCALE;
export const PROJECTILE_POOL_SIZE = 8;

export const GUARD_COOLDOWN = 3.5; // seconds
export const GUARD_DURATION = 2; // seconds

export const AI_ATTACK_RANGE = ARENA_BOUNDS.x * 1.2;

// Difficulty controls how "smart" the AI plays -- movement speed, how fast
// it reacts, and how often it actually dodges an incoming spell rather than
// just eating it. 'medium' matches the values this was originally tuned at,
// so picking medium is a no-op change from before difficulty existed.
export const DEFAULT_DIFFICULTY = 'medium';
export const DIFFICULTY_PRESETS = {
  easy: {
    label: 'Easy',
    aiSpeedFactor: 0.7, // fraction of MOVE_SPEED -- noticeably slower than the player, easy to outrun
    reactionDelay: [400, 750], // ms, min/max before acting on a decision
    dodgeChance: 0.3, // probability of actually sidestepping a detected incoming spell
  },
  medium: {
    label: 'Medium',
    aiSpeedFactor: 0.95,
    reactionDelay: [100, 300],
    dodgeChance: 0.72,
  },
  hard: {
    label: 'Hard',
    aiSpeedFactor: 1.08, // slightly faster than the player -- you can't just walk away from it
    reactionDelay: [40, 120],
    dodgeChance: 0.92,
  },
};
