/**
 * Charms Protocol Interactive Panel
 * 
 * Features:
 * - Interactive Spell Checker using is_correct from Rust SDK
 * - Spell builder with live NormalizedSpell v2 preview
 * - Rust Example Projects display
 * - Charm.js Crypto Demo
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useRustZKProver } from "@/hooks/useRustZKProver";
import { 
  isCorrect,
  getrandom,
  type NormalizedSpell,
  type SpellValidation,
} from "@/lib/rust-zk-prover";
import { 
  Charm,
  bytesToHex,
  runCharmDemo,
} from "@/lib/charm-crypto";
import { 
  Gem, 
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Zap,
  FileCode,
  Copy,
  Play,
  Coins,
  Lock,
  Unlock,
  Hash,
  FolderTree,
  File,
  Terminal,
  Code,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// Demo spells for the spell checker (Rust NormalizedSpell v2 format)
const DEMO_SPELLS = {
  mint: {
    version: 2 as const,
    apps: {
      '$token': {
        vkHash: 'dcb845362a0c5b7c8f9e4d3a2b1c0f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a',
        namespace: 'token',
      },
    },
    ins: [{
      txid: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      vout: 0,
    }],
    outs: [{
      value: 10000,
      script: 'OP_DUP OP_HASH160 ... OP_EQUALVERIFY OP_CHECKSIG',
    }],
  },
  transfer: {
    version: 2 as const,
    apps: {
      '$transfer': {
        vkHash: 'f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1dcb845362a0c5b7c8f9e4d3a2b1c',
        namespace: 'transfer',
      },
    },
    ins: [{
      txid: 'def456abc789012345678901234567890fedcba9876543210fedcba98765432',
      vout: 1,
    }],
    outs: [{
      value: 5000,
      script: 'OP_DUP OP_HASH160 ... OP_EQUALVERIFY OP_CHECKSIG',
    }],
  },
};

// Rust example project structure
const RUST_PROJECTS = {
  charmix: {
    name: 'charmix',
    description: 'Example Charms application with NFT minting and token transfers',
    files: [
      { type: 'folder', name: 'spells', children: [
        { type: 'file', name: 'mint-nft.yaml' },
        { type: 'file', name: 'send.yaml' },
      ]},
      { type: 'folder', name: 'src', children: [
        { type: 'file', name: 'lib.rs', content: `use charms_sdk::data::{
    check, App, Data, Transaction, NFT, TOKEN,
};

pub fn app_contract(app: &App, tx: &Transaction, x: &Data, w: &Data) -> bool {
    match app.tag {
        NFT => {
            check!(nft_contract_satisfied(app, tx, x, w))
        }
        TOKEN => {
            check!(token_contract_satisfied(app, tx, x, w))
        }
        _ => todo!(),
    }
    true
}` },
        { type: 'file', name: 'main.rs', content: `#![no_main]
charms_sdk::main!(charmix::app_contract);` },
      ]},
      { type: 'file', name: 'Cargo.toml', content: `[package]
name = "charmix"
version = "0.1.0"
edition = "2021"

[dependencies]
charms-sdk = { version = "0.3.0" }` },
      { type: 'file', name: 'LICENSE' },
      { type: 'file', name: 'README.md' },
    ],
  },
  spellChecker: {
    name: 'charms-spell-checker',
    description: 'SP1 zkVM-based spell verification',
    files: [
      { type: 'folder', name: 'src', children: [
        { type: 'file', name: 'lib.rs', content: `use sp1_primitives::io::sha256_hash;
use sp1_zkvm::lib::verify::verify_sp1_proof;

pub const SPELL_CHECKER_VK: [u32; 8] = [
    574488448, 707802997, 1870388809, 964830622,
    1508095714, 795547556, 261568372, 1725719316,
];

pub fn main() {
    let input_vec = sp1_zkvm::io::read_vec();
    verify_proof(&SPELL_CHECKER_VK, &input_vec);
    sp1_zkvm::io::commit_slice(&input_vec);
}

fn verify_proof(vk: &[u32; 8], committed_data: &[u8]) {
    let Ok(pv) = sha256_hash(committed_data).try_into() else {
        unreachable!()
    };
    verify_sp1_proof(vk, &pv);
}` },
        { type: 'file', name: 'main.rs' },
      ]},
      { type: 'file', name: 'Cargo.toml' },
      { type: 'file', name: 'README.md' },
    ],
  },
};

export function CharmsFlowDiagram() {
  const { buildCharmsApp, verifySpell } = useRustZKProver();
  const [activeTab, setActiveTab] = useState<'spellChecker' | 'builder' | 'rustProjects' | 'charmCrypto'>('spellChecker');
  const [spellInput, setSpellInput] = useState(JSON.stringify(DEMO_SPELLS.mint, null, 2));
  const [verificationResult, setVerificationResult] = useState<SpellValidation | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<'mint' | 'transfer'>('mint');

  const handleVerifySpell = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setVerificationError(null);

    try {
      await new Promise(r => setTimeout(r, 1500));
      
      const spell = JSON.parse(spellInput) as NormalizedSpell;
      const vkResult = getrandom.getHex(32);
      const selfVk = vkResult.ok ? vkResult.value : '0'.repeat(64);
      
      const result = isCorrect(
        selfVk,
        [],
        spell,
        spell.ins.map(i => ({ txid: i.txid, vout: i.vout })),
        { type: 'mint', publicInputs: {}, witnessData: new Uint8Array(64) }
      );
      
      if (result.ok) {
        setVerificationResult(result.value);
        toast.success('Spell verified successfully! is_correct() = true');
      } else {
        const errResult = result as { ok: false; error: { message: string } };
        setVerificationError(errResult.error.message);
        toast.error(errResult.error.message);
      }
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Invalid spell JSON');
      toast.error('Invalid spell format');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoadDemo = (type: 'mint' | 'transfer') => {
    setSelectedDemo(type);
    setSpellInput(JSON.stringify(DEMO_SPELLS[type], null, 2));
    setVerificationResult(null);
  };

  const handleCopySpell = () => {
    navigator.clipboard.writeText(spellInput);
    toast.success('Spell copied to clipboard!');
  };

  const tabs = [
    { id: 'spellChecker' as const, label: 'Spell Checker', icon: Shield },
    { id: 'builder' as const, label: 'Spell Builder', icon: FileCode },
    { id: 'rustProjects' as const, label: 'Rust Projects', icon: FolderTree },
    { id: 'charmCrypto' as const, label: 'Charm.js', icon: Lock },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation with animation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab, index) => (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className={`gap-2 transition-all duration-300 ${
                activeTab === tab.id ? 'animate-glow-pulse' : 'hover-glow'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Spell Checker Tab */}
        {activeTab === 'spellChecker' && (
          <motion.div
            key="spellChecker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl bg-card border border-border hover-lift gradient-border">
              <div className="flex items-center gap-3 mb-6">
                <motion.div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center animate-glow-pulse"
                  whileHover={{ scale: 1.1 }}
                >
                  <Shield className="w-6 h-6 text-primary" />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">Charms Spell Checker</h3>
                  <p className="text-sm text-muted-foreground">
                    Validate spells using <code className="text-primary">is_correct()</code> verification
                  </p>
                </div>
              </div>

              {/* Demo Spell Selector */}
              <div className="flex gap-2 mb-4">
                {['mint', 'transfer'].map((type) => (
                  <motion.div key={type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={selectedDemo === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleLoadDemo(type as 'mint' | 'transfer')}
                      className="capitalize"
                    >
                      {type} Token Spell
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* Spell Input */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    Spell JSON (NormalizedSpell v2)
                  </Label>
                  <Button variant="ghost" size="sm" onClick={handleCopySpell} className="hover:text-primary">
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={spellInput}
                  onChange={(e) => setSpellInput(e.target.value)}
                  className="font-mono text-sm min-h-[280px] bg-secondary/30 border-border focus:border-primary transition-colors"
                  placeholder="Paste your NormalizedSpell JSON..."
                />
              </div>

              {/* Verification Result */}
              <AnimatePresence>
                {verificationResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className={`mb-4 p-4 rounded-xl border ${
                      verificationResult.valid
                        ? 'bg-success/10 border-success/30'
                        : 'bg-destructive/10 border-destructive/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {verificationResult.valid ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                          <CheckCircle className="w-6 h-6 text-success" />
                        </motion.div>
                      ) : (
                        <XCircle className="w-6 h-6 text-destructive" />
                      )}
                      <span className={`font-semibold ${
                        verificationResult.valid ? 'text-success' : 'text-destructive'
                      }`}>
                        {verificationResult.valid ? 'Spell is correct!' : 'Spell validation failed'}
                      </span>
                    </div>
                    
                    {verificationResult.valid && verificationResult.proofCommitment && (
                      <div className="space-y-2 text-sm">
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className="flex items-center justify-between p-2 rounded bg-secondary/30"
                        >
                          <span className="text-muted-foreground">Proof Commitment</span>
                          <span className="font-mono text-foreground text-xs">
                            {verificationResult.proofCommitment.slice(0, 16)}...
                          </span>
                        </motion.div>
                        {verificationResult.vkHash && (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-between p-2 rounded bg-secondary/30"
                          >
                            <span className="text-muted-foreground">VK Hash</span>
                            <span className="font-mono text-foreground text-xs">
                              {verificationResult.vkHash.slice(0, 16)}...
                            </span>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="glow"
                  className="w-full"
                  onClick={handleVerifySpell}
                  disabled={isVerifying || !spellInput.trim()}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying with zkVM...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Verify Spell
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Spell Builder Tab */}
        {activeTab === 'builder' && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <SpellBuilder />
          </motion.div>
        )}

        {/* Rust Projects Tab */}
        {activeTab === 'rustProjects' && (
          <motion.div
            key="rustProjects"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <RustProjectsPanel />
          </motion.div>
        )}

        {/* Charm.js Crypto Tab */}
        {activeTab === 'charmCrypto' && (
          <motion.div
            key="charmCrypto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <CharmCryptoPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Rust Projects Panel Component - Simplified without code display
function RustProjectsPanel() {
  const [selectedProject, setSelectedProject] = useState<'charmix' | 'spellChecker'>('charmix');
  const project = RUST_PROJECTS[selectedProject];

  const countFiles = (files: any[]): number => {
    return files.reduce((acc, file) => {
      if (file.type === 'folder' && file.children) {
        return acc + countFiles(file.children);
      }
      return acc + 1;
    }, 0);
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover-lift gradient-border">
      <div className="flex items-center gap-4 mb-8">
        <motion.div 
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 flex items-center justify-center shadow-lg shadow-orange-500/10"
          whileHover={{ scale: 1.1, rotate: 5 }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Terminal className="w-7 h-7 text-orange-400" />
        </motion.div>
        <div>
          <h3 className="font-bold text-foreground text-xl flex items-center gap-2">
            Rust Example Projects
            <Badge variant="outline" className="text-xs">Charms SDK</Badge>
          </h3>
          <p className="text-sm text-muted-foreground">Build programmable Bitcoin apps with Rust</p>
        </div>
      </div>

      {/* Project Tabs */}
      <div className="flex gap-3 mb-6">
        {Object.entries(RUST_PROJECTS).map(([key, proj], index) => (
          <motion.div 
            key={key} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant={selectedProject === key ? 'default' : 'outline'}
              onClick={() => setSelectedProject(key as any)}
              className={selectedProject === key ? 'shadow-lg shadow-primary/20' : ''}
            >
              <FolderTree className="w-4 h-4 mr-2" />
              {proj.name}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Project Info Card */}
      <motion.div 
        key={selectedProject}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20 border border-border"
      >
        <h4 className="font-semibold text-lg text-foreground mb-2">{project.name}</h4>
        <p className="text-muted-foreground mb-6">{project.description}</p>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
            <div className="text-2xl font-bold text-primary">{countFiles(project.files)}</div>
            <div className="text-xs text-muted-foreground">Files</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
            <div className="text-2xl font-bold text-orange-400">Rust</div>
            <div className="text-xs text-muted-foreground">Language</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-card/50 border border-border">
            <div className="text-2xl font-bold text-green-400">0.3.0</div>
            <div className="text-xs text-muted-foreground">SDK Version</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://github.com/CharmsDev/charms/tree/main/example-projects/${project.name}`, '_blank')}
            className="flex-1"
          >
            <Code className="w-4 h-4 mr-2" />
            View on GitHub
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`charms app new ${project.name}`);
              toast.success('Command copied!');
            }}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Command
          </Button>
        </div>
      </motion.div>

      {/* Quick Start */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Quick Start</span>
        </div>
        <code className="text-sm font-mono text-primary">
          charms app new {project.name}
        </code>
      </div>
    </div>
  );
}

// Charm.js Crypto Panel Component - Simplified without code display
function CharmCryptoPanel() {
  const [message, setMessage] = useState('Hello from Charm!');
  const [encryptedHex, setEncryptedHex] = useState<string | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  const [hashHex, setHashHex] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRunDemo = async () => {
    setIsProcessing(true);
    
    try {
      await new Promise(r => setTimeout(r, 500));
      
      const key = new Uint8Array(32).fill(1);
      const nonce = new Uint8Array(16).fill(2);
      const messageBytes = new TextEncoder().encode(message);
      const messageCopy = new Uint8Array(messageBytes);
      
      const charm = new Charm(key, nonce);
      const tag = charm.encrypt(messageCopy);
      setEncryptedHex(bytesToHex(messageCopy));
      
      const charm2 = new Charm(key, nonce);
      charm2.decrypt(messageCopy, tag);
      setDecryptedMessage(new TextDecoder().decode(messageCopy));
      
      const hashResult = charm.hash(messageBytes);
      setHashHex(bytesToHex(hashResult));
      
      toast.success('Charm.js demo completed!');
    } catch (error) {
      toast.error('Demo failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover-lift gradient-border">
      <div className="flex items-center gap-4 mb-8">
        <motion.div 
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10"
          whileHover={{ scale: 1.1 }}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Lock className="w-7 h-7 text-purple-400" />
        </motion.div>
        <div>
          <h3 className="font-bold text-foreground text-xl flex items-center gap-2">
            Charm.js Crypto
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </h3>
          <p className="text-sm text-muted-foreground">
            Authenticated encryption and hashing library
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Lock, label: 'Encrypt', color: 'from-red-500/20 to-red-500/5', iconColor: 'text-red-400' },
          { icon: Unlock, label: 'Decrypt', color: 'from-green-500/20 to-green-500/5', iconColor: 'text-green-400' },
          { icon: Hash, label: 'Hash', color: 'from-purple-500/20 to-purple-500/5', iconColor: 'text-purple-400' },
        ].map((feature, index) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl bg-gradient-to-br ${feature.color} border border-border text-center`}
          >
            <feature.icon className={`w-6 h-6 mx-auto mb-2 ${feature.iconColor}`} />
            <span className="text-sm font-medium text-foreground">{feature.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-3 mb-6">
        <Label className="text-base">Message to process</Label>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a message..."
          className="font-mono text-lg h-12"
        />
      </div>

      {/* Run Button */}
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          variant="glow"
          className="w-full h-12 text-base mb-6"
          onClick={handleRunDemo}
          disabled={isProcessing || !message}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Run Encryption Demo
            </>
          )}
        </Button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {encryptedHex && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-red-400" />
                <span className="font-semibold text-foreground">Encrypted</span>
                <Badge variant="outline" className="ml-auto text-xs">hex</Badge>
              </div>
              <code className="text-sm font-mono text-muted-foreground break-all leading-relaxed">
                {encryptedHex}
              </code>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Unlock className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-green-400">Decrypted</span>
                <CheckCircle className="w-4 h-4 ml-auto text-green-400" />
              </div>
              <code className="text-lg font-mono text-foreground">
                {decryptedMessage}
              </code>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-purple-400">SHA-256 Hash</span>
                <Badge variant="outline" className="ml-auto text-xs">32 bytes</Badge>
              </div>
              <code className="text-sm font-mono text-muted-foreground break-all leading-relaxed">
                {hashHex}
              </code>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reference */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">
            Based on <code className="text-primary">charm.js</code> by jedisct1
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => window.open('https://github.com/jedisct1/charm.js', '_blank')}
          >
            View Library
          </Button>
        </div>
      </div>
    </div>
  );
}

function SpellBuilder() {
  const { buildCharmsApp } = useRustZKProver();
  const [appType, setAppType] = useState<'token' | 'escrow' | 'nft'>('token');
  const [ticker, setTicker] = useState('CHARM');
  const [amount, setAmount] = useState('1000000');
  const [recipient, setRecipient] = useState('bc1q...');
  const [generatedPayload, setGeneratedPayload] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSpell = async () => {
    setIsGenerating(true);
    
    try {
      await new Promise(r => setTimeout(r, 1000));
      
      const txidResult = getrandom.getHex(32);
      const fundingUtxo = `${txidResult.ok ? txidResult.value : '0'.repeat(64)}:0`;
      
      const spellResult = buildCharmsApp('lending', {
        txid: fundingUtxo.split(':')[0],
        vout: 0,
        collateralValue: parseInt(amount) + 10000,
        borrowAmount: parseInt(amount),
        borrowerAddress: recipient,
      });
      
      if (spellResult.ok) {
        setGeneratedPayload(JSON.stringify(spellResult.value, null, 2));
        toast.success('Spell payload generated!');
      } else {
        toast.error('Failed to generate spell');
      }
    } catch (error) {
      toast.error('Failed to generate spell');
    } finally {
      setIsGenerating(false);
    }
  };

  const appTypes = [
    { id: 'token' as const, label: 'Token Mint', icon: Coins, color: 'from-yellow-500/30 to-yellow-500/10' },
    { id: 'escrow' as const, label: 'Escrow', icon: Shield, color: 'from-blue-500/30 to-blue-500/10' },
    { id: 'nft' as const, label: 'NFT', icon: Gem, color: 'from-purple-500/30 to-purple-500/10' },
  ];

  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover-lift gradient-border">
      <div className="flex items-center gap-3 mb-6">
        <motion.div 
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
        >
          <FileCode className="w-6 h-6 text-primary" />
        </motion.div>
        <div>
          <h3 className="font-semibold text-foreground text-lg">Spell Builder</h3>
          <p className="text-sm text-muted-foreground">
            Create CharmsSpellPayload v2 for your application
          </p>
        </div>
      </div>

      {/* App Type Selector */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {appTypes.map((type, index) => (
          <motion.button
            key={type.id}
            onClick={() => setAppType(type.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`p-4 rounded-xl border text-center transition-all ${
              appType === type.id
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center`}>
              <type.icon className={`w-5 h-5 ${appType === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <span className="text-sm font-medium">{type.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Token Form */}
      {appType === 'token' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4 mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Token Ticker</Label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="CHARM"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (sats)</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000000"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Recipient Address</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="bc1q..."
              className="font-mono"
            />
          </div>
        </motion.div>
      )}

      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          variant="glow"
          className="w-full mb-4"
          onClick={handleGenerateSpell}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate Spell Payload
            </>
          )}
        </Button>
      </motion.div>

      {/* Generated Payload */}
      <AnimatePresence>
        {generatedPayload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <Label>Generated CharmsSpellPayload v2</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPayload);
                  toast.success('Copied!');
                }}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
            <Textarea
              value={generatedPayload}
              readOnly
              className="font-mono text-xs min-h-[200px] bg-secondary/30"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}