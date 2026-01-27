# Charms WASM Modules

WASM modules are now built inside the Rust source directories.

## Building All WASM Modules

```bash
cd src/rust

# 1. charms-data (dependency - build first)
cd charms-data
wasm-pack build --target web --features wasm
cd ..

# 2. charms-sdk (core SDK)
cd charms-sdk
wasm-pack build --target web --features wasm
cd ..

# 3. charmix (app-specific logic)
cd charmix
wasm-pack build --target web --features wasm
cd ..
```

## Output Structure

After building, each crate will have a `pkg/` folder:

```
src/rust/
├── charms-data/pkg/
│   ├── charms_data.js
│   └── charms_data_bg.wasm
├── charms-sdk/pkg/
│   ├── charms_sdk.js
│   └── charms_sdk_bg.wasm
└── charmix/pkg/
    ├── charmix.js
    └── charmix_bg.wasm
```

## Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack
```

## Loader Configuration

The WASM loader at `src/lib/charms-wasm-loader.ts` automatically loads from these paths.
