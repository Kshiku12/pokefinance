'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCSVStatement, SAMPLE_BANK_STATEMENT, type ParsedStatementRow } from '@/lib/statement-parser';
import { recordTransaction } from '@/lib/data-store';
import { sounds } from '@/lib/sound';
import { useAuth } from '@/lib/auth-context';

interface BankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number, totalExp: number) => void;
}

export default function BankStatementModal({ isOpen, onClose, onSuccess }: BankStatementModalProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ParsedStatementRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number; totalExp: number } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playClick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSVStatement(text);
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    sounds.playClick();
    const parsed = parseCSVStatement(SAMPLE_BANK_STATEMENT);
    setRows(parsed);
  };

  const toggleRow = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleAll = (select: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  const selectedRows = rows.filter((r) => r.selected);
  const totalSelectedAmount = selectedRows.reduce((sum, r) => sum + r.amount, 0);
  const totalSelectedExp = selectedRows.reduce((sum, r) => sum + r.expEarned, 0);

  const handleImport = async () => {
    if (selectedRows.length === 0) return;

    setImporting(true);
    sounds.playExpGain();

    try {
      for (const row of selectedRows) {
        await recordTransaction(
          {
            categoryId: row.categoryId,
            pokemonId: row.category.pokemon.id,
            appName: row.appName,
            amount: row.amount,
            description: row.rawDescription,
          },
          !!user
        );
      }

      sounds.playLevelUp();
      setImportSummary({ count: selectedRows.length, totalExp: totalSelectedExp });
      onSuccess?.(selectedRows.length, totalSelectedExp);

      setTimeout(() => {
        setImportSummary(null);
        setRows([]);
        onClose();
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('Failed to import statement rows');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="glass-card w-full max-w-3xl p-6 border border-[var(--border-accent)] max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/40 flex items-center justify-center text-xl">
              🏦
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bank Statement Smart Import</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Upload CSV from HDFC, SBI, ICICI, Axis, or Paytm to auto-categorize &amp; earn EXP
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
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {rows.length === 0 ? (
            <div className="space-y-4">
              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="text-4xl mb-3">📁</span>
                <span className="text-sm font-bold text-white">Click or drag your bank CSV statement here</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">
                  Supports standard bank formats (Date, Description, Debit, Balance)
                </span>
              </label>

              {/* Sample statement button */}
              <div className="text-center pt-2">
                <span className="text-xs text-[var(--text-muted)] mr-2">Don&apos;t have a file ready?</span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs font-semibold text-[var(--accent-gold)] hover:underline"
                >
                  ⚡ Load Sample Bank Statement (8 Orders)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary and Selection Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="text-[var(--accent-primary)] hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-[var(--border-subtle)]">|</span>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="text-[var(--text-muted)] hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text-muted)]">
                    Selected: <b className="text-white">{selectedRows.length}</b> of {rows.length}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    Total: <b className="text-[var(--accent-gold)]">₹{totalSelectedAmount.toLocaleString('en-IN')}</b>
                  </span>
                  <span className="text-[var(--exp-bar)] font-bold">
                    +{totalSelectedExp.toLocaleString()} XP
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    onClick={() => toggleRow(row.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                      row.selected
                        ? 'bg-[rgba(255,255,255,0.05)] border-[var(--border-accent)]'
                        : 'bg-[rgba(255,255,255,0.01)] border-transparent opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleRow(row.id)}
                      className="rounded accent-[var(--accent-primary)]"
                    />

                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${row.category.color}25` }}
                    >
                      <Image
                        src={row.category.pokemon.spriteUrl}
                        alt={row.category.pokemon.displayName}
                        width={22}
                        height={22}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{row.appName}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">({row.category.name})</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{row.rawDescription}</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-[var(--pokeball-red)]">-₹{row.amount.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-[var(--exp-bar)] font-semibold">+{row.expEarned} XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="glass-card py-2 px-4 text-xs font-semibold text-[var(--text-secondary)] hover:text-white"
          >
            Cancel
          </button>

          {rows.length > 0 && (
            <button
              type="button"
              disabled={selectedRows.length === 0 || importing}
              onClick={handleImport}
              className="btn-primary py-2.5 px-6 text-xs font-bold disabled:opacity-50"
            >
              {importing ? (
                'Importing & Training Pokémon...'
              ) : (
                `⚡ Import ${selectedRows.length} Expenses (+${totalSelectedExp} XP)`
              )}
            </button>
          )}
        </div>

        {/* Success Splash */}
        <AnimatePresence>
          {importSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
            >
              <div className="text-5xl mb-3">🎉</div>
              <h4 className="font-pixel text-xl text-[var(--accent-gold)] mb-2">IMPORT COMPLETE!</h4>
              <p className="text-white text-sm">
                Successfully logged <b>{importSummary.count}</b> transactions!
              </p>
              <p className="text-xs text-[var(--exp-bar)] font-bold mt-1">
                +{importSummary.totalExp} EXP awarded to your Pokémon companions!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
