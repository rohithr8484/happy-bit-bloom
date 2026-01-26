import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Bot, 
  Send, 
  Lock, 
  Target, 
  Coins, 
  FileCheck,
  Loader2,
  User,
  Sparkles,
  X
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  { icon: Lock, label: "Escrow Setup", prompt: "What are the best release conditions for a 3-milestone escrow with 0.5 BTC total?" },
  { icon: Target, label: "Bounty Design", prompt: "How should I structure a bounty with oracle verification for a development task?" },
  { icon: Coins, label: "Stablecoin Risk", prompt: "What collateral ratio should I use for minting BOLLAR with current market conditions?" },
  { icon: FileCheck, label: "ZK Proof Type", prompt: "Which ZK proof type is most efficient for verifying UTXO ownership without revealing the amount?" },
];

export const ProtocolAdvisorBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const streamChat = async (userMessages: Message[]) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    console.log("[ProtocolAdvisor] Supabase URL:", supabaseUrl);
    console.log("[ProtocolAdvisor] Has API Key:", !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }
    
    const CHAT_URL = `${supabaseUrl}/functions/v1/protocol-advisor`;
    console.log("[ProtocolAdvisor] Calling:", CHAT_URL);

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    console.log("[ProtocolAdvisor] Response status:", resp.status);
    
    if (resp.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    if (resp.status === 402) {
      throw new Error("Service temporarily unavailable.");
    }
    if (!resp.ok || !resp.body) {
      const errorText = await resp.text().catch(() => "Unknown error");
      console.error("[ProtocolAdvisor] Error response:", errorText);
      throw new Error(`Failed to connect to advisor (${resp.status})`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat([...messages, userMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)]"
          >
            <Card className="border-primary/20 shadow-2xl shadow-primary/10 bg-background/95 backdrop-blur-xl">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  Protocol Advisor
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI recommendations for escrows, bounties, stablecoins & ZK proofs
                </p>
              </CardHeader>

              <CardContent className="p-0">
                <div 
                  ref={scrollContainerRef}
                  className="h-[400px] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                >
                  {messages.length === 0 ? (
                    <div className="space-y-4">
                      <div className="text-center py-6">
                        <Bot className="w-12 h-12 mx-auto text-primary/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Ask me about protocol configurations, risk parameters, or proof selection
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_PROMPTS.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => sendMessage(item.prompt)}
                            disabled={isLoading}
                            className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left group"
                          >
                            <item.icon className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            msg.role === "user" 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-primary/10 text-primary"
                          }`}>
                            {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </div>
                          <div className={`flex-1 rounded-lg p-3 ${
                            msg.role === "user" 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          }`}>
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm">{msg.content}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {isLoading && messages[messages.length - 1]?.role === "user" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex gap-3"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about protocol settings..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
