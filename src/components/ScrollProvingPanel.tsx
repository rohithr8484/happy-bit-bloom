import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScroll } from "@/hooks/useScroll";
import { SCROLL_NETWORKS, formatGwei, formatEth, shortenHash } from "@/lib/scroll-sdk";
import { 
  Layers, 
  Zap, 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Copy,
  ExternalLink,
  Cpu,
  Database,
  ArrowRight,
  Loader2,
  Server,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

export function ScrollProvingPanel() {
  const {
    network,
    setNetwork,
    networkConfig,
    queueStats,
    activeProof,
    proofHistory,
    loading,
    generateChunkProof,
    generateBatchProof,
    verifyProof,
  } = useScroll();

  const [blockCount, setBlockCount] = useState(3);
  const [chunkCount, setChunkCount] = useState(2);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleGenerateChunkProof = async () => {
    toast.info("Generating chunk proof...");
    const proof = await generateChunkProof(blockCount);
    if (proof) {
      toast.success(`Chunk proof generated! Block range: ${proof.blockRange.start}-${proof.blockRange.end}`);
    } else {
      toast.error("Failed to generate proof");
    }
  };

  const handleGenerateBatchProof = async () => {
    toast.info("Generating batch proof (this takes longer)...");
    const proof = await generateBatchProof(chunkCount);
    if (proof) {
      toast.success(`Batch proof generated! Gas estimate: ${formatGwei(proof.gasEstimate)}`);
    } else {
      toast.error("Failed to generate proof");
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Selector */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Scroll Network Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {(Object.keys(SCROLL_NETWORKS) as (keyof typeof SCROLL_NETWORKS)[]).map((net) => (
              <Button
                key={net}
                variant={network === net ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNetwork(net)}
              >
                {SCROLL_NETWORKS[net].name}
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Chain ID</p>
              <p className="font-mono text-sm text-foreground">{networkConfig.chainId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Currency</p>
              <p className="font-mono text-sm text-foreground">{networkConfig.currencySymbol}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">RPC URL</p>
              <p className="font-mono text-xs text-foreground truncate">{networkConfig.rpcUrl}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Explorer</p>
              <a 
                href={networkConfig.blockExplorer} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                ScrollScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Pending', value: queueStats.pending, icon: Clock, color: 'text-yellow-500' },
          { label: 'Proving', value: queueStats.proving, icon: Cpu, color: 'text-blue-500' },
          { label: 'Completed', value: queueStats.completed, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Failed', value: queueStats.failed, icon: XCircle, color: 'text-red-500' },
          { label: 'Total Proofs', value: queueStats.totalProofs, icon: Database, color: 'text-primary' },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Proof Generation */}
      <Tabs defaultValue="chunk" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="chunk" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Chunk Proof
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Batch Proof
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chunk">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Generate Chunk Proof</CardTitle>
              <p className="text-sm text-muted-foreground">
                Prove validity of a sequence of blocks using Scroll zkEVM
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Number of Blocks</label>
                <div className="flex gap-2">
                  {[1, 3, 5, 10].map((n) => (
                    <Button
                      key={n}
                      variant={blockCount === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBlockCount(n)}
                    >
                      {n} {n === 1 ? 'Block' : 'Blocks'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-sm">Estimated time:</span>
                  <span className="font-mono text-primary">~{15 + blockCount * 2}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Gas estimate:</span>
                  <span className="font-mono text-green-500">~{100000 + blockCount * 50000}</span>
                </div>
              </div>

              <Button 
                onClick={handleGenerateChunkProof} 
                disabled={loading}
                className="w-full"
                variant="glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 mr-2" />
                    Generate Chunk Proof
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Generate Batch Proof</CardTitle>
              <p className="text-sm text-muted-foreground">
                Aggregate multiple chunk proofs into a single batch proof for L1 submission
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Number of Chunks</label>
                <div className="flex gap-2">
                  {[2, 4, 8, 16].map((n) => (
                    <Button
                      key={n}
                      variant={chunkCount === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChunkCount(n)}
                    >
                      {n} Chunks
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-sm">Estimated time:</span>
                  <span className="font-mono text-primary">~{30 + chunkCount * 5}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Gas estimate:</span>
                  <span className="font-mono text-green-500">~{500000 + chunkCount * 100000}</span>
                </div>
              </div>

              <Button 
                onClick={handleGenerateBatchProof} 
                disabled={loading}
                className="w-full"
                variant="glow"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Batch...
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4 mr-2" />
                    Generate Batch Proof
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Proof Progress */}
      <AnimatePresence>
        {activeProof && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="font-medium">Generating {activeProof.type} proof...</span>
                  </div>
                  <Badge variant="secondary">{Math.round(activeProof.progress)}%</Badge>
                </div>
                <Progress value={activeProof.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  This simulates the Scroll proving SDK workflow
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proof History */}
      {proofHistory.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Proof History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proofHistory.map((proofState, index) => (
              <motion.div
                key={proofState.proofId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {proofState.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="font-medium capitalize">{proofState.type} Proof</span>
                    <Badge variant={proofState.status === 'completed' ? 'default' : 'destructive'}>
                      {proofState.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {proofState.startedAt.toLocaleTimeString()}
                  </span>
                </div>

                {proofState.proof && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Proof ID</p>
                      <div className="flex items-center gap-1">
                        <code className="text-xs">{shortenHash(proofState.proof.proofId)}</code>
                        <button onClick={() => copyToClipboard(proofState.proof!.proofId)}>
                          <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Block Range</p>
                      <code className="text-xs">
                        {proofState.proof.blockRange.start} <ArrowRight className="w-3 h-3 inline" /> {proofState.proof.blockRange.end}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gas Estimate</p>
                      <code className="text-xs text-green-500">
                        {proofState.proof.gasEstimate.toLocaleString()}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <code className="text-xs">
                        {proofState.completedAt 
                          ? `${((proofState.completedAt.getTime() - proofState.startedAt.getTime()) / 1000).toFixed(1)}s`
                          : '-'
                        }
                      </code>
                    </div>
                  </div>
                )}

                {proofState.error && (
                  <p className="text-sm text-red-500 mt-2">{proofState.error}</p>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Technical Info */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">About Scroll zkEVM Proving</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Scroll uses zkEVM to generate validity proofs for L2 transactions. The proving SDK 
                enables chunk and batch proof generation for rollup operation.
              </p>
              <div className="flex gap-2">
                <a 
                  href="https://docs.scroll.io/en/sdk/technical-stack" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    SDK Docs
                  </Button>
                </a>
                <a 
                  href="https://github.com/scroll-tech/scroll-proving-sdk" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    GitHub
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
