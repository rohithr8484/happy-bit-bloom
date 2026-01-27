/**
 * Maestro Bitcoin API Hook
 * 
 * React hook for accessing Maestro's Bitcoin analytics features
 * Integrated with Rust WASM/HTTP bridge for spell validation
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  maestro, 
  BitcoinPrice, 
  AddressInfo, 
  WalletActivity, 
  RuneInfo, 
  NFTCollection, 
  DeFiProtocol,
  TransactionInfo,
  UTXOInfo
} from '@/lib/maestro-sdk';
import {
  useRustBridge,
  type RustCheckResult,
} from '@/lib/rust-wasm-bridge';

export interface MaestroStats {
  btcPrice: BitcoinPrice | null;
  networkStats: {
    difficulty: number;
    hashrate: string;
    mempoolSize: number;
    avgFee: number;
    blockTime: number;
  } | null;
  latestBlock: {
    height: number;
    hash: string;
    time: number;
    txCount: number;
  } | null;
}

export interface UseMaestroReturn {
  // Data
  stats: MaestroStats;
  defiProtocols: DeFiProtocol[];
  nftCollections: NFTCollection[];
  topRunes: RuneInfo[];
  
  // Loading states
  loading: boolean;
  priceLoading: boolean;
  
  // Rust Bridge
  rustBridgeMode: 'http' | 'wasm' | 'loading';
  rustBridgeVersion: string;
  
  // Actions
  refreshPrice: () => Promise<void>;
  refreshAll: () => Promise<void>;
  getAddressInfo: (address: string) => Promise<AddressInfo>;
  getWalletActivity: (address: string, limit?: number) => Promise<WalletActivity[]>;
  getTransaction: (txid: string) => Promise<TransactionInfo | null>;
  getUTXO: (txid: string, vout: number) => Promise<UTXOInfo | null>;
  getRuneInfo: (runeId: string) => Promise<RuneInfo | null>;
  validateTransactionWithRustBridge: (txid: string) => Promise<RustCheckResult | null>;
  validateAddressWithRustBridge: (address: string) => Promise<{ valid: boolean; type: string; errors: string[] } | null>;
  
  // Formatters
  formatSats: (sats: number) => string;
  formatUSD: (amount: number) => string;
}

export function useMaestro(): UseMaestroReturn {
  const [stats, setStats] = useState<MaestroStats>({
    btcPrice: null,
    networkStats: null,
    latestBlock: null,
  });
  
  const [defiProtocols, setDefiProtocols] = useState<DeFiProtocol[]>([]);
  const [nftCollections, setNftCollections] = useState<NFTCollection[]>([]);
  const [topRunes, setTopRunes] = useState<RuneInfo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);

  // Initialize Rust WASM/HTTP bridge
  const { 
    mode: rustBridgeMode, 
    version: rustBridgeVersion, 
    validateTransaction: rustValidateTransaction,
    validateAddress: rustValidateAddress,
    isReady: rustBridgeReady 
  } = useRustBridge('auto');

  // Log Rust bridge status
  useEffect(() => {
    if (rustBridgeReady) {
      console.log('[useMaestro] Rust bridge ready:', { mode: rustBridgeMode, version: rustBridgeVersion });
    }
  }, [rustBridgeReady, rustBridgeMode, rustBridgeVersion]);

  const refreshPrice = useCallback(async () => {
    setPriceLoading(true);
    try {
      const btcPrice = await maestro.getBitcoinPrice();
      setStats(prev => ({ ...prev, btcPrice }));
    } catch (error) {
      console.error('Failed to refresh BTC price:', error);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [btcPrice, networkStats, latestBlock, protocols, collections, runes] = await Promise.all([
        maestro.getBitcoinPrice(),
        maestro.getNetworkStats(),
        maestro.getLatestBlock(),
        maestro.getDeFiProtocols(),
        maestro.getOrdinalCollections(),
        maestro.getTopRunes(),
      ]);

      setStats({ btcPrice, networkStats, latestBlock });
      setDefiProtocols(protocols);
      setNftCollections(collections);
      setTopRunes(runes);
    } catch (error) {
      console.error('Failed to refresh Maestro data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshAll();
    
    // Set up price refresh interval (every 30 seconds)
    const interval = setInterval(refreshPrice, 30000);
    return () => clearInterval(interval);
  }, [refreshAll, refreshPrice]);

  const getAddressInfo = useCallback(async (address: string) => {
    return maestro.getAddressInfo(address);
  }, []);

  const getWalletActivity = useCallback(async (address: string, limit = 10) => {
    return maestro.getWalletActivity(address, limit);
  }, []);

  const getTransaction = useCallback(async (txid: string) => {
    return maestro.getTransaction(txid);
  }, []);

  const getUTXO = useCallback(async (txid: string, vout: number) => {
    return maestro.getUTXO(txid, vout);
  }, []);

  const getRuneInfo = useCallback(async (runeId: string) => {
    return maestro.getRuneInfo(runeId);
  }, []);

  const formatSats = useCallback((sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(8)} BTC`;
    }
    return `${sats.toLocaleString()} sats`;
  }, []);

  const formatUSD = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Validate transaction using Rust HTTP API with dedicated endpoint
  const validateTransactionWithRustBridge = useCallback(async (txid: string): Promise<RustCheckResult | null> => {
    if (!rustValidateTransaction) return null;

    try {
      const result = await rustValidateTransaction(txid);
      console.log(`[useMaestro] Rust HTTP API transaction validation (${rustBridgeMode}):`, result);
      return result;
    } catch (error) {
      console.error('[useMaestro] Rust HTTP API validation failed:', error);
      return null;
    }
  }, [rustValidateTransaction, rustBridgeMode]);

  // Validate Bitcoin address using Rust HTTP API
  const validateAddressWithRustBridge = useCallback(async (address: string): Promise<{ valid: boolean; type: string; errors: string[] } | null> => {
    if (!rustValidateAddress) return null;

    try {
      const result = await rustValidateAddress(address);
      console.log(`[useMaestro] Rust HTTP API address validation (${rustBridgeMode}):`, result);
      return result;
    } catch (error) {
      console.error('[useMaestro] Rust HTTP API address validation failed:', error);
      return null;
    }
  }, [rustValidateAddress, rustBridgeMode]);

  return {
    stats,
    defiProtocols,
    nftCollections,
    topRunes,
    loading,
    priceLoading,
    rustBridgeMode,
    rustBridgeVersion,
    refreshPrice,
    refreshAll,
    getAddressInfo,
    getWalletActivity,
    getTransaction,
    getUTXO,
    getRuneInfo,
    validateTransactionWithRustBridge,
    validateAddressWithRustBridge,
    formatSats,
    formatUSD,
  };
}
