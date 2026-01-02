/**
 * Rust Spell Checker Bridge - TypeScript implementation mirroring Rust SDK patterns
 * 
 * This module bridges the Rust charmix spell checkers to TypeScript for use in the UI.
 * Implements token, NFT, and escrow validation logic from src/rust/charmix/lib.rs
 */

import { getrandom, bytesToHex, hexToBytes, sha256Sync } from './rust-zk-prover';

// ============================================================================
// Core Data Types (mirrors charms_data crate)
// ============================================================================

export interface App {
  tag: string;
  vkHash: Uint8Array; // 32 bytes
  params: Data;
}

export type Data = 
  | { type: 'empty' }
  | { type: 'bool'; value: boolean }
  | { type: 'u64'; value: bigint }
  | { type: 'i64'; value: bigint }
  | { type: 'bytes'; value: Uint8Array }
  | { type: 'string'; value: string }
  | { type: 'list'; value: Data[] }
  | { type: 'map'; value: Map<string, Data> };

export interface Transaction {
  txid: Uint8Array; // 32 bytes
  inputs: TxInput[];
  outputs: TxOutput[];
  spell?: NormalizedSpell;
}

export interface TxInput {
  utxoRef: UtxoRef;
  charmState?: CharmState;
}

export interface TxOutput {
  index: number;
  value: bigint;
  scriptPubkey: Uint8Array;
  charmState?: CharmState;
}

export interface UtxoRef {
  txid: Uint8Array;
  vout: number;
}

export interface CharmState {
  apps: Map<string, Data>;
}

export interface NormalizedSpell {
  version: number;
  ins: SpellInput[];
  outs: SpellOutput[];
}

export interface SpellInput {
  utxoRef: UtxoRef;
  charms?: CharmState;
}

export interface SpellOutput {
  index: number;
  charms?: CharmState;
}

// ============================================================================
// Data Helpers
// ============================================================================

export const Data = {
  empty(): Data { return { type: 'empty' }; },
  bool(v: boolean): Data { return { type: 'bool', value: v }; },
  u64(v: bigint | number): Data { return { type: 'u64', value: BigInt(v) }; },
  i64(v: bigint | number): Data { return { type: 'i64', value: BigInt(v) }; },
  bytes(v: Uint8Array): Data { return { type: 'bytes', value: v }; },
  string(v: string): Data { return { type: 'string', value: v }; },
  list(v: Data[]): Data { return { type: 'list', value: v }; },
  map(v: Map<string, Data>): Data { return { type: 'map', value: v }; },

  asU64(d: Data): bigint | null {
    return d.type === 'u64' ? d.value : null;
  },
  asBytes(d: Data): Uint8Array | null {
    return d.type === 'bytes' ? d.value : null;
  },
  asString(d: Data): string | null {
    return d.type === 'string' ? d.value : null;
  },
  isEmpty(d: Data): boolean {
    return d.type === 'empty';
  },
};

export function createCharmState(): CharmState {
  return { apps: new Map() };
}

export function withAppState(state: CharmState, tag: string, data: Data): CharmState {
  const newState = { apps: new Map(state.apps) };
  newState.apps.set(tag, data);
  return newState;
}

// ============================================================================
// Token Spell Checker (mirrors charmix::token)
// ============================================================================

export interface TokenCheckResult {
  valid: boolean;
  inputSum: bigint;
  outputSum: bigint;
  conserved: boolean;
  authorized: boolean;
  errors: string[];
}

