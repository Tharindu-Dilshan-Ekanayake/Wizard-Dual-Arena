import { Billboard } from '@react-three/drei';
import { useGameStore } from '../store/gameStore.js';
import { CHARACTER_SCALE } from '../constants.js';

// The bar's own plane dimensions used to be fixed (0.9 x 0.11) regardless of
// CHARACTER_SCALE, even though its position offset already scaled with it --
// fine back when CHARACTER_SCALE was ~1.6-2, but at 10 it shrank to a nearly
// invisible sliver relative to the character. Scaled off CHARACTER_SCALE now
// like everything else here.
const BAR_WIDTH = CHARACTER_SCALE * 0.5;
const BAR_HEIGHT = CHARACTER_SCALE * 0.065;
const FILL_WIDTH = BAR_WIDTH * 0.955;
const FILL_HEIGHT = BAR_HEIGHT * 0.73;

function hpColor(fraction) {
  if (fraction > 0.6) return '#4ade80';
  if (fraction > 0.3) return '#facc15';
  return '#ef4444';
}

/** Always-faces-camera HP bar floating above a character. */
export default function HealthBar({ characterId, yOffset = 1.9 * CHARACTER_SCALE }) {
  const hp = useGameStore((s) => s.characters[characterId].hp);
  const fraction = Math.max(0, hp / 100);

  return (
    <Billboard position={[0, yOffset, 0]}>
      <mesh>
        <planeGeometry args={[BAR_WIDTH, BAR_HEIGHT]} />
        <meshBasicMaterial color="#1a1a1a" transparent opacity={0.75} />
      </mesh>
      <mesh position={[-((1 - fraction) * FILL_WIDTH) / 2, 0, 0.001]}>
        <planeGeometry args={[Math.max(0.001, fraction * FILL_WIDTH), FILL_HEIGHT]} />
        <meshBasicMaterial color={hpColor(fraction)} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}
