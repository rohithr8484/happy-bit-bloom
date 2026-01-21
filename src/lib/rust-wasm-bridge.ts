/**
 * Rust WASM Bridge - TypeScript integration for Rust spell checker via WASM
 * 
 * This module provides both:
 * 1. HTTP API client for the spell-checker edge function (backend)
 * 2. WASM loader for direct Rust execution in browser (frontend)
 */

// Lazy import to avoid initialization issues with env variables
const getSupabase = async () => {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase;
};

// ============================================
// Shared Types (matching Rust charms-data)
// ============================================

export interface RustApp {
  tag: string;
  vk_hash: string;
  params?: RustData;
}

export type RustData =
  | { type: 'empty' }
  | { type: 'bool'; value: boolean }
  | { type: 'u64'; value: number }
  | { type: 'i64'; value: number }
  | { type: 'bytes'; value: string }
  | { type: 'string'; value: string }
  | { type: 'list'; value: RustData[] }
  | { type: 'map'; value: Record<string, RustData> };

export interface RustUtxoRef {
  txid: string;
  vout: number;
}

export interface RustCharmState {
  apps: Record<string, RustData>;
}

export interface RustTxInput {
  utxo_ref: RustUtxoRef;
  charm_state: RustCharmState | null;
}

export interface RustTxOutput {
  index: number;
  value: number;
  script_pubkey: string;
  charm_state: RustCharmState | null;
}

export interface RustTransaction {
  txid: string;
  inputs: RustTxInput[];
  outputs: RustTxOutput[];
}

export interface RustSpellInput {
  utxo_ref: RustUtxoRef;
  charms: RustCharmState | null;
}

export interface RustSpellOutput {
  index: number;
  charms: RustCharmState | null;
}

export interface RustNormalizedSpell {
  version: number;
  ins: RustSpellInput[];
  outs: RustSpellOutput[];
}

export interface RustCheckResult {
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

export enum RustEscrowState {
  Created = 0,
  Funded = 1,
  Released = 2,
  Disputed = 3,
  Refunded = 4,
}

// ============================================
// HTTP API Client (Backend Style)
// ============================================

export class RustHttpClient {
  private static instance: RustHttpClient | null = null;
  
  private constructor() {}
  
  static getInstance(): RustHttpClient {
    if (!this.instance) {
      this.instance = new RustHttpClient();
    }
    return this.instance;
  }
  
  /**
   * Check health of the spell-checker API
   */
  async health(): Promise<{
    status: string;
    version: string;
    rustBridge: string;
    supportedTypes: string[];
  }> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.functions.invoke('spell-checker', {
      method: 'GET',
    });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Check a spell via HTTP API (mirrors Rust charmix::check)
   */
  async checkSpell(
    app: RustApp,
    tx: RustTransaction,
    x: RustData = { type: 'empty' },
    w: RustData = { type: 'empty' }
  ): Promise<RustCheckResult> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.functions.invoke('spell-checker', {
      body: {
        action: 'check',
        app,
        tx,
        x,
        w,
      },
    });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Build and check a token transaction
   */
  async buildToken(params: {
    appTag: string;
    vkHash: string;
    inputAmounts: number[];
    outputAmounts: number[];
  }): Promise<{
    app: RustApp;
    tx: RustTransaction;
    checkResult: RustCheckResult;
  }> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.functions.invoke('spell-checker', {
      body: {
        action: 'build_token',
        params,
      },
    });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Build and check an escrow transaction
   */
  async buildEscrow(params: {
    appTag: string;
    currentState?: RustEscrowState;
    nextState: RustEscrowState;
    amount: number;
  }): Promise<{
    app: RustApp;
    tx: RustTransaction;
    checkResult: RustCheckResult;
  }> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.functions.invoke('spell-checker', {
      body: {
        action: 'build_escrow',
        params,
      },
    });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Verify a normalized spell structure
   */
  async verifySpell(spell: RustNormalizedSpell): Promise<{
    valid: boolean;
    version: number;
    inputCount: number;
    outputCount: number;
    errors: string[];
  }> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.functions.invoke('spell-checker', {
      body: {
        action: 'verify_spell',
        spell,
      },
    });
    