export function tokenCheck(app: App, tx: Transaction, x: Data, _w: Data): TokenCheckResult {
  const appTag = app.tag;
  const errors: string[] = [];

  // Sum input token amounts
  let inputSum = 0n;
  for (const input of tx.inputs) {
    if (input.charmState) {
      const tokenData = input.charmState.apps.get(appTag);
      if (tokenData) {
        const amount = Data.asU64(tokenData);
        if (amount !== null) {
          inputSum += amount;
        }
      }
    }
  }

  // Sum output token amounts
  let outputSum = 0n;
  for (const output of tx.outputs) {
    if (output.charmState) {
      const tokenData = output.charmState.apps.get(appTag);
      if (tokenData) {
        const amount = Data.asU64(tokenData);
        if (amount !== null) {
          outputSum += amount;
        }
      }
    }
  }

  // Check conservation rule
  const conserved = inputSum === outputSum;
  if (!conserved) {
    errors.push(`Token conservation failed: input ${inputSum} ≠ output ${outputSum}`);
  }

  // Check authorization
  const authBytes = Data.asBytes(x);
  const authorized = authBytes !== null && authBytes.length > 0;
  if (!authorized && !Data.isEmpty(x)) {
    errors.push('Missing authorization signature');
  }

  return {
    valid: conserved && (authorized || Data.isEmpty(x)),
    inputSum,
    outputSum,
    conserved,
    authorized,
    errors,
  };
}

export function isTokenMint(app: App, tx: Transaction): boolean {
  const appTag = app.tag;

  const hasInputTokens = tx.inputs.some(input =>
    input.charmState?.apps.has(appTag) ?? false
  );

  const hasOutputTokens = tx.outputs.some(output =>
    output.charmState?.apps.has(appTag) ?? false
  );

  return !hasInputTokens && hasOutputTokens;
}

export function isTokenBurn(app: App, tx: Transaction): boolean {
  const appTag = app.tag;

  let inputSum = 0n;
  let outputSum = 0n;

  for (const input of tx.inputs) {
    const amount = input.charmState?.apps.get(appTag);
    if (amount) {
      const v = Data.asU64(amount);
      if (v !== null) inputSum += v;
    }
  }

  for (const output of tx.outputs) {
    const amount = output.charmState?.apps.get(appTag);
    if (amount) {
      const v = Data.asU64(amount);
      if (v !== null) outputSum += v;
    }
  }

  return inputSum > outputSum;
}

// ============================================================================
// NFT Spell Checker (mirrors charmix::nft)
// ============================================================================

export interface NFTData {
  id: Uint8Array; // 32 bytes
  metadataHash: Uint8Array;
  creator: Uint8Array;
}

export interface NFTCheckResult {
  valid: boolean;
  inputNFTs: string[];
  outputNFTs: string[];
  duplicates: string[];
  unauthorizedMints: string[];
  errors: string[];
}

export function nftCheck(app: App, tx: Transaction, x: Data, _w: Data): NFTCheckResult {
  const appTag = app.tag;
  const errors: string[] = [];

  // Collect input NFT IDs
  const inputNFTs: string[] = [];
  for (const input of tx.inputs) {
    const nftData = input.charmState?.apps.get(appTag);
    if (nftData) {
      const bytes = Data.asBytes(nftData);
      if (bytes) inputNFTs.push(bytesToHex(bytes));
    }
  }

  // Collect output NFT IDs
  const outputNFTs: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const output of tx.outputs) {
    const nftData = output.charmState?.apps.get(appTag);
    if (nftData) {
      const bytes = Data.asBytes(nftData);
      if (bytes) {
        const hex = bytesToHex(bytes);
        if (seen.has(hex)) {
          duplicates.push(hex);
        }
        seen.add(hex);
        outputNFTs.push(hex);
      }
    }
  }

  if (duplicates.length > 0) {
    errors.push(`Duplicate NFTs in outputs: ${duplicates.join(', ')}`);
  }

  // Check for unauthorized mints
  const unauthorizedMints: string[] = [];
  for (const nft of outputNFTs) {
    if (!inputNFTs.includes(nft)) {
      // This is a mint - needs authorization
      if (Data.isEmpty(x)) {
        unauthorizedMints.push(nft);
      }
    }
  }

  if (unauthorizedMints.length > 0) {
    errors.push(`Unauthorized mints: ${unauthorizedMints.length}`);
  }

  return {
    valid: duplicates.length === 0 && unauthorizedMints.length === 0,
    inputNFTs,
    outputNFTs,
    duplicates,
    unauthorizedMints,
    errors,
  };
}

