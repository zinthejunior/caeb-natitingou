"use client";

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Poser une question à Kossi...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;
    onSendMessage(trimmedMessage);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[768px] mx-auto select-none">
      <div 
        className={cn(
          "flex items-end gap-2 rounded-[24px] border border-border/80 bg-background dark:bg-[#2f2f2f]/30 p-2.5 transition-all duration-300 shadow-sm",
          "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 focus-within:shadow-md"
        )}
      >
        {/* Attachment Button */}
        <button
          type="button"
          className="flex h-8.5 w-8.5 items-center justify-center rounded-full text-slate-500 dark:text-slate-450 hover:bg-muted dark:hover:bg-slate-800 hover:text-foreground transition-all duration-200 flex-shrink-0 mb-0.5 ml-0.5 border border-transparent active:scale-95"
          aria-label="Ajouter un fichier"
          disabled={disabled || isLoading}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "flex-1 max-h-[200px] min-h-[36px] resize-none border-0 bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 leading-relaxed font-sans scrollbar-none",
            (disabled || isLoading) && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Message pour Kossi"
        />

        {/* Send Button (ChatGPT style: circular solid color with ArrowUp) */}
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            "flex h-8.5 w-8.5 items-center justify-center rounded-full transition-all duration-300 flex-shrink-0 mb-0.5 mr-0.5",
            canSend
              ? "bg-[#0f0f0f] text-white hover:bg-[#2f2f2f] dark:bg-white dark:text-[#0f0f0f] dark:hover:bg-slate-200 scale-100 hover:scale-105 active:scale-95 shadow-sm"
              : "bg-[#e5e5e5]/80 text-[#a1a1a1] dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
          )}
          aria-label="Envoyer le message"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </form>
  );
}
