"""Alias module for legacy services.embedding_service imports."""
from fastapi_kossi.services.embedding_service import EmbeddingService, get_embedding_provider

__all__ = ["EmbeddingService", "get_embedding_provider"]
