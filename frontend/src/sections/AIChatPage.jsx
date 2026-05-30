/**
 * AIChatPage.jsx - Version Streaming avec Layout Corrigé
 * Support du streaming SSE pour les réponses de Kossi AI
 * Layout adapté pour Navbar + BottomBar fixes
 * Sidebar masquée par défaut, apparaît au clic sur l'icône Menu
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Send, User as UserIcon, Sparkles, Menu, Plus,
  Paperclip, ChevronLeft, RefreshCw, Globe, Library, Info, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AIChatPage({ user }) {
  const navigate = useNavigate();
  
  // --- États ---
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Référence pour le scroll automatique
  const messagesEndRef = useRef(null);

  // --- Fonctions Utilitaires ---
  const generateMessageId = () => {
    return window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- Logique d'envoi avec streaming SSE ---
  const handleSendMessage = async (textToSend = "") => {
    const value = textToSend.trim() || inputValue.trim();
    if (!value || isLoading) return;

    const userMsg = { 
      id: generateMessageId(), 
      role: "user", 
      content: value 
    };

    // ID préparé à l'avance pour le message assistant
    const assistantId = generateMessageId();
    const assistantMsg = {
      id: assistantId,
      role: "assistant",
      content: "Kossi réfléchit...",
      sources: [],
      recommendations: []
    };

    console.log("Ajout des messages:", userMsg, assistantMsg);
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const authToken = getAuthToken();
      const kossiUrl = import.meta.env.VITE_KOSSI_URL || "http://localhost:8001";
      
      // On prend les messages AVANT l'ajout du userMsg + assistantMsg
      const updatedHistory = [...messages, userMsg].map(m => ({ 
        role: m.role, 
        content: m.content 
      }));

      console.log("Envoi à l'API:", updatedHistory);

      const response = await fetch(`${kossiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { "Authorization": `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          user_id: user?.id,
          messages: updatedHistory
        })
      });

      console.log("Statut réponse:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API:", errorText);
        throw new Error(`Erreur API: ${response.status}`);
      }

      // On remplace "Kossi réfléchit..." par une chaîne vide pour le streaming
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { ...msg, content: "" }
          : msg
      ));

      // LECTURE DU STREAM SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstChunkReceived = false;

      console.log("Début de la lecture du stream...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream terminé");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Traiter les lignes SSE complètes
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Garde la ligne incomplète dans le buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            console.log("Ligne SSE reçue:", dataStr);
            
            try {
              const data = JSON.parse(dataStr);
              
              if (data.chunk) {
                if (!firstChunkReceived) {
                  console.log("Premier chunk reçu !");
                  firstChunkReceived = true;
                }
                // Ajouter le chunk au message assistant
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, content: msg.content + data.chunk }
                    : msg
                ));
              }
              
              if (data.done) {
                console.log("Message terminé, sources:", data.sources);
                // Finaliser avec les sources
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, sources: data.sources || [] }
                    : msg
                ));
              }
              
              if (data.error) {
                console.error("Erreur du stream:", data.error);
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, content: data.error }
                    : msg
                ));
              }
            } catch (e) {
              console.warn("Ligne SSE ignorée:", line, e);
            }
          }
        }
      }

    } catch (error) {
      console.error("Erreur de connexion Kossi:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { ...msg, content: "Désolé, je rencontre des difficultés techniques. Vérifie que mon serveur (port 8001) est bien lancé." }
          : msg
      ));
    } finally {
      console.log("Fin du traitement, isLoading=false");
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col font-sans text-slate-900 bg-[var(--library-bg)]">
      <Navbar user={user} />
      
      <div className="flex flex-1 overflow-hidden pt-20">
        
        {/* SIDEBAR - Apparaît uniquement quand sidebarOpen est true */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Overlay pour fermer la sidebar en cliquant à côté */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              
              <motion.aside 
  initial={{ x: -280, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -280, opacity: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="fixed lg:relative z-50 top-20 bottom-0 lg:bottom-auto lg:h-[calc(100vh-5rem-6rem)] bg-white border-r border-slate-200 flex flex-col w-72 shadow-xl"
>
  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <span className="font-bold text-slate-800">Kossi AI</span>
    </div>
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => setSidebarOpen(false)}
      className="lg:hidden"
    >
      <X className="w-4 h-4" />
    </Button>
  </div>

  <div className="p-4">
    <Button 
      onClick={() => { setMessages([]); setSidebarOpen(false); }} 
      className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
    >
      <Plus className="w-4 h-4" /> Nouvelle discussion
    </Button>
  </div>

  <div className="flex-1 overflow-y-auto px-4">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Historique</p>
    <div className="text-xs text-slate-400 italic p-2 opacity-60">Session actuelle</div>
  </div>

  {/* Liens rapides - ferment la sidebar au clic */}
  <div className="p-4 border-t border-slate-100">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Navigation</p>
    <div className="space-y-1">
      {[
        { label: "Catalogue", path: "/catalog" },
        { label: "Clubs", path: "/clubs" },
        { label: "Actualités", path: "/news" },
        { label: "Accueil", path: "/home" },
      ].map((item) => (
        <button
          key={item.path}
          onClick={() => { navigate(item.path); setSidebarOpen(false); }}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  </div>
</motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ZONE DE CHAT */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
          
          {/* Bouton Menu - TOUJOURS visible pour ouvrir la sidebar */}
          {!sidebarOpen && (
            <div className="absolute top-4 left-4 z-10">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full bg-white shadow-md hover:bg-slate-100" 
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8">
              
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg">
                      <Bot className="w-12 h-12 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Bonjour {user?.prenom || ""}, je suis Kossi</h1>
                  <p className="text-slate-500 max-w-sm mb-8">Votre bibliothécaire expert. Comment puis-je vous aider ?</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      {[
                        "Recommande-moi un livre béninois", 
                        "Quelles sont les actualités CAEB ?", 
                        "Comment faire une fiche de lecture ?",
                        "Cherche des livres sur l'histoire"
                      ].map((t, i) => (
                          <Button 
                            key={i} 
                            variant="outline" 
                            onClick={() => handleSendMessage(t)} 
                            className="justify-start h-auto py-3 px-4 rounded-xl border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-sm transition-all"
                          >
                              <Sparkles className="w-4 h-4 mr-2 text-blue-500" /> {t}
                          </Button>
                      ))}
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "")}
                    >
                      <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          msg.role === "assistant" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600"
                      )}>
                          {msg.role === "assistant" ? <Library className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                      </div>

                      <div className={cn("flex flex-col gap-2 max-w-[85%]", msg.role === "user" ? "items-end" : "")}>
                          <div className={cn(
                              "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                              msg.role === "assistant" 
                                ? "bg-white border border-slate-200 text-slate-800" 
                                : "bg-blue-600 text-white"
                          )}>
                              {msg.content || (
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                              )}

                              {msg.sources?.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase w-full mb-1">
                                          <Globe className="w-3 h-3" /> Sources consultées
                                      </div>
                                      {msg.sources.map((s, i) => (
                                          <a key={i} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md text-[10px] text-blue-600 hover:underline">
                                              {s.title}
                                          </a>
                                      ))}
                                  </div>
                              )}
                          </div>

                          {msg.recommendations?.length > 0 && (
                              <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar w-full">
                                  {msg.recommendations.map((book, i) => (
                                      <div 
                                          key={i} 
                                          onClick={() => navigate(`/catalog?search=${encodeURIComponent(book)}`)}
                                          className="min-w-[180px] bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-colors"
                                      >
                                          <p className="font-bold text-[12px] text-slate-800 line-clamp-1">{book}</p>
                                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
                                              <Info className="w-3 h-3" /> Voir au catalogue
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-32" />
            </div>
          </div>

          {/* ZONE DE SAISIE */}
          <div className="flex-shrink-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
            <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-lg focus-within:border-blue-400 transition-colors">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-blue-600 shrink-0">
                        <Paperclip className="w-5 h-5" />
                    </Button>
                    
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Posez votre question à Kossi..."
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-2 text-sm resize-none max-h-32 min-h-[40px] text-slate-800"
                        rows={1}
                    />
                    
                    <Button 
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isLoading}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 p-0 shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-3 uppercase tracking-widest opacity-70">
                    Assistant Intelligence Artificielle — CAEB Natitingou
                </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}