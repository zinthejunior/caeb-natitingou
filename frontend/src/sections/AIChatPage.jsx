/**
 * AIChatPage.jsx - Version Nettoyée (Sans erreurs ESLint)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Send, User as UserIcon, Sparkles, Menu, Plus,
  Paperclip, ChevronLeft, RefreshCw, Globe, Library, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AIChatPage({ user }) {
  const navigate = useNavigate();
  
  // États
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const messagesEndRef = useRef(null);

  // --- Variants d'Animation ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", duration: 0.4 } }
  };

  // --- Logique d'envoi ---
  const handleSendMessage = useCallback(async (textToSend = "") => {
    const value = textToSend.trim() || inputValue.trim();
    if (!value) return;

    const userMsg = { id: Date.now().toString(), role: "user", content: value };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
        const authToken = getAuthToken();
        const kossiUrl = import.meta.env.VITE_KOSSI_URL || "http://localhost:8001";
        
        const response = await fetch(`${kossiUrl}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authToken && { "Authorization": `Bearer ${authToken}` })
            },
            body: JSON.stringify({
                user_id: user?.id,
                messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
            })
        });

        if (response.ok) {
            const data = await response.json();
            const botMsg = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
                sources: data.sources || [],
                recommendations: data.suggested_books || []
            };
            setMessages(prev => [...prev, botMsg]);
        }
    } catch (error) {
        console.error("Erreur Kossi:", error);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, messages, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="min-h-screen bg-[var(--library-bg)] flex flex-col font-sans">
      <Navbar user={user} />
      
      <div className="flex flex-1 pt-16 overflow-hidden">
        
        {/* SIDEBAR */}
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.aside 
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed lg:relative z-50 h-[calc(100vh-4rem)] bg-[var(--library-surface)] border-r border-[var(--border-color)] flex flex-col w-72"
            >
              <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--library-accent)] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-primary">Kossi AI</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(true)} className="hidden lg:flex">
                    <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4">
                <Button onClick={() => setMessages([])} className="w-full bg-[var(--library-accent)] hover:bg-[var(--library-accent-alt)] text-white gap-2 shadow-sm transition-transform active:scale-95">
                  <Plus className="w-4 h-4" /> Nouvelle discussion
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-4">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Historique</p>
                <div className="text-xs text-muted italic p-2 italic opacity-60">Aucune session récente</div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ZONE DE CHAT */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          
          {sidebarCollapsed && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 left-4 z-10">
                <Button variant="outline" size="icon" className="rounded-full bg-[var(--library-surface)] shadow-md border-[var(--border-color)]" onClick={() => setSidebarCollapsed(false)}>
                    <Menu className="w-4 h-4" />
                </Button>
            </motion.div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8">
              
              <AnimatePresence>
                {messages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--library-accent)] to-[var(--library-accent-alt)] flex items-center justify-center mb-6 shadow-lg">
                        <Bot className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-primary mb-2">Bonjour, je suis Kossi</h1>
                    <p className="text-muted max-w-sm mb-8">Votre bibliothécaire expert. Comment puis-je vous aider dans vos recherches aujourd&apos;hui ?</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        {["Recommande-moi un livre béninois", "Comment emprunter ?", "Actualités CAEB", "Aide-moi à faire une fiche"].map((t, i) => (
                            <Button key={i} variant="outline" onClick={() => handleSendMessage(t)} className="justify-start h-auto py-3 px-4 rounded-xl border-[var(--border-color)] hover:border-[var(--library-accent)] hover:bg-[var(--library-accent)]/5 text-sm transition-all text-primary">
                                <Sparkles className="w-4 h-4 mr-2 text-[var(--library-accent)]" /> {t}
                            </Button>
                        ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
                    {messages.map((msg, idx) => (
                      <motion.div 
                        key={idx} 
                        variants={messageVariants}
                        className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "")}
                      >
                        <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                            msg.role === "assistant" ? "bg-[var(--library-accent)] text-white" : "bg-[var(--library-surface-alt)] border border-[var(--border-color)] text-primary"
                        )}>
                            {msg.role === "assistant" ? <Library className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                        </div>

                        <div className={cn("flex flex-col gap-2 max-w-[85%]", msg.role === "user" ? "items-end" : "")}>
                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                msg.role === "assistant" 
                                  ? "bg-[var(--library-surface)] border border-[var(--border-color)] text-primary" 
                                  : "bg-[var(--library-accent)] text-white"
                            )}>
                                {msg.content}

                                {msg.sources?.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex flex-wrap gap-2">
                                        <div className="flex items-center gap-1 text-[10px] text-muted font-bold uppercase w-full mb-1">
                                            <Globe className="w-3 h-3" /> Sources consultées
                                        </div>
                                        {msg.sources.map((s, i) => (
                                            <a key={i} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-[var(--library-surface-alt)] rounded-md text-[10px] text-accent hover:underline">
                                                {s.title}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {msg.recommendations?.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
                                    {msg.recommendations.map((book, i) => (
                                        <motion.div 
                                            key={i} 
                                            whileHover={{ scale: 1.02 }}
                                            onClick={() => navigate(`/catalog/search?q=${book}`)}
                                            className="min-w-[180px] bg-[var(--library-surface)] p-3 rounded-xl border border-[var(--border-color)] shadow-sm cursor-pointer hover:border-[var(--library-accent)] transition-colors"
                                        >
                                            <p className="font-bold text-[12px] text-primary line-clamp-1">{book}</p>
                                            <span className="text-[10px] text-muted flex items-center gap-1 mt-2">
                                                <Info className="w-3 h-3" /> Voir le catalogue
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-20" />
            </div>
          </div>

          {/* INPUT */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--library-bg)] via-[var(--library-bg)] to-transparent">
            <div className="max-w-3xl mx-auto">
                <AnimatePresence>
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-[11px] text-accent font-medium mb-2 ml-2"
                        >
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Kossi analyse les rayons de la bibliothèque...
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div className="relative flex items-end gap-2 bg-[var(--library-surface)] p-2 rounded-2xl border border-[var(--border-color)] shadow-lg">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted hover:text-accent shrink-0">
                        <Paperclip className="w-5 h-5" />
                    </Button>
                    
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder="Posez votre question littéraire..."
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-2 text-sm resize-none max-h-32 min-h-[40px] text-primary placeholder:text-muted"
                        rows={1}
                    />
                    
                    <Button 
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isLoading}
                        className="rounded-xl bg-[var(--library-accent)] hover:bg-[var(--library-accent-alt)] text-white w-10 h-10 p-0 shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-center text-[10px] text-muted mt-3 uppercase tracking-tighter opacity-50">
                    Bibliothèque CAEB Natitingou — Assistant Digital
                </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}