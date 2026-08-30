import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { characterRefs } from '../store/characterRefs.js';
import { sampleGroundHeight } from '../store/groundRef.js';
import { useGameStore } from '../store/gameStore.js';
import { useSpellSystem } from './useSpellSystem.js';
import {
  ARENA_BOUNDS,
  GROUND_Y,
  MOVE_SPEED,
  AI_ATTACK_RANGE,
  PROJECTILE_HIT_RADIUS,
  DIFFICULTY_PRESETS,
  DEFAULT_DIFFICULTY,
} from '../constants.js';

const STATE = { APPROACH: 'APPROACH', ATTACK: 'ATTACK', GUARD: 'GUARD', RETREAT: 'RETREAT', DODGE: 'DODGE' };

// Dodge tuning: a projectile is a "threat" if, at its current straight-line
// heading, it will pass within this radius of the AI's current position
// within the lookahead window. Not a perfect dodge-bot on purpose even on
// Hard (dodgeChance + a short reaction delay before the sidestep actually
// starts) -- a 100% read-your-mind dodge reads as cheating, not "smarter".
const DODGE_TRIGGER_RADIUS = PROJECTILE_HIT_RADIUS * 4.5;
const DODGE_LOOKAHEAD = 0.35; // seconds
const DODGE_DURATION = 0.4; // seconds of sidestep once triggered
const DODGE_SPEED_FACTOR = 1.15; // relative to the AI's own move speed -- a dodge should feel a little sharper than a normal step
const DODGE_RETRIGGER_COOLDOWN = 0.5; // seconds before the AI can dodge again, so it doesn't jitter against a stream of shots

function randomReactionDelay(range) {
  const [min, max] = range;
  return (min + Math.random() * (max - min)) / 1000;
}

const scratchPredicted = new THREE.Vector3();

/** True if `slot`'s projectile is on a heading that passes near `aiPos` soon. */
function isIncomingThreat(slot, aiPos) {
  if (!slot.active) return false;
  scratchPredicted.copy(slot.position).addScaledVector(slot.velocity, DODGE_LOOKAHEAD);
  return scratchPredicted.distanceTo(aiPos) < DODGE_TRIGGER_RADIUS;
}

/**
 * Simple finite-state AI: closes distance, attacks in range, occasionally
 * guards preemptively or reactively after taking a hit, backs off briefly
 * after landing or receiving a hit, and -- the "smarter" part -- watches
 * the player's outgoing projectiles and sidesteps ones headed its way
 * instead of just standing there eating every shot. Casts go through the
 * same useSpellSystem the player uses, just called directly instead of via
 * mouse. Move speed, reaction time, and dodge frequency all come from the
 * selected difficulty preset (constants.js), chosen before the match starts.
 */
