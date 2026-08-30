import { useProgress } from '@react-three/drei';

/**
 * Full-screen overlay driven by drei's useProgress, which tracks every
 * THREE.DefaultLoadingManager-registered load (every useGLTF/useLoader call
 * in this app goes through it) globally -- not tied to any one Suspense
 * boundary, so it shows correctly whether the in-flight load is the ground
 * tile, a character's model+animations, or a character-select preview.
 * Matters most on a slow connection: without this the app just shows a
 * blank canvas while multi-hundred-KB GLBs download, which reads as broken
 * rather than "loading".
 */
export default function LoadingScreen() {
  const { active, progress, item } = useProgress();

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#120a1a] text-white">
      <div className="mb-4 text-2xl font-bold tracking-wide">Wizard Duel Arena</div>
      <div className="w-64 h-3 rounded-full bg-white/10 overflow-hidden border border-white/20">
        <div
          className="h-full bg-amber-500 transition-[width] duration-150 ease-out"
          style={{ width: `${Math.min(100, Math.round(progress))}%` }}
        />
      </div>
      <div className="mt-3 text-sm text-white/60">{Math.min(100, Math.round(progress))}%</div>
      <div className="mt-1 text-xs text-white/30 truncate max-w-xs">{item}</div>
    </div>
  );
}
