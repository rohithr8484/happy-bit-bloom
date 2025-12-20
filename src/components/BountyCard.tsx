import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BountyTask } from "@/hooks/useBounty";
import { formatBTC, shortenAddress, shortenTxid } from "@/lib/charms-sdk";
import { 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign,
  GitBranch,
  Shield,
  FileSearch,
  Code,
  Palette,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BountyCardProps {
  bounty: BountyTask;
  onClick?: () => void;
  selected?: boolean;
}

const categoryIcons = {
  github_issue: GitBranch,
  audit: Shield,
  research: FileSearch,
  development: Code,
  design: Palette,
};

const categoryLabels = {
  github_issue: 'GitHub Issue',
  audit: 'Security Audit',
  research: 'Research',
  development: 'Development',
  design: 'Design',
};

const statusConfig: Record<BountyTask['status'], { color: string; label: string; icon: typeof CheckCircle }> = {
  open: { color: 'bg-success/20 text-success border-success/30', label: 'Open', icon: DollarSign },
  claimed: { color: 'bg-warning/20 text-warning border-warning/30', label: 'Claimed', icon: User },
  submitted: { color: 'bg-primary/20 text-primary border-primary/30', label: 'Submitted', icon: GitBranch },
  approved: { color: 'bg-success/20 text-success border-success/30', label: 'Approved', icon: CheckCircle },
  completed: { color: 'bg-success/20 text-success border-success/30', label: 'Completed', icon: CheckCircle },
  disputed: { color: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Disputed', icon: AlertTriangle },
  refunded: { color: 'bg-muted text-muted-foreground border-muted', label: 'Refunded', icon: DollarSign },
  expired: { color: 'bg-muted text-muted-foreground border-muted', label: 'Expired', icon: Clock },
};

export function BountyCard({ bounty, onClick, selected }: BountyCardProps) {
  const CategoryIcon = categoryIcons[bounty.category];
  const status = statusConfig[bounty.status];
  const StatusIcon = status.icon;
  
  const isExpiringSoon = bounty.deadline.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  const isExpired = bounty.deadline < new Date();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-5 rounded-2xl cursor-pointer transition-all duration-300
        bg-card border
        ${selected 
          ? 'border-primary shadow-lg shadow-primary/10' 
          : 'border-border hover:border-primary/30'
        }
      `}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className={`${status.color} gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <CategoryIcon className="w-3 h-3" />
          {categoryLabels[bounty.category]}
        </Badge>
      </div>

      {/* Title and description */}
      <h3 className="font-semibold text-foreground mb-2 line-clamp-1">
        {bounty.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {bounty.description}
      </p>

      {/* Amount */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground">Bounty</p>
          <p className="text-lg font-bold text-gradient">
            {formatBTC(bounty.amount)}
          </p>
        </div>
      </div>

      {/* Deadline */}
      <div className={`flex items-center gap-2 text-sm ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'}`}>
        <Clock className="w-4 h-4" />
        {isExpired ? (
          <span>Expired</span>
        ) : (
          <span>Deadline: {formatDistanceToNow(bounty.deadline, { addSuffix: true })}</span>
        )}
      </div>

      {/* Hunter info */}
      {bounty.hunter && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">
            Hunter: {shortenAddress(bounty.hunter)}
          </span>
        </div>
      )}

      {/* Transaction link */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs font-mono text-muted-foreground">
          {shortenTxid(bounty.txid)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://mempool.space/tx/${bounty.txid}`, '_blank');
          }}
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      {/* Oracle verification indicator */}
      {bounty.oracleVerification && (
        <div className="absolute top-3 right-3">
          <div 
            className={`w-3 h-3 rounded-full ${bounty.oracleVerification.verified ? 'bg-success' : 'bg-warning'} animate-pulse`}
            title={bounty.oracleVerification.verified ? 'Oracle Verified' : 'Verification Pending'}
          />
        </div>
      )}
    </motion.div>
  );
}
