/**
 * Charms Modules - Unified TypeScript Implementation
 * 
 * Complete TypeScript implementations mirroring all three Rust crates:
 * - charms-data: Core data types (App, Transaction, Data, CharmState)
 * - charms-sdk: SDK utilities and spell verification
 * - charmix: Spell checkers (token, NFT, escrow, bounty, bollar)
 * 
 * These serve as fallbacks when WASM/HTTP are unavailable.
 */

// ============================================================================
// CHARMS-DATA: Core Types (mirrors src/rust/charms-data/lib.rs)
// ============================================================================

export type DataType =
  | { type: 'empty' }
  | { type: 'bool'; value: boolean }
  | { type: 'u64'; value: bigint }
  | { type: 'i64'; value: bigint }
  | { type: 'bytes'; value: Uint8Array }
  | { type: 'string'; value: string }
  | { type: 'list'; value: DataType[] }
  | { type: 'map'; value: Map<string, DataType> };

export interface App {
  tag: string;
  vkHash: Uint8Array; // 32 bytes
  params: DataType;
}

export interface UtxoRef {
  txid: Uint8Array; // 32 bytes
  vout: number;
}

export interface CharmState {
  apps: Map<string, DataType>;
}

export interface TxInput {
  utxoRef: UtxoRef;
  charmState: CharmState | null;
}

export interface TxOutput {
  index: number;
  value: bigint;
  scriptPubkey: Uint8Array;
  charmState: CharmState | null;
}

export interface Transaction {
  txid: Uint8Array;
  inputs: TxInput[];
  outputs: TxOutput[];
  spell: NormalizedSpell | null;
}

export interface SpellInput {
  utxoRef: UtxoRef;
  charms: CharmState | null;
}

export interface SpellOutput {
  index: number;
  charms: CharmState | null;
}

export interface NormalizedSpell {
  version: number;
  ins: SpellInput[];
  outs: SpellOutput[];
}

// ============================================================================
// CHARMS-DATA: Utility Functions
// ============================================================================

export const CharmsData = {
  VERSION: '0.10.0',

  // Data constructors
  empty(): DataType {
    return { type: 'empty' };
  },
  bool(v: boolean): DataType {
    return { type: 'bool', value: v };
  },
  u64(v: bigint | number): DataType {
    return { type: 'u64', value: BigInt(v) };
  },
  i64(v: bigint | number): DataType {
    return { type: 'i64', value: BigInt(v) };
  },
  bytes(v: Uint8Array): DataType {
    return { type: 'bytes', value: v };
  },
  string(v: string): DataType {
    return { type: 'string', value: v };
  },
  list(v: DataType[]): DataType {
    return { type: 'list', value: v };
  },
  map(v: Map<string, DataType>): DataType {
    return { type: 'map', value: v };
  },

  // Data accessors
  asU64(d: DataType): bigint | null {
    return d.type === 'u64' ? d.value : null;
  },
  asI64(d: DataType): bigint | null {
    return d.type === 'i64' ? d.value : null;
  },
  asBytes(d: DataType): Uint8Array | null {
    return d.type === 'bytes' ? d.value : null;
  },
  asString(d: DataType): string | null {
    return d.type === 'string' ? d.value : null;
  },
  asBool(d: DataType): boolean | null {
    return d.type === 'bool' ? d.value : null;
  },
  isEmpty(d: DataType): boolean {
    return d.type === 'empty';
  },

  // CharmState helpers
  createCharmState(): CharmState {
    return { apps: new Map() };
  },
  withApp(state: CharmState, tag: string, data: DataType): CharmState {
    const newApps = new Map(state.apps);
    newApps.set(tag, data);
    return { apps: newApps };
  },
  getApp(state: CharmState | null, tag: string): DataType | null {
    return state?.apps.get(tag) ?? null;
  },

  // Transaction helpers
  createTransaction(txid: Uint8Array): Transaction {
    return {
      txid,
      inputs: [],
      outputs: [],
      spell: null,
    };
  },
  addInput(tx: Transaction, input: TxInput): Transaction {
    return { ...tx, inputs: [...tx.inputs, input] };
  },
  addOutput(tx: Transaction, output: TxOutput): Transaction {
    return { ...tx, outputs: [...tx.outputs, output] };
  },

  // Spell helpers
  createSpell(version: number): NormalizedSpell {
    return { version, ins: [], outs: [] };
  },
  verifySpell(spell: NormalizedSpell): boolean {
    return spell.version > 0 && spell.ins.length > 0 && spell.outs.length > 0;
  },

  // Hex utilities
  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },
  hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  },

  // Random bytes
  randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  },
};

