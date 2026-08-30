import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore.js';

/**
 * Manual pointer-lock mouse-look (not drei's PointerLockControls, which
 * drives the camera itself for a first-person rig -- here we only want the
 * raw yaw/pitch deltas so a third-person rig can orbit behind the character).
 * `yawOffset` is a free-look offset from the character's own (opponent-
 * locked) facing, not an absolute camera angle -- useCharacterController
 * auto-recenters it toward 0 after `lastMoveTime` goes idle, so mouse
 * left/right gives manual look-around without permanently losing the
 * opponent out of view. Returns a ref { yawOffset, pitch, lastMoveTime }
 * updated in place on every mousemove while locked.
 */
export function usePointerLock() {
  const { gl } = useThree();
  const setPointerLocked = useGameStore((s) => s.setPointerLocked);
  const sensitivity = useGameStore((s) => s.mouseSensitivity);
  const look = useRef({ yawOffset: 0, pitch: -0.15, lastMoveTime: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onClick = () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    };

    const onLockChange = () => {
      setPointerLocked(document.pointerLockElement === canvas);
    };

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      look.current.yawOffset -= e.movementX * sensitivity;
      look.current.pitch -= e.movementY * sensitivity;
      // Pitch only tilts the look-at target now (camera position is fixed
      // relative to the character), so a generous range is safe -- clamped
      // well short of +-PI/2 where the tan()-based look-height blows up.
      look.current.pitch = Math.max(-1.0, Math.min(1.0, look.current.pitch));
      look.current.lastMoveTime = performance.now();
    };

    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [gl, setPointerLocked, sensitivity]);

  return look;
}
