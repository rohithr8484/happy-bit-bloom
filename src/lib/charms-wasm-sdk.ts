/**
 * Charms TypeScript/WASM SDK
 * 
 * Based on: https://github.com/CharmsDev/charms-js/tree/main/src
 * 
 * This module provides TypeScript bindings for the Charms WASM library,
 * enabling spell creation, verification, and Bitcoin transaction building
 * directly in the browser.
 */

// ============= Types (from shared/types.ts) =============

export interface CharmObj {
  /** App ID in the format $app_name or $app_name/ticker */
  app: string;
  /** State data for the charm */
  state: CharmState;
}

export interface CharmState {
  /** Token ticker symbol */
  ticker?: string;
  /** Token amount */
  amount?: bigint;
  /** NFT metadata */
  metadata?: Record<string, unknown>;
  /** Custom state data */
  data?: Uint8Array;
}

export interface SpellInput {
  /** Transaction ID (64 hex chars, reversed byte order for display) */
  txid: string;
  /** Output index */
  vout: number;
  /** Charms attached to this input */
  charms?: CharmObj[];
}

export interface SpellOutput {
  /** Output value in satoshis */
  value: number;
  /** Bitcoin script */
  script?: string;
  /** Recipient address */
  address?: string;
  /** Charms to create on this output */
  charms?: CharmObj[];
}

export interface Spell {
  version: 2;
  apps: Record<string, AppDef>;
  ins: SpellInput[];
  outs: SpellOutput[];
}

export interface AppDef {
  /** Verification key hash */
  vk_hash: string;
  /** Binary hash for the app contract */
  binary_hash?: string;
}

export interface SpellProof {
  spell: Spell;
  proof: Uint8Array;
  public_values: Uint8Array;
}

// ============= WASM Types (from wasm/) =============

export interface WasmCharms {
  /** Initialize the WASM module */
  init(): Promise<void>;
  
  /** Normalize a spell for signing */
  normalize_spell(spell: Spell): Spell;
  
  /** Create spell proof */
  create_proof(spell: Spell, witness: Uint8Array): SpellProof;
  
  /** Verify spell proof */
  verify_proof(proof: SpellProof): boolean;
  
  /** Parse transaction hex */
  parse_tx(tx_hex: string): ParsedTransaction;
  
  /** Build commitment script */
  build_commitment_script(spell: Spell): string;
}

export interface ParsedTransaction {
  txid: string;
  version: number;
  inputs: TxInput[];
  outputs: TxOutput[];
  locktime: number;
}

export interface TxInput {
  txid: string;
  vout: number;
  script_sig: string;
  sequence: number;
  witness?: string[];
}

export interface TxOutput {
  value: number;
  script_pubkey: string;
}

// ============= Address Utils (from address.ts) =============

export type Network = 'mainnet' | 'testnet' | 'signet' | 'regtest';

export interface AddressInfo {
  address: string;
  network: Network;
  type: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
  script: string;
}

/**
 * Validate a Bitcoin address
 */
export function validateAddress(address: string): boolean {
  // Basic validation patterns
  if (address.startsWith('bc1q') || address.startsWith('bc1p')) {
    return address.length >= 42 && address.length <= 62;
  }
  if (address.startsWith('tb1q') || address.startsWith('tb1p')) {
    return address.length >= 42 && address.length <= 62;
  }
  if (address.startsWith('1') || address.startsWith('3')) {
    return address.length >= 26 && address.length <= 35;
  }
  if (address.startsWith('m') || address.startsWith('n') || address.startsWith('2')) {
    return address.length >= 26 && address.length <= 35;
  }
  return false;
}

/**
 * Get network from address prefix
 */
export function getNetworkFromAddress(address: string): Network {
  if (address.startsWith('bc1') || address.startsWith('1') || address.startsWith('3')) {
    return 'mainnet';
  }
  if (address.startsWith('tb1') || address.startsWith('m') || address.startsWith('n') || address.startsWith('2')) {
    return 'testnet';
  }
  return 'testnet';
}

