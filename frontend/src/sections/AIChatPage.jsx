import { useState, useRef, useEffect } from "react";
import { Bot, ChevronLeft, Send, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLivres } from "@/hooks/useData";

export function AIChatPage({ user }) {
  const navigate = useNavigate();
  const { livres } = useLivres();
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content: `Bonjour ${user?.prenom || ""} ! Je suis Kossi, votre assistant intelligent. Je peux vous recommander des livres parmi nos 17 000 ouvrages en fonction de vos goûts.`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestionCards = [
    {
      title: "🔍 Rechercher un roman",
      description: "Je cherche un roman d'aventure palpitant...",
      prompt: "Je cherche un roman d'aventure palpitant dans le catalogue"
    },
    {
      title: "📚 Recommander des nouveautés",
      description: "Quelles sont les dernières nouveautés de la bibliothèque ?",
      prompt: "Quelles sont les dernières nouveautés de la bibliothèque ?"
    },
    {
      title: "👥 Clubs de lecture",
      description: "Parle-moi des clubs de lecture de Natitingou...",
      prompt: "Parle-moi des clubs de lecture et de leurs activités"
    },
    {
      title: "💡 Conseils d'abonnement",
      description: "Quelles sont les conditions pour s'abonner ?",
      prompt: "Quelles sont les conditions pour s'abonner et emprunter des livres ?"
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend = "") => {
    const value = textToSend.trim() || inputValue.trim();
    if (!value) return;
    
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: value
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      const authToken = localStorage.getItem("caeb_token") || "";
      const headers = {
        "Content-Type": "application/json"
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const chatMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content
      }));
      
      const kossiUrl = import.meta.env.VITE_KOSSI_URL || "http://localhost:8001";
      const response = await fetch(`${kossiUrl}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: user?.id || "anonymous",
          messages: chatMessages
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Résoudre les titres des livres suggérés (chaînes de caractères) en objets livres complets du catalogue
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
                // Recherche par correspondance partielle
                const partialMatch = livres.find((l) =>
                  l.titre.toLowerCase().includes(title.toLowerCase()) ||
                  title.toLowerCase().includes(l.titre.toLowerCase())
                );
                if (partialMatch) {
                  recommendations.push(partialMatch);
                } else {
                  // Fallback temporaire pour éviter un crash si le livre n'est pas dans le catalogue
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

  return (
    <div className="flex h-screen bg-[var(--library-bg)] overflow-hidden">
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* En-tête de la page chat */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--library-surface)] z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shadow-soft">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-lg">
              Kossi <span className="text-accent text-sm ml-1 opacity-80">Assistant Local</span>
            </h2>
          </div>
          <Button variant="ghost" className="text-muted hover:text-accent gap-2" onClick={() => navigate("/home")}>
            <ChevronLeft className="w-4 h-4" />
            <span>Retour</span>
          </Button>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="max-w-3xl mx-auto w-full space-y-8 py-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-flow-in`}>
                <div className={`flex items-start w-full gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role !== "user" && (
                    <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0 shadow-soft">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}
                  <div className={`flex-1 ${msg.role === "user" ? "max-w-[85%] flex justify-end" : ""}`}>
                    {msg.role === "user" ? (
                      <div className="p-4 rounded-3xl bg-[var(--library-surface)] dark:bg-neutral-800 border border-[var(--border-color)] text-primary dark:text-neutral-100 shadow-sm">
                        <p className="text-[15px] leading-relaxed whitespace-pre-line">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="text-[15px] leading-relaxed text-primary dark:text-neutral-100 whitespace-pre-line">{msg.content}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Affichage des recommandations de livres */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="mt-4 w-full" style={{ marginLeft: "3.25rem" }}>
                    <p className="text-xs font-bold text-accent uppercase tracking-wider mb-3">Recommandations CAEB :</p>
                    <div className="flex flex-wrap gap-3">
                      {msg.recommendations.map((book) => (
                        <div
                          key={String(book.id)}
                          onClick={() => {
                            if (!book.id.startsWith("temp-")) {
                              navigate(`/catalog/${book.id}`);
                            }
                          }}
                          className={`bg-white dark:bg-neutral-800 border border-[var(--border-color)] p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-sm w-64 ${!book.id.startsWith("temp-") ? "cursor-pointer hover:border-accent hover:-translate-y-0.5 hover:shadow-md" : "opacity-80"}`}
                        >
                          <div
                            className="w-12 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-lg object-cover flex-shrink-0"
                            style={{ backgroundImage: `url(${book.couverture || "/default_cover.png"})`, backgroundSize: "cover" }}
                          />
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-sm truncate text-primary dark:text-neutral-100">{String(book.titre)}</p>
                            <p className="text-xs text-muted truncate">{String(book.auteur)}</p>
                            {!book.id.startsWith("temp-") && (
                              <span className="text-[10px] text-accent font-semibold mt-1 block">Voir détails</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Suggestions rapides affichées si début de conversation */}
            {messages.length === 1 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl animate-flow-in" style={{ marginLeft: "3.25rem", animationDelay: "0.2s" }}>
                {suggestionCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuickMessage(card.prompt)}
                    className="text-left p-4 rounded-2xl bg-[var(--library-surface)] border border-[var(--border-color)] hover:border-accent/40 hover:bg-accent/5 transition-all duration-300 shadow-soft cursor-pointer group hover:-translate-y-0.5"
                  >
                    <p className="font-bold text-[14px] text-primary group-hover:text-accent transition-colors mb-1">{card.title}</p>
                    <p className="text-xs text-muted line-clamp-1">{card.description}</p>
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-start animate-flow-in">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0 shadow-soft">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="p-4 rounded-3xl bg-[var(--library-surface)] dark:bg-neutral-800 border border-[var(--border-color)] shadow-sm flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area (ChatGPT Style) */}
        <div className="p-4 bg-gradient-to-t from-[var(--library-bg)] to-transparent pb-24 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Demandez une recommandation, posez une question..."
                className="w-full h-14 pl-5 pr-14 rounded-3xl border border-[var(--border-color)] bg-[var(--library-surface)] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-glow transition-all text-primary"
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="absolute right-2 h-10 w-10 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center shrink-0 shadow-soft"
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-[10px] text-center text-muted mt-2">
              Kossi peut faire des erreurs. Pensez à vérifier les informations importantes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
