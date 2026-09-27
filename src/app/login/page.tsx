'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'email' | 'phone' | 'verify-otp';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleGoogleLogin = async () => {
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
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
    <div className="relative min-h-screen flex items-center justify-center">
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

      {/* Pikachu decoration — floats behind the form */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 0.08, x: 0 }}
        transition={{ duration: 1.2 }}
        className="hidden md:block absolute right-[5%] top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <Image
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
          alt=""
          width={500}
          height={500}
          className="blur-[1px]"
          aria-hidden
        />
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card p-8 md:p-10">
          {/* Pokeball top decoration */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <svg
                viewBox="0 0 100 100"
                className="w-12 h-12"
                fill="none"
              >
                <circle cx="50" cy="50" r="48" stroke="#333" strokeWidth="4" fill="#0a0e1a" />
                <path d="M50 2A48 48 0 0 1 98 50H2A48 48 0 0 1 50 2Z" fill="var(--pokeball-red)" />
                <path d="M2 50h96" stroke="#333" strokeWidth="4" />
                <circle cx="50" cy="50" r="15" stroke="#333" strokeWidth="4" fill="#0a0e1a" />
                <circle cx="50" cy="50" r="8" fill="white" />
              </svg>
            </motion.div>
          </div>

          {/* Logo */}
          <div className="text-center mb-8 pt-4">
            <h1 className="text-3xl font-black mb-2">Welcome Back</h1>
            <p className="text-[var(--text-secondary)] text-sm">
              Your Pokémon missed you, Trainer!
            </p>
          </div>

          {/* Error Message */}
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
          </AnimatePresence>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-google mb-4"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">or</span>
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

          {/* Forms */}
          <AnimatePresence mode="wait">
            {mode === 'email' && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleEmailLogin}
                className="space-y-4"
              >
                <div>
                  <label className="poke-input-label">Email</label>
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
                    placeholder="Your secret code"
                    className="poke-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="pokeball-spinner w-5 h-5" />
                      Logging in...
                    </span>
                  ) : (
                    'Enter the World'
                  )}
                </button>
              </motion.form>
            )}

            {mode === 'phone' && (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePhoneLogin}
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
                  className="btn-primary w-full py-3.5"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
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
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Enter code sent to <span className="text-[var(--text-primary)] font-medium">+91{phone}</span>
                  </p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="poke-input text-center text-2xl tracking-[0.5em] font-mono"
                  required
                  maxLength={6}
                />
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="btn-primary w-full py-3.5"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="pokeball-spinner w-5 h-5" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Enter'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('phone')}
                  className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  ← Change phone number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Register link */}
          <p className="text-center text-sm text-[var(--text-muted)] mt-8">
            New Trainer?{' '}
            <Link
              href="/register"
              className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-medium transition-colors"
            >
              Start Your Journey
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