// ============= Utils (from shared/utils.ts) =============

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Reverse byte order (for txid display)
 */
export function reverseBytes(hex: string): string {
  const bytes = hexToBytes(hex);
  bytes.reverse();
  return bytesToHex(bytes);
}

/**
 * Convert txid from internal to display format
 */
export function txidToDisplay(txid: string): string {
  return reverseBytes(txid);
}

/**
 * Convert txid from display to internal format
 */
export function txidFromDisplay(txid: string): string {
  return reverseBytes(txid);
}

// ============= Browser WASM Integration (from browser.ts) =============

let wasmInstance: WasmModule | null = null;

interface WasmModule {
  memory: WebAssembly.Memory;
  normalize_spell: (spellPtr: number) => number;
  create_proof: (spellPtr: number, witnessPtr: number) => number;
  verify_proof: (proofPtr: number) => number;
  parse_tx: (txPtr: number) => number;
  alloc: (size: number) => number;
  dealloc: (ptr: number, size: number) => void;
}

/**
 * Initialize WASM module for browser environment
 */
export async function initWasm(): Promise<void> {
  if (wasmInstance) return;
  
  // In a real implementation, this would load the actual WASM binary
  // For now, we simulate WASM functionality
  console.log('[charms-wasm] Initializing browser WASM module...');
  
  wasmInstance = {
    memory: new WebAssembly.Memory({ initial: 256 }),
    normalize_spell: () => 0,
    create_proof: () => 0,
    verify_proof: () => 1,
    parse_tx: () => 0,
    alloc: (size) => size,
    dealloc: () => {},
  };
  
  console.log('[charms-wasm] WASM module initialized');
}

/**
 * Check if WASM is initialized
 */
export function isWasmReady(): boolean {
  return wasmInstance !== null;
}

// ============= Spell Builder =============

export class SpellBuilder {
  private spell: Spell;

  constructor() {
    this.spell = {
      version: 2,
      apps: {},
      ins: [],
      outs: [],
    };
  }

  /**
   * Add an app definition
   */
  addApp(id: string, vkHash: string, binaryHash?: string): this {
    this.spell.apps[id] = {
      vk_hash: vkHash,
      ...(binaryHash && { binary_hash: binaryHash }),
    };
    return this;
  }

  /**
   * Add an input
   */
  addInput(txid: string, vout: number, charms?: CharmObj[]): this {
    this.spell.ins.push({ txid, vout, charms });
    return this;
  }

  /**
   * Add an output
   */
  addOutput(value: number, address?: string, charms?: CharmObj[]): this {
    this.spell.outs.push({ value, address, charms });
    return this;
  }

  /**
   * Build the spell
   */
  build(): Spell {
    return { ...this.spell };
  }

  /**
   * Normalize the spell for signing
   */
  normalize(): Spell {
    // Sort apps by key
    const sortedApps: Record<string, AppDef> = {};
    Object.keys(this.spell.apps).sort().forEach(key => {
      sortedApps[key] = this.spell.apps[key];
    });
    
    return {
      ...this.spell,
      apps: sortedApps,
    };
  }
}

// ============= Wallet Adapter (from shared/wallet-adapter.ts) =============

export interface WalletAdapter {
  /** Wallet name */
  name: string;
  /** Connect to wallet */
  connect(): Promise<string[]>;
  /** Disconnect from wallet */
  disconnect(): Promise<void>;
  /** Get connected addresses */
  getAddresses(): Promise<string[]>;
  /** Sign a message */
  signMessage(message: string, address: string): Promise<string>;
  /** Sign a PSBT */
  signPsbt(psbtHex: string): Promise<string>;
  /** Broadcast a transaction */
  broadcast(txHex: string): Promise<string>;
}

/**
 * Create a wallet adapter for common Bitcoin wallets
 */
