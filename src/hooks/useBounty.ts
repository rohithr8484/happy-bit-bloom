/**
 * Bitcoin Bounty & Task Escrow
 * 
 * Charm-powered bounty system with:
 * - Oracle-confirmed task completion
 * - Maintainer approval signing
 * - Deadline-based automatic refund
 * - Rust spell checker validation
 * - @jedisct1/charm encryption
 */

import { useState, useCallback } from 'react';
import { charmsSDK, TransactionResult } from '@/lib/charms-sdk';
import { 
  RustSpellChecker, 
  EscrowState,
  type EscrowCheckResult 
} from '@/lib/rust-spell-checker';
import {
  CharmCrypto,
  createEncryptedBounty,
  decryptBounty,
  type EncryptedBountyData,
  bytesToHex,
} from '@/lib/charms-wasm-sdk';

// Encryption key storage
const bountyEncryptionKeys = new Map<string, Uint8Array>();

export type BountyStatus = 
  | 'open' 
  | 'claimed' 
  | 'submitted' 
  | 'approved' 
  | 'completed' 
  | 'disputed' 
  | 'refunded' 
  | 'expired';

export interface BountyTask {
  id: string;
  title: string;
  description: string;
  category: 'github_issue' | 'audit' | 'research' | 'development' | 'design';
  txid: string;
  amount: number; // In satoshis
  creator: string; // Bitcoin address (funder)
  maintainer?: string; // Maintainer who can approve
  hunter?: string; // Bounty hunter who claimed
  deadline: Date;
  status: BountyStatus;
  
  // Proof and verification
  submissionProof?: string;
  oracleVerification?: OracleVerification;
  maintainerSignature?: string;
  
  // Timestamps
  createdAt: Date;
  claimedAt?: Date;
  submittedAt?: Date;
  completedAt?: Date;
  
  // Charms spell data
  spellId?: string;
}

export interface OracleVerification {
  oracleId: string;
  verified: boolean;
  verifiedAt: Date;
  proof: string;
  confidence: number; // 0-100%
}

export interface CreateBountyParams {
  title: string;
  description: string;
  category: BountyTask['category'];
  amount: number;
  deadline: Date;
  maintainerAddress?: string;
}

// Mock oracle service
class OracleService {
  private static instance: OracleService;
  
  static getInstance(): OracleService {
    if (!OracleService.instance) {
      OracleService.instance = new OracleService();
    }
    return OracleService.instance;
  }

  async verifyTaskCompletion(
    bountyId: string, 
    proof: string
  ): Promise<OracleVerification> {
    // Simulate oracle verification delay
    await new Promise(r => setTimeout(r, 2000));
    
    // Mock verification logic - in production would check:
    // - GitHub PR merged status
    // - Audit report submission
    // - Research deliverable verification
    const verified = Math.random() > 0.2; // 80% success rate for demo
    
    return {
      oracleId: `oracle-${Date.now().toString(36)}`,
      verified,
      verifiedAt: new Date(),
      proof: `zk_oracle_proof_${bountyId}_${Date.now()}`,
      confidence: verified ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 20,
    };
  }
}

