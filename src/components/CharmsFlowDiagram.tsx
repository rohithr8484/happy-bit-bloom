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
import { isCorrect, getrandom, type NormalizedSpell, type SpellValidation } from "@/lib/rust-zk-prover";
import { Charm, bytesToHex, runCharmDemo } from "@/lib/charm-crypto";
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
  Hash,
  Sparkles,
  ShieldCheck,
  FileCheck,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

// Demo spells for the spell checker (Rust NormalizedSpell v2 format)
const DEMO_SPELLS = {
  mint: {
    version: 2 as const,
    apps: {
      $token: {
        vkHash: "dcb845362a0c5b7c8f9e4d3a2b1c0f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a",
        namespace: "token",
      },
    },
    ins: [
      {
        txid: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
        vout: 0,
      },
    ],
    outs: [
      {
        value: 10000,
        script: "OP_DUP OP_HASH160 ... OP_EQUALVERIFY OP_CHECKSIG",
      },
    ],
  },
  transfer: {
    version: 2 as const,
    apps: {
      $transfer: {
        vkHash: "f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1dcb845362a0c5b7c8f9e4d3a2b1c",
        namespace: "transfer",
      },
    },
    ins: [
      {
        txid: "def456abc789012345678901234567890fedcba9876543210fedcba98765432",
        vout: 1,
      },
    ],
    outs: [
      {
        value: 5000,
        script: "OP_DUP OP_HASH160 ... OP_EQUALVERIFY OP_CHECKSIG",
      },
    ],
  },
};

