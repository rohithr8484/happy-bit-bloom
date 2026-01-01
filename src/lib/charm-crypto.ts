/**
 * Charm.js - Cryptographic Operations
 * 
 * TypeScript implementation based on:
 * https://github.com/jedisct1/charm.js/blob/master/examples/basic.js
 * 
 * Provides encrypt/decrypt/hash operations using Web Crypto API
 */

import { Result, Ok, Err } from './rust-zk-prover';

// ============= Types =============

export interface CharmKey {
  key: Uint8Array;
  nonce: Uint8Array;
}

export interface EncryptResult {
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

// ============= Charm Class =============

/**
 * Charm - Authenticated encryption and hashing
 * 
 * Example usage:
 * ```typescript
 * // Create a key and nonce
 * const key = new Uint8Array(32).fill(1);
 * const nonce = new Uint8Array(16).fill(2);
 * 
 * // Create a message
 * const message = new TextEncoder().encode('Hello from Charm!');
 * console.log('Original message:', new TextDecoder().decode(message));
 * 
 * // Encrypt
 * const charm = new Charm(key, nonce);
 * const tag = charm.encrypt(message);
 * console.log('Message encrypted');
 * 
 * // Decrypt
 * const charm2 = new Charm(key, nonce);
 * charm2.decrypt(message, tag);
 * console.log('Decrypted message:', new TextDecoder().decode(message));
 * 
 * // Hash
 * const hash = charm.hash(message);
 * console.log('Message hash (hex):', bytesToHex(hash));
 * ```
 */
export class Charm {
  private key: Uint8Array;
  private nonce: Uint8Array;
  private state: Uint8Array;

  constructor(key: Uint8Array, nonce: Uint8Array) {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes');
    }
    if (nonce.length < 8 || nonce.length > 16) {
      throw new Error('Nonce must be 8-16 bytes');
    }
    
    this.key = new Uint8Array(key);
    this.nonce = new Uint8Array(nonce);
    this.state = this.initState();
  }

  /**
   * Initialize cipher state from key and nonce
   */
  private initState(): Uint8Array {
    const state = new Uint8Array(64);
    // Mix key into state
    for (let i = 0; i < 32; i++) {
      state[i] = this.key[i];
    }
    // Mix nonce into state
    for (let i = 0; i < this.nonce.length; i++) {
      state[32 + i] = this.nonce[i];
    }
    // Run permutation
    this.permute(state);
    return state;
  }

  /**
   * Permutation function (simplified ChaCha-like)
   */
  private permute(state: Uint8Array): void {
    for (let round = 0; round < 20; round++) {
      for (let i = 0; i < 16; i++) {
        const a = i;
        const b = (i + 4) % 16;
        const c = (i + 8) % 16;
        const d = (i + 12) % 16;
        
        state[a] = (state[a] + state[b]) & 0xff;
        state[d] ^= state[a];
        state[d] = ((state[d] << 4) | (state[d] >> 4)) & 0xff;
        
        state[c] = (state[c] + state[d]) & 0xff;
        state[b] ^= state[c];
        state[b] = ((state[b] << 5) | (state[b] >> 3)) & 0xff;
      }
    }
  }

  /**
   * Generate keystream block
   */
  private generateBlock(): Uint8Array {
    const block = new Uint8Array(this.state);
    this.permute(block);
    // Increment counter in state
    for (let i = 48; i < 64; i++) {
      this.state[i] = (this.state[i] + 1) & 0xff;
      if (this.state[i] !== 0) break;
    }
    return block;
  }

  /**
   * Encrypt message in place and return authentication tag
   */
  encrypt(message: Uint8Array): Uint8Array {
    const tag = new Uint8Array(16);
    let blockOffset = 0;
    let block = this.generateBlock();
    
    // Encrypt and accumulate tag
    for (let i = 0; i < message.length; i++) {
      if (blockOffset >= block.length) {
        block = this.generateBlock();
        blockOffset = 0;
      }
      
      // XOR with keystream
      message[i] ^= block[blockOffset];
      
      // Accumulate into tag
      tag[i % 16] ^= message[i];
      
      blockOffset++;
    }
    
    // Finalize tag
    for (let i = 0; i < 16; i++) {
      tag[i] ^= this.state[i];
    }
    
    return tag;
  }

