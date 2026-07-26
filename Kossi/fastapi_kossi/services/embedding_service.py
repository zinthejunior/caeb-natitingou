import httpx
import logging
from abc import ABC, abstractmethod
from typing import List, Optional
from fastapi_kossi.core.settings import HUGGINGFACE_API_KEY, EMBEDDING_MODEL, EMBEDDING_PROVIDER

logger = logging.getLogger(__name__)

class BaseEmbeddingProvider(ABC):
    """Classe de base abstraite définissant l'interface d'un fournisseur d'embeddings.
    Permet de remplacer facilement le fournisseur sémantique à l'avenir.
    """
    
    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Calcule le vecteur d'embedding pour un texte donné.
        
        Args:
            text: Le texte à vectoriser
            
        Returns:
            Une liste de floats représentant le vecteur dense.
        """
        pass


class HuggingFaceEmbeddingProvider(BaseEmbeddingProvider):
    """Fournisseur d'embeddings via l'API serverless gratuite Hugging Face Inference API.
    Utilise par défaut le modèle 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2' (384 dimensions).
    """
    
    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self.model_name = model_name
        self.api_url = f"https://api-inference.huggingface.co/models/{model_name}"

    async def get_embedding(self, text: str) -> List[float]:
        if not text or not text.strip():
            return [0.0] * 384
            
        headers = {}
        if HUGGINGFACE_API_KEY:
            headers["Authorization"] = f"Bearer {HUGGINGFACE_API_KEY}"
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json={"inputs": text},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    # L'API Inference peut renvoyer une liste (1D ou 2D selon les modèles)
                    if isinstance(result, list):
                        if len(result) > 0 and isinstance(result[0], list):
                            return [float(x) for x in result[0]]
                        return [float(x) for x in result]
                        
                logger.warning(
                    f"Échec de l'appel d'embedding HF (HTTP {response.status_code}). "
                    f"Message: {response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'embedding via Hugging Face : {e}")
            
        # En cas d'échec, renvoyer une exception pour que le service RAG puisse le gérer
        raise RuntimeError("Impossible de générer l'embedding sémantique.")


class FallbackEmbeddingProvider(BaseEmbeddingProvider):
    """Fournisseur d'embeddings de secours offline déterministe.
    Génère un pseudo-vecteur à partir de la fonction de hash du texte pour éviter les plantages.
    """
    
    async def get_embedding(self, text: str) -> List[float]:
        logger.warning("Utilisation de l'embedding de secours déterministe (offline).")
        # Création d'un vecteur déterministe pseudo-aléatoire basé sur le texte
        vector = [0.0] * 384
        if not text:
            return vector
            
        import hashlib
        # Hashage du texte pour générer des valeurs reproductibles
        h = hashlib.sha256(text.encode('utf-8')).digest()
        for i in range(384):
            # Utilise les octets du hash pour remplir le vecteur
            byte_val = h[i % 32]
            vector[i] = (byte_val / 255.0) - 0.5
            
        # Normalisation L2 rapide
        norm = sum(x*x for x in vector) ** 0.5
        if norm > 0:
            vector = [x / norm for x in vector]
            
        return vector


def get_embedding_provider() -> BaseEmbeddingProvider:
    """Factory pour récupérer l'implémentation active du fournisseur d'embeddings."""
    if EMBEDDING_PROVIDER == "huggingface":
        return HuggingFaceEmbeddingProvider()
    elif EMBEDDING_PROVIDER == "fallback":
        return FallbackEmbeddingProvider()
    else:
        logger.warning(f"Fournisseur inconnu {EMBEDDING_PROVIDER}, bascule sur HuggingFace.")
        return HuggingFaceEmbeddingProvider()


class EmbeddingService:
    """Service facade pour la generation d'embeddings attendu par l'API et les tests.

    Fournit une methode `generate_embedding(text)` asynchrone qui delegue
    au provider configure via `get_embedding_provider()`.
    """

    @staticmethod
    async def generate_embedding(text: str):
        provider = get_embedding_provider()
        return await provider.get_embedding(text)
