/**
 * Non-reactive registry of live Object3D refs per character id, so cameras,
 * AI, and the spell system can read another character's current world
 * transform every frame without going through Zustand (which would mean a
 * store write + re-render per character per frame).
 */
export const characterRefs = {
  harry: { group: null, scene: null, actions: null },
  malfoi: { group: null, scene: null, actions: null },
};

export function registerCharacterRef(id, group, scene, actions) {
  characterRefs[id].group = group;
  characterRefs[id].scene = scene;
  characterRefs[id].actions = actions;
}

if (import.meta.env.DEV) {
  window.__characterRefs = characterRefs;
}
