import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCharacterAnimations } from '../hooks/useCharacterAnimations.js';
import { registerCharacterRef } from '../store/characterRefs.js';
import { useGameStore } from '../store/gameStore.js';
import { CHARACTER_SCALE, FEET_EMBED } from '../constants.js';
import HealthBar from './HealthBar.jsx';
import ShieldBarrier from './ShieldBarrier.jsx';

const CROSSFADE_SECONDS = 0.2;

// Source meshes are pivoted at head height (feet reach down to local y=-1),
// so lift the mesh by its own (scaled) height to bring feet to the group's
// y=0, then back off by FEET_EMBED so they sit slightly *into* the ground
// rather than exactly flush -- a small deliberate overlap reads as planted
// feet even if the ground-height sample is off by a hair, where an equally
// small gap reads as floating.
const FEET_Y_OFFSET = CHARACTER_SCALE * ( 0.1- FEET_EMBED);

export const CHARACTER_CLIPS = {
  harry: {
    characterUrl: '/models/harry/character.glb',
    clipUrls: {
      run: '/models/harry/run.glb',
      fight: '/models/harry/fight.glb',
      loss: '/models/harry/loss.glb',
      victory: '/models/harry/victory.glb',
    },
  },
  malfoi: {
    characterUrl: '/models/malfoi/character.glb',
    clipUrls: {
      run: '/models/malfoi/run.glb',
      fight: '/models/malfoi/fight.glb',
      loss: '/models/malfoi/loss.glb',
      jump: '/models/malfoi/jump.glb',
    },
  },
};

const ONE_SHOT_STATES = new Set(['fight', 'loss', 'victory', 'jump']);

/**
 * Prop-driven character actor. `model` selects which asset set to load
 * ('harry' | 'malfoi'). Position/rotation after mount are owned by whichever
 * controller (player input or AI) drives this character's registered ref --
 * `startPosition`/`startRotation` only place it at spawn.
 */
export default function Character({ id, model, startPosition = [0, 0, 0], startRotation = [0, 0, 0] }) {
  const { characterUrl, clipUrls } = CHARACTER_CLIPS[model];
  const { scene, actions } = useCharacterAnimations(characterUrl, clipUrls);
  const groupRef = useRef();
  const prevState = useRef('idle');

  const animState = useGameStore((s) => s.characters[id].animState);
  const seq = useGameStore((s) => s.characters[id].seq);
  const isGuarding = useGameStore((s) => s.characters[id].isGuarding);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (!groupRef.current) return;
    registerCharacterRef(id, groupRef.current, scene, actions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, actions]);

  // Re-place at spawn both on mount and on every fresh round (Play Again
  // re-enters 'playing' without remounting these components).
  useEffect(() => {
    if (!groupRef.current || phase !== 'playing') return;
    groupRef.current.position.set(...startPosition);
    groupRef.current.rotation.set(...startRotation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    const nextAction = actions[animState];
    if (!nextAction) return;

    const prevAction = actions[prevState.current];
    nextAction.reset().fadeIn(CROSSFADE_SECONDS).play();
    if (prevAction && prevAction !== nextAction) {
      prevAction.fadeOut(CROSSFADE_SECONDS);
    }

    if (ONE_SHOT_STATES.has(animState)) {
      nextAction.clampWhenFinished = true;
      nextAction.setLoop(THREE.LoopOnce, 1);
    } else {
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
    }

    prevState.current = animState;
  }, [animState, seq, actions]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (animState === 'idle') {
      const t = clock.getElapsedTime();
      groupRef.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.015);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={CHARACTER_SCALE} position={[0, FEET_Y_OFFSET, 0]} />
      <HealthBar characterId={id} />
      {isGuarding && <ShieldBarrier position={[0, CHARACTER_SCALE * 0.65, 0]} radius={CHARACTER_SCALE * 0.75} />}
    </group>
  );
}
