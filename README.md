# BOS CircuitForge

BOS CircuitForge is a Bitcoin OS–native framework for building UTXO-secured trustless escrows, stateful circuits, and verifiable execution flows with final settlement on Bitcoin. BOS CircuitForge enables milestone-based payments, governance, and cross-chain verification.

It enables developers to model application logic as deterministic circuits, prove execution correctness, and anchor outcomes to Bitcoin. BOS CircuitForge application uses Charms Protocol and zero-knowledge proofs to make Bitcoin programmable by attaching verifiable logic to UTXOs—expanding Bitcoin’s functionality without changing its core security model. 

<p align="left"> <img src="https://img.shields.io/badge/Encode Club%20-blue?style=flat-square" /> <img src="https://img.shields.io/badge/The BOS %20Hackathon-purple?style=flat-square" /> <img src="https://img.shields.io/badge/Charms %20Protocol-green?style=flat-square" /> <img src="https://img.shields.io/badge/UTXO blockchains-orange?style=flat-square" /> </p>

<img width="899" height="447" alt="bitcoin" src="https://github.com/user-attachments/assets/aaaaecdb-c67e-4701-b7ec-e9670cafe41f" />

---

## ✨ Key Features

- 🔐 **UTXO-Based Escrows**  
  Trust-minimized fund locking with Bitcoin-native security. UTXOs act as immutable application state, escrow and settlement anchors, and concurrency controls.  
  Each circuit transition consumes and produces UTXOs, ensuring explicit and auditable state evolution.

- 🧾 **Proof-First Execution**  
  State transitions require cryptographic proof before settlement.

- ♻️ **Deterministic State Model**  
  Explicit state evolution with replay protection and concurrency safety.

- 🧩 **Composable by Design**  
  Built for BOS-native and modular execution layers.
---

## 🧠 Use Cases

Trustless escrows

Milestone-based payments

DAO treasury controls

On-chain governance execution

Stateful Bitcoin-native applications

BOS-native DeFi primitives  

---
## 🧱 Technical Architecture

<img width="428" height="289" alt="Screenshot from 2026-01-05 10-38-02" src="https://github.com/user-attachments/assets/83838539-ffec-4e9e-a381-ea1a64500575" />
<img width="428" height="289" alt="Screenshot from 2026-01-05 10-38-46" src="https://github.com/user-attachments/assets/0776cb1e-8304-468d-a282-f1f8da9bd8bc" />
<img width="473" height="354" alt="Screenshot from 2026-01-05 10-39-03" src="https://github.com/user-attachments/assets/1f3f7067-25c2-4afc-9b7a-9032a24c9f3c" />
<img width="473" height="354" alt="Screenshot from 2026-01-05 10-39-17" src="https://github.com/user-attachments/assets/dd8bd898-a7c8-4f83-9212-f6d0f91e8d2c" />
<img width="509" height="312" alt="Screenshot from 2026-01-05 10-39-45" src="https://github.com/user-attachments/assets/4c84684d-5281-416d-a593-c4ca57d288ba" />
<img width="509" height="312" alt="Screenshot from 2026-01-05 10-40-00" src="https://github.com/user-attachments/assets/0031bf21-777d-433d-a94f-9cf70414f3f5" />

---

## 🤝 Partner Technology Stack

BOS CircuitForge interoperates with the following core technologies:

### 🔹 Charms
Circuits execute as verifiable programs, producing proofs that can be settled on Bitcoin.
Charms is a library, CLI, and web API that enables programmable tokens, NFTs, and app state directly on Bitcoin by attaching logic to UTXOs.
Using spells embedded in Bitcoin transactions, Charms let NFTs carry state and enforce rules—such as minting tokens only when the NFT state is correctly updated in the same transaction.

Charms.js (JavaScript) - To provide browser- and app-friendly cryptographic utilities to encrypt, hash, and verify data used in Charms spells and proofs.

Charms ( typescript) - To implement cryptographic primitives (encrypt, decrypt, authenticate, hash) used to secure spell data, verify integrity, and safely pass inputs between users, apps, and verifiers. ZK Proving Hook generates proofs but also validates spells, verifies proofs, tracks status, and exposes metrics.

Charms (rust) - Used for deterministic spell execution and verification, defining how Charms are created, transformed, and validated directly on Bitcoin using UTXO-based logic.


### 🔹 Scroll
Optional high-throughput execution or coordination layer prior to Bitcoin finality.

Manages generating and tracking chunk and batch zk-proofs for Scroll by simulating block/chunk witnesses, updating progress, and storing proof history.
It also supports network selection, queue stats, and proof verification, exposing a clean API for UI-driven proof generation and status handling. The Scroll prover takes automatically fetched zkEVM block or chunk data and computes a zero-knowledge proof that all transactions were executed correctly and in order.

### 🔹 UTXOS.dev 

A full-stack Web3 infrastructure platform purpose-built for Bitcoin, Cardano and Spark.

Bitcoin developer platform that provides tools, SDKs, and primitives to build UTXO-native applications like escrows, bounties, and programmable assets.

### 🔹 Maestro 
Manages proof lifecycle, costs, and verification while fetching real Bitcoin data via Maestro and emulating zkVM (RISC Zero–like) execution and imports enable fetching real-time Bitcoin data such as prices, UTXOs, transactions, runes, NFTs, DeFi protocols, and wallet activity.

---

## 🧱 Tech Stack

- Frontend: React + TypeScript  
- Build Tool: Vite  
- UI: shadcn/ui  
- Styling: Tailwind CSS  
- Execution Layer: Charms, Scroll
- Settlement Layer: Bitcoin / Bitcoin OS  
- State Model: UTXO-anchored circuits  

---

## 📦 Dependencies

Core dependencies include:

- react  
- react-dom  
- typescript  
- vite  
- shadcn/ui  
- tailwindcss  
- eslint  

Exact versions are defined in `package.json`.

---


## 🧪 Run app in Development Mode

```bash

git clone https://github.com/rohithr8484/happy-bit-bloom.git

npm install

npm run dev

🏗️ Build for Production

npm run build

🧩 Build (Development Mode)

npm run build:dev

🔍 Preview Production Build

npm run preview

🧹 Lint Code

npm run lint

```
---

## 🧪 Run rust in Development Mode

```bash

cd src/rust

# charmix 
cargo run -p charmix
cargo build -p charmix
cargo build -p charmix --release
./target/release/charmix

# charms-data 
cargo build -p charms-data
cargo test -p charms-data

# charms-sdk 
cargo build -p charms-sdk
cargo test -p charms-sdk

```
---

## 📜 License

Copyright (c) 2026 BOS CircuitForge


