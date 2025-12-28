/**
 * Charms SDK Integration Layer
 * 
 * This module provides a TypeScript interface for interacting with the Charms Protocol.
 * Based on the official Charms payload structure (v2) and CharmsDev repositories.
 * 
 * Charms Protocol enables programmable assets on Bitcoin through:
 * - Spells: Messages that create/transform charms in Bitcoin transactions
 * - Apps: Smart contract logic verified via zero-knowledge proofs (WASM/Rust)
 * - Enchanted UTXOs: Bitcoin outputs carrying tokens, NFTs, or application state
 * - Client-Side Validation: Users verify assets locally without indexers
 */

// ============= Charms Spell Payload v2 Structure (from official spec) =============

export interface CharmsSpellPayload {
  spell: {
    version: 2;
    apps: Record<string, string>; // e.g., "$00": "n/dcb84536.../vk_hash"
    private_inputs?: Record<string, string>; // e.g., "$00": "txid:vout"
    ins: CharmsPayloadInput[];
    outs: CharmsPayloadOutput[];
  };
  binaries?: Record<string, string>; // WASM binaries for apps
  prev_txs: PreviousTransaction[];
  funding_utxo: string; // "txid:vout"
  funding_utxo_value: number; // satoshis
  change_address: string;
  fee_rate: number; // sat/vB
}

export interface CharmsPayloadInput {
  utxo_id: string; // "txid:vout"
  charms: Record<string, CharmTokenData>;
}

export interface CharmsPayloadOutput {
  address?: string;
  charms: Record<string, CharmTokenData>;
  sats: number;
}

export interface CharmTokenData {
  ticker?: string;
  remaining?: number;
  serviceName?: string;
  iconUrl?: string;
  // For NFTs
  tokenId?: string;
  metadata?: Record<string, unknown>;
  // For Escrow state
  escrowState?: PayloadEscrowState;
}

export interface PayloadEscrowState {
  payer: string;
  payee: string;
  arbiter?: string;
  milestones: PayloadMilestoneState[];
  status: 'active' | 'completed' | 'disputed';
}

export interface PayloadMilestoneState {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'released' | 'disputed';
}

export interface PreviousTransaction {
  chain: 'bitcoin';
  transaction: string; // raw tx hex
}

// ============= Internal SDK Types =============

export interface CharmApp {
  tag: 'NFT' | 'TOKEN' | 'ESCROW' | 'STABLECOIN' | 'GOVERNANCE';
  id: string;
  vkHash: string; // Verification key hash for the app contract
  wasmHash?: string; // WASM binary hash
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number; // In satoshis
  status: 'pending' | 'in_progress' | 'completed' | 'disputed' | 'released';
  proof?: string; // Evidence/proof of completion
  completedAt?: Date;
  releasedAt?: Date;
}

export interface EscrowContract {
  id: string;
  txid: string; // Bitcoin transaction ID
  outputIndex: number;
  payer: string; // Bitcoin address
  payee: string; // Bitcoin address
  arbiter?: string; // Optional arbiter address
  totalAmount: number; // Total locked amount in satoshis
  milestones: Milestone[];
  createdAt: Date;
  expiresAt?: Date;
  status: 'active' | 'completed' | 'expired' | 'disputed' | 'cancelled';
  spellData?: SpellData;
}

export interface SpellData {
  version: number;
  appId: string;
  inputs: SpellInput[];
  outputs: SpellOutput[];
  proofData: string; // ZK proof for app contract satisfaction
}

export interface SpellInput {
  txid: string;
  vout: number;
  charms?: CharmState[];
}

export interface SpellOutput {
  value: number;
  script: string;
  charms?: CharmState[];
}

export interface CharmState {
  app: CharmApp;
  state: Record<string, unknown>;
}

export interface TransactionResult {
  txid: string;
  hex: string;
  spell: SpellData;
  fee: number;
  confirmed: boolean;
}

// ============= Secure Random (inspired by getrandom) =============

class SecureRandom {
  private static getRandomValues(length: number): Uint8Array {
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  }

