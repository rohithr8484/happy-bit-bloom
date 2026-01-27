// Spell Checker Edge Function - HTTP API for All Rust Charms Modules
// Exposes charms-data, charms-sdk, and charmix functionality via REST API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Module Versions
// ============================================

const VERSIONS = {
  charmsData: '0.10.0',
  charmsSDK: '0.10.0',
  charmix: '0.1.0',
  api: '2.0.0',
};

// ============================================
// CHARMS-DATA Types
// ============================================

interface App {
  tag: string;
  vk_hash: string;
  params?: DataType;
}

interface UtxoRef {
  txid: string;
  vout: number;
}

interface CharmState {
  apps: Record<string, DataType>;
}

interface TxInput {
  utxo_ref: UtxoRef;
  charm_state: CharmState | null;
}

interface TxOutput {
  index: number;
  value: number;
  script_pubkey: string;
  charm_state: CharmState | null;
}

interface Transaction {
  txid: string;
  inputs: TxInput[];
  outputs: TxOutput[];
}

type DataType =
  | { type: 'empty' }
  | { type: 'bool'; value: boolean }
  | { type: 'u64'; value: number }
  | { type: 'i64'; value: number }
  | { type: 'bytes'; value: string }
  | { type: 'string'; value: string }
  | { type: 'list'; value: DataType[] }
  | { type: 'map'; value: Record<string, DataType> };

interface SpellInput {
  utxo_ref: UtxoRef;
  charms: CharmState | null;
}

interface SpellOutput {
  index: number;
  charms: CharmState | null;
}

interface NormalizedSpell {
  version: number;
  ins: SpellInput[];
  outs: SpellOutput[];
}

// ============================================
// CHARMS-DATA Functions
// ============================================

const CharmsDataAPI = {
  createEmpty: (): DataType => ({ type: 'empty' }),
  createBool: (value: boolean): DataType => ({ type: 'bool', value }),
  createU64: (value: number): DataType => ({ type: 'u64', value }),
  createI64: (value: number): DataType => ({ type: 'i64', value }),
  createBytes: (value: string): DataType => ({ type: 'bytes', value }),
  createString: (value: string): DataType => ({ type: 'string', value }),
  createList: (value: DataType[]): DataType => ({ type: 'list', value }),
  createMap: (value: Record<string, DataType>): DataType => ({ type: 'map', value }),
  
  asU64: (data: DataType | null): number | null => {
    if (!data || data.type !== 'u64') return null;
    return data.value;
  },
  asBytes: (data: DataType | null): string | null => {
    if (!data || data.type !== 'bytes') return null;
    return data.value;
  },
  isEmpty: (data: DataType | null): boolean => {
    return !data || data.type === 'empty';
  },
  
  validateCharmState: (state: unknown): boolean => {
    if (!state || typeof state !== 'object') return false;
    return 'apps' in (state as object);
  },
  validateTransaction: (tx: unknown): boolean => {
    if (!tx || typeof tx !== 'object') return false;
    const t = tx as Record<string, unknown>;
    return typeof t.txid === 'string' && Array.isArray(t.inputs) && Array.isArray(t.outputs);
  },
};

// ============================================
// CHARMS-SDK Functions
// ============================================

interface SpellVerifyResult {
  valid: boolean;
  version: number;
  inputCount: number;
  outputCount: number;
  errors: string[];
}

const CharmsSDKAPI = {
  verifySpell: (spell: NormalizedSpell): SpellVerifyResult => {
    const errors: string[] = [];
    
    if (spell.version <= 0) {
      errors.push('Invalid spell version');
    }
    if (spell.ins.length === 0) {
      errors.push('Spell must have at least one input');
    }
    if (spell.outs.length === 0) {
      errors.push('Spell must have at least one output');
    }
    
    return {
      valid: errors.length === 0,
      version: spell.version,
      inputCount: spell.ins.length,
      outputCount: spell.outs.length,
      errors,
    };
  },
  
  createApp: (tag: string, vk_hash: string, params?: DataType): App => ({
    tag,
    vk_hash,
    params: params ?? { type: 'empty' },
  }),
};

// ============================================
// CHARMIX: State Enums
// ============================================

enum EscrowState {
  Created = 0,
  Funded = 1,
  Released = 2,
  Disputed = 3,
  Refunded = 4,
}

