# BOS CircuitForge

BOS CircuitForge enables milestone-based governance, and cross-chain verification. It is a Bitcoin OS–native platform for building UTXO-secured trustless escrows, stateful circuits, and verifiable execution flows with final settlement on Bitcoin. 

BOS CircuitForge application uses Charms Protocol and zero-knowledge proofs to make Bitcoin programmable by attaching verifiable logic to UTXOs—expanding Bitcoin’s functionality without changing its core security model.  It enables developers to model application logic as deterministic circuits, prove execution correctness, and anchor outcomes to Bitcoin.

<p align="left"> <img src="https://img.shields.io/badge/Encode Club%20-blue?style=flat-square" /> <img src="https://img.shields.io/badge/The BOS %20Hackathon-purple?style=flat-square" /> <img src="https://img.shields.io/badge/Charms %20Protocol-green?style=flat-square" /> <img src="https://img.shields.io/badge/UTXO blockchains-orange?style=flat-square" /> <img src="https://img.shields.io/badge/Privacy Tech-orange?style=flat-square" /> <img src="https://img.shields.io/badge/Governance-orange?style=flat-square" /> </p>

<img width="899" height="447" alt="bitcoin" src="https://github.com/user-attachments/assets/aaaaecdb-c67e-4701-b7ec-e9670cafe41f" />

---

## ✨ Key Features

### 🔐 Escrows
- Lock Bitcoin securely until work is completed or conditions are met  
- Release funds by **milestones, deadlines, or mutual approval**  
- No middlemen — funds move only when agreed rules are satisfied  

---

### 🏆 Bounties
- Post Bitcoin rewards for tasks, fixes, or contributions  
- Pay only when work is completed and approved  
- Ideal for open-source projects, freelancers, and communities  

---

### 💵 Bollar
- Turn Bitcoin into a **stable, spendable balance** without selling it
- Deposit BTC to mint Bollar
- Use Bollar as Token and repay later to unlock it  
- Designed for predictable payments and settlements  

---

### 🧠 ZK Proofs 
- Prove work is done **without revealing sensitive details**  
- Keep data private while still unlocking payments  
- Useful for audits, verification, and trust-minimized payouts  

---

### 🚀 Scroll batch proof generation 
- Handle multiple actions smoothly and efficiently  
- Faster confirmations with lower costs behind the scenes  
- Makes complex workflows feel simple to users  

---

### ✨ Charms spell validation
- Add simple “rules” to Bitcoin transactions  
- Power escrows, bounties, and assets with built-in logic  
- Everything remains transparent and verifiable  

---

### 📊 Bitcoin Analytics
- See funds **locked, released, pending, or disputed**  
- Clear history of what happened, when, and why

### ✨ AI bot
- Recommendations for Escrow Setup, Bounty Design, Stablecoin Risk, and ZK Proof Type
  
---

## 🧠 Use Cases

- Trustless escrows

- Milestone-based payments

- DAO treasury controls

- On-chain governance execution

- Stateful Bitcoin-native applications

- BOS-native DeFi primitives


---
## 🧱 Technical Architecture

<img width="428" height="289" alt="Screenshot from 2026-01-05 10-38-02" src="https://github.com/user-attachments/assets/83838539-ffec-4e9e-a381-ea1a64500575" />
<img width="428" height="289" alt="Screenshot from 2026-01-05 10-38-46" src="https://github.com/user-attachments/assets/0776cb1e-8304-468d-a282-f1f8da9bd8bc" />
<img width="473" height="354" alt="Screenshot from 2026-01-05 10-39-03" src="https://github.com/user-attachments/assets/1f3f7067-25c2-4afc-9b7a-9032a24c9f3c" />
<img width="473" height="354" alt="Screenshot from 2026-01-05 10-39-17" src="https://github.com/user-attachments/assets/dd8bd898-a7c8-4f83-9212-f6d0f91e8d2c" />
<img width="509" height="312" alt="Screenshot from 2026-01-05 10-39-45" src="https://github.com/user-attachments/assets/4c84684d-5281-416d-a593-c4ca57d288ba" />
<img width="509" height="312" alt="Screenshot from 2026-01-05 10-40-00" src="https://github.com/user-attachments/assets/0031bf21-777d-433d-a94f-9cf70414f3f5" />
<img width="900" height="600" alt="Figure_7_Bitcoin_Analytics_Simplified" src="https://github.com/user-attachments/assets/0fa3d705-8eb0-471e-84a9-ff1d0a9b849c" />

---

## 🤝 Partner Technology Stack

BOS CircuitForge interoperates with the following core technologies:

