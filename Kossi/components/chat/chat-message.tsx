"use client";

import { cn } from "@/lib/utils";
import type { Message, Source } from "@/lib/types";
import { ThumbsUp, ThumbsDown, Copy, RotateCw, Check, Sparkles, BookOpen, ExternalLink, Bookmark, Edit3 } from "lucide-react";
import { useState } from "react";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onFeedback?: (isHelpful: boolean) => void;
  onEditSubmit?: (newContent: string) => void;
  onRegenerate?: () => void;
  onShowSources?: () => void;
}

// Parses inline formatting like **bold** and `code`
function parseInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-muted dark:bg-slate-800 text-rose-505 dark:text-rose-400 font-mono text-xs border border-border/40">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[#2d2d2d] bg-[#1d1d1f] shadow-lg select-text text-slate-100">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-xs font-semibold text-slate-350 select-none">
        <span className="uppercase tracking-wider text-[10px]">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors duration-150 py-0.5 px-1.5 rounded hover:bg-[#3d3d3d]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] text-blue-400">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copier le code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// A sleek, lightweight markdown-like parser for a beautiful message layout with table support
function renderMessageContent(content: string, isStreaming: boolean) {
  if (!content) return null;

  // Split content by code blocks: ```code```
  const blocks: Array<{ type: "text" | "code"; content: string }> = [];
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      blocks.push({ type: "text", content: textBefore });
    }
    blocks.push({ type: "code", content: match[1] });
    lastIndex = regex.lastIndex;
  }

  const textAfter = content.substring(lastIndex);
  if (textAfter) {
    blocks.push({ type: "text", content: textAfter });
  }

  // Parses markdown tables
  function parseTable(text: string) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;

    const isTable = lines.every(line => line.includes("|"));
    if (!isTable) return null;

    const rows = lines.map(line => {
      return line
        .split("|")
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    });

    const separatorIdx = rows.findIndex(row => row.every(cell => /^[:-]+$/.test(cell)));
    
    let headers: string[] = [];
    let bodyRows: string[][] = [];

    if (separatorIdx !== -1) {
      if (separatorIdx > 0) {
        headers = rows[separatorIdx - 1];
        bodyRows = [
          ...rows.slice(0, separatorIdx - 1),
          ...rows.slice(separatorIdx + 1)
        ];
      } else {
        bodyRows = rows.slice(separatorIdx + 1);
      }
    } else {
      headers = rows[0];
      bodyRows = rows.slice(1);
    }

    return { headers, rows: bodyRows };
  }

  return blocks.map((block, idx) => {
    if (block.type === "code") {
      const innerMatch = block.content.match(/^(\w*)\n([\s\S]*)$/);
      const language = innerMatch ? innerMatch[1] : "";
      const code = innerMatch ? innerMatch[2].trim() : block.content.trim();
      return <CodeBlock key={idx} language={language} code={code} />;
    }

    const lines = block.content.split("\n");
    const elements: React.ReactNode[] = [];
    let currentTableLines: string[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];

    const flushTable = () => {
      if (currentTableLines.length > 0) {
        const tableData = parseTable(currentTableLines.join("\n"));
        if (tableData) {
          elements.push(
            <div key={`table-${elements.length}`} className="markdown-table-wrapper animate-fade-in">
              <table className="markdown-table">
                {tableData.headers.length > 0 && (
                  <thead>
                    <tr>
                      {tableData.headers.map((h, i) => (
                        <th key={i}>{parseInlineFormatting(h)}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {tableData.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{parseInlineFormatting(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        } else {
          currentTableLines.forEach((line, lIdx) => {
            elements.push(
              <p key={`p-t-${elements.length}-${lIdx}`} className="text-foreground/90 leading-relaxed text-sm my-2">
                {parseInlineFormatting(line)}
              </p>
            );
          });
        }
        currentTableLines = [];
      }
    };

    const flushList = () => {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-1.5 my-3.5 pl-1.5">
            {listItems}
          </ul>
        );
        inList = false;
        listItems = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.trim();

      // Check table line
      if (cleanLine.startsWith("|")) {
        flushList();
        currentTableLines.push(line);
        continue;
      } else {
        flushTable();
      }

      // Check headers
      if (cleanLine.startsWith("### ")) {
        flushList();
        elements.push(
          <h4 key={i} className="text-sm font-bold text-foreground mt-5 mb-2.5">
            {parseInlineFormatting(cleanLine.slice(4))}
          </h4>
        );
        continue;
      }
      if (cleanLine.startsWith("## ")) {
        flushList();
        elements.push(
          <h3 key={i} className="text-base font-bold text-foreground mt-6 mb-3">
            {parseInlineFormatting(cleanLine.slice(3))}
          </h3>
        );
        continue;
      }
      if (cleanLine.startsWith("# ")) {
        flushList();
        elements.push(
          <h2 key={i} className="text-lg font-bold text-foreground mt-7 mb-4">
            {parseInlineFormatting(cleanLine.slice(2))}
          </h2>
        );
        continue;
      }

      // Check blockquote
      if (cleanLine.startsWith(">")) {
        flushList();
        elements.push(
          <blockquote key={i} className="border-l-4 border-primary/60 pl-4 py-2 my-4 italic text-muted-foreground bg-muted/40 rounded-r-lg">
            {parseInlineFormatting(cleanLine.slice(1).trim())}
          </blockquote>
        );
        continue;
      }

      // Bullet List
      if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(
          <li key={i} className="text-foreground/90 leading-relaxed text-sm ml-4 list-disc pl-1">
            {parseInlineFormatting(cleanLine.slice(2))}
          </li>
        );
        continue;
      }

      // Numbered List
      const numberedMatch = cleanLine.match(/^(\d+)\.\s(.*)/);
      if (numberedMatch) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(
          <li key={i} className="text-foreground/90 leading-relaxed text-sm ml-4 list-decimal pl-1" value={parseInt(numberedMatch[1], 10)}>
            {parseInlineFormatting(numberedMatch[2])}
          </li>
        );
        continue;
      }

      if (cleanLine === "") {
        flushList();
        elements.push(<div key={i} className="h-2" />);
      } else {
        flushList();
        const isLastLine = i === lines.length - 1 && idx === blocks.length - 1;
        elements.push(
          <p key={i} className={cn("text-foreground/95 leading-relaxed text-sm my-2", isLastLine && isStreaming && "streaming-cursor")}>
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }

    flushTable();
    flushList();

    return elements;
  });
}

export function ChatMessage({
  message,
  isStreaming = false,
  onFeedback,
  onEditSubmit,
  onRegenerate,
  onShowSources,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleEditSubmit = () => {
    if (editValue.trim() && onEditSubmit) {
      onEditSubmit(editValue.trim());
      setIsEditing(false);
    }
  };

  if (isUser) {
    return (
      <div className="group flex w-full flex-col items-end py-3.5 animate-message-in select-text">
        {isEditing ? (
          <div className="w-full max-w-[80%] flex flex-col gap-2 rounded-2xl p-3 border border-border bg-muted/30">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full min-h-[80px] p-2 bg-background text-foreground text-sm border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y font-sans leading-relaxed"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditValue(message.content);
                  setIsEditing(false);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditSubmit}
                className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/95 transition-all shadow-sm"
              >
                Enregistrer & Envoyer
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-secondary text-secondary-foreground shadow-sm border border-border/30 text-sm leading-relaxed whitespace-pre-wrap select-text">
              {message.content}
            </div>

            {/* Actions for User bubble, shown under the bubble on hover */}
            <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none pr-1">
              <button
                onClick={handleCopy}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border/30"
                title="Copier le message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-blue-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {onEditSubmit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border/30"
                  title="Modifier le message"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="group flex w-full gap-4 py-5 animate-message-in select-text border-b border-border/20">
      {/* Kossi AI Avatar */}
      <div className="flex-shrink-0 select-none">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-[1.02] transition-transform">
          <Sparkles className="w-4.5 h-4.5" />
        </div>
      </div>

      {/* Message Content & Actions Container */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Name and optional Agent indicator */}
        <div className="flex items-center gap-2 select-none">
          <span className="text-xs font-bold text-foreground">Kossi AI</span>
          {message.metadata?.agent && message.metadata?.agent !== "orchestrator" && (
            <span className="inline-flex items-center text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold border border-blue-500/10">
              {message.metadata?.agent}
            </span>
          )}
          {message.timestamp && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Content text */}
        <div className="text-foreground text-sm space-y-1">
          {renderMessageContent(message.content, isStreaming)}
        </div>

        {/* Icon juste sous le message du LLM */}
        {onShowSources ? (
          <button
            onClick={onShowSources}
            className="mt-3 inline-flex items-center gap-2 text-slate-500 text-xs font-semibold hover:text-foreground hover:bg-muted rounded-lg px-2 py-1 transition-colors"
            type="button"
          >
            <BookOpen className="w-4 h-4" />
            <span>Voir les sources</span>
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
            <BookOpen className="w-4 h-4" />
            <span>Sources</span>
          </div>
        )}

        {/* Actions Toolbar - shown under bubble on hover */}
        <div className="flex items-center gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none">
          <button
            onClick={handleCopy}
            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border/30"
            title="Copier la réponse"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-blue-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border/30"
              title="Régénérer la réponse"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {onFeedback && (
            <div className="flex items-center gap-0.5 border-l border-border pl-1.5">
              <button
                onClick={() => onFeedback(true)}
                className={cn(
                  "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:bg-muted transition-all border border-transparent hover:border-border/30",
                  message.feedback === "helpful" ? "text-blue-500 bg-muted" : "hover:text-blue-500"
                )}
                title="Utile"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onFeedback(false)}
                className={cn(
                  "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg text-slate-400 hover:bg-muted transition-all border border-transparent hover:border-border/30",
                  message.feedback === "not_helpful" ? "text-rose-500 bg-muted" : "hover:text-rose-500"
                )}
                title="Pas utile"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Sources consultées Block */}
        {Array.isArray(message.metadata?.sources) && message.metadata?.sources.length ? (
          <div className="mt-3.5 rounded-xl border border-border/80 bg-muted/20 dark:bg-slate-900/10 p-3 shadow-sm animate-fade-in max-w-[800px]">
            <div className="flex items-center gap-1.5 mb-2 select-none">
              <Bookmark className="w-3.5 h-3.5 text-slate-450" />
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Sources consultées</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.metadata?.sources?.map((source: Source, i: number) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col p-2.5 rounded-lg border border-border bg-card hover:border-blue-500/40 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-foreground/80 truncate group-hover:text-blue-600 transition-colors">
                      {source.title || "Source"}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  {source.snippet && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {source.snippet}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
