/**
 * Charms WASM Loader
 * 
 * Loads the Charms SDK WASM module compiled with wasm-pack.
 * 
 * To compile the WASM module locally:
 * 1. cd src/rust/charms-sdk
 * 2. wasm-pack build --target web --out-dir ../../../public/wasm/charms-sdk --features wasm
 * 
 * Expected files in /public/wasm/charms-sdk/:
 * - charms_sdk.js (ES module glue code)
 * - charms_sdk_bg.wasm (WebAssembly binary)
 * - charms_sdk.d.ts (TypeScript definitions)
 */

// ============================================
// WASM Module Interface
// ============================================

export interface CharmsWasmExports {
  // Core spell checking
  check_spell(app_json: string, tx_json: string, x_json: string, w_json: string): unknown;
  check_token(app_json: string, tx_json: string, x_json: string): unknown;
  check_nft(app_json: string, tx_json: string, x_json: string): unknown;
  check_escrow(app_json: string, tx_json: string): unknown;
  
  // Spell verification
  verify_spell(spell_json: string): unknown;
  
  // Transaction builders
  build_token_tx(
    app_tag: string,
    vk_hash: string,
    input_amounts_json: string,
    output_amounts_json: string
  ): unknown;
  
  // Version info
  get_version(): string;
  
  // Extended functions (from charmix)
  check_bounty?(app_json: string, tx_json: string, x_json: string): unknown;
  check_bollar?(app_json: string, tx_json: string, x_json: string): unknown;
  build_escrow_tx?(app_tag: string, current_state: number | null, next_state: number, amount: number): unknown;
  get_charmix_version?(): string;
  
  // Data utilities (from charms-data)
  get_data_version?(): string;
  create_empty_data?(): string;
  create_u64_data?(value: number): string;
  create_bytes_data?(hex: string): string;
  validate_charm_state?(json: string): boolean;
  validate_transaction?(json: string): boolean;
}

// ============================================
// Module State
// ============================================

let wasmModule: CharmsWasmExports | null = null;
let loadingPromise: Promise<CharmsWasmExports> | null = null;
let loadError: Error | null = null;

// ============================================
// Loader Configuration
// ============================================

export interface WasmLoaderConfig {
  /** Base path for WASM files (default: '/wasm/charms-sdk') */
  basePath?: string;
  /** Whether to use streaming instantiation (default: true) */
  streaming?: boolean;
  /** Timeout in ms (default: 10000) */
  timeout?: number;
}

const DEFAULT_CONFIG: Required<WasmLoaderConfig> = {
  basePath: '/wasm/charms-sdk',
  streaming: true,
  timeout: 10000,
};

// ============================================
// Load Functions
// ============================================

/**
 * Check if WASM is already loaded
 */
export function isWasmLoaded(): boolean {
  return wasmModule !== null;
}

/**
 * Get the loaded WASM module (or null if not loaded)
 */
export function getWasmModule(): CharmsWasmExports | null {
  return wasmModule;
}

/**
 * Get the last load error (if any)
 */
export function getLoadError(): Error | null {
  return loadError;
}

/**
 * Load the WASM module using wasm-pack generated JS glue
 * 
 * This is the preferred loading method when using wasm-pack with --target web
 */
