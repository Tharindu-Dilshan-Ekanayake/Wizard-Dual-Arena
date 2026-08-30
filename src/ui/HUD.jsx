import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { spellClocks, now } from '../store/spellClocks.js';
import { ATTACK_COOLDOWN, GUARD_COOLDOWN } from '../constants.js';

function CooldownIcon({ label, icon, characterId, field, duration }) {
  const fillRef = useRef(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      const remaining = Math.max(0, spellClocks[characterId][field] - now());
      const frac = duration > 0 ? Math.min(1, remaining / duration) : 0;
      if (fillRef.current) fillRef.current.style.height = `${frac * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [characterId, field, duration]);

  return (
    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/30 bg-black/50">
      <div className="absolute inset-0 flex items-center justify-center text-xl">{icon}</div>
      <div ref={fillRef} className="absolute bottom-0 left-0 w-full bg-black/70" style={{ height: '0%' }} />
      <div className="absolute bottom-0.5 left-1 text-[9px] text-white/70">{label}</div>
    </div>
  );
}

export default function HUD({ playerId }) {
  const hp = useGameStore((s) => s.characters[playerId]?.hp ?? 100);
  const pointerLocked = useGameStore((s) => s.pointerLocked);
  const countdown = useGameStore((s) => s.countdown);
  const goToMenu = useGameStore((s) => s.goToMenu);
  const fraction = Math.max(0, hp / 100);

  return (
    <>
      {/* crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
      </div>

      {/* HP bar */}
      <div className="absolute bottom-6 left-6 w-64 pointer-events-none">
        <div className="text-white/80 text-xs font-semibold mb-1 uppercase tracking-wide">{playerId}</div>
        <div className="h-4 rounded bg-black/60 border border-white/20 overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${fraction * 100}%`,
              backgroundColor: fraction > 0.6 ? '#4ade80' : fraction > 0.3 ? '#facc15' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* spell cooldowns */}
      <div className="absolute bottom-6 right-6 flex gap-2 pointer-events-none">
        <CooldownIcon label="LMB" icon="🔥" characterId={playerId} field="attackReadyAt" duration={ATTACK_COOLDOWN} />
        <CooldownIcon label="RMB" icon="🛡️" characterId={playerId} field="guardReadyAt" duration={GUARD_COOLDOWN} />
      </div>

      {/* Paused (pointer unlocked -- initial state, or Esc mid-match) */}
      {!pointerLocked && (
        // pointer-events-none all the way down except the button itself --
        // the box sits dead center, right where a player would naturally
        // click to resume, so it must NOT swallow that click.
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="bg-black/70 text-white px-8 py-6 rounded-lg text-center pointer-events-none">
            <div className="text-2xl font-bold mb-1">Paused</div>
            <div className="text-sm text-white/70 mb-4">Click anywhere to resume</div>
            <div className="text-xs text-white/50 mb-4">WASD to move · Left click: Attack · Right click: Guard · Esc: Pause</div>
            <button
              onClick={goToMenu}
              className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm font-medium pointer-events-auto"
            >
              Quit to Menu
            </button>
          </div>
        </div>
      )}

      {/* Resume countdown (pointer already locked, controls not active yet) */}
      {pointerLocked && countdown != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white text-8xl font-bold drop-shadow-lg" style={{ textShadow: '0 0 24px rgba(0,0,0,0.6)' }}>
            {countdown}
          </div>
        </div>
      )}
    </>
  );
}
