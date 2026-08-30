import { useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

function extendWithDraco(loader) {
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER_PATH);
  loader.setDRACOLoader(draco);
}

/**
 * Rebuilds a clip's keyframe tracks so they target bones on `targetRoot` by name,
 * dropping any tracks whose bone isn't present. Animation-only GLBs and the
 * character GLB come from the same Mixamo rig, so bone names line up
 * ("mixamorig:Hips", "mixamorig:Spine", ...) even though each file has its own
 * root/armature node.
 */
function retargetClip(sourceClip, targetRoot) {
  const boneNames = new Set();
  targetRoot.traverse((obj) => {
    if (obj.isBone) boneNames.add(obj.name);
  });

  const tracks = sourceClip.tracks.reduce((acc, track) => {
    const dot = track.name.indexOf('.');
    if (dot === -1) return acc;
    const boneName = track.name.slice(0, dot);
    if (!boneNames.has(boneName)) return acc;
    acc.push(track.clone());
    return acc;
  }, []);

  return new THREE.AnimationClip(sourceClip.name, sourceClip.duration, tracks);
}

function isHipsPositionTrack(trackName) {
  return trackName.endsWith('.position') && trackName.toLowerCase().includes('hips');
}

/**
 * Builds a 2-key, zero-motion clip that holds the source clip's pose at t=0.
 * `groundedHipsY`, when given, overrides the root bone's height so a pose
 * frozen from a clip other than idle/run (e.g. guard from fight's frame 0)
 * doesn't visibly float or sink relative to the character's real standing
 * height on that clip's own root-motion offset.
 */
function buildStaticIdleClip(sourceClip, name = 'idle', groundedHipsY = null) {
  const tracks = sourceClip.tracks.map((track) => {
    const stride = track.getValueSize();
    const firstValue = track.values.slice(0, stride);
    if (groundedHipsY != null && isHipsPositionTrack(track.name)) {
      firstValue[1] = groundedHipsY;
    }
    const TrackType = track.constructor;
    return new TrackType(track.name, [0, 1], [...firstValue, ...firstValue]);
  });
  return new THREE.AnimationClip(name, 1, tracks);
}

/**
 * Loads a base character GLB (mesh + skeleton) plus separate animation-only
 * GLBs, retargets each clip onto the base skeleton by Mixamo bone name, and
 * returns { scene, actions, mixer, names } ready for useAnimations-style control.
 *
 * @param {string} characterUrl - e.g. '/models/harry/character.glb'
 * @param {Record<string,string>} clipUrls - e.g. { run: '/models/harry/run.glb', fight: '...' }
 *   Object identity/keys must stay stable for a given mounted instance.
 */
export function useCharacterAnimations(characterUrl, clipUrls) {
  const { scene: baseScene } = useGLTF(characterUrl);

  const clipNames = useMemo(() => Object.keys(clipUrls), [clipUrls]);
  const clipUrlList = useMemo(() => Object.values(clipUrls), [clipUrls]);
  const clipGltfs = useLoader(GLTFLoader, clipUrlList, extendWithDraco);

  const scene = useMemo(() => SkeletonUtils.clone(baseScene), [baseScene]);

  const clips = useMemo(() => {
    const retargeted = clipNames.map((name, i) => {
      const sourceClip = clipGltfs[i].animations[0];
      const clip = retargetClip(sourceClip, scene);
      clip.name = name;
      return clip;
    });

    const runClip = retargeted.find((c) => c.name === 'run');
    const idleSource = runClip ?? retargeted[0];
    const idleClip = idleSource ? buildStaticIdleClip(idleSource, 'idle') : null;

    const idleHipsTrack = idleSource?.tracks.find((t) => isHipsPositionTrack(t.name));
    const groundedHipsY = idleHipsTrack ? idleHipsTrack.values[1] : null;

    // No dedicated guard clip in any asset set -- hold the first frame of
    // "fight" (wand raised) as a defensive stance, per the asset spec's
    // fallback guidance. Re-ground it to idle's hip height since "fight"'s
    // own frame 0 can sit at a different root height (visible as floating).
    const fightClip = retargeted.find((c) => c.name === 'fight');
    const guardSource = fightClip ?? idleSource;
    const guardClip = guardSource ? buildStaticIdleClip(guardSource, 'guard', groundedHipsY) : null;

    const extras = [idleClip, guardClip].filter(Boolean);
    return [...extras, ...retargeted];
  }, [scene, clipNames, clipGltfs]);

  const { actions, mixer, names } = useAnimations(clips, scene);

  return { scene, actions, mixer, names };
}

// Note: this asset's armature bind pose sits at a wildly different scale
// than its own mesh surface (verified: the Hips bone alone reports a world
// position above the character's own head), an artifact of the source
// AI-generation pipeline. That makes any bone.matrixWorld read unusable for
// visually-anchored placement (spell origins, foot shadows, etc.) -- those
// derive from the character's root transform instead. No per-bone world
// position utility is exported here for that reason.
