/**
 * Token-policy guard — the code-level enforcement of the brand's hardest rule:
 * Copium never names, shills, or alludes to a specific tradeable token. She is
 * about the CULTURE, never a coin. The system prompt forbids this too; this
 * guard is the mechanical backstop so nothing ticker-shaped ever reaches X.
 *
 * Returns a human-readable reason when a post violates policy, or null if clean.
 */

// $CASHTAGS — any $ followed by letters is ticker syntax ($ + digits, i.e. money, is fine).
const CASHTAG = /\$[A-Za-z][A-Za-z0-9]{1,14}\b/;

// Contract addresses: EVM (0x + 40 hex) and Solana-style base58 (32-44 chars).
const EVM_ADDRESS = /\b0x[a-fA-F0-9]{40}\b/;
const BASE58_ADDRESS = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

// Well-known tradeable meme tokens by name (word-boundary, case-insensitive).
// Chains as cultural scenery (solana/eth/btc) stay allowed — but see COLLOCATION.
const KNOWN_TOKENS =
  /\b(doge|dogecoin|shib|shiba\s*inu|pepe|bonk|wif|dogwifhat|floki|popcat|moodeng|pnut|fartcoin|mog|brett|turbo|snek|myro|slerf|bome|giga|spx6900|apu)\b/i;

// Shill phrasing — high-precision collocations only, so cope jokes don't false-positive.
const SHILL_PHRASES: [RegExp, string][] = [
  [/\bape\s+(in|into)\b/i, 'shill phrasing ("ape in/into")'],
  [/\b(next|guaranteed|easy|sure|free)\s+\d+\s*x\b/i, 'shill phrasing ("next/guaranteed Nx")'],
  [/\b\d+\s*x\s+(gem|play|call|opportunity)\b/i, 'shill phrasing ("Nx gem/play/call")'],
  [/\b(buy|sell|long|short|accumulate|load\s+up\s+on)\s+(the\s+)?(btc|bitcoin|eth|ethereum|sol|solana)\b/i, 'trade call on a named asset'],
  [/\b(entry|target|take\s*profit|stop\s*loss)\s*(price|zone|level)?\s*[:@]/i, 'trade-signal formatting'],
  [/\b(presale|pre-sale|whitelist|airdrop\s+live|mint\s+is\s+live|stealth\s+launch(ed)?)\b/i, 'launch-promo phrasing'],
  [/\bca\s*[:=]\s*\S/i, 'contract-address callout ("CA:")'],
];

/** Returns the violation reason, or null if the post is clean. */
export function violatesTokenPolicy(text: string): string | null {
  if (CASHTAG.test(text)) return 'contains a $TICKER cashtag';
  if (EVM_ADDRESS.test(text)) return 'contains an EVM contract address';
  if (BASE58_ADDRESS.test(text)) return 'contains a Solana-style address';
  const token = text.match(KNOWN_TOKENS);
  if (token) return `names a specific token ("${token[0]}")`;
  for (const [re, reason] of SHILL_PHRASES) {
    if (re.test(text)) return reason;
  }
  return null;
}
