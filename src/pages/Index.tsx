import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/Header";
import { EscrowCard } from "@/components/EscrowCard";
import { CreateEscrowForm } from "@/components/CreateEscrowForm";
import { EscrowDetailsPanel } from "@/components/EscrowDetailsPanel";
import { BitcoinOSRoadmap } from "@/components/BitcoinOSRoadmap";
import { BountyCard } from "@/components/BountyCard";
import { CreateBountyForm } from "@/components/CreateBountyForm";
import { BountyDetailsPanel } from "@/components/BountyDetailsPanel";
import { BollarMint } from "@/components/BollarMint";
import { ZKVerificationPanel } from "@/components/ZKVerificationPanel";
import { BitcoinAnalyticsDashboard } from "@/components/BitcoinAnalyticsDashboard";
import { ScrollProvingPanel } from "@/components/ScrollProvingPanel";
import { CharmsFlowDiagram } from "@/components/CharmsFlowDiagram";
import { ProtocolAdvisorBot } from "@/components/ProtocolAdvisorBot";
import { Button } from "@/components/ui/button";
import { useEscrow } from "@/hooks/useEscrow";
import { useBounty } from "@/hooks/useBounty";
import { 
  Plus, 
  Bitcoin,
  ExternalLink,
  Coins,
  Target,
  FileCheck,
  BarChart3,
  Layers,
  Gem,
  Lock,
} from "lucide-react";
import secureEscrowImg from "@/assets/secure-escrow.jpg";
import oracleBountiesImg from "@/assets/oracle-bounties.jpg";
import zkVerificationImg from "@/assets/zk-verification.jpg";
import { toast } from "sonner";

