// AIChatPage.tsx — Assistant IA CAEB "Koffi"
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ThumbsUp, ThumbsDown, Sparkles, BookOpen, RefreshCw, ChevronDown, Bot, User as UserIcon, Trash2, Library, Clock, Users } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { User, Book } from '@/types';
import { useBooks } from '@/hooks/useData';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  rating?: 'up' | 'down' | null;
  bookRefs?: BookRef[];
}

interface BookRef {
  id: string;
  title: string;
  author: string;
  genre: string;
  cover?: string;
  rating: number;
}

interface AIChatPageProps {
  user: User | null;
  onNavigate: (view: string, params?: Record<string, unknown>) => void;
}

const QUICK_SUGGESTIONS = [
  { label: '📚 Que lire ce mois-ci ?', prompt: 'Peux-tu me recommander un livre pour ce mois-ci ?' },
  { label: '🕵️ Un bon thriller', prompt: 'Recommande-moi un thriller haletant du catalogue.' },
  { label: '🧒 Pour mon enfant', prompt: 'Quels livres conseilles-tu pour un enfant de 8 à 12 ans ?' },
  { label: '🔬 Science-fiction', prompt: 'Je cherche un roman de science-fiction captivant.' },
  { label: '🕐 Horaires CAEB', prompt: 'Quels sont les horaires d\'ouverture de la bibliothèque ?' },
  { label: '🤖 Labo IA', prompt: 'Comment fonctionne le laboratoire IA de la CAEB ?' },
  { label: '🎭 Clubs de lecture', prompt: 'Quels clubs de lecture sont disponibles à la CAEB ?' },
  { label: '📖 Devenir membre', prompt: 'Comment devenir membre de la bibliothèque CAEB ?' },
];

function buildSystemPrompt(userName: string, catalogSample: string): string {
  return `Tu es Koffi, l'assistant bibliothécaire de la CAEB (Centre d'Apprentissage et de l'Éducation de Base) de Natitingou, au nord du Bénin. Tu es chaleureux, cultivé, proche des lecteurs — comme un bibliothécaire de confiance qui connaît ses habitués.

RÈGLES IMPORTANTES :
- Tu t'exprimes uniquement en français, avec un ton chaleureux et personnel.
- Tu connais le prénom de l'utilisateur : ${userName}. Utilise-le naturellement, sans en abuser.
- Quand tu recommandes des livres, cite des titres réels du catalogue CAEB si possible (voir ci-dessous). Formule la recommandation avec passion et sincérité, comme si tu venais de lire le livre toi-même.
- Pour les questions sur la bibliothèque, voici les infos : ouverte lundi-samedi 8h-19h, 12 000 ouvrages, 3 clubs (lecture adultes, jeunesse, danse), labo IA unique au nord du Bénin, fondée il y a 25 ans avec le soutien de la Fondation Vallet.
- Tes réponses sont concises (3-5 phrases max) sauf si on te demande plus de détail.
- Si tu ne sais pas quelque chose, dis-le honnêtement et propose de contacter la bibliothèque directement.
- Termine parfois par une question douce pour maintenir la conversation.
- N'invente PAS de titres hors catalogue si tu n'en as pas besoin.

CATALOGUE DISPONIBLE (extrait) :
${catalogSample}

Tu peux aussi citer d'autres grands classiques ou romans connus si la question le justifie.`;
}

function extractBookRefs(content: string, allBooks: Book[]): BookRef[] {
  const refs: BookRef[] = [];
  for (const book of allBooks) {
    if (content.includes(book.title)) {
      refs.push({ id: book.id, title: book.title, author: book.author, genre: book.genre, cover: book.cover, rating: book.rating });
    }
  }
  return refs;
}

