import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// The ground mesh is ~50k triangles. three.js's default Raycaster does a
// brute-force triangle-by-triangle scan with no spatial structure -- with
// two rays cast every frame (player + AI ground sampling) that's 100k+
// ray/triangle tests per frame, a real hotspot. three-mesh-bvh builds a
// bounds tree once so each raycast is a fast O(log n) tree descent instead.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * Non-reactive reference to the ground's Object3D so movement/AI hooks can
 * raycast down onto its actual (bumpy, gapped) surface for foot placement
 * instead of assuming a flat plane at a fixed height.
 */
export const groundRef = { current: null };

/** Builds (or rebuilds) the BVH for every mesh under the ground object. */
export function buildGroundBoundsTree(root) {
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry && !obj.geometry.boundsTree) {
      obj.geometry.computeBoundsTree();
    }
  });
}

const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true; // BVH-aware: stop at the first hit instead of collecting+sorting all of them
const RAY_ORIGIN_Y = 6;
const RAY_DOWN = new THREE.Vector3(0, -1, 0);

/**
 * Samples the ground mesh's surface height under (x, z). Falls back to
 * `fallbackY` where the ray misses (e.g. over a hole, or before the mesh has
 * loaded) so a character never pops or falls through a gap.
 */
export function sampleGroundHeight(x, z, fallbackY) {
  if (!groundRef.current) return fallbackY;
  raycaster.set(new THREE.Vector3(x, RAY_ORIGIN_Y, z), RAY_DOWN);
  const hits = raycaster.intersectObject(groundRef.current, true);
  return hits.length > 0 ? hits[0].point.y : fallbackY;
}

if (import.meta.env.DEV) {
  window.__groundRef = groundRef;
  window.__sampleGroundHeight = sampleGroundHeight;
}