const Index = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBountyForm, setShowBountyForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'escrows' | 'bounties' | 'bollar' | 'zk' | 'analytics' | 'scroll' | 'charms'>('escrows');

  const {
    escrows,
    selectedEscrow,
    loading,
    createEscrow,
    selectEscrow,
    completeMilestone,
    releaseMilestone,
    disputeMilestone,
  } = useEscrow();

  const {
    bounties,
    selectedBounty,
    loading: bountyLoading,
    oracleLoading,
    createBounty,
    claimBounty,
    submitWork,
    verifyWithOracle,
    approveBounty,
    releaseBounty,
    disputeBounty,
    selectBounty,
  } = useBounty();

  const handleCreateEscrow = async (params: Parameters<typeof createEscrow>[0]) => {
    try {
      await createEscrow(params);
      setShowCreateForm(false);
      toast.success("Escrow created successfully!");
    } catch {
      toast.error("Failed to create escrow");
    }
  };

  const handleCreateBounty = async (params: Parameters<typeof createBounty>[0]) => {
    try {
      await createBounty(params);
      setShowBountyForm(false);
      toast.success("Bounty created successfully!");
    } catch {
      toast.error("Failed to create bounty");
    }
  };

  const tabs = [
    { id: 'escrows' as const, label: 'Escrows', icon: Lock },
    { id: 'bounties' as const, label: 'Bounties', icon: Target },
    { id: 'bollar' as const, label: 'Bollar', icon: Coins },
    { id: 'zk' as const, label: 'ZK Proofs', icon: FileCheck },
    { id: 'scroll' as const, label: 'Scroll', icon: Layers },
    { id: 'charms' as const, label: 'Charms', icon: Gem },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          
          <div className="relative container mx-auto px-4 py-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Bitcoin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Bitcoin OS • Charms • Boundless
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Programmable <span className="text-gradient">Bitcoin</span> Finance
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Escrows, Bounties, Stablecoins & ZK Proofs powered by Charms Protocol and Boundless verification.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="glow" size="xl" onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto animate-glow-pulse">
                    <Plus className="w-5 h-5" />
                    Create Escrow
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Feature cards */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto"
            >
              {[
                { image: secureEscrowImg, title: "Secure Escrow", description: "Funds locked in programmable Bitcoin UTXOs with zero-knowledge proofs" },
                { image: oracleBountiesImg, title: "Oracle Bounties", description: "Outcome-based task payments verified by oracles and maintainers" },
                { image: zkVerificationImg, title: "ZK Verification", description: "Boundless proofs for Bitcoin state with RISC Zero zkVM" },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="rounded-2xl bg-card/50 border border-border hover:border-primary/30 transition-colors group overflow-hidden"
                >
                  <div className="h-32 overflow-hidden">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>
        </section>

        {/* Content Sections */}
        <section className="container mx-auto px-4 pb-16">
          {activeTab === 'escrows' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Active Escrows</h2>
                  <p className="text-muted-foreground mt-1">{escrows.length} milestone-based escrows</p>
                </div>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4" />New Escrow
                </Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {escrows.map((escrow, index) => (
                  <motion.div key={escrow.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <EscrowCard escrow={escrow} onClick={() => selectEscrow(escrow.id)} selected={selectedEscrow?.id === escrow.id} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bounties' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Bitcoin Bounties</h2>
                  <p className="text-muted-foreground mt-1">Oracle-verified task escrows</p>
                </div>
                <Button onClick={() => setShowBountyForm(true)}>
                  <Plus className="w-4 h-4" />New Bounty
                </Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bounties.map((bounty, index) => (
                  <motion.div key={bounty.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <BountyCard bounty={bounty} onClick={() => selectBounty(bounty.id)} selected={selectedBounty?.id === bounty.id} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bollar' && <BollarMint />}
          {activeTab === 'zk' && <ZKVerificationPanel />}
          {activeTab === 'scroll' && <ScrollProvingPanel />}
          {activeTab === 'charms' && <CharmsFlowDiagram />}
          {activeTab === 'analytics' && <BitcoinAnalyticsDashboard />}
        </section>

        {/* Bitcoin OS Roadmap */}
        <section className="container mx-auto px-4 py-16 border-t border-border">
          <BitcoinOSRoadmap />
        </section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showCreateForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setShowCreateForm(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-2xl">
                <CreateEscrowForm onSubmit={handleCreateEscrow} onCancel={() => setShowCreateForm(false)} loading={loading} />
              </div>
            </div>
          </>
        )}
        {showBountyForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setShowBountyForm(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-2xl">
                <CreateBountyForm onSubmit={handleCreateBounty} onCancel={() => setShowBountyForm(false)} loading={bountyLoading} />
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Panels */}
      <AnimatePresence>
        {selectedEscrow && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => selectEscrow(null)} />
            <EscrowDetailsPanel escrow={selectedEscrow} onClose={() => selectEscrow(null)} onCompleteMilestone={(mid, proof) => completeMilestone(selectedEscrow.id, mid, proof)} onReleaseMilestone={(mid) => releaseMilestone(selectedEscrow.id, mid)} onDisputeMilestone={(mid, reason) => disputeMilestone(selectedEscrow.id, mid, reason)} loading={loading} />
          </>
        )}
        {selectedBounty && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => selectBounty(null)} />
            <BountyDetailsPanel bounty={selectedBounty} onClose={() => selectBounty(null)} onClaimBounty={(addr) => claimBounty(selectedBounty.id, addr)} onSubmitWork={(proof) => submitWork(selectedBounty.id, proof)} onVerifyWithOracle={() => verifyWithOracle(selectedBounty.id)} onApproveBounty={(sig) => approveBounty(selectedBounty.id, sig)} onReleaseBounty={() => releaseBounty(selectedBounty.id)} onDisputeBounty={(reason) => disputeBounty(selectedBounty.id, reason)} loading={bountyLoading} oracleLoading={oracleLoading} />
          </>
        )}
      </AnimatePresence>

      {/* Protocol Advisor AI Bot */}
      <ProtocolAdvisorBot />
    </div>
  );
};

export default Index;
