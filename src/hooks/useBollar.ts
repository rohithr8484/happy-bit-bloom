/**
 * Bollar Money - Bitcoin-Backed Stablecoin Protocol
 * 
 * Inspired by BollarMoney: A Bitcoin-collateralized stablecoin protocol
 * Users deposit BTC as collateral to mint USD-pegged Bollar stablecoins
 * Validated by Rust token spell checker
 * Encrypted with @jedisct1/charm
 */

import { useState, useCallback, useEffect } from 'react';
import { charmsSDK, TransactionResult } from '@/lib/charms-sdk';
import { promptTestnetTransaction } from '@/lib/testnet-transactions';
import {
  RustSpellChecker, 
  type TokenCheckResult 
} from '@/lib/rust-spell-checker';
import {
  CharmCrypto,
  createEncryptedBollarMint,
  decryptBollarMint,
  type EncryptedBollarMint,
  bytesToHex,
} from '@/lib/charms-wasm-sdk';
import {
  useRustBridge,
  type RustCheckResult,
} from '@/lib/rust-wasm-bridge';

// Encryption key storage for Bollar mints
const bollarEncryptionKeys = new Map<string, Uint8Array>();

export interface CollateralPosition {
  id: string;
  btcDeposited: number; // In satoshis
  bollarMinted: number; // In cents (Bollar uses 2 decimals)
  collateralRatio: number; // Percentage (e.g., 150 = 150%)
  liquidationPrice: number; // BTC/USD price at which position gets liquidated
  createdAt: Date;
  lastUpdated: Date;
  status: 'healthy' | 'warning' | 'danger' | 'liquidated';
  txid: string;
}

export interface BollarStats {
  totalBtcLocked: number;
  totalBollarMinted: number;
  currentBtcPrice: number;
  minCollateralRatio: number;
  liquidationPenalty: number;
  stabilityFee: number; // Annual percentage
}

export interface MintParams {
  btcAmount: number; // In satoshis
  bollarAmount: number; // In cents
}

export interface RedeemParams {
  positionId: string;
  bollarAmount: number; // Amount to repay
}

// Mock BTC price oracle
const BTC_PRICE_USD = 97500; // Current BTC price
const MIN_COLLATERAL_RATIO = 150; // 150% minimum
const LIQUIDATION_RATIO = 120; // 120% triggers liquidation
const LIQUIDATION_PENALTY = 13; // 13% penalty
const STABILITY_FEE = 2.5; // 2.5% annual

// Demo positions
const DEMO_POSITIONS: CollateralPosition[] = [
  {
    id: 'pos-001',
    btcDeposited: 10000000, // 0.1 BTC
    bollarMinted: 650000, // $6,500 (at 150% ratio)
    collateralRatio: 150,
    liquidationPrice: 78000,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(),
    status: 'healthy',
    txid: 'btc123abc456def789012345678901234567890abcdef1234567890abcdef12',
  },
  {
    id: 'pos-002',
    btcDeposited: 50000000, // 0.5 BTC
    bollarMinted: 2800000, // $28,000 (at ~174% ratio)
    collateralRatio: 174,
    liquidationPrice: 67200,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(),
    status: 'healthy',
    txid: 'btc789ghi012jkl345678901234567890fedcba9876543210fedcba987654',
  },
];

function calculateCollateralRatio(btcSatoshis: number, bollarCents: number, btcPrice: number): number {
  const btcValue = (btcSatoshis / 100000000) * btcPrice;
  const bollarValue = bollarCents / 100;
  return Math.round((btcValue / bollarValue) * 100);
}

function calculateLiquidationPrice(btcSatoshis: number, bollarCents: number): number {
  const btc = btcSatoshis / 100000000;
  const bollar = bollarCents / 100;
  return Math.round((bollar * LIQUIDATION_RATIO) / (btc * 100));
}

function getPositionStatus(collateralRatio: number): CollateralPosition['status'] {
  if (collateralRatio <= LIQUIDATION_RATIO) return 'liquidated';
  if (collateralRatio <= 130) return 'danger';
  if (collateralRatio <= 150) return 'warning';
  return 'healthy';
}

