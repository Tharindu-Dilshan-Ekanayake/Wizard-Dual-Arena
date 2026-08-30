import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { characterRefs } from '../store/characterRefs.js';
import { spellClocks, now } from '../store/spellClocks.js';
import { useGameStore } from '../store/gameStore.js';
import {
  ATTACK_COOLDOWN,
  ATTACK_DAMAGE,
  PROJECTILE_SPEED,
  PROJECTILE_HIT_RADIUS,
  PROJECTILE_POOL_SIZE,
  GUARD_COOLDOWN,
  GUARD_DURATION,
  CHARACTER_SCALE,
} from '../constants.js';
import { playCast, playImpact, playBlock, playGuardUp } from '../audio/soundManager.js';

const LOCOMOTION_STATES = new Set(['idle', 'run']);
const CHEST_HEIGHT = 0.45 * CHARACTER_SCALE;

function randomDamage() {
  const [min, max] = ATTACK_DAMAGE;
  return Math.round(min + Math.random() * (max - min));
}

const FORWARD_OFFSET = 0.45 * CHARACTER_SCALE;

// Deliberately NOT bone-based (e.g. right-hand bone world position): this
// asset's armature bind pose is at a wildly different scale than its mesh
// surface (an asset-generation quirk -- verified the Hips bone alone reports
// a world Y higher than the character's own head), so any bone.matrixWorld
// read lands nowhere near the visible mesh. Chest height + facing-forward
// offset off the reliable root transform instead.
function castOrigin(casterId) {
  const group = characterRefs[casterId].group;
  const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y);
  return new THREE.Vector3(group.position.x, group.position.y + CHEST_HEIGHT, group.position.z).addScaledVector(
    forward,
    FORWARD_OFFSET
  );
}

/**
 * Owns one caster's outgoing projectile pool, attack/guard cooldowns, and
 * (when inputDriven) the mouse listeners that trigger them. AI calls the
 * returned castAttack/castGuard directly instead of via mouse input.
 */
export function useSpellSystem(casterId, targetId, { inputDriven = false } = {}) {
  const damageCharacter = useGameStore((s) => s.damageCharacter);
  const setAnimState = useGameStore((s) => s.setAnimState);
  const setGuarding = useGameStore((s) => s.setGuarding);
  const controlsActiveRef = useRef(false);
  controlsActiveRef.current = useGameStore((s) => s.controlsActive);

  const pool = useMemo(
    () =>
      Array.from({ length: PROJECTILE_POOL_SIZE }, () => ({
        active: false,
        ref: { current: null },
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
      })),
    []
  );

  const guardUntil = useRef(0);
  const phase = useGameStore((s) => s.phase);
  const targetChestPoint = useRef(new THREE.Vector3()).current;

  useEffect(() => {
    if (phase !== 'playing') return;
    spellClocks[casterId].attackReadyAt = 0;
    spellClocks[casterId].guardReadyAt = 0;
    guardUntil.current = 0;
    for (const slot of pool) {
      slot.active = false;
      if (slot.ref.current) slot.ref.current.visible = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The frame loop already freezes projectile movement once controlsActive
  // goes false on round end, but freezing isn't hiding -- without this, a
  // shot still mid-flight when the match ends stays visibly floating in
  // place through the Victory/Defeat screen. Separate from the effect above
  // since that one only resets when *entering* 'playing', not leaving it.
  useEffect(() => {
    if (phase === 'playing') return;
    for (const slot of pool) {
      slot.active = false;
      if (slot.ref.current) slot.ref.current.visible = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function setLocomotionSafe(nextState) {
    const current = useGameStore.getState().characters[casterId].animState;
    if (LOCOMOTION_STATES.has(current) || current === 'fight' || current === 'guard') {
      setAnimState(casterId, nextState);
    }
  }

  function castAttack() {
    const state = useGameStore.getState();
    if (state.phase !== 'playing' || !state.controlsActive) return;
    const t = now();
    if (t < spellClocks[casterId].attackReadyAt) return;
    spellClocks[casterId].attackReadyAt = t + ATTACK_COOLDOWN;

    const slot = pool.find((p) => !p.active);
    if (!slot) return;

    const targetRef = characterRefs[targetId];
    if (!targetRef.group) return;

    const origin = castOrigin(casterId);
    const targetPoint = new THREE.Vector3(
      targetRef.group.position.x,
      targetRef.group.position.y + CHEST_HEIGHT,
      targetRef.group.position.z
    );
    const dir = targetPoint.clone().sub(origin).normalize();

    slot.active = true;
    slot.position.copy(origin);
    slot.velocity.copy(dir).multiplyScalar(PROJECTILE_SPEED);
    slot.life = 0;
    if (slot.ref.current) {
      slot.ref.current.position.copy(origin);
      slot.ref.current.visible = true;
    }

    setAnimState(casterId, 'fight');
    playCast();
    const fightAction = characterRefs[casterId].actions?.fight;
    const fightMs = fightAction ? fightAction.getClip().duration * 1000 : 900;
    setTimeout(() => setLocomotionSafe('idle'), fightMs);
  }

  function castGuard() {
    const state = useGameStore.getState();
    if (state.phase !== 'playing' || !state.controlsActive) return;
    const t = now();
    if (t < spellClocks[casterId].guardReadyAt) return;
    spellClocks[casterId].guardReadyAt = t + GUARD_COOLDOWN;

    guardUntil.current = t + GUARD_DURATION;
    setGuarding(casterId, true);
    setAnimState(casterId, 'guard');
    playGuardUp();

    setTimeout(() => {
      setGuarding(casterId, false);
      setLocomotionSafe('idle');
    }, GUARD_DURATION * 1000);
  }

  useEffect(() => {
    if (!inputDriven) return;
    const onMouseDown = (e) => {
      if (!controlsActiveRef.current) return;
      if (e.button === 0) castAttack();
      if (e.button === 2) castGuard();
    };
    const onContextMenu = (e) => e.preventDefault();
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('contextmenu', onContextMenu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputDriven]);

  useFrame((_, delta) => {
    if (!controlsActiveRef.current) return; // freeze in-flight projectiles while paused/counting down

    const targetRef = characterRefs[targetId];
    const targetGuarding = useGameStore.getState().characters[targetId]?.isGuarding;

    for (const slot of pool) {
      if (!slot.active) continue;
      slot.life += delta;
      slot.position.addScaledVector(slot.velocity, delta);
      if (slot.ref.current) slot.ref.current.position.copy(slot.position);

      let hit = false;
      if (targetRef.group) {
        targetChestPoint.set(targetRef.group.position.x, targetRef.group.position.y + CHEST_HEIGHT, targetRef.group.position.z);
        const dist = slot.position.distanceTo(targetChestPoint);
        if (dist < PROJECTILE_HIT_RADIUS) {
          hit = true;
          if (targetGuarding) {
            playBlock();
          } else {
            damageCharacter(targetId, randomDamage());
            playImpact();
          }
        }
      }

      const expired = slot.life > 3;

      if (hit || expired) {
        slot.active = false;
        if (slot.ref.current) slot.ref.current.visible = false;
      }
    }
  });

  return { pool, isGuardingNow: () => now() < guardUntil.current, castAttack, castGuard };
}