    if (error) throw error;
    return data;
  }
}

// ============================================
// WASM Module Interface (mirrors Rust wasm_bindings)
// ============================================

export interface RustWasmModule {
  // Core functions
  check_spell(app_json: string, tx_json: string, x_json: string, w_json: string): unknown;
  check_token(app_json: string, tx_json: string, x_json: string): unknown;
  check_escrow(app_json: string, tx_json: string): unknown;
  verify_spell(spell_json: string): unknown;
  build_token_tx(
    app_tag: string,
    vk_hash: string,
    input_amounts_json: string,
    output_amounts_json: string
  ): unknown;
  get_version(): string;
}

// ============================================
// WASM Loader (Frontend Style)
// ============================================

let wasmModule: RustWasmModule | null = null;
let wasmLoading: Promise<RustWasmModule> | null = null;

/**
 * Load the Rust WASM module
 * 
 * Build the module with:
 * cd src/rust/charms-sdk && wasm-pack build --target web --features wasm
 */
export async function loadRustWasm(): Promise<RustWasmModule> {
  if (wasmModule) return wasmModule;
  
  if (wasmLoading) return wasmLoading;
  
  wasmLoading = (async () => {
    try {
      // Try to load pre-built WASM from public folder
      const wasmUrl = '/wasm/charms_sdk.wasm';
      const response = await fetch(wasmUrl);
      
      if (!response.ok) {
        console.warn('[RustWasm] WASM not available, using TypeScript fallback');
        return createFallbackModule();
      }
      
      const wasmBytes = await response.arrayBuffer();
      const wasmResult = await WebAssembly.instantiate(wasmBytes, {
        env: {
          // Minimal environment for Rust WASM
          abort: () => console.error('WASM abort called'),
        },
      });
      
      wasmModule = wasmResult.instance.exports as unknown as RustWasmModule;
      console.log('[RustWasm] Loaded Rust WASM module');
      return wasmModule;
    } catch (error) {
      console.warn('[RustWasm] Failed to load WASM, using TypeScript fallback:', error);
      return createFallbackModule();
    }
  })();
  
  return wasmLoading;
}

/**
 * TypeScript fallback that mirrors Rust WASM API
 * Used when WASM is not available
 */
