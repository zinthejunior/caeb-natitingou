import logging
import httpx
import re
from typing import List, Dict, Any, Optional
from fastapi_kossi.core.settings import SERPAPI_API_KEY, BING_SEARCH_API_KEY, MAX_SUGGESTED_BOOKS
from fastapi_kossi.services.embedding_service import get_embedding_provider

logger = logging.getLogger(__name__)

# Liste des mots vides en français pour le filtrage syntaxique
STOP_WORDS = {
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'les', 'des', 'du', 'de',
    'la', 'le', 'un', 'une', 'pour', 'avec', 'sur', 'dans', 'chez', 'et',
    'ou', 'mais', 'a', 'au', 'aux', 'ce', 'ces', 'mon', 'ton', 'son',
    'leur', 'leurs', 'plus', 'moins', 'très', 'bien', 'aussi', 'peut',
    'pouvez', 'voulez', 'recommande', 'recommander', 'cherche', 'cherchez',
}

def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calcule la similarité cosinus entre deux vecteurs."""
    try:
        import numpy as np
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(v1, v2) / (norm1 * norm2))
    except ImportError:
        # Fallback pure-python si numpy n'est pas disponible
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot_product / (norm1 * norm2)


class SearchService:
    """Service centralisé pour la recherche hybride dans le catalogue et la recherche web."""
    
    @staticmethod
    def _extract_keywords(text: str) -> List[str]:
        """Extrait les mots-clés significatifs d'un texte."""
        if not text:
            return []
        words = re.findall(r"\w+", text.lower())
        return [w for w in words if len(w) > 3 and w not in STOP_WORDS]

    @classmethod
    def _compute_keyword_score(cls, book: Dict[str, Any], query_keywords: List[str]) -> float:
        """Calcule un score de pertinence basé sur le nombre de mots-clés correspondants."""
        if not query_keywords:
            return 0.0
            
        text_parts = []
        for field in ["titre", "auteur", "genre", "sous_genre", "resume", "mots_cles", "description"]:
            val = book.get(field)
            if isinstance(val, list):
                val = " ".join(map(str, val))
            if val:
                text_parts.append(str(val).lower())
                
        combined_text = " ".join(text_parts)
        matches = sum(1 for keyword in query_keywords if keyword in combined_text)
        
        # Normalisation entre 0 et 1 (score = fraction de mots-clés trouvés)
        return matches / len(query_keywords)

    @staticmethod
    def _extract_text_from_html(html: str) -> str:
        """Extrait un texte lisible à partir du HTML récupéré."""
        cleaned = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
        cleaned = re.sub(r"<!--.*?-->", " ", cleaned)
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip()

    @classmethod
    async def fetch_web_page(cls, url: str, timeout: float = 8.0) -> Dict[str, str]:
        """Récupère le contenu texte d'une page web et extrait un extrait lisible."""
        if not url:
            return {"url": "", "title": "", "excerpt": ""}
        try:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; KossiBot/1.0; +https://example.com)"}
            async with httpx.AsyncClient(follow_redirects=True, headers=headers, timeout=timeout) as client:
                resp = await client.get(url)
                if resp.status_code != 200 or not resp.text:
                    return {"url": url, "title": "", "excerpt": ""}
                html = resp.text
                title_match = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
                title = title_match.group(1).strip() if title_match else ""
                text = cls._extract_text_from_html(html)
                excerpt = text[:800].strip()
                return {"url": url, "title": title, "excerpt": excerpt}
        except Exception as e:
            logger.warning(f"Impossible de récupérer la page web '{url}' : {e}")
            return {"url": url, "title": "", "excerpt": ""}

    @classmethod
    async def _attach_page_content(cls, results: List[Dict[str, str]], max_pages: int = 3) -> List[Dict[str, str]]:
        """Ajoute des extraits de page aux résultats de recherche web."""
        for result in results[:max_pages]:
            url = result.get("url")
            if not url:
                continue
            page_data = await cls.fetch_web_page(url)
            if page_data.get("page_title"):
                result["page_title"] = page_data["page_title"]
            elif page_data.get("title"):
                result["page_title"] = page_data["title"]
            else:
                result["page_title"] = result.get("title", "")
            result["page_excerpt"] = page_data.get("excerpt", "")
        return results

    @classmethod
    async def hybrid_search_books(cls, books: List[Dict[str, Any]], query: str, limit: int = MAX_SUGGESTED_BOOKS) -> List[str]:
        """Effectue une recherche hybride dans la liste de livres du catalogue.
        Combine la recherche sémantique (RAG) avec la recherche par mots-clés textuelle.
        
        Args:
            books: Liste des livres récupérés depuis le catalogue Django.
            query: La question ou chaîne de recherche de l'utilisateur.
            limit: Le nombre max de suggestions à retourner.
            
        Returns:
            Une liste triée de titres de livres.
        """
        if not books or not query:
            return []

        # 1. Calcul de l'embedding de la requête
        query_embedding = None
        try:
            provider = get_embedding_provider()
            query_embedding = await provider.get_embedding(query)
            logger.info("Embedding de requête généré avec succès pour RAG sémantique.")
        except Exception as e:
            logger.warning(f"Échec RAG sémantique. Bascule sur recherche textuelle pure. Erreur : {e}")

        # 2. Extraction des mots-clés pour recherche textuelle
        query_keywords = cls._extract_keywords(query)
        
        book_scores = []
        for book in books:
            semantic_score = 0.0
            keyword_score = cls._compute_keyword_score(book, query_keywords)
            
            # Si l'embedding de la requête a été généré et que le livre possède un embedding en base
            book_embedding = book.get("embedding")
            if query_embedding and book_embedding and isinstance(book_embedding, list) and len(book_embedding) == len(query_embedding):
                semantic_score = _cosine_similarity(query_embedding, book_embedding)
                
            # Score hybride combiné (70% sémantique, 30% syntaxique)
            # Si le RAG sémantique a échoué, on utilise 100% du score textuel
            if query_embedding and book_embedding:
                hybrid_score = 0.7 * semantic_score + 0.3 * keyword_score
            else:
                hybrid_score = keyword_score
                
            # On ne garde que les livres qui ont au moins une légère pertinence
            if hybrid_score > 0.05:
                book_scores.append((hybrid_score, book))

        # Si aucun livre ne correspond, retourner les premiers livres du catalogue (popularité/fallback)
        if not book_scores:
            return [str(b.get("titre") or b.get("Titre") or b.get("title")) for b in books[:limit] if b]

        # Trier par score hybride décroissant
        book_scores.sort(key=lambda x: x[0], reverse=True)
        
        # Extraire les titres distincts
        suggested = []
        for _, book in book_scores:
            titre = book.get("titre") or book.get("Titre") or book.get("title")
            if titre and titre not in suggested:
                suggested.append(str(titre))
                if len(suggested) >= limit:
                    break
                    
        return suggested


    # ── Instances SearXNG publiques (méta-moteur open source, gratuit, sans clé) ──
    _SEARXNG_INSTANCES: List[str] = [
        "https://searxng.world",
        "https://search.mdosch.de",
        "https://searx.be",
        "https://opnxng.com",
    ]

    @classmethod
    async def _search_serpapi(cls, query: str, limit: int) -> List[Dict[str, str]]:
        """Recherche via SerpAPI (Google Search)."""
        if not SERPAPI_API_KEY:
            return []
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://serpapi.com/search.json",
                    params={"q": query, "api_key": SERPAPI_API_KEY, "num": limit, "hl": "fr"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return [
                        {
                            "title": item.get("title", ""),
                            "url": item.get("link") or item.get("formatted_url", ""),
                            "snippet": item.get("snippet", ""),
                        }
                        for item in data.get("organic_results", [])[:limit]
                    ]
        except Exception as e:
            logger.warning(f"SerpAPI error: {e}")
        return []

    @classmethod
    async def _search_bing(cls, query: str, limit: int) -> List[Dict[str, str]]:
        """Recherche via Bing Web Search API."""
        if not BING_SEARCH_API_KEY:
            return []
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://api.bing.microsoft.com/v7.0/search",
                    headers={"Ocp-Apim-Subscription-Key": BING_SEARCH_API_KEY},
                    params={"q": query, "count": limit, "setLang": "fr"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return [
                        {
                            "title": item.get("name", ""),
                            "url": item.get("url", ""),
                            "snippet": item.get("snippet", ""),
                        }
                        for item in data.get("webPages", {}).get("value", [])[:limit]
                    ]
        except Exception as e:
            logger.warning(f"Bing Search error: {e}")
        return []

    @classmethod
    async def _search_searxng(cls, query: str, limit: int) -> List[Dict[str, str]]:
        """Recherche via instances SearXNG publiques (méta-moteur, aucune clé requise)."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        }
        for instance in cls._SEARXNG_INSTANCES:
            try:
                async with httpx.AsyncClient(timeout=7.0, follow_redirects=True) as client:
                    resp = await client.get(
                        f"{instance}/search",
                        params={
                            "q": query,
                            "format": "json",
                            "language": "fr-FR",
                            "categories": "general",
                        },
                        headers=headers,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        results = [
                            {
                                "title": r.get("title", ""),
                                "url": r.get("url", ""),
                                "snippet": r.get("content", ""),
                            }
                            for r in data.get("results", [])[:limit]
                            if r.get("title") and r.get("url")
                        ]
                        if results:
                            logger.info(f"SearXNG ({instance}) → {len(results)} résultats")
                            return results
            except Exception as e:
                logger.debug(f"SearXNG instance {instance} KO: {e}")
        return []

    @classmethod
    async def _search_wikipedia(cls, query: str, limit: int) -> List[Dict[str, str]]:
        """Recherche Wikipedia FR via l'API OpenSearch — très fiable, sans clé."""
        try:
            async with httpx.AsyncClient(timeout=7.0) as client:
                resp = await client.get(
                    "https://fr.wikipedia.org/w/api.php",
                    params={
                        "action": "opensearch",
                        "search": query,
                        "limit": limit,
                        "namespace": 0,
                        "format": "json",
                        "redirects": "resolve",
                    },
                    headers={"User-Agent": "KossiBot/1.0 (bibliotheque-caeb@benin.bj)"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    # Format: [query, [titles], [descriptions], [urls]]
                    titles = data[1] if len(data) > 1 else []
                    descs = data[2] if len(data) > 2 else []
                    urls = data[3] if len(data) > 3 else []
                    results = []
                    for i, title in enumerate(titles):
                        results.append({
                            "title": title,
                            "url": urls[i] if i < len(urls) else "",
                            "snippet": descs[i] if i < len(descs) else "",
                        })
                    if results:
                        logger.info(f"Wikipedia → {len(results)} résultats")
                    return results
        except Exception as e:
            logger.warning(f"Wikipedia search error: {e}")
        return []

    @classmethod
    async def _search_duckduckgo_json(cls, query: str, limit: int) -> List[Dict[str, str]]:
        """DuckDuckGo Instant Answers API — fiable pour les requêtes factuelles courtes."""
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://api.duckduckgo.com/",
                    params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1, "kl": "fr-fr"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results = []
                    abstract = data.get("AbstractText", "")
                    if abstract:
                        results.append({
                            "title": data.get("Heading", query),
                            "url": data.get("AbstractURL", ""),
                            "snippet": abstract,
                        })
                    for topic in data.get("RelatedTopics", []):
                        if isinstance(topic, dict) and topic.get("Text"):
                            results.append({
                                "title": topic["Text"][:80],
                                "url": topic.get("FirstURL", ""),
                                "snippet": topic["Text"],
                            })
                        if len(results) >= limit:
                            break
                    return results[:limit]
        except Exception as e:
            logger.warning(f"DuckDuckGo JSON error: {e}")
        return []

    @classmethod
    async def search_web(cls, query: str, limit: int = 5, fetch_page_content: bool = False) -> List[Dict[str, str]]:
        """Recherche web multi-moteurs avec cascade automatique de fallbacks.

        Cascade (ordre de priorité) :
          1. SerpAPI (Google) — si SERPAPI_API_KEY est fournie
          2. Bing Web Search — si BING_SEARCH_API_KEY est fournie
          3. SearXNG public — méta-moteur open source, aucune clé requise
          4. DuckDuckGo Instant Answers JSON — réponses factuelles
          5. Wikipedia FR OpenSearch — fallback documentaire fiable

        Si `fetch_page_content` est vrai, les extraits des premières pages
        sont enrichis via fetch_web_page().
        """
        if not query or not query.strip():
            return []

        results: List[Dict[str, str]] = []

        # 1. SerpAPI
        results = await cls._search_serpapi(query, limit)
        if results:
            logger.info(f"Recherche web via SerpAPI → {len(results)} résultats")
            return (await cls._attach_page_content(results, max_pages=min(limit, 3))
                    if fetch_page_content else results)

        # 2. Bing
        results = await cls._search_bing(query, limit)
        if results:
            logger.info(f"Recherche web via Bing → {len(results)} résultats")
            return (await cls._attach_page_content(results, max_pages=min(limit, 3))
                    if fetch_page_content else results)

        # 3. SearXNG (méta-moteur public)
        results = await cls._search_searxng(query, limit)
        if results:
            return (await cls._attach_page_content(results, max_pages=min(limit, 3))
                    if fetch_page_content else results)

        # 4. DuckDuckGo Instant Answers
        results = await cls._search_duckduckgo_json(query, limit)
        if results:
            logger.info(f"Recherche web via DDG JSON → {len(results)} résultats")
            return (await cls._attach_page_content(results, max_pages=min(limit, 3))
                    if fetch_page_content else results)

        # 5. Wikipedia FR (toujours disponible, très fiable)
        results = await cls._search_wikipedia(query, limit)
        if results:
            return results

        logger.warning(f"Aucun résultat web pour la requête : '{query}'")
        return []
