import { useState, useCallback } from 'react';
import { 
  charmsSDK, 
  EscrowContract, 
  Milestone,
  TransactionResult 
} from '@/lib/charms-sdk';

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
  createEscrow: (params: CreateEscrowParams) => Promise<EscrowContract>;
  selectEscrow: (id: string | null) => void;
  completeMilestone: (escrowId: string, milestoneId: string, proof: string) => Promise<void>;
  releaseMilestone: (escrowId: string, milestoneId: string) => Promise<TransactionResult>;
  disputeMilestone: (escrowId: string, milestoneId: string, reason: string) => Promise<void>;
  refreshEscrow: (escrowId: string) => Promise<void>;
}

export interface CreateEscrowParams {
  payerAddress: string;
  payeeAddress: string;
  arbiterAddress?: string;
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
  }, []);

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

  return {
    escrows,
    selectedEscrow,
    loading,
    error,
    createEscrow,
    selectEscrow,
    completeMilestone,
    releaseMilestone,
    disputeMilestone,
    refreshEscrow,
  };
}
