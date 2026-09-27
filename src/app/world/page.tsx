'use client';

import { Suspense, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import AppNavigation from '@/components/AppNavigation';
import Pokemon3D from '@/components/Pokemon3D';
import {
  APP_CATEGORIES,
  getLevelFromExp,
  getLevelProgress,
  getCurrentEvolution,
  TYPE_COLORS,
  type AppCategory,
} from '@/lib/pokemon';
import { fetchUserPokemon, subscribeToData, addExpToPokemon } from '@/lib/data-store';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/lib/auth-context';
import type { UserPokemon } from '@/lib/types';

// Pokemon Sleep & Route lore connecting finance habits to companion styles
const ROUTE_LORE: Record<string, { habit: string; style: string; preferredBerry: string }> = {
  'food-delivery': {
    habit: 'Food Delivery (Zomato & Swiggy)',
    style: 'Campfire Slumber: Charmander resting warmly by the roadside hearth after a midnight delivery feast.',
    preferredBerry: 'Razz Berry',
  },
  grocery: {
    habit: 'Grocery & Produce (Blinkit & Instamart)',
    style: 'Tall Grass Forager: Bulbasaur grazing in the dense route meadows amidst fresh market produce.',
    preferredBerry: 'Nanab Berry',
  },
  ecommerce: {
    habit: 'Online Shopping (Amazon & Flipkart)',
    style: 'Lake Swimmer: Squirtle paddling peacefully in Azure Lake inspecting water lilies.',
    preferredBerry: 'Pinap Berry',
  },
  'upi-payments': {
    habit: 'Digital Payments & UPI (GPay & PhonePe)',
    style: 'Signpost Watcher: Pikachu perched alertly by the Route 1 sign, cheeks crackling with transaction energy.',
    preferredBerry: 'Razz Berry',
  },
  clothing: {
    habit: 'Fashion & Apparel (Myntra & Bonkers)',
    style: 'Trail Rambler: Eevee prancing down the dirt route path wearing seasonal streetwear.',
    preferredBerry: 'Nanab Berry',
  },
  trading: {
    habit: 'Stocks & Trading (Groww & Zerodha)',
    style: 'Ledge Guard: Meowth perched on the route cliffside counting gleaming gold coins in the sun.',
    preferredBerry: 'Pinap Berry',
  },
  entertainment: {
    habit: 'Gaming & Streaming (Netflix & Steam)',
    style: 'Shaded Canopy: Gastly drifting beneath the route trees after a marathon nighttime gaming session.',
    preferredBerry: 'Nanab Berry',
  },
  travel: {
    habit: 'Cabs & Travel (Uber & IRCTC)',
    style: 'Fence Scout: Pidgey resting on the split-rail wooden fence after a long transit trip.',
    preferredBerry: 'Razz Berry',
  },
  pharmacy: {
    habit: 'Health & Pharmacy (1mg & Practo)',
    style: 'Route Nurse: Chansey providing soothing recovery energy to passing trainers on Route 1.',
    preferredBerry: 'Nanab Berry',
  },
  utilities: {
    habit: 'Bills & Utilities (Electricity & Jio)',
    style: 'Telegraph Hover: Magnemite buzzing softly around the wooden utility route poles.',
    preferredBerry: 'Pinap Berry',
  },
  'quick-commerce': {
    habit: 'Instant Delivery (Zepto & Dunzo)',
    style: 'Tall Grass Mystic: Abra meditating inside the thick route grass, ready to teleport groceries.',
    preferredBerry: 'Razz Berry',
  },
  'rent-housing': {
    habit: 'Rent & Living Expenses (NoBroker & Rent)',
    style: 'Lake Shore Nap: Slowpoke yawning lazily on the pebble beach by the water edge.',
    preferredBerry: 'Pinap Berry',
  },
};

// Strategic positions across Route 1 (spacious, non-overlapping habitats)
const ROUTE_POSITIONS: Array<[number, number, number]> = [
  [-5.5, 0, 3.8],    // 0: Charmander (campsite meadow clearing, isolated from campfire)
  [5.2, 0, 4.0],     // 1: Bulbasaur (tall grass wildflower meadow)
  [14.0, 0, 1.2],    // 2: Squirtle (swimming safely inside Azure Lake with paddle & ripples!)
  [-2.8, 0, 1.8],    // 3: Pikachu (wayside path by Route 1 signboard)
  [1.8, 0, 6.2],     // 4: Eevee (southern path flower border)
  [4.5, 0.45, 9.0],  // 5: Meowth (rocky route ledge with coins)
  [-8.5, 0, -5.5],   // 6: Gastly (shaded pine canopy)
  [0.5, 0, 9.2],     // 7: Pidgey (split-rail wooden fence)
  [-4.5, 0, 8.5],    // 8: Chansey (nurse rest lawn by Pokemon Center)
  [-4.0, 0, -11.0],  // 9: Magnemite (utility post hover)
  [4.0, 0, -11.0],   // 10: Abra (north mystic grass meadow)
  [9.5, 0, -1.8],    // 11: Slowpoke (Azure Lake pebble beach shore)
];

// Infinite Pokemon Route Terrain (Lush Pokemon Sleep / Legends Z-A style with soft organic meadow gradients)
function RouteTerrain({ isNight }: { isNight: boolean }) {
  return (
    <group position={[0, -0.01, 0]}>
      {/* 1. Vast Infinite Route Grassland (stretches far beyond fog horizon with zero disc edges) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[1200, 1200, 32, 32]} />
        <meshStandardMaterial
          color={isNight ? '#0b3520' : '#4ade80'}
          roughness={0.72}
          metalness={0.02}
        />
      </mesh>

      {/* Organic Painterly Meadow Highlights (Soft circular & elliptical clearings, replacing blocky checkered tiles) */}
      {[
        [-12, 0.003, 3, 11, 1.2, 0.8, '#22c55e', '#064e3b'],
        [10, 0.003, -6, 9.5, 1.1, 0.9, '#16a34a', '#043827'],
        [-6, 0.003, -14, 10, 1.0, 1.2, '#22c55e', '#064e3b'],
        [8, 0.003, 14, 8.5, 1.1, 1.0, '#15803d', '#022c22'],
      ].map(([x, y, z, r, sx, sz, dayCol, nightCol], idx) => (
        <mesh
          key={`meadow-${idx}`}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[Number(sx), Number(sz), 1]}
          position={[Number(x), Number(y), Number(z)]}
          receiveShadow
        >
          <circleGeometry args={[Number(r), 32]} />
          <meshStandardMaterial
            color={isNight ? String(nightCol) : String(dayCol)}
            roughness={0.82}
          />
        </mesh>
      ))}

      {/* Dappled Route 1 Wildflower & Clover Clusters (like Pokemon Sleep) */}
      {[
        [-3.2, 0.015, -0.5],
        [3.0, 0.015, -0.8],
        [-2.0, 0.015, -4.2],
        [2.5, 0.015, -3.8],
        [-1.0, 0.015, 3.5],
        [2.2, 0.015, 2.0],
      ].map((pos, idx) => (
        <group key={`clover-${idx}`} position={pos as [number, number, number]}>
          {/* 4-leaf clover petals */}
          {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle, pi) => (
            <mesh
              key={pi}
              rotation={[-Math.PI / 2, 0, angle]}
              position={[Math.cos(angle) * 0.14, 0, Math.sin(angle) * 0.14]}
            >
              <circleGeometry args={[0.13, 8]} />
              <meshBasicMaterial color={isNight ? '#166534' : '#22c55e'} />
            </mesh>
          ))}
          {/* Pink and yellow miniature buds */}
          <mesh position={[0.24, 0.04, 0.1]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshBasicMaterial color={idx % 2 === 0 ? '#f472b6' : '#facc15'} />
          </mesh>
        </group>
      ))}

      {/* 2. Classic Winding Dirt & Cobblestone Route Path */}
      {/* South road approach */}
      <mesh receiveShadow position={[-0.8, 0.01, 28]} rotation={[-Math.PI / 2, 0, -0.1]}>
        <planeGeometry args={[5.2, 42]} />
        <meshStandardMaterial color={isNight ? '#78350f' : '#d97706'} roughness={0.88} />
      </mesh>
      {/* Central Route junction bypass */}
      <mesh receiveShadow position={[-1.2, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[4.8, 22]} />
        <meshStandardMaterial color={isNight ? '#78350f' : '#d97706'} roughness={0.88} />
      </mesh>
      {/* North road continuing towards Battle Arena */}
      <mesh receiveShadow position={[0.5, 0.01, -30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.4, 46]} />
        <meshStandardMaterial color={isNight ? '#78350f' : '#d97706'} roughness={0.88} />
      </mesh>

      {/* Roadside Stepping Stones & Cobblestones */}
      {[
        [-1.8, 0.03, 5.0],
        [0.8, 0.03, 3.2],
        [-0.5, 0.03, -1.5],
        [1.5, 0.03, -4.8],
        [-1.2, 0.03, -7.0],
        [-0.4, 0.03, 10.5],
        [0.6, 0.03, 14.0],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]} rotation={[-Math.PI / 2, 0, idx * 0.7]}>
          <circleGeometry args={[0.55 + (idx % 2) * 0.15, 8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} />
        </mesh>
      ))}

      {/* 3. Natural Gentle Grassy Knoll */}
      <group position={[-10.5, 0, -2.5]}>
        <mesh receiveShadow position={[0, 0.08, 0]}>
          <cylinderGeometry args={[5.2, 5.8, 0.16, 24]} />
          <meshStandardMaterial color={isNight ? '#0b3520' : '#16a34a'} roughness={0.78} />
        </mesh>
      </group>

      {/* 4. Distant Rolling Green Hills on the Horizon (Frames the world naturally) */}
      <mesh position={[-32, 2.5, -42]} receiveShadow>
        <sphereGeometry args={[22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={isNight ? '#064e3b' : '#15803d'} roughness={0.8} />
      </mesh>
      <mesh position={[30, 2.2, -45]} receiveShadow>
        <sphereGeometry args={[24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={isNight ? '#064e3b' : '#16a34a'} roughness={0.8} />
      </mesh>
      <mesh position={[36, 1.8, 5]} receiveShadow>
        <sphereGeometry args={[18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={isNight ? '#064e3b' : '#15803d'} roughness={0.8} />
      </mesh>
      <mesh position={[-38, 2.0, 10]} receiveShadow>
        <sphereGeometry args={[20, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={isNight ? '#064e3b' : '#16a34a'} roughness={0.8} />
      </mesh>
    </group>
  );
}

// Roadside Pokémon Center Rest Kiosk (Official Pokémon Company Healing Outpost)
function PokemonHealingStation({ isNight }: { isNight: boolean }) {
  const healingBallsRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (healingBallsRef.current) {
      const t = clock.elapsedTime;
      healingBallsRef.current.children.forEach((ball, i) => {
        const ph = i * 0.7;
        const s = 0.85 + Math.sin(t * 4.5 + ph) * 0.25;
        ball.scale.setScalar(s);
      });
    }
  });

  return (
    <group position={[-13.0, 0, -2.5]}>
      {/* Foundation Stone Deck */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.24, 4.4]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>
      {/* Wooden Plank Veranda */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[5.0, 0.04, 4.0]} />
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </mesh>

      {/* Main Kiosk Wall Backing */}
      <mesh position={[0, 1.4, -1.2]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 2.3, 1.4]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Iconic Curved Pokémon Center Red Roof */}
      <group position={[0, 2.65, -0.6]}>
        <mesh castShadow rotation={[0.22, 0, 0]}>
          <boxGeometry args={[5.2, 0.48, 2.8]} />
          <meshStandardMaterial color={isNight ? '#991b1b' : '#ef4444'} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* White Eaves Trim */}
        <mesh position={[0, -0.15, 1.4]}>
          <boxGeometry args={[5.3, 0.18, 0.2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
      </group>

      {/* Glowing Pokéball Crest Emblem on Awning */}
      <group position={[0, 2.65, 0.82]}>
        <mesh>
          <circleGeometry args={[0.45, 24]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.22, 0.01]}>
          <ringGeometry args={[0, 0.45, 24, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[0.14, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <pointLight color="#fca5a5" intensity={1.8} distance={3.5} />
      </group>

      {/* Nurse Joy's Service Healing Console */}
      <group position={[0, 0.65, 0.3]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.76, 0.85]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
        </mesh>
        {/* Diagnostic Restorative Pad */}
        <mesh position={[0, 0.39, 0]}>
          <boxGeometry args={[2.0, 0.02, 0.5]} />
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.8} />
        </mesh>
        {/* 6 Miniature Glowing Restorative Pokéballs */}
        <group ref={healingBallsRef} position={[0, 0.48, 0]}>
          {[-0.65, -0.38, -0.12, 0.14, 0.4, 0.67].map((x, idx) => (
            <mesh key={idx} position={[x, 0, 0]}>
              <sphereGeometry args={[0.075, 12, 12]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#38bdf8"
                emissiveIntensity={2.0}
              />
            </mesh>
          ))}
        </group>
        <pointLight position={[0, 0.8, 0]} color="#38bdf8" intensity={2.0} distance={3.0} />
      </group>

      {/* Cedar Support Pillars */}
      {[-2.2, 2.2].map((x, idx) => (
        <mesh key={idx} position={[x, 1.4, 0.8]} castShadow>
          <cylinderGeometry args={[0.1, 0.11, 2.3, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
      ))}

      {/* Rest Patio: Parasol Umbrella & Cafe Table */}
      <group position={[2.0, 0.26, 2.0]}>
        {/* Wooden Cafe Table */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.06, 16]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        {/* Striped Parasol Umbrella */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[1.25, 0.55, 12]} />
          <meshStandardMaterial color="#ef4444" roughness={0.5} />
        </mesh>
      </group>

      {/* Sign Label */}
      <Html position={[0, 2.2, 0.85]} center distanceFactor={6} className="pointer-events-none select-none">
        <div className="bg-red-600 text-white font-pixel text-[8px] px-2.5 py-0.5 rounded-full border border-white shadow-lg whitespace-nowrap">
          POKÉMON CENTER REST KIOSK
        </div>
      </Html>
    </group>
  );
}

// Official Pokémon Berry Tree with Hanging Animated Berries (Oran & Pecha)
function BerryTree({
  position,
  berryType,
}: {
  position: [number, number, number];
  berryType: 'oran' | 'pecha';
}) {
  const berriesRef = useRef<THREE.Group>(null);
  const isOran = berryType === 'oran';
  const berryColor = isOran ? '#2563eb' : '#ec4899';
  const emissiveColor = isOran ? '#3b82f6' : '#f472b6';

  useFrame(({ clock }) => {
    if (berriesRef.current) {
      const t = clock.elapsedTime;
      berriesRef.current.children.forEach((berry, i) => {
        berry.rotation.z = Math.sin(t * 2.8 + i * 1.3) * 0.16;
      });
    }
  });

  return (
    <group position={position}>
      {/* Thick Gnarled Trunk */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.56, 2.2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>

      {/* Round Leafy Berry Tree Canopies */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <sphereGeometry args={[1.6, 12, 12]} />
        <meshStandardMaterial color={isOran ? '#15803d' : '#16a34a'} roughness={0.7} />
      </mesh>
      <mesh position={[0.5, 3.2, 0.2]} castShadow>
        <sphereGeometry args={[1.3, 12, 12]} />
        <meshStandardMaterial color={isOran ? '#16a34a' : '#22c55e'} roughness={0.7} />
      </mesh>
      <mesh position={[-0.45, 3.0, -0.3]} castShadow>
        <sphereGeometry args={[1.2, 12, 12]} />
        <meshStandardMaterial color={isOran ? '#14532d' : '#15803d'} roughness={0.7} />
      </mesh>

      {/* Hanging Plump Berries */}
      <group ref={berriesRef}>
        {[
          [0.85, 2.0, 0.85],
          [-0.9, 1.9, 0.75],
          [0.1, 1.8, 1.25],
          [-0.75, 2.1, -0.85],
          [0.8, 2.05, -0.75],
        ].map((bPos, idx) => (
          <group key={idx} position={bPos as [number, number, number]}>
            {/* Stem */}
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
              <meshStandardMaterial color="#166534" />
            </mesh>
            {/* Berry Fruit Body */}
            <mesh position={[0, 0, 0]} castShadow>
              <sphereGeometry args={[0.19, 12, 12]} />
              <meshStandardMaterial
                color={berryColor}
                emissive={emissiveColor}
                emissiveIntensity={0.65}
                roughness={0.25}
              />
            </mesh>
            {/* Small Green Leaf on Stem */}
            <mesh position={[0.06, 0.1, 0]} rotation={[0, 0, 0.5]}>
              <circleGeometry args={[0.07, 6]} />
              <meshBasicMaterial color="#4ade80" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Berry Label Badge */}
      <Html position={[0, 3.9, 0]} center distanceFactor={7} className="pointer-events-none select-none">
        <div
          className="text-white font-pixel text-[8px] px-2.5 py-0.5 rounded-full border shadow-lg whitespace-nowrap"
          style={{ background: isOran ? '#1e40af' : '#be185d', borderColor: '#fde047' }}
        >
          {isOran ? '🫐 ORAN BERRY TREE' : '🍑 PECHA BERRY TREE'}
        </div>
      </Html>
    </group>
  );
}

// Route 1 Carved Timber Entrance Archway spanning the southern path
function RouteEntranceArch() {
  return (
    <group position={[-0.8, 0, 18.0]}>
      {/* Left Timber Pillar */}
      <mesh position={[-3.2, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 4.0, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      {/* Right Timber Pillar */}
      <mesh position={[3.2, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 4.0, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      {/* Massive Crossbeam */}
      <mesh position={[0, 3.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 7.2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      {/* Timber Angle Braces */}
      <mesh position={[-2.4, 3.3, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.18, 1.4, 0.18]} />
        <meshStandardMaterial color="#581c87" />
      </mesh>
      <mesh position={[2.4, 3.3, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.18, 1.4, 0.18]} />
        <meshStandardMaterial color="#581c87" />
      </mesh>

      {/* Hanging Brass Route Lanterns */}
      {[-2.8, 2.8].map((x, idx) => (
        <group key={idx} position={[x, 3.2, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={1.8} />
          </mesh>
          <pointLight color="#fef08a" intensity={1.6} distance={4.5} />
        </group>
      ))}

      {/* Carved Wooden Route Signboard */}
      <mesh position={[0, 3.8, 0.26]} castShadow>
        <boxGeometry args={[3.8, 0.95, 0.1]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>
      <Html position={[0, 3.8, 0.35]} center distanceFactor={7} className="pointer-events-none select-none">
        <div className="bg-[#78350f] text-white font-pixel px-4 py-1.5 rounded-lg border-2 border-[#fef08a] shadow-2xl flex flex-col items-center">
          <div className="text-[10px] font-black tracking-widest text-[#fef08a] flex items-center gap-1.5">
            <span>🌿</span> ROUTE 1 <span>🌿</span>
          </div>
          <div className="text-[7px] text-amber-200 opacity-90 mt-0.5">
            Pallet Town ⬌ Viridian City
          </div>
        </div>
      </Html>
    </group>
  );
}

// Dedicated Azure Lake Sanctuary (East Route 1 Lake where Squirtle swims peacefully)
function AzureLake() {
  const waterRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (waterRef.current) {
      waterRef.current.position.y = 0.038 + Math.sin(t * 1.8) * 0.009;
    }
    if (rippleRef.current) {
      rippleRef.current.children.forEach((c, idx) => {
        const ph = (t * 0.8 + idx * 0.9) % 2.6;
        const scale = 0.5 + ph * 1.4;
        c.scale.set(scale, scale, 1);
        const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = Math.max(0, 0.7 - ph / 2.6);
      });
    }
  });

  return (
    <group position={[14.0, 0, 0]}>
      {/* Sandy & Pebble Lakebed Shoreline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[7.2, 40]} />
        <meshStandardMaterial color="#d4a373" roughness={0.92} />
      </mesh>

      {/* Clear Shimmering Azure Lake Water Surface */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.038, 0]} receiveShadow>
        <circleGeometry args={[6.4, 48]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.06}
          metalness={0.22}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Shoreline Rounded River Boulders */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r = 6.4 + (i % 3) * 0.3;
        const s = 0.22 + (i % 4) * 0.09;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.08, Math.sin(a) * r]} castShadow>
            <sphereGeometry args={[s, 8, 8]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} />
          </mesh>
        );
      })}

      {/* Water Lilies with Lotus Blossoms */}
      {[
        [-1.8, 0.05, 1.2],
        [2.2, 0.05, -1.8],
        [0.8, 0.05, 2.8],
        [-2.5, 0.05, -2.0],
        [1.5, 0.05, 1.5],
      ].map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          <mesh rotation={[-Math.PI / 2, 0, idx * 1.2]}>
            <circleGeometry args={[0.38, 16]} />
            <meshStandardMaterial color="#166534" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.12, 0.22, 6]} />
            <meshBasicMaterial color={idx % 2 === 0 ? '#f472b6' : '#ffffff'} />
          </mesh>
        </group>
      ))}

      {/* Wooden Observation Pier on West Edge */}
      <group position={[-4.8, 0.1, 0]}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.14, 1.8]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>
        {[-1.2, 1.2].map((x, xi) => (
          <mesh key={xi} position={[x, -0.1, 0.7]} castShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.7, 8]} />
            <meshStandardMaterial color="#451a03" />
          </mesh>
        ))}
      </group>

      {/* Lake Signboard */}
      <Html position={[-4.8, 1.4, 0]} center distanceFactor={6} className="pointer-events-none select-none">
        <div className="bg-sky-900/90 text-sky-200 font-pixel text-[8px] px-2.5 py-0.5 rounded-full border border-sky-400 shadow-xl whitespace-nowrap">
          💧 AZURE LAKE SANCTUARY
        </div>
      </Html>
    </group>
  );
}

// Animated Fluttering Route Butterflies (Butterfree / Beautifly)
function FlutteringButterflies() {
  const groupRef = useRef<THREE.Group>(null);
  const butterflies = useMemo(
    () => [
      { base: [6.5, 1.4, 4.0], color: '#38bdf8', wingColor: '#c084fc', speed: 1.2, rX: 2.2, rZ: 1.8 },
      { base: [7.5, 1.6, 6.0], color: '#fbbf24', wingColor: '#f87171', speed: 1.5, rX: 1.8, rZ: 2.2 },
      { base: [-6.0, 1.5, -3.5], color: '#34d399', wingColor: '#60a5fa', speed: 1.1, rX: 2.0, rZ: 1.5 },
      { base: [-7.0, 1.7, -5.0], color: '#f472b6', wingColor: '#fef08a', speed: 1.4, rX: 1.7, rZ: 2.0 },
      { base: [0.5, 1.5, -7.5], color: '#a78bfa', wingColor: '#38bdf8', speed: 1.3, rX: 1.9, rZ: 1.6 },
      { base: [-1.0, 1.8, 8.5], color: '#fde047', wingColor: '#fb923c', speed: 1.6, rX: 2.1, rZ: 1.7 },
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((bGroup, i) => {
      const b = butterflies[i];
      if (!b) return;
      const angle = t * b.speed;
      bGroup.position.x = b.base[0] + Math.sin(angle) * b.rX;
      bGroup.position.z = b.base[2] + Math.sin(angle * 2) * b.rZ;
      bGroup.position.y = b.base[1] + Math.cos(angle * 1.5) * 0.45;
      bGroup.rotation.y = angle + Math.PI / 2;

      const leftWing = bGroup.children[1];
      const rightWing = bGroup.children[2];
      const flap = Math.sin(t * 22.0 + i) * 0.55;
      if (leftWing) leftWing.rotation.y = flap;
      if (rightWing) rightWing.rotation.y = -flap;
    });
  });

  return (
    <group ref={groupRef}>
      {butterflies.map((b, idx) => (
        <group key={idx} position={b.base as [number, number, number]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.2]}>
            <circleGeometry args={[0.1, 6]} />
            <meshBasicMaterial color={b.wingColor} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.08, 0, 0]} rotation={[0, 0, -0.2]}>
            <circleGeometry args={[0.1, 6]} />
            <meshBasicMaterial color={b.color} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Campsite Campfire (Relocated to far west campsite at [-12.5, 0, 7.5], completely isolated from Charmeleon!)
function CampsiteHearth() {
  const fireRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (fireRef.current) {
      const t = clock.elapsedTime;
      fireRef.current.scale.set(
        1.0 + Math.sin(t * 18) * 0.15,
        1.0 + Math.cos(t * 22) * 0.25,
        1.0 + Math.sin(t * 16) * 0.15
      );
    }
  });

  return (
    <group position={[-12.5, 0, 7.5]}>
      {/* Stone Ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55]}>
            <sphereGeometry args={[0.12, 6, 6]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Log Seats */}
      {[-1.2, 1.2].map((x, idx) => (
        <mesh key={idx} position={[x, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 1.2, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
      ))}
      {/* Glowing Coals */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.42, 0.45, 0.08, 12]} />
        <meshStandardMaterial color="#7f1d1d" emissive="#ea580c" emissiveIntensity={1.2} />
      </mesh>
      {/* Flickering Campfire Flame */}
      <group ref={fireRef} position={[0, 0.18, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.15, 0.42, 6]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <coneGeometry args={[0.22, 0.55, 6]} />
          <meshStandardMaterial color="#f97316" emissive="#dc2626" emissiveIntensity={1.8} transparent opacity={0.85} />
        </mesh>
      </group>
      <pointLight color="#f97316" intensity={2.2} distance={3.8} />
      <Html position={[0, 1.4, 0]} center distanceFactor={5} className="pointer-events-none select-none">
        <div className="bg-amber-900/90 text-amber-200 font-pixel text-[8px] px-2 py-0.5 rounded-full border border-amber-500 shadow whitespace-nowrap">
          🔥 TRAINER REST CAMPSITE
        </div>
      </Html>
    </group>
  );
}

// Sleeping Snorlax Model for the Pokémon Sleep Sanctuary (Scaled to canonical Pokédex 2.1m height)
function SleepingSnorlax() {
  const { scene } = useGLTF('/models/143.glb', '/draco/gltf/');
  const snorlaxRef = useRef<THREE.Group>(null);

  const { clone: snorlaxClone, baseScale } = useMemo(() => {
    const clone = scene.clone(true);
    // 143.glb raw vertex bounds are ~26 x 14 x 20.3 units (Z is up in model space)
    // Canonical Pokédex height is 2.1m. Scale factor: 2.3 / 20.289 = ~0.113
    const scaleFactor = 2.3 / 20.289;

    // Lie comfortably on his back with head towards the pillow (-Z in world) and belly facing up (+Y in world)
    clone.rotation.x = -Math.PI / 2;
    clone.rotation.y = 0;
    clone.rotation.z = 0;
    // Position torso and head centrally on the rug and pillow
    clone.position.set(0, 0.42, 1.15);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return { clone, baseScale: scaleFactor };
  }, [scene]);

  // Gentle sleeping breathing rhythm
  useFrame(({ clock }) => {
    if (snorlaxRef.current) {
      const t = clock.elapsedTime;
      const breath = 1.0 + Math.sin(t * 1.6) * 0.035;
      snorlaxRef.current.scale.set(
        baseScale * breath,
        baseScale * breath,
        baseScale * (2 - breath)
      );
    }
  });

  return (
    <group ref={snorlaxRef}>
      <primitive object={snorlaxClone} />
    </group>
  );
}

// Floating Animated "Zzz" Particles for the Sleeping Snorlax
function SleepingZzzVFX() {
  const zzzRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (zzzRef.current) {
      const t = clock.elapsedTime;
      zzzRef.current.children.forEach((child, i) => {
        const offset = (t * 0.8 + i * 0.9) % 3.0;
        child.position.y = 0.8 + offset * 0.65;
        child.position.x = 0.25 + Math.sin(offset * 2.2) * 0.22;
        child.scale.setScalar(0.7 + offset * 0.35);
      });
    }
  });

  return (
    <group ref={zzzRef} position={[0.2, 0.8, -0.2]}>
      {[0, 1, 2].map((i) => (
        <Html key={i} position={[0, 0, 0]} center distanceFactor={5} className="pointer-events-none select-none">
          <div className="text-sky-300 font-pixel font-black text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-90">
            Z
          </div>
        </Html>
      ))}
    </group>
  );
}

// Official Pokemon Sleep Sanctuary (Central Blue Wave Picnic Rug with Sleeping Giant Snorlax & Pillow)
function PokemonSleepSanctuary() {
  return (
    <group position={[0, 0, -1.8]}>
      {/* 1. Pokemon Sleep Round Cyan Rug Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[3.4, 48]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.7} />
      </mesh>
      {/* Scalloped White Border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
        <ringGeometry args={[3.32, 3.48, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Wavy Cyan/Blue Sleep Rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, 0]}>
        <ringGeometry args={[2.3, 2.48, 48]} />
        <meshBasicMaterial color="#bae6fd" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, 0]}>
        <ringGeometry args={[1.4, 1.55, 48]} />
        <meshBasicMaterial color="#e0f2fe" />
      </mesh>

      {/* Plush Cream Head Pillow for Snorlax */}
      <mesh position={[0, 0.14, -1.5]} castShadow receiveShadow rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.9, 0.22, 1.1]} />
        <meshStandardMaterial color="#fef9c3" roughness={0.9} />
      </mesh>

      {/* Sleeping Snorlax 3D Model */}
      <Suspense fallback={null}>
        <SleepingSnorlax />
      </Suspense>

      {/* Floating Animated Zzz */}
      <SleepingZzzVFX />

      {/* Surrounding Wildflowers & Clover Tufts (like Pokemon Sleep) */}
      {[
        [-2.4, 0.03, 1.8, '#f472b6'],
        [2.3, 0.03, 1.9, '#facc15'],
        [-2.8, 0.03, -1.2, '#ffffff'],
        [2.6, 0.03, -1.4, '#38bdf8'],
        [0, 0.03, 2.7, '#fb923c'],
      ].map(([x, y, z, color], idx) => (
        <group key={idx} position={[Number(x), Number(y), Number(z)]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.18, 8]} />
            <meshBasicMaterial color={String(color)} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.07, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

            {/* Label Badge */}
      <Html position={[0, 2.2, 0]} center distanceFactor={6} className="pointer-events-none select-none">
        <div className="bg-sky-600/95 text-white font-pixel text-[8px] px-3 py-1 rounded-full border-2 border-sky-300 shadow-2xl flex items-center gap-1.5 whitespace-nowrap">
          <span>💤</span> POKÉMON SLEEP SANCTUARY <span>💤</span>
        </div>
      </Html>
    </group>
  );
}

// Proximity-Reactive Tall Grass Meadow with Dynamic Blade Deflection & Wildflowers
function InteractiveTallGrass({
  position,
  radius = 3.6,
  pokemonPositions,
}: {
  position: [number, number, number];
  radius?: number;
  pokemonPositions: Array<[number, number, number]>;
}) {
  const bladesGroupRef = useRef<THREE.Group>(null);

  // Generate clumps and flowers in a natural circular distribution (NO hard rectangular box edges!)
  const { clumps, flowers } = useMemo(() => {
    const cl = [];
    const count = 48;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (radius - 0.4);
      cl.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        worldX: position[0] + Math.cos(a) * r,
        worldZ: position[2] + Math.sin(a) * r,
        scale: 0.75 + Math.random() * 0.45,
        rotation: Math.random() * Math.PI,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const fl = [];
    const colors = ['#f472b6', '#facc15', '#ffffff', '#38bdf8', '#fb923c'];
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (radius - 0.5);
      fl.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        color: colors[i % colors.length],
        scale: 0.8 + Math.random() * 0.4,
      });
    }
    return { clumps: cl, flowers: fl };
  }, [position, radius]);

  // Real-time blade deflection and rustling when Pokémon walk through!
  useFrame(({ clock }) => {
    if (!bladesGroupRef.current) return;
    const t = clock.elapsedTime;
    bladesGroupRef.current.children.forEach((child, idx) => {
      const clump = clumps[idx];
      if (!clump) return;

      // Check proximity to all active Pokémon
      let nearestDist = 999;
      let dx = 0;
      let dz = 0;
      for (const pPos of pokemonPositions) {
        const dX = clump.worldX - pPos[0];
        const dZ = clump.worldZ - pPos[2];
        const dist = Math.hypot(dX, dZ);
        if (dist < nearestDist) {
          nearestDist = dist;
          dx = dX;
          dz = dZ;
        }
      }

      if (nearestDist < 1.35) {
        // Pokémon walking through! Blade parts, deflects outward, and rustles vigorously!
        const push = (1.35 - nearestDist) * 0.55;
        const rustle = Math.sin(t * 14.0 + clump.phase) * 0.22;
        child.rotation.z = (dx / (nearestDist + 0.01)) * push + rustle;
        child.rotation.x = (dz / (nearestDist + 0.01)) * push;
      } else {
        // Gentle peaceful route breeze
        child.rotation.z = Math.sin(t * 2.2 + clump.phase) * 0.12;
        child.rotation.x = Math.cos(t * 1.8 + clump.phase) * 0.06;
      }
    });
  });

  return (
    <group position={position}>
      {/* Soft circular meadow patch that seamlessly blends into terrain (NO hard box edges!) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial color="#15803d" roughness={0.85} />
      </mesh>

      {/* Swaying & Deflecting Grass Blade Clumps */}
      <group ref={bladesGroupRef}>
        {clumps.map((c, i) => (
          <group key={i} position={[c.x, 0.04, c.z]} scale={c.scale}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <coneGeometry args={[0.13, 0.88, 4]} />
              <meshStandardMaterial color="#22c55e" roughness={0.65} />
            </mesh>
            <mesh position={[0.1, 0.32, 0.06]} rotation={[0.08, 0, -0.22]}>
              <coneGeometry args={[0.11, 0.72, 4]} />
              <meshStandardMaterial color="#16a34a" roughness={0.65} />
            </mesh>
            <mesh position={[-0.09, 0.36, -0.05]} rotation={[-0.08, 0, 0.22]}>
              <coneGeometry args={[0.11, 0.76, 4]} />
              <meshStandardMaterial color="#4ade80" roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Wildflowers Blooming in the Grass */}
      {flowers.map((fl, i) => (
        <group key={i} position={[fl.x, 0.18, fl.z]} scale={fl.scale}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.11, 6]} />
            <meshBasicMaterial color={fl.color} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.04, 6]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Split-Rail Wooden Route Fences
function RouteFences() {
  const posts = [
    [-6.8, 0, -1.0],
    [-4.8, 0, -1.0],
    [-2.8, 0, -1.0],
    [5.0, 0, 1.8],
    [7.0, 0, 1.8],
    [9.0, 0, 1.8],
    [11.0, 0, 1.8],
  ] as Array<[number, number, number]>;

  return (
    <group>
      {/* Fence Posts */}
      {posts.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.0, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.05, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#92400e" />
          </mesh>
        </group>
      ))}

      {/* Horizontal Split Rails (Left Section) */}
      <mesh position={[-4.8, 0.65, -1.0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 4.2, 6]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[-4.8, 0.35, -1.0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 4.2, 6]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>

      {/* Horizontal Split Rails (Right Section) */}
      <mesh position={[8.0, 0.65, 1.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 6.2, 6]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[8.0, 0.35, 1.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 6.2, 6]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
    </group>
  );
}

// Official Route 1 Wooden Signpost
function RouteSignpost() {
  return (
    <group position={[-8.2, 0, -5.5]}>
      {/* Wooden Post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 1.4, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </mesh>
      {/* Wooden Signboard */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[1.3, 0.65, 0.08]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>
      {/* Red Roof Trim */}
      <mesh position={[0, 1.62, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.16]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Sign Text Label */}
      <Html position={[0, 1.25, 0.06]} center transform distanceFactor={5} className="pointer-events-none select-none">
        <div className="bg-[#b45309] text-white font-pixel text-[8px] px-2 py-0.5 rounded border border-[#fef08a] whitespace-nowrap shadow">
          ROUTE 1
        </div>
      </Html>
    </group>
  );
}

// 3D Item Pokéball resting beside the route tall grass
function ItemPokeball() {
  const ballRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ballRef.current) {
      ballRef.current.position.y = 0.28 + Math.sin(clock.elapsedTime * 2.5) * 0.04;
    }
  });

  return (
    <group ref={ballRef} position={[3.2, 0.28, 2.2]}>
      {/* Red Top Half */}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* White Bottom Half */}
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Center Black Ring */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.225, 0.225, 0.03, 16]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      {/* Center Button */}
      <mesh position={[0, 0.08, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight color="#fca5a5" intensity={0.8} distance={2.5} />
    </group>
  );
}

// Official Pokémon Battle Arena (League Regulation Battlefield Ring)
function PokemonBattleArena({ isNight }: { isNight: boolean }) {
  return (
    <group position={[0.5, 0.015, -20.0]}>
      {/* Outer Stadium Ground Turf */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9.5, 36]} />
        <meshStandardMaterial color={isNight ? '#064e3b' : '#15803d'} roughness={0.75} />
      </mesh>
      {/* Stone Perimeter Border Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[9.2, 9.6, 36]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>
      {/* Regulation Chalk Arena Outer Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[7.2, 7.36, 48]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Center Pokéball Court Chalk Circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[1.8, 1.95, 36]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Center Pokéball Inner Dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Dividing Center Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <planeGeometry args={[14.4, 0.16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Red Trainer Battle Box */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 5.5]}>
        <planeGeometry args={[2.2, 1.4]} />
        <meshStandardMaterial color="#ef4444" roughness={0.5} />
      </mesh>
      {/* Blue / Cyan Trainer Battle Box */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, -5.5]}>
        <planeGeometry args={[0.2, 1.4]} />
        <meshStandardMaterial color="#0284c7" roughness={0.5} />
      </mesh>
      {/* 4 Corner Floodlight Posts */}
      {[
        [-7.5, 0, -6.5],
        [7.5, 0, -6.5],
        [-7.5, 0, 6.5],
        [7.5, 0, 6.5],
      ].map((p, idx) => (
        <group key={idx} position={p as [number, number, number]}>
          <mesh position={[0, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 4.4, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#facc15"
              emissiveIntensity={isNight ? 2.8 : 1.2}
            />
          </mesh>
          <pointLight
            position={[0, 4.4, 0]}
            color="#fef08a"
            intensity={isNight ? 2.5 : 1.0}
            distance={10}
          />
        </group>
      ))}
      {/* Arena Signpost */}
      <Html position={[0, 1.8, 8.2]} center transform distanceFactor={7} className="pointer-events-none select-none">
        <div className="bg-emerald-800 text-white font-pixel text-[8px] px-3 py-1 rounded-full border-2 border-emerald-300 shadow-xl tracking-wider flex items-center gap-1.5 whitespace-nowrap">
          <span>⚔️</span> ROUTE 1 BATTLE ARENA <span>⚔️</span>
        </div>
      </Html>
    </group>
  );
}

// Official Pokémon GO Style Interactive Poké Stop Beacon
function PokeStopStation() {
  const discRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (discRef.current) {
      discRef.current.rotation.y = t * 1.5;
      discRef.current.position.y = 1.6 + Math.sin(t * 2.0) * 0.08;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.8;
      const s = 1.0 + Math.sin(t * 3.0) * 0.08;
      ringRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={[-5.8, 0, 11.5]}>
      {/* Base Platform */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[0.85, 1.0, 0.16, 24]} />
        <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.82, 24]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      {/* Slim Metallic Column */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 1.4, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Floating Spinning Poké Stop Disc */}
      <group ref={discRef} position={[0, 1.6, 0]}>
        {/* Outer Circular Rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.65, 0.06, 12, 32]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.4} metalness={0.7} />
        </mesh>
        {/* Center Pokéball Photo Medallion */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.58, 24]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Core Pokéball Relief */}
        <mesh position={[0, 0, 0.02]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.2, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      {/* Orbiting Pulsing Energy Ring */}
      <mesh ref={ringRef} position={[0, 1.6, 0]} rotation={[0.4, 0, 0]}>
        <ringGeometry args={[0.85, 0.92, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} color="#38bdf8" intensity={2.6} distance={4.5} />
      {/* Label Badge */}
      <Html position={[0, 2.5, 0]} center transform distanceFactor={6} className="pointer-events-none select-none">
        <div className="bg-sky-600 text-white font-pixel text-[8px] px-2.5 py-0.5 rounded-full border border-sky-300 shadow-lg tracking-wider flex items-center gap-1 whitespace-nowrap">
          <span>📍</span> POKÉ STOP
        </div>
      </Html>
    </group>
  );
}

// Official Classic Pokémon Route Jumping Ledges with One-Way Jumping Arrows
function RouteJumpingLedges() {
  return (
    <group>
      {/* East Jumping Ledge (near Route 1 stream) */}
      <group position={[6.5, 0, 10.0]}>
        {/* Terraced Dirt Ridge */}
        <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
          <boxGeometry args={[5.5, 0.7, 1.4]} />
          <meshStandardMaterial color="#92400e" roughness={0.88} />
        </mesh>
        {/* Top Grass Strip */}
        <mesh position={[0, 0.71, 0]}>
          <boxGeometry args={[5.5, 0.04, 1.4]} />
          <meshStandardMaterial color="#16a34a" roughness={0.75} />
        </mesh>
        {/* White Wooden Post-and-Rail Fence */}
        <mesh position={[0, 1.0, 0.55]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 5.4, 8]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {[-2.2, 0, 2.2].map((x, i) => (
          <mesh key={i} position={[x, 0.85, 0.55]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        ))}
        {/* Iconic Red/White Directional Jump Sign */}
        <Html position={[0, 1.35, 0.55]} center transform distanceFactor={6} className="pointer-events-none select-none">
          <div className="bg-amber-100 text-red-600 font-pixel text-[8px] px-2 py-0.5 rounded border border-red-500 shadow flex items-center gap-1 font-bold whitespace-nowrap">
            <span>▼</span> ONE-WAY JUMP <span>▼</span>
          </div>
        </Html>
      </group>
    </group>
  );
}

// Sweet Berry Bushes (Nanab with bananas, Razz with raspberries)
function BerryBush({
  position,
  type,
}: {
  position: [number, number, number];
  type: 'nanab' | 'razz';
}) {
  const isNanab = type === 'nanab';
  const fruitColor = isNanab ? '#facc15' : '#dc2626';

  return (
    <group position={position}>
      {/* Bush Leaves Clump */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.85, 8, 8]} />
        <meshStandardMaterial color={isNanab ? '#15803d' : '#166534'} roughness={0.7} />
      </mesh>
      <mesh position={[0.3, 0.8, -0.1]} castShadow>
        <sphereGeometry args={[0.65, 8, 8]} />
        <meshStandardMaterial color="#16a34a" roughness={0.7} />
      </mesh>
      {/* Hanging Fruit Bunches */}
      {[
        [0.45, 0.65, 0.45],
        [-0.45, 0.55, 0.35],
        [0.1, 0.5, 0.65],
        [-0.2, 0.7, -0.45],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]} castShadow>
          <sphereGeometry args={[0.12, 6, 6]} />
          <meshStandardMaterial color={fruitColor} emissive={fruitColor} emissiveIntensity={0.6} />
        </mesh>
      ))}
      <Html position={[0, 1.45, 0]} center transform distanceFactor={6} className="pointer-events-none select-none">
        <div
          className="text-white font-pixel text-[7px] px-2 py-0.5 rounded-full border shadow whitespace-nowrap"
          style={{ background: isNanab ? '#a16207' : '#991b1b', borderColor: '#fef08a' }}
        >
          {isNanab ? '🍌 NANAB BUSH' : '🍓 RAZZ BUSH'}
        </div>
      </Html>
    </group>
  );
}