export function useAIOpponent(aiId, playerId, incomingPool) {
  const spell = useSpellSystem(aiId, playerId, { inputDriven: false });
  const setLocomotion = useGameStore((s) => s.setLocomotion);
  const difficulty = useGameStore((s) => s.difficulty);
  const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS[DEFAULT_DIFFICULTY];
  const aiSpeed = MOVE_SPEED * preset.aiSpeedFactor;

  const fsm = useRef({ state: STATE.APPROACH, timer: randomReactionDelay(preset.reactionDelay), lastHp: 100, dodgeDir: 1, lastDodgeAt: -999 });
  const groundY = useRef(GROUND_Y);
  const phase = useGameStore((s) => s.phase);
  // Reused every frame instead of allocating Vector3s in the hot loop.
  const toPlayer = useRef(new THREE.Vector3()).current;
  const dodgeVec = useRef(new THREE.Vector3()).current;
  const elapsed = useRef(0);

  useEffect(() => {
    if (phase !== 'playing') return;
    fsm.current = { state: STATE.APPROACH, timer: randomReactionDelay(preset.reactionDelay), lastHp: 100, dodgeDir: 1, lastDodgeAt: -999 };
    groundY.current = GROUND_Y;
    elapsed.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useFrame((_, delta) => {
    const aiRef = characterRefs[aiId];
    const playerRef = characterRefs[playerId];
    if (!aiRef.group || !playerRef.group) return;

    const gs = useGameStore.getState();
    if (gs.phase !== 'playing' || !gs.controlsActive) return;

    elapsed.current += delta;
    const f = fsm.current;
    const aiChar = gs.characters[aiId];

    if (aiChar.hp < f.lastHp) {
      f.lastHp = aiChar.hp;
      f.state = Math.random() < 0.5 ? STATE.GUARD : STATE.RETREAT;
      f.timer = randomReactionDelay(preset.reactionDelay);
    } else {
      f.lastHp = aiChar.hp;
    }

    const aiPos = aiRef.group.position;
    const playerPos = playerRef.group.position;
    toPlayer.subVectors(playerPos, aiPos);
    const dist = toPlayer.length();
    if (dist > 1e-4) toPlayer.normalize();
    else toPlayer.set(0, 0, 1);

    // Mesh's authored "front" faces +Z at yaw 0 -- see matching note in
    // useCharacterController.js.
    aiRef.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

    // Threat scan runs regardless of current state (except mid-dodge/already
    // cooling down) -- a real incoming shot should be able to interrupt an
    // approach or an attack wind-up, not just get queued behind them.
    if (
      f.state !== STATE.DODGE &&
      incomingPool &&
      elapsed.current - f.lastDodgeAt > DODGE_RETRIGGER_COOLDOWN &&
      Math.random() < preset.dodgeChance &&
      incomingPool.some((slot) => isIncomingThreat(slot, aiPos))
    ) {
      // Sidestep perpendicular to the line to the player, picked randomly
      // each time rather than a fixed "always dodge right" tell.
      f.dodgeDir = Math.random() < 0.5 ? 1 : -1;
      f.state = STATE.DODGE;
      f.timer = DODGE_DURATION;
      f.lastDodgeAt = elapsed.current;
    }

    let moveSign = 0; // +1 approach, -1 retreat, 0 hold

    switch (f.state) {
      case STATE.APPROACH:
        if (dist > AI_ATTACK_RANGE) {
          moveSign = 1;
        } else {
          f.state = STATE.ATTACK;
          f.timer = randomReactionDelay(preset.reactionDelay);
        }
        break;

      case STATE.ATTACK:
        f.timer -= delta;
        if (f.timer <= 0) {
          if (dist <= AI_ATTACK_RANGE * 1.3) spell.castAttack();
          f.state = Math.random() < 0.25 ? STATE.GUARD : STATE.APPROACH;
          f.timer = randomReactionDelay(preset.reactionDelay);
        }
        break;

      case STATE.GUARD:
        f.timer -= delta;
        if (f.timer <= 0) {
          spell.castGuard();
          f.state = STATE.APPROACH;
        }
        break;

      case STATE.RETREAT:
        moveSign = -1;
        f.timer -= delta;
        if (f.timer <= 0) f.state = STATE.APPROACH;
        break;

      case STATE.DODGE:
        f.timer -= delta;
        // Perpendicular to the AI<->player line (in the XZ plane), not to
        // facing -- facing already tracks the player, so "right" of facing
        // and "perpendicular to toPlayer" are the same direction here.
        dodgeVec.set(-toPlayer.z, 0, toPlayer.x).multiplyScalar(f.dodgeDir);
        aiRef.group.position.x += dodgeVec.x * aiSpeed * DODGE_SPEED_FACTOR * delta;
        aiRef.group.position.z += dodgeVec.z * aiSpeed * DODGE_SPEED_FACTOR * delta;
        setLocomotion(aiId, 'run');
        if (f.timer <= 0) f.state = STATE.APPROACH;
        break;

      default:
        f.state = STATE.APPROACH;
    }

    if (f.state !== STATE.DODGE) {
      if (moveSign !== 0) {
        aiRef.group.position.x += toPlayer.x * moveSign * aiSpeed * delta;
        aiRef.group.position.z += toPlayer.z * moveSign * aiSpeed * delta;
        setLocomotion(aiId, 'run');
      } else {
        setLocomotion(aiId, 'idle');
      }
    }

    aiRef.group.position.x = THREE.MathUtils.clamp(aiRef.group.position.x, -ARENA_BOUNDS.x, ARENA_BOUNDS.x);
    aiRef.group.position.z = THREE.MathUtils.clamp(aiRef.group.position.z, -ARENA_BOUNDS.z, ARENA_BOUNDS.z);
    groundY.current = sampleGroundHeight(aiRef.group.position.x, aiRef.group.position.z, groundY.current);
    aiRef.group.position.y = groundY.current;
  });

  return spell;
}
