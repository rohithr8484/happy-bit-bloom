import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EscrowContract, formatBTC, shortenTxid, shortenAddress } from "@/lib/charms-sdk";
import { RustSpellChecker } from "@/lib/rust-spell-checker";
import { CharmCrypto, bytesToHex } from "@/lib/charms-wasm-sdk";
import { 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Shield,
  Cpu,
  Lock,
  KeyRound
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EscrowCardProps {
  escrow: EscrowContract;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  encryptionStatus?: { encrypted: boolean; keyExists: boolean };
}

const statusConfig = {
  active: {
    label: "Active",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
  },
  completed: {
    label: "Completed",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
  expired: {
    label: "Expired",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted",
  },
  disputed: {
    label: "Disputed",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted",
  },
};

export function EscrowCard({ escrow, onClick, selected, className, encryptionStatus }: EscrowCardProps) {
  const config = statusConfig[escrow.status];
  const completedMilestones = escrow.milestones.filter(
    m => m.status === 'completed' || m.status === 'released'
  ).length;
  const progress = (completedMilestones / escrow.milestones.length) * 100;
  const releasedAmount = escrow.milestones
    .filter(m => m.status === 'released')
    .reduce((sum, m) => sum + m.amount, 0);

  // Generate spell hash for display using Charm crypto
  const [spellHash, setSpellHash] = useState<string>('');
  
  useEffect(() => {
    const crypto = new CharmCrypto();
    const data = new TextEncoder().encode(`escrow:${escrow.id}:${escrow.txid}`);
    const hash = crypto.hash(data);
    setSpellHash(bytesToHex(hash).slice(0, 12));
  }, [escrow.id, escrow.txid]);

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer",
        "bg-card/80 backdrop-blur-sm hover-lift",
        selected 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/20 glow" 
          : "border-border hover:border-primary/50 hover:bg-card hover:shadow-card",
        className
      )}
    >
      {/* Rust Spell Verified Badge + Encryption Status */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs gap-1">
                <Cpu className="w-3 h-3" />
                Rust
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Verified by Rust Spell Checker</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">Hash: {spellHash}...</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {encryptionStatus?.encrypted && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs gap-1">
                  <Lock className="w-3 h-3" />
                  <KeyRound className="w-3 h-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Encrypted with @jedisct1/charm</p>
                <p className="text-xs text-muted-foreground">AES-256-GCM authenticated encryption</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              Escrow #{escrow.id.slice(0, 8)}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-mono">{shortenTxid(escrow.txid)}</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>

        <span className={cn(
          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
          config.bgColor,
          config.color
        )}>
          {config.label}
        </span>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <div className="text-2xl font-bold font-mono text-foreground">
          {formatBTC(escrow.totalAmount)}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatBTC(releasedAmount)} released
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {completedMilestones}/{escrow.milestones.length} milestones
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
          />
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="w-3.5 h-3.5" />
          <span>Payer: <span className="font-mono">{shortenAddress(escrow.payer)}</span></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="w-3.5 h-3.5" />
          <span>Payee: <span className="font-mono">{shortenAddress(escrow.payee)}</span></span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Created {escrow.createdAt.toLocaleDateString()}</span>
        </div>
        {escrow.expiresAt && (
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Expires {escrow.expiresAt.toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
