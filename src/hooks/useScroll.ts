import { useState, useCallback, useEffect } from 'react';
import { 
  scrollProver, 
  ScrollProof, 
  BlockWitness, 
  ChunkWitness,
  SCROLL_NETWORKS,
  ScrollNetwork 
} from '@/lib/scroll-sdk';
import {
  useRustBridge,
  type RustCheckResult,
} from '@/lib/rust-wasm-bridge';

export interface ScrollProofState {
  proofId: string;
  type: 'chunk' | 'batch';
  status: 'pending' | 'proving' | 'completed' | 'failed';
  progress: number;
  proof?: ScrollProof;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export function useScroll() {
  const [network, setNetwork] = useState<ScrollNetwork>('sepolia');
  const [activeProof, setActiveProof] = useState<ScrollProofState | null>(null);
  const [proofHistory, setProofHistory] = useState<ScrollProofState[]>([]);
  const [loading, setLoading] = useState(false);

  const networkConfig = SCROLL_NETWORKS[network];
  const queueStats = scrollProver.getQueueStats();

  // Initialize Rust WASM/HTTP bridge
  const { 
    mode: rustBridgeMode, 
    version: rustBridgeVersion, 
    verifySpark,
    isReady: rustBridgeReady 
  } = useRustBridge('auto');

  // Log Rust bridge status
  useEffect(() => {
    if (rustBridgeReady) {
      console.log('[useScroll] Rust bridge ready:', { mode: rustBridgeMode, version: rustBridgeVersion });
    }
  }, [rustBridgeReady, rustBridgeMode, rustBridgeVersion]);

  const generateChunkProof = useCallback(async (blockCount: number = 3): Promise<ScrollProof | null> => {
    setLoading(true);
    
    const proofState: ScrollProofState = {
      proofId: `pending_${Date.now()}`,
      type: 'chunk',
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
    };
    
    setActiveProof(proofState);

    try {
      // Create mock block witnesses
      const startBlock = Math.floor(Math.random() * 1000000) + 4000000;
      const blocks: BlockWitness[] = Array.from({ length: blockCount }, (_, i) => 
        scrollProver.createMockBlockWitness(startBlock + i)
      );

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setActiveProof(prev => prev ? {
          ...prev,
          status: 'proving',
          progress: Math.min(prev.progress + Math.random() * 15, 95),
        } : null);
      }, 1000);

      const proof = await scrollProver.generateChunkProof(blocks);

      clearInterval(progressInterval);

      const completedState: ScrollProofState = {
        proofId: proof.proofId,
        type: 'chunk',
        status: 'completed',
        progress: 100,
        proof,
        startedAt: proofState.startedAt,
        completedAt: new Date(),
      };

      setActiveProof(null);
      setProofHistory(prev => [completedState, ...prev].slice(0, 10));
      setLoading(false);
      
      return proof;
    } catch (error) {
      const failedState: ScrollProofState = {
        ...proofState,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      setActiveProof(null);
      setProofHistory(prev => [failedState, ...prev].slice(0, 10));
      setLoading(false);
      
      return null;
    }
  }, []);

  const generateBatchProof = useCallback(async (chunkCount: number = 2): Promise<ScrollProof | null> => {
    setLoading(true);
    
    const proofState: ScrollProofState = {
      proofId: `batch_pending_${Date.now()}`,
      type: 'batch',
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
    };
    
    setActiveProof(proofState);

    try {
      // Create mock chunk witnesses
      const chunks: ChunkWitness[] = Array.from({ length: chunkCount }, (_, chunkIdx) => {
        const startBlock = Math.floor(Math.random() * 1000000) + 4000000 + chunkIdx * 5;
        return {
          chunkId: `chunk_${chunkIdx}_${Date.now()}`,
          blocks: Array.from({ length: 3 }, (_, i) => 
            scrollProver.createMockBlockWitness(startBlock + i)
          ),
          prevMsgQueueHash: Array.from({ length: 32 }, () => 
            Math.floor(Math.random() * 16).toString(16)
          ).join(''),
          forkName: 'feynman',
          l1BatchNumber: 34700 + chunkIdx,
        };
      });

      // Simulate progress updates (batch takes longer)
      const progressInterval = setInterval(() => {
        setActiveProof(prev => prev ? {
          ...prev,
          status: 'proving',
          progress: Math.min(prev.progress + Math.random() * 8, 95),
        } : null);
      }, 1500);

      const proof = await scrollProver.generateBatchProof(chunks);

      clearInterval(progressInterval);

      const completedState: ScrollProofState = {
        proofId: proof.proofId,
        type: 'batch',
        status: 'completed',
        progress: 100,
        proof,
        startedAt: proofState.startedAt,
        completedAt: new Date(),
      };

      setActiveProof(null);
      setProofHistory(prev => [completedState, ...prev].slice(0, 10));
      setLoading(false);
      
      return proof;
    } catch (error) {
      const failedState: ScrollProofState = {
        ...proofState,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      setActiveProof(null);
      setProofHistory(prev => [failedState, ...prev].slice(0, 10));
      setLoading(false);
      
      return null;
    }
  }, []);

  const verifyProof = useCallback(async (proof: ScrollProof): Promise<boolean> => {
    const result = await scrollProver.verifyProof(proof);
    return result.valid;
  }, []);

  // Validate Scroll proof using Rust WASM/HTTP bridge
  const validateProofWithRustBridge = useCallback(async (proof: ScrollProof): Promise<RustCheckResult | null> => {
    if (!verifySpark) return null;

    try {
      // Build a spell structure representing the Scroll proof
      const blockCount = proof.blockRange.end - proof.blockRange.start + 1;
      const spell = {
        version: 2,
        apps: { '$scroll': { vkHash: proof.proofId, namespace: 'scroll' } },
        ins: Array.from({ length: blockCount }, (_, i) => ({ txid: proof.proofId, vout: i })),
        outs: [{
          value: 0,
          script: 'OP_RETURN',
          charms: [{
            appVkHash: proof.proofId,
            state: {
              proofType: proof.type,
              blockRange: proof.blockRange,
            },
          }],
        }],
      };

      const result = await verifySpark(spell);
      console.log(`[useScroll] Rust bridge proof validation (${rustBridgeMode}):`, result);
      
      return {
        valid: result?.valid || false,
        spellType: 'token',
        details: {
          inputSum: blockCount,
          outputSum: 1,
        },
        errors: result?.errors || [],
      };
    } catch (error) {
      console.error('[useScroll] Rust bridge validation failed:', error);
      return null;
    }
  }, [verifySpark, rustBridgeMode]);

  return {
    network,
    setNetwork,
    networkConfig,
    queueStats,
    activeProof,
    proofHistory,
    loading,
    rustBridgeMode,
    rustBridgeVersion,
    generateChunkProof,
    generateBatchProof,
    verifyProof,
    validateProofWithRustBridge,
  };
}
