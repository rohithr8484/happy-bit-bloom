/**
 * Rust-Style ZK Verification Panel
 * 
 * Hackathon-winner UI for generating and verifying zero-knowledge proofs
 * Powered by SP1 zkVM & Charms (Rust)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRustZKProver, type RustProofResult } from "@/hooks/useRustZKProver";
import { type ProofType, PROOF_CONFIGS } from "@/lib/rust-zk-prover";
import {
  Shield,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  BarChart3,
  Cpu,
  Lock,
  Coins,
  FileCheck,
  RefreshCw,
  Code,
  Terminal,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// Proof type icons with Rust-style naming
const proofTypeIcons: Record<ProofType, typeof Shield> = {
  utxo_ownership: Lock,
  balance_threshold: Coins,
  transaction_inclusion: FileCheck,
  state_transition: RefreshCw,
  collateral_ratio: BarChart3,
};

const statusConfig = {
  pending: { color: 'bg-muted/50 text-muted-foreground border-muted', label: 'Pending', icon: Clock },
  generating: { color: 'bg-primary/20 text-primary border-primary/40', label: 'Generating (SP1 zkVM)', icon: Loader2 },
  verifying: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', label: 'Verifying', icon: Shield },
  verified: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', label: 'Verified ✓', icon: CheckCircle },
  failed: { color: 'bg-destructive/20 text-destructive border-destructive/40', label: 'Failed', icon: AlertCircle },
};

export function ZKVerificationPanel() {
  const {
    proofs,
    stats,
    loading,
    activeProof,
    generateProof,
    getProofConfig,
  } = useRustZKProver();

  const [selectedType, setSelectedType] = useState<ProofType>('utxo_ownership');
  const [inputValue, setInputValue] = useState('');

  const config = getProofConfig(selectedType);

  const handleGenerateProof = async () => {
    try {
      const result = await generateProof({
        type: selectedType,
        inputs: { value: inputValue },
      });
      if (result.ok) {
        toast.success('Proof verified on-chain! is_correct() = true');
      }
      setInputValue('');
    } catch {
      toast.error('Proof generation failed');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="space-y-8">
      {/* Stats Row - Minimal glass cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Shield, label: 'Proofs Verified', value: stats.verifiedProofs, color: 'text-emerald-400' },
          { icon: Zap, label: 'Avg Time', value: `${(stats.averageTimeMs / 1000).toFixed(1)}s`, color: 'text-amber-400' },
          { icon: Cpu, label: 'Total Cycles', value: `${(stats.totalCycles / 1_000_000).toFixed(1)}M`, color: 'text-blue-400' },
          { icon: Layers, label: 'Total Proofs', value: stats.totalProofs, color: 'text-purple-400' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Generate Proof Card - Hackathon Winner Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-card/80 to-card border border-border/50"
      >
        {/* Header with gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-amber-500 to-primary" />
        
        <div className="p-6 md:p-8">
          {/* Title Row */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Generate ZK Proof</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                Powered by SP1 zkVM & Charms (Rust)
              </p>
            </div>
          </div>

          {/* Proof Type Selection - 2x3 Grid matching reference */}
          <div className="space-y-4 mb-8">
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Proof Type
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(proofTypeIcons) as ProofType[]).map((type) => {
                const Icon = proofTypeIcons[type];
                const typeConfig = getProofConfig(type);
                const isSelected = selectedType === type;

                return (
                  <motion.button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`relative p-5 rounded-xl text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-br from-primary/15 to-amber-500/10 border-2 border-primary/50 shadow-lg shadow-primary/10'
                        : 'bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card/80'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Title & Description */}
                    <h3 className={`font-semibold mb-1 ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                      {typeConfig.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {typeConfig.description}
                    </p>

                    {/* Time & Cost */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`px-2 py-1 rounded-md ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                        ~{Math.round(typeConfig.estimatedTimeMs / 1000)}s
                      </span>
                      <span className={`px-2 py-1 rounded-md ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-muted/50 text-muted-foreground'}`}>
                        {(typeConfig.costSats / 100_000_000).toFixed(5)} BTC
                      </span>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="proof-selection"
                        className="absolute inset-0 rounded-xl border-2 border-primary/50 pointer-events-none"
                        transition={{ type: "spring", bounce: 0.2 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Input Field */}
          <div className="space-y-3 mb-6">
            <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Input Data
            </Label>
            <div className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  selectedType === 'utxo_ownership' ? 'Enter UTXO txid:vout (e.g., abc123...def:0)' :
                  selectedType === 'balance_threshold' ? 'Enter threshold amount in satoshis' :
                  selectedType === 'transaction_inclusion' ? 'Enter transaction ID' :
                  selectedType === 'state_transition' ? 'Enter spell hash or state commitment' :
                  'Enter minimum ratio (e.g., 150 for 150%)'
                }
                className="font-mono text-sm h-12 bg-secondary/30 border-border/50 focus:border-primary/50 pr-20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Badge variant="outline" className="text-xs bg-card/50 border-border/50">
                  <Code className="w-3 h-3 mr-1" />
                  Rust
                </Badge>
              </div>
            </div>
          </div>

          {/* Active Proof Progress */}
          <AnimatePresence>
            {activeProof && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                      <span className="font-medium text-foreground">Proof in Progress</span>
                    </div>
                    <Badge className={`${statusConfig[activeProof.status].color} border`}>
                      {statusConfig[activeProof.status].label}
                    </Badge>
                  </div>

                  {/* Progress Steps */}
                  <div className="space-y-2">
                    {[
                      { label: 'Request submitted to SP1', done: activeProof.status !== 'pending' },
                      { label: 'Generating proof (zkVM execution)', done: ['verifying', 'verified'].includes(activeProof.status), active: activeProof.status === 'generating' },
                      { label: 'On-chain verification', done: activeProof.status === 'verified', active: activeProof.status === 'verifying' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                          step.done ? 'bg-emerald-400' : 
                          step.active ? 'bg-primary animate-pulse' : 
                          'bg-muted'
                        }`} />
                        <span className={`text-sm ${step.done ? 'text-emerald-400' : step.active ? 'text-primary' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-primary-foreground shadow-lg shadow-primary/20"
            disabled={loading || !inputValue}
            onClick={handleGenerateProof}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Proof...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Generate {config.name} Proof
              </>
            )}
          </Button>

          {/* Rust/Charms Reference */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Terminal className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400 mb-1">Rust Implementation</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Proofs are generated using SP1 zkVM with Charms spell validation. 
                  The <code className="text-primary bg-primary/10 px-1 rounded">is_correct()</code> function 
                  verifies spell integrity following the charms-spell-checker/lib.rs pattern.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => window.open('https://github.com/CharmsDev/charms', '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Charms SDK
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => window.open('https://docs.succinct.xyz', '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    SP1 Docs
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Proof History */}
      {proofs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Proof History</h3>
            <Badge variant="outline" className="text-xs">
              {proofs.length} proof{proofs.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-3">
            {proofs.slice(0, 5).map((proof) => (
              <ProofCard key={proof.id} proof={proof} onCopy={copyToClipboard} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProofCard({ proof, onCopy }: { proof: RustProofResult; onCopy: (text: string, label: string) => void }) {
  const Icon = proofTypeIcons[proof.type];
  const status = statusConfig[proof.status];
  const StatusIcon = status.icon;
  const config = PROOF_CONFIGS[proof.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{config.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(proof.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge className={`${status.color} border`}>
          <StatusIcon className={`w-3 h-3 mr-1 ${proof.status === 'generating' ? 'animate-spin' : ''}`} />
          {status.label}
        </Badge>
      </div>

      {proof.status === 'verified' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50">
            <span className="text-muted-foreground">Input Hash</span>
            <button
              onClick={() => onCopy(proof.inputHash, 'Input hash')}
              className="flex items-center gap-1 font-mono text-foreground hover:text-primary transition-colors"
            >
              {proof.inputHash.slice(0, 10)}...{proof.inputHash.slice(-6)}
              <Copy className="w-3 h-3 opacity-50" />
            </button>
          </div>
          {proof.outputHash && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50">
              <span className="text-muted-foreground">Output Hash</span>
              <button
                onClick={() => onCopy(proof.outputHash!, 'Output hash')}
                className="flex items-center gap-1 font-mono text-foreground hover:text-primary transition-colors"
              >
                {proof.outputHash.slice(0, 10)}...{proof.outputHash.slice(-6)}
                <Copy className="w-3 h-3 opacity-50" />
              </button>
            </div>
          )}
          {proof.validation && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" />
                is_correct()
              </span>
              <span className="font-mono text-emerald-400 flex items-center gap-1">
                <Code className="w-3 h-3" />
                {proof.validation.proofCommitment.slice(0, 8)}...
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {proof.cyclesUsed && (
              <div className="flex items-center justify-between text-muted-foreground p-2 rounded-lg bg-muted/30">
                <span>Cycles</span>
                <span className="font-mono text-foreground">{(proof.cyclesUsed / 1_000_000).toFixed(2)}M</span>
              </div>
            )}
            {proof.executionTimeMs && (
              <div className="flex items-center justify-between text-muted-foreground p-2 rounded-lg bg-muted/30">
                <span>Time</span>
                <span className="font-mono text-foreground">{(proof.executionTimeMs / 1000).toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
