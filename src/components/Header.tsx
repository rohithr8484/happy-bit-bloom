import { cn } from "@/lib/utils";
import { Shield, Sparkles, Github, ExternalLink, Bitcoin } from "lucide-react";
import { motion } from "framer-motion";
import { WalletConnect } from "./WalletConnect";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-40",
        "border-b border-border/50 bg-background/80 backdrop-blur-xl",
        className,
      )}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground flex items-center gap-1.5">
              BOS Circuit Forge
              <Sparkles className="w-4 h-4 text-primary" />
            </h1>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </a>
          <a href="#bounties" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Bounties
          </a>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
            <Bitcoin className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">Testnet</span>
          </div>
          <a
            href="https://github.com/CharmsDev/charms"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Github className="w-5 h-5 text-muted-foreground" />
          </a>
          <WalletConnect />
        </div>
      </div>
    </motion.header>
  );
}
