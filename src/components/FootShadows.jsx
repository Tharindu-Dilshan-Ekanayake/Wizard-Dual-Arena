import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { characterRefs } from '../store/characterRefs.js';
import { sampleGroundHeight } from '../store/groundRef.js';
import { useGameStore } from '../store/gameStore.js';
import { CHARACTER_SCALE } from '../constants.js';

const SHADOW_Y_OFFSET = 0.05;
const RADIUS = 0.24 * CHARACTER_SCALE;
const STRIDE_LENGTH = 0.22 * CHARACTER_SCALE;
const SIDE_OFFSET = 0.11 * CHARACTER_SCALE;
const STEPS_PER_SECOND = 2.6; // gait frequency while running

function FootBlob({ meshRef }) {
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[RADIUS, 16]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.45} depthWrite={false} />
    </mesh>
  );
}

/**
 * Two shadow blobs per character that alternate fore/aft of the character's
 * root in a walk-cycle rhythm (synced to the run animState, resting together
 * otherwise), rather than one static blob under the root. Deliberately NOT
 * driven by actual foot-bone world positions: this asset's armature bind
 * pose is at a different scale than its mesh surface (an asset-generation
 * quirk, not something this project's retargeting controls), so bone
 * matrixWorld doesn't correspond to where the foot visually renders --
 * verified via diagnostic bone-position reads sitting ~1 unit off the
 * ground while walking. A procedural offset off the (reliable) root
 * transform reads as real footfalls without that dependency.
 */
export default function FootShadows({ id }) {
  const leftRef = useRef();
  const rightRef = useRef();
  const groundY = useRef({ left: 0, right: 0 }).current;
  const scratch = useRef({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), offset: new THREE.Vector3() }).current;

  useFrame(({ clock }) => {
    const group = characterRefs[id]?.group;
    if (!group || !leftRef.current || !rightRef.current) return;

    const animState = useGameStore.getState().characters[id]?.animState;
    const striding = animState === 'run';
    const phase = striding ? clock.getElapsedTime() * STEPS_PER_SECOND * Math.PI * 2 : 0;

    scratch.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y);

    for (const [side, meshRef, sign] of [
      ['left', leftRef, -1],
      ['right', rightRef, 1],
    ]) {
      const stridePhase = sign > 0 ? phase : phase + Math.PI; // feet alternate
      scratch.offset
        .set(SIDE_OFFSET * sign, 0, striding ? Math.sin(stridePhase) * STRIDE_LENGTH : 0)
        .applyQuaternion(scratch.quat);
      scratch.pos.copy(group.position).add(scratch.offset);
      groundY[side] = sampleGroundHeight(scratch.pos.x, scratch.pos.z, groundY[side]);
      meshRef.current.position.set(scratch.pos.x, groundY[side] + SHADOW_Y_OFFSET, scratch.pos.z);
    }
  });

  return (
    <>
      <FootBlob meshRef={leftRef} />
      <FootBlob meshRef={rightRef} />
    </>
  );
}
