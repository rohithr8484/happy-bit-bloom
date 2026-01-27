import { useState, useCallback, useEffect } from 'react';
import { 
  charmsSDK, 
  EscrowContract, 
  Milestone,
  TransactionResult 
} from '@/lib/charms-sdk';
import { promptTestnetTransaction, getMempoolTxUrl } from '@/lib/testnet-transactions';
import {
  RustSpellChecker, 
  EscrowState,
  type EscrowCheckResult 
} from '@/lib/rust-spell-checker';
import {
  CharmCrypto,
  createEncryptedEscrow,
  decryptEscrow,
  type EncryptedEscrowData,
} from '@/lib/charms-wasm-sdk';
import {
  useRustBridge,
  RustEscrowState,
  type RustCheckResult,
} from '@/lib/rust-wasm-bridge';

// Encryption key storage (in production, use secure key management)
const escrowEncryptionKeys = new Map<string, Uint8Array>();

// Demo escrows for showcasing the UI
const DEMO_ESCROWS: EscrowContract[] = [
  {
    id: 'demo-001',
    txid: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    outputIndex: 0,
    payer: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    payee: 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',
    arbiter: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    totalAmount: 50000000, // 0.5 BTC
    milestones: [
      {
        id: 'demo-001-m0',
        title: 'Project Setup & Architecture',
        description: 'Initialize repository, set up CI/CD, define system architecture',
        amount: 10000000,
        status: 'released',
        completedAt: new Date('2024-12-01'),
        releasedAt: new Date('2024-12-02'),
      },
      {
        id: 'demo-001-m1',
        title: 'Core Feature Development',
        description: 'Implement main functionality and business logic',
        amount: 20000000,
        status: 'completed',
        completedAt: new Date('2024-12-10'),
        proof: 'github.com/project/commit/abc123',
      },
      {
        id: 'demo-001-m2',
        title: 'Testing & Documentation',
        description: 'Unit tests, integration tests, and technical documentation',
        amount: 15000000,
        status: 'in_progress',
      },
      {
        id: 'demo-001-m3',
        title: 'Deployment & Handoff',
        description: 'Production deployment and knowledge transfer',
        amount: 5000000,
        status: 'pending',
      },
    ],
    createdAt: new Date('2024-11-15'),
    expiresAt: new Date('2025-02-15'),
    status: 'active',
  },
  {
    id: 'demo-002',
    txid: 'f6e5d4c3b2a1098765432109876543210fedcba9876543210fedcba98765432',
    outputIndex: 0,
    payer: 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h',
    payee: 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej',
    totalAmount: 15000000, // 0.15 BTC
    milestones: [
      {
        id: 'demo-002-m0',
        title: 'Design Mockups',
        description: 'Complete UI/UX design for all screens',
        amount: 5000000,
        status: 'released',
        completedAt: new Date('2024-12-05'),
        releasedAt: new Date('2024-12-06'),
      },
      {
        id: 'demo-002-m1',
        title: 'Frontend Implementation',
        description: 'Build responsive frontend components',
        amount: 10000000,
        status: 'pending',
      },
    ],
    createdAt: new Date('2024-12-01'),
    status: 'active',
  },
];

export interface UseEscrowReturn {
  escrows: EscrowContract[];
  selectedEscrow: EscrowContract | null;
  loading: boolean;
  error: string | null;
  rustBridgeMode: 'http' | 'wasm' | 'loading';
  rustBridgeVersion: string;
  createEscrow: (params: CreateEscrowParams) => Promise<EscrowContract>;
  selectEscrow: (id: string | null) => void;
  completeMilestone: (escrowId: string, milestoneId: string, proof: string) => Promise<void>;
  releaseMilestone: (escrowId: string, milestoneId: string) => Promise<TransactionResult>;
  disputeMilestone: (escrowId: string, milestoneId: string, reason: string) => Promise<void>;
  refreshEscrow: (escrowId: string) => Promise<void>;
  validateEscrowSpell: (escrowId: string, action: 'fund' | 'release' | 'dispute') => EscrowCheckResult;
  validateEscrowWithRustBridge: (escrowId: string, action: 'fund' | 'release' | 'dispute') => Promise<RustCheckResult | null>;
  encryptEscrowData: (escrowId: string) => EncryptedEscrowData | null;
  getEncryptionStatus: (escrowId: string) => { encrypted: boolean; keyExists: boolean };
}

export interface CreateEscrowParams {
  payerAddress: string;
  payeeAddress: string;
  arbiterAddress?: string;
  tokenType?: 'BTC' | 'zkBTC';
  milestones: {
    title: string;
    description: string;
    amount: number;
  }[];
  expiresAt?: Date;
}

