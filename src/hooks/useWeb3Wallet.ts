/**
 * UTXO Web3 Wallet Integration
 * 
 * Connects to Bitcoin, Cardano, and Spark networks using @utxos/sdk
 * Project ID: e8afe4e9-356d-40a7-8c28-f8654e99fada
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// UTXO SDK Configuration
const UTXOS_PROJECT_ID = "e8afe4e9-356d-40a7-8c28-f8654e99fada";
const UTXOS_API_KEY = "4e0e8fd1-95c7-463e-9a6c-83d10666bd76";

export interface WalletState {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  balance: number | null;
  network: 'mainnet' | 'testnet';
  walletType: 'bitcoin' | 'cardano' | 'spark' | null;
}

export interface Web3WalletApi {
  getAddress: () => Promise<string>;
  getBalance: () => Promise<number>;
  signTransaction: (txHex: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

interface EnableWeb3WalletOptions {
  networkId: number;
  projectId: string;
  apiKey?: string;
}

// Simulated Web3Wallet SDK (would be replaced with actual @utxos/sdk import)
const Web3Wallet = {
  enable: async (options: EnableWeb3WalletOptions): Promise<{
    bitcoin: Web3WalletApi | null;
    cardano: Web3WalletApi | null;
    spark: Web3WalletApi | null;
  }> => {
    // Simulate wallet connection delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`[UTXOS SDK] Connecting with project: ${options.projectId}`);
    
    // Generate demo wallet addresses
    const bitcoinAddress = `bc1q${generateRandomHex(38)}`;
    const cardanoAddress = `addr1q${generateRandomHex(50)}`;
    const sparkAddress = `spark1${generateRandomHex(40)}`;
    
    return {
      bitcoin: {
        getAddress: async () => bitcoinAddress,
        getBalance: async () => Math.floor(Math.random() * 100000000) + 10000000, // Random balance
        signTransaction: async (txHex: string) => {
          await new Promise(r => setTimeout(r, 500));
          return `signed_${txHex.slice(0, 20)}...`;
        },
        signMessage: async (message: string) => {
          await new Promise(r => setTimeout(r, 300));
          return `sig_${Buffer.from(message).toString('base64').slice(0, 20)}`;
        }
      },
      cardano: {
        getAddress: async () => cardanoAddress,
        getBalance: async () => Math.floor(Math.random() * 50000000000), // ADA in lovelace
        signTransaction: async (txHex: string) => `cardano_sig_${txHex.slice(0, 10)}`,
        signMessage: async (message: string) => `cardano_msg_sig_${message.slice(0, 10)}`
      },
      spark: {
        getAddress: async () => sparkAddress,
        getBalance: async () => Math.floor(Math.random() * 10000000),
        signTransaction: async (txHex: string) => `spark_sig_${txHex.slice(0, 10)}`,
        signMessage: async (message: string) => `spark_msg_sig_${message.slice(0, 10)}`
      }
    };
  }
};

function generateRandomHex(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export interface UseWeb3WalletReturn {
  wallet: WalletState;
  bitcoinApi: Web3WalletApi | null;
  cardanoApi: Web3WalletApi | null;
  sparkApi: Web3WalletApi | null;
  connect: (walletType: 'bitcoin' | 'cardano' | 'spark') => Promise<void>;
  disconnect: () => void;
  signTransaction: (txHex: string) => Promise<string | null>;
  signMessage: (message: string) => Promise<string | null>;
}

export function useWeb3Wallet(): UseWeb3WalletReturn {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    connecting: false,
    address: null,
    balance: null,
    network: 'testnet',
    walletType: null,
  });
  
  const [bitcoinApi, setBitcoinApi] = useState<Web3WalletApi | null>(null);
  const [cardanoApi, setCardanoApi] = useState<Web3WalletApi | null>(null);
  const [sparkApi, setSparkApi] = useState<Web3WalletApi | null>(null);

  const connect = useCallback(async (walletType: 'bitcoin' | 'cardano' | 'spark') => {
    setWallet(prev => ({ ...prev, connecting: true }));
    
    try {
      const options: EnableWeb3WalletOptions = {
        networkId: 0, // 0 = testnet, 1 = mainnet
        projectId: UTXOS_PROJECT_ID,
        apiKey: UTXOS_API_KEY,
      };
      
      const { bitcoin, cardano, spark } = await Web3Wallet.enable(options);
      
      setBitcoinApi(bitcoin);
      setCardanoApi(cardano);
      setSparkApi(spark);
      
      // Get address and balance for selected wallet type
      let api: Web3WalletApi | null = null;
      switch (walletType) {
        case 'bitcoin':
          api = bitcoin;
          break;
        case 'cardano':
          api = cardano;
          break;
        case 'spark':
          api = spark;
          break;
      }
      
      if (api) {
        const address = await api.getAddress();
        const balance = await api.getBalance();
        
        setWallet({
          connected: true,
          connecting: false,
          address,
          balance,
          network: 'testnet',
          walletType,
        });
        
        toast.success(`Connected to ${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet`);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setWallet(prev => ({ ...prev, connecting: false }));
      toast.error('Failed to connect wallet');
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      connected: false,
      connecting: false,
      address: null,
      balance: null,
      network: 'testnet',
      walletType: null,
    });
    setBitcoinApi(null);
    setCardanoApi(null);
    setSparkApi(null);
    toast.info('Wallet disconnected');
  }, []);

  const signTransaction = useCallback(async (txHex: string): Promise<string | null> => {
    const api = wallet.walletType === 'bitcoin' ? bitcoinApi :
                wallet.walletType === 'cardano' ? cardanoApi :
                wallet.walletType === 'spark' ? sparkApi : null;
    
    if (!api) {
      toast.error('No wallet connected');
      return null;
    }
    
    try {
      return await api.signTransaction(txHex);
    } catch (error) {
      toast.error('Transaction signing failed');
      return null;
    }
  }, [wallet.walletType, bitcoinApi, cardanoApi, sparkApi]);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const api = wallet.walletType === 'bitcoin' ? bitcoinApi :
                wallet.walletType === 'cardano' ? cardanoApi :
                wallet.walletType === 'spark' ? sparkApi : null;
    
    if (!api) {
      toast.error('No wallet connected');
      return null;
    }
    
    try {
      return await api.signMessage(message);
    } catch (error) {
      toast.error('Message signing failed');
      return null;
    }
  }, [wallet.walletType, bitcoinApi, cardanoApi, sparkApi]);

  return {
    wallet,
    bitcoinApi,
    cardanoApi,
    sparkApi,
    connect,
    disconnect,
    signTransaction,
    signMessage,
  };
}
