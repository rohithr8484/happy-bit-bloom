import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useWeb3Wallet } from "@/hooks/useWeb3Wallet";
import { 
  Wallet, 
  LogOut, 
  ChevronDown, 
  Bitcoin, 
  Zap,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { formatBTC, shortenAddress } from "@/lib/charms-sdk";
import { toast } from "sonner";

export function WalletConnect() {
  const { wallet, connect, disconnect } = useWeb3Wallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (wallet.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const walletOptions = [
    { type: 'bitcoin' as const, name: 'Bitcoin', icon: Bitcoin, color: 'text-primary' },
    { type: 'spark' as const, name: 'Spark (L2)', icon: Zap, color: 'text-warning' },
  ];

  if (wallet.connected) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWalletMenu(!showWalletMenu)}
          className="gap-2 border-primary/30 hover:border-primary/50"
        >
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-sm">
            {shortenAddress(wallet.address || '')}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>

        <AnimatePresence>
          {showWalletMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowWalletMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-12 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bitcoin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {wallet.walletType} Wallet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {wallet.network}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <code className="flex-1 text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-1.5 rounded truncate">
                      {wallet.address}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyAddress}
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-4 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-1">Balance</p>
                  <p className="text-lg font-semibold text-foreground">
                    {wallet.balance ? formatBTC(wallet.balance) : '0.00000000 BTC'}
                  </p>
                </div>

                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => window.open('https://mempool.space', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      disconnect();
                      setShowWalletMenu(false);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="glow"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={wallet.connecting}
        className="gap-2"
      >
        {wallet.connecting ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </>
        )}
      </Button>

      <AnimatePresence>
        {showDropdown && !wallet.connecting && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 w-56 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
            >
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1.5">
                  Select Network
                </p>
                {walletOptions.map((option) => (
                  <Button
                    key={option.type}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => {
                      connect(option.type);
                      setShowDropdown(false);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center ${option.color}`}>
                      <option.icon className="w-4 h-4" />
                    </div>
                    <span>{option.name}</span>
                  </Button>
                ))}
              </div>
              <div className="p-2 border-t border-border">
                <a
                  href="https://utxos.dev/demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  UTXO SDK Demo
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