// ============================================================================
// Escrow Spell Checker (mirrors charmix::escrow)
// ============================================================================

export enum EscrowState {
  Created = 0,
  Funded = 1,
  Released = 2,
  Disputed = 3,
  Refunded = 4,
  // MilestoneCompleted states: 100 + milestone_index
}

export interface EscrowCheckResult {
  valid: boolean;
  currentState: EscrowState | null;
  nextState: EscrowState | null;
  transitionValid: boolean;
  errors: string[];
}

function parseEscrowState(data: Data): EscrowState | null {
  const value = Data.asU64(data);
  if (value === null) return null;

  const n = Number(value);
  switch (n) {
    case 0: return EscrowState.Created;
    case 1: return EscrowState.Funded;
    case 2: return EscrowState.Released;
    case 3: return EscrowState.Disputed;
    case 4: return EscrowState.Refunded;
    default:
      if (n >= 100) {
        // MilestoneCompleted state
        return n as EscrowState;
      }
      return null;
  }
}

function isValidTransition(current: EscrowState | null, next: EscrowState | null): boolean {
  if (current === null && next === EscrowState.Created) return true;
  if (current === EscrowState.Created && next === EscrowState.Funded) return true;
  if (current === EscrowState.Funded && next !== null && next >= 100) return true; // MilestoneCompleted
  if (current !== null && current >= 100 && next === EscrowState.Released) return true;
  if (current === EscrowState.Funded && next === EscrowState.Disputed) return true;
  if (current === EscrowState.Disputed && next === EscrowState.Refunded) return true;
  if (current === EscrowState.Disputed && next === EscrowState.Released) return true;
  return false;
}

export function escrowCheck(app: App, tx: Transaction, x: Data, _w: Data): EscrowCheckResult {
  const appTag = app.tag;
  const errors: string[] = [];

  // Get current state from inputs
  let currentState: EscrowState | null = null;
  for (const input of tx.inputs) {
    const stateData = input.charmState?.apps.get(appTag);
    if (stateData) {
      currentState = parseEscrowState(stateData);
      break;
    }
  }

  // Get next state from outputs
  let nextState: EscrowState | null = null;
  for (const output of tx.outputs) {
    const stateData = output.charmState?.apps.get(appTag);
    if (stateData) {
      nextState = parseEscrowState(stateData);
      break;
    }
  }

  const transitionValid = isValidTransition(currentState, nextState);
  if (!transitionValid) {
    errors.push(`Invalid state transition: ${currentState} → ${nextState}`);
  }

  return {
    valid: transitionValid,
    currentState,
    nextState,
    transitionValid,
    errors,
  };
}

export function getEscrowStateName(state: EscrowState | null): string {
  if (state === null) return 'None';
  if (state >= 100) return `MilestoneCompleted(${state - 100})`;
  
  switch (state) {
    case EscrowState.Created: return 'Created';
    case EscrowState.Funded: return 'Funded';
    case EscrowState.Released: return 'Released';
    case EscrowState.Disputed: return 'Disputed';
    case EscrowState.Refunded: return 'Refunded';
    default: return 'Unknown';
  }
}

// ============================================================================
// Unified Spell Checker (routes to appropriate checker)
// ============================================================================

export type SpellType = 'token' | 'nft' | 'escrow' | 'bounty' | 'bollar';

export interface SpellCheckResult {
  type: SpellType;
  valid: boolean;
  details: TokenCheckResult | NFTCheckResult | EscrowCheckResult;
  proofHash: string;
  timestamp: number;
}

