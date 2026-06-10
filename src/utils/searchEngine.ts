import type { PageData } from './pdfParser';

/* ─── Text helpers ─── */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\wа-яёұқөғәіңүһ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(w => w.length > 1);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[m][n];
}

/* ─── Scoring ─── */

function scoreText(query: string, text: string): number {
  const qTokens = tokenize(query);
  const tTokens = tokenize(text);
  const tNorm = normalize(text);
  const qNorm = normalize(query);

  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  // Exact substring
  if (tNorm.includes(qNorm)) return 1000;

  let score = 0;
  const tSet = new Set(tTokens);
  let matched = 0;

  for (const q of qTokens) {
    if (tSet.has(q)) { matched++; score += 10; continue; }

    let best = 0;
    for (const t of tSet) {
      if (t.includes(q) || q.includes(t)) {
        best = Math.max(best, (Math.min(q.length, t.length) / Math.max(q.length, t.length)) * 7);
      }
      if (q.length >= 4 && t.length >= 4) {
        const d = levenshtein(q, t);
        if (d <= 2) best = Math.max(best, (1 - d / Math.max(q.length, t.length)) * 6);
      }
    }
    score += best;
    if (best > 3) matched++;
  }

  score *= 1 + matched / qTokens.length;

  // Bigram bonus
  for (let i = 0; i < qTokens.length - 1; i++) {
    if (tNorm.includes(qTokens[i] + ' ' + qTokens[i + 1])) score += 15;
  }

  return score;
}

/* ─── Public search ─── */

export interface SearchResult {
  page: PageData;
  /** Конкретная строка, которая совпала лучше всего */
  matchedLine: string;
  /** Подсвеченная версия строки */
  highlight: string;
  score: number;
}

/**
 * Ищет по всем страницам — по содержимому (content + lines).
 * Возвращает результаты отсортированные по релевантности.
 */
export function searchPages(
  query: string,
  pages: PageData[],
  topK: number = 5,
): SearchResult[] {
  if (!query.trim() || pages.length === 0) return [];

  const results: SearchResult[] = [];

  for (const page of pages) {
    // Score against full content
    const fullScore = scoreText(query, page.content);

    // Also score individual lines — чтобы найти конкретное предложение
    let bestLine = '';
    let bestLineScore = 0;

    for (const line of page.lines) {
      if (line.trim().length < 3) continue;
      const ls = scoreText(query, line);
      if (ls > bestLineScore) {
        bestLineScore = ls;
        bestLine = line;
      }
    }

    const combinedScore = Math.max(fullScore * 0.7, bestLineScore);

    if (combinedScore > 0) {
      results.push({
        page,
        matchedLine: bestLine || page.content.slice(0, 200),
        highlight: highlightMatches(query, bestLine || page.content.slice(0, 200)),
        score: combinedScore,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/* ─── Highlight ─── */

function highlightMatches(query: string, text: string): string {
  const tokens = tokenize(query);
  let out = text;
  for (const tk of tokens) {
    const re = new RegExp(`(${escapeRe(tk)}\\w*|\\w*${escapeRe(tk)})`, 'gi');
    out = out.replace(re, '**$1**');
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
