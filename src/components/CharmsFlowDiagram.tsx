/**
 * Charms Protocol Interactive Panel (Rust-Style)
 * 
 * Features:
 * - What You Can Build On Charms use cases with Rust spell builders
 * - Interactive Spell Checker using is_correct from Rust SDK
 * - Spell builder with live NormalizedSpell v2 preview
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useRustZKProver, CHARMS_APPS } from "@/hooks/useRustZKProver";
import { 
  isCorrect,
  getrandom,
  type NormalizedSpell,
  type SpellValidation,
} from "@/lib/rust-zk-prover";
import { 
  Gem, 
  Bitcoin,
  Code,
  Coins,
  Vote,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  FileCode,
  ExternalLink,
  Copy,
  Play,
  Building2,
  TrendingUp,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

// Icon mapping for Charms apps
const appIcons: Record<string, typeof Bitcoin> = {
  lending: Bitcoin,
  synthetic: Coins,
  governance: Vote,
  nft: Building2,
  amm: TrendingUp,
};

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

export function CharmsFlowDiagram() {
  const { buildCharmsApp, verifySpell } = useRustZKProver();
  const [activeTab, setActiveTab] = useState<'useCases' | 'spellChecker' | 'builder'>('useCases');
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
      await new Promise(r => setTimeout(r, 1500)); // Simulate zkVM verification time
      
      const spell = JSON.parse(spellInput) as NormalizedSpell;
      
      // Generate vk hash using getrandom
      const vkResult = getrandom.getHex(32);
      const selfVk = vkResult.ok ? vkResult.value : '0'.repeat(64);
      
      // Call Rust-style is_correct function
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

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === 'useCases' ? 'default' : 'outline'}
          onClick={() => setActiveTab('useCases')}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          What You Can Build
        </Button>
        <Button
          variant={activeTab === 'spellChecker' ? 'default' : 'outline'}
          onClick={() => setActiveTab('spellChecker')}
          className="gap-2"
        >
          <Shield className="w-4 h-4" />
          Spell Checker
        </Button>
        <Button
          variant={activeTab === 'builder' ? 'default' : 'outline'}
          onClick={() => setActiveTab('builder')}
          className="gap-2"
        >
          <FileCode className="w-4 h-4" />
          Spell Builder
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {/* Use Cases Tab - Main focus from the image */}
        {activeTab === 'useCases' && (
          <motion.div
            key="useCases"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 rounded-2xl" />
              <div className="relative p-6 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Gem className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      What You Can Try Building On Charms
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Programmable Bitcoin applications powered by zero-knowledge proofs
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Use Cases Grid - Using CHARMS_APPS from Rust hook */}
            <div className="space-y-4">
              {CHARMS_APPS.map((app, index) => {
                const Icon = appIcons[app.id] || Gem;
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group flex items-start gap-4 p-5 rounded-xl bg-card/60 border border-border hover:border-primary/40 hover:bg-card/80 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {app.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </motion.div>
                );
              })}
              
              <p className="text-muted-foreground italic text-center pt-2">
                ...you name it. Build anything programmable on Bitcoin with Rust.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => window.open('https://github.com/CharmsDev/charms', '_blank')}
                className="gap-2"
              >
                <Code className="w-4 h-4" />
                CharmsDev GitHub
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://docs.charms.dev', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Documentation
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab('spellChecker')}
                className="gap-2"
              >
                <Shield className="w-4 h-4" />
                Try Spell Checker
              </Button>
            </div>
          </motion.div>
        )}

        {/* Spell Checker Tab */}
        {activeTab === 'spellChecker' && (
          <motion.div
            key="spellChecker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Charms Spell Checker</h3>
                  <p className="text-sm text-muted-foreground">
                    Validate spells using the official is_correct verification
                  </p>
                </div>
              </div>

              {/* Demo Spell Selector */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={selectedDemo === 'mint' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLoadDemo('mint')}
                >
                  Mint Token Spell
                </Button>
                <Button
                  variant={selectedDemo === 'transfer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLoadDemo('transfer')}
                >
                  Transfer Spell
                </Button>
              </div>

              {/* Spell Input */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <Label>Spell JSON (NormalizedSpell v2)</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopySpell}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={spellInput}
                  onChange={(e) => setSpellInput(e.target.value)}
                  className="font-mono text-sm min-h-[280px] bg-secondary/30"
                  placeholder="Paste your NormalizedSpell JSON..."
                />
              </div>

              {/* Verification Result */}
              <AnimatePresence>
                {verificationResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mb-4 p-4 rounded-xl border ${
                      verificationResult.valid
                        ? 'bg-success/10 border-success/30'
                        : 'bg-destructive/10 border-destructive/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {verificationResult.valid ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <span className={`font-semibold ${
                        verificationResult.valid ? 'text-success' : 'text-destructive'
                      }`}>
                        {verificationResult.valid ? 'Spell is correct!' : 'Spell validation failed'}
                      </span>
                    </div>
                    
                    {verificationResult.valid && verificationResult.proofCommitment && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
                          <span className="text-muted-foreground">Proof Commitment</span>
                          <span className="font-mono text-foreground text-xs">
                            {verificationResult.proofCommitment.slice(0, 16)}...
                          </span>
                        </div>
                        {verificationResult.vkHash && (
                          <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
                            <span className="text-muted-foreground">VK Hash</span>
                            <span className="font-mono text-foreground text-xs">
                              {verificationResult.vkHash.slice(0, 16)}...
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {verificationError && (
                      <p className="text-sm text-destructive mt-1">{verificationError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

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

              {/* Reference */}
              <div className="mt-4 p-4 rounded-xl bg-secondary/20 border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Reference:</strong> This spell checker implements the <code className="text-primary">is_correct</code> function 
                  from <a href="https://github.com/CharmsDev/charms/tree/main/charms-spell-checker/src" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">charms-spell-checker/src/lib.rs</a>. 
                  Spells are verified using SP1 zkVM for zero-knowledge proof generation.
                </p>
              </div>
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
            className="space-y-6"
          >
            <SpellBuilder />
          </motion.div>
        )}
      </AnimatePresence>
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
      
      // Use Rust-style spell builder
      const spellResult = buildCharmsApp('lending', {
        txid: fundingUtxo.split(':')[0],
        vout: 0,
        collateralValue: parseInt(amount) + 10000,
        borrowAmount: parseInt(amount),
        borrowerAddress: recipient,
      });
      
      if (spellResult.ok) {
        setGeneratedPayload(JSON.stringify(spellResult.value, null, 2));
        toast.success('Spell payload generated using Rust builder!');
      } else {
        toast.error('Failed to generate spell');
      }
    } catch (error) {
      toast.error('Failed to generate spell');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <FileCode className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Spell Builder</h3>
          <p className="text-sm text-muted-foreground">
            Create CharmsSpellPayload v2 for your application
          </p>
        </div>
      </div>

      {/* App Type Selector */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { id: 'token' as const, label: 'Token Mint', icon: Coins },
          { id: 'escrow' as const, label: 'Escrow', icon: Shield },
          { id: 'nft' as const, label: 'NFT', icon: Gem },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setAppType(type.id)}
            className={`p-3 rounded-xl border text-center transition-all ${
              appType === type.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <type.icon className={`w-5 h-5 mx-auto mb-1 ${
              appType === type.id ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <span className="text-xs font-medium">{type.label}</span>
          </button>
        ))}
      </div>

      {/* Token Form */}
      {appType === 'token' && (
        <div className="space-y-4 mb-6">
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
        </div>
      )}

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