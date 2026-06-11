"use client";

// =============================================================================
// CHAT CONTAINER - Interface style ChatGPT
// =============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { WelcomeScreen } from "./welcome-screen";
import { Sidebar } from "./sidebar";
import { ChatHeader } from "./chat-header";
import type { Message, UserProfile, ChatState, Conversation, Source } from "@/lib/types";
import { sendMessageStream, sendFeedback, generateSessionId } from "@/lib/api";
import { BookOpen, Sparkles, X } from "lucide-react";

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [userProfile] = useState<UserProfile>({
    type: "etudiant",
    interests: [],
    language: "fr",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeSources, setActiveSources] = useState<Source[] | null>(null);
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isMounted, setIsMounted] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialisation du thème et de la largeur d'écran
  useEffect(() => {
    // Thème
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(systemPrefersDark ? "dark" : "light");
      if (systemPrefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    // Sidebar responsive
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedSessionId = localStorage.getItem("kossi-session-id");
    const storedConversations = localStorage.getItem("kossi-conversations");

    setSessionId(storedSessionId || generateSessionId());

    if (storedConversations) {
      try {
        setConversations(JSON.parse(storedConversations));
      } catch {
        setConversations([]);
      }
    }

    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("kossi-session-id", sessionId);
  }, [sessionId, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("kossi-conversations", JSON.stringify(conversations));
  }, [conversations, isMounted]);

  useEffect(() => {
    if (!messages.length || !isMounted) return;

    const title =
      messages.find((m) => m.role === "user")?.content.trim().slice(0, 60) ||
      "Conversation sans titre";
    const updatedAt = new Date();

    if (activeConversationId) {
      const existing = conversations.find((conv) => conv.id === activeConversationId);
      if (existing && existing.messages === messages) {
        return;
      }

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversationId
            ? { ...conversation, title, messages, updatedAt, session_id: sessionId }
            : conversation
        )
      );
      return;
    }

    const existingSessionConversation = conversations.find((conv) => conv.session_id === sessionId);
    if (existingSessionConversation) {
      setActiveConversationId(existingSessionConversation.id);
      return;
    }

    const newConversation = {
      id: `conversation-${Date.now()}`,
      session_id: sessionId,
      title,
      updatedAt,
      messages,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  }, [messages, activeConversationId, sessionId, conversations, isMounted]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const saveCurrentConversation = useCallback(() => {
    if (!messages.length) return;

    const title =
      messages.find((m) => m.role === "user")?.content.trim().slice(0, 60) ||
      "Conversation sans titre";
    const updatedAt = new Date();

    setConversations((prev) => {
      // Check if conversation exists
      if (activeConversationId) {
        return prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, title, updatedAt, messages, session_id: sessionId }
            : c
        );
      }
      return [
        {
          id: `conversation-${Date.now()}`,
          session_id: sessionId,
          title,
          updatedAt,
          messages,
        },
        ...prev,
      ];
    });
  }, [messages, activeConversationId]);

  const handleNewChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    saveCurrentConversation();
    setMessages([]);
    setStreamingMessage("");
    setChatState("idle");
    setError(null);
    setSessionId(generateSessionId());
    setActiveConversationId(null);
    
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [saveCurrentConversation]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      const selected = conversations.find((conv) => conv.id === conversationId);
      if (!selected) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setMessages(selected.messages);
      setChatState("idle");
      setError(null);
      setSessionId(selected.session_id || generateSessionId());
      setActiveConversationId(selected.id);
      
      // Close sidebar on mobile
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    },
    [conversations]
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
        setChatState("idle");
      }
    },
    [activeConversationId]
  );

  const handleSendMessage = useCallback(async (content: string, customHistory?: Message[]) => {
    if (!content.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setError(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    // If customHistory is supplied, we truncate the conversation up to that point
    const updatedMessages = customHistory
      ? [...customHistory, userMessage]
      : [...messages, userMessage];

    setMessages(updatedMessages);
    setChatState("loading");
    setStreamingMessage("");

    try {
      const historyForApi = updatedMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await sendMessageStream(
        {
          message: content.trim(),
          history: historyForApi,
          user: userProfile,
          session_id: sessionId,
          stream: true,
        },
        (chunk) => {
          setChatState("streaming");
          setStreamingMessage((prev) => prev + chunk);
        },
        (fullResponse, metadata) => {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: fullResponse,
            timestamp: new Date(),
            metadata: {
              agent: metadata?.agent || "orchestrator",
              sources: metadata?.sources,
              cached: metadata?.cached || false,
              processingTime: metadata?.processing_time,
            },
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingMessage("");
          setChatState("idle");
        },
        (errorMessage) => {
          setError(errorMessage);
          setChatState("error");
          setStreamingMessage("");
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
      setChatState("error");
      setStreamingMessage("");
    }
  }, [messages, userProfile]);

  const handleRegenerate = useCallback(() => {
    if (messages.length === 0) return;

    // Find the last user message index
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;

    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[actualIdx];

    // Truncate everything from that user message onwards
    const historyBefore = messages.slice(0, actualIdx);

    handleSendMessage(lastUserMsg.content, historyBefore);
  }, [messages, handleSendMessage]);

  const handleFeedback = useCallback(
    async (messageId: string, isHelpful: boolean) => {
      try {
        await sendFeedback(sessionId, messageId, isHelpful);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, feedback: isHelpful ? "helpful" : "not_helpful" }
              : msg
          )
        );
      } catch (err) {
        console.error("[Kossi] Erreur feedback:", err);
      }
    },
    [sessionId]
  );

  const handleShowSources = useCallback((sources: Source[] | undefined | null) => {
    setActiveSources(Array.isArray(sources) ? sources : []);
    setIsSourcesPanelOpen(true);
  }, []);

  const handleCloseSources = useCallback(() => {
    setActiveSources(null);
    setIsSourcesPanelOpen(false);
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSendMessage(suggestion);
    },
    [handleSendMessage]
  );

  const showWelcome = messages.length === 0 && chatState === "idle";
  const isInputDisabled = chatState === "loading" || chatState === "streaming";

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewChat={handleNewChat}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <ChatHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Main chat viewport */}
        <main className="flex-1 overflow-y-auto flex flex-col scrollbar-thin" ref={messagesContainerRef}>
          <div className="flex-1 w-full max-w-[768px] mx-auto px-4 py-6 sm:px-6">
            {showWelcome ? (
              <WelcomeScreen onSendSuggestion={handleSuggestionClick} />
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={false}
                    onFeedback={
                      message.role === "assistant"
                        ? (isHelpful) => handleFeedback(message.id, isHelpful)
                        : undefined
                    }
                    onEditSubmit={
                      message.role === "user"
                        ? (newContent) => {
                            const editIdx = messages.findIndex((m) => m.id === message.id);
                            if (editIdx !== -1) {
                              handleSendMessage(newContent, messages.slice(0, editIdx));
                            }
                          }
                        : undefined
                    }
                    onRegenerate={
                      message.role === "assistant" && index === messages.length - 1
                        ? handleRegenerate
                        : undefined
                    }
                    onShowSources={
                      message.role === "assistant" && message.metadata?.sources?.length
                        ? () => handleShowSources(message.metadata?.sources)
                        : undefined
                    }
                  />
                ))}

                {streamingMessage && (
                  <ChatMessage
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingMessage,
                      timestamp: new Date(),
                    }}
                    isStreaming={true}
                  />
                )}

                {chatState === "loading" && !streamingMessage && (
                  <div className="flex w-full gap-4 py-6 animate-message-in select-none">
                    <div className="flex-shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Sparkles className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Kossi AI</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 py-2.5">
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex w-full gap-4 py-6 animate-message-in border-t border-rose-100/50 dark:border-rose-950/20 bg-rose-50/10 p-4 rounded-xl">
                    <div className="flex-shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm font-mono text-sm font-bold">
                        !
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Erreur de communication</span>
                      </div>
                      <p className="text-sm text-rose-700 dark:text-rose-350 leading-relaxed">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="self-start text-xs font-semibold text-rose-800 dark:text-rose-400 hover:underline transition-colors"
                      >
                        Masquer l'erreur
                      </button>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Input box section */}
        <div className="w-full bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 px-4 sm:px-6 bg-background">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isInputDisabled}
            placeholder="Poser une question à Kossi..."
          />
          <p className="text-[10px] text-center text-muted-foreground mt-2.5 select-none">
            Kossi AI peut faire des erreurs. Veuillez vérifier les informations importantes.
          </p>
        </div>
      </div>

      <aside className={`hidden xl:flex xl:w-[320px] xl:flex-col xl:border-l xl:border-border/50 xl:bg-slate-50 xl:dark:bg-slate-950 xl:dark:border-slate-800 ${isSourcesPanelOpen ? "xl:flex" : "xl:hidden"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/70 bg-background/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="w-4 h-4" />
            Sources</div>
          <button
            onClick={handleCloseSources}
            className="rounded-lg p-2 text-slate-500 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Fermer le panneau des sources"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeSources && activeSources.length > 0 ? (
            <div className="space-y-3">
              {activeSources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-border/70 bg-background p-4 shadow-sm transition hover:border-primary/40"
                >
                  <p className="text-sm font-semibold text-foreground truncate">{source.title || "Source"}</p>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{source.snippet || source.url}</p>
                  <p className="mt-3 text-[11px] text-primary font-medium">Voir la source</p>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background p-6 text-sm text-muted-foreground">
              Cliquez sur l’icône <span className="inline-flex items-center gap-1"><BookOpen className="w-4 h-4" /> Sources</span> sous une réponse pour voir toutes les sources ici.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