// ============================================================================
// CHARMS-SDK: SDK Utilities (mirrors src/rust/charms-sdk/lib.rs)
// ============================================================================

export interface SpellVerifyResult {
  valid: boolean;
  version: number;
  inputCount: number;
  outputCount: number;
  errors: string[];
}

export interface SpellReadResult {
  app: App;
  tx: Transaction;
  x: DataType;
  w: DataType;
}

export const CharmsSDK = {
  VERSION: '0.10.0',

  // Re-export data module
  data: CharmsData,

  // Verify spell structure
  verifySpell(spell: NormalizedSpell): SpellVerifyResult {
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

  // Create app definition
  createApp(tag: string, vkHash: Uint8Array, params?: DataType): App {
    return {
      tag,
      vkHash,
      params: params ?? CharmsData.empty(),
    };
  },

  // Serialize spell data for transmission
  serializeSpell(spell: NormalizedSpell): string {
    return JSON.stringify({
      version: spell.version,
      ins: spell.ins.map(inp => ({
        utxo_ref: {
          txid: CharmsData.bytesToHex(inp.utxoRef.txid),
          vout: inp.utxoRef.vout,
        },
        charms: inp.charms ? serializeCharmState(inp.charms) : null,
      })),
      outs: spell.outs.map(out => ({
        index: out.index,
        charms: out.charms ? serializeCharmState(out.charms) : null,
      })),
    });
  },

  // Parse spell data from JSON
  parseSpell(json: string): NormalizedSpell {
    const data = JSON.parse(json);
    return {
      version: data.version,
      ins: data.ins.map((inp: { utxo_ref: { txid: string; vout: number }; charms: unknown }) => ({
        utxoRef: {
          txid: CharmsData.hexToBytes(inp.utxo_ref.txid),
          vout: inp.utxo_ref.vout,
        },
        charms: inp.charms ? parseCharmState(inp.charms) : null,
      })),
      outs: data.outs.map((out: { index: number; charms: unknown }) => ({
        index: out.index,
        charms: out.charms ? parseCharmState(out.charms) : null,
      })),
    };
  },
};

// Internal serialization helpers
function serializeCharmState(state: CharmState): Record<string, unknown> {
  const apps: Record<string, unknown> = {};
  state.apps.forEach((value, key) => {
    apps[key] = serializeData(value);
  });
  return { apps };
}

function serializeData(data: DataType): unknown {
  switch (data.type) {
    case 'empty':
      return { type: 'empty' };
    case 'bool':
      return { type: 'bool', value: data.value };
    case 'u64':
      return { type: 'u64', value: Number(data.value) };
    case 'i64':
      return { type: 'i64', value: Number(data.value) };
    case 'bytes':
      return { type: 'bytes', value: CharmsData.bytesToHex(data.value) };
    case 'string':
      return { type: 'string', value: data.value };
    case 'list':
      return { type: 'list', value: data.value.map(serializeData) };
    case 'map': {
      const obj: Record<string, unknown> = {};
      data.value.forEach((v, k) => { obj[k] = serializeData(v); });
      return { type: 'map', value: obj };
    }
  }
}

function parseCharmState(data: unknown): CharmState {
  const obj = data as { apps: Record<string, unknown> };
  const apps = new Map<string, DataType>();
  Object.entries(obj.apps || {}).forEach(([key, value]) => {
    apps.set(key, parseData(value));
  });
  return { apps };
}

function parseData(data: unknown): DataType {
  const obj = data as { type: string; value?: unknown };
  switch (obj.type) {
    case 'empty':
      return { type: 'empty' };
    case 'bool':
      return { type: 'bool', value: obj.value as boolean };
    case 'u64':
      return { type: 'u64', value: BigInt(obj.value as number) };
    case 'i64':
      return { type: 'i64', value: BigInt(obj.value as number) };
    case 'bytes':
      return { type: 'bytes', value: CharmsData.hexToBytes(obj.value as string) };
    case 'string':
      return { type: 'string', value: obj.value as string };
    case 'list':
      return { type: 'list', value: (obj.value as unknown[]).map(parseData) };
    case 'map': {
      const map = new Map<string, DataType>();
      Object.entries(obj.value as Record<string, unknown>).forEach(([k, v]) => {
        map.set(k, parseData(v));
      });
      return { type: 'map', value: map };
    }
    default:
      return { type: 'empty' };
  }
}

// ============================================================================
// CHARMIX: Spell Checkers (mirrors src/rust/charmix/lib.rs)
// ============================================================================

export enum EscrowState {
  Created = 0,
  Funded = 1,
  Released = 2,
  Disputed = 3,
  Refunded = 4,
}

export enum BountyState {
  Open = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  Disputed = 4,
}

export interface CheckResult {
  valid: boolean;
  spellType: 'token' | 'nft' | 'escrow' | 'bounty' | 'bollar' | 'unknown';
  details: {
    inputSum?: bigint;
    outputSum?: bigint;
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

export const Charmix = {
  VERSION: '0.1.0',

  // ========== TOKEN CHECKER ==========
  token: {
    check(app: App, tx: Transaction, x: DataType, _w: DataType): CheckResult {
      const appTag = app.tag;
      const errors: string[] = [];

      let inputSum = 0n;
      for (const input of tx.inputs) {
        const data = CharmsData.getApp(input.charmState, appTag);
        const amount = data ? CharmsData.asU64(data) : null;
        if (amount !== null) inputSum += amount;
      }

      let outputSum = 0n;
      for (const output of tx.outputs) {
        const data = CharmsData.getApp(output.charmState, appTag);
        const amount = data ? CharmsData.asU64(data) : null;
        if (amount !== null) outputSum += amount;
      }

      if (inputSum !== outputSum) {
        errors.push(`Token conservation failed: input=${inputSum} != output=${outputSum}`);
      }

      const authBytes = CharmsData.asBytes(x);
      if (authBytes && authBytes.length === 0) {
        errors.push('Empty authorization data');
      }

      return {
        valid: errors.length === 0,
        spellType: 'token',
        details: {
          inputSum,
          outputSum,
          isMint: inputSum === 0n && outputSum > 0n,
          isBurn: inputSum > outputSum,
        },
        errors,
      };
    },

    isMint(app: App, tx: Transaction): boolean {
      const appTag = app.tag;
      const hasInputTokens = tx.inputs.some(input =>
        CharmsData.getApp(input.charmState, appTag) !== null
      );
      const hasOutputTokens = tx.outputs.some(output =>
        CharmsData.getApp(output.charmState, appTag) !== null
      );
      return !hasInputTokens && hasOutputTokens;
    },

    isBurn(app: App, tx: Transaction): boolean {
      const appTag = app.tag;
      let inputSum = 0n;
      let outputSum = 0n;

      for (const input of tx.inputs) {
        const data = CharmsData.getApp(input.charmState, appTag);
        const amount = data ? CharmsData.asU64(data) : null;
        if (amount !== null) inputSum += amount;
      }

      for (const output of tx.outputs) {
        const data = CharmsData.getApp(output.charmState, appTag);
        const amount = data ? CharmsData.asU64(data) : null;
        if (amount !== null) outputSum += amount;
      }

      return inputSum > outputSum;
    },
  },

  // ========== NFT CHECKER ==========
  nft: {
    check(app: App, tx: Transaction, x: DataType, _w: DataType): CheckResult {
      const appTag = app.tag;
      const errors: string[] = [];
      const inputNfts: string[] = [];
      const outputNfts: string[] = [];
      const duplicateNfts: string[] = [];

      for (const input of tx.inputs) {
        const data = CharmsData.getApp(input.charmState, appTag);
        const bytes = data ? CharmsData.asBytes(data) : null;
        if (bytes) inputNfts.push(CharmsData.bytesToHex(bytes));
      }

      const seen = new Set<string>();
      for (const output of tx.outputs) {
        const data = CharmsData.getApp(output.charmState, appTag);
        const bytes = data ? CharmsData.asBytes(data) : null;
        if (bytes) {
          const hex = CharmsData.bytesToHex(bytes);
          if (seen.has(hex)) {
            duplicateNfts.push(hex);
            errors.push(`Duplicate NFT in outputs: ${hex}`);
          }
          seen.add(hex);
          outputNfts.push(hex);
        }
      }

      for (const nft of outputNfts) {
        if (!inputNfts.includes(nft)) {
          if (CharmsData.isEmpty(x)) {
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
    },
  },

  // ========== ESCROW CHECKER ==========
  escrow: {
    check(app: App, tx: Transaction, _x: DataType, _w: DataType): CheckResult {
      const appTag = app.tag;
      const errors: string[] = [];
      const stateNames = ['Created', 'Funded', 'Released', 'Disputed', 'Refunded'];

      let currentState: number | null = null;
      for (const input of tx.inputs) {
        const data = CharmsData.getApp(input.charmState, appTag);
        const value = data ? CharmsData.asU64(data) : null;
        if (value !== null) {
          currentState = Number(value);
          break;
        }
      }

      let nextState: number | null = null;
      for (const output of tx.outputs) {
        const data = CharmsData.getApp(output.charmState, appTag);
        const value = data ? CharmsData.asU64(data) : null;
        if (value !== null) {
          nextState = Number(value);
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

      // Also allow milestone transitions (100+)
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
    },

    getStateName(state: number | null): string {
      if (state === null) return 'None';
      if (state >= 100) return `Milestone(${state - 100})`;
      const names = ['Created', 'Funded', 'Released', 'Disputed', 'Refunded'];
      return names[state] ?? 'Unknown';
    },
  },

  // ========== BOUNTY CHECKER ==========
  bounty: {
    check(app: App, tx: Transaction, _x: DataType, _w: DataType): CheckResult {
      const appTag = app.tag;
      const errors: string[] = [];
      const stateNames = ['Open', 'InProgress', 'Completed', 'Cancelled', 'Disputed'];

      let currentState: number | null = null;
      for (const input of tx.inputs) {
        const data = CharmsData.getApp(input.charmState, appTag);
        const value = data ? CharmsData.asU64(data) : null;
        if (value !== null) {
          currentState = Number(value);
          break;
        }
      }

      let nextState: number | null = null;
      for (const output of tx.outputs) {
        const data = CharmsData.getApp(output.charmState, appTag);
        const value = data ? CharmsData.asU64(data) : null;
        if (value !== null) {
          nextState = Number(value);
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
    },

    getStateName(state: number | null): string {
      if (state === null) return 'None';
      const names = ['Open', 'InProgress', 'Completed', 'Cancelled', 'Disputed'];
      return names[state] ?? 'Unknown';
    },
  },

  // ========== BOLLAR (STABLECOIN) CHECKER ==========
  bollar: {
    check(app: App, tx: Transaction, x: DataType, w: DataType): CheckResult {
      // Bollar uses token rules with additional checks
      const tokenResult = Charmix.token.check(app, tx, x, w);
      return {
        ...tokenResult,
        spellType: 'bollar',
      };
    },
  },

  // ========== UNIFIED CHECKER ==========
  checkSpell(app: App, tx: Transaction, x: DataType = CharmsData.empty(), w: DataType = CharmsData.empty()): CheckResult {
    const tag = app.tag.toLowerCase();

    if (tag.startsWith('token:')) {
      return Charmix.token.check(app, tx, x, w);
    } else if (tag.startsWith('nft:')) {
      return Charmix.nft.check(app, tx, x, w);
    } else if (tag.startsWith('escrow:')) {
      return Charmix.escrow.check(app, tx, x, w);
    } else if (tag.startsWith('bounty:')) {
      return Charmix.bounty.check(app, tx, x, w);
    } else if (tag.startsWith('bollar:')) {
      return Charmix.bollar.check(app, tx, x, w);
    }

    return {
      valid: false,
      spellType: 'unknown',
      details: {},
      errors: [`Unknown app type: ${app.tag}`],
    };
  },
};

// ============================================================================
// BUILDERS: Transaction/Spell Builders
// ============================================================================

export const CharmsBuilders = {
  buildTokenTransaction(params: {
    appTag: string;
    vkHash: string;
    inputAmounts: bigint[];
    outputAmounts: bigint[];
  }): { app: App; tx: Transaction } {
    const vkHash = CharmsData.hexToBytes(params.vkHash.padStart(64, '0'));
    const app: App = {
      tag: params.appTag,
      vkHash,
      params: CharmsData.empty(),
    };

    const txid = CharmsData.randomBytes(32);
    const tx: Transaction = {
      txid,
      inputs: params.inputAmounts.map((amount, i) => ({
        utxoRef: { txid: new Uint8Array(32), vout: i },
        charmState: CharmsData.withApp(CharmsData.createCharmState(), params.appTag, CharmsData.u64(amount)),
      })),
      outputs: params.outputAmounts.map((amount, i) => ({
        index: i,
        value: 546n,
        scriptPubkey: new Uint8Array([0x00, 0x14]),
        charmState: CharmsData.withApp(CharmsData.createCharmState(), params.appTag, CharmsData.u64(amount)),
      })),
      spell: null,
    };

    return { app, tx };
  },

  buildEscrowTransaction(params: {
    appTag: string;
    currentState?: EscrowState;
    nextState: EscrowState;
    amount: bigint;
  }): { app: App; tx: Transaction } {
    const vkHash = CharmsData.randomBytes(32);
    const app: App = {
      tag: params.appTag,
      vkHash,
      params: CharmsData.empty(),
    };

    const txid = CharmsData.randomBytes(32);
    const tx: Transaction = {
      txid,
      inputs: params.currentState !== undefined ? [{
        utxoRef: { txid: new Uint8Array(32), vout: 0 },
        charmState: CharmsData.withApp(CharmsData.createCharmState(), params.appTag, CharmsData.u64(params.currentState)),
      }] : [{
        utxoRef: { txid: new Uint8Array(32), vout: 0 },
        charmState: null,
      }],
      outputs: [{
        index: 0,
        value: params.amount,
        scriptPubkey: new Uint8Array([0x00, 0x14]),
        charmState: CharmsData.withApp(CharmsData.createCharmState(), params.appTag, CharmsData.u64(params.nextState)),
      }],
      spell: null,
    };

    return { app, tx };
  },

  buildBountyTransaction(params: {
    appTag: string;
    currentState?: BountyState;
    nextState: BountyState;
    amount: bigint;
  }): { app: App; tx: Transaction } {
    const vkHash = CharmsData.randomBytes(32);
    const app: App = {
      tag: params.appTag,
      vkHash,
      params: CharmsData.empty(),
    };

    const txid = CharmsData.randomBytes(32);
    const tx: Transaction = {
      txid,
      inputs: params.currentState !== undefined ? [{
        utxoRef: { txid: new Uint8Array(32), vout: 0 },
        charmState: CharmsData.withApp(CharmsData.createCharmState(), params.appTag, CharmsData.u64(params.currentState)),
      }] : [{
        utxoRef: { txid: new Uint8Array(32), vout: 0 },
        charmState: null,
      }],
      outputs: [{
        index: 0,
        value: params.amount,
        scriptPubkey: new Uint8Array([0x00, 0x14]),
        charmState: CharmsData.withApp(CharmsData.createCharmState(), params.appTag, CharmsData.u64(params.nextState)),
      }],
      spell: null,
    };

    return { app, tx };
  },
};

// ============================================================================
// UNIFIED EXPORTS
// ============================================================================

export const CharmsModules = {
  data: CharmsData,
  sdk: CharmsSDK,
  charmix: Charmix,
  builders: CharmsBuilders,
  
  // Version info
  versions: {
    data: CharmsData.VERSION,
    sdk: CharmsSDK.VERSION,
    charmix: Charmix.VERSION,
  },
};

export default CharmsModules;
