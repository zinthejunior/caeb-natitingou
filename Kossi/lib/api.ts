// ══════════════════════════════════════════════════════════════════════════════
// CLIENT API POUR KOSSI AI
// Fonctions pour communiquer avec le backend FastAPI
// ══════════════════════════════════════════════════════════════════════════════

import type { ChatRequest, ChatResponse, StreamEvent } from "./types";

// URL de base de l'API (configurable via variable d'environnement)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Erreur inconnue";
  }
}

function buildChatPayload(request: ChatRequest): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...request };

  if (!request.messages && request.message) {
    payload.messages = [
      ...(request.history ?? []),
      { role: "user", content: request.message },
    ];
  }

  return payload;
}

/**
 * Envoie un message a Kossi et recoit une reponse complete.
 * 
 * Cette fonction fait un appel POST a /chat et attend la reponse complete
 * avant de la retourner. Pour les longues reponses, preferez sendMessageStream.
 * 
 * @param request - Le message et le contexte a envoyer
 * @returns La reponse de Kossi
 * @throws Error si l'API retourne une erreur
 * 
 * @example
 * const response = await sendMessage({
 *   message: "Je cherche un livre d'aventure",
 *   history: [],
 *   user: null
 * });
 * console.log(response.reply);
 */
export async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildChatPayload(request)),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData && errorData.detail
        ? normalizeErrorMessage(errorData.detail)
        : `Erreur ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Metadata retournee avec la reponse complete
 */
export interface StreamMetadata {
  agent?: string;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  cached?: boolean;
  processing_time?: number;
}

/**
 * Envoie un message a Kossi et recoit la reponse en streaming.
 * 
 * Cette fonction utilise Server-Sent Events (SSE) pour recevoir la reponse
 * par fragments au fur et a mesure de la generation. Cela permet d'afficher
 * la reponse progressivement pour une meilleure experience utilisateur.
 * 
 * @param request - Le message et le contexte a envoyer
 * @param onChunk - Callback appele pour chaque fragment de texte recu
 * @param onComplete - Callback appele quand la generation est terminee (avec reponse complete et metadata)
 * @param onError - Callback appele en cas d'erreur
 * @param signal - Signal d'annulation optionnel
 * 
 * @example
 * await sendMessageStream(
 *   { message: "Raconte-moi une histoire", history: [], user: null },
 *   (chunk) => updateUI(chunk),
 *   (fullResponse, metadata) => console.log("Termine!", fullResponse),
 *   (error) => console.error(error),
 *   abortController.signal
 * );
 */
export async function sendMessageStream(
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string, metadata?: StreamMetadata) => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildChatPayload(request)),
      signal,
    });
      
    if (!response.ok) {
      if (response.status === 404) {
        const fallbackResponse = await sendMessage(request);
        onComplete(fallbackResponse.reply, {
          agent: "orchestrator",
          cached: false,
          sources: fallbackResponse.sources,
        });
        return;
      }

      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData && errorData.detail
          ? normalizeErrorMessage(errorData.detail)
          : `Erreur ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // Lire le flux SSE
    const reader = response.body?.getReader();
    if (!reader) {
      const fallbackResponse = await sendMessage(request);
      onComplete(fallbackResponse.reply, {
        agent: "orchestrator",
        cached: false,
        sources: fallbackResponse.sources,
      });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    let metadata: StreamMetadata | undefined;

    const processEvents = (events: string[]) => {
      for (const rawEvent of events) {
        const line = rawEvent.trim();
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.slice(line.indexOf("data:") + 5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        try {
          const event: StreamEvent = JSON.parse(jsonStr);

          if (event.error) {
            onError(normalizeErrorMessage(event.error));
            return true;
          }

          if (event.chunk) {
            fullResponse += event.chunk;
            onChunk(event.chunk);
          }

          if (event.metadata || event.agent || event.total_length || event.sources) {
            metadata = {
              agent: event.agent || event.metadata?.agent || "kossi-stream",
              sources: event.metadata?.sources || event.sources || undefined,
              cached: event.metadata?.cached || event.cached || false,
              processing_time: event.metadata?.processing_time || event.processing_time,
            } as StreamMetadata;
          }

          if (event.done) {
            onComplete(fullResponse, metadata);
            return true;
          }
        } catch {
          continue;
        }
      }
      return false;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          const events = buffer.replace(/\r/g, "").split(/\n\n+/);
          processEvents(events);
        }
        onComplete(fullResponse, metadata);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.replace(/\r/g, "").split(/\n\n+/);
      buffer = events.pop() || "";

      const aborted = processEvents(events);
      if (aborted) {
        break;
      }
    }
  } catch (error) {
    // Ignorer les erreurs d'annulation
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    onError(normalizeErrorMessage(error));
  }
}

/**
 * Verifie si l'API est accessible.
 * 
 * @returns true si l'API repond, false sinon
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // Timeout de 5 secondes
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Recupere les statistiques de sante de l'API.
 * 
 * @returns Les informations de sante ou null si l'API est inaccessible
 */
export async function getApiHealth(): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return null;
    
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Genere un ID de session unique pour la conversation.
 * 
 * @returns Un identifiant unique base sur timestamp et random
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Envoie un feedback utilisateur sur une reponse de Kossi.
 * 
 * @param sessionId - L'ID de la session
 * @param messageId - L'ID du message concerne
 * @param isHelpful - true si la reponse etait utile, false sinon
 */
export async function sendFeedback(
  sessionId: string,
  messageId: string,
  isHelpful: boolean
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        message_id: messageId,
        is_helpful: isHelpful,
      }),
    });

    if (!response.ok) {
      console.error("[v0] Erreur envoi feedback:", response.statusText);
    }
  } catch (error) {
    console.error("[v0] Erreur envoi feedback:", error);
  }
}