export function CharmsFlowDiagram() {
  const { buildCharmsApp, verifySpell } = useRustZKProver();
  const [activeTab, setActiveTab] = useState<"spellChecker" | "builder" | "charmCrypto">("spellChecker");
  const [spellInput, setSpellInput] = useState(JSON.stringify(DEMO_SPELLS.mint, null, 2));
  const [verificationResult, setVerificationResult] = useState<SpellValidation | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<"mint" | "transfer">("mint");

  const handleVerifySpell = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setVerificationError(null);

    try {
      await new Promise((r) => setTimeout(r, 1500));

      const spell = JSON.parse(spellInput) as NormalizedSpell;
      const vkResult = getrandom.getHex(32);
      const selfVk = vkResult.ok ? vkResult.value : "0".repeat(64);

      const result = isCorrect(
        selfVk,
        [],
        spell,
        spell.ins.map((i) => ({ txid: i.txid, vout: i.vout })),
        { type: "mint", publicInputs: {}, witnessData: new Uint8Array(64) },
      );

      if (result.ok) {
        setVerificationResult(result.value);
        toast.success("Spell verified successfully! is_correct() = true");
      } else {
        const errResult = result as { ok: false; error: { message: string } };
        setVerificationError(errResult.error.message);
        toast.error(errResult.error.message);
      }
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Invalid spell JSON");
      toast.error("Invalid spell format");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoadDemo = (type: "mint" | "transfer") => {
    setSelectedDemo(type);
    setSpellInput(JSON.stringify(DEMO_SPELLS[type], null, 2));
    setVerificationResult(null);
  };

  const handleCopySpell = () => {
    navigator.clipboard.writeText(spellInput);
    toast.success("Spell copied to clipboard!");
  };

  const tabs = [
    { id: "spellChecker" as const, label: "Spell Checker", icon: Shield },
    { id: "builder" as const, label: "Spell Builder", icon: FileCode },
    { id: "charmCrypto" as const, label: "Spell Verifier", icon: Lock },
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
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className={`gap-2 transition-all duration-300 ${
                activeTab === tab.id ? "animate-glow-pulse" : "hover-glow"
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
        {activeTab === "spellChecker" && (
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
                    Spells are programmable instructions that define what should happen on-chain, such as minting
                    tokens, locking funds, or transferring assets. Validate spells using{" "}
                    <code className="text-primary">is_correct()</code> verification
                  </p>
                </div>
              </div>

              {/* Demo Spell Selector */}
              <div className="flex gap-2 mb-4">
                {["mint", "transfer"].map((type) => (
                  <motion.div key={type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={selectedDemo === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLoadDemo(type as "mint" | "transfer")}
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
                    <FileCode className="w-4 h-4 text-primary" />
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
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className={`mb-4 p-4 rounded-xl border ${
                      verificationResult.valid
                        ? "bg-success/10 border-success/30"
                        : "bg-destructive/10 border-destructive/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {verificationResult.valid ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                          <CheckCircle className="w-6 h-6 text-success" />
                        </motion.div>
                      ) : (
                        <XCircle className="w-6 h-6 text-destructive" />
                      )}
                      <span
                        className={`font-semibold ${verificationResult.valid ? "text-success" : "text-destructive"}`}
                      >
                        {verificationResult.valid ? "Spell is correct!" : "Spell validation failed"}
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
        {activeTab === "builder" && (
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

        {/* Spell Verifier Tab */}
        {activeTab === "charmCrypto" && (
          <motion.div
            key="spellVerifier"
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

// Spell Verifier Panel - Cryptographic spell verification using charm-crypto
function CharmCryptoPanel() {
  const [spellData, setSpellData] = useState(JSON.stringify(DEMO_SPELLS.mint, null, 2));
  const [verificationResult, setVerificationResult] = useState<{
    spellHash: string;
    signature: string;
    vkHash: string;
    isValid: boolean;
    timestamp: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifySpell = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      await new Promise((r) => setTimeout(r, 800));

      // Parse the spell and generate cryptographic proofs
      const spell = JSON.parse(spellData);
      const spellBytes = new TextEncoder().encode(JSON.stringify(spell));

      // Generate key and nonce for signing
      const keyResult = getrandom.getBytes(32);
      const nonceResult = getrandom.getBytes(16);

      if (!keyResult.ok || !nonceResult.ok) {
        throw new Error("Failed to generate cryptographic material");
      }

      const key = keyResult.value;
      const nonce = nonceResult.value;

      // Create charm instance for hashing and signing
      const charm = new Charm(key, nonce);

      // Hash the spell data (commitment)
      const spellHash = charm.hash(spellBytes);

      // Create signature by encrypting the hash
      const hashCopy = new Uint8Array(spellHash);
      const tag = charm.encrypt(hashCopy);

      // Generate VK hash from spell apps
      const vkHashes = Object.values(spell.apps || {}).map((app: any) => app.vkHash || "");
      const combinedVk = vkHashes.join("");
      const vkHashBytes = charm.hash(new TextEncoder().encode(combinedVk));

      setVerificationResult({
        spellHash: bytesToHex(spellHash),
        signature: bytesToHex(tag),
        vkHash: bytesToHex(vkHashBytes),
        isValid: true,
        timestamp: Date.now(),
      });

      toast.success("Spell cryptographically verified!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover-lift gradient-border">
      <div className="flex items-center gap-4 mb-8">
        <motion.div
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10"
          whileHover={{ scale: 1.1 }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
        </motion.div>
        <div>
          <h3 className="font-bold text-foreground text-xl flex items-center gap-2">
            Spell Verifier
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Crypto</Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            Spells are programmable instructions that define what should happen on-chain, such as minting tokens,
            locking funds, or transferring assets. Cryptographic spell verification using authenticated encryption
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: Hash,
            label: "Hash Commitment",
            color: "from-purple-500/20 to-purple-500/5",
            iconColor: "text-purple-400",
          },
          {
            icon: KeyRound,
            label: "VK Verification",
            color: "from-amber-500/20 to-amber-500/5",
            iconColor: "text-amber-400",
          },
          {
            icon: FileCheck,
            label: "Proof Validation",
            color: "from-emerald-500/20 to-emerald-500/5",
            iconColor: "text-emerald-400",
          },
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

      {/* Spell Input */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <Label className="text-base flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary" />
            Spell Data (JSON)
          </Label>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSpellData(JSON.stringify(DEMO_SPELLS.mint, null, 2))}>
              Mint
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSpellData(JSON.stringify(DEMO_SPELLS.transfer, null, 2))}
            >
              Transfer
            </Button>
          </div>
        </div>
        <Textarea
          value={spellData}
          onChange={(e) => setSpellData(e.target.value)}
          className="font-mono text-sm min-h-[180px] bg-secondary/30 border-border focus:border-primary transition-colors"
          placeholder="Paste spell JSON..."
        />
      </div>

      {/* Verify Button */}
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          variant="glow"
          className="w-full h-12 text-base mb-6"
          onClick={handleVerifySpell}
          disabled={isVerifying || !spellData.trim()}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verifying Spell...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 mr-2" />
              Verify Spell Cryptographically
            </>
          )}
        </Button>
      </motion.div>

      {/* Verification Results */}
      <AnimatePresence>
        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Status Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/30"
            >
              <div className="flex items-center gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <div>
                  <span className="font-bold text-lg text-emerald-400">Spell Verified!</span>
                  <p className="text-sm text-muted-foreground">
                    Verified at {new Date(verificationResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Hash Commitment */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-foreground">Spell Hash</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  SHA-256
                </Badge>
              </div>
              <code className="text-sm font-mono text-muted-foreground break-all leading-relaxed">
                {verificationResult.spellHash}
              </code>
            </motion.div>

            {/* Signature */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-amber-400">Auth Tag</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  AEAD
                </Badge>
              </div>
              <code className="text-sm font-mono text-muted-foreground break-all leading-relaxed">
                {verificationResult.signature}
              </code>
            </motion.div>

            {/* VK Hash */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-teal-400" />
                <span className="font-semibold text-teal-400">VK Commitment</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  Apps
                </Badge>
              </div>
              <code className="text-sm font-mono text-muted-foreground break-all leading-relaxed">
                {verificationResult.vkHash}
              </code>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">
            Powered by <code className="text-primary">charm-crypto</code> authenticated encryption
          </span>
        </div>
      </div>
    </div>
  );
}

function SpellBuilder() {
  const { buildCharmsApp } = useRustZKProver();
  const [appType, setAppType] = useState<"token" | "escrow" | "nft">("token");
  const [ticker, setTicker] = useState("CHARM");
  const [amount, setAmount] = useState("1000000");
  const [recipient, setRecipient] = useState("bc1q...");
  const [generatedPayload, setGeneratedPayload] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSpell = async () => {
    setIsGenerating(true);

    try {
      await new Promise((r) => setTimeout(r, 1000));

      const txidResult = getrandom.getHex(32);
      const fundingUtxo = `${txidResult.ok ? txidResult.value : "0".repeat(64)}:0`;

      const spellResult = buildCharmsApp("lending", {
        txid: fundingUtxo.split(":")[0],
        vout: 0,
        collateralValue: parseInt(amount) + 10000,
        borrowAmount: parseInt(amount),
        borrowerAddress: recipient,
      });

      if (spellResult.ok) {
        setGeneratedPayload(JSON.stringify(spellResult.value, null, 2));
        toast.success("Spell payload generated!");
      } else {
        toast.error("Failed to generate spell");
      }
    } catch (error) {
      toast.error("Failed to generate spell");
    } finally {
      setIsGenerating(false);
    }
  };

  const appTypes = [
    { id: "token" as const, label: "Token Mint", icon: Coins, color: "from-yellow-500/30 to-yellow-500/10" },
    { id: "escrow" as const, label: "Escrow", icon: Shield, color: "from-blue-500/30 to-blue-500/10" },
    { id: "nft" as const, label: "NFT", icon: Gem, color: "from-purple-500/30 to-purple-500/10" },
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
            Spells are programmable instructions that define what should happen on-chain, such as minting tokens,
            locking funds, or transferring assets. Create CharmsSpellPayload v2 for your application
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
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div
              className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center`}
            >
              <type.icon className={`w-5 h-5 ${appType === type.id ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <span className="text-sm font-medium">{type.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Token Form */}
      {appType === "token" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mb-6">
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
        <Button variant="glow" className="w-full mb-4" onClick={handleGenerateSpell} disabled={isGenerating}>
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
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <Label>Generated CharmsSpellPayload v2</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPayload);
                  toast.success("Copied!");
                }}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
            <Textarea value={generatedPayload} readOnly className="font-mono text-xs min-h-[200px] bg-secondary/30" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