// Demo bounties
const DEMO_BOUNTIES: BountyTask[] = [
  {
    id: 'bounty-001',
    title: 'Fix Critical RLS Policy Bug',
    description: 'Security audit identified missing RLS policies on user_profiles table allowing unauthorized access.',
    category: 'github_issue',
    txid: 'abc123def456789012345678901234567890abcdef1234567890abcdef123456',
    amount: 25000000, // 0.25 BTC
    creator: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    maintainer: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status: 'open',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'bounty-002',
    title: 'Smart Contract Security Audit',
    description: 'Comprehensive security audit for Charms escrow contract implementation. Must include formal verification.',
    category: 'audit',
    txid: 'def456abc789012345678901234567890fedcba9876543210fedcba98765432',
    amount: 100000000, // 1 BTC
    creator: 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h',
    maintainer: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    hunter: 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'claimed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    claimedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'bounty-003',
    title: 'zkBTC Integration Research',
    description: 'Research and document the optimal integration path for zkBTC into existing DeFi protocols.',
    category: 'research',
    txid: 'ghi789abc123456789012345678901234567890123456789012345678901234',
    amount: 50000000, // 0.5 BTC
    creator: 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej',
    hunter: 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: 'submitted',
    submissionProof: 'https://github.com/project/research/blob/main/zkbtc-integration.md',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    claimedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

export interface UseBountyReturn {
  bounties: BountyTask[];
  selectedBounty: BountyTask | null;
  loading: boolean;
  oracleLoading: boolean;
  
  // Actions
  createBounty: (params: CreateBountyParams) => Promise<BountyTask>;
  claimBounty: (bountyId: string, hunterAddress: string) => Promise<void>;
  submitWork: (bountyId: string, proof: string) => Promise<void>;
  verifyWithOracle: (bountyId: string) => Promise<OracleVerification>;
  approveBounty: (bountyId: string, maintainerSig: string) => Promise<void>;
  releaseBounty: (bountyId: string) => Promise<TransactionResult>;
  disputeBounty: (bountyId: string, reason: string) => Promise<void>;
  refundBounty: (bountyId: string) => Promise<TransactionResult>;
  
  selectBounty: (id: string | null) => void;
  checkDeadlines: () => void;
  validateBountySpell: (bountyId: string, action: 'claim' | 'release' | 'refund') => EscrowCheckResult;
  encryptBountyData: (bountyId: string) => { encrypted: EncryptedBountyData; proofHash: string } | null;
  getEncryptionProof: (bountyId: string) => string | null;
}

export function useBounty(): UseBountyReturn {
  const [bounties, setBounties] = useState<BountyTask[]>(DEMO_BOUNTIES);
  const [selectedBounty, setSelectedBounty] = useState<BountyTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [oracleLoading, setOracleLoading] = useState(false);

  const oracle = OracleService.getInstance();

  const createBounty = useCallback(async (params: CreateBountyParams): Promise<BountyTask> => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      
      const bounty: BountyTask = {
        id: `bounty-${Date.now().toString(36)}`,
        title: params.title,
        description: params.description,
        category: params.category,
        txid: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        amount: params.amount,
        creator: 'bc1q...connected', // Would come from wallet
        maintainer: params.maintainerAddress,
        deadline: params.deadline,
        status: 'open',
        createdAt: new Date(),
        spellId: `spell-${Date.now()}`,
      };
      
      setBounties(prev => [bounty, ...prev]);
      return bounty;
    } finally {
      setLoading(false);
    }
  }, []);

  const claimBounty = useCallback(async (bountyId: string, hunterAddress: string) => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      
      setBounties(prev => prev.map(b => {
        if (b.id !== bountyId) return b;
        return {
          ...b,
          status: 'claimed' as const,
          hunter: hunterAddress,
          claimedAt: new Date(),
        };
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const submitWork = useCallback(async (bountyId: string, proof: string) => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      
      setBounties(prev => prev.map(b => {
        if (b.id !== bountyId) return b;
        return {
          ...b,
          status: 'submitted' as const,
          submissionProof: proof,
          submittedAt: new Date(),
        };
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyWithOracle = useCallback(async (bountyId: string): Promise<OracleVerification> => {
    setOracleLoading(true);
    try {
      const bounty = bounties.find(b => b.id === bountyId);
      if (!bounty?.submissionProof) throw new Error('No submission to verify');
      
      const verification = await oracle.verifyTaskCompletion(bountyId, bounty.submissionProof);
      
      setBounties(prev => prev.map(b => {
        if (b.id !== bountyId) return b;
        return {
          ...b,
          oracleVerification: verification,
          status: verification.verified ? 'approved' as const : b.status,
        };
      }));
      
      return verification;
    } finally {
      setOracleLoading(false);
    }
  }, [bounties, oracle]);

  const approveBounty = useCallback(async (bountyId: string, maintainerSig: string) => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      
      setBounties(prev => prev.map(b => {
        if (b.id !== bountyId) return b;
        return {
          ...b,
          status: 'approved' as const,
          maintainerSignature: maintainerSig,
        };
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const releaseBounty = useCallback(async (bountyId: string): Promise<TransactionResult> => {
    setLoading(true);
    try {
      const bounty = bounties.find(b => b.id === bountyId);
      if (!bounty) throw new Error('Bounty not found');
      if (!bounty.hunter) throw new Error('No hunter to pay');
      
      // Simulate Charms spell execution for fund release
      const result = await charmsSDK.releaseMilestone(
        bountyId,
        'bounty-release',
        bounty.amount,
        bounty.hunter
      );
      
      setBounties(prev => prev.map(b => {
        if (b.id !== bountyId) return b;
        return {
          ...b,
          status: 'completed' as const,
          completedAt: new Date(),
        };
      }));
      
      return result;
    } finally {
      setLoading(false);
    }
  }, [bounties]);

  const disputeBounty = useCallback(async (bountyId: string, reason: string) => {
    setLoading(true);
    try {
      await charmsSDK.disputeMilestone(bountyId, 'bounty-dispute', reason);
      
      setBounties(prev => prev.map(b => {
        if (b.id !== bountyId) return b;
        return { ...b, status: 'disputed' as const };
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const refundBounty = useCallback(async (bountyId: string): Promise<TransactionResult> => {
    setLoading(true);
    try {
      const bounty = bounties.find(b => b.id === bountyId);
      if (!bounty) throw new Error('Bounty not found');
      
      const result = await charmsSDK.releaseMilestone(
        bountyId,
        'bounty-refund',
        bounty.amount,
        bounty.creator
      );
      
      setBounties(prev => prev.map(b => {
        if (b.id !== bountyId) return b;
        return { ...b, status: 'refunded' as const };
      }));
      
      return result;
    } finally {
      setLoading(false);
    }
  }, [bounties]);

  const selectBounty = useCallback((id: string | null) => {
    if (id === null) {
      setSelectedBounty(null);
    } else {
      const bounty = bounties.find(b => b.id === id);
      setSelectedBounty(bounty || null);
    }
  }, [bounties]);

  const checkDeadlines = useCallback(() => {
    const now = new Date();
    setBounties(prev => prev.map(b => {
      if (b.deadline < now && ['open', 'claimed'].includes(b.status)) {
        return { ...b, status: 'expired' as const };
      }
      return b;
    }));
  }, []);

  // Validate bounty spell using Rust spell checker
  const validateBountySpell = useCallback((
    bountyId: string,
    action: 'claim' | 'release' | 'refund'
  ): EscrowCheckResult => {
    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) {
      return {
        valid: false,
        currentState: null,
        nextState: null,
        transitionValid: false,
        errors: ['Bounty not found'],
      };
    }

    // Map bounty status to escrow state
    const currentState = (() => {
      switch (bounty.status) {
        case 'open': return EscrowState.Created;
        case 'claimed': 
        case 'submitted':
        case 'approved': return EscrowState.Funded;
        case 'completed': return EscrowState.Released;
        case 'disputed': return EscrowState.Disputed;
        case 'refunded': return EscrowState.Refunded;
        default: return EscrowState.Created;
      }
    })();

    const nextState = (() => {
      switch (action) {
        case 'claim': return EscrowState.Funded;
        case 'release': return EscrowState.Released;
        case 'refund': return EscrowState.Refunded;
      }
    })();

    const { app, tx } = RustSpellChecker.buildEscrowTransaction({
      appTag: `bounty:${bountyId}`,
      currentState,
      nextState,
      amount: BigInt(bounty.amount),
    });

    return RustSpellChecker.escrowCheck(app, tx, RustSpellChecker.Data.empty(), RustSpellChecker.Data.empty());
  }, [bounties]);

  // Encrypt bounty data using @jedisct1/charm
  const encryptBountyData = useCallback((bountyId: string): { encrypted: EncryptedBountyData; proofHash: string } | null => {
    const bounty = bounties.find(b => b.id === bountyId);
    if (!bounty) return null;

    const { bounty: encrypted, key } = createEncryptedBounty(
      bountyId,
      bounty.description,
      `${bounty.amount} satoshis`
    );
    
    // Store key for later use
    bountyEncryptionKeys.set(bountyId, key);
    
    console.log('[Charm Crypto] Bounty encrypted:', {
      bountyId,
      proofHash: encrypted.proofHash.slice(0, 16) + '...',
    });
    
    return { encrypted, proofHash: encrypted.proofHash };
  }, [bounties]);

  // Get encryption proof hash
  const getEncryptionProof = useCallback((bountyId: string): string | null => {
    const key = bountyEncryptionKeys.get(bountyId);
    if (!key) return null;
    
    const crypto = new CharmCrypto(key);
    const data = new TextEncoder().encode(`bounty:${bountyId}:verified`);
    return bytesToHex(crypto.hash(data));
  }, []);

  return {
    bounties,
    selectedBounty,
    loading,
    oracleLoading,
    createBounty,
    claimBounty,
    submitWork,
    verifyWithOracle,
    approveBounty,
    releaseBounty,
    disputeBounty,
    refundBounty,
    selectBounty,
    checkDeadlines,
    validateBountySpell,
    encryptBountyData,
    getEncryptionProof,
  };
}
