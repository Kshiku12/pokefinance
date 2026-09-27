'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

const STARTERS = [
  { id: 1, name: 'Bulbasaur', color: '#78C850', glow: 'rgba(120,200,80,0.3)' },
  { id: 4, name: 'Charmander', color: '#F08030', glow: 'rgba(240,128,48,0.3)' },
  { id: 7, name: 'Squirtle', color: '#6890F0', glow: 'rgba(104,144,240,0.3)' },
];

type AuthMode = 'select' | 'email' | 'phone' | 'verify-otp';

export default function RegisterPage() {
  const [mode, setMode] = useState<AuthMode>('select');
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          starter_pokemon: selectedStarter,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Check your email for a confirmation link!');
    }
    setLoading(false);
  };

  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      setError(error.message);
    } else {
      setMode('verify-otp');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      setError(error.message);
    } else {
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex">
      {/* Background */}
      <div className="pokemon-bg">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${10 + Math.random() * 15}s`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Left Panel — Starter Pokemon Showcase (Desktop only) */}
      <div className="hidden lg:flex relative z-10 w-1/2 items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-md"
        >
          <h2 className="text-4xl font-black mb-4">
            Choose Your
            <br />
            <span className="text-[var(--accent-gold)]">Starter Pokémon</span>
          </h2>
          <p className="text-[var(--text-secondary)] mb-10">
            Your starter will be the first Pokémon in your finance tracking journey.
            Every adventure begins with a single choice.
          </p>

          {/* Starter Selection */}
          <div className="flex gap-6 mb-8">
            {STARTERS.map((starter) => (
              <motion.button
                key={starter.id}
                whileHover={{ scale: 1.1, y: -8 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedStarter(starter.id)}
                className="relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300"
                style={{
                  background:
                    selectedStarter === starter.id
                      ? `${starter.color}20`
                      : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${
                    selectedStarter === starter.id
                      ? starter.color
                      : 'rgba(255,255,255,0.06)'
                  }`,
                  boxShadow:
                    selectedStarter === starter.id
                      ? `0 0 30px ${starter.glow}`
                      : 'none',
                }}
              >
                <Image
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${starter.id}.png`}
                  alt={starter.name}
                  width={80}
                  height={80}
                  className="drop-shadow-lg"
                />
                <span className="text-sm font-semibold">{starter.name}</span>
                {selectedStarter === starter.id && (
                  <motion.div
                    layoutId="starterSelect"
                    className="absolute -bottom-1 w-8 h-1 rounded-full"
                    style={{ background: starter.color }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Selected Pokemon Display */}
          <AnimatePresence mode="wait">
            {selectedStarter && (
              <motion.div
                key={selectedStarter}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="glass-card p-6 text-center"
                style={{
                  borderColor: `${
                    STARTERS.find((s) => s.id === selectedStarter)?.color
                  }30`,
                }}
              >
                <Image
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedStarter}.png`}
                  alt="Selected starter"
                  width={160}
                  height={160}
                  className="mx-auto drop-shadow-2xl"
                  style={{
                    filter: `drop-shadow(0 0 20px ${
                      STARTERS.find((s) => s.id === selectedStarter)?.glow
                    })`,
                  }}
                />
                <div className="font-pixel text-xs text-[var(--accent-gold)] mt-4">
                  I choose you!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right Panel — Registration Form */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
            <svg
              viewBox="0 0 100 100"
              className="w-8 h-8 text-red-500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" />
              <path d="M2 50h96" stroke="currentColor" strokeWidth="4" />
              <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="4" />
              <circle cx="50" cy="50" r="8" fill="currentColor" />
              <path d="M50 2A48 48 0 0 1 98 50H2A48 48 0 0 1 50 2Z" fill="var(--pokeball-red)" opacity="0.8" />
            </svg>
            <span className="text-lg font-bold">
              Poké<span className="text-[var(--accent-primary)]">Finance</span>
            </span>
          </Link>

          <h1 className="text-3xl font-black mb-2">Begin Your Journey</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Create your Trainer account to start tracking
          </p>

          {/* Error / Success Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="btn-google mb-4"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              or register with
            </span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          </div>

          {/* Method Toggle */}
          {mode !== 'verify-otp' && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setMode('email'); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'email'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                ✉️ Email
              </button>
              <button
                onClick={() => { setMode('phone'); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'phone'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                📱 Phone
              </button>
            </div>
          )}

          {/* Email Registration Form */}
          <AnimatePresence mode="wait">
            {mode === 'email' && (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleEmailSignUp}
                className="space-y-4"
              >
                <div>
                  <label className="poke-input-label">Trainer Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ash Ketchum"
                    className="poke-input"
                    required
                  />
                </div>
                <div>
                  <label className="poke-input-label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trainer@pokefinance.app"
                    className="poke-input"
                    required
                  />
                </div>
                <div>
                  <label className="poke-input-label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="poke-input"
                    required
                    minLength={6}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="pokeball-spinner w-5 h-5" />
                      Creating account...
                    </span>
                  ) : (
                    'Create Trainer Account'
                  )}
                </button>
              </motion.form>
            )}

            {mode === 'phone' && (
              <motion.form
                key="phone-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePhoneSignUp}
                className="space-y-4"
              >
                <div>
                  <label className="poke-input-label">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="poke-input w-16 text-center flex items-center justify-center text-sm">
                      +91
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="poke-input flex-1"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="pokeball-spinner w-5 h-5" />
                      Sending OTP...
                    </span>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </motion.form>
            )}

            {mode === 'verify-otp' && (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">📱</div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Enter the 6-digit code sent to{' '}
                    <span className="text-[var(--text-primary)] font-medium">
                      +91{phone}
                    </span>
                  </p>
                </div>
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="poke-input text-center text-2xl tracking-[0.5em] font-mono"
                    required
                    maxLength={6}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="pokeball-spinner w-5 h-5" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Create Account'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('phone')}
                  className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  ← Back to phone number
                </button>
              </motion.form>
            )}

            {mode === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setMode('email')}
                  className="btn-ghost w-full justify-start gap-3 text-left"
                >
                  <span className="text-xl">✉️</span>
                  <span>Register with Email</span>
                </button>
                <button
                  onClick={() => setMode('phone')}
                  className="btn-ghost w-full justify-start gap-3 text-left"
                >
                  <span className="text-xl">📱</span>
                  <span>Register with Phone Number</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login link */}
          <p className="text-center text-sm text-[var(--text-muted)] mt-8">
            Already a Trainer?{' '}
            <Link
              href="/login"
              className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-medium"
            >
              Log In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