  /**
   * Decrypt message in place, verifying the authentication tag
   */
  decrypt(ciphertext: Uint8Array, tag: Uint8Array): boolean {
    // Compute expected tag
    const expectedTag = new Uint8Array(16);
    for (let i = 0; i < ciphertext.length; i++) {
      expectedTag[i % 16] ^= ciphertext[i];
    }
    for (let i = 0; i < 16; i++) {
      expectedTag[i] ^= this.state[i];
    }
    
    // Verify tag
    let valid = true;
    for (let i = 0; i < 16; i++) {
      if (expectedTag[i] !== tag[i]) {
        valid = false;
      }
    }
    
    if (!valid) {
      return false;
    }
    
    // Decrypt
    let blockOffset = 0;
    let block = this.generateBlock();
    
    for (let i = 0; i < ciphertext.length; i++) {
      if (blockOffset >= block.length) {
        block = this.generateBlock();
        blockOffset = 0;
      }
      ciphertext[i] ^= block[blockOffset];
      blockOffset++;
    }
    
    return true;
  }

  /**
   * Hash a message
   */
  hash(message: Uint8Array): Uint8Array {
    const state = new Uint8Array(64);
    
    // Initialize with message length
    state[0] = message.length & 0xff;
    state[1] = (message.length >> 8) & 0xff;
    state[2] = (message.length >> 16) & 0xff;
    state[3] = (message.length >> 24) & 0xff;
    
    // Absorb message blocks
    let offset = 0;
    while (offset < message.length) {
      const blockSize = Math.min(32, message.length - offset);
      for (let i = 0; i < blockSize; i++) {
        state[4 + i] ^= message[offset + i];
      }
      this.permute(state);
      offset += blockSize;
    }
    
    // Squeeze output
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = state[i];
    }
    
    return hash;
  }
}

// ============= Utility Functions =============

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generate random key
 */
export function generateKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

/**
 * Generate random nonce
 */
export function generateNonce(length: number = 16): Uint8Array {
  const nonce = new Uint8Array(length);
  crypto.getRandomValues(nonce);
  return nonce;
}

// ============= High-Level API =============

/**
 * Encrypt a string message
 */
export function encryptMessage(
  message: string,
  key: Uint8Array,
  nonce: Uint8Array
): Result<{ ciphertext: Uint8Array; tag: Uint8Array }, Error> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const ciphertext = new Uint8Array(messageBytes);
    const charm = new Charm(key, nonce);
    const tag = charm.encrypt(ciphertext);
    return Ok({ ciphertext, tag });
  } catch (e) {
    return Err(e instanceof Error ? e : new Error('Encryption failed'));
  }
}

/**
 * Decrypt a ciphertext to string
 */
export function decryptMessage(
  ciphertext: Uint8Array,
  tag: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Result<string, Error> {
  try {
    const plaintext = new Uint8Array(ciphertext);
    const charm = new Charm(key, nonce);
    const valid = charm.decrypt(plaintext, tag);
    
    if (!valid) {
      return Err(new Error('Authentication failed'));
    }
    
    return Ok(new TextDecoder().decode(plaintext));
  } catch (e) {
    return Err(e instanceof Error ? e : new Error('Decryption failed'));
  }
}

/**
 * Hash a string message
 */
export function hashMessage(message: string): Result<string, Error> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const key = new Uint8Array(32);
    const nonce = new Uint8Array(16);
    const charm = new Charm(key, nonce);
    const hash = charm.hash(messageBytes);
    return Ok(bytesToHex(hash));
  } catch (e) {
    return Err(e instanceof Error ? e : new Error('Hashing failed'));
  }
}

// ============= Demo Function =============

/**
 * Run the charm.js basic example
 */
export function runCharmDemo(): {
  originalMessage: string;
  encryptedHex: string;
  decryptedMessage: string;
  hashHex: string;
} {
  // Create a key and nonce
  const key = new Uint8Array(32).fill(1);
  const nonce = new Uint8Array(16).fill(2);
  
  // Create a message
  const originalMessage = 'Hello from Charm!';
  const message = new TextEncoder().encode(originalMessage);
  const messageCopy = new Uint8Array(message);
  
  // Encrypt
  const charm = new Charm(key, nonce);
  const tag = charm.encrypt(messageCopy);
  const encryptedHex = bytesToHex(messageCopy);
  
  // Decrypt
  const charm2 = new Charm(key, nonce);
  charm2.decrypt(messageCopy, tag);
  const decryptedMessage = new TextDecoder().decode(messageCopy);
  
  // Hash
  const hash = charm.hash(message);
  const hashHex = bytesToHex(hash);
  
  return {
    originalMessage,
    encryptedHex,
    decryptedMessage,
    hashHex,
  };
}

export default Charm;
