"""
Agents package — Kossi Multi-Agent Platform

Agents disponibles :
- orchestrator.KossiOrchestrator   : Agent orchestrateur central (point d'entrée unique)
- catalog_agent.CatalogAgent       : Recherche hybride RAG dans le catalogue
- recommendation_agent.RecommendationAgent : Recommandations personnalisées
- education_agent.EducationAgent   : Soutien scolaire & ressources académiques
- scholar_agent.ScholarAgent       : Culture générale & encyclopédie
- events_agent.EventsAgent         : Clubs, événements et activités culturelles
- web_agent.WebAgent               : Recherche sur internet (SerpAPI/Bing/DDG)
- librarian_agent.LibrarianAgent   : Services pratiques de la bibliothèque
"""

from fastapi_kossi.agents.orchestrator import KossiOrchestrator
from fastapi_kossi.agents.catalog_agent import CatalogAgent
from fastapi_kossi.agents.recommendation_agent import RecommendationAgent
from fastapi_kossi.agents.education_agent import EducationAgent
from fastapi_kossi.agents.scholar_agent import ScholarAgent
from fastapi_kossi.agents.events_agent import EventsAgent
from fastapi_kossi.agents.web_agent import WebAgent
from fastapi_kossi.agents.librarian_agent import LibrarianAgent

__all__ = [
    "KossiOrchestrator",
    "CatalogAgent",
    "RecommendationAgent",
    "EducationAgent",
    "ScholarAgent",
    "EventsAgent",
    "WebAgent",
    "LibrarianAgent",
]
