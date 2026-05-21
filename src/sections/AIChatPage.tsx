// AIChatPage.tsx — Assistant IA CAEB "Kossi"
import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, ThumbsUp, ThumbsDown, BookOpen, RefreshCw, 
  Bot, User as UserIcon, MessageSquare, Plus, X, Settings,
  ChevronLeft, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { User, Book } from '@/types';
import { useLivres, creerSessionChat, ajouterMessageChat, useSessionsChat, recupererSessionChat } from '@/hooks/useData';
import { useSEO } from '@/lib/utils';

// Interface pour les messages de la discussion
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  rating?: 'up' | 'down' | null;
  bookRefs?: RefLivre[];
}

// Interface pour les références de livres cités par l'IA
interface RefLivre {
  id: string;
  titre: string;
  auteur: string;
  genre: string;
  couverture?: string;
  note: number;
}

interface AIChatPageProps {
  user: User | null;
  onNavigate: (vue: string, parametres?: Record<string, unknown>) => void;
}

// Suggestions rapides pour l'utilisateur
const SUGGESTIONS_RAPIDES = [
  { label: '📚 Que lire ce mois-ci ?', prompt: 'Peux-tu me recommander un livre pour ce mois-ci ?' },
  { label: '🕵️ Un bon thriller', prompt: 'Recommande-moi un thriller haletant du catalogue.' },
  { label: '🧒 Pour mon enfant', prompt: 'Quels livres conseilles-tu pour un enfant de 8 à 12 ans ?' },
  { label: '🔬 Science-fiction', prompt: 'Je cherche un roman de science-fiction captivant.' },
];

/**
 * Extrait les références de livres du contenu du message de l'IA.
 */
function extraireRefsLivres(contenu: string, tousLesLivres: Book[]): RefLivre[] {
  const refs: RefLivre[] = [];
  const contenuMinuscule = contenu.toLowerCase();
  for (const livre of tousLesLivres) {
    if (contenuMinuscule.includes(livre.titre.toLowerCase())) {
      refs.push({ 
        id: livre.id, 
        titre: livre.titre, 
        auteur: livre.auteur, 
        genre: livre.genre, 
        couverture: livre.couverture, 
        note: livre.note 
      });
    }
  }
  return refs.slice(0, 3); // Limiter à 3 références
}

