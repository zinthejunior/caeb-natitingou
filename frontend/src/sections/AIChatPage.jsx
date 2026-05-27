import { useState, useRef, useEffect } from "react";
import { Bot, ChevronLeft, Send, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
export function AIChatPage({ user, onNavigate }) {
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
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue
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
      const response = await fetch("http://localhost:8001/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: user?.id || "anonymous",
          messages: chatMessages
        })
      });
      if (response.ok) {
        const data = await response.json();
        const botMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "Voici ce que j'ai trouvé pour vous :",
          recommendations: Array.isArray(data.suggested_books) ? data.suggested_books : []
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
  return <div className="flex h-screen bg-[var(--library-bg)] overflow-hidden">
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {
    /* En-tête de la page chat */
  }
        <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--library-surface)] z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shadow-soft">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="font-display font-bold text-lg">Kossi <span className="text-accent text-sm ml-1 opacity-80">Assistant Local</span></h2>
          </div>
          <Button variant="ghost" className="text-muted hover:text-accent gap-2" onClick={() => onNavigate("home")}>
            <ChevronLeft className="w-4 h-4" />
            <span>Retour</span>
          </Button>
        </header>

        {
    /* Chat Messages */
  }
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`flex items-start max-w-[80%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-white" : "bg-accent text-white"}`}>
                  {msg.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl ${msg.role === "user" ? "bg-primary text-white rounded-tr-none" : "bg-white dark:bg-neutral-800 border border-[var(--border-color)] rounded-tl-none shadow-sm"}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>

              {
    /* Affichage des recommandations de livres */
  }
              {msg.recommendations && msg.recommendations.length > 0 && <div className="mt-3 ml-11 flex flex-wrap gap-3">
                  {msg.recommendations.map((book) => <div
    key={String(book.id)}
    onClick={() => onNavigate("book-detail", { bookId: String(book.id) })}
    className="cursor-pointer bg-white dark:bg-neutral-800 border border-[var(--border-color)] p-3 rounded-xl flex items-center gap-3 hover:border-accent transition-colors shadow-sm w-64"
  >
                      <div className="w-12 h-16 bg-neutral-100 dark:bg-neutral-700 rounded object-cover flex-shrink-0" style={{ backgroundImage: `url(${book.couverture || ""})`, backgroundSize: "cover" }} />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm truncate">{String(book.titre)}</p>
                        <p className="text-xs text-muted truncate">{String(book.auteur)}</p>
                        {book.score != null && !Number.isNaN(Number(book.score)) && <p className="text-[10px] text-accent mt-1">
                            Pertinence: {Math.round(Number(book.score) * 100)}%
                          </p>}
                      </div>
                    </div>)}
                </div>}
            </div>)}
          {isLoading && <div className="flex flex-col items-start">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[var(--border-color)] rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>}
          <div ref={messagesEndRef} />
        </div>

        {
    /* Input Area */
  }
        <div className="p-4 bg-[var(--library-surface)] border-t border-[var(--border-color)] pb-24 shrink-0">
          <form
    onSubmit={(e) => {
      e.preventDefault();
      handleSendMessage();
    }}
    className="max-w-4xl mx-auto flex gap-2"
  >
            <input
    type="text"
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    placeholder="Demandez une recommandation de livre..."
    className="flex-1 h-12 rounded-xl border border-[var(--border-color)] bg-transparent px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
    disabled={isLoading}
  />
            <Button
    type="submit"
    className="h-12 w-12 rounded-xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center shrink-0"
    disabled={!inputValue.trim() || isLoading}
  >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </main>
    </div>;
}
