import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { usePointerLock } from './usePointerLock.js';
import { characterRefs } from '../store/characterRefs.js';
import { sampleGroundHeight } from '../store/groundRef.js';
import { useGameStore } from '../store/gameStore.js';
import {
  ARENA_BOUNDS,
  GROUND_Y,
  MOVE_SPEED,
  MOVE_ACCEL,
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_LOOK_HEIGHT,
  CAMERA_LERP,
} from '../constants.js';

function useKeyState() {
  const keys = useRef({});
  useEffect(() => {
    const onDown = (e) => { keys.current[e.code] = true; };
    const onUp = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);
  return keys;
}

// How long the mouse has to sit idle before the camera starts drifting back
// toward the character's facing, and how fast that drift happens once
// triggered (exponential-decay rate, same style as the other lerps here).
const RECENTER_DELAY_MS = 350;
const RECENTER_SPEED = 2.5;

/**
 * Drives the human-controlled character: lock-on style WASD movement (W
 * toward the opponent, S away, A/D strafe around them) with lerped
 * accel/decel, always relative to the character's own opponent-facing
 * rotation regardless of where the camera is currently looking. The camera
 * itself is a hybrid: mouse yaw free-looks around that facing (an offset,
 * not an absolute angle), and auto-recenters back to 0 -- i.e. back to
 * facing the opponent -- once the mouse has been idle for a moment. Plain
 * mouse-yaw-is-the-camera (no facing tie-in at all) meant a player who
 * hadn't manually aimed at the opponent couldn't see them even though their
 * character was already facing/attacking them; this keeps manual look-
 * around without permanently losing that. Mouse Y still controls pitch
 * directly, unaffected by recentering. animState (idle/run) is driven off
 * speed without clobbering one-shot states like fight/guard/loss/victory.
 */
export function useCharacterController(characterId, opponentId) {
  const { camera } = useThree();
  if (import.meta.env.DEV) window.__camera = camera;
  const look = usePointerLock();
  if (import.meta.env.DEV) window.__look = look;
  const keys = useKeyState();
  const setLocomotion = useGameStore((s) => s.setLocomotion);
  const controlsActive = useGameStore((s) => s.controlsActive);

  const velocity = useRef(new THREE.Vector3());
  const cameraPos = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const groundY = useRef(GROUND_Y);
  const phase = useGameStore((s) => s.phase);

  // Scratch objects reused every frame instead of `new`d inside useFrame --
  // this callback runs 60x/sec, and allocating half a dozen Vector3s each
  // tick creates steady GC pressure that shows up as stutter over time.
  const scratch = useRef({
    yAxis: new THREE.Vector3(0, 1, 0),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    camForward: new THREE.Vector3(),
    inputDir: new THREE.Vector3(),
    toOpponent: new THREE.Vector3(),
    desiredCamPos: new THREE.Vector3(),
  }).current;

  useEffect(() => {
    if (phase !== 'playing') return;
    velocity.current.set(0, 0, 0);
    groundY.current = GROUND_Y;
    initialized.current = false; // re-snap camera behind the respawned character next frame
  }, [phase]);

  useFrame((_, delta) => {
    const ref = characterRefs[characterId];
    if (!ref.group) return;
    const group = ref.group;

    if (!initialized.current) {
      cameraPos.current.set(group.position.x, group.position.y + CAMERA_HEIGHT, group.position.z + CAMERA_DISTANCE);
      initialized.current = true;
    }

    // Facing is computed FIRST, off pre-movement positions, so both WASD
    // (lock-on relative to it) and the camera (behind it) use the same,
    // current-frame direction -- not a stale one from before this tick's
    // movement.
    const opponentGroup = characterRefs[opponentId]?.group;
    if (opponentGroup) {
      scratch.toOpponent.subVectors(opponentGroup.position, group.position);
      if (scratch.toOpponent.lengthSq() > 1e-6) {
        // Mesh's authored "front" faces +Z at yaw 0, not -Z (three.js's usual
        // camera-forward convention) -- confirmed visually, characters were
        // showing their backs to each other without this 180 degree flip.
        group.rotation.y = Math.atan2(scratch.toOpponent.x, scratch.toOpponent.z);
      }
    }

    scratch.forward.set(0, 0, 1).applyAxisAngle(scratch.yAxis, group.rotation.y);
    // Verified empirically (not re-derived by hand -- got bitten by a sign
    // error doing that before): -1 here is what actually makes D strafe to
    // screen-right and A to screen-left, given this camera's setup.
    scratch.right.set(-1, 0, 0).applyAxisAngle(scratch.yAxis, group.rotation.y);

    // Free-look offset auto-recenters back to 0 (i.e. back to plain facing)
    // once the mouse has been idle a moment -- keeps the opponent easy to
    // find again without the player having to manually re-aim.
    if (performance.now() - look.current.lastMoveTime > RECENTER_DELAY_MS) {
      look.current.yawOffset *= Math.exp(-RECENTER_SPEED * delta);
    }
    scratch.camForward.set(0, 0, 1).applyAxisAngle(scratch.yAxis, group.rotation.y + look.current.yawOffset);

    let moveX = 0;
    let moveZ = 0;
    if (controlsActive && phase === 'playing') {
      if (keys.current['KeyW']) moveZ += 1;
      if (keys.current['KeyS']) moveZ -= 1;
      if (keys.current['KeyD']) moveX += 1;
      if (keys.current['KeyA']) moveX -= 1;
    }

    scratch.inputDir
      .set(0, 0, 0)
      .addScaledVector(scratch.forward, moveZ)
      .addScaledVector(scratch.right, moveX);
    if (scratch.inputDir.lengthSq() > 1) scratch.inputDir.normalize();

    const targetVelocity = scratch.inputDir.multiplyScalar(MOVE_SPEED);
    const lerpT = 1 - Math.exp(-MOVE_ACCEL * delta);
    velocity.current.lerp(targetVelocity, lerpT);

    group.position.x += velocity.current.x * delta;
    group.position.z += velocity.current.z * delta;
    group.position.x = THREE.MathUtils.clamp(group.position.x, -ARENA_BOUNDS.x, ARENA_BOUNDS.x);
    group.position.z = THREE.MathUtils.clamp(group.position.z, -ARENA_BOUNDS.z, ARENA_BOUNDS.z);
    groundY.current = sampleGroundHeight(group.position.x, group.position.z, groundY.current);
    group.position.y = groundY.current;

    const speed = velocity.current.length();
    setLocomotion(characterId, speed > 0.4 ? 'run' : 'idle');

    // Third-person follow camera: position sits at a fixed height/distance
    // behind camForward (facing + free-look offset) -- it never moves closer
    // to the ground regardless of look direction. Pitch instead tilts where
    // the camera *looks* (a point above/below head height), so looking
    // up/down can't drag the camera down into a ground-grazing angle.
    scratch.desiredCamPos.set(
      group.position.x - scratch.camForward.x * CAMERA_DISTANCE,
      group.position.y + CAMERA_HEIGHT,
      group.position.z - scratch.camForward.z * CAMERA_DISTANCE
    );

    const camLerpT = 1 - Math.exp(-CAMERA_LERP * delta);
    cameraPos.current.lerp(scratch.desiredCamPos, camLerpT);
    camera.position.copy(cameraPos.current);

    const lookHeight = group.position.y + CAMERA_LOOK_HEIGHT + Math.tan(look.current.pitch) * CAMERA_DISTANCE;
    camera.lookAt(group.position.x, lookHeight, group.position.z);
  });
}
