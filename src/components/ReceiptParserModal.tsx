'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { parseReceiptText, type ExtractedReceipt } from '@/lib/categorizer';
import { amountToExp } from '@/lib/pokemon';
import { recordTransaction } from '@/lib/data-store';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/lib/auth-context';

interface ReceiptParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_RECEIPTS = [
  {
    name: '🍔 Zomato Order Receipt',
    text: `From: order@zomato.com
Subject: Your Zomato order from Pizza Bakery is confirmed!
Hi Trainer,
Thank you for ordering. Your order #ZOM-892401 has been confirmed.
Item: 1x Truffle Mushroom Pizza (₹450.00)
Taxes & Delivery: ₹49.00
Total Paid: ₹499.00 via Google Pay
Delivering to your location. Enjoy your meal!`,
  },
  {
    name: '📦 Amazon Order Confirmed',
    text: `From: auto-confirm@amazon.in
Subject: Order Confirmation - Order #402-8823192-12001
Hello Trainer,
Thanks for your order!
Items: Sony WH-1000XM5 Wireless Headphones
Order Total: INR 2,999.00
Payment Method: Amazon Pay UPI
Estimated Delivery: Tomorrow`,
  },
  {
    name: '🛒 Blinkit 10-Minute Grocery',
    text: `From: updates@blinkit.com
Subject: Blinkit Order #BLK-771239 Delivered!
Hi, your 10-minute order has been delivered by your rider.
Items: Amul Milk 1L, Fresh Bananas 1kg, Brown Bread
Amount Debited: Rs. 385.00
Payment Mode: UPI`,
  },
  {
    name: '🚗 Uber Trip Receipt',
    text: `From: uber.india@uber.com
Subject: Your Tuesday morning trip with Uber
Total: ₹320.00
Trip distance: 8.4 km
Payment: Paytm UPI
Driver: Ramesh K. Thanks for riding with Uber!`,
  },
];

export default function ReceiptParserModal({ isOpen, onClose, onSuccess }: ReceiptParserModalProps) {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<ExtractedReceipt | null>(null);
  const [editableAmount, setEditableAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setInputText(text);
    const parsed = parseReceiptText(text);
    setParsedData(parsed);
    if (parsed) {
      setEditableAmount(parsed.amount > 0 ? parsed.amount.toString() : '');
    }
  };

  const handleSelectSample = (sampleText: string) => {
    sounds.playClick();
    handleTextChange(sampleText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData) return;

    const finalAmount = parseFloat(editableAmount) || parsedData.amount;
    if (finalAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    sounds.playExpGain();

    try {
      const res = await recordTransaction(
        {
          categoryId: parsedData.categoryId,
          pokemonId: parsedData.category.pokemon.id,
          appName: parsedData.appName,
          amount: finalAmount,
          description: parsedData.description,
        },
        !!user
      );

      sounds.playLevelUp();
      setSuccessMessage(`Successfully logged ₹${finalAmount.toLocaleString('en-IN')} for ${parsedData.category.pokemon.displayName}!`);
      onSuccess?.();

      setTimeout(() => {
        setSuccessMessage(null);
        setInputText('');
        setParsedData(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to log parsed expense');
    } finally {
      setSubmitting(false);
    }
  };

  const currentAmount = parseFloat(editableAmount) || parsedData?.amount || 0;
  const currentExp = currentAmount > 0 ? amountToExp(currentAmount) : 0;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="glass-card w-full max-w-2xl p-6 border border-[var(--border-accent)] max-h-[90vh] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/40 flex items-center justify-center text-xl">
              ✉️
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Smart Receipt &amp; Email Parser</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Paste order confirmation emails or SMS to auto-detect merchant, amount &amp; Pokémon EXP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Quick sample chips */}
          <div>
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-2">
              Try Sample Confirmation Emails:
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_RECEIPTS.map((sample) => (
                <button
                  key={sample.name}
                  type="button"
                  onClick={() => handleSelectSample(sample.text)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-all"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
              Paste Email or SMS Content
            </label>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste order confirmation text, e.g. 'Your order of ₹450 from Zomato has been placed'..."
              className="poke-input w-full text-xs font-mono"
            />
          </div>

          {/* Live Extracted Analysis Card */}
          {parsedData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 rounded-xl border border-[var(--border-accent)] space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--accent-gold)] uppercase tracking-wider flex items-center gap-1.5">
                  <span>✨</span> AI Extracted Details
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Confidence: {Math.round(parsedData.confidence * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${parsedData.category.color}25` }}
                >
                  <Image
                    src={parsedData.category.pokemon.spriteUrl}
                    alt={parsedData.category.pokemon.displayName}
                    width={32}
                    height={32}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{parsedData.appName}</span>
                    <span className="text-xs text-[var(--text-muted)]">({parsedData.category.name})</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Assigned Pokémon: <b className="text-[var(--accent-gold)]">{parsedData.category.pokemon.displayName}</b>
                  </div>
                </div>

                {/* Amount input in case user wants to tweak */}
                <div className="text-right">
                  <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Amount (₹)</label>
                  <input
                    type="number"
                    value={editableAmount}
                    onChange={(e) => setEditableAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="1"
                    className="poke-input w-28 text-right font-bold text-base py-1 px-2"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">{parsedData.description}</span>
                <span className="text-[var(--exp-bar)] font-bold">
                  +{currentExp} XP will be awarded
                </span>
              </div>
            </motion.div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!parsedData || currentAmount <= 0 || submitting}
              className="btn-primary w-full py-3 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                'Processing & Leveling Pokémon...'
              ) : (
                `⚡ Confirm & Log ₹${currentAmount.toLocaleString('en-IN')} (+${currentExp} XP)`
              )}
            </button>
          </div>
        </form>

        {/* Success Modal */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
            >
              <div className="text-4xl mb-3">⚡</div>
              <h4 className="font-pixel text-xl text-[var(--accent-gold)] mb-2">RECEIPT PROCESSED!</h4>
              <p className="text-white text-sm">{successMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
