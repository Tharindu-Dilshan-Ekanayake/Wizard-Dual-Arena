import { useGameStore } from '../store/gameStore.js';

export default function RoundEndScreen() {
  const winner = useGameStore((s) => s.winner);
  const playAgain = useGameStore((s) => s.playAgain);
  const goToMenu = useGameStore((s) => s.goToMenu);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
      <div className="text-5xl font-bold mb-3">{winner === 'player' ? 'Victory!' : 'Defeated'}</div>
      <div className="text-white/70 mb-8">{winner === 'player' ? 'You won the duel.' : 'The AI got the better of you.'}</div>
      <div className="flex gap-3">
        <button
          onClick={goToMenu}
          className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-medium"
        >
          Main Menu
        </button>
        <button
          onClick={playAgain}
          className="px-8 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
