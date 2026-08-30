import { useGameStore } from '../store/gameStore.js';

export default function MainMenu() {
  const goToSelect = useGameStore((s) => s.goToSelect);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1024] via-[#2c1a3a] to-[#120a1a] text-white">
      <h1 className="text-5xl font-bold tracking-wide mb-2 drop-shadow-lg">Wizard Duel Arena</h1>
      <p className="text-white/60 mb-10">A magical one-on-one duel</p>

      <div className="flex flex-col gap-3 w-64">
        <button
          onClick={goToSelect}
          className="py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-lg transition-colors"
        >
          Play vs AI
        </button>
      </div>
    </div>
  );
}
