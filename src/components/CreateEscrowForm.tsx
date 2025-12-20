import { useState, useCallback } from "react";
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
  Check,
  AlertCircle,
  Coins
} from "lucide-react";
import { btcToSatoshis, formatSats } from "@/lib/charms-sdk";
import { CreateEscrowParams } from "@/hooks/useEscrow";
import { 
  isValidBitcoinAddress, 
  getBitcoinAddressType,
  isValidAmount,
  TOKEN_CONFIG,
  TokenType 
} from "@/lib/validation";

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

interface FieldError {
  payer?: string;
  payee?: string;
  arbiter?: string;
  milestones?: Record<string, { title?: string; amount?: string }>;
}

export function CreateEscrowForm({ onSubmit, onCancel, loading }: CreateEscrowFormProps) {
  const [payerAddress, setPayerAddress] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [arbiterAddress, setArbiterAddress] = useState("");
  const [tokenType, setTokenType] = useState<TokenType>('BTC');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { id: "1", title: "", description: "", amountBTC: "" },
  ]);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldError>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const config = TOKEN_CONFIG[tokenType];

  const validateAddress = useCallback((address: string, field: 'payer' | 'payee' | 'arbiter') => {
    if (field === 'arbiter' && !address.trim()) {
      return undefined; // Optional field
    }
    if (!address.trim()) {
      return 'Bitcoin address is required';
    }
    if (!isValidBitcoinAddress(address)) {
      return 'Invalid Bitcoin address format';
    }
    return undefined;
  }, []);

  const validateMilestone = useCallback((milestone: MilestoneInput) => {
    const errs: { title?: string; amount?: string } = {};
    
    if (!milestone.title.trim()) {
      errs.title = 'Milestone title is required';
    } else if (milestone.title.length > 100) {
      errs.title = 'Title must be less than 100 characters';
    }
    
    if (!milestone.amountBTC.trim()) {
      errs.amount = 'Amount is required';
    } else if (!isValidAmount(milestone.amountBTC, tokenType)) {
      const minAmount = config.minAmount;
      errs.amount = `Invalid amount (min: ${minAmount} ${config.symbol})`;
    }
    
    return Object.keys(errs).length > 0 ? errs : undefined;
  }, [tokenType, config]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'payer') {
      setErrors(prev => ({ ...prev, payer: validateAddress(payerAddress, 'payer') }));
    } else if (field === 'payee') {
      setErrors(prev => ({ ...prev, payee: validateAddress(payeeAddress, 'payee') }));
    } else if (field === 'arbiter') {
      setErrors(prev => ({ ...prev, arbiter: validateAddress(arbiterAddress, 'arbiter') }));
    }
  };

  const validateStep1 = () => {
    const newErrors: FieldError = {
      payer: validateAddress(payerAddress, 'payer'),
      payee: validateAddress(payeeAddress, 'payee'),
      arbiter: validateAddress(arbiterAddress, 'arbiter'),
    };
    
    setErrors(newErrors);
    setTouched({ payer: true, payee: true, arbiter: true });
    
    return !newErrors.payer && !newErrors.payee && !newErrors.arbiter;
  };

  const validateStep2 = () => {
    const milestoneErrors: Record<string, { title?: string; amount?: string }> = {};
    
    milestones.forEach(m => {
      const errs = validateMilestone(m);
      if (errs) {
        milestoneErrors[m.id] = errs;
      }
    });
    
    setErrors(prev => ({ ...prev, milestones: milestoneErrors }));
    
    return Object.keys(milestoneErrors).length === 0;
  };

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
    
    // Clear error on change
    if (errors.milestones?.[id]) {
      setErrors(prev => ({
        ...prev,
        milestones: {
          ...prev.milestones,
          [id]: { ...prev.milestones?.[id], [field === 'amountBTC' ? 'amount' : field]: undefined }
        }
      }));
    }
  };

  const totalAmount = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amountBTC) || 0),
    0
  );

  const handleStep1Continue = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    await onSubmit({
      payerAddress,
      payeeAddress,
      arbiterAddress: arbiterAddress || undefined,
      tokenType,
      milestones: milestones.map(m => ({
        title: m.title,
        description: m.description,
        amount: btcToSatoshis(parseFloat(m.amountBTC)),
      })),
    });
  };

  const getAddressTypeLabel = (address: string) => {
    if (!address || !isValidBitcoinAddress(address)) return null;
    return getBitcoinAddressType(address);
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
            {/* Token Type Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Token Type
              </Label>
              <div className="flex gap-2">
                {(['BTC', 'zkBTC'] as TokenType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setTokenType(type)}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                      tokenType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">{TOKEN_CONFIG[type].icon}</span>
                      <span>{TOKEN_CONFIG[type].name}</span>
                    </div>
                    {type === 'zkBTC' && (
                      <p className="text-xs mt-1 opacity-70">Zero-knowledge wrapped</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Payer Address */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Payer Address
              </Label>
              <Input
                placeholder="bc1q... or 1... or 3..."
                value={payerAddress}
                onChange={e => {
                  setPayerAddress(e.target.value);
                  if (errors.payer) setErrors(prev => ({ ...prev, payer: undefined }));
                }}
                onBlur={() => handleBlur('payer')}
                className={cn(
                  "font-mono text-sm",
                  errors.payer && touched.payer && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.payer && touched.payer ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.payer}
                </p>
              ) : getAddressTypeLabel(payerAddress) ? (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {getAddressTypeLabel(payerAddress)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The Bitcoin address that will fund the escrow
                </p>
              )}
            </div>

            {/* Payee Address */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Payee Address
              </Label>
              <Input
                placeholder="bc1q... or 1... or 3..."
                value={payeeAddress}
                onChange={e => {
                  setPayeeAddress(e.target.value);
                  if (errors.payee) setErrors(prev => ({ ...prev, payee: undefined }));
                }}
                onBlur={() => handleBlur('payee')}
                className={cn(
                  "font-mono text-sm",
                  errors.payee && touched.payee && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.payee && touched.payee ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.payee}
                </p>
              ) : getAddressTypeLabel(payeeAddress) ? (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {getAddressTypeLabel(payeeAddress)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The Bitcoin address that will receive funds upon milestone completion
                </p>
              )}
            </div>

            {/* Arbiter Address (Optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Arbiter Address
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                placeholder="bc1q... or 1... or 3..."
                value={arbiterAddress}
                onChange={e => {
                  setArbiterAddress(e.target.value);
                  if (errors.arbiter) setErrors(prev => ({ ...prev, arbiter: undefined }));
                }}
                onBlur={() => handleBlur('arbiter')}
                className={cn(
                  "font-mono text-sm",
                  errors.arbiter && touched.arbiter && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.arbiter && touched.arbiter ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.arbiter}
                </p>
              ) : getAddressTypeLabel(arbiterAddress) ? (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {getAddressTypeLabel(arbiterAddress)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Optional third-party to resolve disputes
                </p>
              )}
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
                  {totalAmount.toFixed(8)} {config.symbol}
                </span>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {milestones.map((milestone, index) => {
                const milestoneErrors = errors.milestones?.[milestone.id];
                
                return (
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

                    <div className="space-y-1">
                      <Input
                        placeholder="Milestone title"
                        value={milestone.title}
                        onChange={e => updateMilestone(milestone.id, "title", e.target.value)}
                        className={cn(
                          milestoneErrors?.title && "border-destructive"
                        )}
                      />
                      {milestoneErrors?.title && (
                        <p className="text-xs text-destructive">{milestoneErrors.title}</p>
                      )}
                    </div>

                    <Textarea
                      placeholder="Description (optional)"
                      value={milestone.description}
                      onChange={e => updateMilestone(milestone.id, "description", e.target.value)}
                      className="min-h-[60px] resize-none"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.00000001"
                          min={config.minAmount}
                          placeholder="0.00000000"
                          value={milestone.amountBTC}
                          onChange={e => updateMilestone(milestone.id, "amountBTC", e.target.value)}
                          className={cn(
                            "font-mono",
                            milestoneErrors?.amount && "border-destructive"
                          )}
                        />
                        <span className="text-sm text-muted-foreground font-medium min-w-[50px]">
                          {config.symbol}
                        </span>
                      </div>
                      {milestoneErrors?.amount ? (
                        <p className="text-xs text-destructive">{milestoneErrors.amount}</p>
                      ) : milestone.amountBTC && parseFloat(milestone.amountBTC) > 0 && (
                        <p className="text-xs text-muted-foreground font-mono">
                          = {formatSats(btcToSatoshis(parseFloat(milestone.amountBTC)))}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
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
          <Button onClick={handleStep1Continue}>
            Continue
          </Button>
        ) : (
          <Button
            variant="glow"
            onClick={handleSubmit}
            disabled={loading}
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
