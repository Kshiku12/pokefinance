'use client';

import React, { useRef, useState, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html, Clone } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import Image from 'next/image';
import type { AppCategory } from '@/lib/pokemon';
import type { UserPokemon } from '@/lib/types';
import { getCurrentEvolution } from '@/lib/pokemon';

// Configure local Draco decoder so all compressed GLB models load offline without network dependencies
useGLTF.setDecoderPath('/draco/gltf/');

// Preload core companion models for instantaneous rendering
const PRELOAD_IDS = [1, 4, 5, 7, 8, 16, 25, 52, 63, 79, 81, 92, 113, 133, 143, 440];
if (typeof window !== 'undefined') {
  PRELOAD_IDS.forEach((id) => {
    try {
      useGLTF.preload(`/models/${id}.glb`, '/draco/gltf/');
    } catch {
      // safe fallback
    }
  });
}

interface Pokemon3DProps {
  category: AppCategory;
  userPokemon?: UserPokemon;
  position: [number, number, number];
  isSelected: boolean;
  isSleeping?: boolean;
  isFedRecently?: boolean;
  onClick: () => void;
}

// Model-specific rotation corrections to make all models stand upright facing forward towards the trainer
const MODEL_ROTATION_CORRECTIONS: Record<number, [number, number, number]> = {
  25: [0, 0, 0], // Pikachu upright (head & spine are posed procedurally so face & cheeks beam at trainer!)
  26: [0, 0, 0], // Raichu
  172: [0, 0, 0], // Pichu
  92: [0, Math.PI, 0], // Gastly facing forward with mischievous grin & fangs!
  93: [0, Math.PI, 0], // Haunter
  94: [0, Math.PI, 0], // Gengar
  52: [0, 0, 0], // Meowth facing forward
  53: [0, 0, 0], // Persian
};

// Official Game Freak / Bulbapedia Canonical Heights from Pokedex (in meters)
const POKEDEX_CANONICAL_HEIGHTS: Record<number, number> = {
  1: 0.7,   // Bulbasaur (0.7m / 2'04")
  2: 1.0,   // Ivysaur (1.0m / 3'03")
  3: 2.0,   // Venusaur (2.0m / 6'07")
  4: 0.6,   // Charmander (0.6m / 2'00")
  5: 1.1,   // Charmeleon (1.1m / 3'07")
  6: 1.7,   // Charizard (1.7m / 5'07")
  7: 0.5,   // Squirtle (0.5m / 1'08")
  8: 1.0,   // Wartortle (1.0m / 3'03")
  9: 1.6,   // Blastoise (1.6m / 5'03")
  16: 0.3,  // Pidgey (0.3m / 1'00")
  17: 1.1,  // Pidgeotto (1.1m / 3'07")
  18: 1.5,  // Pidgeot (1.5m / 4'11")
  25: 0.4,  // Pikachu (0.4m / 1'04")
  26: 0.8,  // Raichu (0.8m / 2'07")
  52: 0.4,  // Meowth (0.4m / 1'04" - matching Pikachu!)
  53: 1.0,  // Persian (1.0m / 3'03")
  63: 0.9,  // Abra (0.9m / 2'11")
  64: 1.3,  // Kadabra (1.3m / 4'03")
  65: 1.5,  // Alakazam (1.5m / 4'11")
  79: 1.2,  // Slowpoke (1.2m / 3'11")
  80: 1.6,  // Slowbro (1.6m / 5'03")
  81: 0.3,  // Magnemite (0.3m / 1'00")
  82: 1.0,  // Magneton (1.0m / 3'03")
  92: 1.3,  // Gastly (1.3m / 4'03")
  93: 1.6,  // Haunter (1.6m / 5'03")
  94: 1.5,  // Gengar (1.5m / 4'11")
  113: 1.1, // Chansey (1.1m / 3'07")
  133: 0.3, // Eevee (0.3m / 1'00")
  134: 1.0, // Vaporeon (1.0m / 3'03")
  143: 2.1, // Snorlax (2.1m / 6'11" - giant lovable center!)
  172: 0.3, // Pichu (0.3m / 1'00")
  175: 0.3, // Togepi (0.3m / 1'00")
  176: 0.6, // Togetic (0.6m / 2'00")
  440: 0.6, // Happiny (0.6m / 2'00")
  446: 0.6, // Munchlax (0.6m / 2'00")
};

// Hand-tuned ground offsets and scales for models with bind-pose or skeleton discrepancies
const MODEL_MANUAL_OFFSETS: Record<number, { scale: number; offset: [number, number, number] }> = {
  25: { scale: 0.58, offset: [0.01, 1.22, -0.75] },   // Standing firmly upright on feet on the route pedestal!
  26: { scale: 0.72, offset: [0, 1.75, 0.75] },        // Raichu
  172: { scale: 0.48, offset: [0, 1.15, 0.5] },        // Pichu
  5: { scale: 0.65, offset: [-0.02, 0.88, 0.61] },     // Charmeleon (1.1m) standing tall on pedestal
  4: { scale: 0.55, offset: [-0.3, 0.1, 0.25] },       // Charmander (0.6m)
  52: { scale: 0.55, offset: [0, 0, 0.1] },            // Meowth (0.4m) proportional, NOT giant!
  92: { scale: 0.95, offset: [0.55, 0.68, -0.01] },    // Gastly floating eye-level in encounter view
};

