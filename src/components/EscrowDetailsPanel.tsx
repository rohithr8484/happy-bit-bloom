import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  EscrowContract, 
  Milestone, 
  formatBTC, 
  formatSats,
  shortenTxid, 
  shortenAddress 
} from "@/lib/charms-sdk";
import { MilestoneTracker } from "./MilestoneTracker";
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  Shield,
  Wallet,
  FileCode
} from "lucide-react";
import { toast } from "sonner";

interface EscrowDetailsPanelProps {
  escrow: EscrowContract;
  onClose: () => void;
  onCompleteMilestone: (milestoneId: string, proof: string) => Promise<void>;
  onReleaseMilestone: (milestoneId: string) => Promise<unknown>;
  onDisputeMilestone: (milestoneId: string, reason: string) => Promise<void>;
  loading?: boolean;
}

export function EscrowDetailsPanel({
  escrow,
  onClose,
  onCompleteMilestone,
  onReleaseMilestone,
  onDisputeMilestone,
  loading,
}: EscrowDetailsPanelProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [proof, setProof] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleComplete = async () => {
    if (!selectedMilestone || !proof) return;
    setActionLoading("complete");
    try {
      await onCompleteMilestone(selectedMilestone.id, proof);
      toast.success("Milestone marked as complete!");
      setProof("");
      setSelectedMilestone(null);
    } catch {
      toast.error("Failed to complete milestone");
    }
    setActionLoading(null);
  };

  const handleRelease = async () => {
    if (!selectedMilestone) return;
    setActionLoading("release");
    try {
      await onReleaseMilestone(selectedMilestone.id);
      toast.success("Funds released successfully!");
      setSelectedMilestone(null);
    } catch {
      toast.error("Failed to release funds");
    }
    setActionLoading(null);
  };

  const handleDispute = async () => {
    if (!selectedMilestone || !disputeReason) return;
    setActionLoading("dispute");
    try {
      await onDisputeMilestone(selectedMilestone.id, disputeReason);
      toast.success("Dispute filed successfully");
      setDisputeReason("");
      setSelectedMilestone(null);
    } catch {
      toast.error("Failed to file dispute");
    }
    setActionLoading(null);
  };

  const releasedAmount = escrow.milestones
    .filter(m => m.status === "released")
    .reduce((sum, m) => sum + m.amount, 0);
  const remainingAmount = escrow.totalAmount - releasedAmount;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-xl bg-background border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">Escrow Details</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{shortenTxid(escrow.txid)}</span>
            <button
              onClick={() => handleCopy(escrow.txid, "Transaction ID")}
              className="p-1 hover:bg-secondary rounded"
            >
              {copied === "Transaction ID" ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <a
              href={`https://mempool.space/testnet/tx/${escrow.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-secondary rounded"
              title="View on Mempool Testnet Explorer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">Total Locked</div>
            <div className="text-xl font-bold font-mono text-foreground">
              {formatBTC(escrow.totalAmount)}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {formatSats(escrow.totalAmount)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">Remaining</div>
            <div className="text-xl font-bold font-mono text-primary">
              {formatBTC(remainingAmount)}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {formatSats(remainingAmount)}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Parties
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <span className="text-sm text-muted-foreground">Payer</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{shortenAddress(escrow.payer)}</span>
                <button
                  onClick={() => handleCopy(escrow.payer, "Payer address")}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <span className="text-sm text-muted-foreground">Payee</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{shortenAddress(escrow.payee)}</span>
                <button
                  onClick={() => handleCopy(escrow.payee, "Payee address")}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            {escrow.arbiter && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Arbiter
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{shortenAddress(escrow.arbiter)}</span>
                  <button
                    onClick={() => handleCopy(escrow.arbiter!, "Arbiter address")}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Milestones
          </h3>
          <MilestoneTracker
            milestones={escrow.milestones}
            onMilestoneClick={setSelectedMilestone}
          />
        </div>

        {/* Spell Data */}
        {escrow.spellData && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Spell Data
            </h3>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
                {JSON.stringify(escrow.spellData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Milestone Action Panel */}
      <AnimatePresence>
        {selectedMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="border-t border-border bg-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-foreground">
                  {selectedMilestone.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {formatSats(selectedMilestone.amount)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMilestone(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Actions based on status */}
            {selectedMilestone.status === "pending" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Mark this milestone as in progress or complete it with proof.
                </p>
                <Input
                  placeholder="Proof URL or description..."
                  value={proof}
                  onChange={e => setProof(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDispute()}
                    disabled={!disputeReason || actionLoading !== null}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Dispute
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleComplete}
                    disabled={!proof || actionLoading !== null}
                  >
                    {actionLoading === "complete" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Complete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {selectedMilestone.status === "in_progress" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Submit proof of completion for this milestone.
                </p>
                <Input
                  placeholder="Proof URL or description..."
                  value={proof}
                  onChange={e => setProof(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={handleComplete}
                  disabled={!proof || actionLoading !== null}
                >
                  {actionLoading === "complete" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit Completion
                    </>
                  )}
                </Button>
              </div>
            )}

            {selectedMilestone.status === "completed" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This milestone is completed. Release funds to the payee.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDisputeReason("Dispute reason");
                      handleDispute();
                    }}
                    disabled={actionLoading !== null}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Dispute
                  </Button>
                  <Button
                    variant="success"
                    className="flex-1"
                    onClick={handleRelease}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === "release" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Release Funds
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {selectedMilestone.status === "released" && (
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Funds Released</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Released on {selectedMilestone.releasedAt?.toLocaleDateString()}
                </p>
              </div>
            )}

            {selectedMilestone.status === "disputed" && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Under Dispute</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  This milestone is currently under dispute. Contact the arbiter for resolution.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
