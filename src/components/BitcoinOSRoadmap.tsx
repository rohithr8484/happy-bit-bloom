import { motion } from "framer-motion";
import { Check, Clock, Layers, Shield, Zap, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapPhase {
  title: string;
  status: 'complete' | 'in-progress' | 'upcoming';
  items: string[];
}

const roadmapPhases: RoadmapPhase[] = [
  {
    title: "Setup & Groundwork",
    status: 'complete',
    items: [
      "Grail - introducing institutional features",
      "Charms - Cardano, Litecoin, EVM",
      "BTC TVL - Limited Private Testing",
    ],
  },
  {
    title: "Production Phase: Iterating, Expanding, Launching",
    status: 'in-progress',
    items: [
      "Grail - Institutional Pilots",
      "Charms - dApp integration",
      "BTC TVL - Scale TVL & Yield",
    ],
  },
  {
    title: "Final Phase: Production, Ecosystem and Commercialization",
    status: 'in-progress',
    items: [
      "Grail: Institutional Grade",
      "$BOS Token: Charmed Cross Chain",
      "BTC TVL - Limited Private Testing",
    ],
  },
];

const ecosystemComponents = [
  {
    icon: Shield,
    title: "Charms",
    description: "Zero-knowledge token standard for UTXO blockchains enabling programmable assets on Bitcoin",
    color: "text-primary",
  },
  {
    icon: Layers,
    title: "Grail Pro",
    description: "Secure enclave network enabling general-purpose smart contracts with MPC & TEE",
    color: "text-chart-2",
  },
  {
    icon: Coins,
    title: "zkBTC",
    description: "Fully collateralized synthetic Bitcoin serving as the gateway into the ecosystem",
    color: "text-chart-3",
  },
];

export function BitcoinOSRoadmap() {
  return (
    <div className="space-y-16">
      {/* Bitcoin OS Core Components */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Bitcoin OS Ecosystem
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Extending Bitcoin's capabilities beyond simple payments into programmable, decentralized applications.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {ecosystemComponents.map((component, index) => (
          <motion.div
            key={component.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/30 transition-all duration-300"
          >
            <div className={cn(
              "w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
              component.color
            )}>
              <component.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-foreground mb-2 text-lg">{component.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{component.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Roadmap Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative"
      >
        <div className="text-center mb-12">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Development Roadmap
          </h3>
          <p className="text-muted-foreground">
            Building the future of programmable Bitcoin
          </p>
        </div>

        {/* Connection line */}
        <div className="hidden md:block absolute top-[180px] left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="grid md:grid-cols-3 gap-6">
          {roadmapPhases.map((phase, index) => (
            <motion.div
              key={phase.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              {/* Status indicator dot */}
              <div className="hidden md:flex absolute -top-3 right-4 z-10">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2",
                  phase.status === 'complete' 
                    ? "bg-primary border-primary" 
                    : phase.status === 'in-progress'
                    ? "bg-chart-2 border-chart-2 animate-pulse"
                    : "bg-secondary border-border"
                )} />
              </div>

              <div className={cn(
                "p-6 rounded-2xl border transition-all h-full",
                phase.status === 'complete' 
                  ? "bg-card/80 border-primary/30" 
                  : "bg-card/50 border-border hover:border-primary/20"
              )}>
                <h4 className="font-semibold text-foreground mb-4 text-lg leading-tight min-h-[56px]">
                  {phase.title}
                </h4>
                
                <ul className="space-y-3 mb-6">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                  phase.status === 'complete'
                    ? "bg-primary/10 text-primary"
                    : phase.status === 'in-progress'
                    ? "bg-secondary text-foreground border border-border"
                    : "bg-secondary/50 text-muted-foreground"
                )}>
                  {phase.status === 'complete' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Complete
                    </>
                  ) : phase.status === 'in-progress' ? (
                    <>
                      <Clock className="w-4 h-4" />
                      In-progress
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Upcoming
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Technology Stack */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-6 rounded-2xl bg-gradient-to-r from-primary/5 to-chart-2/5 border border-primary/20"
      >
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Core Technologies
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            "Zero-Knowledge Proofs (ZKP)",
            "Multi-Party Computation (MPC)",
            "Trusted Execution Env (TEE)",
            "UTXO State Channels",
          ].map((tech) => (
            <div key={tech} className="flex items-center gap-2 text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {tech}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