function createFallbackModule(): RustWasmModule {
  return {
    check_spell(app_json: string, tx_json: string, x_json: string, w_json: string): unknown {
      const app = JSON.parse(app_json);
      const tx = JSON.parse(tx_json);
      const x = JSON.parse(x_json);
      
      if (app.tag.startsWith('token:')) {
        return this.check_token(app_json, tx_json, x_json);
      } else if (app.tag.startsWith('escrow:')) {
        return this.check_escrow(app_json, tx_json);
      }
      
      return {
        valid: false,
        spell_type: 'unknown',
        errors: [`Unknown app type: ${app.tag}`],
      };
    },
    
    check_token(app_json: string, tx_json: string, x_json: string): unknown {
      const app: RustApp = JSON.parse(app_json);
      const tx: RustTransaction = JSON.parse(tx_json);
      
      let inputSum = 0;
      let outputSum = 0;
      const errors: string[] = [];
      
      for (const input of tx.inputs) {
        if (input.charm_state?.apps[app.tag]?.type === 'u64') {
          inputSum += (input.charm_state.apps[app.tag] as { type: 'u64'; value: number }).value;
        }
      }
      
      for (const output of tx.outputs) {
        if (output.charm_state?.apps[app.tag]?.type === 'u64') {
          outputSum += (output.charm_state.apps[app.tag] as { type: 'u64'; value: number }).value;
        }
      }
      
      if (inputSum !== outputSum) {
        errors.push(`Token conservation failed: input=${inputSum} != output=${outputSum}`);
      }
      
      return {
        valid: errors.length === 0,
        spell_type: 'token',
        input_sum: inputSum,
        output_sum: outputSum,
        is_mint: inputSum === 0 && outputSum > 0,
        is_burn: inputSum > outputSum,
        errors,
      };
    },
    
    check_escrow(app_json: string, tx_json: string): unknown {
      const app: RustApp = JSON.parse(app_json);
      const tx: RustTransaction = JSON.parse(tx_json);
      
      const stateNames = ['Created', 'Funded', 'Released', 'Disputed', 'Refunded'];
      const errors: string[] = [];
      
      let currentState: number | null = null;
      let nextState: number | null = null;
      
      for (const input of tx.inputs) {
        if (input.charm_state?.apps[app.tag]?.type === 'u64') {
          currentState = (input.charm_state.apps[app.tag] as { type: 'u64'; value: number }).value;
          break;
        }
      }
      
      for (const output of tx.outputs) {
        if (output.charm_state?.apps[app.tag]?.type === 'u64') {
          nextState = (output.charm_state.apps[app.tag] as { type: 'u64'; value: number }).value;
          break;
        }
      }
      
      const validTransitions: Array<[number | null, number | null]> = [
        [null, 0], [0, 1], [1, 2], [1, 3], [3, 4], [3, 2],
      ];
      
      const isValid = validTransitions.some(([from, to]) => from === currentState && to === nextState);
      
      if (!isValid) {
        errors.push(`Invalid escrow transition: ${stateNames[currentState ?? 0] ?? 'None'} -> ${stateNames[nextState ?? 0] ?? 'None'}`);
      }
      
      return {
        valid: isValid,
        spell_type: 'escrow',
        current_state: currentState !== null ? stateNames[currentState] : 'None',
        next_state: nextState !== null ? stateNames[nextState] : 'None',
        state_transition_valid: isValid,
        errors,
      };
    },
    
    verify_spell(spell_json: string): unknown {
      const spell: RustNormalizedSpell = JSON.parse(spell_json);
      const valid = spell.version > 0 && spell.ins.length > 0 && spell.outs.length > 0;
      
      return {
        valid,
        version: spell.version,
        inputCount: spell.ins.length,
        outputCount: spell.outs.length,
      };
    },
    
    build_token_tx(
      app_tag: string,
      vk_hash: string,
      input_amounts_json: string,
      output_amounts_json: string
    ): unknown {
      const inputAmounts: number[] = JSON.parse(input_amounts_json);
      const outputAmounts: number[] = JSON.parse(output_amounts_json);
      
      const app: RustApp = { tag: app_tag, vk_hash };
      
      const tx: RustTransaction = {
        txid: '0'.repeat(64),
        inputs: inputAmounts.map((amount, i) => ({
          utxo_ref: { txid: '0'.repeat(64), vout: i },
          charm_state: {
            apps: { [app_tag]: { type: 'u64' as const, value: amount } },
          },
        })),
        outputs: outputAmounts.map((amount, i) => ({
          index: i,
          value: 546,
          script_pubkey: '0014',
          charm_state: {
            apps: { [app_tag]: { type: 'u64' as const, value: amount } },
          },
        })),
      };
      
      return { app, tx };
    },
    
    get_version(): string {
      return '0.10.0-ts-fallback';
    },
  };
}

// ============================================
// Unified Client (HTTP + WASM)
// ============================================

export type RustBridgeMode = 'http' | 'wasm' | 'auto';

export class RustBridge {
  private mode: RustBridgeMode = 'auto';
  private httpClient: RustHttpClient;
  private wasmModule: RustWasmModule | null = null;
  
  constructor(mode: RustBridgeMode = 'auto') {
    this.mode = mode;
    this.httpClient = RustHttpClient.getInstance();
  }
  
  /**
   * Initialize the bridge (loads WASM if needed)
   */
  async init(): Promise<void> {
    if (this.mode === 'wasm' || this.mode === 'auto') {
      try {
        this.wasmModule = await loadRustWasm();
        console.log('[RustBridge] WASM loaded, version:', this.wasmModule.get_version());
      } catch (error) {
        console.warn('[RustBridge] WASM load failed, falling back to HTTP');
        if (this.mode === 'wasm') throw error;
      }
    }
  }
  
  /**
   * Get the active mode
   */
  getActiveMode(): 'http' | 'wasm' {
    return this.wasmModule ? 'wasm' : 'http';
  }
  