// Official anime signature cries for encounter dialogue balloons
const POKEMON_CRIES: Record<number, string> = {
  25: 'Pika-Pikachu!',
  26: 'Rai-Raichu!',
  172: 'Pi-Pichuuu!',
  1: 'Bulba-saur!',
  2: 'Ivy-saur!',
  3: 'Venu-saur!',
  4: 'Char-char!',
  5: 'Char-meleon!',
  6: 'Char-i-zard!',
  7: 'Squir-tle!',
  8: 'War-tortle!',
  9: 'Blas-toise!',
  133: 'Eev-vee!',
  52: "Meowth, that's right!",
  53: 'Per-sian!',
  92: 'Gas-tlyyy!',
  93: 'Haun-ter!',
  94: 'Gen-gar!',
  16: 'Pid-gey!',
  17: 'Pidge-otto!',
  18: 'Pidge-ot!',
  81: 'Bzzzt-Mag-ne!',
  82: 'Bzz-Magneton!',
  63: 'Ab-raa...',
  64: 'Ka-dabra!',
  73: 'Ala-kazam!',
  79: 'Sloooow-poke...',
  80: 'Slow-bro!',
  113: 'Chan-sey!',
  440: 'Hap-piny!',
  143: 'Snoooor-lax...',
};

// Animated 3D Tail Flame for Fire Pokemon (Charmeleon, Charmander, Charizard)
function TailFlameVFX({
  pokedexId,
  tailTipBone,
}: {
  pokedexId: number;
  tailTipBone?: THREE.Object3D | null;
}) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const flameGroupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const embersRef = useRef<THREE.Group>(null);
  const tempPos = useMemo(() => new THREE.Vector3(), []);

  // Fallback tail tip coordinates in model space calculated from skeleton bones
  const tailPos: [number, number, number] = useMemo(() => {
    if (pokedexId === 5) return [0.45, 0.75, -1.3]; // Charmeleon's curled tail tip
    if (pokedexId === 4) return [0.54, 0.53, -0.54]; // Charmander's exact tail tip
    return [0.1, 0.5, -1.8]; // Charizard / default
  }, [pokedexId]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Follow tail tip bone position while staying vertically upright
    if (tailTipBone && rootGroupRef.current && rootGroupRef.current.parent) {
      tailTipBone.getWorldPosition(tempPos);
      rootGroupRef.current.parent.worldToLocal(tempPos);
      rootGroupRef.current.position.copy(tempPos);
    }

    if (flameGroupRef.current) {
      // Roaring flame flicker and waving tongue
      const s = 1.0 + Math.sin(t * 26) * 0.22 + Math.cos(t * 38) * 0.15;
      flameGroupRef.current.scale.set(s * 1.1, s * 1.6, s * 1.1);
      flameGroupRef.current.rotation.z = Math.sin(t * 16) * 0.25;
      flameGroupRef.current.rotation.x = Math.cos(t * 18) * 0.2;
    }

    if (coreRef.current) {
      const coreScale = 1.0 + Math.sin(t * 32) * 0.3;
      coreRef.current.scale.setScalar(coreScale);
    }

    // Dynamic flame embers rising upward and dissolving
    if (embersRef.current) {
      embersRef.current.children.forEach((ember, i) => {
        const ph = i * 0.9;
        const emberLife = (t * 3.2 + ph) % 1.0;
        ember.position.y = 0.2 + emberLife * 0.85;
        ember.position.x = Math.sin(t * 7.0 + ph) * (0.1 + emberLife * 0.2);
        ember.position.z = Math.cos(t * 7.0 + ph) * (0.1 + emberLife * 0.2);
        ember.scale.setScalar((1.0 - emberLife) * 1.0);
      });
    }

    if (lightRef.current) {
      lightRef.current.intensity = 4.2 + Math.sin(t * 28) * 1.8 + Math.cos(t * 44) * 1.0;
    }
  });

  return (
    <group ref={rootGroupRef} position={tailPos}>
      <group ref={flameGroupRef}>
        {/* Inner White-Hot Plasma Core */}
        <mesh ref={coreRef} position={[0, 0.08, 0]}>
          <coneGeometry args={[0.045, 0.18, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Mid Golden Yellow Flame Tongue */}
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.075, 0.28, 8]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#ea580c"
            emissiveIntensity={3.2}
            transparent
            opacity={0.92}
          />
        </mesh>
        {/* Outer Roaring Crimson Flame Mantle */}
        <mesh position={[0, 0.15, 0]}>
          <coneGeometry args={[0.105, 0.38, 8]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#dc2626"
            emissiveIntensity={2.8}
            transparent
            opacity={0.8}
          />
        </mesh>
        {/* Fiery Corona Sphere at Base */}
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={3.0}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* Rising Ember Sparks */}
      <group ref={embersRef}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[0, 0.12, 0]}>
            <octahedronGeometry args={[0.035, 0]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#fef08a' : '#f97316'} />
          </mesh>
        ))}
      </group>

      {/* Blazing Warm Point Light casting on Charmeleon & ground */}
      <pointLight ref={lightRef} color="#f97316" intensity={2.2} distance={3.5} />
    </group>
  );
}

// Animated Swirling Volumetric Ghost Smoke Nebula for Gastly, Haunter, Gengar
function GhostSmokeVFX() {
  const smokeRef = useRef<THREE.Group>(null);
  const wispsRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (smokeRef.current) {
      smokeRef.current.rotation.y = t * 1.6;
      smokeRef.current.children.forEach((child, i) => {
        const ph = i * 0.42;
        child.position.y = Math.sin(t * 2.8 + ph) * 0.35;
        const s = 0.9 + Math.sin(t * 3.6 + ph) * 0.38;
        child.scale.setScalar(s);
      });
    }

    if (wispsRef.current) {
      wispsRef.current.rotation.y = -t * 2.2;
      wispsRef.current.children.forEach((wisp, i) => {
        const ph = i * 1.1;
        const wispLife = (t * 2.2 + ph) % 1.0;
        wisp.position.y = 0.4 + wispLife * 1.1;
        wisp.scale.setScalar((1.0 - wispLife) * 0.85);
      });
    }

    if (lightRef.current) {
      lightRef.current.intensity = 3.2 + Math.sin(t * 4.0) * 1.2;
    }
  });

  return (
    <group position={[0, 0.35, 0]}>
      {/* Billowing Volumetric Smoke Vortex */}
      <group ref={smokeRef}>
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const r = 0.85 + (i % 3) * 0.22;
          const yOff = ((i % 5) - 2) * 0.22;
          const colors = ['#a855f7', '#9333ea', '#7e22ce', '#c084fc', '#6b21a8'];
          return (
            <mesh key={i} position={[Math.cos(angle) * r, yOff, Math.sin(angle) * r]}>
              <sphereGeometry args={[0.26 + (i % 3) * 0.1, 10, 10]} />
              <meshStandardMaterial
                color={colors[i % colors.length]}
                emissive="#c084fc"
                emissiveIntensity={1.8}
                transparent
                opacity={0.65}
              />
            </mesh>
          );
        })}
      </group>

      {/* Rising Spectral Wisps */}
      <group ref={wispsRef}>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const r = 0.52;
          return (
            <mesh key={i} position={[Math.cos(angle) * r, 0.5, Math.sin(angle) * r]}>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshBasicMaterial color="#e9d5ff" transparent opacity={0.75} />
            </mesh>
          );
        })}
      </group>

      {/* Sinister Amethyst Point Light */}
      <pointLight ref={lightRef} color="#c084fc" intensity={3.5} distance={6.0} />
    </group>
  );
}

