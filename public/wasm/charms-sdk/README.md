# Charms SDK WASM Module

This directory should contain the compiled WebAssembly module for the Charms SDK.

## Building the WASM Module

On your local machine with Rust and wasm-pack installed:

```bash
# Install wasm-pack if not already installed
cargo install wasm-pack

# Navigate to the Charms SDK source
cd src/rust/charms-sdk

# Build for web target
wasm-pack build --target web --out-dir ../../../public/wasm/charms-sdk --features wasm
```

## Expected Files After Build

After running `wasm-pack build`, you should have these files:

- `charms_sdk.js` - ES module glue code (required)
- `charms_sdk_bg.wasm` - WebAssembly binary (required)
- `charms_sdk.d.ts` - TypeScript definitions (optional)
- `charms_sdk_bg.wasm.d.ts` - WASM type definitions (optional)
- `package.json` - Package manifest (optional)

## Uploading to Lovable

After building locally, upload the generated files to this directory in your Lovable project.

## Fallback Behavior

If the WASM module is not present, the application will automatically fall back to a TypeScript implementation of the spell checker. This fallback provides the same functionality but runs in pure JavaScript.

## Features

The WASM module provides:

- `check_spell` - Validate any spell type
- `check_token` - Token conservation checks
- `check_nft` - NFT uniqueness checks  
- `check_escrow` - Escrow state machine validation
- `verify_spell` - Normalized spell structure verification
- `build_token_tx` - Build token transactions for testing
- `get_version` - Get SDK version

## Troubleshooting

### Module not loading
- Ensure all files are in `/public/wasm/charms-sdk/`
- Check browser console for loading errors
- Verify WASM file is not corrupted

### Version mismatch
- Rebuild WASM if Rust source has changed
- Clear browser cache after uploading new WASM files
