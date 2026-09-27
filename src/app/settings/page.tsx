'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AppNavigation from '@/components/AppNavigation';
import BankStatementModal from '@/components/BankStatementModal';
import ReceiptParserModal from '@/components/ReceiptParserModal';
import { createClient } from '@/lib/supabase/client';
import { sounds } from '@/lib/sound';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string; phone?: string; name?: string } | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [notifications, setNotifications] = useState(true);
  const [xpMultiplier, setXpMultiplier] = useState('1.0');

  // Phase 4 Modals
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          email: authUser.email,
          phone: authUser.phone,
          name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || 'Trainer',
        });
      }
    };
    getUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleToggleGmail = () => {
    sounds.playClick();
    const nextState = !gmailConnected;
    setGmailConnected(nextState);
    if (nextState) {
      alert('⚡ Gmail Connected! Incoming order confirmations from Zomato, Swiggy, Amazon, and Blinkit will be automatically analyzed.');
    }
  };

  const settingSections = [
    {
      title: '👤 Profile',
      items: [
        {
          label: 'Trainer Name',
          value: user?.name || 'Trainer',
          type: 'display' as const,
        },
        {
          label: 'Email',
          value: user?.email || 'trainer@pokefinance.app',
          type: 'display' as const,
        },
        {
          label: 'Phone',
          value: user?.phone || 'Not set',
          type: 'display' as const,
        },
      ],
    },
    {
      title: '💰 Finance Settings',
      items: [
        {
          label: 'Currency',
          value: currency,
          type: 'select' as const,
          options: ['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'],
          onChange: (val: string) => setCurrency(val),
        },
        {
          label: 'XP Multiplier',
          value: xpMultiplier,
          type: 'select' as const,
          options: ['0.5x (Casual)', '1.0x (Normal)', '2.0x (Hardcore)', '5.0x (Legendary)'],
          onChange: (val: string) => setXpMultiplier(val),
        },
      ],
    },
    {
      title: '🔔 Notifications',
      items: [
        {
          label: 'Push Notifications',
          value: notifications,
          type: 'toggle' as const,
          onChange: (val: boolean) => setNotifications(val),
        },
      ],
    },
    {
      title: '📤 Smart Tracking & Data Import (Phase 4)',
      items: [
        {
          label: 'Bank Statement Importer',
          value: 'Upload CSV',
          type: 'button' as const,
          action: () => {
            sounds.playClick();
            setShowStatementModal(true);
          },
        },
        {
          label: 'Smart Receipt / Email Parser',
          value: 'Paste Text / SMS',
          type: 'button' as const,
          action: () => {
            sounds.playClick();
            setShowReceiptModal(true);
          },
        },
        {
          label: 'Gmail Order Auto-Sync',
          value: gmailConnected,
          type: 'toggle' as const,
          onChange: handleToggleGmail,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="pokemon-bg" />
      <AppNavigation />

      <div className="main-content relative z-10">
        <header className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Customize your Trainer profile
            </p>
          </div>
        </header>

        <div className="px-4 md:px-6 pb-8 max-w-2xl space-y-6">
          {settingSections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.1 }}
              className="glass-card overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-bold">{section.title}</h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.type === 'display' && (
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          {item.value as string}
                        </div>
                      )}
                    </div>

                    {item.type === 'select' && (
                      <select
                        className="poke-input w-auto text-sm py-2 px-3"
                        value={item.value as string}
                        onChange={(e) => item.onChange?.(e.target.value)}
                      >
                        {item.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-[var(--bg-card)]">
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {item.type === 'toggle' && (
                      <button
                        onClick={() => item.onChange?.(!item.value)}
                        className="relative w-12 h-6 rounded-full transition-colors"
                        style={{
                          background: item.value
                            ? 'var(--accent-primary)'
                            : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <motion.div
                          animate={{ x: item.value ? 24 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-1 w-4 h-4 rounded-full bg-white"
                        />
                      </button>
                    )}

                    {item.type === 'button' && (
                      <button
                        onClick={item.action}
                        className="btn-ghost text-xs py-2 px-4"
                      >
                        {item.value as string}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card overflow-hidden border-red-500/20"
          >
            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-bold text-red-400">⚠️ Account</h3>
            </div>
            <div className="p-6">
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/20 transition-colors"
              >
                Log Out
              </button>
            </div>
          </motion.div>

          {/* App Info */}
          <div className="text-center text-xs text-[var(--text-muted)] py-4">
            <p>PokeFinance v1.0.0</p>
            <p className="mt-1">
              Pokémon © Nintendo/Game Freak. Fan project for educational use.
            </p>
          </div>
        </div>
      </div>

      {/* Phase 4 Smart Tracking Modals */}
      <BankStatementModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
      />

      <ReceiptParserModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
      />
    </div>
  );
}
