import { z } from 'zod';

/**
 * Bitcoin Address Validation
 * Supports: P2PKH, P2SH, Bech32 (Native SegWit), Bech32m (Taproot)
 */

// Bitcoin address regex patterns
const BITCOIN_ADDRESS_PATTERNS = {
  // Legacy P2PKH addresses (start with 1)
  p2pkh: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  // P2SH addresses (start with 3)
  p2sh: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  // Native SegWit P2WPKH/P2WSH (start with bc1q)
  bech32: /^bc1[qp][a-z0-9]{38,58}$/,
  // Taproot (start with bc1p)
  bech32m: /^bc1p[a-z0-9]{58}$/,
  // Testnet addresses
  testnetP2pkh: /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  testnetP2sh: /^[2][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
  testnetBech32: /^tb1[qp][a-z0-9]{38,58}$/,
  testnetBech32m: /^tb1p[a-z0-9]{58}$/,
  // Signet
  signetBech32: /^tb1[qp][a-z0-9]{38,58}$/,
};

/**
 * Validates a Bitcoin address
 */
export function isValidBitcoinAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  const trimmed = address.trim();
  if (trimmed.length < 26 || trimmed.length > 90) return false;
  
  return Object.values(BITCOIN_ADDRESS_PATTERNS).some(pattern => 
    pattern.test(trimmed)
  );
}

/**
 * Gets the type of Bitcoin address
 */
export function getBitcoinAddressType(address: string): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  
  if (BITCOIN_ADDRESS_PATTERNS.bech32m.test(trimmed)) return 'Taproot (P2TR)';
  if (BITCOIN_ADDRESS_PATTERNS.bech32.test(trimmed)) return 'Native SegWit';
  if (BITCOIN_ADDRESS_PATTERNS.p2sh.test(trimmed)) return 'Script Hash (P2SH)';
  if (BITCOIN_ADDRESS_PATTERNS.p2pkh.test(trimmed)) return 'Legacy (P2PKH)';
  if (BITCOIN_ADDRESS_PATTERNS.testnetBech32m.test(trimmed)) return 'Testnet Taproot';
  if (BITCOIN_ADDRESS_PATTERNS.testnetBech32.test(trimmed)) return 'Testnet SegWit';
  if (BITCOIN_ADDRESS_PATTERNS.testnetP2sh.test(trimmed)) return 'Testnet P2SH';
  if (BITCOIN_ADDRESS_PATTERNS.testnetP2pkh.test(trimmed)) return 'Testnet Legacy';
  
  return null;
}

// Token types supported by Bitcoin OS
export type TokenType = 'BTC' | 'zkBTC';

export const TOKEN_CONFIG = {
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    minAmount: 0.00000546, // Dust limit ~546 sats
    maxAmount: 21000000,
    icon: '₿',
  },
  zkBTC: {
    name: 'zkBTC',
    symbol: 'zkBTC',
    decimals: 8,
    minAmount: 0.00000001,
    maxAmount: 21000000,
    icon: 'zk₿',
    description: 'Zero-knowledge wrapped Bitcoin via Bitcoin OS',
  },
} as const;

/**
 * Validates a BTC/zkBTC amount
 */
export function isValidAmount(amount: string | number, tokenType: TokenType = 'BTC'): boolean {
  const config = TOKEN_CONFIG[tokenType];
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num) || !isFinite(num)) return false;
  if (num < config.minAmount) return false;
  if (num > config.maxAmount) return false;
  
  // Check decimal places
  const parts = amount.toString().split('.');
  if (parts[1] && parts[1].length > config.decimals) return false;
  
  return true;
}

/**
 * Formats amount to proper decimal places
 */
export function formatAmount(amount: number, tokenType: TokenType = 'BTC'): string {
  const config = TOKEN_CONFIG[tokenType];
  return amount.toFixed(config.decimals);
}

// Zod Schemas for form validation
export const bitcoinAddressSchema = z
  .string()
  .trim()
  .min(26, 'Bitcoin address is too short')
  .max(90, 'Bitcoin address is too long')
  .refine(isValidBitcoinAddress, {
    message: 'Invalid Bitcoin address format',
  });

export const optionalBitcoinAddressSchema = z
  .string()
  .trim()
  .transform(val => val || undefined)
  .pipe(
    z.union([
      z.undefined(),
      z.literal(''),
      bitcoinAddressSchema,
    ])
  );

export const amountSchema = (tokenType: TokenType = 'BTC') => {
  const config = TOKEN_CONFIG[tokenType];
  
  return z
    .string()
    .trim()
    .refine(val => val !== '' && !isNaN(parseFloat(val)), {
      message: 'Amount is required',
    })
    .refine(val => parseFloat(val) >= config.minAmount, {
      message: `Minimum amount is ${config.minAmount} ${config.symbol}`,
    })
    .refine(val => parseFloat(val) <= config.maxAmount, {
      message: `Maximum amount is ${config.maxAmount.toLocaleString()} ${config.symbol}`,
    })
    .refine(val => {
      const parts = val.split('.');
      return !parts[1] || parts[1].length <= config.decimals;
    }, {
      message: `Maximum ${config.decimals} decimal places`,
    });
};

export const milestoneSchema = (tokenType: TokenType = 'BTC') => z.object({
  id: z.string(),
  title: z
    .string()
    .trim()
    .min(1, 'Milestone title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .default(''),
  amountBTC: amountSchema(tokenType),
});

export const createEscrowSchema = (tokenType: TokenType = 'BTC') => z.object({
  payerAddress: bitcoinAddressSchema,
  payeeAddress: bitcoinAddressSchema,
  arbiterAddress: z.string().trim().optional().refine(
    val => !val || isValidBitcoinAddress(val),
    { message: 'Invalid arbiter Bitcoin address' }
  ),
  tokenType: z.enum(['BTC', 'zkBTC']).default('BTC'),
  milestones: z.array(milestoneSchema(tokenType)).min(1, 'At least one milestone is required'),
});

export type CreateEscrowFormData = z.infer<ReturnType<typeof createEscrowSchema>>;
export type MilestoneFormData = z.infer<ReturnType<typeof milestoneSchema>>;