### 🔹 Charms
Circuits execute as verifiable programs, producing proofs that can be settled on Bitcoin.
Charms is a library, CLI, and web API that enables programmable tokens, NFTs, and app state directly on Bitcoin by attaching logic to UTXOs.

Using spells embedded in Bitcoin transactions, Charms let NFTs carry state and enforce rules—such as minting tokens only when the NFT state is correctly updated in the same transaction.

#### 🔹 Implementation of Charms Protocol

Charms.js (JavaScript) - To provide browser- and app-friendly cryptographic utilities to encrypt, hash, and verify data used in Charms spells and proofs.

Charms ( typescript) - To implement cryptographic primitives (encrypt, decrypt, authenticate, hash) used to secure spell data, verify integrity, and safely pass inputs between users, apps, and verifiers. ZK Proving Hook generates proofs but also validates spells, verifies proofs, tracks status, and exposes metrics.

<img width="716" height="362" alt="Screenshot from 2026-01-28 10-53-12" src="https://github.com/user-attachments/assets/09ed7ddf-5154-4217-a576-682973ec591c" />


Charms (rust) - Used for deterministic spell execution and verification, defining how Charms are created, transformed, and validated directly on Bitcoin using UTXO-based logic.

<img width="531" height="228" alt="Screenshot from 2026-01-28 09-33-00" src="https://github.com/user-attachments/assets/76c07e08-bab1-4814-8a33-f4c083edcf03" />


### 🔹 Scroll
Optional high-throughput execution or coordination layer prior to Bitcoin finality.

Manages generating and tracking chunk and batch zk-proofs for Scroll by simulating block/chunk witnesses, updating progress, and storing proof history.
It also supports network selection, queue stats, and proof verification, exposing a clean API for UI-driven proof generation and status handling. The Scroll prover takes automatically fetched zkEVM block or chunk data and computes a zero-knowledge proof that all transactions were executed correctly and in order.

<img width="745" height="371" alt="Screenshot from 2026-01-28 10-56-43" src="https://github.com/user-attachments/assets/05296ee0-4de5-4a8a-a185-179fbb1e22be" />


### 🔹 UTXOS.dev 

A full-stack Web3 infrastructure platform with transaction sponsorship purpose-built for Bitcoin, Cardano and Spark. Bitcoin developer platform that provides tools, SDKs, and primitives to build UTXO-native applications like escrows, bounties, and programmable assets.

Altenative to Bitcoin testnet faucets : https://coinfaucet.eu/en/btc-testnet4/

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

## 📦 UI Dependencies

Core dependencies include:

- react  
- react-dom  
- typescript  
- vite  
- shadcn/ui  
- tailwindcss  
- eslint  

---

## On-chain transactions on mempool (Testnet):  

- Escrows: https://mempool.space/testnet/tx/75ddb2ded8427c6e819482ac0560be93ed8b378241178f5eebb3f973a5d1c1d5
- Bounties: https://mempool.space/testnet/tx/94d1da79729e013cc5a3044f7ef0e135d7aeac32af50fcb6f01de68d7b7a1653
- ZK Proofs: https://mempool.space/testnet/tx/84867dcb9c6ee9f5af4f37919085fd450e2d250fa8dc164191fa1a6f4c4d689c
- On-chain Spell Validation: https://mempool.space/testnet/tx/1db522b34abf7c42efd977a167b5ef6b1569410fc1cb4e7441707b1716828432

## 📦 Environment Variables

```bash
VITE_SUPABASE_URL =	
VITE_SUPABASE_PUBLISHABLE_KEY	=
VITE_SUPABASE_PROJECT_ID	=
Maestro_Bitcoin_API	MAESTRO_API_KEY	= 
MAESTRO_BASE_URL = 
UTXOS_PROJECT_ID = 
UTXOS_API_KEY	=
```

---

## 🧪 Run app in Development Mode

```bash

git clone https://github.com/rohithr8484/happy-bit-bloom.git

npm install

🧩 Install dependencies

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

cargo install --locked charms
cargo run -p charmix
cargo build -p charmix
cargo build -p charmix --release
./target/release/charmix

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
wasm-pack build --target web --features wasm



# charms-data

cargo install --locked charms
cargo build -p charms-data
cargo test -p charms-data

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
wasm-pack build --target web --features wasm

# charms-sdk

cargo install --locked charms
cargo build -p charms-sdk
cargo test -p charms-sdk

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
wasm-pack build --target web --features wasm

```
---

## 📦 Credits
This work benefitted from insights of mentors from BOS and Charms.

---

## 📜 License

Copyright (c) 2026 BOS CircuitForge