// Crackling Electric Sparks for Electric Pokemon (Pikachu, Pichu, Raichu)
function ElectricSparksVFX({ isSelected }: { isSelected: boolean }) {
  const sparksRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!sparksRef.current) return;
    const t = clock.elapsedTime;
    sparksRef.current.children.forEach((spark, i) => {
      const visible = Math.sin(t * 24.0 + i * 2.4) > (isSelected ? -0.4 : 0.25);
      spark.visible = visible;
      if (visible) {
        spark.position.x = Math.sin(t * 26.0 + i * 1.8) * 0.65;
        spark.position.y = 0.5 + Math.cos(t * 22.0 + i * 1.5) * 0.5;
        spark.position.z = Math.sin(t * 28.0 + i * 3) * 0.65;
      }
    });
    if (lightRef.current) {
      lightRef.current.intensity = Math.random() > 0.3 ? (isSelected ? 3.2 : 1.8) : 0.2;
    }
  });

  return (
    <group position={[0, 0.45, 0]}>
      <group ref={sparksRef}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[0, 0, 0]}>
            <octahedronGeometry args={[0.08, 0]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#fef08a' : '#facc15'} />
          </mesh>
        ))}
      </group>
      <pointLight ref={lightRef} color="#facc15" intensity={1.8} distance={3.8} />
    </group>
  );
}

// Pulsing Psychic Rings for Psychic Pokemon (Abra, Kadabra, Alakazam)
function PsychicAuraVFX() {
  const auraRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!auraRef.current) return;
    const t = clock.elapsedTime;
    auraRef.current.rotation.y = t * 1.0;
    auraRef.current.children.forEach((ring, i) => {
      const ph = (t * 1.4 + i * 0.85) % 2.5;
      ring.scale.setScalar(0.5 + ph * 0.8);
      (ring as THREE.Mesh).position.y = 0.3 + Math.sin(t * 2.2 + i) * 0.16;
    });
  });

  return (
    <group position={[0, 0.55, 0]}>
      <group ref={auraRef}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.72, 24]} />
            <meshBasicMaterial color="#c084fc" transparent opacity={0.65} />
          </mesh>
        ))}
      </group>
      <pointLight color="#d8b4fe" intensity={2.0} distance={3.8} />
    </group>
  );
}

// Animated Concentric Water Ripple Rings for Swimming Pokemon
function WaterRippleVFX() {
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringRef1.current) {
      const p1 = (t * 0.9) % 1.0;
      ringRef1.current.scale.setScalar(0.4 + p1 * 1.6);
      (ringRef1.current.material as THREE.MeshBasicMaterial).opacity = (1 - p1) * 0.75;
    }
    if (ringRef2.current) {
      const p2 = (t * 0.9 + 0.5) % 1.0;
      ringRef2.current.scale.setScalar(0.4 + p2 * 1.6);
      (ringRef2.current.material as THREE.MeshBasicMaterial).opacity = (1 - p2) * 0.75;
    }
  });

  return (
    <group position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ringRef1}>
        <ringGeometry args={[0.35, 0.44, 28]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef2}>
        <ringGeometry args={[0.35, 0.44, 28]} />
        <meshBasicMaterial color="#bae6fd" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Master Species Visual Effects Router
function PokemonSpeciesVFX({
  pokedexId,
  isSelected,
  tailTipBone,
}: {
  pokedexId: number;
  isSelected: boolean;
  tailTipBone?: THREE.Object3D | null;
}) {
  if (pokedexId === 4 || pokedexId === 5 || pokedexId === 6) {
    return <TailFlameVFX pokedexId={pokedexId} tailTipBone={tailTipBone} />;
  }
  if (pokedexId === 92 || pokedexId === 93 || pokedexId === 94) {
    return <GhostSmokeVFX />;
  }
  if (pokedexId === 25 || pokedexId === 172 || pokedexId === 26) {
    return <ElectricSparksVFX isSelected={isSelected} />;
  }
  if (pokedexId === 63 || pokedexId === 64 || pokedexId === 65) {
    return <PsychicAuraVFX />;
  }
  if (pokedexId === 7 || pokedexId === 8 || pokedexId === 9 || pokedexId === 134) {
    return <WaterRippleVFX />;
  }
  return null;
}

