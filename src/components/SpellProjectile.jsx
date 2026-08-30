import { forwardRef } from 'react';
import { PROJECTILE_HIT_RADIUS } from '../constants.js';

// Sized off the actual hit-detection radius (not a fixed number) so the
// visible ball always matches what can actually hit you -- previously fixed
// at 0.14/0.26 regardless of CHARACTER_SCALE, so as characters grew the ball
// stayed the same tiny size and became hard to even see, let alone read as
// "this is about to hit me".
const CORE_RADIUS = PROJECTILE_HIT_RADIUS * 0.55;
const GLOW_RADIUS = PROJECTILE_HIT_RADIUS * 1.1;

/**
 * Pooled projectile visual -- always mounted, moved/shown imperatively by
 * useSpellSystem via the forwarded ref so casting never triggers a React
 * re-render or a new mesh allocation.
 */
const SpellProjectile = forwardRef(function SpellProjectile({ color = '#ff6a1a' }, ref) {
  return (
    <group ref={ref} visible={false}>
      <pointLight color={color} intensity={4} distance={4} />
      <mesh>
        <sphereGeometry args={[CORE_RADIUS, 12, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOW_RADIUS, 12, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  );
});

export default SpellProjectile;
