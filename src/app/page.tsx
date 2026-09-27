'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const STARTER_POKEMON = [
  { id: 4, name: 'Charmander', type: 'Fire', color: '#F08030', description: 'Food Delivery' },
  { id: 1, name: 'Bulbasaur', type: 'Grass', color: '#78C850', description: 'Grocery' },
  { id: 7, name: 'Squirtle', type: 'Water', color: '#6890F0', description: 'E-Commerce' },
  { id: 25, name: 'Pikachu', type: 'Electric', color: '#F8D030', description: 'Payments' },
  { id: 133, name: 'Eevee', type: 'Normal', color: '#C6B382', description: 'Clothing' },
  { id: 92, name: 'Gastly', type: 'Ghost', color: '#705898', description: 'Entertainment' },
];

function FloatingParticles() {
  return (
    <div className="pokemon-bg">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 8}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }}
        />
      ))}
    </div>
  );
}

function PokeballIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" />
      <path d="M2 50h96" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="4" fill="none" />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      <path d="M50 2A48 48 0 0 1 98 50H2A48 48 0 0 1 50 2Z" fill="var(--pokeball-red)" opacity="0.8" />
    </svg>
  );
}

export default function Home() {
  const [activePokemon, setActivePokemon] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsLoaded(true);
    intervalRef.current = setInterval(() => {
      setActivePokemon((prev) => (prev + 1) % STARTER_POKEMON.length);
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentPokemon = STARTER_POKEMON[activePokemon];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <FloatingParticles />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <PokeballIcon className="w-8 h-8 text-red-500" />
            <span className="text-xl font-bold tracking-tight">
              Poké<span className="text-[var(--accent-primary)]">Finance</span>
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Link href="/login" className="btn-ghost text-sm">
              Log In
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Get Started
            </Link>
          </motion.div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">
            {/* Left — Text */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={isLoaded ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] mb-6">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Track • Level Up • Evolve
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-6">
                Your Spending
                <br />
                <span className="bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-gold)] bg-clip-text text-transparent">
                  Powers Up
                </span>
                <br />
                Your Pokémon
              </h1>

              <p className="text-lg text-[var(--text-secondary)] max-w-md mb-8 leading-relaxed">
                Every ₹ you spend earns EXP for your Pokémon team. Watch them
                level up, evolve, and grow as you track your finances across
                all your favourite apps.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link href="/register" className="pokeball-btn">
                  <span>Start Your Journey</span>
                </Link>
                <Link
                  href="#features"
                  className="btn-ghost flex items-center gap-2"
                >
                  Learn More
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 3v10m0 0l4-4m-4 4L4 9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>

              {/* Stats strip */}
              <div className="flex items-center gap-8 mt-10 pt-8 border-t border-[var(--border-subtle)]">
                {[
                  { value: '18', label: 'Pokémon' },
                  { value: '50+', label: 'Apps Tracked' },
                  { value: '∞', label: 'Possibilities' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-[var(--accent-gold)]">{stat.value}</div>
                    <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — Pokemon Showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative flex items-center justify-center"
            >
              {/* Glow ring behind pokemon */}
              <div
                className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full opacity-20 blur-3xl transition-colors duration-1000"
                style={{ background: currentPokemon.color }}
              />

              {/* Pokeball background circle */}
              <div className="absolute w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full border border-[var(--border-subtle)] flex items-center justify-center">
                <div className="w-full h-[2px] bg-[var(--border-subtle)]" />
              </div>

              {/* Pokemon Image */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePokemon}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                  className="relative z-10"
                >
                  <Image
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${currentPokemon.id}.png`}
                    alt={currentPokemon.name}
                    width={280}
                    height={280}
                    className="drop-shadow-2xl"
                    style={{
                      filter: `drop-shadow(0 0 30px ${currentPokemon.color}40)`,
                    }}
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {/* Pokemon Info Badge */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`badge-${activePokemon}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="absolute bottom-4 right-4 md:bottom-8 md:right-0 glass-card p-4"
                  style={{ borderColor: `${currentPokemon.color}30` }}
                >
                  <div className="text-sm font-bold">{currentPokemon.name}</div>
                  <div
                    className="type-badge mt-1"
                    style={{ background: currentPokemon.color }}
                  >
                    {currentPokemon.type}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-2">
                    Tracks: {currentPokemon.description}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Dots navigation */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {STARTER_POKEMON.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePokemon(i)}
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      background:
                        i === activePokemon
                          ? STARTER_POKEMON[i].color
                          : 'rgba(255,255,255,0.15)',
                      transform: i === activePokemon ? 'scale(1.4)' : 'scale(1)',
                      boxShadow:
                        i === activePokemon
                          ? `0 0 12px ${STARTER_POKEMON[i].color}80`
                          : 'none',
                    }}
                    aria-label={`View ${STARTER_POKEMON[i].name}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </main>

        {/* Features Section */}
        <section id="features" className="relative z-10 px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
              How It{' '}
              <span className="text-[var(--accent-gold)]">Works</span>
            </h2>
            <p className="text-center text-[var(--text-secondary)] max-w-lg mx-auto mb-16">
              Turn your daily spending into an adventure. Every purchase is a step
              towards making your Pokémon team stronger.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: '💸',
                  title: 'Track Spending',
                  desc: 'Log transactions from Zomato, Amazon, Myntra, or any app. Manual entry, email parsing, or bank import.',
                  color: 'var(--fire)',
                },
                {
                  icon: '⚡',
                  title: 'Earn EXP',
                  desc: 'Every ₹ spent converts to EXP points. Bigger purchases = more EXP. Watch your Pokémon grow!',
                  color: 'var(--electric)',
                },
                {
                  icon: '🌟',
                  title: 'Evolve & Grow',
                  desc: 'Hit level thresholds to trigger authentic Pokémon evolutions with cinematic animations.',
                  color: 'var(--psychic)',
                },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="pokemon-card group"
                >
                  <div className="pokemon-card-inner text-center">
                    <div
                      className="text-4xl mb-4 inline-block p-4 rounded-2xl"
                      style={{ background: `${feature.color}15` }}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Pokemon Categories Preview */}
        <section className="relative z-10 px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
              Your{' '}
              <span className="text-[var(--accent-primary)]">Pokémon Team</span>
            </h2>
            <p className="text-center text-[var(--text-secondary)] max-w-lg mx-auto mb-12">
              Each app category is represented by a unique Pokémon. Track different
              areas of your spending and build your ultimate team.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {STARTER_POKEMON.map((pokemon, i) => (
                <motion.div
                  key={pokemon.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.08, y: -4 }}
                  className="glass-card p-4 flex flex-col items-center gap-3 text-center"
                  style={{ borderColor: `${pokemon.color}20` }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: `${pokemon.color}15` }}
                  >
                    <Image
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
                      alt={pokemon.name}
                      width={48}
                      height={48}
                      className="drop-shadow-lg"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{pokemon.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {pokemon.description}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="relative z-10 px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Ready to{' '}
              <span className="bg-gradient-to-r from-[var(--pokeball-red)] to-[var(--accent-gold)] bg-clip-text text-transparent">
                Catch &apos;Em All
              </span>
              ?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 text-lg">
              Start your journey today. Your Pokémon are waiting.
            </p>
            <Link href="/register" className="pokeball-btn text-lg px-10 py-4">
              <span>Choose Your Starter</span>
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-[var(--border-subtle)] px-6 py-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <PokeballIcon className="w-5 h-5 text-[var(--pokeball-red)]" />
              <span>PokeFinance © 2026</span>
            </div>
            <div>
              Pokémon © Nintendo/Game Freak. This is a fan project.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
