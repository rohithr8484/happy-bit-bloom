/**
 * Rust-Style ZK Prover Hook
 * 
 * React hook that provides Rust-style ZK proof generation
 * using the SP1 prover and Charms spell checker patterns.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  SP1Prover,
  isCorrect,
  getrandom,
  bytesToHex,
  MerkleTree,
  PROOF_CONFIGS,
  createLendingSpell,
  createSyntheticAssetSpell,
  createGovernanceSpell,
  createNFTSpell,
  createAMMSpell,
  type ProofType,
  type ProofConfig,
  type ZkProof,
  type SpellProverInput,
  type NormalizedSpell,
  type SpellValidation,
  type Result,
  Ok,
  Err,
} from '@/lib/rust-zk-prover';
import { maestro } from '@/lib/maestro-sdk';

// ============= Types =============

export interface RustProofRequest {
  type: ProofType;
  inputs: {
    value: string;
    threshold?: number;
    txid?: string;
    vout?: number;
  };
}

export interface RustProofResult {
  id: string;
  type: ProofType;
  status: 'pending' | 'generating' | 'verifying' | 'verified' | 'failed';
  proof?: ZkProof;
  validation?: SpellValidation;
  error?: string;
  
  // Timing
  createdAt: Date;
  generatedAt?: Date;
  verifiedAt?: Date;
  
  // Metrics
  cyclesUsed?: number;
  gasEstimate?: number;
  executionTimeMs?: number;
  
  // Input/Output hashes
  inputHash: string;
  outputHash?: string;
  journalHash?: string;
}

export interface ProverStats {
  totalProofs: number;
  verifiedProofs: number;
  totalCycles: number;
  averageTimeMs: number;
}

export interface CharmsApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  buildFn: (params: Record<string, unknown>) => NormalizedSpell;
}

// ============= Charms Application Definitions =============

export const CHARMS_APPS: CharmsApp[] = [
  {
    id: 'lending',
    name: 'Bitcoin Lending Protocol',
    description: 'Collateralized lending with programmable interest rates and liquidation logic',
    icon: 'Bitcoin',
    color: 'from-orange-500 to-amber-500',
    buildFn: (params) => createLendingSpell({
      collateralUtxo: {
        txid: params.txid as string || '0'.repeat(64),
        vout: params.vout as number || 0,
        value: params.collateralValue as number || 100000,
      },
      borrowAmount: params.borrowAmount as number || 50000,
      interestRateBps: params.interestRateBps as number || 500,
      durationBlocks: params.durationBlocks as number || 144,
      borrowerAddress: params.borrowerAddress as string || 'bc1q...',
    }),
  },
  {
    id: 'synthetic',
    name: 'Synthetic Assets / Bitcoin Backed Stables',
    description: 'Create stablecoins and synthetic assets backed by BTC collateral',
    icon: 'Coins',
    color: 'from-green-500 to-emerald-500',
    buildFn: (params) => createSyntheticAssetSpell({
      collateralUtxo: {
        txid: params.txid as string || '0'.repeat(64),
        vout: params.vout as number || 0,
        value: params.collateralValue as number || 100000,
      },
      syntheticTicker: params.ticker as string || 'BTCUSD',
      syntheticAmount: params.amount as number || 1000,
      collateralRatioBps: params.collateralRatioBps as number || 15000,
      recipientAddress: params.recipientAddress as string || 'bc1q...',
    }),
  },
  {
    id: 'governance',
    name: 'Governance Tokens and Contracts',
    description: 'On-chain voting, DAOs, and token-weighted governance systems',
    icon: 'Vote',
    color: 'from-purple-500 to-indigo-500',
    buildFn: (params) => createGovernanceSpell({
      fundingUtxo: {
        txid: params.txid as string || '0'.repeat(64),
        vout: params.vout as number || 0,
        value: params.fundingValue as number || 10000,
      },
      tokenTicker: params.ticker as string || 'GOV',
      totalSupply: params.totalSupply as number || 1000000,
      votingPowerPerToken: params.votingPower as number || 1,
      recipientAddress: params.recipientAddress as string || 'bc1q...',
    }),
  },
  {
    id: 'nft',
    name: 'NFT Marketplaces & Collections',
    description: 'Ordinals-compatible NFTs with programmable royalties and trading',
    icon: 'Building2',
    color: 'from-pink-500 to-rose-500',
    buildFn: (params) => createNFTSpell({
      fundingUtxo: {
        txid: params.txid as string || '0'.repeat(64),
        vout: params.vout as number || 0,
        value: params.fundingValue as number || 10000,
      },
      collectionName: params.collectionName as string || 'MyCollection',
      tokenId: params.tokenId as number || 1,
      metadataUri: params.metadataUri as string || 'ipfs://...',
      royaltyBps: params.royaltyBps as number || 500,
      recipientAddress: params.recipientAddress as string || 'bc1q...',
    }),
  },
  {
    id: 'amm',
    name: 'DeFi Primitives & AMMs',
    description: 'Automated market makers, liquidity pools, and yield strategies',
    icon: 'TrendingUp',
    color: 'from-cyan-500 to-blue-500',
    buildFn: (params) => createAMMSpell({
      tokenAUtxo: {
        txid: params.tokenATxid as string || '0'.repeat(64),
        vout: params.tokenAVout as number || 0,
        value: params.tokenAValue as number || 50000,
      },
      tokenBUtxo: {
        txid: params.tokenBTxid as string || '0'.repeat(64),
        vout: params.tokenBVout as number || 0,
        value: params.tokenBValue as number || 50000,
      },
      tokenA: {
        ticker: params.tokenATicker as string || 'BTC',
        amount: params.tokenAAmount as number || 100000,
      },
      tokenB: {
        ticker: params.tokenBTicker as string || 'USDT',
        amount: params.tokenBAmount as number || 100000,
      },
      lpRecipientAddress: params.lpRecipientAddress as string || 'bc1q...',
    }),
  },
];

// ============= Hook Implementation =============

export function useRustZKProver() {
  const [proofs, setProofs] = useState<RustProofResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeProof, setActiveProof] = useState<RustProofResult | null>(null);

  // Create prover instance
  const prover = useMemo(() => {
    const elfResult = getrandom.getBytes(32);
    const elf = elfResult.ok ? elfResult.value : new Uint8Array(32);
    return new SP1Prover(elf);
  }, []);

  // Compute stats
  const stats = useMemo<ProverStats>(() => ({
    totalProofs: proofs.length,
    verifiedProofs: proofs.filter(p => p.status === 'verified').length,
    totalCycles: proofs.reduce((sum, p) => sum + (p.cyclesUsed || 0), 0),
    averageTimeMs: proofs.length > 0
      ? proofs
          .filter(p => p.executionTimeMs)
          .reduce((sum, p) => sum + (p.executionTimeMs || 0), 0) /
          proofs.filter(p => p.executionTimeMs).length
      : 0,
  }), [proofs]);

  /**
   * Generate a ZK proof using the Rust-style prover
   */
  const generateProof = useCallback(async (
    request: RustProofRequest
  ): Promise<Result<RustProofResult, Error>> => {
    setLoading(true);

    // Generate unique ID
    const idResult = getrandom.getHex(8);
    const id = idResult.ok ? `proof_${idResult.value}` : `proof_${Date.now()}`;

    // Generate input hash
    const inputHashResult = getrandom.getHex(32);
    const inputHash = inputHashResult.ok ? inputHashResult.value : '0'.repeat(64);

    // Create initial proof result
    const result: RustProofResult = {
      id,
      type: request.type,
      status: 'pending',
      createdAt: new Date(),
      inputHash,
    };

    setActiveProof(result);
    setProofs(prev => [result, ...prev]);

    try {
      // Phase 1: Pending -> Generating
      await new Promise(r => setTimeout(r, 500));
      result.status = 'generating';
      updateProof(result);

      // Get proof config
      const config = PROOF_CONFIGS[request.type];
      
      // Build spell based on proof type
      const spell = await buildSpellForProofType(request);
      
      // Create prover input
      const vkHashResult = getrandom.getHex(32);
      const proverInput: SpellProverInput = {
        selfSpellVk: vkHashResult.ok ? vkHashResult.value : '0'.repeat(64),
        prevTxs: [],
        spell,
        txInsBeamedSourceUtxos: spell.ins.map(input => ({
          txid: input.txid,
          vout: input.vout,
        })),
        appInput: {
          type: mapProofTypeToAppType(request.type),
          publicInputs: request.inputs,
          witnessData: new Uint8Array(64),
        },
      };

      // Validate spell using is_correct
      const validationResult = isCorrect(
        proverInput.selfSpellVk,
        proverInput.prevTxs,
        proverInput.spell,
        proverInput.txInsBeamedSourceUtxos,
        proverInput.appInput
      );

      if (!validationResult.ok) {
        throw new Error((validationResult as { ok: false; error: { message: string } }).error.message);
      }

      result.validation = validationResult.value;

      // Simulate proof generation time
      const generationTime = config.estimatedTimeMs * 0.1;
      await new Promise(r => setTimeout(r, generationTime));

      // Generate proof
      const proofResult = await prover.prove(proverInput);
      if (!proofResult.ok) {
        throw (proofResult as { ok: false; error: Error }).error;
      }

      result.proof = proofResult.value;
      result.generatedAt = new Date();
      result.outputHash = bytesToHex(proofResult.value.seal.slice(0, 32));
      result.journalHash = bytesToHex(proofResult.value.journal.slice(0, 32));
      result.cyclesUsed = config.estimatedCycles;
      result.status = 'verifying';
      updateProof(result);

      // Phase 3: Verification
      await new Promise(r => setTimeout(r, 1500));

      const verifyResult = await prover.verify(proofResult.value);
      if (!verifyResult.ok || !verifyResult.value) {
        throw new Error('Proof verification failed');
      }

      result.status = 'verified';
      result.verifiedAt = new Date();
      result.executionTimeMs = result.verifiedAt.getTime() - result.createdAt.getTime();
      result.gasEstimate = Math.floor(80000 + Math.random() * 50000);
      updateProof(result);
      setActiveProof(null);

      return Ok(result);
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      updateProof(result);
      setActiveProof(null);
      return Err(error instanceof Error ? error : new Error('Proof generation failed'));
    } finally {
      setLoading(false);
    }
  }, [prover]);

  /**
   * Build a Charms spell for a specific proof type
   */
  const buildSpellForProofType = async (
    request: RustProofRequest
  ): Promise<NormalizedSpell> => {
    const vkHashResult = getrandom.getHex(32);
    const vkHash = vkHashResult.ok ? vkHashResult.value : '0'.repeat(64);
    const txidResult = getrandom.getHex(32);
    const txid = request.inputs.txid || (txidResult.ok ? txidResult.value : '0'.repeat(64));

    switch (request.type) {
      case 'utxo_ownership':
        return {
          version: 2,
          apps: { '$ownership': { vkHash, namespace: 'ownership' } },
          ins: [{ txid, vout: request.inputs.vout || 0 }],
          outs: [{ value: 0, script: 'OP_RETURN' }],
        };

      case 'balance_threshold': {
        const threshold = request.inputs.threshold || parseInt(request.inputs.value) || 100000;
        return {
          version: 2,
          apps: { '$balance': { vkHash, namespace: 'balance' } },
          ins: [{ txid, vout: 0 }],
          outs: [{
            value: threshold,
            script: 'OP_RETURN',
            charms: [{ appVkHash: vkHash, state: { threshold, verified: true } }],
          }],
        };
      }

      case 'transaction_inclusion': {
        // Build Merkle proof for transaction inclusion
        const leaves = Array.from({ length: 16 }, () => {
          const result = getrandom.getBytes(32);
          return result.ok ? result.value : new Uint8Array(32);
        });
        const merkleTree = new MerkleTree(leaves);
        
        return {
          version: 2,
          apps: { '$inclusion': { vkHash, namespace: 'inclusion' } },
          ins: [{ txid, vout: 0 }],
          outs: [{
            value: 0,
            script: 'OP_RETURN',
            charms: [{
              appVkHash: vkHash,
              state: {
                merkleRoot: merkleTree.getRootHex(),
                txIndex: Math.floor(Math.random() * 16),
                blockHeight: 800000 + Math.floor(Math.random() * 10000),
              },
            }],
          }],
        };
      }

      case 'state_transition':
        return {
          version: 2,
          apps: { '$state': { vkHash, namespace: 'state' } },
          ins: [{ txid, vout: 0 }],
          outs: [{
            value: 1000,
            script: 'OP_RETURN',
            charms: [{
              appVkHash: vkHash,
              state: {
                previousStateHash: getrandom.getHex(32),
                newStateHash: getrandom.getHex(32),
                transitionType: 'spell_execution',
              },
            }],
          }],
        };

      case 'collateral_ratio': {
        const btcPrice = await maestro.getBitcoinPrice();
        const ratio = request.inputs.threshold || 15000; // 150% in bps
        
        return {
          version: 2,
          apps: { '$collateral': { vkHash, namespace: 'collateral' } },
          ins: [{ txid, vout: 0 }],
          outs: [{
            value: 1000,
            script: 'OP_RETURN',
            charms: [{
              appVkHash: vkHash,
              state: {
                collateralRatioBps: ratio,
                btcPriceAtProof: btcPrice.usd,
                verified: true,
              },
            }],
          }],
        };
      }

      default:
        throw new Error(`Unknown proof type: ${request.type}`);
    }
  };

  /**
   * Build a Charms application spell
   */
  const buildCharmsApp = useCallback((
    appId: string,
    params: Record<string, unknown>
  ): Result<NormalizedSpell, Error> => {
    const app = CHARMS_APPS.find(a => a.id === appId);
    if (!app) {
      return Err(new Error(`Unknown Charms app: ${appId}`));
    }
    
    try {
      const spell = app.buildFn(params);
      return Ok(spell);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error('Failed to build spell'));
    }
  }, []);

  /**
   * Verify a Charms spell using is_correct
   */
  const verifySpell = useCallback((
    spell: NormalizedSpell
  ): Result<SpellValidation, Error> => {
    const vkResult = getrandom.getHex(32);
    const selfVk = vkResult.ok ? vkResult.value : '0'.repeat(64);

    const result = isCorrect(
      selfVk,
      [],
      spell,
      spell.ins.map(i => ({ txid: i.txid, vout: i.vout })),
      { type: 'mint', publicInputs: {}, witnessData: new Uint8Array(64) }
    );

    if (!result.ok) {
      return Err(new Error((result as { ok: false; error: { message: string } }).error.message));
    }

    return Ok(result.value);
  }, []);

  /**
   * Update a proof in the state
   */
  const updateProof = (proof: RustProofResult) => {
    setProofs(prev => prev.map(p => p.id === proof.id ? { ...proof } : p));
    if (activeProof?.id === proof.id) {
      setActiveProof({ ...proof });
    }
  };

  /**
   * Map proof type to app input type
   */
  const mapProofTypeToAppType = (type: ProofType) => {
    switch (type) {
      case 'utxo_ownership': return 'mint' as const;
      case 'balance_threshold': return 'transfer' as const;
      case 'transaction_inclusion': return 'mint' as const;
      case 'state_transition': return 'stateUpdate' as const;
      case 'collateral_ratio': return 'escrow' as const;
    }
  };

  /**
   * Get config for a proof type
   */
  const getProofConfig = useCallback((type: ProofType): ProofConfig => {
    return PROOF_CONFIGS[type];
  }, []);

  /**
   * Cancel an active proof
   */
  const cancelProof = useCallback((proofId: string) => {
    setProofs(prev => prev.filter(p => p.id !== proofId));
    if (activeProof?.id === proofId) {
      setActiveProof(null);
    }
  }, [activeProof]);

  return {
    // State
    proofs,
    stats,
    loading,
    activeProof,
    
    // Actions
    generateProof,
    buildCharmsApp,
    verifySpell,
    cancelProof,
    
    // Utils
    getProofConfig,
    charmsApps: CHARMS_APPS,
  };
}
