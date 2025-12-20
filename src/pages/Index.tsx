import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/Header";
import { EscrowCard } from "@/components/EscrowCard";
import { CreateEscrowForm } from "@/components/CreateEscrowForm";
import { EscrowDetailsPanel } from "@/components/EscrowDetailsPanel";
import { BitcoinOSRoadmap } from "@/components/BitcoinOSRoadmap";
import { Button } from "@/components/ui/button";
import { useEscrow } from "@/hooks/useEscrow";
import { 
  Plus, 
  Shield, 
  Zap, 
  Lock, 
  Bitcoin,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  const handleCreateEscrow = async (params: Parameters<typeof createEscrow>[0]) => {
    try {
      await createEscrow(params);
      setShowCreateForm(false);
      toast.success("Escrow created successfully!");
    } catch {
      toast.error("Failed to create escrow");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
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
                  Programmable Bitcoin Payments
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Milestone-Based Escrows on{" "}
                <span className="text-gradient">Bitcoin</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Unlock programmable payments with the Charms Protocol. 
                Create conditional escrows, automate settlements, and verify state on-chain.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  variant="glow"
                  size="xl"
                  onClick={() => setShowCreateForm(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5" />
                  Create Escrow
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => window.open("https://bitcoinos.build/ecosystem", "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Explore Ecosystem
                </Button>
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
                {
                  icon: Lock,
                  title: "Secure Escrow",
                  description: "Funds locked in programmable Bitcoin UTXOs with zero-knowledge proofs",
                },
                {
                  icon: Zap,
                  title: "Conditional Release",
                  description: "Automated settlement based on milestone completion and verification",
                },
                {
                  icon: Shield,
                  title: "On-Chain State",
                  description: "Verifiable contract state anchored to Bitcoin's security model",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Escrows Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Active Escrows</h2>
              <p className="text-muted-foreground mt-1">
                {escrows.length} escrow{escrows.length !== 1 ? "s" : ""} in your dashboard
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4" />
              New Escrow
            </Button>
          </div>

          {escrows.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No escrows yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first milestone-based escrow to get started
              </p>
              <Button variant="glow" onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4" />
                Create Escrow
              </Button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {escrows.map((escrow, index) => (
                <motion.div
                  key={escrow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EscrowCard
                    escrow={escrow}
                    onClick={() => selectEscrow(escrow.id)}
                    selected={selectedEscrow?.id === escrow.id}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Bitcoin OS Ecosystem Section */}
        <section className="container mx-auto px-4 py-16 border-t border-border">
          <BitcoinOSRoadmap />
        </section>
      </main>

      {/* Create Escrow Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowCreateForm(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-2xl">
                <CreateEscrowForm
                  onSubmit={handleCreateEscrow}
                  onCancel={() => setShowCreateForm(false)}
                  loading={loading}
                />
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Escrow Details Panel */}
      <AnimatePresence>
        {selectedEscrow && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => selectEscrow(null)}
            />
            <EscrowDetailsPanel
              escrow={selectedEscrow}
              onClose={() => selectEscrow(null)}
              onCompleteMilestone={(milestoneId, proof) =>
                completeMilestone(selectedEscrow.id, milestoneId, proof)
              }
              onReleaseMilestone={(milestoneId) =>
                releaseMilestone(selectedEscrow.id, milestoneId)
              }
              onDisputeMilestone={(milestoneId, reason) =>
                disputeMilestone(selectedEscrow.id, milestoneId, reason)
              }
              loading={loading}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
