/**
 * Non-reactive cooldown-timestamp registry (seconds, performance.now()/1000
 * basis) so the DOM-based HUD can poll cooldown fill via rAF without a
 * Zustand write (and re-render) on every cast or every frame.
 */
export const spellClocks = {
  harry: { attackReadyAt: 0, guardReadyAt: 0 },
  malfoi: { attackReadyAt: 0, guardReadyAt: 0 },
};

export function now() {
  return performance.now() / 1000;
}
