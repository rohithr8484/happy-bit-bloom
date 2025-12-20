import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CreateBountyParams } from "@/hooks/useBounty";
import { btcToSatoshis } from "@/lib/charms-sdk";
import { validateBitcoinAddress, validateBTCAmount } from "@/lib/validation";
import { 
  X, 
  Coins, 
  Calendar, 
  FileText, 
  User,
  GitBranch,
  Shield,
  FileSearch,
  Code,
  Palette,
  AlertCircle,
  CheckCircle,
  Zap
} from "lucide-react";

interface CreateBountyFormProps {
  onSubmit: (params: CreateBountyParams) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  connectedAddress?: string;
}

const categories = [
  { value: 'github_issue' as const, label: 'GitHub Issue', icon: GitBranch, description: 'Bug fix or feature request' },
  { value: 'audit' as const, label: 'Security Audit', icon: Shield, description: 'Security review & verification' },
  { value: 'research' as const, label: 'Research', icon: FileSearch, description: 'Analysis and documentation' },
  { value: 'development' as const, label: 'Development', icon: Code, description: 'Build new features' },
  { value: 'design' as const, label: 'Design', icon: Palette, description: 'UI/UX and visual assets' },
];

export function CreateBountyForm({ onSubmit, onCancel, loading, connectedAddress }: CreateBountyFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CreateBountyParams['category']>('github_issue');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maintainerAddress, setMaintainerAddress] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    const amountValidation = validateBTCAmount(amount);
    if (!amountValidation.valid) {
      newErrors.amount = amountValidation.error || 'Invalid amount';
    }
    
    if (!deadline) {
      newErrors.deadline = 'Deadline is required';
    } else if (new Date(deadline) <= new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }
    
    if (maintainerAddress) {
      const addressValidation = validateBitcoinAddress(maintainerAddress);
      if (!addressValidation.valid) {
        newErrors.maintainer = addressValidation.error || 'Invalid address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    await onSubmit({
      title,
      description,
      category,
      amount: btcToSatoshis(parseFloat(amount)),
      deadline: new Date(deadline),
      maintainerAddress: maintainerAddress || undefined,
    });
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Bounty</h2>
            <p className="text-sm text-muted-foreground">Oracle-verified task escrow</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Category Selection */}
        <div className="space-y-3">
          <Label>Category</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`
                    p-3 rounded-xl border text-left transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/30 bg-secondary/30'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium text-sm text-foreground">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            <FileText className="w-4 h-4 inline mr-2" />
            Bounty Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Fix authentication bug in login flow"
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task requirements, deliverables, and acceptance criteria..."
            rows={4}
            className={errors.description ? 'border-destructive' : ''}
          />
          {errors.description && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Amount and Deadline */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              <Coins className="w-4 h-4 inline mr-2" />
              Bounty Amount (BTC)
            </Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00000000"
              className={`font-mono ${errors.amount ? 'border-destructive' : ''}`}
            />
            {errors.amount ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.amount}
              </p>
            ) : amount && validateBTCAmount(amount).valid && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Valid BTC amount
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">
              <Calendar className="w-4 h-4 inline mr-2" />
              Deadline
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDate.toISOString().slice(0, 16)}
              className={errors.deadline ? 'border-destructive' : ''}
            />
            {errors.deadline && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.deadline}
              </p>
            )}
          </div>
        </div>

        {/* Maintainer Address (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="maintainer">
            <User className="w-4 h-4 inline mr-2" />
            Maintainer Address (Optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            If set, this address can approve task completion alongside oracle verification
          </p>
          <Input
            id="maintainer"
            value={maintainerAddress}
            onChange={(e) => setMaintainerAddress(e.target.value)}
            placeholder="bc1q... or 3... or 1..."
            className={`font-mono ${errors.maintainer ? 'border-destructive' : ''}`}
          />
          {errors.maintainer ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.maintainer}
            </p>
          ) : maintainerAddress && validateBitcoinAddress(maintainerAddress).valid && (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {validateBitcoinAddress(maintainerAddress).type}
            </p>
          )}
        </div>

        {/* Conditions Summary */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">Release Conditions</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Oracle confirms task completion
            </li>
            {maintainerAddress && (
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Maintainer signs approval
              </li>
            )}
            <li className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              Auto-refund if no action after deadline
            </li>
          </ul>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="glow"
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Create Bounty
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