// True 3D GLB Mesh Model with Skeletal Locomotion, Animation Mixer & Species Life
function Real3DPokemonMesh({
  url,
  pokedexId,
  isSelected,
  isSleeping,
  isFedRecently,
  isMoving = false,
  behaviorType = 'walker',
  speed = 0.5,
}: {
  url: string;
  pokedexId: number;
  isSelected: boolean;
  isSleeping?: boolean;
  isFedRecently?: boolean;
  isMoving?: boolean;
  behaviorType?: string;
  speed?: number;
}) {
  const { scene, animations } = useGLTF(url, '/draco/gltf/');
  const meshRef = useRef<THREE.Group>(null);

  // Staggered breathing and swaying phase per Pokemon
  const phase = useMemo(() => (pokedexId * 1.37) % (Math.PI * 2), [pokedexId]);
  const baseAngle = useMemo(
    () => (pokedexId === 4 || pokedexId === 5 ? -0.4 : pokedexId % 2 === 0 ? 0.15 : -0.15),
    [pokedexId]
  );

  // Model-specific orientation correction
  const modelRot = useMemo(
    () => MODEL_ROTATION_CORRECTIONS[pokedexId] || [0, 0, 0],
    [pokedexId]
  );

  // Deep clone scene with properly re-bound skeletons using SkeletonUtils
  const clonedScene = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  // Discover and cache skeletal bones for procedural locomotion
  const bones = useMemo(() => {
    const leftLeg: THREE.Object3D[] = [];
    const rightLeg: THREE.Object3D[] = [];
    const leftArm: THREE.Object3D[] = [];
    const rightArm: THREE.Object3D[] = [];
    const tails: THREE.Object3D[] = [];
    let tailTip: THREE.Object3D | null = null;
    const heads: THREE.Object3D[] = [];
    const ears: THREE.Object3D[] = [];
    const spine: THREE.Object3D[] = [];

    clonedScene.traverse((obj) => {
      const n = obj.name.toLowerCase();
      if (
        n.includes('lthigh') ||
        n.includes('lleg') ||
        n.includes('lfoot') ||
        n.includes('ltoe') ||
        n.includes('006') ||
        n.includes('007')
      ) {
        leftLeg.push(obj);
      } else if (
        n.includes('rthigh') ||
        n.includes('rleg') ||
        n.includes('rfoot') ||
        n.includes('rtoe') ||
        n.includes('012') ||
        n.includes('013')
      ) {
        rightLeg.push(obj);
      } else if (
        n.includes('larm') ||
        n.includes('lforearm') ||
        n.includes('lhand') ||
        n.includes('lshoulder')
      ) {
        leftArm.push(obj);
      } else if (
        n.includes('rarm') ||
        n.includes('rforearm') ||
        n.includes('rhand') ||
        n.includes('rshoulder')
      ) {
        rightArm.push(obj);
      } else if (n.includes('tail')) {
        tails.push(obj);
        if (
          n.includes('taila03') ||
          n.includes('tail6') ||
          n.includes('tail5') ||
          n.includes('tail4')
        ) {
          tailTip = obj;
        }
      } else if (n.includes('head')) {
        heads.push(obj);
      } else if (n.includes('lear') || n.includes('rear') || n.includes('ear')) {
        ears.push(obj);
      } else if (n.includes('spine') || n.includes('waist') || n.includes('hips')) {
        spine.push(obj);
      }
    });

    if (!tailTip && tails.length > 0) {
      tailTip = tails[tails.length - 1];
    }

    return { leftLeg, rightLeg, leftArm, rightArm, tails, tailTip, heads, ears, spine };
  }, [clonedScene]);

  // Embedded GLTF Animation Mixer (for models with official embedded animations like Bulbasaur, Pikachu, Magnemite, Eevee)
  const mixer = useMemo(() => {
    if (!animations || animations.length === 0) return null;
    return new THREE.AnimationMixer(clonedScene);
  }, [clonedScene, animations]);

  // Manage embedded animation clips
  React.useEffect(() => {
    if (!mixer || !animations || animations.length === 0) return;
    const clips = animations;
    let targetClip: THREE.AnimationClip | undefined;

    if (isMoving) {
      targetClip =
        clips.find((c) => c.name.toLowerCase().includes('walk')) ||
        clips.find((c) => c.name.toLowerCase().includes('run'));
    } else if (isSelected || isFedRecently) {
      targetClip =
        clips.find((c) => c.name.toLowerCase().includes('jump')) ||
        clips.find((c) => c.name.toLowerCase().includes('fight')) ||
        clips.find((c) => c.name.toLowerCase().includes('attack'));
    } else {
      targetClip =
        clips.find((c) => c.name.toLowerCase().includes('idle')) ||
        clips.find((c) => c.name.toLowerCase().includes('wait'));
    }

    if (targetClip) {
      const action = mixer.clipAction(targetClip);
      action.reset().fadeIn(0.2).play();
      return () => {
        action.fadeOut(0.2);
      };
    }
  }, [mixer, animations, isMoving, isSelected, isFedRecently]);

  // Compute normalized scale and offset so the model stands firmly at ground level
  const { normalizedScale, centerOffset } = useMemo(() => {
    if (MODEL_MANUAL_OFFSETS[pokedexId]) {
      return {
        normalizedScale: MODEL_MANUAL_OFFSETS[pokedexId].scale,
        centerOffset: MODEL_MANUAL_OFFSETS[pokedexId].offset,
      };
    }

    const tempGroup = new THREE.Group();
    const cloned = scene.clone();
    cloned.rotation.set(...modelRot);
    tempGroup.add(cloned);
    tempGroup.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(tempGroup);
    const size = box.getSize(new THREE.Vector3());
    const canonicalHeight = POKEDEX_CANONICAL_HEIGHTS[pokedexId] || 1.0;
    // Balanced world scale factor: 1m in Pokedex = 1.35 units in 3D world
    const targetHeight = canonicalHeight * 1.35;
    const modelHeight = size.y > 0.01 ? size.y : Math.max(size.x, size.z, 0.01);
    const scale = modelHeight > 0 ? targetHeight / modelHeight : 1;
    const center = box.getCenter(new THREE.Vector3());

    return {
      normalizedScale: scale,
      centerOffset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number],
    };
  }, [scene, pokedexId, modelRot]);

  // Living procedural & skeletal motion in true 3D space
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Update embedded animation mixer if present
    if (mixer) {
      mixer.update(delta);
    }

    if (isSleeping) {
      // Pokemon Sleep: lying relaxed, deep rhythmic breathing
      const breath = Math.sin(t * 1.4 + phase) * 0.045;
      meshRef.current.position.y = -0.12;
      meshRef.current.rotation.x = 0.15;
      meshRef.current.rotation.y = baseAngle;
      meshRef.current.rotation.z = Math.sin(t * 0.7 + phase) * 0.02;
      meshRef.current.scale.set(1 + breath, 1 - breath * 0.6, 1 + breath);

      // Relax skeletal limbs
      bones.leftLeg.forEach((b) => (b.rotation.x = 0));
      bones.rightLeg.forEach((b) => (b.rotation.x = 0));
      if (pokedexId === 25) {
        bones.heads.forEach((h) => (h.rotation.x = -0.15));
      } else {
        bones.heads.forEach((h) => (h.rotation.x = 0.2));
      }
    } else if (isFedRecently || isSelected) {
      // Joyful encounter celebration: energetic hop, squash & stretch
      const jump = Math.abs(Math.sin(t * 5.5)) * 0.28;
      const squash = Math.sin(t * 5.5) * 0.12;
      meshRef.current.position.y = jump;
      meshRef.current.rotation.x = -0.04;
      meshRef.current.rotation.y = 0;
      meshRef.current.rotation.z = Math.sin(t * 5.5) * 0.05;
      meshRef.current.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);

      // Skeletal celebration: raise arms up in victory, fast wagging happy tail!
      bones.leftArm.forEach((b) => {
        b.rotation.z = -0.7;
        b.rotation.x = -0.5;
      });
      bones.rightArm.forEach((b) => {
        b.rotation.z = 0.7;
        b.rotation.x = -0.5;
      });
      bones.tails.forEach((b, i) => {
        if (pokedexId === 4 || pokedexId === 5) {
          b.rotation.y = -0.22 + Math.sin(t * 6.0 + i * 0.5) * 0.08;
          b.rotation.z = -0.18 + Math.sin(t * 5.0 + i * 0.5) * 0.08;
        } else {
          b.rotation.y = Math.sin(t * 14.0 + i * 0.6) * 0.45;
        }
      });
      bones.heads.forEach((h) => {
        if (pokedexId === 25) {
          h.rotation.x = -0.52;
          h.rotation.y = Math.sin(t * 8.0) * 0.15;
        } else {
          h.rotation.x = -0.2;
        }
      });
      if (pokedexId === 25) {
        bones.spine.forEach((s) => {
          s.rotation.x = -0.22;
        });
      }
      bones.ears.forEach((e) => {
        e.rotation.z = Math.sin(t * 12.0) * 0.2;
      });
    } else if (isMoving) {
      // Dynamic active walking / trotting / hopping cadence
      const walkCadence = t * 10.0 * (speed > 0 ? speed * 2.0 : 1.0) + phase;

      // SKELETAL PROCEDURAL BONE LOCOMOTION
      // Alternating leg swing (paws walking across the earth)
      const legAngle = Math.sin(walkCadence) * 0.45;
      bones.leftLeg.forEach((b) => (b.rotation.x = legAngle));
      bones.rightLeg.forEach((b) => (b.rotation.x = -legAngle));

      // Arm counter-swing
      const armAngle = -legAngle * 0.38;
      bones.leftArm.forEach((b) => (b.rotation.x = armAngle));
      bones.rightArm.forEach((b) => (b.rotation.x = -armAngle));

      // Sinuous harmonic tail wag
      bones.tails.forEach((b, i) => {
        if (pokedexId === 4 || pokedexId === 5) {
          b.rotation.y = -0.18 + Math.sin(walkCadence * 0.8 + i * 0.5) * 0.08;
          b.rotation.z = -0.16 + Math.cos(walkCadence * 0.8 + i * 0.5) * 0.08;
        } else {
          b.rotation.y = Math.sin(walkCadence * 0.8 + i * 0.55) * 0.35;
        }
      });

      // Rhythmic head bob
      bones.heads.forEach((h) => {
        if (pokedexId === 25) {
          h.rotation.x = -0.48 + Math.sin(walkCadence * 2.0) * 0.08;
        } else {
          h.rotation.x = Math.sin(walkCadence * 2.0) * 0.09;
        }
      });
      if (pokedexId === 25) {
        bones.spine.forEach((s) => {
          s.rotation.x = -0.18;
        });
      }

      // Ear physics flop
      bones.ears.forEach((e) => {
        e.rotation.z = Math.sin(walkCadence) * 0.18;
      });

      if (behaviorType === 'floater') {
        // Gastly: ghostly undulating drift & ominous tilting
        const floatWave = Math.sin(t * 2.4 + phase) * 0.22;
        const eerieTilt = Math.sin(t * 1.2 + phase) * 0.14;
        meshRef.current.position.y = floatWave;
        meshRef.current.rotation.z = eerieTilt;
        meshRef.current.rotation.x = 0;
        meshRef.current.scale.set(1, 1, 1);
      } else if (behaviorType === 'hopper') {
        // Pikachu / Pidgey: energetic scampering hops & pounces
        const hop = Math.max(0, Math.sin(walkCadence)) * 0.28;
        const waddle = Math.sin(walkCadence * 0.5) * 0.14;
        const pitch = 0.09 + Math.sin(walkCadence) * 0.06;
        meshRef.current.position.y = hop;
        meshRef.current.rotation.z = waddle;
        meshRef.current.rotation.x = pitch;
        meshRef.current.scale.set(1.02, 0.98, 1.02);
      } else if (behaviorType === 'levitator') {
        // Magnemite: rapid magnetic hum vibration
        const hum = Math.sin(t * 22.0) * 0.03;
        meshRef.current.position.y = hum;
        meshRef.current.rotation.z = Math.sin(t * 3.0) * 0.12;
        meshRef.current.rotation.x = 0;
      } else if (behaviorType === 'swimmer') {
        // Water Pokemon (Squirtle, Wartortle): gentle swimming paddle in the lake
        const swimBob = Math.sin(t * 3.2 + phase) * 0.05;
        const swimPitch = 0.16 + Math.sin(t * 3.2) * 0.04;
        meshRef.current.position.y = swimBob;
        meshRef.current.rotation.x = swimPitch;
        meshRef.current.rotation.z = Math.sin(t * 2.2) * 0.06;
        meshRef.current.scale.set(1.02, 0.98, 1.02);
        // Swimming limb flutter
        bones.leftLeg.forEach((b) => (b.rotation.x = Math.sin(walkCadence * 1.4) * 0.35));
        bones.rightLeg.forEach((b) => (b.rotation.x = -Math.sin(walkCadence * 1.4) * 0.35));
        bones.leftArm.forEach((b) => (b.rotation.z = -0.45 + Math.sin(walkCadence) * 0.25));
        bones.rightArm.forEach((b) => (b.rotation.z = 0.45 - Math.sin(walkCadence) * 0.25));
      } else {
        // Standard Walkers (Bulbasaur, Charmeleon, Eevee, Meowth, Chansey)
        const stepBounce = Math.abs(Math.sin(walkCadence)) * 0.16;
        const waddle = Math.sin(walkCadence) * 0.12;
        const pitch = 0.08 + Math.sin(walkCadence * 2) * 0.05;
        const squash = Math.max(0, -Math.sin(walkCadence)) * 0.08;

        meshRef.current.position.y = stepBounce;
        meshRef.current.rotation.z = waddle;
        meshRef.current.rotation.x = pitch;
        meshRef.current.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
      }
    } else {
      // Natural idle life: breathing, weight shift, looking around naturally
      const breath = Math.sin(t * 2.6 + phase) * 0.038;
      const headLook = Math.sin(t * 0.8 + phase) * 0.22;
      meshRef.current.position.y = Math.abs(Math.sin(t * 1.5 + phase)) * 0.03;
      meshRef.current.rotation.x = 0;
      meshRef.current.rotation.z = Math.sin(t * 1.2 + phase) * 0.03;
      meshRef.current.rotation.y = baseAngle + headLook;
      meshRef.current.scale.set(1 + breath, 1 - breath * 0.4, 1 + breath);

      // Idle skeletal breathing and tail sway
      bones.spine.forEach((s) => {
        if (pokedexId === 25) {
          s.rotation.x = -0.2;
        }
        s.scale.set(1 + Math.sin(t * 2.2 + phase) * 0.02, 1, 1 + Math.sin(t * 2.2 + phase) * 0.02);
      });
      bones.tails.forEach((b, i) => {
        if (pokedexId === 4 || pokedexId === 5) {
          b.rotation.y = -0.18 + Math.sin(t * 2.5 + i * 0.4) * 0.04;
          b.rotation.z = -0.16 + Math.sin(t * 2.0 + i * 0.4) * 0.04;
        } else {
          b.rotation.y = Math.sin(t * 1.8 + i * 0.5 + phase) * 0.15;
        }
      });
      bones.heads.forEach((h) => {
        if (pokedexId === 25) {
          h.rotation.x = -0.48; // Upright face, eyes & cheeks proudly visible!
          h.rotation.y = Math.sin(t * 1.2 + phase) * 0.18;
        } else {
          h.rotation.y = Math.sin(t * 0.7 + phase) * 0.2;
        }
      });
    }
  });

  return (
    <group ref={meshRef}>
      <group position={centerOffset} scale={normalizedScale} rotation={modelRot}>
        <primitive object={clonedScene} />
        {/* Species-specific elemental VFX inside model coordinate system for perfect attachment */}
        <PokemonSpeciesVFX
          pokedexId={pokedexId}
          isSelected={isSelected}
          tailTipBone={bones.tailTip}
        />
      </group>
    </group>
  );
}

