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
import type { Message, UserProfile, ChatState, Conversation } from "@/lib/types";
import { sendMessageStream, sendFeedback, generateSessionId } from "@/lib/api";

export function ChatContainer() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId());
  const [userProfile] = useState<UserProfile>({
    type: "etudiant",
    interests: [],
    language: "fr",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const saveCurrentConversation = useCallback(() => {
    if (!messages.length) return;

    const title = messages.find((m) => m.role === "user")?.content.trim().slice(0, 60) || "Conversation sans titre";
    const updatedAt = new Date();

    setConversations((prev) => [
      {
        id: `conversation-${Date.now()}`,
        title,
        updatedAt,
        messages,
      },
      ...prev,
    ]);
  }, [messages]);

  // Nouvelle discussion
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
    setIsSidebarOpen(false);
  }, [saveCurrentConversation]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    const selected = conversations.find((conv) => conv.id === conversationId);
    if (!selected) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setMessages(selected.messages);
    setChatState("idle");
    setError(null);
    setActiveConversationId(selected.id);
    setIsSidebarOpen(false);
  }, [conversations]);

  const handleDeleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
      setChatState("idle");
    }
  }, [activeConversationId]);

  // Envoyer un message
  const handleSendMessage = useCallback(async (content: string) => {
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
    
    setMessages((prev) => [...prev, userMessage]);
    setChatState("loading");
    setStreamingMessage("");
    
    try {
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      
      await sendMessageStream(
        {
          message: content.trim(),
          history: historyForApi,
          user: userProfile,
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
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
      setChatState("error");
      setStreamingMessage("");
    }
  }, [messages, sessionId, userProfile]);

  // Feedback
  const handleFeedback = useCallback(async (messageId: string, isHelpful: boolean) => {
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
      console.error("[v0] Erreur envoi feedback:", err);
    }
  }, [sessionId]);

  // Suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSendMessage(suggestion);
  }, [handleSendMessage]);

  const showWelcome = messages.length === 0 && chatState === "idle";
  const isInputDisabled = chatState === "loading" || chatState === "streaming";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewChat={handleNewChat}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <ChatHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-hidden">
          <div className="mx-auto flex h-full max-w-[1200px] flex-col px-4 py-4 sm:px-6">
            <div className="flex h-full flex-col overflow-hidden rounded-[32px] border border-blue-100 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-5 sm:p-6"
              >
                {showWelcome ? (
                  <WelcomeScreen onSendSuggestion={handleSuggestionClick} />
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onFeedback={
                          message.role === "assistant"
                            ? (isHelpful) => handleFeedback(message.id, isHelpful)
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
                      <div className="py-6">
                        <div className="container-chat">
                          <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <KossiIcon />
                            </div>
                            <div className="flex gap-1 items-center pt-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="container-chat py-4">
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-3xl text-destructive text-sm">
                          <p>{error}</p>
                          <button
                            onClick={() => setError(null)}
                            className="mt-2 text-xs underline hover:no-underline"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-blue-100 bg-blue-50/70 p-4 sm:p-5">
                <div className="mx-auto max-w-5xl">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={isInputDisabled}
                    placeholder={
                      chatState === "streaming"
                        ? "Kossi écrit..."
                        : "Envoyer un message"
                    }
                  />
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    Kossi peut faire des erreurs. Vérifiez les informations importantes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function KossiIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-5 h-5 text-foreground">
      <circle cx="32" cy="16" r="10" fill="currentColor" opacity="0.12" />
      <path
        d="M20 44c0-6.627 5.373-12 12-12s12 5.373 12 12v6H20v-6Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M16 34h32v6H16zM22 22h4v8h-4zm16 0h4v8h-4z"
        fill="currentColor"
      />
      <path
        d="M22 46h20l4 6H18l4-6Z"
        fill="currentColor"
      />
      <path
        d="M18 30c0 5.523 4.477 10 10 10h8c5.523 0 10-4.477 10-10v-8c0-5.523-4.477-10-10-10H28c-5.523 0-10 4.477-10 10v8Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M18 30h28"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