enum BountyState {
  Open = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  Disputed = 4,
}

// ============================================
// CHARMIX: Spell Check Results
// ============================================

interface CheckResult {
  valid: boolean;
  spellType: 'token' | 'nft' | 'escrow' | 'bounty' | 'bollar' | 'unknown';
  details: {
    inputSum?: number;
    outputSum?: number;
    isMint?: boolean;
    isBurn?: boolean;
    currentState?: string;
    nextState?: string;
    stateTransitionValid?: boolean;
    nftIds?: string[];
    duplicateNfts?: string[];
  };
  errors: string[];
}

// ============================================
// CHARMIX: Helper Functions
// ============================================

function getStateData(state: CharmState | null, appTag: string): DataType | null {
  if (!state || !state.apps) return null;
  return state.apps[appTag] || null;
}

// ============================================
// CHARMIX: Token Checker
// ============================================

function checkToken(app: App, tx: Transaction, x: DataType, _w: DataType): CheckResult {
  const appTag = app.tag;
  const errors: string[] = [];

  let inputSum = 0;
  for (const input of tx.inputs) {
    const amount = CharmsDataAPI.asU64(getStateData(input.charm_state, appTag));
    if (amount !== null) inputSum += amount;
  }

  let outputSum = 0;
  for (const output of tx.outputs) {
    const amount = CharmsDataAPI.asU64(getStateData(output.charm_state, appTag));
    if (amount !== null) outputSum += amount;
  }

  if (inputSum !== outputSum) {
    errors.push(`Token conservation failed: input=${inputSum} != output=${outputSum}`);
  }

  if (x.type === 'bytes' && x.value.length === 0) {
    errors.push('Empty authorization data');
  }

  return {
    valid: errors.length === 0,
    spellType: 'token',
    details: {
      inputSum,
      outputSum,
      isMint: inputSum === 0 && outputSum > 0,
      isBurn: inputSum > outputSum,
    },
    errors,
  };
}

// ============================================
// CHARMIX: NFT Checker
// ============================================