// 3D Crystal Loading Pedestal (displayed while GLB model is streaming)
function LoadingPedestal({ color }: { color: string }) {
  const crystalRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y = clock.elapsedTime * 2.5;
      crystalRef.current.position.y = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.12;
    }
  });

  return (
    <group>
      <mesh ref={crystalRef} position={[0, 0.8, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          wireframe
        />
      </mesh>
    </group>
  );
}

// High-Res 3D Holographic Fallback in case of network interruption
function HologramFallback({
  spriteUrl,
  name,
}: {
  spriteUrl: string;
  name: string;
  color: string;
}) {
  return (
    <group position={[0, 0.9, 0]}>
      <Html center position={[0, 0.4, 0]} transform distanceFactor={5.5}>
        <div
          className="w-32 h-32 relative select-none pointer-events-none filter drop-shadow-[0_4px_16px_rgba(255,255,255,0.4)]"
        >
          <Image
            src={spriteUrl}
            alt={name}
            fill
            sizes="128px"
            className="object-contain"
            priority
          />
        </div>
      </Html>
    </group>
  );
}

// Error Boundary for 3D GLB loading
class GLTFErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Graceful fallback to 3D hologram
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Species movement & personality behaviors
interface PokemonBehavior {
  type: 'walker' | 'hopper' | 'floater' | 'sleeper' | 'meditator' | 'levitator' | 'swimmer';
  radius: number;
  speed: number;
  baseY: number;
}

const POKEMON_BEHAVIORS: Record<number, PokemonBehavior> = {
  143: { type: 'sleeper', radius: 0, speed: 0, baseY: 0 }, // Snorlax: gentle giant, sleeping in center
  92: { type: 'floater', radius: 2.8, speed: 0.45, baseY: 0.35 }, // Gastly: eerie drifting at eye level
  93: { type: 'floater', radius: 2.8, speed: 0.45, baseY: 0.35 }, // Haunter
  94: { type: 'floater', radius: 2.5, speed: 0.5, baseY: 0.25 }, // Gengar
  81: { type: 'levitator', radius: 2.3, speed: 0.55, baseY: 1.1 }, // Magnemite: electrical hover
  82: { type: 'levitator', radius: 2.3, speed: 0.55, baseY: 1.1 }, // Magneton
  63: { type: 'meditator', radius: 1.4, speed: 0.35, baseY: 0.6 }, // Abra: meditating hover
  64: { type: 'meditator', radius: 1.4, speed: 0.35, baseY: 0.5 },
  65: { type: 'meditator', radius: 1.4, speed: 0.35, baseY: 0.4 },
  25: { type: 'hopper', radius: 2.4, speed: 0.65, baseY: 0 }, // Pikachu: joyful scampering
  26: { type: 'hopper', radius: 2.2, speed: 0.6, baseY: 0 },
  133: { type: 'walker', radius: 2.5, speed: 0.6, baseY: 0 }, // Eevee: playful prance
  1: { type: 'walker', radius: 2.0, speed: 0.38, baseY: 0 }, // Bulbasaur: grazing walk
  2: { type: 'walker', radius: 2.0, speed: 0.38, baseY: 0 },
  3: { type: 'walker', radius: 1.8, speed: 0.32, baseY: 0 },
  4: { type: 'walker', radius: 2.2, speed: 0.55, baseY: 0 }, // Charmander: active trot
  5: { type: 'walker', radius: 2.2, speed: 0.55, baseY: 0 },
  6: { type: 'walker', radius: 2.4, speed: 0.5, baseY: 0.3 },
  7: { type: 'swimmer', radius: 2.4, speed: 0.42, baseY: -0.15 }, // Squirtle: swimming gracefully in the lake!
  8: { type: 'swimmer', radius: 2.4, speed: 0.42, baseY: -0.15 }, // Wartortle: swimming with water ripples
  9: { type: 'swimmer', radius: 2.0, speed: 0.38, baseY: -0.18 }, // Blastoise
  134: { type: 'swimmer', radius: 2.4, speed: 0.45, baseY: -0.15 }, // Vaporeon
  79: { type: 'sleeper', radius: 0.8, speed: 0.22, baseY: 0 }, // Slowpoke: relaxing on pebble lake bank
  80: { type: 'walker', radius: 1.2, speed: 0.3, baseY: 0 },
  52: { type: 'walker', radius: 2.0, speed: 0.52, baseY: 0 }, // Meowth: ledge prowl (0.4m proportional)
  53: { type: 'walker', radius: 2.2, speed: 0.55, baseY: 0 },
  16: { type: 'hopper', radius: 2.2, speed: 0.5, baseY: 0 }, // Pidgey: bird hops & flutter
  17: { type: 'hopper', radius: 2.3, speed: 0.52, baseY: 0 },
  18: { type: 'hopper', radius: 2.5, speed: 0.55, baseY: 0 },
  113: { type: 'walker', radius: 1.6, speed: 0.35, baseY: 0 }, // Chansey: gentle waddle
};

export default function Pokemon3D({
  category,
  userPokemon,
  position,
  isSelected,
  isSleeping = false,
  isFedRecently = false,
  onClick,
}: Pokemon3DProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const currentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(...position));
  const [hovered, setHovered] = useState(false);

  const level = userPokemon?.current_level ?? 1;
  const form = getCurrentEvolution(category.pokemon, level);

  // Local GLB model URL served directly from public/models/{id}.glb
  const glbUrl = `/models/${form.pokedexId}.glb`;

  const behavior: PokemonBehavior = POKEMON_BEHAVIORS[form.pokedexId] || {
    type: 'walker',
    radius: 2.0,
    speed: 0.45,
    baseY: 0,
  };

  const phase = useMemo(() => (form.pokedexId * 1.37) % (Math.PI * 2), [form.pokedexId]);
  const cryText = useMemo(() => POKEMON_CRIES[form.pokedexId] || `${form.name}!`, [form.pokedexId, form.name]);

  // Active moving flag determines procedural walking cadence (NOT interrupted by hover)
  const isMoving = behavior.radius > 0 && !isSleeping && !isSelected;

  // Live roaming trajectory & heading calculation in true 3D space
  useFrame((state, delta) => {
    if (!rootGroupRef.current) return;
    const t = state.clock.elapsedTime;

    let targetX = position[0];
    let targetZ = position[2];
    let targetY = position[1] + behavior.baseY;

    if (behavior.radius > 0 && !isSleeping && !isSelected) {
      // Natural harmonic roaming curve (wandering around habitat)
      const wanderTime = t * behavior.speed;
      const wx =
        Math.sin(wanderTime + phase) * behavior.radius +
        Math.cos(wanderTime * 0.41 + phase * 2.3) * (behavior.radius * 0.35);
      const wz =
        Math.cos(wanderTime * 0.83 + phase) * behavior.radius +
        Math.sin(wanderTime * 0.53 + phase * 1.7) * (behavior.radius * 0.35);

      targetX = position[0] + wx;
      targetZ = position[2] + wz;
    }

    // Floating, hopping & swimming vertical physics
    if (behavior.type === 'floater') {
      targetY += Math.sin(t * 1.8 + phase) * 0.22;
    } else if (behavior.type === 'levitator') {
      targetY += Math.sin(t * 3.0 + phase) * 0.12;
    } else if (behavior.type === 'meditator') {
      targetY += Math.sin(t * 1.5 + phase) * 0.14;
    } else if (behavior.type === 'swimmer') {
      targetY += Math.sin(t * 2.5 + phase) * 0.04;
    } else if (behavior.type === 'hopper' && !isSleeping && !isSelected) {
      targetY += Math.max(0, Math.sin(t * 7.0 + phase)) * 0.22;
    } else if (behavior.type === 'walker' && !isSleeping && !isSelected) {
      targetY += Math.abs(Math.sin(t * 5.2 + phase)) * 0.08;
    }

    // Smooth movement interpolation
    const prevPos = currentPosRef.current.clone();
    const lerpSpeed = isSelected ? 12.0 : 3.5;
    currentPosRef.current.x = THREE.MathUtils.lerp(currentPosRef.current.x, targetX, delta * lerpSpeed);
    currentPosRef.current.y = THREE.MathUtils.lerp(currentPosRef.current.y, targetY, delta * (lerpSpeed * 1.4));
    currentPosRef.current.z = THREE.MathUtils.lerp(currentPosRef.current.z, targetZ, delta * lerpSpeed);
    rootGroupRef.current.position.copy(currentPosRef.current);

    // Calculate heading rotation
    const vx = targetX - prevPos.x;
    const vz = targetZ - prevPos.z;

    if (isSelected) {
      // Face trainer camera directly so face and expressions are proudly visible!
      const cam = state.camera.position;
      const angleOffset = (form.pokedexId === 4 || form.pokedexId === 5) ? -0.42 : 0;
      const targetAngle = Math.atan2(cam.x - targetX, cam.z - targetZ) + angleOffset;
      rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.y,
        targetAngle,
        delta * 8.5
      );
    } else if (Math.hypot(vx, vz) > 0.0008 && behavior.radius > 0) {
      // Turn towards walking direction
      const walkAngle = Math.atan2(vx, vz);
      // Angular lerp
      let diff = walkAngle - rootGroupRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      rootGroupRef.current.rotation.y += diff * delta * 4.0;
    }
  });

  return (
    <group
      ref={rootGroupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        setHovered(false);
      }}
    >
      {/* 3D GLB Polygon Model with Suspense & Error Boundary */}
      <GLTFErrorBoundary
        fallback={
          <HologramFallback
            spriteUrl={form.spriteUrl}
            name={form.name}
            color={category.color}
          />
        }
      >
        <Suspense fallback={<LoadingPedestal color={category.color} />}>
          <Real3DPokemonMesh
            url={glbUrl}
            pokedexId={form.pokedexId}
            isSelected={isSelected}
            isSleeping={isSleeping}
            isFedRecently={isFedRecently}
            isMoving={isMoving}
            behaviorType={behavior.type}
            speed={behavior.speed}
          />
        </Suspense>
      </GLTFErrorBoundary>

      {/* Floating Reaction Emojis & Dialogue Speech Bubbles */}
      <Html
        position={[0, 2.85, 0]}
        center
        distanceFactor={8}
        className="pointer-events-none select-none"
      >
        {isSelected && (
          <div className="flex flex-col items-center animate-bounce -mt-4">
            <div
              className="px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: `2px solid ${category.color}`,
                boxShadow: `0 8px 24px ${category.color}80`,
              }}
            >
              <span className="text-sm animate-pulse">🔊</span>
              <span className="font-pixel text-xs font-black text-white tracking-wide">
                {cryText}
              </span>
            </div>
            <div
              className="w-2.5 h-2.5 rotate-45 -mt-1"
              style={{ background: category.color }}
            ></div>
          </div>
        )}
        {isFedRecently && !isSelected && (
          <div className="animate-bounce text-2xl filter drop-shadow-[0_4px_10px_rgba(236,72,153,0.9)]">
            💖💖💖
          </div>
        )}
        {hovered && !isSleeping && !isFedRecently && !isSelected && (
          <div className="animate-pulse text-lg filter drop-shadow-md">
            🎵
          </div>
        )}
        {isSleeping && !isSelected && (
          <div className="flex flex-col items-start gap-0.5 font-pixel text-[#93c5fd] drop-shadow-[0_2px_10px_rgba(59,130,246,0.9)] animate-pulse">
            <span className="text-[10px] opacity-75">z</span>
            <span className="text-xs font-bold opacity-90 ml-1.5">Z</span>
            <span className="text-sm font-black text-white ml-3">Z</span>
          </div>
        )}
      </Html>

      {/* Natural Route Dirt & Stone Habitat Base (or Water Ripples for swimmers) */}
      {behavior.type !== 'swimmer' ? (
        <group position={[0, -0.05, 0]}>
          {/* Soft rounded grassy knoll base */}
          <mesh position={[0, 0.04, 0]} receiveShadow>
            <cylinderGeometry args={[1.05, 1.3, 0.12, 28]} />
            <meshStandardMaterial
              color={isSelected ? '#34d399' : hovered ? '#4ade80' : '#22c55e'}
              roughness={0.7}
              metalness={0.08}
            />
          </mesh>

          {/* Elemental Type Glow Ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
            <ringGeometry args={[0.92, 1.22, 32]} />
            <meshBasicMaterial
              color={category.color}
              transparent
              opacity={isSelected ? 0.95 : hovered ? 0.7 : 0.28}
            />
          </mesh>

          {/* Shadow Decal */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[1.35, 32]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.3} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 0.02, 0]}>
          <WaterRippleVFX />
        </group>
      )}

      {/* Local Ambient Glow Light */}
      <pointLight
        position={[0, 1.2, 0]}
        color={category.color}
        intensity={isSelected ? 2.5 : hovered ? 1.5 : 0.6}
        distance={4.8}
      />

      {/* Pokemon Route Nameplate & Level Badge (Hidden during 1-on-1 encounter for clean view) */}
      {!isSelected && (
        <Html
          position={[0, 2.7, 0]}
          center
          distanceFactor={10}
          className="pointer-events-none select-none transition-all duration-200"
        >
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md transition-all shadow-xl ${
              hovered ? 'scale-105' : 'opacity-90'
            }`}
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: `1.5px solid ${category.color}`,
              boxShadow: `0 4px 18px ${category.color}60`,
            }}
          >
            <span className="text-xs">{category.icon}</span>
            <span className="text-xs font-black text-white whitespace-nowrap">
              {form.name}
            </span>
            <span
              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
              style={{
                background: category.color,
                color: '#ffffff',
              }}
            >
              Lv.{level}
            </span>
            {isSleeping && <span className="text-[11px]">💤</span>}
          </div>
        </Html>
      )}
    </group>
  );
}
