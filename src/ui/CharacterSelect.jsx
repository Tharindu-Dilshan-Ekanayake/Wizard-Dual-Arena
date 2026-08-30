import { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { DIFFICULTY_PRESETS } from '../constants.js';
import CharacterPreview from './CharacterPreview.jsx';

const CHARACTERS = [
  { id: 'harry', name: 'Harry', blurb: 'Gryffindor duelist. Quick and aggressive.', accent: 'from-red-600/40 to-amber-500/20 border-amber-400' },
  { id: 'malfoi', name: 'Malfoi', blurb: 'Slytherin duelist. Cunning and evasive.', accent: 'from-emerald-700/40 to-green-500/20 border-emerald-400' },
];

const DIFFICULTIES = Object.entries(DIFFICULTY_PRESETS).map(([id, p]) => ({ id, label: p.label }));

export default function CharacterSelect() {
  const [picked, setPicked] = useState('harry');
  const confirmSelect = useGameStore((s) => s.confirmSelect);
  const goToMenu = useGameStore((s) => s.goToMenu);
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1024] via-[#2c1a3a] to-[#120a1a] text-white">
      <h2 className="mb-8 text-3xl font-bold">Choose your wizard</h2>

      <div className="flex gap-6 mb-10">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            onClick={() => setPicked(c.id)}
            className={`w-48 h-64 rounded-xl border-2 bg-gradient-to-b ${c.accent} p-4 flex flex-col items-center justify-end text-center overflow-hidden transition-transform ${
              picked === c.id ? 'scale-105 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
            }`}
          >
            {/* w-full + min-h-0 matter here: this is a flex-col button with
                items-center (cross-axis = horizontal) by default, so without
                an explicit width this shrinks to content instead of filling
                the card -- and Canvas sizes itself off this div, so a
                collapsed/undefined size here means a broken preview. */}
            <div className="flex-1 w-full min-h-0 -mb-[180px] ">
              <CharacterPreview model={c.id} />
            </div>
            <div className="text-xl font-bold">{c.name}</div>
            <div className="mt-1 text-xs text-white/70">{c.blurb}</div>
          </button>
        ))}
      </div>

      <div className="mb-6 text-center">
        <div className="mb-2 text-xs font-semibold tracking-wide uppercase text-white/50">Difficulty</div>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                difficulty === d.id ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={goToMenu}
          className="px-5 py-2 font-medium rounded-lg bg-white/10 hover:bg-white/20"
        >
          Back
        </button>
        <button
          onClick={() => confirmSelect(picked)}
          className="px-8 py-2 font-semibold text-black rounded-lg bg-amber-500 hover:bg-amber-400"
        >
          Duel!
        </button>
      </div>
    </div>
  );
}