function checkNft(app: App, tx: Transaction, x: DataType, _w: DataType): CheckResult {
  const appTag = app.tag;
  const errors: string[] = [];
  const inputNfts: string[] = [];
  const outputNfts: string[] = [];
  const duplicateNfts: string[] = [];

  for (const input of tx.inputs) {
    const nftId = CharmsDataAPI.asBytes(getStateData(input.charm_state, appTag));
    if (nftId) inputNfts.push(nftId);
  }

  const seen = new Set<string>();
  for (const output of tx.outputs) {
    const nftId = CharmsDataAPI.asBytes(getStateData(output.charm_state, appTag));
    if (nftId) {
      if (seen.has(nftId)) {
        duplicateNfts.push(nftId);
        errors.push(`Duplicate NFT in outputs: ${nftId}`);
      }
      seen.add(nftId);
      outputNfts.push(nftId);
    }
  }

  for (const nft of outputNfts) {
    if (!inputNfts.includes(nft)) {
      if (CharmsDataAPI.isEmpty(x)) {
        errors.push(`NFT mint without authorization: ${nft}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    spellType: 'nft',
    details: {
      nftIds: outputNfts,
      duplicateNfts,
    },
    errors,
  };
}

// ============================================
// CHARMIX: Escrow Checker
// ============================================

function checkEscrow(app: App, tx: Transaction, _x: DataType, _w: DataType): CheckResult {
  const appTag = app.tag;
  const errors: string[] = [];
  const stateNames = ['Created', 'Funded', 'Released', 'Disputed', 'Refunded'];

  let currentState: number | null = null;
  for (const input of tx.inputs) {
    const value = CharmsDataAPI.asU64(getStateData(input.charm_state, appTag));
    if (value !== null) {
      currentState = value;
      break;
    }
  }

  let nextState: number | null = null;
  for (const output of tx.outputs) {
    const value = CharmsDataAPI.asU64(getStateData(output.charm_state, appTag));
    if (value !== null) {
      nextState = value;
      break;
    }
  }

  const validTransitions: Array<[number | null, number | null]> = [
    [null, EscrowState.Created],
    [EscrowState.Created, EscrowState.Funded],
    [EscrowState.Funded, EscrowState.Released],
    [EscrowState.Funded, EscrowState.Disputed],
    [EscrowState.Disputed, EscrowState.Refunded],
    [EscrowState.Disputed, EscrowState.Released],
  ];

  // Milestone transitions (100+)
  const isMilestoneTransition = currentState === EscrowState.Funded && nextState !== null && nextState >= 100;
  const isMilestoneToRelease = currentState !== null && currentState >= 100 && nextState === EscrowState.Released;

  const isValid = validTransitions.some(([from, to]) => from === currentState && to === nextState)
    || isMilestoneTransition
    || isMilestoneToRelease;

  if (!isValid) {
    const currentName = currentState !== null ? (currentState >= 100 ? `Milestone(${currentState - 100})` : stateNames[currentState]) : 'None';
    const nextName = nextState !== null ? (nextState >= 100 ? `Milestone(${nextState - 100})` : stateNames[nextState]) : 'None';
    errors.push(`Invalid escrow transition: ${currentName} -> ${nextName}`);
  }

  return {
    valid: isValid,
    spellType: 'escrow',
    details: {
      currentState: currentState !== null ? (currentState >= 100 ? `Milestone(${currentState - 100})` : stateNames[currentState]) : 'None',
      nextState: nextState !== null ? (nextState >= 100 ? `Milestone(${nextState - 100})` : stateNames[nextState]) : 'None',
      stateTransitionValid: isValid,
    },
    errors,
  };
}

// ============================================
// CHARMIX: Bounty Checker
// ============================================

function checkBounty(app: App, tx: Transaction, _x: DataType, _w: DataType): CheckResult {
  const appTag = app.tag;
  const errors: string[] = [];
  const stateNames = ['Open', 'InProgress', 'Completed', 'Cancelled', 'Disputed'];

  let currentState: number | null = null;
  for (const input of tx.inputs) {
    const value = CharmsDataAPI.asU64(getStateData(input.charm_state, appTag));
    if (value !== null) {
      currentState = value;
      break;
    }
  }

  let nextState: number | null = null;
  for (const output of tx.outputs) {
    const value = CharmsDataAPI.asU64(getStateData(output.charm_state, appTag));
    if (value !== null) {
      nextState = value;
      break;
    }
  }

  const validTransitions: Array<[number | null, number | null]> = [
    [null, BountyState.Open],
    [BountyState.Open, BountyState.InProgress],
    [BountyState.InProgress, BountyState.Completed],
    [BountyState.Open, BountyState.Cancelled],
    [BountyState.InProgress, BountyState.Disputed],
    [BountyState.Disputed, BountyState.Completed],
    [BountyState.Disputed, BountyState.Cancelled],
  ];

  const isValid = validTransitions.some(([from, to]) => from === currentState && to === nextState);

  if (!isValid) {
    errors.push(`Invalid bounty transition: ${stateNames[currentState ?? 0] ?? 'None'} -> ${stateNames[nextState ?? 0] ?? 'None'}`);
  }

  return {
    valid: isValid,
    spellType: 'bounty',
    details: {
      currentState: currentState !== null ? stateNames[currentState] : 'None',
      nextState: nextState !== null ? stateNames[nextState] : 'None',
      stateTransitionValid: isValid,
    },
    errors,
  };
}

// ============================================
// CHARMIX: Bollar (Stablecoin) Checker
// ============================================

function checkBollar(app: App, tx: Transaction, x: DataType, w: DataType): CheckResult {
  const tokenResult = checkToken(app, tx, x, w);
  return {
    ...tokenResult,
    spellType: 'bollar',
  };
}

// ============================================
// CHARMIX: Unified Spell Checker
// ============================================

function checkSpell(
  app: App,
  tx: Transaction,
  x: DataType = { type: 'empty' },
  w: DataType = { type: 'empty' }
): CheckResult {
  const tag = app.tag.toLowerCase();

  if (tag.startsWith('token:')) {
    return checkToken(app, tx, x, w);
  } else if (tag.startsWith('nft:')) {
    return checkNft(app, tx, x, w);
  } else if (tag.startsWith('escrow:')) {
    return checkEscrow(app, tx, x, w);
  } else if (tag.startsWith('bounty:')) {
    return checkBounty(app, tx, x, w);
  } else if (tag.startsWith('bollar:')) {
    return checkBollar(app, tx, x, w);
  }

  return {
    valid: false,
    spellType: 'unknown',
    details: {},
    errors: [`Unknown app type: ${app.tag}`],
  };
}

// ============================================
// BUILDERS: Transaction Builders
// ============================================

function buildTokenTransaction(params: {
  appTag: string;
  vkHash: string;
  inputAmounts: number[];
  outputAmounts: number[];
}): { app: App; tx: Transaction } {
  const app: App = {
    tag: params.appTag,
    vk_hash: params.vkHash,
  };

  const tx: Transaction = {
    txid: crypto.randomUUID().replace(/-/g, '').padEnd(64, '0'),
    inputs: params.inputAmounts.map((amount, i) => ({
      utxo_ref: { txid: '0'.repeat(64), vout: i },
      charm_state: {
        apps: { [params.appTag]: { type: 'u64' as const, value: amount } }
      }
    })),
    outputs: params.outputAmounts.map((amount, i) => ({
      index: i,
      value: 546,
      script_pubkey: '0014',
      charm_state: {
        apps: { [params.appTag]: { type: 'u64' as const, value: amount } }
      }
    }))
  };

  return { app, tx };
}

function buildEscrowTransaction(params: {
  appTag: string;
  currentState?: EscrowState;
  nextState: EscrowState;
  amount: number;
}): { app: App; tx: Transaction } {
  const app: App = {
    tag: params.appTag,
    vk_hash: '0'.repeat(64),
  };

  const tx: Transaction = {
    txid: crypto.randomUUID().replace(/-/g, '').padEnd(64, '0'),
    inputs: params.currentState !== undefined ? [{
      utxo_ref: { txid: '0'.repeat(64), vout: 0 },
      charm_state: {
        apps: { [params.appTag]: { type: 'u64' as const, value: params.currentState } }
      }
    }] : [{
      utxo_ref: { txid: '0'.repeat(64), vout: 0 },
      charm_state: null
    }],
    outputs: [{
      index: 0,
      value: params.amount,
      script_pubkey: '',
      charm_state: {
        apps: { [params.appTag]: { type: 'u64' as const, value: params.nextState } }
      }
    }]
  };

  return { app, tx };
}

function buildBountyTransaction(params: {
  appTag: string;
  currentState?: BountyState;
  nextState: BountyState;
  amount: number;
}): { app: App; tx: Transaction } {
  const app: App = {
    tag: params.appTag,
    vk_hash: '0'.repeat(64),
  };

  const tx: Transaction = {
    txid: crypto.randomUUID().replace(/-/g, '').padEnd(64, '0'),
    inputs: params.currentState !== undefined ? [{
      utxo_ref: { txid: '0'.repeat(64), vout: 0 },
      charm_state: {
        apps: { [params.appTag]: { type: 'u64' as const, value: params.currentState } }
      }
    }] : [{
      utxo_ref: { txid: '0'.repeat(64), vout: 0 },
      charm_state: null
    }],
    outputs: [{
      index: 0,
      value: params.amount,
      script_pubkey: '',
      charm_state: {
        apps: { [params.appTag]: { type: 'u64' as const, value: params.nextState } }
      }
    }]
  };

  return { app, tx };
}

function buildNftTransaction(params: {
  appTag: string;
  inputNfts: string[];
  outputNfts: string[];
}): { app: App; tx: Transaction } {
  const app: App = {
    tag: params.appTag,
    vk_hash: '0'.repeat(64),
  };

  const tx: Transaction = {
    txid: crypto.randomUUID().replace(/-/g, '').padEnd(64, '0'),
    inputs: params.inputNfts.map((nftId, i) => ({
      utxo_ref: { txid: '0'.repeat(64), vout: i },
      charm_state: {
        apps: { [params.appTag]: { type: 'bytes' as const, value: nftId } }
      }
    })),
    outputs: params.outputNfts.map((nftId, i) => ({
      index: i,
      value: 546,
      script_pubkey: '0014',
      charm_state: {
        apps: { [params.appTag]: { type: 'bytes' as const, value: nftId } }
      }
    }))
  };

  return { app, tx };
}

// ============================================
// ZK Proof Validation
// ============================================

function validateZKProof(params: {
  proofType: string;
  inputHash: string;
  outputHash: string;
  proofData: string;
  verificationKey: string;
}): CheckResult {
  const errors: string[] = [];
  
  // Validate proof structure
  if (!params.inputHash || params.inputHash.length < 64) {
    errors.push('Invalid input hash');
  }
  if (!params.outputHash || params.outputHash.length < 64) {
    errors.push('Invalid output hash');
  }
  if (!params.proofData || params.proofData.length < 10) {
    errors.push('Invalid proof data');
  }
  if (!params.verificationKey || params.verificationKey.length < 10) {
    errors.push('Invalid verification key');
  }
  
  // Validate proof type
  const validProofTypes = ['utxo_ownership', 'balance_threshold', 'transaction_inclusion', 'state_transition', 'collateral_ratio'];
  if (!validProofTypes.includes(params.proofType)) {
    errors.push(`Unknown proof type: ${params.proofType}`);
  }
  
  // Simulate RISC Zero proof verification
  const isValidProofFormat = params.proofData.startsWith('risc0_seal_v1_');
  if (!isValidProofFormat && errors.length === 0) {
    // Allow other formats but log
    console.log(`[spell-checker] Non-RISC0 proof format: ${params.proofData.slice(0, 20)}`);
  }
  
  return {
    valid: errors.length === 0,
    spellType: 'unknown',
    details: {
      inputSum: 1,
      outputSum: 1,
    },
    errors,
  };
}

// ============================================
// Bitcoin Address Validation
// ============================================

function validateBitcoinAddress(address: string): { valid: boolean; type: string; errors: string[] } {
  const errors: string[] = [];
  let type = 'unknown';
  
  if (!address || address.length < 26) {
    errors.push('Address too short');
    return { valid: false, type, errors };
  }
  
  // P2PKH (Legacy) - starts with 1
  if (address.startsWith('1')) {
    type = 'P2PKH';
    if (address.length < 26 || address.length > 35) {
      errors.push('Invalid P2PKH address length');
    }
  }
  // P2SH - starts with 3
  else if (address.startsWith('3')) {
    type = 'P2SH';
    if (address.length < 26 || address.length > 35) {
      errors.push('Invalid P2SH address length');
    }
  }
  // Native SegWit (Bech32) - starts with bc1q or tb1q
  else if (address.startsWith('bc1q') || address.startsWith('tb1q')) {
    type = 'P2WPKH';
    if (address.length !== 42 && address.length !== 62) {
      errors.push('Invalid Bech32 address length');
    }
  }
  // Taproot (Bech32m) - starts with bc1p or tb1p
  else if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
    type = 'P2TR';
    if (address.length !== 62) {
      errors.push('Invalid Taproot address length');
    }
  }
  // Testnet legacy - starts with m or n
  else if (address.startsWith('m') || address.startsWith('n')) {
    type = 'P2PKH_TESTNET';
    if (address.length < 26 || address.length > 35) {
      errors.push('Invalid testnet address length');
    }
  }
  // Testnet P2SH - starts with 2
  else if (address.startsWith('2')) {
    type = 'P2SH_TESTNET';
    if (address.length < 26 || address.length > 35) {
      errors.push('Invalid testnet P2SH address length');
    }
  }
  else {
    errors.push('Unrecognized address format');
  }
  
  return { valid: errors.length === 0, type, errors };
}

// ============================================
// Transaction Validation
// ============================================

function validateTransactionId(txid: string): CheckResult {
  const errors: string[] = [];
  
  if (!txid || txid.length !== 64) {
    errors.push('Transaction ID must be 64 hex characters');
  }
  
  if (txid && !/^[a-fA-F0-9]{64}$/.test(txid)) {
    errors.push('Transaction ID must be valid hexadecimal');
  }
  
  return {
    valid: errors.length === 0,
    spellType: 'token',
    details: {},
    errors,
  };
}

// ============================================
// UTXO Validation
// ============================================

function validateUTXO(txid: string, vout: number): CheckResult {
  const errors: string[] = [];
  
  if (!txid || txid.length !== 64) {
    errors.push('Transaction ID must be 64 hex characters');
  }
  
  if (vout < 0 || vout > 65535) {
    errors.push('Output index must be between 0 and 65535');
  }
  
  return {
    valid: errors.length === 0,
    spellType: 'token',
    details: {
      inputSum: vout >= 0 ? 1 : 0,
      outputSum: 1,
    },
    errors,
  };
}

// ============================================
// HTTP Request Handler
// ============================================

interface APIRequest {
  // Module to call
  module?: 'data' | 'sdk' | 'charmix';
  
  // Action to perform
  action: string;
  
  // Parameters
  app?: App;
  tx?: Transaction;
  x?: DataType;
  w?: DataType;
  spell?: NormalizedSpell;
  params?: Record<string, unknown>;
  
  // Data module specific
  data?: DataType;
  value?: unknown;
  
  // New validation fields
  txid?: string;
  vout?: number;
  address?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);

    // GET requests - health/info endpoints
    if (req.method === 'GET') {
      const endpoint = path[path.length - 1];
      
      if (endpoint === 'health' || endpoint === 'spell-checker') {
        return jsonResponse({
          status: 'ok',
          versions: VERSIONS,
          modules: ['charms-data', 'charms-sdk', 'charmix'],
          supportedTypes: ['token', 'nft', 'escrow', 'bounty', 'bollar'],
        });
      }
      
      if (endpoint === 'versions') {
        return jsonResponse(VERSIONS);
      }
      
      if (endpoint === 'modules') {
        return jsonResponse({
          'charms-data': {
            version: VERSIONS.charmsData,
            actions: ['create_empty', 'create_u64', 'create_bytes', 'create_string', 'validate_charm_state', 'validate_transaction', 'validate_tx', 'validate_address', 'validate_utxo'],
          },
          'charms-sdk': {
            version: VERSIONS.charmsSDK,
            actions: ['verify_spell', 'create_app'],
          },
          'charmix': {
            version: VERSIONS.charmix,
            actions: ['check', 'check_token', 'check_nft', 'check_escrow', 'check_bounty', 'check_bollar', 'build_token', 'build_escrow', 'build_bounty', 'build_nft', 'validate_zk_proof'],
          },
        });
      }
    }

    // POST requests - main API
    if (req.method === 'POST') {
      const body: APIRequest = await req.json();
      const module = body.module || 'charmix'; // Default to charmix for backward compat
      
      console.log(`[spell-checker] ${module}/${body.action}`, JSON.stringify(body).slice(0, 200));

      // ========== CHARMS-DATA Module ==========
      if (module === 'data') {
        switch (body.action) {
          case 'create_empty':
            return jsonResponse({ data: CharmsDataAPI.createEmpty() });
          case 'create_bool':
            return jsonResponse({ data: CharmsDataAPI.createBool(body.value as boolean) });
          case 'create_u64':
            return jsonResponse({ data: CharmsDataAPI.createU64(body.value as number) });
          case 'create_i64':
            return jsonResponse({ data: CharmsDataAPI.createI64(body.value as number) });
          case 'create_bytes':
            return jsonResponse({ data: CharmsDataAPI.createBytes(body.value as string) });
          case 'create_string':
            return jsonResponse({ data: CharmsDataAPI.createString(body.value as string) });
          case 'validate_charm_state':
            return jsonResponse({ valid: CharmsDataAPI.validateCharmState(body.data) });
          case 'validate_transaction':
            return jsonResponse({ valid: CharmsDataAPI.validateTransaction(body.tx) });
          case 'validate_tx': {
            if (!body.txid) return errorResponse('Missing txid', 400);
            return jsonResponse(validateTransactionId(body.txid));
          }
          case 'validate_address': {
            if (!body.address) return errorResponse('Missing address', 400);
            return jsonResponse(validateBitcoinAddress(body.address));
          }
          case 'validate_utxo': {
            if (!body.txid) return errorResponse('Missing txid', 400);
            return jsonResponse(validateUTXO(body.txid, body.vout ?? 0));
          }
          case 'version':
            return jsonResponse({ version: VERSIONS.charmsData });
          default:
            return errorResponse(`Unknown data action: ${body.action}`, 400);
        }
      }

      // ========== CHARMS-SDK Module ==========
      if (module === 'sdk') {
        switch (body.action) {
          case 'verify_spell':
            if (!body.spell) return errorResponse('Missing spell', 400);
            return jsonResponse(CharmsSDKAPI.verifySpell(body.spell));
          case 'create_app':
            const appParams = body.params as { tag: string; vk_hash: string; params?: DataType };
            if (!appParams?.tag || !appParams?.vk_hash) return errorResponse('Missing tag or vk_hash', 400);
            return jsonResponse({ app: CharmsSDKAPI.createApp(appParams.tag, appParams.vk_hash, appParams.params) });
          case 'version':
            return jsonResponse({ version: VERSIONS.charmsSDK });
          default:
            return errorResponse(`Unknown sdk action: ${body.action}`, 400);
        }
      }

      // ========== CHARMIX Module ==========
      if (module === 'charmix' || !body.module) {
        switch (body.action) {
          case 'check': {
            if (!body.app || !body.tx) return errorResponse('Missing app or tx', 400);
            const result = checkSpell(body.app, body.tx, body.x ?? { type: 'empty' }, body.w ?? { type: 'empty' });
            return jsonResponse(result);
          }
          
          case 'check_token': {
            if (!body.app || !body.tx) return errorResponse('Missing app or tx', 400);
            return jsonResponse(checkToken(body.app, body.tx, body.x ?? { type: 'empty' }, body.w ?? { type: 'empty' }));
          }
          
          case 'check_nft': {
            if (!body.app || !body.tx) return errorResponse('Missing app or tx', 400);
            return jsonResponse(checkNft(body.app, body.tx, body.x ?? { type: 'empty' }, body.w ?? { type: 'empty' }));
          }
          
          case 'check_escrow': {
            if (!body.app || !body.tx) return errorResponse('Missing app or tx', 400);
            return jsonResponse(checkEscrow(body.app, body.tx, body.x ?? { type: 'empty' }, body.w ?? { type: 'empty' }));
          }
          
          case 'check_bounty': {
            if (!body.app || !body.tx) return errorResponse('Missing app or tx', 400);
            return jsonResponse(checkBounty(body.app, body.tx, body.x ?? { type: 'empty' }, body.w ?? { type: 'empty' }));
          }
          
          case 'check_bollar': {
            if (!body.app || !body.tx) return errorResponse('Missing app or tx', 400);
            return jsonResponse(checkBollar(body.app, body.tx, body.x ?? { type: 'empty' }, body.w ?? { type: 'empty' }));
          }
          
          case 'build_token': {
            const params = body.params as { appTag: string; vkHash: string; inputAmounts: number[]; outputAmounts: number[] };
            if (!params) return errorResponse('Missing params', 400);
            const { app, tx } = buildTokenTransaction(params);
            const checkResult = checkSpell(app, tx, { type: 'bytes', value: 'deadbeef' });
            return jsonResponse({ app, tx, checkResult });
          }
          
          case 'build_escrow': {
            const params = body.params as { appTag: string; currentState?: EscrowState; nextState: EscrowState; amount: number };
            if (!params) return errorResponse('Missing params', 400);
            const { app, tx } = buildEscrowTransaction(params);
            const checkResult = checkSpell(app, tx);
            return jsonResponse({ app, tx, checkResult });
          }
          
          case 'build_bounty': {
            const params = body.params as { appTag: string; currentState?: BountyState; nextState: BountyState; amount: number };
            if (!params) return errorResponse('Missing params', 400);
            const { app, tx } = buildBountyTransaction(params);
            const checkResult = checkSpell(app, tx);
            return jsonResponse({ app, tx, checkResult });
          }
          
          case 'build_nft': {
            const params = body.params as { appTag: string; inputNfts: string[]; outputNfts: string[] };
            if (!params) return errorResponse('Missing params', 400);
            const { app, tx } = buildNftTransaction(params);
            const checkResult = checkSpell(app, tx, { type: 'bytes', value: 'creator_sig' });
            return jsonResponse({ app, tx, checkResult });
          }
          
          case 'verify_spell': {
            if (!body.spell) return errorResponse('Missing spell', 400);
            return jsonResponse(CharmsSDKAPI.verifySpell(body.spell));
          }
          
          case 'validate_zk_proof': {
            const params = body.params as { proofType: string; inputHash: string; outputHash: string; proofData: string; verificationKey: string };
            if (!params) return errorResponse('Missing params', 400);
            return jsonResponse(validateZKProof(params));
          }
          
          case 'version':
            return jsonResponse({ version: VERSIONS.charmix });
          
          default:
            return errorResponse(`Unknown charmix action: ${body.action}`, 400);
        }
      }

      return errorResponse(`Unknown module: ${module}`, 400);
    }

    return errorResponse('Method not allowed', 405);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[spell-checker] Error:', message);
    return errorResponse(message, 500);
  }
});

// Helper functions
function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
