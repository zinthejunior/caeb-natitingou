/**
 * =============================================================================
 * AIChatPage.jsx - Page du Chatbot Kossi
 * =============================================================================
 * 
 * Ce fichier contient le composant React qui affiche l'interface de chat avec 
 * l'assistant IA "Kossi". Kossi est un assistant virtuel qui aide les utilisateurs
 * de la bibliothèque CAEB à trouver des livres, obtenir des recommandations,
 * et répondre à leurs questions.
 * 
 * ARCHITECTURE :
 * - Le composant utilise React Hooks (useState, useEffect, useRef) pour gérer l'état
 * - Les messages sont envoyés à une API FastAPI (backend Kossi) qui utilise un LLM
 * - L'historique des conversations est sauvegardé dans la base de données Django
 * 
 * DESIGN INSPIRÉ DE DEEPSEEK :
 * - Sidebar rétractable avec historique des conversations
 * - Zone de chat principale avec bulles de messages stylisées
 * - Zone de saisie fixe en bas avec options avancées
 * - Support du Markdown pour le rendu des réponses
 * - Animations fluides et transitions
 * =============================================================================
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Bot, Send, User as UserIcon, Sparkles, Menu, Plus,
  Paperclip, X, FileText, Image as ImageIcon, Settings, History,
  ChevronLeft, ChevronRight, MessageSquare, Trash2, Copy, Check,
  RefreshCw, ThumbsUp, ThumbsDown, Zap, BookOpen, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { useLivres, appelAPI, creerSessionChat, ajouterMessageChat, recupererSessionChat } from "@/hooks/useData";
import { cn } from "@/lib/utils";

/**
 * -----------------------------------------------------------------------------
 * COMPOSANT PRINCIPAL : AIChatPage
 * -----------------------------------------------------------------------------
 * Ce composant gère toute l'interface du chatbot. Il reçoit l'utilisateur
 * connecté en props et affiche une interface de chat complète.
 * 
 * Props:
 * - user: Objet contenant les informations de l'utilisateur connecté
 */