// ── BANNIÈRE D'ACCUEIL KOFFI ─────────────────────────────────────────
function KoffiBanner({ userName, onSuggest }: { userName: string; onSuggest: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center py-8 px-4 animate-slide-up">
      {/* Avatar grand */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--library-accent)] to-[var(--library-primary-dark)] flex items-center justify-center shadow-elevated">
          <Bot className="w-10 h-10 text-[var(--library-on-accent)]" />
        </div>
        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[var(--library-bg)] flex items-center justify-center">
          <span className="w-2 h-2 bg-white rounded-full" />
        </span>
        {/* Halo */}
        <span className="absolute inset-0 rounded-3xl animate-ping bg-[var(--library-accent)]/15 pointer-events-none" style={{ animationDuration: '3s' }} />
      </div>

      {/* Présentation */}
      <h2 className="font-display text-2xl font-bold text-primary mb-1">Bonjour, {userName} !</h2>
      <p className="text-accent font-semibold text-sm mb-1">Je suis Koffi, votre bibliothécaire IA</p>
      <p className="text-muted text-sm text-center max-w-sm mb-6 leading-relaxed">
        Je connais les 12 000 ouvrages de la CAEB, les horaires, les clubs et le labo IA. Posez-moi n'importe quelle question !
      </p>

      {/* Infos rapides */}
      <div className="flex gap-3 mb-8 flex-wrap justify-center">
        <div className="flex items-center gap-1.5 text-xs text-muted surface border border-[var(--border-color)] rounded-lg px-3 py-1.5">
          <Library className="w-3.5 h-3.5 text-accent" />
          <span>12 000 livres</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted surface border border-[var(--border-color)] rounded-lg px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>Lun–Sam 8h–19h</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted surface border border-[var(--border-color)] rounded-lg px-3 py-1.5">
          <Users className="w-3.5 h-3.5 text-accent" />
          <span>3 clubs</span>
        </div>
      </div>

      {/* Suggestions en grille 2×4 */}
      <div className="w-full">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          Que souhaitez-vous savoir ?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggest(s.prompt)}
              className="px-3 py-2.5 surface border border-[var(--border-color)] rounded-xl text-sm text-primary hover:border-[var(--library-accent)]/40 hover:text-accent hover:bg-[var(--library-accent)]/5 transition-all font-medium text-left tap-feedback leading-snug"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AIChatPage({ user, onNavigate }: AIChatPageProps) {
  const { books } = useBooks();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const catalogSample = books.slice(0, 10).map(b =>
    `- "${b.title}" de ${b.author} (${b.genre}, ${b.year ?? ''}) — ${b.synopsis?.slice(0, 80) ?? ''}…`
  ).join('\n');

  const userName = user?.firstName ?? 'lecteur';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const buildHistory = (msgs: ChatMessage[]) =>
    msgs.map(m => ({ role: m.role, content: m.content }));

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      const history = buildHistory([...messages, userMsg]);
      const systemPrompt = buildSystemPrompt(userName, catalogSample);

      // Simulation pour la démo ou si l'API n'est pas configurée
      if (true) { // On force la simulation pour la démo locale
        await new Promise(resolve => setTimeout(resolve, 1500));
        let responseText = `Bonjour ${userName} ! C'est Koffi. `;
        
        if (trimmed.toLowerCase().includes('horaire')) {
          responseText += "La bibliothèque est ouverte du lundi au samedi de 8h à 19h. Nous fermons le dimanche et les jours fériés. Vous passez nous voir quand ?";
        } else if (trimmed.toLowerCase().includes('lire') || trimmed.toLowerCase().includes('recommande')) {
          responseText += "D'après ce que je sais du catalogue, je vous suggère vivement de jeter un œil à **\"L'Enfant noir\"** de Camara Laye ou **\"Une si longue lettre\"** de Mariama Bâ. Ce sont des classiques incontournables ! Quel genre préférez-vous d'habitude ?";
        } else if (trimmed.toLowerCase().includes('membre')) {
          responseText += "Pour devenir membre, il suffit de vous rendre sur votre profil et de cliquer sur le bouton **\"Devenir membre\"**. Cela vous permet d'emprunter des livres physiquement et d'accéder au labo IA !";
        } else {
          responseText += "C'est une excellente question. En tant qu'assistant de la CAEB, je peux vous dire que nous avons plus de 12 000 ouvrages et une équipe passionnée à Natitingou. Voulez-vous que je cherche un livre spécifique pour vous ?";
        }

        const bookRefs = extractBookRefs(responseText, books);
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
          rating: null,
          bookRefs: bookRefs.length > 0 ? bookRefs : undefined,
        }]);
        setIsLoading(false);
        return;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: history,
        }),
      });

      const data = await response.json();
      const rawContent = data.content?.[0]?.text ?? "Je n'ai pas pu répondre. Réessayez dans un instant.";
      const bookRefs = extractBookRefs(rawContent, books);

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: rawContent,
        timestamp: new Date(),
        rating: null,
        bookRefs: bookRefs.length > 0 ? bookRefs : undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Oups, je rencontre un problème de connexion. Réessayez dans quelques instants ou passez directement au bureau d'accueil de la CAEB !",
        timestamp: new Date(),
        rating: null,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleRate = (msgId: string, rating: 'up' | 'down') => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, rating: m.rating === rating ? null : rating } : m
    ));
    if (rating === 'up') toast.success('Merci pour votre retour !');
    else toast.info('Noté — je tâcherai de mieux répondre.');
  };

  const clearHistory = () => {
    setMessages([]);
    toast.success('Conversation effacée');
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
      }
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>
          {line}
          {j < part.split('\n').length - 1 && <br />}
        </span>
      ));
    });
  };

  const showBanner = messages.length === 0;

  return (
    <div className="min-h-screen bg-library-bg pb-0 flex flex-col">
      <Navbar user={user!} />

      <div className="flex flex-col flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-20" style={{ height: 'calc(100vh - 0px)' }}>

        {/* ── EN-TÊTE ── */}
        <div className="flex items-center justify-between py-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-[var(--library-accent)] flex items-center justify-center shadow-soft">
                <Bot className="w-6 h-6 text-[var(--library-on-accent)]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[var(--library-bg)]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-primary text-lg leading-none">Koffi</h1>
              <p className="text-xs text-muted mt-0.5">Assistant bibliothécaire · CAEB Natitingou</p>
            </div>
            <Badge className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold hidden sm:flex">
              En ligne
            </Badge>
          </div>
          {!showBanner && (
            <button onClick={clearHistory}
              className="p-2 rounded-xl text-muted hover:text-primary hover:bg-[var(--library-surface-alt)] border border-transparent hover:border-[var(--border-color)] transition-all tap-feedback"
              title="Effacer la conversation">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── MESSAGES ── */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-4 relative"
          style={{ scrollbarWidth: 'thin' }}>

          {/* Bannière d'accueil ou messages */}
          {showBanner ? (
            <KoffiBanner userName={userName} onSuggest={sendMessage} />
          ) : (
            <div className="space-y-6 pb-2">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onRate={handleRate}
                  onBookClick={(bookId) => onNavigate('book-detail', { bookId })}
                  renderContent={renderContent}
                />
              ))}

              {/* Indicateur de frappe */}
              {isLoading && (
                <div className="flex items-end gap-3 animate-slide-up">
                  <div className="w-8 h-8 rounded-xl bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                  <div className="surface border border-[var(--border-color)] rounded-2xl rounded-bl-sm px-4 py-3 shadow-soft">
                    <div className="flex gap-1.5 items-center h-5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-2 h-2 rounded-full bg-[var(--library-accent)] opacity-60 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bouton scroll bas */}
        {showScrollBtn && (
          <button onClick={scrollToBottom}
            className="absolute bottom-36 right-6 p-2 surface border border-[var(--border-color)] rounded-full shadow-medium hover:shadow-elevated transition-all tap-feedback">
            <ChevronDown className="w-4 h-4 text-accent" />
          </button>
        )}

        {/* ── ZONE DE SAISIE ── */}
        <div className="pb-6 pt-3 border-t border-[var(--border-color)]">
          <div className="surface rounded-2xl border border-[var(--border-color)] shadow-card hover:shadow-card-hover hover:border-[var(--library-accent)]/30 transition-all p-3 flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question à Koffi…"
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent text-primary placeholder:text-muted focus:outline-none text-sm leading-relaxed py-1"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="btn-solid h-9 w-9 p-0 flex-shrink-0 rounded-xl shadow-soft hover:shadow-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed tap-feedback">
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted text-center mt-2">
            Entrée pour envoyer · Maj+Entrée pour sauter une ligne
          </p>
        </div>
      </div>
    </div>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  onRate: (id: string, r: 'up' | 'down') => void;
  onBookClick: (bookId: string) => void;
  renderContent: (content: string) => React.ReactNode;
};

function MessageBubble({
  message, onRate, onBookClick, renderContent,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const time = message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex items-end gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-[var(--library-accent)]/15 border border-[var(--library-accent)]/20'
          : 'bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20'
      }`}>
        {isUser
          ? <UserIcon className="w-4 h-4 text-accent" />
          : <Bot className="w-4 h-4 text-accent" />
        }
      </div>

      <div className={`flex flex-col gap-2 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-soft ${
          isUser
            ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] rounded-br-sm'
            : 'surface border border-[var(--border-color)] text-primary rounded-bl-sm'
        }`}>
          {renderContent(message.content)}
        </div>

        {/* Cartes livres référencés */}
        {!isUser && message.bookRefs && message.bookRefs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.bookRefs.map(book => (
              <button key={book.id} onClick={() => onBookClick(book.id)}
                className="flex items-center gap-2 surface border border-[var(--border-color)] hover:border-[var(--library-accent)]/30 rounded-xl px-3 py-2 text-left transition-all hover:-translate-y-0.5 shadow-soft hover:shadow-medium group tap-feedback">
                <BookOpen className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary group-hover:text-accent transition-colors line-clamp-1">{book.title}</p>
                  <p className="text-[10px] text-muted">{book.author} · {book.genre}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Horodatage + évaluation */}
        <div className={`flex items-center gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-muted">{time}</span>
          {!isUser && (
            <div className="flex items-center gap-1">
              <button onClick={() => onRate(message.id, 'up')}
                className={`p-1 rounded-lg transition-all hover:scale-110 tap-feedback ${
                  message.rating === 'up' ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted hover:text-emerald-500'
                }`} title="Bonne réponse">
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onRate(message.id, 'down')}
                className={`p-1 rounded-lg transition-all hover:scale-110 tap-feedback ${
                  message.rating === 'down' ? 'text-red-500 bg-red-500/10' : 'text-muted hover:text-red-400'
                }`} title="Réponse à améliorer">
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
