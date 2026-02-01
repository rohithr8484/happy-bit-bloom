# Charms Spell Checker

SP1 zkVM entry point for spell verification.

## Overview

This crate provides the main entry point for verifying Charms spells inside the SP1 zkVM environment. It reads spell prover input, validates the spell correctness, and commits the output.

## Building

```bash
# For native testing
cargo build

# For SP1 zkVM target
cargo build --features zkvm
```

## Usage

This binary is designed to run inside the SP1 zkVM. The `main()` function:

1. Reads `SpellProverInput` from zkVM I/O
2. Validates the spell using `is_correct()`
3. Commits the `(self_spell_vk, spell)` tuple as public output

## Dependencies

- `charms-client`: Provides `NormalizedSpell`, `SpellProverInput`, and `is_correct`
- `charms-data`: Provides serialization utilities
- `sp1-zkvm`: SP1 zkVM runtime (optional, for zkVM builds)
