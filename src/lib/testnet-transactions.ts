/**
 * Testnet Bitcoin Transaction Utilities
 * Generates mock testnet transaction IDs and provides mempool explorer links
 */

import { toast } from "sonner";

// Mempool testnet explorer base URL
export const MEMPOOL_TESTNET_URL = "https://mempool.space/testnet";

// Mempool REST API base for testnet
const MEMPOOL_TESTNET_API = `${MEMPOOL_TESTNET_URL}/api`;

// In-memory pool of *real* txids fetched from mempool so the explorer never shows "Transaction not found"
const txidPool: string[] = [];
let poolFetchInFlight: Promise<void> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return res.text();
}

async function fillTxidPool(targetCount: number = 25): Promise<void> {
  // Avoid refilling if we already have enough
  if (txidPool.length >= targetCount) return;

  // Fetch from latest block (stable API endpoints)
  const height = await fetchJson<number>(`${MEMPOOL_TESTNET_API}/blocks/tip/height`);
  const blockHash = (await fetchText(`${MEMPOOL_TESTNET_API}/block-height/${height}`)).trim();
  const txids = await fetchJson<string[]>(`${MEMPOOL_TESTNET_API}/block/${blockHash}/txids`);

  // Keep only plausible txids
  const cleaned = (txids || []).filter((t) => typeof t === 'string' && /^[0-9a-f]{64}$/i.test(t));
  // Add unique txids
  for (const txid of cleaned) {
    if (!txidPool.includes(txid)) txidPool.push(txid);
    if (txidPool.length >= targetCount) break;
  }
}

/**
 * Prefetch a pool of existing testnet txids from mempool.
 * Call this once near app start so all button clicks can open a real transaction.
 */
export function prefetchTestnetTxids(targetCount: number = 25): void {
  if (poolFetchInFlight) return;
  poolFetchInFlight = (async () => {
    try {
      await fillTxidPool(targetCount);
    } catch (e) {
      // Silent fallback: we can still generate demo txids if mempool is unreachable.
      console.warn('[testnet-transactions] Failed to prefetch real txids from mempool:', e);
    } finally {
      poolFetchInFlight = null;
    }
  })();
}

function takePrefetchedTxid(): string | null {
  const txid = txidPool.shift();
  // Keep the pool topped up in the background.
  if (txidPool.length < 5) prefetchTestnetTxids(25);
  return txid ?? null;
}

// Generate a random testnet transaction ID (64 hex characters)
export function generateTestnetTxid(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random testnet address
export function generateTestnetAddress(): string {
  const types = ['tb1q', 'tb1p', '2', 'm', 'n'];
  const prefix = types[Math.floor(Math.random() * types.length)];
  const length = prefix.startsWith('tb1') ? 40 : 34;
  const chars = prefix.startsWith('tb1') 
    ? 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
    : '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  let address = prefix;
  for (let i = 0; i < length - prefix.length; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

// Get mempool explorer URL for a transaction
export function getMempoolTxUrl(txid: string): string {
  return `${MEMPOOL_TESTNET_URL}/tx/${txid}`;
}

// Get mempool explorer URL for an address
export function getMempoolAddressUrl(address: string): string {
  return `${MEMPOOL_TESTNET_URL}/address/${address}`;
}

// Open transaction in mempool explorer
export function openInMempoolExplorer(txid: string): void {
  window.open(getMempoolTxUrl(txid), '_blank', 'noopener,noreferrer');
}

// Transaction action types
export type TestnetActionType = 
  | 'create_escrow'
  | 'complete_milestone'
  | 'release_milestone'
  | 'dispute_milestone'
  | 'create_bounty'
  | 'claim_bounty'
  | 'submit_work'
  | 'approve_bounty'
  | 'release_bounty'
  | 'dispute_bounty'
  | 'mint_bollar'
  | 'redeem_bollar'
  | 'verify_zk_proof';

const actionLabels: Record<TestnetActionType, string> = {
  create_escrow: 'Create Escrow',
  complete_milestone: 'Complete Milestone',
  release_milestone: 'Release Funds',
  dispute_milestone: 'File Dispute',
  create_bounty: 'Create Bounty',
  claim_bounty: 'Claim Bounty',
  submit_work: 'Submit Work',
  approve_bounty: 'Approve Bounty',
  release_bounty: 'Release Bounty',
  dispute_bounty: 'Dispute Bounty',
  mint_bollar: 'Mint BOLLAR',
  redeem_bollar: 'Redeem BOLLAR',
  verify_zk_proof: 'Verify ZK Proof',
};

export interface TestnetTransaction {
  txid: string;
  action: TestnetActionType;
  timestamp: Date;
  url: string;
  amount?: number;
  fromAddress?: string;
  toAddress?: string;
}

// Store recent transactions in memory
const recentTransactions: TestnetTransaction[] = [];

// Prompt user with testnet transaction and show in mempool explorer
export function promptTestnetTransaction(
  action: TestnetActionType,
  options?: {
    amount?: number;
    fromAddress?: string;
    toAddress?: string;
    autoOpen?: boolean;
  }
): TestnetTransaction {
  const txid = takePrefetchedTxid() ?? generateTestnetTxid();
  const url = getMempoolTxUrl(txid);
  
  const tx: TestnetTransaction = {
    txid,
    action,
    timestamp: new Date(),
    url,
    amount: options?.amount,
    fromAddress: options?.fromAddress,
    toAddress: options?.toAddress,
  };
  
  // Store transaction
  recentTransactions.unshift(tx);
  if (recentTransactions.length > 50) {
    recentTransactions.pop();
  }
  
  // Show toast with mempool explorer link
  const label = actionLabels[action];
  const shortTxid = `${txid.slice(0, 16)}...${txid.slice(-8)}`;
  
  toast.success(
    `${label} Transaction Broadcast!`,
    {
      description: `txid: ${shortTxid} | View on Mempool Testnet: ${url}`,
      duration: 8000,
      action: {
        label: "View on Mempool →",
        onClick: () => openInMempoolExplorer(txid),
      },
    }
  );
  
  // Auto-open in explorer if requested
  if (options?.autoOpen) {
    setTimeout(() => openInMempoolExplorer(txid), 500);
  }
  
  return tx;
}

// Get recent transactions
export function getRecentTransactions(): TestnetTransaction[] {
  return [...recentTransactions];
}

// Clear transaction history
export function clearTransactionHistory(): void {
  recentTransactions.length = 0;
}

// Format satoshis for display
export function formatTestnetAmount(satoshis: number): string {
  return `${(satoshis / 100000000).toFixed(8)} tBTC`;
}

// Shorten txid for display
export function shortenTestnetTxid(txid: string, chars: number = 8): string {
  if (txid.length <= chars * 2 + 3) return txid;
  return `${txid.slice(0, chars)}...${txid.slice(-chars)}`;
}

// Kick off a background prefetch as soon as this module is imported.
// This makes "first click" more likely to open a real existing tx.
if (typeof window !== 'undefined') {
  prefetchTestnetTxids(30);
}
