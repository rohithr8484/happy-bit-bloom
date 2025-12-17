import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Trash2, 
  Wallet, 
  Shield, 
  Calendar,
  Sparkles,
  Loader2,
  Check
} from "lucide-react";
import { btcToSatoshis, formatSats } from "@/lib/charms-sdk";
import { CreateEscrowParams } from "@/hooks/useEscrow";

interface CreateEscrowFormProps {
  onSubmit: (params: CreateEscrowParams) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface MilestoneInput {
  id: string;
  title: string;
  description: string;
  amountBTC: string;
}

export function CreateEscrowForm({ onSubmit, onCancel, loading }: CreateEscrowFormProps) {
  const [payerAddress, setPayerAddress] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [arbiterAddress, setArbiterAddress] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { id: "1", title: "", description: "", amountBTC: "" },
  ]);
  const [step, setStep] = useState(1);

  const addMilestone = () => {
    setMilestones(prev => [
      ...prev,
      { id: Date.now().toString(), title: "", description: "", amountBTC: "" },
    ]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      setMilestones(prev => prev.filter(m => m.id !== id));
    }
  };

  const updateMilestone = (id: string, field: keyof MilestoneInput, value: string) => {
    setMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const totalAmount = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amountBTC) || 0),
    0
  );

  const isStep1Valid = payerAddress && payeeAddress;
  const isStep2Valid = milestones.every(
    m => m.title && m.amountBTC && parseFloat(m.amountBTC) > 0
  );

  const handleSubmit = async () => {
    await onSubmit({
      payerAddress,
      payeeAddress,
      arbiterAddress: arbiterAddress || undefined,
      milestones: milestones.map(m => ({
        title: m.title,
        description: m.description,
        amount: btcToSatoshis(parseFloat(m.amountBTC)),
      })),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-card border border-border rounded-2xl p-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Create Escrow</h2>
          <p className="text-sm text-muted-foreground">
            Set up a milestone-based Bitcoin escrow with programmable release conditions
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => s < step && setStep(s)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </button>
            {s < 2 && (
              <div className={cn(
                "w-12 h-0.5 mx-2",
                s < step ? "bg-primary" : "bg-secondary"
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Payer Address */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Payer Address
              </Label>
              <Input
                placeholder="bc1q..."
                value={payerAddress}
                onChange={e => setPayerAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The Bitcoin address that will fund the escrow
              </p>
            </div>

            {/* Payee Address */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Payee Address
              </Label>
              <Input
                placeholder="bc1q..."
                value={payeeAddress}
                onChange={e => setPayeeAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The Bitcoin address that will receive funds upon milestone completion
              </p>
            </div>

            {/* Arbiter Address (Optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Arbiter Address
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                placeholder="bc1q..."
                value={arbiterAddress}
                onChange={e => setArbiterAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Optional third-party to resolve disputes
              </p>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Milestones
              </Label>
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-mono font-medium text-primary">
                  {totalAmount.toFixed(8)} BTC
                </span>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Milestone {index + 1}
                    </span>
                    {milestones.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMilestone(milestone.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Input
                    placeholder="Milestone title"
                    value={milestone.title}
                    onChange={e => updateMilestone(milestone.id, "title", e.target.value)}
                  />

                  <Textarea
                    placeholder="Description (optional)"
                    value={milestone.description}
                    onChange={e => updateMilestone(milestone.id, "description", e.target.value)}
                    className="min-h-[60px] resize-none"
                  />

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.00000001"
                      min="0"
                      placeholder="0.00000000"
                      value={milestone.amountBTC}
                      onChange={e => updateMilestone(milestone.id, "amountBTC", e.target.value)}
                      className="font-mono"
                    />
                    <span className="text-sm text-muted-foreground font-medium">BTC</span>
                  </div>

                  {milestone.amountBTC && parseFloat(milestone.amountBTC) > 0 && (
                    <p className="text-xs text-muted-foreground font-mono">
                      = {formatSats(btcToSatoshis(parseFloat(milestone.amountBTC)))}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={addMilestone}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <Button variant="ghost" onClick={step === 1 ? onCancel : () => setStep(1)}>
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step === 1 ? (
          <Button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="glow"
            onClick={handleSubmit}
            disabled={!isStep2Valid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create Escrow
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
