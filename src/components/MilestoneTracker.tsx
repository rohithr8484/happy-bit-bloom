import { cn } from "@/lib/utils";
import { Milestone } from "@/lib/charms-sdk";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Coins,
  ChevronRight 
} from "lucide-react";
import { formatSats } from "@/lib/charms-sdk";
import { motion } from "framer-motion";

interface MilestoneTrackerProps {
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Circle,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Pending",
  },
  in_progress: {
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/20",
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/20",
    label: "Completed",
  },
  disputed: {
    icon: AlertTriangle,
    color: "text-destructive",
    bgColor: "bg-destructive/20",
    label: "Disputed",
  },
  released: {
    icon: Coins,
    color: "text-primary",
    bgColor: "bg-primary/20",
    label: "Released",
  },
};

export function MilestoneTracker({ 
  milestones, 
  onMilestoneClick,
  className 
}: MilestoneTrackerProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {milestones.map((milestone, index) => {
        const config = statusConfig[milestone.status];
        const Icon = config.icon;
        const isLast = index === milestones.length - 1;
        const isClickable = !!onMilestoneClick;

        return (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Connection line */}
            {!isLast && (
              <div 
                className={cn(
                  "absolute left-5 top-12 w-0.5 h-[calc(100%-1rem)]",
                  milestone.status === 'released' || milestone.status === 'completed'
                    ? "bg-primary/50"
                    : "bg-border"
                )}
              />
            )}

            {/* Milestone card */}
            <div
              onClick={() => onMilestoneClick?.(milestone)}
              className={cn(
                "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200",
                "bg-card/50 border-border",
                isClickable && "cursor-pointer hover:bg-card hover:border-primary/30",
                milestone.status === 'in_progress' && "border-warning/30 bg-warning/5",
                milestone.status === 'disputed' && "border-destructive/30 bg-destructive/5"
              )}
            >
              {/* Status icon */}
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                config.bgColor
              )}>
                <Icon className={cn("w-5 h-5", config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {milestone.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {milestone.description}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-sm font-medium text-foreground">
                      {formatSats(milestone.amount)}
                    </div>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                      config.bgColor,
                      config.color
                    )}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Dates and proof */}
                {(milestone.completedAt || milestone.proof) && (
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    {milestone.completedAt && (
                      <span>
                        Completed: {milestone.completedAt.toLocaleDateString()}
                      </span>
                    )}
                    {milestone.releasedAt && (
                      <span>
                        Released: {milestone.releasedAt.toLocaleDateString()}
                      </span>
                    )}
                    {milestone.proof && (
                      <span className="font-mono truncate max-w-[200px]">
                        Proof: {milestone.proof}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow indicator */}
              {isClickable && (
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
