import { categorizeTransaction } from './categorizer';
import { amountToExp, APP_CATEGORIES, type AppCategory } from './pokemon';

export interface ParsedStatementRow {
  id: string;
  date: string;
  rawDescription: string;
  appName: string;
  categoryId: string;
  category: AppCategory;
  amount: number;
  expEarned: number;
  selected: boolean;
}

export function parseCSVStatement(csvText: string): ParsedStatementRow[] {
  if (!csvText || csvText.trim().length === 0) return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse CSV line handling quoted strings
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Find header line
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = parseLine(lines[i]).map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const hasDate = cols.some((c) => c.includes('date') || c.includes('txn'));
    const hasAmount = cols.some((c) => c.includes('amount') || c.includes('debit') || c.includes('withdrawal') || c.includes('dr'));
    const hasDesc = cols.some((c) => c.includes('desc') || c.includes('narration') || c.includes('particular') || c.includes('remark'));

    if (hasDate && (hasAmount || hasDesc)) {
      headerIndex = i;
      headers = parseLine(lines[i]);
      break;
    }
  }

  // Fallback default column order if no clear header
  let dateCol = 0;
  let descCol = 1;
  let debitCol = 2;

  if (headerIndex !== -1) {
    const lowerHeaders = headers.map((h) => h.toLowerCase());
    lowerHeaders.forEach((h, idx) => {
      if (h.includes('date')) dateCol = idx;
      else if (h.includes('narration') || h.includes('desc') || h.includes('particular') || h.includes('remark')) descCol = idx;
      else if (h.includes('debit') || h.includes('withdrawal') || (h.includes('amount') && !h.includes('credit'))) debitCol = idx;
    });
  } else {
    headerIndex = -1; // Treat line 0 as data if no header detected
  }

  const results: ParsedStatementRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = cols[dateCol] || new Date().toISOString();
    const rawDesc = cols[descCol] || 'Bank Transaction';
    const rawAmountStr = cols[debitCol] || '0';

    // Parse amount
    const cleanAmountStr = rawAmountStr.replace(/[^0-9.-]/g, '');
    const amountNum = Math.abs(parseFloat(cleanAmountStr));

    if (isNaN(amountNum) || amountNum <= 0) {
      continue; // Skip credits, empty rows, or zero-amount lines
    }

    // Auto categorize
    const categorized = categorizeTransaction(rawDesc);
    const exp = amountToExp(amountNum);

    results.push({
      id: `stmt_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      date: rawDate,
      rawDescription: rawDesc,
      appName: categorized.appName,
      categoryId: categorized.categoryId,
      category: categorized.category,
      amount: amountNum,
      expEarned: exp,
      selected: true,
    });
  }

  return results;
}

// Built-in Sample Statement for immediate testing without finding a bank file
export const SAMPLE_BANK_STATEMENT = `Date,Narration / Description,Debit Amount,Credit Amount,Balance
24/09/2026,UPI/ZOMATO/paytm-zomato@paytm/Order lunch,450.00,,45210.00
23/09/2026,POS/AMAZON INDIA/Bangalore,2499.00,,47709.00
22/09/2026,UPI/BLINKIT/quickcommerce@icici/Grocery dairy,380.00,,48089.00
21/09/2026,ACH/NETFLIX ENTERTAINMENT/Monthly sub,649.00,,48738.00
20/09/2026,UPI/MYNTRA/myntra@hdfc/Sneakers fashion,1899.00,,50637.00
19/09/2026,UPI/UBER INDIA/uber.ride@icici/Trip to office,280.00,,50917.00
18/09/2026,UPI/STARBUCKS/coffee@hdfc/Iced caramel macchiato,350.00,,51267.00
17/09/2026,ACH/GROWW INVESTMENTS/SIP mutual fund,5000.00,,56267.00`;
