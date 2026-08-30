import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useCharacterAnimations } from '../hooks/useCharacterAnimations.js';
import { CHARACTER_CLIPS } from '../components/Character.jsx';

// Mesh is pivoted at head height (feet at local y=-1, native scale here).
// A small negative offset shifts the whole character down a bit so there's
// headroom above it in frame -- at offset 0 the head sits exactly on the
// frame's vertical center with zero margin, so hair/hat details clip the
// top edge the instant the camera moves in at all.
const VERTICAL_CENTER_OFFSET = 0.18;

function SpinningModel({ model }) {
  const { characterUrl, clipUrls } = CHARACTER_CLIPS[model];
  const { scene, actions } = useCharacterAnimations(characterUrl, clipUrls);
  const groupRef = useRef();

  // Idle pose, no crossfade needed -- this is a one-shot showcase render,
  // not a state machine like the in-game Character.
  useEffect(() => {
    actions.idle?.play();
  }, [actions]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={groupRef} position={[0, VERTICAL_CENTER_OFFSET, 0]}>
      <primitive object={scene} />
    </group>
  );
}

/** Small showcase render of a character model for the select-card preview. */
export default function CharacterPreview({ model }) {
  return (
    <Canvas camera={{ position: [0, 0, 3.3], fov: 38 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 3]} intensity={1.4} />
      <directionalLight position={[-2, 1, -2]} intensity={0.4} />
      <Suspense fallback={null}>
        <SpinningModel model={model} />
      </Suspense>
    </Canvas>
  );
}
