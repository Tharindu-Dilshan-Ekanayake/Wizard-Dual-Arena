import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { groundRef, buildGroundBoundsTree } from '../store/groundRef.js';
import { GROUND_TILE_SCALE_XZ, GROUND_TILE_SCALE_Y, GROUND_GRID_SIZE } from '../constants.js';

// Source mesh is a ~1x0.87 unit terrain tile, only 0.1368 units thick, with
// its local origin at the *bottom* face.
const SOURCE_THICKNESS = 0.1368;
const GROUNDED_Y = -(SOURCE_THICKNESS * GROUND_TILE_SCALE_Y);
const GROUND_HALF_EXTENT = (GROUND_GRID_SIZE * GROUND_TILE_SCALE_XZ) / 2;
const TILE_COUNT = GROUND_GRID_SIZE * GROUND_GRID_SIZE;
// Backing plane covers the whole tiled grid (plus a little) so movement's
// ground-height raycast is guaranteed to hit *something* everywhere,
// including under any individual tile's own cracks/holes.
const BACKING_MARGIN = 3;

const dummy = new THREE.Object3D();

function mulberry32(seed) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The decorative ground mesh is genuinely repeated across a grid (one draw
 * call via InstancedMesh) instead of one copy stretched huge -- stretching
 * blows the cracked-tile detail up to blurry, indistinct scale and leaves a
 * flat-colored fallback plane doing most of the visible work. Each tile gets
 * a random 90-degree-increment yaw so the repeat doesn't read as an obvious
 * copy-paste grid.
 */
function TiledGround({ scene }) {
  const meshRef = useRef();

  const { geometry, material } = useMemo(() => {
    let geo = null;
    let mat = null;
    scene.traverse((o) => {
      if (o.isMesh && !geo) {
        geo = o.geometry;
        mat = o.material;
      }
    });
    return { geometry: geo, material: mat };
  }, [scene]);

  useLayoutEffect(() => {
    if (!meshRef.current || !geometry) return;
    const rng = mulberry32(7);
    const half = (GROUND_GRID_SIZE - 1) / 2;
    let i = 0;
    for (let row = 0; row < GROUND_GRID_SIZE; row++) {
      for (let col = 0; col < GROUND_GRID_SIZE; col++) {
        const x = (col - half) * GROUND_TILE_SCALE_XZ;
        const z = (row - half) * GROUND_TILE_SCALE_XZ;
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, Math.floor(rng() * 4) * (Math.PI / 2), 0);
        dummy.scale.set(GROUND_TILE_SCALE_XZ, GROUND_TILE_SCALE_Y, GROUND_TILE_SCALE_XZ);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.computeBoundingSphere();
  }, [geometry]);

  if (!geometry || !material) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, TILE_COUNT]} receiveShadow />;
}

export default function Ground() {
  const { scene } = useGLTF('/models/background/ground_tile.glb');
  const groupRef = useRef();

  // Layout effect (synchronous, fires before any passive useEffect in the
  // tree) so sibling decoration/systems that read groundRef in their own
  // layout effect can rely on it already being registered, given Ground
  // renders first in the tree.
  useLayoutEffect(() => {
    groundRef.current = groupRef.current;
    buildGroundBoundsTree(groupRef.current);
  }, [scene]);

  return (
    <group ref={groupRef} position={[0, GROUNDED_Y, 0]}>
      {/* Solid backing plane: guarantees a hit everywhere under the tiled
          grid even where an individual tile has a gap/hole. Kept close to
          (not deep below) the tile surface and color-matched to it, so gaps
          read as shallow, filled-in ground rather than dark broken holes. */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[(GROUND_HALF_EXTENT + BACKING_MARGIN) * 2, (GROUND_HALF_EXTENT + BACKING_MARGIN) * 2]} />
        {/* A touch of emissive keeps gaps from reading as dark pockets even
            where a tile's own raised edges shadow them. */}
        <meshStandardMaterial color="#a68a5c" roughness={0.95} metalness={0} emissive="#6b5530" emissiveIntensity={0.9} />
      </mesh>
      {/* Horizon fill: beyond the tiled grid the camera could see straight
          past its edge into open sky -- reading as though the ground just
          stops / is only half there. This much larger plane extends the
          ground color out past the fog's far distance, so it fades smoothly
          into the fog/sky instead of ending abruptly. Sits further below so
          it never seams with the near backing plane. */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        {/* Color-matched to Sky's fogColor -- the fog gradient blends this
            plane into the sky over distance, and starting from a close color
            (rather than a flatter brown) keeps that blend smooth instead of
            visibly shifting hue partway through the fade. */}
        <meshStandardMaterial color="#a3835a" roughness={1} metalness={0} fog />
      </mesh>
      <TiledGround scene={scene} />
    </group>
  );
}

useGLTF.preload('/models/background/ground_tile.glb');
