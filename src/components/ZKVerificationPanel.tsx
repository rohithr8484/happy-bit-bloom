/**
 * Boundless ZK Verification Panel
 * 
 * UI for generating and verifying zero-knowledge proofs
 * Powered by Boundless and Kailua
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useZKVerification, ProofType, ZKProof } from "@/hooks/useZKVerification";
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
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const proofTypeIcons: Record<ProofType, typeof Shield> = {
  utxo_ownership: Lock,
  balance_threshold: Coins,
  transaction_inclusion: FileCheck,
  state_transition: RefreshCw,
  collateral_ratio: BarChart3,
};

const statusConfig = {
  pending: { color: 'bg-muted text-muted-foreground', label: 'Pending', icon: Clock },
  generating: { color: 'bg-primary/20 text-primary', label: 'Generating', icon: Loader2 },
  verifying: { color: 'bg-warning/20 text-warning', label: 'Verifying', icon: Shield },
  verified: { color: 'bg-success/20 text-success', label: 'Verified', icon: CheckCircle },
  failed: { color: 'bg-destructive/20 text-destructive', label: 'Failed', icon: AlertCircle },
};

export function ZKVerificationPanel() {
  const {
    proofs,
    stats,
    loading,
    activeProof,
    generateProof,
    getProofConfig,
  } = useZKVerification();

  const [selectedType, setSelectedType] = useState<ProofType>('utxo_ownership');
  const [inputValue, setInputValue] = useState('');

  const config = getProofConfig(selectedType);

  const handleGenerateProof = async () => {
    try {
      await generateProof({
        type: selectedType,
        inputs: { value: inputValue },
      });
      toast.success('Proof verified on-chain!');
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
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Proofs Verified</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.proofsVerified}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Avg Time</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.averageProofTime.toFixed(1)}s</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Gas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{(stats.totalGasUsed / 1000).toFixed(0)}k</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Generated</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.proofsGenerated}</p>
        </div>
      </div>

      {/* Generate Proof Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-card border border-border"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Generate ZK Proof</h3>
            <p className="text-sm text-muted-foreground">Powered by Boundless & RISC Zero</p>
          </div>
        </div>

        {/* Proof Type Selection */}
        <div className="space-y-3 mb-6">
          <Label>Proof Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(proofTypeIcons) as ProofType[]).map((type) => {
              const Icon = proofTypeIcons[type];
              const typeConfig = getProofConfig(type);
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-sm text-foreground">{typeConfig.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{typeConfig.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">~{typeConfig.estimatedTime}s</span>
                    <span className="text-xs text-muted-foreground">{typeConfig.estimatedCost} ETH</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Field */}
        <div className="space-y-2 mb-6">
          <Label>Input Data</Label>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              selectedType === 'utxo_ownership' ? 'Enter UTXO txid:vout' :
              selectedType === 'balance_threshold' ? 'Enter threshold amount in satoshis' :
              selectedType === 'transaction_inclusion' ? 'Enter transaction ID' :
              'Enter input data'
            }
            className="font-mono"
          />
        </div>

        {/* Active Proof Progress */}
        <AnimatePresence>
          {activeProof && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Proof in Progress</span>
                <Badge variant="outline" className={statusConfig[activeProof.status].color}>
                  {activeProof.status === 'generating' && (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  )}
                  {statusConfig[activeProof.status].label}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    activeProof.status !== 'pending' ? 'bg-success' : 'bg-muted'
                  }`} />
                  <span className="text-xs text-muted-foreground">Request submitted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    activeProof.status === 'generating' ? 'bg-primary animate-pulse' :
                    ['verifying', 'verified'].includes(activeProof.status) ? 'bg-success' : 'bg-muted'
                  }`} />
                  <span className="text-xs text-muted-foreground">Generating proof (RISC Zero zkVM)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    activeProof.status === 'verifying' ? 'bg-warning animate-pulse' :
                    activeProof.status === 'verified' ? 'bg-success' : 'bg-muted'
                  }`} />
                  <span className="text-xs text-muted-foreground">On-chain verification</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="glow"
          className="w-full"
          disabled={loading || !inputValue}
          onClick={handleGenerateProof}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Proof...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate {config.name} Proof
            </>
          )}
        </Button>

        {/* Boundless Info */}
        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Boundless Protocol</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Proofs are generated using RISC Zero zkVM and verified on-chain through the Boundless 
            market. Kailua provides ZK proving for rollup state transitions.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://docs.boundless.network', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Docs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://github.com/boundless-xyz/boundless', '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              GitHub
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Proof History */}
      {proofs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Proof History</h3>
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

function ProofCard({ proof, onCopy }: { proof: ZKProof; onCopy: (text: string, label: string) => void }) {
  const Icon = proofTypeIcons[proof.type];
  const status = statusConfig[proof.status];
  const StatusIcon = status.icon;
  const config = {
    utxo_ownership: { name: 'UTXO Ownership' },
    balance_threshold: { name: 'Balance Threshold' },
    transaction_inclusion: { name: 'TX Inclusion' },
    state_transition: { name: 'State Transition' },
    collateral_ratio: { name: 'Collateral Ratio' },
  }[proof.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-card border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{config.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(proof.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={status.color}>
          <StatusIcon className={`w-3 h-3 mr-1 ${proof.status === 'generating' ? 'animate-spin' : ''}`} />
          {status.label}
        </Badge>
      </div>

      {proof.status === 'verified' && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
            <span className="text-muted-foreground">Input Hash</span>
            <button
              onClick={() => onCopy(proof.inputHash, 'Input hash')}
              className="flex items-center gap-1 font-mono text-foreground hover:text-primary"
            >
              {proof.inputHash.slice(0, 10)}...{proof.inputHash.slice(-6)}
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-secondary/30">
            <span className="text-muted-foreground">Output Hash</span>
            <button
              onClick={() => onCopy(proof.outputHash, 'Output hash')}
              className="flex items-center gap-1 font-mono text-foreground hover:text-primary"
            >
              {proof.outputHash.slice(0, 10)}...{proof.outputHash.slice(-6)}
              <Copy className="w-3 h-3" />
            </button>
          </div>
          {proof.gasUsed && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Gas Used</span>
              <span className="font-mono">{proof.gasUsed.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