export async function loadCharmsWasm(config: WasmLoaderConfig = {}): Promise<CharmsWasmExports> {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule;
  }
  
  // Return existing loading promise to prevent duplicate loads
  if (loadingPromise) {
    return loadingPromise;
  }
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  loadingPromise = (async () => {
    try {
      loadError = null;
      
      // First, try to load the wasm-pack generated ES module
      const jsGluePath = `${finalConfig.basePath}/charms_sdk.js`;
      
      console.log('[CharmsWasm] Attempting to load from:', jsGluePath);
      
      // Dynamic import of the wasm-pack generated module
      const wasmPackModule = await Promise.race([
        import(/* @vite-ignore */ jsGluePath),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('WASM load timeout')), finalConfig.timeout)
        )
      ]);
      
      // wasm-pack modules have a default export that initializes the WASM
      if (typeof wasmPackModule.default === 'function') {
        // Initialize the WASM module
        await wasmPackModule.default();
        console.log('[CharmsWasm] WASM initialized via wasm-pack');
      }
      
      // Extract exports
      wasmModule = {
        check_spell: wasmPackModule.check_spell,
        check_token: wasmPackModule.check_token,
        check_nft: wasmPackModule.check_nft,
        check_escrow: wasmPackModule.check_escrow,
        verify_spell: wasmPackModule.verify_spell,
        build_token_tx: wasmPackModule.build_token_tx,
        get_version: wasmPackModule.get_version,
        check_bounty: wasmPackModule.check_bounty,
        check_bollar: wasmPackModule.check_bollar,
        build_escrow_tx: wasmPackModule.build_escrow_tx,
        get_charmix_version: wasmPackModule.get_charmix_version,
        get_data_version: wasmPackModule.get_data_version,
        create_empty_data: wasmPackModule.create_empty_data,
        create_u64_data: wasmPackModule.create_u64_data,
        create_bytes_data: wasmPackModule.create_bytes_data,
        validate_charm_state: wasmPackModule.validate_charm_state,
        validate_transaction: wasmPackModule.validate_transaction,
      };
      
      const version = wasmModule.get_version?.() || 'unknown';
      console.log('[CharmsWasm] Loaded successfully, version:', version);
      
      return wasmModule;
    } catch (error) {
      // If wasm-pack module failed, try direct WASM loading
      console.warn('[CharmsWasm] wasm-pack load failed, trying direct WASM:', error);
      return loadWasmDirect(finalConfig);
    }
  })();
  
  try {
    return await loadingPromise;
  } catch (error) {
    loadError = error instanceof Error ? error : new Error(String(error));
    loadingPromise = null;
    throw loadError;
  }
}

/**
 * Direct WASM loading (fallback when wasm-pack module is not available)
 */
async function loadWasmDirect(config: Required<WasmLoaderConfig>): Promise<CharmsWasmExports> {
  const wasmPath = `${config.basePath}/charms_sdk_bg.wasm`;
  
  console.log('[CharmsWasm] Attempting direct load from:', wasmPath);
  
  const response = await fetch(wasmPath);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
  }
  
  let wasmInstance: WebAssembly.Instance;
  
  // Prepare imports for the WASM module
  const imports: WebAssembly.Imports = {
    env: {
      abort: (msg: number, file: number, line: number, col: number) => {
        console.error(`WASM abort at ${file}:${line}:${col} - ${msg}`);
      },
    },
    wbg: {
      // wasm-bindgen imports (minimal set)
      __wbindgen_throw: (ptr: number, len: number) => {
        console.error('WASM throw:', ptr, len);
        throw new Error('WASM error');
      },
      __wbindgen_string_new: (ptr: number, len: number) => {
        return `string_${ptr}_${len}`;
      },
      __wbg_log_: console.log.bind(console),
    },
  };
  
  if (config.streaming && typeof WebAssembly.instantiateStreaming === 'function') {
    // Streaming instantiation (preferred, faster)
    const result = await WebAssembly.instantiateStreaming(
      fetch(wasmPath),
      imports
    );
    wasmInstance = result.instance;
  } else {
    // Fallback to array buffer instantiation
    const wasmBytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(wasmBytes, imports);
    wasmInstance = result.instance;
  }
  
  // The exports are the raw WASM functions
  const exports = wasmInstance.exports as unknown as CharmsWasmExports;
  
  wasmModule = exports;
  console.log('[CharmsWasm] Direct WASM load successful');
  
  return wasmModule;
}

/**
 * Reset the loader state (useful for testing or retry)
 */
export function resetWasmLoader(): void {
  wasmModule = null;
  loadingPromise = null;
  loadError = null;
  console.log('[CharmsWasm] Loader state reset');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if WebAssembly is supported in the current environment
 */
export function isWasmSupported(): boolean {
  return typeof WebAssembly !== 'undefined' &&
    typeof WebAssembly.instantiate === 'function';
}

/**
 * Get WASM loading status
 */
export function getWasmStatus(): {
  loaded: boolean;
  loading: boolean;
  error: Error | null;
  supported: boolean;
} {
  return {
    loaded: wasmModule !== null,
    loading: loadingPromise !== null && wasmModule === null,
    error: loadError,
    supported: isWasmSupported(),
  };
}

export default {
  loadCharmsWasm,
  isWasmLoaded,
  getWasmModule,
  getLoadError,
  resetWasmLoader,
  isWasmSupported,
  getWasmStatus,
};