// Route Trees lining the perimeter with deep scenic layers
function RouteTrees() {
  const trees = [
    // Near & midground route trees
    [-13.0, 0, -6.5, 1.2],
    [-11.5, 0.24, -12.0, 1.3],
    [-5.0, 0.24, -14.5, 1.4],
    [4.0, 0, -14.0, 1.3],
    [12.5, 0, -9.0, 1.2],
    [14.0, 0, 2.5, 1.3],
    [11.5, 0, 10.5, 1.2],
    [-12.0, 0, 8.5, 1.3],
    // Distant horizon trees fading into the mist
    [-24.0, 1.2, -28.0, 1.8],
    [-18.0, 1.5, -34.0, 1.9],
    [18.0, 1.2, -32.0, 1.8],
    [24.0, 1.4, -26.0, 1.9],
  ] as Array<[number, number, number, number]>;

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t[0], t[1], t[2]]} scale={t[3]}>
          {/* Trunk */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.45, 2.0, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.85} />
          </mesh>
          {/* Foliage Cones */}
          <mesh position={[0, 2.6, 0]} castShadow>
            <coneGeometry args={[1.6, 2.2, 7]} />
            <meshStandardMaterial color="#16a34a" roughness={0.65} />
          </mesh>
          <mesh position={[0, 3.6, 0]} castShadow>
            <coneGeometry args={[1.2, 1.8, 7]} />
            <meshStandardMaterial color="#22c55e" roughness={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Stylized Low-Poly Clouds Drifting Slowly Across the Sky
function DriftingClouds() {
  const cloudsRef = useRef<THREE.Group>(null);
  const cloudPositions = useMemo(
    () => [
      [-25, 24, -18, 1.3],
      [12, 28, -25, 1.6],
      [-8, 26, 15, 1.2],
      [28, 25, 8, 1.4],
      [-32, 27, 2, 1.5],
    ],
    []
  );

  useFrame((_, delta) => {
    if (!cloudsRef.current) return;
    cloudsRef.current.children.forEach((cloud) => {
      cloud.position.x += delta * 0.8;
      if (cloud.position.x > 60) {
        cloud.position.x = -60;
      }
    });
  });

  return (
    <group ref={cloudsRef}>
      {cloudPositions.map((c, i) => (
        <group key={i} position={[c[0], c[1], c[2]]} scale={c[3]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[2.5, 8, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.85} />
          </mesh>
          <mesh position={[1.8, -0.3, 0]}>
            <sphereGeometry args={[1.8, 8, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.85} />
          </mesh>
          <mesh position={[-1.7, -0.4, 0]}>
            <sphereGeometry args={[1.6, 8, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Ambient Breeze & Weather Particles (Day: Golden Pollen / Night: Fireflies)
function RouteAtmosphere({ isNight }: { isNight: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 50;
  const [positions, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 18.0;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = 0.5 + Math.random() * 3.5;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [pos, ph];
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      posAttr.setY(i, 0.6 + Math.sin(t * 1.5 + phases[i]) * 0.5 + (phases[i] % 1.8));
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={isNight ? 0.24 : 0.16}
        color={isNight ? '#a3e635' : '#fef08a'}
        transparent
        opacity={isNight ? 0.95 : 0.75}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Smooth Camera Controller that glides seamlessly into encounter view and handles view presets
function CameraController({
  selectedPos,
  isOverview,
  cameraPreset,
  controlsRef,
}: {
  selectedPos: [number, number, number] | null;
  isOverview: boolean;
  cameraPreset: 'default' | 'sleep' | 'drone' | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  // Instant or smooth transition on preset buttons
  useEffect(() => {
    if (!controlsRef.current) return;
    if (cameraPreset === 'sleep') {
      // Top-Down Pokemon Sleep View directly over Snorlax and companions
      camera.position.set(0, 18, -1.8);
      controlsRef.current.target.set(0, 0, -1.8);
      controlsRef.current.update();
    } else if (cameraPreset === 'drone') {
      // Wide panoramic Drone View
      camera.position.set(0, 26, 28);
      controlsRef.current.target.set(0, 0, -2);
      controlsRef.current.update();
    } else if (cameraPreset === 'default') {
      // Standard isometric Route 1 view
      camera.position.set(0, 12, 18);
      controlsRef.current.target.set(0, 0.4, 0);
      controlsRef.current.update();
    }
  }, [cameraPreset, camera, controlsRef]);

  useFrame((_, delta) => {
    if (selectedPos && !isOverview) {
      // Zoom into clean 1-on-1 encounter view with cinematic framing
      const targetCam = new THREE.Vector3(
        selectedPos[0] - 1.1,
        selectedPos[1] + 1.8,
        selectedPos[2] + 4.8
      );
      camera.position.lerp(targetCam, delta * 4.2);
    }
    // When isOverview is true, DO NOT forcefully lerp camera.position! User has complete freedom to rotate, zoom, and pan!
  });

  return null;
}

// Route 3D Scene Wrapper
function RouteScene({
  pokemonList,
  selectedCategory,
  onSelectCategory,
  isNight,
  isOverview,
  recentlyFedId,
  cameraPreset,
}: {
  pokemonList: UserPokemon[];
  selectedCategory: AppCategory | null;
  onSelectCategory: (cat: AppCategory) => void;
  isNight: boolean;
  isOverview: boolean;
  recentlyFedId: string | null;
  cameraPreset: 'default' | 'sleep' | 'drone' | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const pokemonMap = useMemo(() => {
    const map = new Map<string, UserPokemon>();
    pokemonList.forEach((p) => map.set(p.category_id, p));
    return map;
  }, [pokemonList]);

  const activeCategories = useMemo(() => APP_CATEGORIES.slice(0, 12), []);

  // Find position of selected Pokemon
  const selectedIndex = selectedCategory ? activeCategories.findIndex((c) => c.id === selectedCategory.id) : -1;
  const selectedPos = selectedIndex >= 0 ? ROUTE_POSITIONS[selectedIndex] : null;

  useFrame((_, delta) => {
    if (controlsRef.current) {
      if (selectedPos && !isOverview) {
        // Point camera directly at selected Pokemon with comfortable headroom
        const targetLook = new THREE.Vector3(selectedPos[0], selectedPos[1] + 0.9, selectedPos[2]);
        controlsRef.current.target.lerp(targetLook, delta * 4.8);
        controlsRef.current.update();
      }
      // When isOverview is true, DO NOT forcefully lerp controlsRef.current.target back to default every frame!
    }
  });

  const skyColor = isNight ? '#0b1324' : '#7dd3fc';

  return (
    <>
      <CameraController
        selectedPos={selectedPos}
        isOverview={isOverview}
        cameraPreset={cameraPreset}
        controlsRef={controlsRef}
      />

      {/* Atmospheric Fog that seamlessly blends infinite terrain into the skybox */}
      <fog attach="fog" args={[skyColor, 32, 105]} />

      {/* Expansive Anime Sky Dome */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[140, 32, 32]} />
        <meshBasicMaterial
          color={skyColor}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Vibrant Pokemon Route Lighting */}
      <hemisphereLight
        args={[
          isNight ? '#1e1b4b' : '#bae6fd',
          isNight ? '#064e3b' : '#86efac',
          isNight ? 0.7 : 1.4,
        ]}
      />
      <ambientLight intensity={isNight ? 0.45 : 0.85} />
      <directionalLight
        position={[16, 26, 14]}
        intensity={isNight ? 0.5 : 1.8}
        color={isNight ? '#93c5fd' : '#fffbeb'}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Stars in Night Mode */}
      {isNight && (
        <Stars radius={60} depth={40} count={3000} factor={4} saturation={0.8} fade speed={1.2} />
      )}

      {/* Clouds Gliding in Sky */}
      {!isNight && <DriftingClouds />}

      {/* Route 1 Landscape, Winding Road, Fences & Signpost */}
      <RouteTerrain isNight={isNight} />
      <PokemonSleepSanctuary />
      <PokemonHealingStation isNight={isNight} />
      <BerryTree position={[11.0, 0, 6.5]} berryType="oran" />
      <BerryTree position={[-10.5, 0, 8.5]} berryType="pecha" />
      <BerryBush position={[12.5, 0, 3.5]} type="nanab" />
      <BerryBush position={[-9.0, 0, -9.0]} type="razz" />
      <PokemonBattleArena isNight={isNight} />
      <PokeStopStation />
      <RouteJumpingLedges />
      <RouteEntranceArch />
      <AzureLake />
      <FlutteringButterflies />
      <CampsiteHearth />
      <RouteFences />
      <RouteSignpost />
      <ItemPokeball />
      <RouteTrees />

      {/* Lush Reactive Tall Grass Meadows with Dynamic Blade Deflection */}
      <InteractiveTallGrass position={[5.2, 0, 4.0]} radius={3.6} pokemonPositions={ROUTE_POSITIONS} />
      <InteractiveTallGrass position={[4.0, 0, -11.0]} radius={3.4} pokemonPositions={ROUTE_POSITIONS} />
      <InteractiveTallGrass position={[-6.5, 0.05, -4.5]} radius={3.2} pokemonPositions={ROUTE_POSITIONS} />

      {/* Floating Breeze Particles & Fireflies */}
      <RouteAtmosphere isNight={isNight} />

      {/* 3D Pokemon Companions */}
      {activeCategories.map((cat, i) => {
        const isSelected = selectedCategory?.id === cat.id;

        // When a Pokemon is selected, HIDE all other Pokemon to avoid blocking the encounter!
        if (selectedCategory && !isSelected) {
          return null;
        }

        return (
          <Pokemon3D
            key={cat.id}
            category={cat}
            userPokemon={pokemonMap.get(cat.id)}
            position={ROUTE_POSITIONS[i] || [0, 0, 0]}
            isSelected={isSelected}
            isSleeping={isNight}
            isFedRecently={recentlyFedId === cat.id}
            onClick={() => onSelectCategory(cat)}
          />
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={45}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.4, 0]}
      />
    </>
  );
}

export default function WorldPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pokemonList, setPokemonList] = useState<UserPokemon[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isNight, setIsNight] = useState(false);
  const [isOverview, setIsOverview] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<'default' | 'sleep' | 'drone' | null>(null);

  // Berry Inventory
  const [berryInventory, setBerryInventory] = useState({
    razz: 4,
    nanab: 3,
    pinap: 2,
  });
  const [recentlyFedId, setRecentlyFedId] = useState<string | null>(null);
  const [berryToast, setBerryToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchUserPokemon(!!user);
      setPokemonList(data);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    setSoundEnabled(sounds.isEnabled());
    const unsub = subscribeToData(loadData);
    return () => unsub();
  }, [loadData]);

  const pokemonMap = useMemo(() => {
    const map = new Map<string, UserPokemon>();
    pokemonList.forEach((p) => map.set(p.category_id, p));
    return map;
  }, [pokemonList]);

  const handleSelectPokemon = (cat: AppCategory) => {
    setSelectedCategory(cat);
    setIsOverview(false);
    // Play authentic official cry
    const uPoke = pokemonMap.get(cat.id);
    const lvl = uPoke?.current_level ?? 1;
    const form = getCurrentEvolution(cat.pokemon, lvl);
    sounds.playPokemonCry(form.pokedexId, cat.pokemon.type);
  };

  const handleFeedBerry = async (berryType: 'razz' | 'nanab' | 'pinap') => {
    if (!selectedCategory || berryInventory[berryType] <= 0) return;

    sounds.playCoin();
    setTimeout(() => sounds.playExpGain(), 200);

    setRecentlyFedId(selectedCategory.id);
    setBerryInventory((prev) => ({
      ...prev,
      [berryType]: prev[berryType] - 1,
    }));

    const expMap = { razz: 25, nanab: 35, pinap: 50 };
    const berryNameMap = { razz: '🫐 Razz Berry', nanab: '🍌 Nanab Berry', pinap: '🍍 Pinap Berry' };
    const bonusExp = expMap[berryType];

    setBerryToast(`Fed ${berryNameMap[berryType]} to ${selectedCategory.pokemon.displayName}! (+${bonusExp} EXP)`);

    // Award real bonus EXP to pokemon in data store
    await addExpToPokemon(selectedCategory.id, bonusExp, !!user);
    loadData();

    setTimeout(() => setRecentlyFedId(null), 2500);
    setTimeout(() => setBerryToast(null), 3500);
  };

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  // Selected Pokemon details
  const selectedUserPoke = selectedCategory ? pokemonMap.get(selectedCategory.id) : null;
  const selectedExp = selectedUserPoke?.current_exp ?? 0;
  const selectedLevel = selectedUserPoke?.current_level ?? 1;
  const selectedForm = selectedCategory ? getCurrentEvolution(selectedCategory.pokemon, selectedLevel) : null;
  const selectedProgress = getLevelProgress(selectedExp);
  const selectedTypeStyle = selectedCategory ? (TYPE_COLORS[selectedCategory.pokemon.type] || TYPE_COLORS.normal) : null;
  const routeLore = selectedCategory ? ROUTE_LORE[selectedCategory.id] : null;

  return (
    <div className="min-h-screen bg-[#0b1324] text-white">
      <AppNavigation />

      <div className="main-content relative z-10 h-screen flex flex-col overflow-hidden">
        {/* Top HUD Header */}
        <header className="absolute top-0 left-0 right-0 z-20 page-header bg-gradient-to-b from-[#0b1324]/90 via-[#0b1324]/60 to-transparent pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pointer-events-auto">
          <div>
            <h1 className="page-title flex items-center gap-2 text-xl font-black">
              <span>{isNight ? '🌙' : '🛤️'}</span>
              <span>{isNight ? 'Route 1: Night Sanctuary' : 'Route 1: Trainer Route'}</span>
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {isNight
                ? 'Night on Route 1 — Pokémon are sleeping peacefully in the tall grass'
                : '3D Pokémon roaming Route 1. Drag to rotate 360°, scroll to zoom, tap any Pokémon to inspect!'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Camera Angle Presets */}
            <div className="flex items-center gap-1 glass-card p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setCameraPreset('sleep');
                  setTimeout(() => setCameraPreset(null), 150);
                }}
                className="px-2 py-1 rounded-lg text-xs font-bold hover:bg-white/10 text-sky-300 transition-all flex items-center gap-1"
                title="Top-down Pokémon Sleep View"
              >
                <span>😴</span> Sleep View
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setCameraPreset('drone');
                  setTimeout(() => setCameraPreset(null), 150);
                }}
                className="px-2 py-1 rounded-lg text-xs font-bold hover:bg-white/10 text-emerald-300 transition-all flex items-center gap-1"
                title="Panoramic Drone View"
              >
                <span>🦅</span> Drone
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setCameraPreset('default');
                  setTimeout(() => setCameraPreset(null), 150);
                }}
                className="px-2 py-1 rounded-lg text-xs font-bold hover:bg-white/10 text-amber-300 transition-all flex items-center gap-1"
                title="Reset Camera Angle"
              >
                <span>🔄</span> Reset
              </button>
            </div>

            {/* Day / Night Route Switcher */}
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setIsNight(!isNight);
              }}
              className="glass-card px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[var(--border-subtle)] hover:border-[var(--accent-gold)] transition-all"
            >
              <span>{isNight ? '☀️ Day Route' : '🌙 Night Sleep'}</span>
            </button>

            {/* Berry Basket Summary */}
            <div
              className="glass-card px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-pink-500/30 text-pink-300"
              title="Daily Treats for your Pokémon squad"
            >
              <span>🫐 {berryInventory.razz}</span>
              <span>🍌 {berryInventory.nanab}</span>
              <span>🍍 {berryInventory.pinap}</span>
            </div>

            {/* Return to Full Route View */}
            {!isOverview && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsOverview(true);
                  setSelectedCategory(null);
                }}
                className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1"
              >
                <span>🏠</span> Back to Route
              </button>
            )}

            <button
              type="button"
              onClick={toggleSound}
              className="glass-card px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-[var(--border-subtle)]"
            >
              <span>{soundEnabled ? '🔊 Sound: ON' : '🔇 Muted'}</span>
            </button>
          </div>
        </header>

        {/* Berry Feeding Notification Toast */}
        <AnimatePresence>
          {berryToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow-2xl border border-white/20 flex items-center gap-2"
            >
              <span>✨</span>
              <span>{berryToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D Canvas */}
        <div className="flex-1 relative cursor-grab active:cursor-grabbing">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="pokeball-spinner mx-auto mb-4" />
                  <p className="text-sm font-semibold text-[var(--accent-gold)]">
                    Loading Route 1 &amp; 3D Pokémon...
                  </p>
                </div>
              </div>
            }
          >
            <Canvas
              camera={{ position: [0, 11, 17], fov: 48 }}
              shadows
              className="w-full h-full"
              style={{ background: isNight ? '#0b1324' : '#7dd3fc' }}
            >
              <RouteScene
                pokemonList={pokemonList}
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectPokemon}
                isNight={isNight}
                isOverview={isOverview}
                recentlyFedId={recentlyFedId}
                cameraPreset={cameraPreset}
              />
            </Canvas>
          </Suspense>
        </div>

        {/* Pokemon Route Encounter Info Card (Right / Floating Modal) */}
        {/* Completely unobstructed because all other Pokemon are hidden during selection! */}
        <AnimatePresence>
          {selectedCategory && selectedForm && selectedTypeStyle && (
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="absolute top-20 right-4 md:right-8 z-50 w-88 max-w-[calc(100vw-2rem)] glass-card p-5 border-2 shadow-2xl backdrop-blur-2xl rounded-3xl"
              style={{
                borderColor: selectedCategory.color,
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(11, 19, 36, 0.99))',
                boxShadow: `0 20px 50px ${selectedCategory.color}40`,
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center relative p-2 shadow-inner"
                    style={{
                      background: `linear-gradient(135deg, ${selectedCategory.color}30, rgba(0,0,0,0.5))`,
                      border: `1.5px solid ${selectedCategory.color}70`,
                    }}
                  >
                    <Image
                      src={selectedForm.spriteUrl}
                      alt={selectedForm.name}
                      width={48}
                      height={48}
                      className="drop-shadow-md object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white flex items-center gap-1.5">
                      {selectedForm.name}
                      <span>{selectedCategory.icon}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase"
                        style={{
                          background: selectedTypeStyle.bg,
                          color: selectedTypeStyle.text,
                        }}
                      >
                        {selectedCategory.pokemon.type}
                      </span>
                      <span className="text-xs text-[var(--accent-gold)] font-black">
                        Lv. {selectedLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedCategory(null);
                    setIsOverview(true);
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-xs transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Route Lore & Spending Habit */}
              {routeLore && (
                <div
                  className="mt-3.5 p-3 rounded-2xl text-left border"
                  style={{
                    background: `${selectedCategory.color}15`,
                    borderColor: `${selectedCategory.color}40`,
                  }}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-1">
                    <span>🌾</span> Route 1 Companion Lore
                  </p>
                  <p className="text-xs text-white/90 font-medium mt-1 leading-snug">
                    {routeLore.style}
                  </p>
                  <p className="text-[10px] text-white/50 mt-1">
                    App: {routeLore.habit}
                  </p>
                </div>
              )}

              {/* EXP Progress Bar */}
              <div className="mt-3.5">
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-[var(--text-secondary)]">EXP Progress</span>
                  <span className="text-[var(--exp-bar)]">
                    {Math.round(selectedProgress * 100)}%
                  </span>
                </div>
                <div className="exp-bar-container h-2.5 rounded-full">
                  <div
                    className="exp-bar-fill rounded-full"
                    style={{ width: `${Math.max(selectedProgress * 100, 4)}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1 flex justify-between">
                  <span>{selectedExp.toLocaleString()} Total EXP</span>
                  <span>Target: Lv. {selectedLevel + 1}</span>
                </div>
              </div>

              {/* Spending Stats */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white/5 p-2 rounded-xl text-center border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Total Spent</div>
                  <div className="text-xs font-black text-[var(--accent-gold)] mt-0.5">
                    ₹{(selectedUserPoke?.total_spent ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl text-center border border-white/5">
                  <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Orders</div>
                  <div className="text-xs font-black text-white mt-0.5">
                    {selectedUserPoke?.transaction_count ?? 0}
                  </div>
                </div>
              </div>

              {/* Feed Berries Bar */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-pink-300">
                    🫐 Feed Wild Companion
                  </span>
                  <span className="text-[10px] text-white/50">
                    Favorites: {routeLore?.preferredBerry || 'Razz Berry'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFeedBerry('razz')}
                    disabled={berryInventory.razz <= 0}
                    className="p-2 rounded-xl text-center border transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                    style={{
                      background: 'rgba(236, 72, 153, 0.15)',
                      borderColor: 'rgba(236, 72, 153, 0.4)',
                    }}
                  >
                    <span className="text-xl block">🫐</span>
                    <span className="text-[10px] font-bold block text-white mt-0.5">Razz ({berryInventory.razz})</span>
                    <span className="text-[9px] text-pink-300 font-extrabold">+25 EXP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFeedBerry('nanab')}
                    disabled={berryInventory.nanab <= 0}
                    className="p-2 rounded-xl text-center border transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                    style={{
                      background: 'rgba(234, 179, 8, 0.15)',
                      borderColor: 'rgba(234, 179, 8, 0.4)',
                    }}
                  >
                    <span className="text-xl block">🍌</span>
                    <span className="text-[10px] font-bold block text-white mt-0.5">Nanab ({berryInventory.nanab})</span>
                    <span className="text-[9px] text-yellow-300 font-extrabold">+35 EXP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFeedBerry('pinap')}
                    disabled={berryInventory.pinap <= 0}
                    className="p-2 rounded-xl text-center border transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      borderColor: 'rgba(168, 85, 247, 0.4)',
                    }}
                  >
                    <span className="text-xl block">🍍</span>
                    <span className="text-[10px] font-bold block text-white mt-0.5">Pinap ({berryInventory.pinap})</span>
                    <span className="text-[9px] text-purple-300 font-extrabold">+50 EXP</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPokemonCry(selectedForm.pokedexId, selectedCategory.pokemon.type);
                  }}
                  className="w-1/2 py-2 rounded-xl text-xs font-bold glass-card border border-white/10 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] flex items-center justify-center gap-1 transition-all"
                >
                  <span>🔊</span> Play Cry
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    router.push('/add-transaction');
                  }}
                  className="w-1/2 py-2 rounded-xl text-xs font-bold btn-primary flex items-center justify-center gap-1"
                >
                  <span>⚡</span> Log Expense
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Pokemon Carousel */}
        <div className="absolute bottom-20 md:bottom-4 left-0 right-0 z-20 px-4 pointer-events-auto">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide max-w-7xl mx-auto">
            {APP_CATEGORIES.slice(0, 12).map((cat) => {
              const uPoke = pokemonMap.get(cat.id);
              const lvl = uPoke?.current_level ?? 1;
              const form = getCurrentEvolution(cat.pokemon, lvl);
              const isSelected = selectedCategory?.id === cat.id;

              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectPokemon(cat)}
                  className={`flex-shrink-0 glass-card p-2.5 rounded-2xl flex items-center gap-2.5 min-w-[170px] text-left transition-all ${
                    isSelected ? 'ring-2 ring-white scale-105 shadow-xl' : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: isSelected ? cat.color : `${cat.color}35`,
                    background: isSelected ? `${cat.color}25` : 'rgba(15, 23, 42, 0.85)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                    style={{ background: `${cat.color}25` }}
                  >
                    <Image
                      src={form.spriteUrl}
                      alt={form.name}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white truncate">{form.name}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                      <span>{cat.icon}</span>
                      <span className="font-black text-[var(--accent-gold)]">Lv.{lvl}</span>
                      {isNight && <span className="text-[10px]">💤</span>}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
