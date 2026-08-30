import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Ground from './components/Ground.jsx';
import Sky from './components/Sky.jsx';
import Character from './components/Character.jsx';
import FootShadows from './components/FootShadows.jsx';
import SpellProjectile from './components/SpellProjectile.jsx';
import { useCharacterController } from './hooks/useCharacterController.js';
import { useSpellSystem } from './hooks/useSpellSystem.js';
import { useAIOpponent } from './hooks/useAIOpponent.js';
import { useResumeCountdown } from './hooks/useResumeCountdown.js';
import { useRoundEndTimer } from './hooks/useRoundEndTimer.js';
import { useGameStore } from './store/gameStore.js';
import MainMenu from './ui/MainMenu.jsx';
import CharacterSelect from './ui/CharacterSelect.jsx';
import HUD from './ui/HUD.jsx';
import RoundEndScreen from './ui/RoundEndScreen.jsx';
import LoadingScreen from './ui/LoadingScreen.jsx';

/** Drives the human player's movement/camera + spell casting, and the AI's FSM. */
function DuelRig({ playerId, aiId }) {
  useCharacterController(playerId, aiId);
  const playerSpell = useSpellSystem(playerId, aiId, { inputDriven: true });
  const aiSpell = useAIOpponent(aiId, playerId, playerSpell.pool);

  return (
    <>
      {playerSpell.pool.map((slot, i) => (
        <SpellProjectile key={`p-${i}`} ref={(el) => (slot.ref.current = el)} color="#ff7a1a" />
      ))}
      {aiSpell.pool.map((slot, i) => (
        <SpellProjectile key={`a-${i}`} ref={(el) => (slot.ref.current = el)} color="#9a5bff" />
      ))}
    </>
  );
}

function DuelScene() {
  const playerId = useGameStore((s) => s.playerId);
  const aiId = useGameStore((s) => s.aiId);
  const startTransforms = useGameStore((s) => s.startTransforms);

  return (
    <>
      <Sky />
      <ambientLight intensity={0.45} color="#ffdcb0" />
      <directionalLight position={[-8, 12, -20]} intensity={1.1} color="#ffcf9c" castShadow={false} />
      <pointLight position={[-3, 2.5, 4]} intensity={8} color="#ff9a4d" distance={12} />
      <pointLight position={[3, 2.5, 4]} intensity={8} color="#8ecbff" distance={12} />

      <Suspense fallback={null}>
        <Ground />
        <Character
          id={playerId}
          model={playerId}
          startPosition={startTransforms[playerId].position}
          startRotation={startTransforms[playerId].rotation}
        />
        <Character
          id={aiId}
          model={aiId}
          startPosition={startTransforms[aiId].position}
          startRotation={startTransforms[aiId].rotation}
        />
        <DuelRig playerId={playerId} aiId={aiId} />
        <FootShadows id={playerId} />
        <FootShadows id={aiId} />
      </Suspense>
    </>
  );
}

function GameView() {
  const playerId = useGameStore((s) => s.playerId);
  const roundEndScreenVisible = useGameStore((s) => s.roundEndScreenVisible);
  useResumeCountdown();
  useRoundEndTimer();

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 2.2, 8], fov: 62 }} dpr={[1, 1.5]}>
        <DuelScene />
      </Canvas>
      <HUD playerId={playerId} />
      {roundEndScreenVisible && <RoundEndScreen />}
    </div>
  );
}

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="w-full h-full relative">
      {phase === 'menu' && <MainMenu />}
      {phase === 'select' && <CharacterSelect />}
      {(phase === 'playing' || phase === 'roundEnd') && <GameView />}
      {/* Outside every Suspense boundary, driven by drei's global loading-
          manager progress -- works regardless of which screen triggered the
          in-flight load (ground tile, a character, a select-screen preview). */}
      <LoadingScreen />
    </div>
  );
}
