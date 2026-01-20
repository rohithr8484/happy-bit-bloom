/**
 * Bollar Mint/Redeem Component
 * Bitcoin-collateralized stablecoin minting interface
 * With @jedisct1/charm encryption integration
 */

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBollar, CollateralPosition } from "@/hooks/useBollar";
import { formatBTC } from "@/lib/charms-sdk";
import { validateBTCAmount } from "@/lib/validation";
import { CharmCrypto, bytesToHex } from "@/lib/charms-wasm-sdk";
import {
  DollarSign,
  Bitcoin,
  ArrowDownUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Coins,
  Info,
  ExternalLink,
  Lock,
  Cpu,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

function formatBollar(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const statusColors = {
  healthy: 'bg-success/20 text-success border-success/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  danger: 'bg-destructive/20 text-destructive border-destructive/30',
  liquidated: 'bg-muted text-muted-foreground border-muted',
};

export function BollarMint() {
  const {
    positions,
    stats,
    loading,
    mintBollar,
    redeemBollar,
    calculateMaxBollar,
    calculateMinBtc,
    refreshPrices,
    createEncryptedMint,
    verifyMintProof,
  } = useBollar();

  const [mode, setMode] = useState<'mint' | 'redeem'>('mint');
  const [btcInput, setBtcInput] = useState('');
  const [bollarInput, setBollarInput] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [mintProofHash, setMintProofHash] = useState<string | null>(null);

  const btcSatoshis = useMemo(() => {
    const parsed = parseFloat(btcInput);
    return isNaN(parsed) ? 0 : Math.floor(parsed * 100000000);
  }, [btcInput]);

  const bollarCents = useMemo(() => {
    const parsed = parseFloat(bollarInput);
    return isNaN(parsed) ? 0 : Math.floor(parsed * 100);
  }, [bollarInput]);

  const maxBollar = useMemo(() => calculateMaxBollar(btcSatoshis), [btcSatoshis, calculateMaxBollar]);
  const minBtc = useMemo(() => calculateMinBtc(bollarCents), [bollarCents, calculateMinBtc]);

  const collateralRatio = useMemo(() => {
    if (btcSatoshis === 0 || bollarCents === 0) return 0;
    const btcValue = (btcSatoshis / 100000000) * stats.currentBtcPrice;
    const bollarValue = bollarCents / 100;
    return Math.round((btcValue / bollarValue) * 100);
  }, [btcSatoshis, bollarCents, stats.currentBtcPrice]);

  const isValidMint = btcSatoshis > 0 && bollarCents > 0 && collateralRatio >= stats.minCollateralRatio;

  const handleMint = async () => {
    if (!isValidMint) return;
    try {
      const position = await mintBollar({ btcAmount: btcSatoshis, bollarAmount: bollarCents });
      
      // Create encrypted mint using @jedisct1/charm
      const encryptedMint = createEncryptedMint(
        position.id,
        BigInt(bollarCents),
        'connected-wallet'
      );
      setMintProofHash(encryptedMint.proofHash);
      
      toast.success(`Minted ${formatBollar(bollarCents)} BOLLAR! (Charm encrypted)`);
      setBtcInput('');
      setBollarInput('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mint failed');
    }
  };

  const handleRedeem = async () => {
    if (!selectedPosition || bollarCents <= 0) return;
    try {
      await redeemBollar({ positionId: selectedPosition, bollarAmount: bollarCents });
      toast.success('Bollar redeemed successfully!');
      setBollarInput('');
      setSelectedPosition(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Redeem failed');
    }
  };

  const handleMaxBollar = () => {
    if (maxBollar > 0) {
      setBollarInput((maxBollar / 100).toFixed(2));
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Bitcoin className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">BTC Price</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            ${stats.currentBtcPrice.toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Min Ratio</span>
          </div>
          <p className="text-lg font-bold text-foreground">{stats.minCollateralRatio}%</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Bitcoin className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Locked</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatBTC(stats.totalBtcLocked)}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border relative">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Total Minted</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatBollar(stats.totalBollarMinted)}</p>
          
          {/* Charm crypto indicator */}
          <div className="absolute top-2 right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] gap-0.5 px-1.5 py-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <Cpu className="w-2.5 h-2.5" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Rust + @jedisct1/charm</p>
                  <p className="text-xs text-muted-foreground">Encrypted spell verification</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-card border border-border"
      >
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === 'mint' ? 'default' : 'outline'}
            onClick={() => setMode('mint')}
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Mint BOLLAR
          </Button>
          <Button
            variant={mode === 'redeem' ? 'default' : 'outline'}
            onClick={() => setMode('redeem')}
            className="flex-1"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Redeem
          </Button>
        </div>

        {mode === 'mint' ? (
          <div className="space-y-4">
            {/* BTC Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bitcoin className="w-4 h-4 text-primary" />
                Deposit BTC Collateral
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={btcInput}
                onChange={(e) => setBtcInput(e.target.value)}
                placeholder="0.00000000"
                className="font-mono text-lg"
              />
              {btcInput && !validateBTCAmount(btcInput).valid && (
                <p className="text-xs text-destructive">Invalid BTC amount</p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <ArrowDownUp className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {/* Bollar Output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  Receive BOLLAR
                </Label>
                <Button variant="ghost" size="sm" onClick={handleMaxBollar} disabled={maxBollar <= 0}>
                  Max: {formatBollar(maxBollar)}
                </Button>
              </div>
              <Input
                type="text"
                inputMode="decimal"
                value={bollarInput}
                onChange={(e) => setBollarInput(e.target.value)}
                placeholder="0.00"
                className="font-mono text-lg"
              />
            </div>

            {/* Ratio Display */}
            {collateralRatio > 0 && (
              <div className={`p-4 rounded-xl border ${
                collateralRatio >= stats.minCollateralRatio 
                  ? 'bg-success/10 border-success/30' 
                  : 'bg-destructive/10 border-destructive/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Collateral Ratio</span>
                  <span className={`font-bold ${
                    collateralRatio >= stats.minCollateralRatio ? 'text-success' : 'text-destructive'
                  }`}>
                    {collateralRatio}%
                  </span>
                </div>
                {collateralRatio < stats.minCollateralRatio && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Minimum {stats.minCollateralRatio}% required
                  </p>
                )}
              </div>
            )}

            <Button
              variant="glow"
              className="w-full"
              disabled={!isValidMint || loading}
              onClick={handleMint}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 mr-2" />
                  Mint BOLLAR
                  <Lock className="w-3 h-3 ml-1 opacity-60" />
                </>
              )}
            </Button>

            {/* Show proof hash after mint */}
            {mintProofHash && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-xs">
                  <KeyRound className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Charm Proof:</span>
                  <code className="font-mono text-primary">{mintProofHash.slice(0, 24)}...</code>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Position Selection */}
            <div className="space-y-2">
              <Label>Select Position</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {positions.filter(p => p.status !== 'liquidated').map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setSelectedPosition(pos.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selectedPosition === pos.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm">{formatBTC(pos.btcDeposited)}</span>
                      <Badge variant="outline" className={statusColors[pos.status]}>
                        {formatPercent(pos.collateralRatio)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Minted: {formatBollar(pos.bollarMinted)}
                    </p>
                  </button>
                ))}
                {positions.filter(p => p.status !== 'liquidated').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active positions
                  </p>
                )}
              </div>
            </div>

            {/* Repay Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Repay BOLLAR
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={bollarInput}
                onChange={(e) => setBollarInput(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                disabled={!selectedPosition}
              />
            </div>

            <Button
              variant="glow"
              className="w-full"
              disabled={!selectedPosition || bollarCents <= 0 || loading}
              onClick={handleRedeem}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Redeem Collateral
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How Bollar Works</p>
              <ul className="space-y-1">
                <li>• Deposit BTC as collateral (min {stats.minCollateralRatio}% ratio)</li>
                <li>• Mint USD-pegged BOLLAR stablecoins</li>
                <li>• Repay BOLLAR to withdraw your BTC</li>
                <li>• Stability fee: {stats.stabilityFee}% annually</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Positions List */}
      {positions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Your Positions</h3>
            <Button variant="ghost" size="sm" onClick={refreshPrices}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {positions.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PositionCard({ position }: { position: CollateralPosition }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-card border border-border"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[position.status]}>
            {position.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
            {position.status === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
            {position.status === 'danger' && <AlertTriangle className="w-3 h-3 mr-1" />}
            {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
          </Badge>
          <span className="text-xs font-mono text-muted-foreground">{position.id}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => window.open(`https://mempool.space/tx/${position.txid}`, '_blank')}
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Collateral</p>
          <p className="font-mono font-medium text-foreground">{formatBTC(position.btcDeposited)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Minted</p>
          <p className="font-mono font-medium text-foreground">{formatBollar(position.bollarMinted)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ratio</p>
          <p className={`font-mono font-medium ${
            position.collateralRatio >= 150 ? 'text-success' : 
            position.collateralRatio >= 130 ? 'text-warning' : 'text-destructive'
          }`}>
            {formatPercent(position.collateralRatio)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Liquidation at ${position.liquidationPrice.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}
