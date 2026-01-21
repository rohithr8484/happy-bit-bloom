// Spell Checker Edge Function - HTTP API for Rust Spell Checker Logic
// This exposes the Rust charmix spell checker logic via REST API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Rust-style Data Types (mirroring charms-data)
// ============================================

interface App {
  tag: string;
  vk_hash: string; // hex encoded 32-byte hash
  params?: DataType;
}

interface UtxoRef {
  txid: string; // hex encoded 32-byte txid
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
  script_pubkey: string; // hex encoded
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
  | { type: 'bytes'; value: string } // hex encoded
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
// Escrow States (from Rust escrow module)
// ============================================

enum EscrowState {
  Created = 0,
  Funded = 1,
  Released = 2,
  Disputed = 3,
  Refunded = 4,
  // MilestoneCompleted states start at 100
}

function parseEscrowState(value: number): EscrowState | null {
  if (value >= 0 && value <= 4) return value as EscrowState;
  if (value >= 100) return EscrowState.Released; // MilestoneCompleted maps to released for simplicity
  return null;
}

// ============================================
// Spell Checker Functions (from Rust charmix)
// ============================================

interface CheckResult {
  valid: boolean;
  spellType: 'token' | 'nft' | 'escrow' | 'unknown';
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

function getStateData(state: CharmState | null, appTag: string): DataType | null {
  if (!state || !state.apps) return null;
  return state.apps[appTag] || null;
}

function dataAsU64(data: DataType | null): number | null {
  if (!data || data.type !== 'u64') return null;
  return data.value;
}

function dataAsBytes(data: DataType | null): string | null {
  if (!data || data.type !== 'bytes') return null;
  return data.value;
}

// Token Spell Checker (Rust: charmix::token::check)
function checkToken(app: App, tx: Transaction, x: DataType, _w: DataType): CheckResult {
  const result: CheckResult = {
    valid: false,
    spellType: 'token',
    details: {},
    errors: []
  };

  const appTag = app.tag;

  // Sum input token amounts
  let inputSum = 0;
  for (const input of tx.inputs) {
    const stateData = getStateData(input.charm_state, appTag);
    const amount = dataAsU64(stateData);
    if (amount !== null) inputSum += amount;
  }

  // Sum output token amounts
  let outputSum = 0;
  for (const output of tx.outputs) {
    const stateData = getStateData(output.charm_state, appTag);
    const amount = dataAsU64(stateData);
    if (amount !== null) outputSum += amount;
  }

  result.details.inputSum = inputSum;
  result.details.outputSum = outputSum;

  // Check conservation rule
  if (inputSum !== outputSum) {
    result.errors.push(`Token conservation failed: input=${inputSum} != output=${outputSum}`);
  }

  // Check if mint or burn
  result.details.isMint = inputSum === 0 && outputSum > 0;
  result.details.isBurn = inputSum > outputSum;

  // Check authorization
  if (x.type === 'bytes' && x.value.length === 0) {
    result.errors.push('Empty authorization data');
  }

  result.valid = result.errors.length === 0;
  return result;
}

// NFT Spell Checker (Rust: charmix::nft::check)
function checkNft(app: App, tx: Transaction, x: DataType, _w: DataType): CheckResult {
  const result: CheckResult = {
    valid: false,
    spellType: 'nft',
    details: { nftIds: [], duplicateNfts: [] },
    errors: []
  };

  const appTag = app.tag;

  // Collect input NFT IDs
  const inputNfts: string[] = [];
  for (const input of tx.inputs) {
    const stateData = getStateData(input.charm_state, appTag);
    const nftId = dataAsBytes(stateData);
    if (nftId) inputNfts.push(nftId);
  }

  // Collect output NFT IDs
  const outputNfts: string[] = [];
  for (const output of tx.outputs) {
    const stateData = getStateData(output.charm_state, appTag);
    const nftId = dataAsBytes(stateData);
    if (nftId) outputNfts.push(nftId);
  }

  result.details.nftIds = outputNfts;

  // Check for duplicates
  const seen = new Set<string>();
  for (const nft of outputNfts) {
    if (seen.has(nft)) {
      result.details.duplicateNfts!.push(nft);
      result.errors.push(`Duplicate NFT in outputs: ${nft}`);
    }
    seen.add(nft);
  }

  // Check that output NFTs come from inputs or have proper mint auth
  for (const nft of outputNfts) {
    if (!inputNfts.includes(nft)) {
      // This is a mint - verify authorization
      if (x.type === 'empty') {
        result.errors.push(`NFT mint without authorization: ${nft}`);
      }
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}

// Escrow Spell Checker (Rust: charmix::escrow::check)
function checkEscrow(app: App, tx: Transaction, _x: DataType, _w: DataType): CheckResult {
  const result: CheckResult = {
    valid: false,
    spellType: 'escrow',
    details: {},
    errors: []
  };

  const appTag = app.tag;

  // Get current escrow state from inputs
  let currentState: EscrowState | null = null;
  for (const input of tx.inputs) {
    const stateData = getStateData(input.charm_state, appTag);
    const stateValue = dataAsU64(stateData);
    if (stateValue !== null) {
      currentState = parseEscrowState(stateValue);
      break;
    }
  }

  // Get next state from outputs
  let nextState: EscrowState | null = null;
  for (const output of tx.outputs) {
    const stateData = getStateData(output.charm_state, appTag);
    const stateValue = dataAsU64(stateData);
    if (stateValue !== null) {
      nextState = parseEscrowState(stateValue);
      break;
    }
  }

  const stateNames: Record<number, string> = {
    [EscrowState.Created]: 'Created',
    [EscrowState.Funded]: 'Funded',
    [EscrowState.Released]: 'Released',
    [EscrowState.Disputed]: 'Disputed',
    [EscrowState.Refunded]: 'Refunded',
  };

  result.details.currentState = currentState !== null ? stateNames[currentState] : 'None';
  result.details.nextState = nextState !== null ? stateNames[nextState] : 'None';

  // Valid transitions (from Rust escrow module)
  const validTransitions: Array<[EscrowState | null, EscrowState | null]> = [
    [null, EscrowState.Created],
    [EscrowState.Created, EscrowState.Funded],
    [EscrowState.Funded, EscrowState.Released], // MilestoneCompleted
    [EscrowState.Funded, EscrowState.Disputed],
    [EscrowState.Disputed, EscrowState.Refunded],
    [EscrowState.Disputed, EscrowState.Released],
  ];

  const isValidTransition = validTransitions.some(
    ([from, to]) => from === currentState && to === nextState
  );

  result.details.stateTransitionValid = isValidTransition;

  if (!isValidTransition) {
    result.errors.push(
      `Invalid escrow state transition: ${result.details.currentState} -> ${result.details.nextState}`
    );
  }

  result.valid = result.errors.length === 0;
  return result;
}

// Unified Spell Checker (Rust: checkSpell in lib.rs)
function checkSpell(
  app: App,
  tx: Transaction,
  x: DataType = { type: 'empty' },
  w: DataType = { type: 'empty' }
): CheckResult {
  const tag = app.tag;

  if (tag.startsWith('token:')) {
    return checkToken(app, tx, x, w);
  } else if (tag.startsWith('nft:')) {
    return checkNft(app, tx, x, w);
  } else if (tag.startsWith('escrow:')) {
    return checkEscrow(app, tx, x, w);
  }

  return {
    valid: false,
    spellType: 'unknown',
    details: {},
    errors: [`Unknown app type: ${tag}`]
  };
}

// ============================================
// Spell Builder Functions
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
        apps: {
          [params.appTag]: { type: 'u64' as const, value: amount }
        }
      }
    })),
    outputs: params.outputAmounts.map((amount, i) => ({
      index: i,
      value: 546,
      script_pubkey: '0014',
      charm_state: {
        apps: {
          [params.appTag]: { type: 'u64' as const, value: amount }
        }
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
        apps: {
          [params.appTag]: { type: 'u64' as const, value: params.currentState }
        }
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
        apps: {
          [params.appTag]: { type: 'u64' as const, value: params.nextState }
        }
      }
    }]
  };

  return { app, tx };
}