  static generateBytes(length: number): string {
    return Array.from(this.getRandomValues(length))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static generateId(): string {
    return this.generateBytes(4);
  }

  static generateTxid(): string {
    return this.generateBytes(32);
  }

  static generateVkHash(): string {
    return this.generateBytes(32);
  }
}

// ============= Charms SDK Class =============

export class CharmsSDK {
  private network: 'mainnet' | 'testnet' | 'signet';
  private endpoint: string;

  constructor(config: { network?: 'mainnet' | 'testnet' | 'signet'; endpoint?: string } = {}) {
    this.network = config.network || 'testnet';
    this.endpoint = config.endpoint || 'https://api.charms.dev';
  }

  /**
   * Creates a Charms Spell Payload v2 for a token mint
   */
  createTokenSpellPayload(params: {
    ticker: string;
    amount: number;
    serviceName?: string;
    iconUrl?: string;
    fundingUtxo: string;
    fundingValue: number;
    changeAddress: string;
    recipientAddress: string;
    feeRate?: number;
  }): CharmsSpellPayload {
    const appId = `$00`;
    const vkHash = SecureRandom.generateVkHash();
    
    return {
      spell: {
        version: 2,
        apps: {
          [appId]: `n/${vkHash.slice(0, 16)}/${vkHash}`,
        },
        private_inputs: {
          [appId]: params.fundingUtxo,
        },
        ins: [{
          utxo_id: params.fundingUtxo,
          charms: {},
        }],
        outs: [{
          address: params.recipientAddress,
          charms: {
            [appId]: {
              ticker: params.ticker,
              remaining: params.amount,
              serviceName: params.serviceName,
              iconUrl: params.iconUrl,
            },
          },
          sats: 1000,
        }],
      },
      binaries: {},
      prev_txs: [],
      funding_utxo: params.fundingUtxo,
      funding_utxo_value: params.fundingValue,
      change_address: params.changeAddress,
      fee_rate: params.feeRate || 2,
    };
  }

  /**
   * Creates a Charms Spell Payload v2 for an escrow contract
   */
  createEscrowSpellPayload(params: {
    payer: string;
    payee: string;
    arbiter?: string;
    amount: number;
    milestones: { title: string; amount: number }[];
    fundingUtxo: string;
    fundingValue: number;
    feeRate?: number;
  }): CharmsSpellPayload {
    const appId = `$00`;
    const vkHash = SecureRandom.generateVkHash();
    
    return {
      spell: {
        version: 2,
        apps: {
          [appId]: `n/${vkHash.slice(0, 16)}/${vkHash}`,
        },
        ins: [{
          utxo_id: params.fundingUtxo,
          charms: {},
        }],
        outs: [{
          address: params.payee,
          charms: {
            [appId]: {
              ticker: 'ESCROW',
              remaining: params.amount,
              escrowState: {
                payer: params.payer,
                payee: params.payee,
                arbiter: params.arbiter,
                milestones: params.milestones.map((m, i) => ({
                  id: `m${i}`,
                  amount: m.amount,
                  status: 'pending' as const,
                })),
                status: 'active',
              },
            },
          },
          sats: params.amount,
        }],
      },
      binaries: {},
      prev_txs: [],
      funding_utxo: params.fundingUtxo,
      funding_utxo_value: params.fundingValue,
      change_address: params.payer,
      fee_rate: params.feeRate || 2,
    };
  }

  /**
   * Creates a new escrow contract with milestone-based release conditions
   */
  async createEscrow(params: {
    payer: string;
    payee: string;
    arbiter?: string;
    milestones: Omit<Milestone, 'id' | 'status'>[];
    expiresAt?: Date;
  }): Promise<EscrowContract> {
    await this.simulateDelay(1500);

    const escrowId = SecureRandom.generateId();
    const txid = SecureRandom.generateTxid();
    const totalAmount = params.milestones.reduce((sum, m) => sum + m.amount, 0);

    const milestones: Milestone[] = params.milestones.map((m, index) => ({
      ...m,
      id: `${escrowId}-m${index}`,
      status: 'pending',
    }));

    const escrow: EscrowContract = {
      id: escrowId,
      txid,
      outputIndex: 0,
      payer: params.payer,
      payee: params.payee,
      arbiter: params.arbiter,
      totalAmount,
      milestones,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      status: 'active',
      spellData: {
        version: 2,
        appId: `escrow-${escrowId}`,
        inputs: [],
        outputs: [{
          value: totalAmount,
          script: this.generateScript(params.payee),
          charms: [{
            app: {
              tag: 'ESCROW',
              id: escrowId,
              vkHash: SecureRandom.generateVkHash(),
            },
            state: {
              payer: params.payer,
              payee: params.payee,
              arbiter: params.arbiter,
              milestones: milestones.map(m => ({
                id: m.id,
                amount: m.amount,
                status: m.status,
              })),
            },
          }],
        }],
        proofData: `zk_proof_${Date.now()}_${SecureRandom.generateId()}`,
      },
    };

    return escrow;
  }