export function useEscrow(): UseEscrowReturn {
  const [escrows, setEscrows] = useState<EscrowContract[]>(DEMO_ESCROWS);
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Rust WASM/HTTP bridge
  const { 
    mode: rustBridgeMode, 
    version: rustBridgeVersion, 
    buildEscrow,
    isReady: rustBridgeReady 
  } = useRustBridge('auto');

  // Log Rust bridge status
  useEffect(() => {
    if (rustBridgeReady) {
      console.log('[useEscrow] Rust bridge ready:', { mode: rustBridgeMode, version: rustBridgeVersion });
    }
  }, [rustBridgeReady, rustBridgeMode, rustBridgeVersion]);

  const createEscrow = useCallback(async (params: CreateEscrowParams): Promise<EscrowContract> => {
    setLoading(true);
    setError(null);

    try {
      const escrow = await charmsSDK.createEscrow({
        payer: params.payerAddress,
        payee: params.payeeAddress,
        arbiter: params.arbiterAddress,
        milestones: params.milestones,
        expiresAt: params.expiresAt,
      });

      // Prompt testnet transaction and show in mempool explorer
      const totalAmount = params.milestones.reduce((sum, m) => sum + m.amount, 0);
      promptTestnetTransaction('create_escrow', {
        amount: totalAmount,
        fromAddress: params.payerAddress,
        toAddress: params.payeeAddress,
      });

      setEscrows(prev => [escrow, ...prev]);
      return escrow;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create escrow';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectEscrow = useCallback((id: string | null) => {
    if (id === null) {
      setSelectedEscrow(null);
    } else {
      const escrow = escrows.find(e => e.id === id);
      setSelectedEscrow(escrow || null);
    }
  }, [escrows]);

  const completeMilestone = useCallback(async (
    escrowId: string,
    milestoneId: string,
    proof: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await charmsSDK.completeMilestone(escrowId, milestoneId, proof);

      // Find milestone amount for transaction prompt
      const escrow = escrows.find(e => e.id === escrowId);
      const milestone = escrow?.milestones.find(m => m.id === milestoneId);

      // Prompt testnet transaction
      promptTestnetTransaction('complete_milestone', {
        amount: milestone?.amount,
      });

      setEscrows(prev => prev.map(escrow => {
        if (escrow.id !== escrowId) return escrow;

        return {
          ...escrow,
          milestones: escrow.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m,
              status: 'completed' as const,
              proof,
              completedAt: new Date(),
            };
          }),
        };
      }));

      // Update selected escrow if it's the one being modified
      setSelectedEscrow(prev => {
        if (prev?.id !== escrowId) return prev;
        return {
          ...prev,
          milestones: prev.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m,
              status: 'completed' as const,
              proof,
              completedAt: new Date(),
            };
          }),
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete milestone';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrows]);

  const releaseMilestone = useCallback(async (
    escrowId: string,
    milestoneId: string
  ): Promise<TransactionResult> => {
    setLoading(true);
    setError(null);

    try {
      const escrow = escrows.find(e => e.id === escrowId);
      const milestone = escrow?.milestones.find(m => m.id === milestoneId);

      if (!escrow || !milestone) {
        throw new Error('Escrow or milestone not found');
      }

      const result = await charmsSDK.releaseMilestone(
        escrowId,
        milestoneId,
        milestone.amount,
        escrow.payee
      );

      // Prompt testnet transaction for fund release
      promptTestnetTransaction('release_milestone', {
        amount: milestone.amount,
        toAddress: escrow.payee,
      });

      setEscrows(prev => prev.map(e => {
        if (e.id !== escrowId) return e;

        const updatedMilestones = e.milestones.map(m => {
          if (m.id !== milestoneId) return m;
          return {
            ...m,
            status: 'released' as const,
            releasedAt: new Date(),
          };
        });

        // Check if all milestones are released
        const allReleased = updatedMilestones.every(m => m.status === 'released');

        return {
          ...e,
          milestones: updatedMilestones,
          status: allReleased ? 'completed' as const : e.status,
        };
      }));

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to release milestone';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [escrows]);

  const disputeMilestone = useCallback(async (
    escrowId: string,
    milestoneId: string,
    reason: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await charmsSDK.disputeMilestone(escrowId, milestoneId, reason);

      // Prompt testnet transaction for dispute
      promptTestnetTransaction('dispute_milestone');

      setEscrows(prev => prev.map(escrow => {
        if (escrow.id !== escrowId) return escrow;

        return {
          ...escrow,
          status: 'disputed' as const,
          milestones: escrow.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return { ...m, status: 'disputed' as const };
          }),
        };
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dispute milestone';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEscrow = useCallback(async (escrowId: string): Promise<void> => {
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow) return;

    setLoading(true);
    try {
      await charmsSDK.getEscrowState(escrow.txid);
      // In production, this would update the escrow state from blockchain
    } catch (err) {
      console.error('Failed to refresh escrow:', err);
    } finally {
      setLoading(false);
    }
  }, [escrows]);

  // Validate escrow spell using Rust spell checker logic
  const validateEscrowSpell = useCallback((
    escrowId: string,
    action: 'fund' | 'release' | 'dispute'
  ): EscrowCheckResult => {
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow) {
      return {
        valid: false,
        currentState: null,
        nextState: null,
        transitionValid: false,
        errors: ['Escrow not found'],
      };
    }

    // Map escrow status to Rust EscrowState
    const currentState = (() => {
      switch (escrow.status) {
        case 'active': return EscrowState.Funded;
        case 'completed': return EscrowState.Released;
        case 'disputed': return EscrowState.Disputed;
        case 'cancelled': return EscrowState.Refunded;
        default: return EscrowState.Created;
      }
    })();

    // Determine next state based on action
    const nextState = (() => {
      switch (action) {
        case 'fund': return EscrowState.Funded;
        case 'release': return EscrowState.Released;
        case 'dispute': return EscrowState.Disputed;
      }
    })();

    // Build transaction for validation
    const { app, tx } = RustSpellChecker.buildEscrowTransaction({
      appTag: `escrow:${escrowId}`,
      currentState,
      nextState,
      amount: BigInt(escrow.totalAmount),
    });

    // Run Rust spell checker
    const result = RustSpellChecker.escrowCheck(app, tx, RustSpellChecker.Data.empty(), RustSpellChecker.Data.empty());
    
    return result;
  }, [escrows]);

  // Encrypt escrow data using @jedisct1/charm
  const encryptEscrowData = useCallback((escrowId: string): EncryptedEscrowData | null => {
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow) return null;

    const terms = `Escrow between ${escrow.payer} and ${escrow.payee}. Total: ${escrow.totalAmount} sats`;
    const milestoneDescriptions = escrow.milestones.map(m => `${m.title}: ${m.description} (${m.amount} sats)`);
    
    const { escrow: encrypted, key } = createEncryptedEscrow(
      escrowId,
      terms,
      milestoneDescriptions
    );
    
    // Store key for later decryption
    escrowEncryptionKeys.set(escrowId, key);
    
    console.log('[Charm Crypto] Escrow encrypted:', {
      escrowId,
      termsHash: encrypted.encryptedTerms.spellHash.slice(0, 16) + '...',
      milestonesEncrypted: encrypted.encryptedMilestones.length,
    });
    
    return encrypted;
  }, [escrows]);

  // Get encryption status
  const getEncryptionStatus = useCallback((escrowId: string): { encrypted: boolean; keyExists: boolean } => {
    return {
      encrypted: escrowEncryptionKeys.has(escrowId),
      keyExists: escrowEncryptionKeys.has(escrowId),
    };
  }, []);

  // Validate escrow using Rust WASM/HTTP bridge
  const validateEscrowWithRustBridge = useCallback(async (
    escrowId: string,
    action: 'fund' | 'release' | 'dispute'
  ): Promise<RustCheckResult | null> => {
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow || !buildEscrow) return null;

    // Map action to escrow states
    const currentState = (() => {
      switch (escrow.status) {
        case 'active': return RustEscrowState.Funded;
        case 'completed': return RustEscrowState.Released;
        case 'disputed': return RustEscrowState.Disputed;
        case 'cancelled': return RustEscrowState.Refunded;
        default: return RustEscrowState.Created;
      }
    })();

    const nextState = (() => {
      switch (action) {
        case 'fund': return RustEscrowState.Funded;
        case 'release': return RustEscrowState.Released;
        case 'dispute': return RustEscrowState.Disputed;
      }
    })();

    try {
      const result = await buildEscrow({
        appTag: `escrow:${escrowId}`,
        currentState,
        nextState,
        amount: escrow.totalAmount,
      });

      console.log(`[useEscrow] Rust bridge validation (${rustBridgeMode}):`, result?.checkResult);
      return result?.checkResult || null;
    } catch (error) {
      console.error('[useEscrow] Rust bridge validation failed:', error);
      return null;
    }
  }, [escrows, buildEscrow, rustBridgeMode]);

  return {
    escrows,
    selectedEscrow,
    loading,
    error,
    rustBridgeMode,
    rustBridgeVersion,
    createEscrow,
    selectEscrow,
    completeMilestone,
    releaseMilestone,
    disputeMilestone,
    refreshEscrow,
    validateEscrowSpell,
    validateEscrowWithRustBridge,
    encryptEscrowData,
    getEncryptionStatus,
  };
}