export function checkSpell(
  app: App,
  tx: Transaction,
  x: Data = Data.empty(),
  w: Data = Data.empty()
): SpellCheckResult {
  const appTag = app.tag.toLowerCase();
  
  let type: SpellType;
  let details: TokenCheckResult | NFTCheckResult | EscrowCheckResult;
  
  if (appTag.startsWith('token:') || appTag.startsWith('bollar:')) {
    type = appTag.startsWith('bollar:') ? 'bollar' : 'token';
    details = tokenCheck(app, tx, x, w);
  } else if (appTag.startsWith('nft:')) {
    type = 'nft';
    details = nftCheck(app, tx, x, w);
  } else if (appTag.startsWith('escrow:') || appTag.startsWith('bounty:')) {
    type = appTag.startsWith('bounty:') ? 'bounty' : 'escrow';
    details = escrowCheck(app, tx, x, w);
  } else {
    // Default to token checker
    type = 'token';
    details = tokenCheck(app, tx, x, w);
  }

  // Generate proof hash
  const txBytes = new TextEncoder().encode(JSON.stringify({
    txid: bytesToHex(tx.txid),
    inputs: tx.inputs.length,
    outputs: tx.outputs.length,
  }));
  const proofHash = bytesToHex(sha256Sync(txBytes));

  return {
    type,
    valid: details.valid,
    details,
    proofHash,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Builder Functions
// ============================================================================

export function buildTokenTransaction(params: {
  appTag: string;
  vkHash: string;
  inputAmounts: bigint[];
  outputAmounts: bigint[];
}): { app: App; tx: Transaction } {
  const vkResult = hexToBytes(params.vkHash);
  const vkHash = vkResult.ok ? vkResult.value : new Uint8Array(32);
  
  const app: App = {
    tag: params.appTag,
    vkHash,
    params: Data.empty(),
  };

  const txidResult = getrandom.getBytes(32);
  const txid = txidResult.ok ? txidResult.value : new Uint8Array(32);

  const tx: Transaction = {
    txid,
    inputs: params.inputAmounts.map((amount, i) => ({
      utxoRef: { txid: new Uint8Array(32), vout: i },
      charmState: withAppState(createCharmState(), params.appTag, Data.u64(amount)),
    })),
    outputs: params.outputAmounts.map((amount, i) => ({
      index: i,
      value: 546n,
      scriptPubkey: new Uint8Array([0x00, 0x14]),
      charmState: withAppState(createCharmState(), params.appTag, Data.u64(amount)),
    })),
  };

  return { app, tx };
}

export function buildEscrowTransaction(params: {
  appTag: string;
  currentState?: EscrowState;
  nextState: EscrowState;
  amount: bigint;
}): { app: App; tx: Transaction } {
  const vkResult = getrandom.getBytes(32);
  const vkHash = vkResult.ok ? vkResult.value : new Uint8Array(32);

  const app: App = {
    tag: params.appTag,
    vkHash,
    params: Data.empty(),
  };

  const txidResult = getrandom.getBytes(32);
  const txid = txidResult.ok ? txidResult.value : new Uint8Array(32);

  const tx: Transaction = {
    txid,
    inputs: params.currentState !== undefined ? [{
      utxoRef: { txid: new Uint8Array(32), vout: 0 },
      charmState: withAppState(createCharmState(), params.appTag, Data.u64(BigInt(params.currentState))),
    }] : [{
      utxoRef: { txid: new Uint8Array(32), vout: 0 },
      charmState: undefined,
    }],
    outputs: [{
      index: 0,
      value: params.amount,
      scriptPubkey: new Uint8Array([0x00, 0x14]),
      charmState: withAppState(createCharmState(), params.appTag, Data.u64(BigInt(params.nextState))),
    }],
  };

  return { app, tx };
}

// ============================================================================
// Exports for hooks
// ============================================================================

export const RustSpellChecker = {
  checkSpell,
  tokenCheck,
  nftCheck,
  escrowCheck,
  isTokenMint,
  isTokenBurn,
  getEscrowStateName,
  buildTokenTransaction,
  buildEscrowTransaction,
  Data,
  EscrowState,
};