// ============================================
// HTTP Server
// ============================================

interface SpellCheckRequest {
  action: 'check' | 'build_token' | 'build_escrow' | 'verify_spell';
  app?: App;
  tx?: Transaction;
  x?: DataType;
  w?: DataType;
  spell?: NormalizedSpell;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // GET /health - Health check endpoint
    if (req.method === 'GET' && path === 'health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          version: '1.0.0',
          rustBridge: 'charmix',
          supportedTypes: ['token', 'nft', 'escrow']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /check - Check a spell
    if (req.method === 'POST') {
      const body: SpellCheckRequest = await req.json();
      
      console.log('[spell-checker] Received request:', body.action);

      switch (body.action) {
        case 'check': {
          if (!body.app || !body.tx) {
            return new Response(
              JSON.stringify({ error: 'Missing app or tx in request' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const result = checkSpell(
            body.app,
            body.tx,
            body.x || { type: 'empty' },
            body.w || { type: 'empty' }
          );
          
          console.log('[spell-checker] Check result:', result);
          
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'build_token': {
          const params = body.params as {
            appTag: string;
            vkHash: string;
            inputAmounts: number[];
            outputAmounts: number[];
          };
          
          if (!params) {
            return new Response(
              JSON.stringify({ error: 'Missing params for build_token' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const { app, tx } = buildTokenTransaction(params);
          const checkResult = checkSpell(app, tx, { type: 'bytes', value: 'deadbeef' });
          
          return new Response(
            JSON.stringify({ app, tx, checkResult }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'build_escrow': {
          const params = body.params as {
            appTag: string;
            currentState?: EscrowState;
            nextState: EscrowState;
            amount: number;
          };
          
          if (!params) {
            return new Response(
              JSON.stringify({ error: 'Missing params for build_escrow' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const { app, tx } = buildEscrowTransaction(params);
          const checkResult = checkSpell(app, tx);
          
          return new Response(
            JSON.stringify({ app, tx, checkResult }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'verify_spell': {
          if (!body.spell) {
            return new Response(
              JSON.stringify({ error: 'Missing spell in request' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const spell = body.spell;
          const isValid = spell.version > 0 && spell.ins.length > 0 && spell.outs.length > 0;
          
          return new Response(
            JSON.stringify({
              valid: isValid,
              version: spell.version,
              inputCount: spell.ins.length,
              outputCount: spell.outs.length,
              errors: isValid ? [] : ['Invalid spell structure']
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: `Unknown action: ${body.action}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[spell-checker] Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