export function AIChatPage({ user, onNavigate }: AIChatPageProps) {
  const { livres } = useLivres();
  const { sessions, recharger: rechargerSessions } = useSessionsChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [saisie, setSaisie] = useState('');
  const [chargement, setChargement] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(true);
  const [sessionIdActif, setSessionIdActif] = useState<number | null>(null);
  
  useSEO("Assistant Kossi", "Discutez avec Kossi, l'intelligence artificielle de la Bibliothèque CAEB, pour obtenir des recommandations personnalisées.");
  
  const finMessagesRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLTextAreaElement>(null);

  const nomUtilisateur = user?.prenom ?? 'lecteur';

  const faireDefilerBas = useCallback(() => {
    finMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    faireDefilerBas();
  }, [messages, faireDefilerBas]);

  // Charger une session existante
  const chargerSession = async (id: number) => {
    setSessionIdActif(id);
    try {
      const session = await recupererSessionChat(id);
      const messagesFormates: ChatMessage[] = session.messages.map((m: any) => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
        rating: null,
        bookRefs: m.role === 'assistant' ? extraireRefsLivres(m.content, livres) : undefined
      }));
      setMessages(messagesFormates);
      if (window.innerWidth < 768) setMenuOuvert(false);
    } catch (erreur) {
      toast.error("Impossible de charger la conversation");
    }
  };

  // Commencer une nouvelle discussion
  const nouvelleDiscussion = () => {
    setSessionIdActif(null);
    setMessages([]);
    if (window.innerWidth < 768) setMenuOuvert(false);
  };

  // Envoyer un message
  const envoyerMessage = async (texte: string) => {
    const texteNettoye = texte.trim();
    if (!texteNettoye || chargement) return;

    const messageUtilisateur: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: texteNettoye,
      timestamp: new Date(),
    };

    setMessages(listePrecedente => [...listePrecedente, messageUtilisateur]);
    setSaisie('');
    if (saisieRef.current) saisieRef.current.style.height = 'auto';
    setChargement(true);

    try {
      let idSession = sessionIdActif;
      
      // 1. Créer la session en base si besoin
      if (!idSession) {
        const session = await creerSessionChat(texteNettoye.slice(0, 30) + '...');
        idSession = session.id;
        setSessionIdActif(idSession);
        rechargerSessions();
      }
      
      // 2. Envoyer au backend et récupérer la réponse automatique
      const data = await ajouterMessageChat(idSession, texteNettoye);
      
      const contenuIA = data.assistant_message.content;
      const responseData = data.structured_data;

      // Extraire les références de livres soit du contenu, soit des données structurées
      let referencesLivres: RefLivre[] = [];
      if (responseData && responseData.livres) {
        referencesLivres = responseData.livres.map((l: any) => ({
          id: l.id_livre,
          titre: l.titre,
          auteur: l.auteur,
          genre: l.genre,
          couverture: livres.find(bl => bl.id === l.id_livre)?.couverture,
          note: l.note_moyenne
        }));
      } else {
        referencesLivres = extraireRefsLivres(contenuIA, livres);
      }

      setMessages(listePrecedente => [...listePrecedente, {
        id: data.assistant_message.id.toString(),
        role: 'assistant',
        content: contenuIA,
        timestamp: new Date(data.assistant_message.created_at),
        bookRefs: referencesLivres.length > 0 ? referencesLivres : undefined,
      }]);
    } catch (erreur) {
      console.error(erreur);
      toast.error("Erreur de connexion avec Kossi");
      setMessages(listePrecedente => [...listePrecedente, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Je n'arrive pas à me connecter au serveur. Vérifiez votre connexion internet.",
        timestamp: new Date(),
      }]);
    } finally {
      setChargement(false);
    }
  };

  // Gérer le changement de saisie (auto-expansion du textarea)
  const gererChangementSaisie = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSaisie(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="flex h-screen bg-library-bg overflow-hidden text-primary">
      
      {/* ── BARRE LATÉRALE (Sidebar) ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[var(--library-surface)] border-r border-[var(--border-color)] transition-transform duration-300 ease-in-out
        ${menuOuvert ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 ${!menuOuvert ? 'md:hidden' : ''}
      `}>
        <div className="flex flex-col h-full p-4">
          {/* Bouton Nouvelle Discussion */}
          <Button 
            onClick={nouvelleDiscussion}
            className="w-full flex items-center justify-start gap-3 bg-transparent hover:bg-[var(--library-surface-alt)] text-primary border border-[var(--border-color)] rounded-xl py-6 mb-6 group transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--library-accent)] flex items-center justify-center text-white shadow-soft group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-semibold">Nouvelle discussion</span>
          </Button>

          {/* Liste de l'historique */}
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4 px-2">Historique récent</p>
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => chargerSession(session.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm transition-all group ${
                  sessionIdActif === session.id 
                    ? 'bg-[var(--library-accent)]/10 text-accent border border-[var(--library-accent)]/20' 
                    : 'hover:bg-[var(--library-surface-alt)] text-muted hover:text-primary border border-transparent'
                }`}
              >
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${sessionIdActif === session.id ? 'text-accent' : 'text-muted'}`} />
                <span className="truncate flex-1 font-medium">{session.titre}</span>
              </button>
            ))}
          </div>

          {/* Profil Utilisateur en bas */}
          <div className="pt-4 border-t border-[var(--border-color)] mt-auto">
            <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--library-surface-alt)] transition-all">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-xs font-bold shadow-soft">
                {nomUtilisateur[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold leading-none">{nomUtilisateur}</p>
                <p className="text-[10px] text-muted mt-1">Membre CAEB</p>
              </div>
              <Settings className="w-4 h-4 text-muted" />
            </button>
          </div>
        </div>

        {/* Bouton Fermer sur Mobile */}
        <button 
          onClick={() => setMenuOuvert(false)}
          className="md:hidden absolute top-4 -right-12 w-10 h-10 bg-[var(--library-surface)] border border-[var(--border-color)] rounded-full flex items-center justify-center shadow-medium"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>

      {/* ── CONTENU PRINCIPAL ── */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-library-bg">
        
        {/* Barre d'en-tête Modernisée */}
        <header className="h-20 flex items-center justify-between px-6 border-b border-[var(--border-color)] glass-effect sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMenuOuvert(!menuOuvert)}
              className="p-2.5 hover:bg-[var(--library-accent)]/10 rounded-xl transition-all text-accent"
            >
              {menuOuvert ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white shadow-glow animate-float">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl tracking-tight">
                  <span className="text-gradient">Kossi</span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">En ligne</span>
                </div>
              </div>
            </div>
          </div>
          <Button variant="ghost" className="text-muted hover:text-accent gap-2 font-semibold" onClick={() => onNavigate('home')}>
            <ChevronLeft className="w-4 h-4" />
            Quitter
          </Button>
        </header>

        {/* Zone des messages */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-32">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-6 shadow-glow animate-float">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold mb-3">Comment puis-je vous aider, {nomUtilisateur} ?</h1>
                <p className="text-muted max-w-md mb-10 leading-relaxed">
                  Je suis Kossi, votre bibliothécaire IA. Je peux vous recommander des livres, vous donner les horaires ou répondre à vos questions sur la CAEB.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {SUGGESTIONS_RAPIDES.map(s => (
                    <button 
                      key={s.label}
                      onClick={() => envoyerMessage(s.prompt)}
                      className="text-left p-4 surface border border-[var(--border-color)] rounded-2xl hover:border-accent/40 hover:bg-accent/5 transition-all group group-hover:shadow-soft"
                    >
                      <p className="text-sm font-semibold group-hover:text-accent transition-colors">{s.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {messages.map((msg, idx) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-4 md:gap-6 animate-slide-up ${msg.role === 'user' ? 'justify-end' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shadow-soft flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5" />
                      </div>
                    )}
                    <div className={`flex flex-col gap-3 ${msg.role === 'user' ? 'max-w-[85%] items-end' : 'max-w-[85%] md:max-w-[80%]'}`}>
                      <div className={`
                        px-6 py-4 rounded-[2rem] text-[15px] leading-relaxed shadow-soft transition-all
                        ${msg.role === 'user' 
                          ? 'bg-accent text-white border border-accent/20 rounded-tr-sm shadow-glow' 
                          : 'glass-effect text-primary border border-[var(--border-color)] rounded-tl-sm'
                        }
                      `}>
                        {msg.content.split('\n').map((ligne, i) => (
                          <p key={i} className={i > 0 ? 'mt-2' : ''}>{ligne}</p>
                        ))}
                      </div>

                      {/* Recommandations de livres contextuelles */}
                      {msg.bookRefs && msg.bookRefs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.bookRefs.map(livre => (
                            <button 
                              key={livre.id}
                              onClick={() => onNavigate('book-detail', { bookId: livre.id })}
                              className="flex items-center gap-3 p-2 surface border border-[var(--border-color)] rounded-xl hover:border-accent/40 hover:shadow-medium transition-all group"
                            >
                              <div className="w-10 h-14 bg-[var(--library-surface-alt)] rounded-lg overflow-hidden flex-shrink-0">
                                {livre.couverture ? (
                                  <img src={livre.couverture} alt={livre.titre} className="w-full h-full object-cover" />
                                ) : (
                                  <BookOpen className="w-5 h-5 text-muted m-auto h-full" />
                                )}
                              </div>
                              <div className="text-left pr-2">
                                <p className="text-xs font-bold line-clamp-1 group-hover:text-accent transition-colors">{livre.titre}</p>
                                <p className="text-[10px] text-muted">{livre.auteur}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Boutons de feedback */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <button className="p-1.5 rounded-lg text-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"><ThumbsUp className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"><ThumbsDown className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-all ml-1"><RefreshCw className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white shadow-soft flex-shrink-0 mt-1">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ))}

                {chargement && (
                  <div className="flex gap-4 md:gap-6 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent/40 flex-shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1.5 items-center h-10 px-4 surface border border-[var(--border-color)] rounded-2xl rounded-bl-sm">
                      <span className="w-2 h-2 rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={finMessagesRef} />
              </div>
            )}
          </div>
        </div>

        {/* Zone de saisie (Centrée et flottante) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-library-bg via-library-bg to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            <div className="relative surface-alt border border-[var(--border-color)] rounded-3xl shadow-elevated overflow-hidden transition-all focus-within:border-accent/40 focus-within:shadow-glow">
              <textarea
                ref={saisieRef}
                value={saisie}
                onChange={gererChangementSaisie}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    envoyerMessage(saisie);
                  }
                }}
                placeholder="Message Kossi..."
                rows={1}
                className="w-full px-6 py-5 bg-transparent resize-none focus:outline-none text-[15px] pr-16 max-h-48"
              />
              <div className="absolute right-3 bottom-3">
                <Button 
                  onClick={() => envoyerMessage(saisie)}
                  disabled={!saisie.trim() || chargement}
                  className="w-10 h-10 rounded-2xl bg-accent hover:bg-primary text-white shadow-soft disabled:opacity-40 disabled:scale-95 transition-all p-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted text-center mt-3 font-medium">
              Kossi peut faire des erreurs. Envisagez de vérifier les informations importantes.
            </p>
          </div>
        </div>
      </main>

      {/* Overlay de la barre latérale sur mobile */}
      {menuOuvert && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMenuOuvert(false)}
        />
      )}
    </div>
  );
}