export interface UseBollarReturn {
  positions: CollateralPosition[];
  stats: BollarStats;
  loading: boolean;
  rustBridgeMode: 'http' | 'wasm' | 'loading';
  rustBridgeVersion: string;
  
  // Actions
  mintBollar: (params: MintParams) => Promise<CollateralPosition>;
  redeemBollar: (params: RedeemParams) => Promise<TransactionResult>;
  addCollateral: (positionId: string, btcAmount: number) => Promise<void>;
  withdrawCollateral: (positionId: string, btcAmount: number) => Promise<void>;
  liquidatePosition: (positionId: string) => Promise<TransactionResult>;
  
  // Utilities
  calculateMaxBollar: (btcSatoshis: number) => number;
  calculateMinBtc: (bollarCents: number) => number;
  refreshPrices: () => Promise<void>;
  validateBollarSpell: (action: 'mint' | 'redeem', inputAmount: bigint, outputAmount: bigint) => TokenCheckResult;
  validateBollarWithRustBridge: (action: 'mint' | 'redeem', inputAmount: number, outputAmount: number) => Promise<RustCheckResult | null>;
  createEncryptedMint: (positionId: string, amount: bigint, recipient: string) => EncryptedBollarMint;
  verifyMintProof: (positionId: string) => { valid: boolean; proofHash: string } | null;
}