export function AIChatPage({ user }) {
  // ============================================================================
  // HOOKS DE NAVIGATION ET DONNÉES
  // ============================================================================
  
  /**
   * useNavigate() : Hook de React Router pour naviguer entre les pages
   * Utilisé ici pour rediriger vers les pages de détail des livres recommandés
   */
  const navigate = useNavigate();
  
  /**
   * useLivres() : Hook personnalisé qui récupère la liste des livres depuis l'API
   * Retourne { livres: [], chargement: boolean, erreur: string }
   */
  const { livres } = useLivres();
 
  // ============================================================================
  // ÉTATS DU COMPOSANT (useState)
  // ============================================================================
  
  /**
   * États de l'interface utilisateur :
   * - inputValue : Texte saisi par l'utilisateur dans le champ de message
   * - isLoading : Indique si une requête est en cours (pour afficher le loader)
   * - messages : Tableau des messages de la conversation actuelle
   * - sidebarOpen : Contrôle l'ouverture/fermeture de la sidebar sur mobile
   * - sidebarCollapsed : Contrôle si la sidebar est réduite sur desktop
   */
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  /**
   * États pour les fichiers uploadés :
   * Les utilisateurs peuvent joindre des fichiers à leurs messages
   */
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  /**
   * États pour la gestion des sessions de chat :
   * - chatSessions : Liste de toutes les conversations précédentes
   * - activeSession : La session actuellement active
   * - sessionTitle : Titre de la session courante
   */
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTitle, setSessionTitle] = useState("Nouvelle conversation");
  
  /**
   * État pour le message copié (feedback visuel)
   */
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  /**
   * Paramètres de Kossi - Sauvegardés dans localStorage pour persistance
   * - tone : Style de réponse (concise, équilibré, détaillé)
   * - source : Source des données (catalogue CAEB ou web)
   * - showSources : Afficher ou non les sources utilisées
   */
  const [kossiSettings, setKossiSettings] = useState(() => {
    // Récupère les paramètres sauvegardés ou utilise les valeurs par défaut
    const saved = localStorage.getItem("kossi_settings");
    return saved ? JSON.parse(saved) : {
      tone: "équilibré",
      source: "catalogue",
      showSources: false
    };
  });
  
  /**
   * Mémoire de Kossi - Permet à l'assistant de se souvenir du contexte
   * - enabled : Active/désactive la mémoire
   * - retainHistory : Conserve l'historique entre les sessions
   * - level : Niveau de mémoire (court terme ou long terme)
   */
  const [kossiMemory, setKossiMemory] = useState(() => {
    const saved = localStorage.getItem("kossi_memory");
    return saved ? JSON.parse(saved) : {
      enabled: true,
      retainHistory: true,
      level: "court terme"
    };
  });
  
  /**
   * État du panneau de paramètres (modal)
   */
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ============================================================================
  // RÉFÉRENCES (useRef)
  // ============================================================================
  
  /**
   * Références DOM pour le défilement automatique et l'upload de fichiers :
   * - messagesEndRef : Pointe vers la fin des messages pour le scroll auto
   * - messagesContainerRef : Conteneur scrollable des messages
   * - fileInputRef : Input file caché pour l'upload
   */
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // ============================================================================
  // CARTES DE SUGGESTIONS
  // ============================================================================
  
  /**
   * Ces cartes s'affichent quand il n'y a pas encore de messages.
   * Elles donnent des exemples de questions que l'utilisateur peut poser.
   * C'est une bonne pratique UX pour guider les utilisateurs.
   */
  const suggestionCards = [
    {
      icon: Search,
      title: "Rechercher un livre",
      description: "Trouve un roman d'aventure palpitant",
      prompt: "Je cherche un roman d'aventure palpitant dans le catalogue"
    },
    {
      icon: Sparkles,
      title: "Recommandations",
      description: "Découvre les nouveautés de la bibliothèque",
      prompt: "Quelles sont les dernières nouveautés de la bibliothèque ?"
    },
    {
      icon: BookOpen,
      title: "Clubs de lecture",
      description: "Explore les clubs et leurs activités",
      prompt: "Parle-moi des clubs de lecture et de leurs activités"
    },
    {
      icon: Zap,
      title: "Aide rapide",
      description: "Comment emprunter des livres ?",
      prompt: "Comment puis-je emprunter des livres à la bibliothèque CAEB ?"
    }
  ];

  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================
  
  /**
   * scrollToBottom() : Fait défiler la zone de messages vers le bas
   * Appelée après chaque nouveau message pour que l'utilisateur voie
   * toujours le message le plus récent.
   */
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  /**
   * sanitizeHtml() : Nettoie le HTML pour éviter les attaques XSS
   * 
   * SÉCURITÉ : C'est très important ! On ne fait jamais confiance au HTML
   * venant d'une source externe. Cette fonction supprime les balises
   * et attributs dangereux tout en gardant le formatage basique.
   */
  const sanitizeHtml = useCallback((html) => {
    if (!html) return "";
    
    // Créer un parser DOM pour analyser le HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Liste blanche des balises autorisées (sécurité)
    const allowedTags = [
      "b", "strong", "i", "em", "u", "a", "p", "br", "ul", "ol", "li",
      "span", "div", "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "pre", "code", "img"
    ];
    
    // Liste blanche des attributs autorisés
    const allowedAttrs = ["href", "target", "rel", "src", "alt", "title", "class"];

    // Parcourir tous les éléments et supprimer ceux non autorisés
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      const nodeName = node.nodeName.toLowerCase();
      if (!allowedTags.includes(nodeName)) {
        // Remplace les balises non autorisées par leur contenu texte
        node.replaceWith(document.createTextNode(node.textContent || ""));
        return;
      }

      // Supprimer les attributs non autorisés
      for (const attr of Array.from(node.attributes)) {
        if (!allowedAttrs.includes(attr.name.toLowerCase())) {
          node.removeAttribute(attr.name);
        }
      }

      // Sécuriser les liens
      if (node.hasAttribute("href")) {
        const href = node.getAttribute("href") || "";
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
          node.removeAttribute("href");
        } else {
          node.setAttribute("rel", "noreferrer noopener");
          node.setAttribute("target", "_blank");
        }
      }
    });

    return doc.body.innerHTML;
  }, []);

  /**
   * formatMessageContent() : Convertit le texte brut en HTML formaté
   * 
   * Cette fonction transforme le texte Markdown simple en HTML :
   * - **texte** devient <strong>texte</strong>
   * - *texte* devient <em>texte</em>
   * - `code` devient <code>code</code>
   * - Les sauts de ligne sont préservés
   */
  const formatMessageContent = useCallback((content) => {
    if (!content) return "";
    
    let formatted = content
      // Gras : **texte** ou __texte__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italique : *texte* ou _texte_
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Code inline : `code`
      .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[var(--library-surface-alt)] text-accent text-sm font-mono">$1</code>')
      // Liens : [texte](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>')
      // Sauts de ligne
      .replace(/\n/g, '<br />');
    
    return sanitizeHtml(formatted);
  }, [sanitizeHtml]);

  /**
   * copyToClipboard() : Copie le contenu d'un message dans le presse-papier
   * Avec feedback visuel (icône check temporaire)
   */
  const copyToClipboard = useCallback(async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
    }
  }, []);

  // ============================================================================
  // EFFETS (useEffect)
  // ============================================================================
  
  /**
   * Effet : Défilement automatique vers le bas
   * Se déclenche quand les messages changent ou quand isLoading change
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  /**
   * Effet : Sauvegarder les paramètres dans localStorage
   * Ainsi les préférences de l'utilisateur sont conservées entre les visites
   */
  useEffect(() => {
    localStorage.setItem("kossi_settings", JSON.stringify(kossiSettings));
  }, [kossiSettings]);

  useEffect(() => {
    localStorage.setItem("kossi_memory", JSON.stringify(kossiMemory));
  }, [kossiMemory]);

  /**
   * Effet : Charger l'historique des sessions au montage du composant
   * Cela permet d'afficher les conversations précédentes dans la sidebar
   */
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
    
    // Cleanup : évite les mises à jour d'état sur un composant démonté
    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================================
  // GESTION DES FICHIERS
  // ============================================================================
  
  /**
   * handleFileUpload() : Gère l'upload de fichiers
   * Limite : maximum 5 fichiers par message
   */
  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (uploadedFiles.length + files.length > 5) {
      // ✅ Utiliser une notification toast au lieu d'alert()
      console.warn("Limite de fichiers atteinte: maximum 5 fichiers autorisés");
      // TODO: Ajouter un toast UI pour meilleure UX
      return;
    }
    
    setUploadedFiles((prev) => [...prev, ...files]);
    e.target.value = ""; // Reset l'input pour permettre de re-sélectionner le même fichier
  }, [uploadedFiles.length]);

  /**
   * removeFile() : Supprime un fichier de la liste des fichiers à envoyer
   */
  const removeFile = useCallback((index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * getFileIcon() : Retourne l'icône appropriée selon le type de fichier
   */
  const getFileIcon = useCallback((file) => {
    const type = file.type;
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  }, []);

  // ============================================================================
  // GESTION DES SESSIONS
  // ============================================================================
  
  /**
   * createNewSession() : Crée une nouvelle conversation
   * Efface les messages actuels et crée une session vide
   */
  const createNewSession = useCallback(async () => {
    setMessages([]);
    setActiveSession(null);
    setSessionTitle("Nouvelle conversation");
    setSidebarOpen(false);
  }, []);

  /**
   * handleLoadSession() : Charge une session existante
   * Récupère les messages de la session sélectionnée depuis l'API
   */
  const handleLoadSession = useCallback(async (session) => {
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
  }, []);

  /**
   * formatSessionDate() : Formate la date d'une session pour l'affichage
   */
  const formatSessionDate = useCallback((session) => {
    const date = new Date(session.updated_at || session.created_at);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  }, []);

  // ============================================================================
  // ENVOI DE MESSAGE
  // ============================================================================
  
  /**
   * handleSendMessage() : Envoie un message à Kossi
   * 
   * FLUX :
   * 1. Crée le message utilisateur et l'ajoute à l'interface
   * 2. Envoie la requête à l'API Kossi (FastAPI)
   * 3. Reçoit la réponse et l'ajoute à l'interface
   * 4. Sauvegarde les messages dans la base de données Django
   * 
   * @param {string} textToSend - Texte optionnel à envoyer (pour les suggestions)
   */
  const handleSendMessage = useCallback(async (textToSend = "") => {
    const value = textToSend.trim() || inputValue.trim();
    if (!value && uploadedFiles.length === 0) return;

    // Créer le message utilisateur
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: value || "📎 Fichiers joints",
      files: uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.name) : [],
      timestamp: new Date().toISOString()
    };

    // Ajouter le message à l'interface immédiatement (optimistic update)
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      // Créer une session si elle n'existe pas
      let session = activeSession;
      if (!session) {
        session = await creerSessionChat(sessionTitle);
        if (session) {
          setChatSessions((prev) => [session, ...prev]);
          setActiveSession(session);
        }
      }

      // Sauvegarder le message utilisateur en base
      if (session) {
        await ajouterMessageChat(session.id, value, "user");
      }

      // Préparer la requête pour l'API Kossi
      const headers = {
        "Content-Type": "application/json"
      };

      // Construire l'historique des messages pour le contexte
      const chatMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
        files: m.files || []
      }));

      // Envoyer la requête à l'API Kossi (avec credentials pour inclure les cookies si applicable)
      const kossiUrl = import.meta.env.VITE_KOSSI_URL || "http://localhost:8001";
      const response = await fetch(`${kossiUrl}/chat`, {
        method: "POST",
        headers,
        credentials: "include",
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

        // Traiter les recommandations de livres
        const recommendations = [];
        if (Array.isArray(data.suggested_books)) {
          data.suggested_books.forEach((title) => {
            if (typeof title === "string") {
              // Chercher le livre dans le catalogue local
              const matchedBook = livres.find(
                (l) => l.titre?.toLowerCase().trim() === title.toLowerCase().trim()
              );
              if (matchedBook) {
                recommendations.push(matchedBook);
              } else {
                // Recherche partielle si pas de match exact
                const partialMatch = livres.find((l) =>
                  l.titre?.toLowerCase().includes(title.toLowerCase()) ||
                  title.toLowerCase().includes(l.titre?.toLowerCase() || "")
                );
                if (partialMatch) {
                  recommendations.push(partialMatch);
                } else {
                  // Créer une entrée temporaire
                  recommendations.push({
                    id: `temp-${title}`,
                    titre: title,
                    auteur: "Suggestion Kossi",
                    couverture: ""
                  });
                }
              }
            } else if (title && typeof title === "object") {
              recommendations.push(title);
            }
          });
        }

        // Créer le message de réponse de Kossi
        const botMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "Je n'ai pas pu générer de réponse. Veuillez réessayer.",
          recommendations: recommendations,
          sources: data.sources || [],
          timestamp: new Date().toISOString()
        };
        
        setMessages((prev) => [...prev, botMessage]);

        // Sauvegarder la réponse en base
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
        throw new Error(`Erreur API: ${response.status}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      
      // Message d'erreur convivial
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, j'ai rencontré un problème technique. Veuillez réessayer dans quelques instants. Si le problème persiste, contactez l'équipe de la bibliothèque.",
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, uploadedFiles, messages, activeSession, sessionTitle, user?.id, kossiSettings, kossiMemory, livres]);

  /**
   * handleSendQuickMessage() : Envoie un message depuis une carte de suggestion
   */
  const handleSendQuickMessage = useCallback((promptText) => {
    handleSendMessage(promptText);
  }, [handleSendMessage]);

  /**
   * regenerateResponse() : Régénère la dernière réponse de Kossi
   */
  const regenerateResponse = useCallback(() => {
    if (messages.length < 2) return;
    
    // Trouver le dernier message utilisateur
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      // Supprimer la dernière réponse de Kossi
      setMessages(prev => prev.slice(0, -1));
      // Renvoyer le message
      handleSendMessage(lastUserMessage.content);
    }
  }, [messages, handleSendMessage]);

  // ============================================================================
  // RENDU JSX
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-[var(--library-bg)] flex flex-col">
      {/* 
        ========================================================================
        NAVBAR - Barre de navigation commune à toute l'application
        ========================================================================
      */}
      <Navbar user={user} />
      
      {/* 
        ========================================================================
        CONTENEUR PRINCIPAL - Flex row avec sidebar + zone de chat
        ========================================================================
      */}
      <div className="flex flex-1 pt-16 overflow-hidden">
        
        {/* 
          ======================================================================
          SIDEBAR - Historique des conversations (style DeepSeek)
          ======================================================================
          Sur desktop : toujours visible, peut être réduite
          Sur mobile : overlay qui s'ouvre au clic
        */}
        
        {/* Overlay mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:relative z-50 lg:z-auto h-[calc(100vh-4rem)] bg-[var(--library-surface)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 ease-in-out",
          // Mobile : slide in/out
          sidebarOpen ? "left-0" : "-left-full lg:left-0",
          // Desktop : collapsed/expanded
          sidebarCollapsed ? "lg:w-16" : "lg:w-72",
          "w-72"
        )}>
          {/* Header sidebar */}
          <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-2">
            {!sidebarCollapsed && (
              <>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--library-accent)] to-[var(--library-accent-alt)] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm text-primary truncate">Kossi AI</h2>
                  <p className="text-[10px] text-muted">Assistant CAEB</p>
                </div>
              </>
            )}
            
            {/* Bouton collapse (desktop only) */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-8 w-8 shrink-0"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            
            {/* Bouton fermer (mobile only) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 shrink-0"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Bouton nouvelle conversation */}
          <div className="p-3">
            <Button 
              onClick={createNewSession}
              className={cn(
                "w-full bg-[var(--library-accent)] hover:bg-[var(--library-accent-alt)] text-white",
                sidebarCollapsed ? "px-0 justify-center" : "justify-start gap-2"
              )}
            >
              <Plus className="w-4 h-4" />
              {!sidebarCollapsed && <span>Nouvelle discussion</span>}
            </Button>
          </div>
          
          {/* Liste des sessions */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                Historique
              </p>
              
              {chatSessions.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">
                  Aucune conversation
                </p>
              ) : (
                <div className="space-y-1">
                  {chatSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleLoadSession(session)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group",
                        activeSession?.id === session.id
                          ? "bg-[var(--library-accent)]/10 text-accent"
                          : "text-muted hover:bg-[var(--library-surface-alt)] hover:text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1">
                          {session.titre || "Discussion Kossi"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted mt-0.5 pl-6">
                        {formatSessionDate(session)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Footer sidebar avec paramètres */}
          <div className="p-3 border-t border-[var(--border-color)]">
            <Button
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              className={cn(
                "w-full",
                sidebarCollapsed ? "px-0 justify-center" : "justify-start gap-2"
              )}
            >
              <Settings className="w-4 h-4" />
              {!sidebarCollapsed && <span>Paramètres Kossi</span>}
            </Button>
          </div>
        </aside>
        
        {/* 
          ======================================================================
          ZONE DE CHAT PRINCIPALE
          ======================================================================
        */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          
          {/* Header mobile avec bouton menu */}
          <div className="lg:hidden flex items-center gap-3 p-4 border-b border-[var(--border-color)] bg-[var(--library-surface)]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--library-accent)] to-[var(--library-accent-alt)] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sm text-primary">Kossi</h1>
                <p className="text-[10px] text-muted">Assistant IA</p>
              </div>
            </div>
          </div>
          
          {/* Zone des messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto px-4 py-6">
              
              {/* État vide : Message de bienvenue + suggestions */}
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
                  {/* Avatar Kossi */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--library-accent)] to-[var(--library-accent-alt)] flex items-center justify-center mb-6 shadow-lg">
                    <Bot className="w-12 h-12 text-white" />
                  </div>
                  
                  {/* Message de bienvenue */}
                  <h1 className="text-2xl font-bold text-primary mb-2 text-center">
                    Bonjour{user?.prenom ? `, ${user.prenom}` : ""} ! Je suis Kossi
                  </h1>
                  <p className="text-muted text-center max-w-md mb-8">
                    Votre assistant IA pour la Bibliothèque CAEB. Je peux vous aider à trouver 
                    des livres, obtenir des recommandations personnalisées, et répondre à vos questions.
                  </p>
                  
                  {/* Aide */}
                  <div className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-[var(--library-surface-alt)] border border-[var(--border-color)]">
                    <p className="text-xs text-muted mb-2 font-medium">💡 Conseil pour bien démarrer :</p>
                    <p className="text-sm text-primary">
                      Vous pouvez me poser des questions en français, me demander des recommandations 
                      de livres selon vos goûts, ou explorer le catalogue de la bibliothèque. 
                      Cliquez sur une suggestion ci-dessous pour commencer !
                    </p>
                  </div>
                  
                  {/* Cartes de suggestions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                    {suggestionCards.map((card, idx) => {
                      const IconComponent = card.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSendQuickMessage(card.prompt)}
                          className="group text-left p-4 rounded-xl bg-[var(--library-surface)] border border-[var(--border-color)] hover:border-[var(--library-accent)]/50 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--library-accent)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--library-accent)]/20 transition-colors">
                              <IconComponent className="w-5 h-5 text-accent" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-primary group-hover:text-accent transition-colors">
                                {card.title}
                              </p>
                              <p className="text-xs text-muted mt-0.5 line-clamp-1">
                                {card.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Liste des messages */}
              {messages.length > 0 && (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                        msg.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        msg.role === "assistant" 
                          ? "bg-gradient-to-br from-[var(--library-accent)] to-[var(--library-accent-alt)]" 
                          : "bg-[var(--library-surface-alt)] border border-[var(--border-color)]"
                      )}>
                        {msg.role === "assistant" 
                          ? <Bot className="w-5 h-5 text-white" /> 
                          : <UserIcon className="w-5 h-5 text-primary" />
                        }
                      </div>
                      
                      {/* Bulle de message */}
                      <div className={cn(
                        "flex-1 max-w-[85%] sm:max-w-[75%]",
                        msg.role === "user" ? "flex flex-col items-end" : ""
                      )}>
                        <div className={cn(
                          "rounded-2xl px-4 py-3",
                          msg.role === "assistant" 
                            ? "bg-[var(--library-surface)] border border-[var(--border-color)]" 
                            : "bg-[var(--library-accent)] text-white",
                          msg.isError && "border-red-300 bg-red-50 dark:bg-red-900/20"
                        )}>
                          {/* Contenu du message */}
                          <div 
                            className={cn(
                              "text-sm leading-relaxed prose prose-sm max-w-none",
                              msg.role === "user" ? "prose-invert" : ""
                            )}
                            dangerouslySetInnerHTML={{ 
                              __html: formatMessageContent(msg.content) 
                            }} 
                          />
                          
                          {/* Fichiers joints */}
                          {msg.files && msg.files.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                              {msg.files.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs opacity-80">
                                  <FileText className="w-3 h-3" />
                                  <span>{file}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Recommandations de livres */}
                          {msg.recommendations && msg.recommendations.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                Livres suggérés
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {msg.recommendations.slice(0, 4).map((book, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => navigate(`/catalog/${book.id}`)}
                                    className="text-left p-3 rounded-xl bg-[var(--library-surface-alt)] hover:bg-[var(--library-surface)] hover:-translate-y-0.5 transition-all duration-200 border border-[var(--border-color)] hover:border-[var(--library-accent)]/30 hover:shadow-md flex items-center justify-between group"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-xs text-primary truncate group-hover:text-[var(--library-accent)] transition-colors">
                                        {book.titre}
                                      </p>
                                      <p className="text-[10px] text-muted truncate mt-0.5">
                                        {book.auteur}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-[var(--library-accent)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Sources (si activées) */}
                          {kossiSettings.showSources && msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                                Sources
                              </p>
                              <div className="space-y-1">
                                {msg.sources.slice(0, 3).map((source, idx) => (
                                  <a
                                    key={idx}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-accent hover:underline truncate"
                                  >
                                    {source.title || source.url}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions sur le message (assistant seulement) */}
                        {msg.role === "assistant" && !msg.isError && (
                          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              title="Copier"
                            >
                              {copiedMessageId === msg.id 
                                ? <Check className="w-3.5 h-3.5 text-green-500" />
                                : <Copy className="w-3.5 h-3.5" />
                              }
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Bonne réponse"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Mauvaise réponse"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </Button>
                            {msg === messages[messages.length - 1] && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={regenerateResponse}
                                title="Régénérer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicateur de chargement */}
                  {isLoading && (
                    <div className="flex gap-3 animate-in fade-in duration-300">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--library-accent)] to-[var(--library-accent-alt)] flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-[var(--library-surface)] border border-[var(--border-color)] rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[var(--library-accent)] animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-[var(--library-accent)] animate-bounce" style={{ animationDelay: "0.15s" }} />
                          <div className="w-2 h-2 rounded-full bg-[var(--library-accent)] animate-bounce" style={{ animationDelay: "0.3s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Ancre pour le scroll auto */}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
          
          {/* 
            ====================================================================
            ZONE DE SAISIE - Input fixe en bas
            ====================================================================
          */}
          <div className="border-t border-[var(--border-color)] bg-[var(--library-surface)] p-4">
            <div className="max-w-3xl mx-auto">
              
              {/* Fichiers uploadés (preview) */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-2 rounded-lg bg-[var(--library-surface-alt)] border border-[var(--border-color)]">
                  {uploadedFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--library-surface)] border border-[var(--border-color)] text-xs"
                    >
                      {getFileIcon(file)}
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <button 
                        onClick={() => removeFile(index)}
                        className="hover:text-red-500 transition-colors ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire de saisie */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-end gap-2"
              >
                {/* Bouton upload fichier */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 shrink-0"
                  disabled={isLoading}
                >
                  <Paperclip className="w-5 h-5" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </Button>

                {/* Champ de texte */}
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      // Auto-resize
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
                    }}
                    onKeyDown={(e) => {
                      // Envoyer avec Enter (sans Shift)
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Posez une question à Kossi..."
                    className="w-full min-h-[44px] max-h-[150px] px-4 py-3 pr-12 rounded-xl border border-[var(--border-color)] bg-[var(--library-bg)] focus:outline-none focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 resize-none text-primary placeholder:text-muted transition-all"
                    disabled={isLoading}
                    rows={1}
                  />
                  
                  {/* Bouton envoyer */}
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-1.5 bottom-1.5 h-9 w-9 rounded-lg bg-[var(--library-accent)] hover:bg-[var(--library-accent-alt)] text-white disabled:opacity-50"
                    disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isLoading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>

              {/* Note de bas de page */}
              <p className="text-[10px] text-center text-muted mt-2">
                Kossi peut faire des erreurs. Vérifiez les informations importantes.
                <span className="mx-1">•</span>
                <button 
                  onClick={() => setSettingsOpen(true)}
                  className="text-accent hover:underline"
                >
                  Paramètres
                </button>
              </p>
            </div>
          </div>
        </main>
      </div>
      
      {/* 
        ========================================================================
        MODAL PARAMÈTRES - Configuration de Kossi
        ========================================================================
      */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-[var(--library-surface)] rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-accent" />
                <h2 className="font-semibold text-primary">Paramètres Kossi</h2>
              </div>
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Contenu */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)] space-y-6">
              
              {/* Section Ton de réponse */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">
                  Ton de réponse
                </h3>
                <p className="text-xs text-muted mb-3">
                  💡 Choisissez comment Kossi doit formuler ses réponses
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "concise", label: "Court" },
                    { value: "équilibré", label: "Équilibré" },
                    { value: "détaillé", label: "Détaillé" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setKossiSettings(prev => ({ ...prev, tone: option.value }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        kossiSettings.tone === option.value 
                          ? "bg-[var(--library-accent)] text-white" 
                          : "bg-[var(--library-surface-alt)] text-muted hover:text-primary"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Section Source */}
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">
                  Source des réponses
                </h3>
                <p className="text-xs text-muted mb-3">
                  💡 Où Kossi doit-il chercher les informations ?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "catalogue", label: "Catalogue CAEB" },
                    { value: "web", label: "Web public" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setKossiSettings(prev => ({ ...prev, source: option.value }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        kossiSettings.source === option.value 
                          ? "bg-[var(--library-accent)] text-white" 
                          : "bg-[var(--library-surface-alt)] text-muted hover:text-primary"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Option Afficher sources */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--library-surface-alt)] border border-[var(--border-color)] cursor-pointer">
                <div>
                  <span className="text-sm text-primary font-medium">Afficher les sources</span>
                  <p className="text-[10px] text-muted mt-0.5">Voir d'où viennent les informations</p>
                </div>
                <input
                  type="checkbox"
                  checked={kossiSettings.showSources}
                  onChange={(e) => setKossiSettings(prev => ({ ...prev, showSources: e.target.checked }))}
                  className="h-5 w-5 rounded border-[var(--border-color)] accent-[var(--library-accent)]"
                />
              </label>
              
              {/* Section Mémoire */}
              <div className="pt-4 border-t border-[var(--border-color)]">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Mémoire de Kossi
                </h3>
                <p className="text-xs text-muted mb-3">
                  💡 La mémoire permet à Kossi de se souvenir de vos préférences et du contexte de vos conversations
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--library-surface-alt)] border border-[var(--border-color)] cursor-pointer">
                    <span className="text-sm text-primary">Activer la mémoire</span>
                    <input
                      type="checkbox"
                      checked={kossiMemory.enabled}
                      onChange={(e) => setKossiMemory(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="h-5 w-5 rounded border-[var(--border-color)] accent-[var(--library-accent)]"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--library-surface-alt)] border border-[var(--border-color)] cursor-pointer">
                    <span className="text-sm text-primary">Conserver l'historique</span>
                    <input
                      type="checkbox"
                      checked={kossiMemory.retainHistory}
                      onChange={(e) => setKossiMemory(prev => ({ ...prev, retainHistory: e.target.checked }))}
                      className="h-5 w-5 rounded border-[var(--border-color)] accent-[var(--library-accent)]"
                    />
                  </label>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setKossiMemory({ enabled: false, retainHistory: false, level: "court terme" });
                      localStorage.removeItem("kossi_memory");
                    }}
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Réinitialiser la mémoire
                  </Button>
                </div>
              </div>
              
              {/* Footer */}
              <div className="pt-4 border-t border-[var(--border-color)]">
                <p className="text-[10px] text-muted text-center">
                  Kossi v2.0 • Assistant IA de la Bibliothèque CAEB Natitingou
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
