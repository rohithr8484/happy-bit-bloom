/**
 * Bounty Details Panel
 * Shows full bounty information with oracle verification demo
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BountyTask, OracleVerification } from "@/hooks/useBounty";
import { formatBTC, shortenAddress } from "@/lib/charms-sdk";
import { useState } from "react";
import {
  X,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Shield,
  Zap,
  Send,
  Loader2,
  Copy,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface BountyDetailsPanelProps {
  bounty: BountyTask;
  onClose: () => void;
  onClaimBounty: (hunterAddress: string) => Promise<void>;
  onSubmitWork: (proof: string) => Promise<void>;
  onVerifyWithOracle: () => Promise<OracleVerification>;
  onApproveBounty: (signature: string) => Promise<void>;
  onReleaseBounty: () => Promise<void>;
  onDisputeBounty: (reason: string) => Promise<void>;
  loading: boolean;
  oracleLoading: boolean;
}

const statusConfig: Record<BountyTask['status'], { color: string; label: string }> = {
  open: { color: 'bg-success/20 text-success border-success/30', label: 'Open for Claims' },
  claimed: { color: 'bg-warning/20 text-warning border-warning/30', label: 'In Progress' },
  submitted: { color: 'bg-primary/20 text-primary border-primary/30', label: 'Work Submitted' },
  approved: { color: 'bg-success/20 text-success border-success/30', label: 'Approved' },
  completed: { color: 'bg-success/20 text-success border-success/30', label: 'Completed' },
  disputed: { color: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Disputed' },
  refunded: { color: 'bg-muted text-muted-foreground border-muted', label: 'Refunded' },
  expired: { color: 'bg-muted text-muted-foreground border-muted', label: 'Expired' },
};

export function BountyDetailsPanel({
  bounty,
  onClose,
  onClaimBounty,
  onSubmitWork,
  onVerifyWithOracle,
  onApproveBounty,
  onReleaseBounty,
  onDisputeBounty,
  loading,
  oracleLoading,
}: BountyDetailsPanelProps) {
  const [hunterAddress, setHunterAddress] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [disputeReason, setDisputeReason] = useState('');

  const status = statusConfig[bounty.status];
  const isExpired = bounty.deadline < new Date();

  const copyTxid = () => {
    navigator.clipboard.writeText(bounty.txid);
    toast.success('Transaction ID copied!');
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="p-6 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className={status.color}>
            {status.label}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <h2 className="text-xl font-bold text-foreground">{bounty.title}</h2>
        <p className="text-muted-foreground mt-2">{bounty.description}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Bounty Amount */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Bounty Amount</p>
          <p className="text-3xl font-bold text-gradient">{formatBTC(bounty.amount)}</p>
        </div>

        {/* Key Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
              {format(bounty.deadline, 'MMM dd, yyyy HH:mm')}
            </p>
            <p className="text-xs text-muted-foreground">
              {isExpired ? 'Expired' : formatDistanceToNow(bounty.deadline, { addSuffix: true })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium text-foreground">
              {format(bounty.createdAt, 'MMM dd, yyyy')}
            </p>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Participants</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Creator</span>
              </div>
              <span className="text-sm font-mono text-foreground">{shortenAddress(bounty.creator)}</span>
            </div>
            {bounty.maintainer && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Maintainer</span>
                </div>
                <span className="text-sm font-mono text-foreground">{shortenAddress(bounty.maintainer)}</span>
              </div>
            )}
            {bounty.hunter && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-success" />
                  <span className="text-sm text-success">Hunter</span>
                </div>
                <span className="text-sm font-mono text-foreground">{shortenAddress(bounty.hunter)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Oracle Verification */}
        {bounty.oracleVerification && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Oracle Verification</h4>
            <div className={`p-4 rounded-xl border ${
              bounty.oracleVerification.verified 
                ? 'bg-success/10 border-success/20' 
                : 'bg-warning/10 border-warning/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {bounty.oracleVerification.verified ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                )}
                <span className={`font-medium ${bounty.oracleVerification.verified ? 'text-success' : 'text-warning'}`}>
                  {bounty.oracleVerification.verified ? 'Verified' : 'Verification Pending'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Confidence</span>
                  <p className="font-medium text-foreground">{bounty.oracleVerification.confidence}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Oracle ID</span>
                  <p className="font-mono text-foreground">{bounty.oracleVerification.oracleId.slice(0, 12)}...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction */}
        <div className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Transaction ID</p>
            <p className="text-sm font-mono text-foreground">{bounty.txid.slice(0, 16)}...{bounty.txid.slice(-8)}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyTxid}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open(`https://mempool.space/tx/${bounty.txid}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Actions based on status */}
        <div className="space-y-4 pt-4 border-t border-border">
          {/* Claim Bounty */}
          {bounty.status === 'open' && !isExpired && (
            <div className="space-y-3">
              <Label>Claim this bounty</Label>
              <Input
                value={hunterAddress}
                onChange={(e) => setHunterAddress(e.target.value)}
                placeholder="Your Bitcoin address (bc1q...)"
                className="font-mono"
              />
              <Button
                variant="glow"
                className="w-full"
                disabled={!hunterAddress || loading}
                onClick={() => onClaimBounty(hunterAddress)}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Claim Bounty
              </Button>
            </div>
          )}

          {/* Submit Work */}
          {bounty.status === 'claimed' && (
            <div className="space-y-3">
              <Label>Submit completed work</Label>
              <Input
                value={proofLink}
                onChange={(e) => setProofLink(e.target.value)}
                placeholder="Link to PR, document, or deliverable"
              />
              <Button
                variant="glow"
                className="w-full"
                disabled={!proofLink || loading}
                onClick={() => onSubmitWork(proofLink)}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Work
              </Button>
            </div>
          )}

          {/* Oracle Verification */}
          {bounty.status === 'submitted' && !bounty.oracleVerification && (
            <Button
              variant="glow"
              className="w-full"
              disabled={oracleLoading}
              onClick={onVerifyWithOracle}
            >
              {oracleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oracle Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Request Oracle Verification
                </>
              )}
            </Button>
          )}

          {/* Maintainer Approval */}
          {bounty.status === 'submitted' && bounty.oracleVerification?.verified && bounty.maintainer && (
            <Button
              variant="glow"
              className="w-full"
              disabled={loading}
              onClick={() => onApproveBounty('mock_maintainer_sig')}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Maintainer Approve
            </Button>
          )}

          {/* Release Funds */}
          {bounty.status === 'approved' && (
            <Button
              variant="glow"
              className="w-full"
              disabled={loading}
              onClick={onReleaseBounty}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Release Funds to Hunter
            </Button>
          )}

          {/* Dispute */}
          {['submitted', 'approved'].includes(bounty.status) && (
            <div className="space-y-3">
              <Label className="text-destructive">File Dispute</Label>
              <Input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Reason for dispute..."
              />
              <Button
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                disabled={!disputeReason || loading}
                onClick={() => onDisputeBounty(disputeReason)}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                File Dispute
              </Button>
            </div>
          )}
        </div>

        {/* Charms Spell Info */}
        {bounty.spellId && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h4 className="text-sm font-medium text-foreground mb-2">Charms Spell Conditions</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                Oracle confirms task completion
              </li>
              {bounty.maintainer && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-success" />
                  Maintainer signs approval
                </li>
              )}
              <li className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-warning" />
                Auto-refund after deadline if unclaimed
              </li>
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