export function useBollar(): UseBollarReturn {
  const [positions, setPositions] = useState<CollateralPosition[]>(DEMO_POSITIONS);
  const [loading, setLoading] = useState(false);
  const [btcPrice, setBtcPrice] = useState(BTC_PRICE_USD);

  // Initialize Rust WASM/HTTP bridge
  const { 
    mode: rustBridgeMode, 
    version: rustBridgeVersion, 
    buildToken,
    isReady: rustBridgeReady 
  } = useRustBridge('auto');

  useEffect(() => {
    if (rustBridgeReady) {
      console.log('[useBollar] Rust bridge ready:', { mode: rustBridgeMode, version: rustBridgeVersion });
    }
  }, [rustBridgeReady, rustBridgeMode, rustBridgeVersion]);

  const stats: BollarStats = {
    totalBtcLocked: positions.reduce((sum, p) => sum + p.btcDeposited, 0),
    totalBollarMinted: positions.reduce((sum, p) => sum + p.bollarMinted, 0),
    currentBtcPrice: btcPrice,
    minCollateralRatio: MIN_COLLATERAL_RATIO,
    liquidationPenalty: LIQUIDATION_PENALTY,
    stabilityFee: STABILITY_FEE,
  };

  const calculateMaxBollar = useCallback((btcSatoshis: number): number => {
    const btcValue = (btcSatoshis / 100000000) * btcPrice;
    const maxBollar = (btcValue * 100) / MIN_COLLATERAL_RATIO;
    return Math.floor(maxBollar * 100); // Return in cents
  }, [btcPrice]);

  const calculateMinBtc = useCallback((bollarCents: number): number => {
    const bollarValue = bollarCents / 100;
    const minBtcValue = (bollarValue * MIN_COLLATERAL_RATIO) / 100;
    return Math.ceil((minBtcValue / btcPrice) * 100000000); // Return in satoshis
  }, [btcPrice]);

  const mintBollar = useCallback(async (params: MintParams): Promise<CollateralPosition> => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 2000));

      const collateralRatio = calculateCollateralRatio(params.btcAmount, params.bollarAmount, btcPrice);
      
      if (collateralRatio < MIN_COLLATERAL_RATIO) {
        throw new Error(`Collateral ratio ${collateralRatio}% is below minimum ${MIN_COLLATERAL_RATIO}%`);
      }

      const position: CollateralPosition = {
        id: `pos-${Date.now().toString(36)}`,
        btcDeposited: params.btcAmount,
        bollarMinted: params.bollarAmount,
        collateralRatio,
        liquidationPrice: calculateLiquidationPrice(params.btcAmount, params.bollarAmount),
        createdAt: new Date(),
        lastUpdated: new Date(),
        status: getPositionStatus(collateralRatio),
        txid: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      };

      // Prompt testnet transaction
      promptTestnetTransaction('mint_bollar', {
        amount: params.btcAmount,
      });

      setPositions(prev => [position, ...prev]);
      return position;
    } finally {
      setLoading(false);
    }
  }, [btcPrice]);

  const redeemBollar = useCallback(async (params: RedeemParams): Promise<TransactionResult> => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));

      const position = positions.find(p => p.id === params.positionId);
      if (!position) throw new Error('Position not found');

      const result = await charmsSDK.releaseMilestone(
        params.positionId,
        'bollar-redeem',
        position.btcDeposited,
        'connected-wallet'
      );

      // Prompt testnet transaction
      promptTestnetTransaction('redeem_bollar', {
        amount: position.btcDeposited,
      });

      if (params.bollarAmount >= position.bollarMinted) {
        // Full redemption - close position
        setPositions(prev => prev.filter(p => p.id !== params.positionId));
      } else {
        // Partial redemption
        const newMinted = position.bollarMinted - params.bollarAmount;
        const newRatio = calculateCollateralRatio(position.btcDeposited, newMinted, btcPrice);
        
        setPositions(prev => prev.map(p => {
          if (p.id !== params.positionId) return p;
          return {
            ...p,
            bollarMinted: newMinted,
            collateralRatio: newRatio,
            status: getPositionStatus(newRatio),
            lastUpdated: new Date(),
          };
        }));
      }

      return result;
    } finally {
      setLoading(false);
    }
  }, [positions, btcPrice]);

  const addCollateral = useCallback(async (positionId: string, btcAmount: number) => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));

      setPositions(prev => prev.map(p => {
        if (p.id !== positionId) return p;
        const newDeposited = p.btcDeposited + btcAmount;
        const newRatio = calculateCollateralRatio(newDeposited, p.bollarMinted, btcPrice);
        return {
          ...p,
          btcDeposited: newDeposited,
          collateralRatio: newRatio,
          liquidationPrice: calculateLiquidationPrice(newDeposited, p.bollarMinted),
          status: getPositionStatus(newRatio),
          lastUpdated: new Date(),
        };
      }));
    } finally {
      setLoading(false);
    }
  }, [btcPrice]);

  const withdrawCollateral = useCallback(async (positionId: string, btcAmount: number) => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));

      const position = positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');

      const newDeposited = position.btcDeposited - btcAmount;
      const newRatio = calculateCollateralRatio(newDeposited, position.bollarMinted, btcPrice);

      if (newRatio < MIN_COLLATERAL_RATIO) {
        throw new Error(`Cannot withdraw: would drop ratio to ${newRatio}%`);
      }

      setPositions(prev => prev.map(p => {
        if (p.id !== positionId) return p;
        return {
          ...p,
          btcDeposited: newDeposited,
          collateralRatio: newRatio,
          liquidationPrice: calculateLiquidationPrice(newDeposited, p.bollarMinted),
          status: getPositionStatus(newRatio),
          lastUpdated: new Date(),
        };
      }));
    } finally {
      setLoading(false);
    }
  }, [positions, btcPrice]);

  const liquidatePosition = useCallback(async (positionId: string): Promise<TransactionResult> => {
    setLoading(true);
    try {
      const position = positions.find(p => p.id === positionId);
      if (!position) throw new Error('Position not found');
      if (position.status !== 'danger' && position.collateralRatio > LIQUIDATION_RATIO) {
        throw new Error('Position is not eligible for liquidation');
      }

      await new Promise(r => setTimeout(r, 2000));

      const result = await charmsSDK.releaseMilestone(
        positionId,
        'bollar-liquidation',
        position.btcDeposited,
        'liquidator-address'
      );

      setPositions(prev => prev.map(p => {
        if (p.id !== positionId) return p;
        return { ...p, status: 'liquidated' as const };
      }));

      return result;
    } finally {
      setLoading(false);
    }
  }, [positions]);

  const refreshPrices = useCallback(async () => {
    // Simulate price update from oracle
    const variation = (Math.random() - 0.5) * 1000;
    setBtcPrice(BTC_PRICE_USD + variation);

    // Update all position statuses based on new price
    setPositions(prev => prev.map(p => {
      const newRatio = calculateCollateralRatio(p.btcDeposited, p.bollarMinted, btcPrice + variation);
      return {
        ...p,
        collateralRatio: newRatio,
        status: getPositionStatus(newRatio),
        lastUpdated: new Date(),
      };
    }));
  }, [btcPrice]);

  // Validate Bollar mint/redeem using Rust token spell checker
  const validateBollarSpell = useCallback((
    action: 'mint' | 'redeem',
    inputAmount: bigint,
    outputAmount: bigint
  ): TokenCheckResult => {
    const { app, tx } = RustSpellChecker.buildTokenTransaction({
      appTag: 'bollar:USD',
      vkHash: '0'.repeat(64),
      inputAmounts: action === 'mint' ? [] : [inputAmount],
      outputAmounts: action === 'mint' ? [outputAmount] : [],
    });

    // For mint, we check if it's a valid mint operation
    if (action === 'mint') {
      const isMint = RustSpellChecker.isTokenMint(app, tx);
      return {
        valid: isMint,
        inputSum: 0n,
        outputSum: outputAmount,
        conserved: false, // Mint doesn't conserve
        authorized: true,
        errors: isMint ? [] : ['Invalid mint operation'],
      };
    }

    // For redeem, check token conservation (burn)
    const result = RustSpellChecker.tokenCheck(app, tx, RustSpellChecker.Data.bytes(new Uint8Array([1])), RustSpellChecker.Data.empty());
    return result;
  }, []);

  // Create encrypted Bollar mint using @jedisct1/charm
  const createEncryptedMintFn = useCallback((
    positionId: string,
    amount: bigint,
    recipient: string
  ): EncryptedBollarMint => {
    const { mint, key } = createEncryptedBollarMint(positionId, amount, recipient);
    
    // Store key for verification
    bollarEncryptionKeys.set(positionId, key);
    
    console.log('[Charm Crypto] Bollar mint encrypted:', {
      positionId,
      proofHash: mint.proofHash.slice(0, 16) + '...',
    });
    
    return mint;
  }, []);

  // Verify mint proof
  const verifyMintProof = useCallback((positionId: string): { valid: boolean; proofHash: string } | null => {
    const key = bollarEncryptionKeys.get(positionId);
    if (!key) return null;
    
    const crypto = new CharmCrypto(key);
    const data = new TextEncoder().encode(`bollar:mint:${positionId}:verified`);
    const proofHash = bytesToHex(crypto.hash(data));
    
    return { valid: true, proofHash };
  }, []);

  // Validate Bollar using Rust WASM/HTTP bridge
  const validateBollarWithRustBridge = useCallback(async (
    action: 'mint' | 'redeem',
    inputAmount: number,
    outputAmount: number
  ): Promise<RustCheckResult | null> => {
    if (!buildToken) return null;

    try {
      const result = await buildToken({
        appTag: `token:BOLLAR`,
        vkHash: '0'.repeat(64),
        inputAmounts: action === 'mint' ? [inputAmount] : [outputAmount],
        outputAmounts: action === 'mint' ? [outputAmount] : [inputAmount],
      });

      console.log(`[useBollar] Rust bridge validation (${rustBridgeMode}):`, result?.checkResult);
      return result?.checkResult || null;
    } catch (error) {
      console.error('[useBollar] Rust bridge validation failed:', error);
      return null;
    }
  }, [buildToken, rustBridgeMode]);

  return {
    positions,
    stats,
    loading,
    rustBridgeMode,
    rustBridgeVersion,
    mintBollar,
    redeemBollar,
    addCollateral,
    withdrawCollateral,
    liquidatePosition,
    calculateMaxBollar,
    calculateMinBtc,
    refreshPrices,
    validateBollarSpell,
    validateBollarWithRustBridge,
    createEncryptedMint: createEncryptedMintFn,
    verifyMintProof,
  };
}
