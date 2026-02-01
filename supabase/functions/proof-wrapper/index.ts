// Proof Wrapper Edge Function - HTTP API for charms-proof-wrapper
// Exposes SP1 zkVM proof verification wrapper functionality

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Spell Checker Verification Key (from charms-proof-wrapper lib.rs)
const SPELL_CHECKER_VK: number[] = [
  1137430973, 2011028408, 625211435, 1988224886, 433288175, 1277294349, 746782103, 737580122,
];

const VERSIONS = {
  proofWrapper: '0.1.0',
  sp1Zkvm: '4.1.7',
  api: '1.0.0',
};

// ============================================
// Cryptographic Utilities
// ============================================

async function sha256Hash(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new Uint8Array(data).buffer as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function u32ArrayToHex(arr: number[]): string {
  const buffer = new ArrayBuffer(arr.length * 4);
  const view = new DataView(buffer);
  arr.forEach((val, i) => view.setUint32(i * 4, val, false)); // big-endian
  return bytesToHex(new Uint8Array(buffer));
}

// ============================================
// SP1 Proof Verification (Simulated)
// ============================================

interface ProofVerificationResult {
  valid: boolean;
  vkHash: string;
  publicValuesHash: string;
  proofCommitment: string;
  timestamp: number;
  errors: string[];
}

async function verifyProof(
  vk: number[],
  committedData: Uint8Array
): Promise<ProofVerificationResult> {
  const errors: string[] = [];
  
  // Hash the committed data (simulates sp1_primitives::io::sha256_hash)
  const publicValuesHash = await sha256Hash(committedData);
  
  // Verify the VK matches expected spell checker VK
  const vkMatches = vk.every((val, i) => val === SPELL_CHECKER_VK[i]);
  if (!vkMatches) {
    errors.push('Verification key does not match spell checker VK');
  }
  
  // Simulate SP1 proof verification
  // In real zkVM, this would call verify_sp1_proof(vk, &pv)
  const proofCommitment = await sha256Hash(
    new Uint8Array([...publicValuesHash, ...hexToBytes(u32ArrayToHex(vk))])
  );
  
  return {
    valid: errors.length === 0,
    vkHash: u32ArrayToHex(vk),
    publicValuesHash: bytesToHex(publicValuesHash),
    proofCommitment: bytesToHex(proofCommitment),
    timestamp: Date.now(),
    errors,
  };
}

// ============================================
// Spell Prover Input Processing
// ============================================

interface SpellProverInput {
  selfSpellVk: string;
  prevTxs: string[];
  spell: {
    version: number;
    ins: Array<{ txid: string; vout: number }>;
    outs: Array<{ value: number; script: string }>;
  };
  txInsBeamedSourceUtxos: Array<{ txid: string; vout: number }>;
  appInput: {
    type: string;
    publicInputs: Record<string, unknown>;
    witnessData?: string;
  };
}

interface SpellCheckResult {
  valid: boolean;
  selfSpellVk: string;
  normalizedSpell: SpellProverInput['spell'];
  proofResult: ProofVerificationResult;
  errors: string[];
}

async function runSpellChecker(input: SpellProverInput): Promise<SpellCheckResult> {
  const errors: string[] = [];
  
  // Validate input structure
  if (!input.selfSpellVk || input.selfSpellVk.length < 64) {
    errors.push('Invalid self_spell_vk');
  }
  
  if (!input.spell || !input.spell.version) {
    errors.push('Invalid spell structure');
  }
  
  if (!Array.isArray(input.spell?.ins) || input.spell.ins.length === 0) {
    errors.push('Spell must have at least one input');
  }
  
  if (!Array.isArray(input.spell?.outs) || input.spell.outs.length === 0) {
    errors.push('Spell must have at least one output');
  }
  
  // Serialize the input for hashing
  const inputBytes = new TextEncoder().encode(JSON.stringify(input));
  
  // Run proof verification
  const proofResult = await verifyProof(SPELL_CHECKER_VK, inputBytes);
  
  // Combine errors
  const allErrors = [...errors, ...proofResult.errors];
  
  return {
    valid: allErrors.length === 0,
    selfSpellVk: input.selfSpellVk,
    normalizedSpell: input.spell,
    proofResult,
    errors: allErrors,
  };
}

// ============================================
// Wrapper Proof Generation
// ============================================

interface WrapperProofInput {
  spellData: string; // hex-encoded spell data
  vk?: number[];
}

interface WrapperProofResult {
  valid: boolean;
  inputCommitment: string;
  outputCommitment: string;
  vkHash: string;
  proofSeal: string;
  timestamp: number;
  errors: string[];
}

async function generateWrapperProof(input: WrapperProofInput): Promise<WrapperProofResult> {
  const errors: string[] = [];
  
  if (!input.spellData || input.spellData.length === 0) {
    errors.push('Missing spell data');
  }
  
  const vk = input.vk || SPELL_CHECKER_VK;
  
  // Parse spell data
  let spellBytes: Uint8Array;
  try {
    spellBytes = hexToBytes(input.spellData);
  } catch {
    spellBytes = new TextEncoder().encode(input.spellData);
  }
  
  // Generate proof commitments
  const inputCommitment = await sha256Hash(spellBytes);
  
  // Verify with VK
  const verifyResult = await verifyProof(vk, spellBytes);
  
  // Generate proof seal (simulates RISC Zero seal)
  const sealData = new Uint8Array([
    ...inputCommitment,
    ...hexToBytes(verifyResult.publicValuesHash),
  ]);
  const proofSeal = await sha256Hash(sealData);
  
  return {
    valid: errors.length === 0 && verifyResult.valid,
    inputCommitment: bytesToHex(inputCommitment),
    outputCommitment: verifyResult.publicValuesHash,
    vkHash: verifyResult.vkHash,
    proofSeal: `risc0_seal_v1_${bytesToHex(proofSeal)}`,
    timestamp: Date.now(),
    errors: [...errors, ...verifyResult.errors],
  };
}

// ============================================
// HTTP Request Handler
// ============================================

interface APIRequest {
  action: string;
  input?: SpellProverInput;
  wrapperInput?: WrapperProofInput;
  data?: string;
  vk?: number[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);

    // GET requests - health/info endpoints
    if (req.method === 'GET') {
      const endpoint = path[path.length - 1];
      
      if (endpoint === 'health' || endpoint === 'proof-wrapper') {
        return jsonResponse({
          status: 'ok',
          versions: VERSIONS,
          spellCheckerVk: u32ArrayToHex(SPELL_CHECKER_VK),
          capabilities: ['verify_proof', 'run_spell_checker', 'generate_wrapper_proof', 'get_vk'],
        });
      }
      
      if (endpoint === 'vk') {
        return jsonResponse({
          vk: SPELL_CHECKER_VK,
          vkHex: u32ArrayToHex(SPELL_CHECKER_VK),
        });
      }
    }

    // POST requests - main API
    if (req.method === 'POST') {
      const body: APIRequest = await req.json();
      
      console.log(`[proof-wrapper] action=${body.action}`);

      switch (body.action) {
        case 'verify_proof': {
          if (!body.data) {
            return errorResponse('Missing data', 400);
          }
          const dataBytes = new TextEncoder().encode(body.data);
          const vk = body.vk || SPELL_CHECKER_VK;
          const result = await verifyProof(vk, dataBytes);
          return jsonResponse(result);
        }

        case 'run_spell_checker': {
          if (!body.input) {
            return errorResponse('Missing input', 400);
          }
          const result = await runSpellChecker(body.input);
          return jsonResponse(result);
        }

        case 'generate_wrapper_proof': {
          if (!body.wrapperInput) {
            return errorResponse('Missing wrapperInput', 400);
          }
          const result = await generateWrapperProof(body.wrapperInput);
          return jsonResponse(result);
        }

        case 'get_vk': {
          return jsonResponse({
            vk: SPELL_CHECKER_VK,
            vkHex: u32ArrayToHex(SPELL_CHECKER_VK),
          });
        }

        case 'version': {
          return jsonResponse(VERSIONS);
        }

        default:
          return errorResponse(`Unknown action: ${body.action}`, 400);
      }
    }

    return errorResponse('Method not allowed', 405);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[proof-wrapper] Error:', message);
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
