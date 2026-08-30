import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/** Simple wireframe energy bubble around a guarding caster -- see-through by
 * design so the caster stays visible while guarding. */
export default function ShieldBarrier({ position = [0, 1, 0], radius = 1.1 }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.material.opacity = 0.35 + Math.sin(t * 6) * 0.1;
    meshRef.current.rotation.y = t * 0.4;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[radius, 1]} />
        <meshBasicMaterial color="#8fefff" transparent opacity={0.4} wireframe toneMapped={false} />
      </mesh>
    </group>
  );
}