  /**
   * Check a spell using the appropriate backend
   */
  async checkSpell(
    app: RustApp,
    tx: RustTransaction,
    x: RustData = { type: 'empty' },
    w: RustData = { type: 'empty' }
  ): Promise<RustCheckResult> {
    // Try WASM first if available
    if (this.wasmModule) {
      try {
        const result = this.wasmModule.check_spell(
          JSON.stringify(app),
          JSON.stringify(tx),
          JSON.stringify(x),
          JSON.stringify(w)
        ) as RustCheckResult;
        return result;
      } catch (error) {
        console.warn('[RustBridge] WASM check failed, falling back to HTTP:', error);
      }
    }
    
    // Fall back to HTTP
    return this.httpClient.checkSpell(app, tx, x, w);
  }
  
  /**
   * Build and check a token transaction
   */
  async buildToken(params: {
    appTag: string;
    vkHash: string;
    inputAmounts: number[];
    outputAmounts: number[];
  }): Promise<{
    app: RustApp;
    tx: RustTransaction;
    checkResult: RustCheckResult;
  }> {
    if (this.wasmModule) {
      try {
        const built = this.wasmModule.build_token_tx(
          params.appTag,
          params.vkHash,
          JSON.stringify(params.inputAmounts),
          JSON.stringify(params.outputAmounts)
        ) as { app: RustApp; tx: RustTransaction };
        
        const checkResult = this.wasmModule.check_token(
          JSON.stringify(built.app),
          JSON.stringify(built.tx),
          JSON.stringify({ type: 'bytes', value: 'deadbeef' })
        ) as RustCheckResult;
        
        return { ...built, checkResult };
      } catch (error) {
        console.warn('[RustBridge] WASM build failed, falling back to HTTP:', error);
      }
    }
    
    return this.httpClient.buildToken(params);
  }
  
  /**
   * Build and check an escrow transaction
   */
  async buildEscrow(params: {
    appTag: string;
    currentState?: RustEscrowState;
    nextState: RustEscrowState;
    amount: number;
  }): Promise<{
    app: RustApp;
    tx: RustTransaction;
    checkResult: RustCheckResult;
  }> {
    // HTTP only for now - WASM escrow builder not implemented yet
    return this.httpClient.buildEscrow(params);
  }
  
  /**
   * Verify a normalized spell
   */
  async verifySpell(spell: RustNormalizedSpell): Promise<{
    valid: boolean;
    version: number;
    inputCount: number;
    outputCount: number;
    errors: string[];
  }> {
    if (this.wasmModule) {
      try {
        return this.wasmModule.verify_spell(JSON.stringify(spell)) as {
          valid: boolean;
          version: number;
          inputCount: number;
          outputCount: number;
          errors: string[];
        };
      } catch (error) {
        console.warn('[RustBridge] WASM verify failed, falling back to HTTP:', error);
      }
    }
    
    return this.httpClient.verifySpell(spell);
  }
  
