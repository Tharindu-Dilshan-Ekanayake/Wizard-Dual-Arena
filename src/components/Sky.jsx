import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky as DreiSky, Cloud, Stars } from '@react-three/drei';
import { CAMERA_HEIGHT, ARENA_BOUNDS } from '../constants.js';

// Positioned relative to CAMERA_HEIGHT/ARENA_BOUNDS, not fixed world
// coordinates: these were originally tuned back when CHARACTER_SCALE (and so
// CAMERA_HEIGHT) was much smaller, at Y~12-17. Camera height alone has since
// grown past that as CHARACTER_SCALE increased, putting the camera at the
// clouds' own altitude -- they stopped reading as distant background and
// instead filled the screen like a dust storm. Scaling off the same knobs
// that drove that growth keeps clouds safely above/beyond the camera
// automatically if CHARACTER_SCALE changes again.
const CLOUD_Y = CAMERA_HEIGHT * 2.2;
const CLOUD_DIST = ARENA_BOUNDS.x * 2;
const CLOUD_SCALE = ARENA_BOUNDS.x * 0.13;

const CLOUD_LAYOUT = [
  { position: [-CLOUD_DIST * 0.6, CLOUD_Y * 0.85, -CLOUD_DIST], scale: CLOUD_SCALE * 0.9, speed: 0.06 },
  { position: [CLOUD_DIST * 0.4, CLOUD_Y, -CLOUD_DIST * 1.3], scale: CLOUD_SCALE * 1.25, speed: 0.05 },
  { position: [-CLOUD_DIST, CLOUD_Y * 0.7, -CLOUD_DIST * 0.65], scale: CLOUD_SCALE * 0.75, speed: 0.07 },
  { position: [CLOUD_DIST * 0.85, CLOUD_Y * 0.9, -CLOUD_DIST * 0.8], scale: CLOUD_SCALE, speed: 0.05 },
];

function DriftingClouds() {
  const groupRef = useRef();
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((cloud, i) => {
      cloud.position.x += CLOUD_LAYOUT[i].speed * delta;
      if (cloud.position.x > CLOUD_DIST) cloud.position.x = -CLOUD_DIST;
    });
  });

  return (
    <group ref={groupRef}>
      {CLOUD_LAYOUT.map((c, i) => (
        <Cloud key={i} position={c.position} scale={c.scale} opacity={0.55} speed={0.15} segments={8} color="#ffe6cc" />
      ))}
    </group>
  );
}

/** Sky + clouds + fog + optional stars, tuned for a warm dusk "magical hour" look. */
export default function Sky({ showStars = true, fogColor = '#c99a68', fogNear = 25, fogFar = 110 }) {
  return (
    <>
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      <DreiSky
        sunPosition={[-8, 1.2, -25]}
        turbidity={8}
        rayleigh={2.2}
        mieCoefficient={0.02}
        mieDirectionalG={0.9}
      />
      <DriftingClouds />
      {/* speed=0: drei's Stars otherwise slowly rotates the whole star field
          (its built-in twinkle-drift animation), which reads as the entire
          background silently spinning -- locked in place instead. */}
      {showStars && <Stars radius={100} depth={40} count={1000} factor={3} fade speed={0} />}
    </>
  );
}