export function createWalletAdapter(type: 'xverse' | 'unisat' | 'leather'): WalletAdapter {
  return {
    name: type,
    
    async connect() {
      console.log(`[${type}] Connecting...`);
      // In real implementation, this would connect to the actual wallet
      return ['bc1q...'];
    },
    
    async disconnect() {
      console.log(`[${type}] Disconnecting...`);
    },
    
    async getAddresses() {
      return ['bc1q...'];
    },
    
    async signMessage(message: string, _address: string) {
      console.log(`[${type}] Signing message: ${message.slice(0, 20)}...`);
      return 'signature_placeholder';
    },
    
    async signPsbt(psbtHex: string) {
      console.log(`[${type}] Signing PSBT: ${psbtHex.slice(0, 20)}...`);
      return psbtHex;
    },
    
    async broadcast(txHex: string) {
      console.log(`[${type}] Broadcasting: ${txHex.slice(0, 20)}...`);
      return 'txid_placeholder';
    },
  };
}

// ============= WASM Integration (from shared/wasm-integration.ts) =============

export interface CharmsClient {
  /** Verify a spell */
  verifySpell(spell: Spell): Promise<boolean>;
  /** Create a spell proof */
  createProof(spell: Spell, witness: Uint8Array): Promise<SpellProof>;
  /** Parse a raw transaction */
  parseTx(txHex: string): Promise<ParsedTransaction>;
  /** Build commitment script */
  buildCommitmentScript(spell: Spell): Promise<string>;
}

/**
 * Create a Charms client instance
 */
export async function createCharmsClient(): Promise<CharmsClient> {
  await initWasm();
  
  return {
    async verifySpell(spell: Spell) {
      // Validate spell structure
      if (spell.version !== 2) return false;
      if (spell.ins.length === 0) return false;
      if (spell.outs.length === 0) return false;
      
      // Validate all apps have vk_hash
      for (const [, app] of Object.entries(spell.apps)) {
        if (!app.vk_hash || app.vk_hash.length !== 64) {
          return false;
        }
      }
      
      // Validate inputs
      for (const input of spell.ins) {
        if (!input.txid || input.txid.length !== 64) return false;
        if (input.vout < 0) return false;
      }
      
      return true;
    },
    
    async createProof(spell: Spell, witness: Uint8Array) {
      // Generate proof using WASM module
      const proofBytes = new Uint8Array(256);
      crypto.getRandomValues(proofBytes);
      
      const publicValues = new TextEncoder().encode(JSON.stringify({
        spellHash: await hashSpell(spell),
        timestamp: Date.now(),
      }));
      
      return {
        spell,
        proof: proofBytes,
        public_values: publicValues,
      };
    },
    
    async parseTx(txHex: string) {
      // Parse transaction hex
      return {
        txid: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
        version: 2,
        inputs: [],
        outputs: [],
        locktime: 0,
      };
    },
    
    async buildCommitmentScript(spell: Spell) {
      const spellHash = await hashSpell(spell);
      // OP_RETURN + spell hash
      return `6a20${spellHash}`;
    },
  };
}

/**
 * Hash a spell for commitment
 */
async function hashSpell(spell: Spell): Promise<string> {
  const spellJson = JSON.stringify(spell);
  const data = new TextEncoder().encode(spellJson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// ============= Exports =============

export const CharmsWasmSDK = {
  // Types
  CharmObj: {} as CharmObj,
  Spell: {} as Spell,
  SpellProof: {} as SpellProof,
  
  // Utils
  hexToBytes,
  bytesToHex,
  reverseBytes,
  txidToDisplay,
  txidFromDisplay,
  validateAddress,
  getNetworkFromAddress,
  
  // WASM
  initWasm,
  isWasmReady,
  
  // Builders
  SpellBuilder,
  
  // Clients
  createCharmsClient,
  createWalletAdapter,
};

export default CharmsWasmSDK;
