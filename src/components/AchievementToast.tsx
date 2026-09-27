'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACHIEVEMENT_DEFINITIONS, type Achievement } from '@/lib/achievements';
import { sounds } from '@/lib/sound';

export default function AchievementToast() {
  const [activeBadge, setActiveBadge] = useState<Achievement | null>(null);

  useEffect(() => {
    const handleBadgeUnlocked = (e: Event) => {
      const customEvent = e as CustomEvent<{ badgeId: string }>;
      const badgeId = customEvent.detail?.badgeId;
      if (!badgeId) return;

      const def = ACHIEVEMENT_DEFINITIONS.find((b) => b.id === badgeId);
      if (def) {
        sounds.playBadgeUnlocked();
        setActiveBadge({
          ...def,
          unlocked: true,
          progress: 100,
          progressText: 'Unlocked!',
        });

        // Auto dismiss after 6 seconds
        const timer = setTimeout(() => {
          setActiveBadge(null);
        }, 6000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('pokefinance-badge-unlocked', handleBadgeUnlocked);
    return () => window.removeEventListener('pokefinance-badge-unlocked', handleBadgeUnlocked);
  }, []);

  return (
    <AnimatePresence>
      {activeBadge && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-auto"
          onClick={() => setActiveBadge(null)}
        >
          <div
            className="glass-card p-4 rounded-2xl border-2 flex items-center gap-4 cursor-pointer relative overflow-hidden shadow-2xl"
            style={{
              borderColor: activeBadge.color,
              background: 'linear-gradient(135deg, rgba(26, 32, 53, 0.95), rgba(15, 20, 35, 0.98))',
              boxShadow: `0 10px 30px ${activeBadge.color}35`,
            }}
          >
            {/* Shimmer sweep animation */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                animation: 'shimmer 2.5s infinite',
              }}
            />

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0"
              style={{
                background: `${activeBadge.color}25`,
                border: `1px solid ${activeBadge.color}60`,
              }}
            >
              {activeBadge.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-gold)]">
                  ★ GYM BADGE UNLOCKED!
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-white truncate">
                {activeBadge.badgeName}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {activeBadge.title}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBadge(null);
              }}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px] text-white/60 shrink-0"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