  /**
   * Verify a spark/spell from a generic object (for flexible hook usage)
   */
  async verifySpark(spell: Record<string, unknown>): Promise<{
    valid: boolean;
    version?: number;
    inputCount?: number;
    outputCount?: number;
    errors: string[];
  }> {
    try {
      // Convert generic spell to RustNormalizedSpell
      const normalizedSpell: RustNormalizedSpell = {
        version: (spell.version as number) || 2,
        ins: ((spell.ins || []) as { txid: string; vout: number }[]).map((input) => ({
          utxo_ref: { txid: input.txid, vout: input.vout },
          charms: null,
        })),
        outs: ((spell.outs || []) as Record<string, unknown>[]).map((output, index) => ({
          index,
          charms: output.charms 
            ? { apps: { output: { type: 'bytes' as const, value: JSON.stringify(output.charms) } } } 
            : null,
        })),
      };
      
      return this.verifySpell(normalizedSpell);
    } catch (error) {
      console.warn('[RustBridge] verifySpark failed:', error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }
  
  /**
   * Get version info
   */
  getVersion(): string {
    if (this.wasmModule) {
      return this.wasmModule.get_version();
    }
    return '0.10.0-http';
  }
}

// ============================================
// React Hook for Rust Bridge
// ============================================

import { useState, useEffect, useCallback } from 'react';

export interface UseRustBridgeReturn {
  bridge: RustBridge | null;
  mode: 'http' | 'wasm' | 'loading';
  version: string;
  isReady: boolean;
  checkSpell: (
    app: RustApp,
    tx: RustTransaction,
    x?: RustData,
    w?: RustData
  ) => Promise<RustCheckResult | null>;
  buildToken: (params: {
    appTag: string;
    vkHash: string;
    inputAmounts: number[];
    outputAmounts: number[];
  }) => Promise<{ app: RustApp; tx: RustTransaction; checkResult: RustCheckResult } | null>;
  buildEscrow: (params: {
    appTag: string;
    currentState?: RustEscrowState;
    nextState: RustEscrowState;
    amount: number;
  }) => Promise<{ app: RustApp; tx: RustTransaction; checkResult: RustCheckResult } | null>;
  verifySpark: (spell: Record<string, unknown>) => Promise<{
    valid: boolean;
    version?: number;
    inputCount?: number;
    outputCount?: number;
    errors: string[];
  } | null>;
}

export function useRustBridge(preferredMode: RustBridgeMode = 'auto'): UseRustBridgeReturn {
  const [bridge, setBridge] = useState<RustBridge | null>(null);
  const [mode, setMode] = useState<'http' | 'wasm' | 'loading'>('loading');
  const [version, setVersion] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const initBridge = async () => {
      const newBridge = new RustBridge(preferredMode);
      await newBridge.init();
      
      setBridge(newBridge);
      setMode(newBridge.getActiveMode());
      setVersion(newBridge.getVersion());
      setIsReady(true);
    };
    
    initBridge();
  }, [preferredMode]);
  
  const checkSpell = useCallback(async (
    app: RustApp,
    tx: RustTransaction,
    x: RustData = { type: 'empty' },
    w: RustData = { type: 'empty' }
  ): Promise<RustCheckResult | null> => {
    if (!bridge) return null;
    return bridge.checkSpell(app, tx, x, w);
  }, [bridge]);
  
  const buildToken = useCallback(async (params: {
    appTag: string;
    vkHash: string;
    inputAmounts: number[];
    outputAmounts: number[];
  }) => {
    if (!bridge) return null;
    return bridge.buildToken(params);
  }, [bridge]);
  
  const buildEscrow = useCallback(async (params: {
    appTag: string;
    currentState?: RustEscrowState;
    nextState: RustEscrowState;
    amount: number;
  }) => {
    if (!bridge) return null;
    return bridge.buildEscrow(params);
  }, [bridge]);
  
  const verifySpark = useCallback(async (spell: Record<string, unknown>): Promise<{
    valid: boolean;
    version?: number;
    inputCount?: number;
    outputCount?: number;
    errors: string[];
  } | null> => {
    if (!bridge) return null;
    try {
      // Convert the generic spell to RustNormalizedSpell format
      const normalizedSpell: RustNormalizedSpell = {
        version: (spell.version as number) || 2,
        ins: ((spell.ins || []) as { txid: string; vout: number }[]).map((input) => ({
          utxo_ref: { txid: input.txid, vout: input.vout },
          charms: null,
        })),
        outs: ((spell.outs || []) as Record<string, unknown>[]).map((output, index) => ({
          index,
          charms: output.charms 
            ? { apps: { output: { type: 'bytes' as const, value: JSON.stringify(output.charms) } } } 
            : null,
        })),
      };
      const result = await bridge.verifySpell(normalizedSpell);
      return result;
    } catch (error) {
      console.error('[useRustBridge] verifySpark failed:', error);
      return { valid: false, errors: [String(error)] };
    }
  }, [bridge]);
  
  return {
    bridge,
    mode,
    version,
    isReady,
    checkSpell,
    buildToken,
    buildEscrow,
    verifySpark,
  };
}

// Export singleton instances
export const rustHttpClient = RustHttpClient.getInstance();
export const rustBridge = new RustBridge('auto');

export default {
  RustHttpClient,
  RustBridge,
  loadRustWasm,
  useRustBridge,
  rustHttpClient,
  rustBridge,
};
