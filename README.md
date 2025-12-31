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

## 🤝 Partner Technology Stack

BOS CircuitForge interoperates with the following core technologies:

### 🔹 Charms
Circuits execute as verifiable programs, producing proofs that can be settled on Bitcoin.

### 🔹 Scroll
Optional high-throughput execution or coordination layer prior to Bitcoin finality.

### 🔹 UTXOS.dev 

A full-stack Web3 infrastructure platform purpose-built for Bitcoin, Cardano and Spark.

---

## 🧱 Tech Stack

- Frontend: React + TypeScript  
- Build Tool: Vite  
- UI: shadcn/ui  
- Styling: Tailwind CSS  
- Execution Layer: Charms (optional Scroll coordination)  
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


## 🧪 Run in Development Mode

```bash

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


## 📜 License

MIT License

Copyright (c) 2025 BOS CircuitForge


