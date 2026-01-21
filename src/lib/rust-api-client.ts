/**
 * Rust API Client
 * 
 * This client calls the Edge Function API that mirrors Rust charmix logic.
 * Similar to calling: fetch("http://localhost:3000/reward") in a Rust backend setup
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types (mirrors Rust data structures)
// ============================================================================

export interface RustApiResponse<T> {
  data: T | null;
  error: string | null;
  rust_verified: boolean;
}

export interface RewardResponse {
  message: string;
  amount: number;
  rust_verified: boolean;
  timestamp: string;
}

export interface SpellCheckResponse {
  valid: boolean;
  type: string;
  details: string;
  rust_verified: boolean;
}

export interface EscrowValidationResponse {
  valid: boolean;
  details: string;
  escrowId: string;
  rust_verified: boolean;
}

export interface TokenValidationResponse {
  valid: boolean;
  details: string;
  tokenTag: string;
  rust_verified: boolean;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  rust_compatible: boolean;
  endpoints: string[];
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Get reward calculation from Rust API
 * Mirrors: fetch("http://localhost:3000/reward")
 */
export async function getReward(): Promise<RustApiResponse<RewardResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('spell-checker/reward', {
      method: 'GET'
    });

    if (error) {
      console.error('[Rust API Client] getReward error:', error);
      return { data: null, error: error.message, rust_verified: false };
    }

    return { data, error: null, rust_verified: data?.rust_verified || false };
  } catch (err) {
    console.error('[Rust API Client] getReward exception:', err);
    return { data: null, error: (err as Error).message, rust_verified: false };
  }
}

/**
 * Check a spell using full Rust-style verification
 */
export async function checkSpell(
  app: { tag: string; vk_hash: string },
  tx: {
    txid: string;
    inputs: Array<{
      utxo_ref: { txid: string; vout: number };
      charm_state: { apps: Record<string, { type: string; value?: unknown }> } | null;
    }>;
    outputs: Array<{
      index: number;
      value: number;
      script_pubkey: number[];
      charm_state: { apps: Record<string, { type: string; value?: unknown }> } | null;
    }>;
  },
  x?: { type: string; value?: unknown },
  w?: { type: string; value?: unknown }
): Promise<RustApiResponse<SpellCheckResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('spell-checker/check-spell', {
      method: 'POST',
      body: { app, tx, x, w }
    });

    if (error) {
      console.error('[Rust API Client] checkSpell error:', error);
      return { data: null, error: error.message, rust_verified: false };
    }

    return { data, error: null, rust_verified: data?.rust_verified || false };
  } catch (err) {
    console.error('[Rust API Client] checkSpell exception:', err);
    return { data: null, error: (err as Error).message, rust_verified: false };
  }
}

/**
 * Validate escrow state transition
 */
export async function validateEscrow(
  escrowId: string,
  currentState: number | undefined,
  nextState: number,
  amount?: number
): Promise<RustApiResponse<EscrowValidationResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('spell-checker/validate-escrow', {
      method: 'POST',
      body: { escrowId, currentState, nextState, amount }
    });

    if (error) {
      console.error('[Rust API Client] validateEscrow error:', error);
      return { data: null, error: error.message, rust_verified: false };
    }

    return { data, error: null, rust_verified: data?.rust_verified || false };
  } catch (err) {
    console.error('[Rust API Client] validateEscrow exception:', err);
    return { data: null, error: (err as Error).message, rust_verified: false };
  }
}

/**
 * Validate token transaction
 */
export async function validateToken(
  tokenTag: string,
  inputAmounts: number[],
  outputAmounts: number[],
  hasSignature: boolean = false
): Promise<RustApiResponse<TokenValidationResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('spell-checker/validate-token', {
      method: 'POST',
      body: { tokenTag, inputAmounts, outputAmounts, signature: hasSignature }
    });

    if (error) {
      console.error('[Rust API Client] validateToken error:', error);
      return { data: null, error: error.message, rust_verified: false };
    }

    return { data, error: null, rust_verified: data?.rust_verified || false };
  } catch (err) {
    console.error('[Rust API Client] validateToken exception:', err);
    return { data: null, error: (err as Error).message, rust_verified: false };
  }
}

/**
 * Health check for Rust API
 */
export async function healthCheck(): Promise<RustApiResponse<HealthResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('spell-checker/health', {
      method: 'GET'
    });

    if (error) {
      console.error('[Rust API Client] healthCheck error:', error);
      return { data: null, error: error.message, rust_verified: false };
    }

    return { data, error: null, rust_verified: data?.rust_compatible || false };
  } catch (err) {
    console.error('[Rust API Client] healthCheck exception:', err);
    return { data: null, error: (err as Error).message, rust_verified: false };
  }
}

// ============================================================================
// React Hook for Rust API
// ============================================================================

export function useRustApi() {
  return {
    getReward,
    checkSpell,
    validateEscrow,
    validateToken,
    healthCheck
  };
}