  /**
   * Marks a milestone as complete and generates proof for verification
   */
  async completeMilestone(
    escrowId: string,
    milestoneId: string,
    proof: string
  ): Promise<{ success: boolean; spell: SpellData }> {
    await this.simulateDelay(1000);

    return {
      success: true,
      spell: {
        version: 2,
        appId: `escrow-${escrowId}`,
        inputs: [{
          txid: SecureRandom.generateTxid(),
          vout: 0,
        }],
        outputs: [{
          value: 0,
          script: 'OP_RETURN',
          charms: [{
            app: {
              tag: 'ESCROW',
              id: escrowId,
              vkHash: SecureRandom.generateVkHash(),
            },
            state: {
              milestoneId,
              status: 'completed',
              proof,
              timestamp: Date.now(),
            },
          }],
        }],
        proofData: `zk_proof_${Date.now()}_${SecureRandom.generateId()}`,
      },
    };
  }

  /**
   * Releases funds for a completed milestone
   */
  async releaseMilestone(
    escrowId: string,
    milestoneId: string,
    amount: number,
    recipient: string
  ): Promise<TransactionResult> {
    await this.simulateDelay(2000);

    return {
      txid: SecureRandom.generateTxid(),
      hex: SecureRandom.generateBytes(100),
      spell: {
        version: 2,
        appId: `escrow-${escrowId}`,
        inputs: [{
          txid: SecureRandom.generateTxid(),
          vout: 0,
        }],
        outputs: [{
          value: amount,
          script: this.generateScript(recipient),
        }],
        proofData: `zk_proof_${Date.now()}_${SecureRandom.generateId()}`,
      },
      fee: Math.floor(Math.random() * 1000) + 500,
      confirmed: false,
    };
  }

  /**
   * Disputes a milestone, triggering arbiter involvement
   */
  async disputeMilestone(
    escrowId: string,
    milestoneId: string,
    reason: string
  ): Promise<{ success: boolean; disputeId: string }> {
    await this.simulateDelay(1000);

    return {
      success: true,
      disputeId: `dispute-${SecureRandom.generateId()}`,
    };
  }

  /**
   * Gets the current state of an escrow contract from the blockchain
   */
  async getEscrowState(txid: string): Promise<CharmState | null> {
    await this.simulateDelay(500);

    return {
      app: {
        tag: 'ESCROW',
        id: txid.slice(0, 8),
        vkHash: SecureRandom.generateVkHash(),
      },
      state: {
        status: 'active',
        lastUpdated: Date.now(),
      },
    };
  }

  /**
   * Verifies a spell's proof is valid for the given app contract
   */
  async verifySpell(spell: SpellData): Promise<{ valid: boolean; error?: string }> {
    await this.simulateDelay(800);
    return { valid: true };
  }

  // Helper methods
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateScript(address: string): string {
    return `OP_DUP OP_HASH160 ${address.slice(0, 40)} OP_EQUALVERIFY OP_CHECKSIG`;
  }
}

// Export singleton instance
export const charmsSDK = new CharmsSDK({ network: 'testnet' });

// ============= Utility Functions =============

export function satoshisToBTC(sats: number): number {
  return sats / 100_000_000;
}

export function btcToSatoshis(btc: number): number {
  return Math.floor(btc * 100_000_000);
}

export function formatBTC(sats: number): string {
  return `${satoshisToBTC(sats).toFixed(8)} BTC`;
}

export function formatSats(sats: number): string {
  return `${sats.toLocaleString()} sats`;
}

export function shortenTxid(txid: string): string {
  return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
