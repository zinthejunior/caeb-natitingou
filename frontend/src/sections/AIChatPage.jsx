import { useState, useRef, useEffect } from "react";
import { 
  Bot, Send, User as UserIcon, Sparkles, Menu, 
  Paperclip, X, FileText, Image as ImageIcon, Settings, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { useLivres, appelAPI, creerSessionChat, ajouterMessageChat, recupererSessionChat } from "@/hooks/useData";
import { getAuthToken } from "@/lib/api";

export function AIChatPage({ user }) {
  const navigate = useNavigate();
  const { livres } = useLivres();
 
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Panneau contextuel
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTitle, setSessionTitle] = useState("Nouvelle conversation");
  const [kossiSettings, setKossiSettings] = useState(() => {
    const saved = localStorage.getItem("kossi_settings");
    return saved ? JSON.parse(saved) : {
      tone: "équilibré",
      source: "catalogue",
      showSources: false
    };
  });
  const [kossiMemory, setKossiMemory] = useState(() => {
    const saved = localStorage.getItem("kossi_memory");
    return saved ? JSON.parse(saved) : {
      enabled: true,
      retainHistory: true,
      level: "court terme"
    };
  });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const suggestionCards = [
    {
      title: "🔍 Rechercher un roman",
      description: "Je cherche un roman d'aventure palpitant...",
      prompt: "Je cherche un roman d'aventure palpitant dans le catalogue"
    },
    {
      title: "✨ Recommander des nouveautés",
      description: "Quelles sont les dernières nouveautés de la bibliothèque ?",
      prompt: "Quelles sont les dernières nouveautés de la bibliothèque ?"
    },
    {
      title: "📚 Clubs de lecture",
      description: "Parle-moi des clubs de lecture de Natitingou...",
      prompt: "Parle-moi des clubs de lecture et de leurs activités"
    },
    {
      title: "📖 Conseils d'abonnement",
      description: "Quelles sont les conditions pour s'abonner ?",
      prompt: "Quelles sont les conditions pour s'abonner et emprunter des livres ?"
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sanitizeHtml = (html) => {
    if (!html) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const allowedTags = [
      "b", "strong", "i", "em", "u", "a", "p", "br", "ul", "ol", "li",
      "span", "div", "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "pre", "code", "img"
    ];
    const allowedAttrs = ["href", "target", "rel", "src", "alt", "title"];

    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      const nodeName = node.nodeName.toLowerCase();
      if (!allowedTags.includes(nodeName)) {
        node.replaceWith(document.createTextNode(node.textContent || ""));
        return;
      }

      for (const attr of Array.from(node.attributes)) {
        if (!allowedAttrs.includes(attr.name.toLowerCase())) {
          node.removeAttribute(attr.name);
        }
      }

      if (node.hasAttribute("href")) {
        const href = node.getAttribute("href") || "";
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
          node.removeAttribute("href");
        } else {
          node.setAttribute("rel", "noreferrer noopener");
          node.setAttribute("target", "_blank");
        }
      }
      if (node.hasAttribute("src")) {
        const src = node.getAttribute("src") || "";
        if (!src.startsWith("http://") && !src.startsWith("https://")) {
          node.removeAttribute("src");
        }
      }
    });

    return doc.body.innerHTML;
  };

  useEffect(() => {
    localStorage.setItem("kossi_settings", JSON.stringify(kossiSettings));
  }, [kossiSettings]);

  useEffect(() => {
    localStorage.setItem("kossi_memory", JSON.stringify(kossiMemory));
  }, [kossiMemory]);

  useEffect(() => {
    let isMounted = true;
    const loadSessions = async () => {
      try {
        const data = await appelAPI("/chat/");
        const sessions = Array.isArray(data) ? data : data.results || [];
        if (isMounted) {
          setChatSessions(sessions);
        }
      } catch (err) {
        console.error("Impossible de charger l'historique Kossi :", err);
      }
    };
    void loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── GESTION DES FICHIERS ──────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (uploadedFiles.length + files.length > 5) {
      alert("Vous ne pouvez téléverser que 5 fichiers maximum.");
      return;
    }
    
    setUploadedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const createNewSession = async () => {
    setIsLoading(true);
    try {
      const session = await creerSessionChat("Discussion Kossi");
      setChatSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setSessionTitle(session.titre || "Discussion Kossi");
      setMessages(session.messages?.map((m) => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content
      })) || []);
      setSidebarOpen(false);
    } catch (err) {
      console.error("Impossible de créer une nouvelle session Kossi :", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSession = async (session) => {
    setIsLoading(true);
    try {
      const loaded = await recupererSessionChat(session.id);
      setActiveSession(loaded);
      setSessionTitle(loaded.titre || "Discussion Kossi");
      setMessages((loaded.messages || []).map((m) => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content
      })));
      setSidebarOpen(false);
    } catch (err) {
      console.error("Impossible de charger la session Kossi :", err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    const type = file.type;
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (type === "application/pdf") return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // ── ENVOI DE MESSAGE ──────────────────────────────────────────────────
  const handleSendMessage = async (textToSend = "") => {
    const value = textToSend.trim() || inputValue.trim();
    if (!value && uploadedFiles.length === 0) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: value || "📎 Fichiers joints",
      files: uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.name) : []
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      let session = activeSession;
      if (!session) {
        session = await creerSessionChat(sessionTitle);
        setChatSessions((prev) => [session, ...prev]);
        setActiveSession(session);
      }

      if (session) {
        await ajouterMessageChat(session.id, value, "user");
      }

      const authToken = getAuthToken() || "";
      const headers = {
        "Content-Type": "application/json"
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const chatMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        files: m.files || []
      }));

      const kossiUrl = import.meta.env.VITE_KOSSI_URL;
      const response = await fetch(`${kossiUrl}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: user?.id,
          messages: chatMessages,
          settings: {
            ...kossiSettings,
            memory: kossiMemory
          }
        })
      });

      if (response.ok) {
        const data = await response.json();

        const recommendations = [];
        if (Array.isArray(data.suggested_books)) {
          data.suggested_books.forEach((title) => {
            if (typeof title === "string") {
              const matchedBook = livres.find(
                (l) => l.titre.toLowerCase().trim() === title.toLowerCase().trim()
              );
              if (matchedBook) {
                recommendations.push(matchedBook);
              } else {
                const partialMatch = livres.find((l) =>
                  l.titre.toLowerCase().includes(title.toLowerCase()) ||
                  title.toLowerCase().includes(l.titre.toLowerCase())
                );
                if (partialMatch) {
                  recommendations.push(partialMatch);
                } else {
                  recommendations.push({
                    id: `temp-${title}`,
                    titre: title,
                    auteur: "Assistant Kossi",
                    couverture: ""
                  });
                }
              }
            } else if (title && typeof title === "object") {
              recommendations.push(title);
            }
          });
        }

        const botMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "Voici ce que j'ai trouvé pour vous :",
          recommendations: recommendations
        };
        setMessages((prev) => [...prev, botMessage]);

        if (session) {
          await ajouterMessageChat(session.id, botMessage.content, "assistant");
          const updatedSession = {
            ...session,
            messages: [
              ...(session.messages || []),
              { id: userMessage.id, role: "user", content: userMessage.content },
              { id: botMessage.id, role: "assistant", content: botMessage.content }
            ]
          };
          setActiveSession(updatedSession);
          setChatSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
        }
      } else {
        throw new Error("Erreur de l'API");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, j'ai rencontré un problème pour analyser votre demande. Veuillez réessayer plus tard."
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendQuickMessage = (promptText) => {
    handleSendMessage(promptText);
  };

  const formatSessionDate = (session) => {
    const date = new Date(session.updated_at || session.created_at);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="min-h-screen bg-[var(--library-bg)]">
      <Navbar user={user} />
      
      <main className="flex-1 pt-30 relative">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* ✨ EN-TÊTE DE BIENVENUE */}
          <div className="flex flex-col items-center justify-center py-8 animate-flow-in">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
              <Bot className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">Bonjour ! Je suis Kossi 🤖</h1>
            <p className="text-muted text-sm">Votre assistant IA pour la Bibliothèque CAEB</p>
          </div>

          {/* 📝 MESSAGES DU CHAT */}
          <div className="space-y-6 pb-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={`flex items-start gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-accent text-white" : "bg-[var(--library-surface)] border border-[var(--border-color)]"}`}>
                    {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4 text-primary" />}
                  </div>
                  
                  <div className={`p-3.5 rounded-2xl ${msg.role === "assistant" ? "bg-[var(--library-surface)] border border-[var(--border-color)]" : "bg-accent text-white"}`}>
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content) }} />
                    
                    {msg.files && msg.files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.files.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs opacity-80">
                            <FileText className="w-3 h-3" />
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3">
                        <p className="text-xs font-bold text-muted uppercase tracking-wider">📚 Livres suggérés</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.recommendations.slice(0, 4).map((book, idx) => (
                            <button
                              key={idx}
                              onClick={() => navigate(`/catalog/${book.id}`)}
                              className="text-left p-2.5 rounded-lg bg-[var(--library-surface-alt)] hover:bg-accent/5 transition-colors border border-transparent hover:border-[var(--border-color)]"
                            >
                              <p className="font-semibold text-xs text-primary truncate">{book.titre}</p>
                              <p className="text-[10px] text-muted truncate">{book.auteur}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[var(--library-surface)] border border-[var(--border-color)] flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}

            {messages.length === 0 && !isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mt-4 animate-slide-up">
                {suggestionCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuickMessage(card.prompt)}
                    className="text-left p-4 rounded-2xl bg-[var(--library-surface)] border border-[var(--border-color)] hover:border-accent hover:shadow-md transition-all duration-300 cursor-pointer group"
                  >
                    <p className="font-medium text-sm text-primary group-hover:text-accent transition-colors mb-1">{card.title}</p>
                    <p className="text-xs text-muted line-clamp-1">{card.description}</p>
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── ZONE DE SAISIE ──────────────────────────────────────────── */}
          <div className="sticky bottom-0 bg-[var(--library-bg)] pt-2 pb-4">
            <div className="max-w-3xl mx-auto">
              
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[var(--library-surface)] rounded-xl border border-[var(--border-color)]">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/5 border border-[var(--border-color)] text-xs">
                      {getFileIcon(file)}
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button 
                        onClick={() => removeFile(index)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center gap-2"
              >
                {/* Bouton téléversement */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 h-10 w-10 rounded-full bg-[var(--library-surface)] border border-[var(--border-color)] hover:border-accent hover:bg-accent/5 transition-colors flex items-center justify-center"
                  disabled={isLoading}
                >
                  <Paperclip className="w-4 h-4 text-muted" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </button>

                {/* ✨ NOUVEAU : Bouton Menu (Historique + Paramètres) */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex-shrink-0 h-10 w-10 rounded-full bg-[var(--library-surface)] border border-[var(--border-color)] hover:border-accent hover:bg-accent/5 transition-colors flex items-center justify-center"
                  disabled={isLoading}
                >
                  <Sparkles className="w-4 h-4 text-muted" />
                </button>

                {/* Input texte */}
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Demandez une recommandation, posez une question..."
                  className="w-full h-12 pl-4 pr-12 rounded-xl border border-[var(--border-color)] bg-[var(--library-surface)] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-sm transition-all text-primary placeholder:text-muted/50"
                  disabled={isLoading}
                />
                
                {/* Bouton envoi */}
                <Button
                  type="submit"
                  className="absolute right-1 h-10 w-10 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shrink-0 shadow-soft transition-all disabled:opacity-50 disabled:hover:bg-accent"
                  disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>

              <p className="text-[10px] text-center text-muted/50 mt-2">
                Kossi peut faire des erreurs. Pensez à vérifier les informations importantes.
              </p>
            </div>
          </div>

        </div>
      </main>
      
            {/* ── PANNEAU CONTEXTUEL (Historique + Paramètres) ──────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Overlay avec animation fade-in */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Panneau avec animation slide-up + zoom */}
          <div className="relative bg-[var(--library-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[80vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h2 className="font-bold text-primary flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Menu Kossi
              </h2>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-full hover:bg-accent/5 transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)] space-y-4">
              
              {/* Section : Nouvelle discussion */}
              <div>
                <button 
                  type="button"
                  onClick={createNewSession}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent/10 hover:bg-accent/15 border border-[var(--border-color)] hover:border-accent transition-colors text-sm font-medium text-primary"
                >
                  <Sparkles className="w-4 h-4 text-accent" />
                  Nouvelle discussion
                </button>
              </div>
              
              {/* Section : Historique */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider px-1 py-2">Discussions récentes</p>
                  <button
                    type="button"
                    onClick={createNewSession}
                    className="text-[10px] font-semibold text-accent hover:text-accent-700 transition-colors"
                  >
                    + Nouvelle discussion
                  </button>
                </div>
                <div className="space-y-1">
                  {chatSessions.length === 0 ? (
                    <p className="text-sm text-muted px-1">Aucune conversation enregistrée pour le moment.</p>
                  ) : (
                    chatSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleLoadSession(session)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/5 text-sm text-muted hover:text-primary transition-colors truncate flex items-center justify-between group"
                      >
                        <span className="truncate flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-muted/50" />
                          {session.titre || "Discussion Kossi"}
                        </span>
                        <span className="text-[10px] text-muted/50 group-hover:text-muted/70">{formatSessionDate(session)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Section : Paramètres Kossi */}
              <div className="border-t border-[var(--border-color)] pt-3">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider px-1 py-2">⚙️ Paramètres Kossi</p>
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-primary px-1">Ton de réponse</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "concise", label: "Court" },
                      { value: "équilibré", label: "Équilibré" },
                      { value: "détaillé", label: "Détaillé" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setKossiSettings((prev) => ({ ...prev, tone: option.value }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${kossiSettings.tone === option.value ? "bg-accent text-white" : "bg-[var(--library-surface)] text-muted hover:bg-accent/5"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-sm font-semibold text-primary px-1">Source de réponse</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "catalogue", label: "Catalogue CAEB" },
                      { value: "web", label: "Web public" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setKossiSettings((prev) => ({ ...prev, source: option.value }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${kossiSettings.source === option.value ? "bg-accent text-white" : "bg-[var(--library-surface)] text-muted hover:bg-accent/5"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--library-surface)] border border-[var(--border-color)] text-sm text-muted">
                    <span>Afficher les sources</span>
                    <input
                      type="checkbox"
                      checked={kossiSettings.showSources}
                      onChange={(e) => setKossiSettings((prev) => ({ ...prev, showSources: e.target.checked }))}
                      className="h-4 w-4 rounded border border-[var(--border-color)] accent-accent"
                    />
                  </label>
                </div>
              </div>

              {/* Section : Mémoire de Kossi */}
              <div className="border-t border-[var(--border-color)] pt-3">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider px-1 py-2">🧠 Mémoire de Kossi</p>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--library-surface)] border border-[var(--border-color)] text-sm text-muted">
                    <span>Activer la mémoire</span>
                    <input
                      type="checkbox"
                      checked={kossiMemory.enabled}
                      onChange={(e) => setKossiMemory((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="h-4 w-4 rounded border border-[var(--border-color)] accent-accent"
                    />
                  </label>
                  <div className="text-sm font-semibold text-primary px-1">Type de mémoire</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "court terme", label: "Court terme" },
                      { value: "long terme", label: "Long terme" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setKossiMemory((prev) => ({ ...prev, level: option.value }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${kossiMemory.level === option.value ? "bg-accent text-white" : "bg-[var(--library-surface)] text-muted hover:bg-accent/5"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--library-surface)] border border-[var(--border-color)] text-sm text-muted">
                    <span>Conserver l’historique</span>
                    <input
                      type="checkbox"
                      checked={kossiMemory.retainHistory}
                      onChange={(e) => setKossiMemory((prev) => ({ ...prev, retainHistory: e.target.checked }))}
                      className="h-4 w-4 rounded border border-[var(--border-color)] accent-accent"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setKossiMemory({ enabled: false, retainHistory: false, level: "court terme" });
                      localStorage.removeItem("kossi_memory");
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    Réinitialiser la mémoire
                  </button>
                </div>
              </div>
              
              {/* Pied du panneau */}
              <div className="border-t border-[var(--border-color)] pt-3 text-[10px] text-muted/50 text-center">
                <p>Kossi v1.0 • Bibliothèque CAEB</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}