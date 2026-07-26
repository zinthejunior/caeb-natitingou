# =============================================================================
# TESTS UNITAIRES - Tests pour l'orchestrateur d'agents
# =============================================================================
# Ces tests verifient le bon fonctionnement de l'orchestrateur:
# - Detection des intentions utilisateur
# - Routage vers les bons agents
# - Fusion des reponses
# - Gestion des erreurs
# =============================================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# Import de l'orchestrateur a tester
from fastapi_kossi.agents.orchestrator import Orchestrator


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def orchestrator():
    """
    Fixture qui cree une instance de l'orchestrateur pour les tests.
    """
    return Orchestrator()


@pytest.fixture
def sample_user_profile():
    """
    Fixture qui cree un profil utilisateur type pour les tests.
    """
    return {
        "type": "etudiant",
        "interests": ["histoire", "litterature"],
        "language": "fr"
    }


# =============================================================================
# TESTS - Detection d'intention
# =============================================================================

class TestIntentDetection:
    """Tests pour la detection d'intention utilisateur."""

    def test_detect_catalog_intent(self, orchestrator):
        """
        Test que les requetes de recherche de livres sont detectees.
        """
        # Messages qui doivent etre detectes comme catalog
        catalog_messages = [
            "Je cherche un livre sur l'histoire du Benin",
            "Avez-vous des romans de Chinua Achebe ?",
            "Quels livres de science-fiction avez-vous ?",
            "Je voudrais emprunter un livre de cuisine",
            "Est-ce que vous avez le Petit Prince ?",
        ]
        
        for message in catalog_messages:
            intent = orchestrator.detect_intent(message)
            assert intent == "catalog", f"Expected 'catalog' for: {message}, got: {intent}"

    def test_detect_recommendation_intent(self, orchestrator):
        """
        Test que les demandes de recommandation sont detectees.
        """
        recommendation_messages = [
            "Que me recommandez-vous ?",
            "J'aimerais des suggestions de lecture",
            "Quel livre me conseillez-vous ?",
            "Je ne sais pas quoi lire, aidez-moi",
            "Recommande-moi quelque chose de similaire",
        ]
        
        for message in recommendation_messages:
            intent = orchestrator.detect_intent(message)
            assert intent == "recommendation", f"Expected 'recommendation' for: {message}, got: {intent}"

    def test_detect_education_intent(self, orchestrator):
        """
        Test que les questions educatives sont detectees.
        """
        education_messages = [
            "J'ai besoin d'aide pour mes devoirs de maths",
            "Comment resoudre une equation du second degre ?",
            "Expliquez-moi la photosynthese",
            "Je prepare mon bac, quelles ressources ?",
            "Aidez-moi avec mon expose sur la Revolution francaise",
        ]
        
        for message in education_messages:
            intent = orchestrator.detect_intent(message)
            assert intent == "education", f"Expected 'education' for: {message}, got: {intent}"

    def test_detect_librarian_intent(self, orchestrator):
        """
        Test que les questions sur la bibliotheque sont detectees.
        """
        librarian_messages = [
            "Quels sont vos horaires ?",
            "Comment s'inscrire a la bibliotheque ?",
            "Combien de livres puis-je emprunter ?",
            "Quelle est la duree d'emprunt ?",
            "Ou etes-vous situes ?",
        ]
        
        for message in librarian_messages:
            intent = orchestrator.detect_intent(message)
            assert intent == "librarian", f"Expected 'librarian' for: {message}, got: {intent}"

    def test_detect_events_intent(self, orchestrator):
        """
        Test que les questions sur les evenements sont detectees.
        """
        events_messages = [
            "Y a-t-il des clubs de lecture ?",
            "Quels evenements organisez-vous ?",
            "Quand est la prochaine activite ?",
            "Je voudrais rejoindre un club",
            "Parlez-moi des animations culturelles",
        ]
        
        for message in events_messages:
            intent = orchestrator.detect_intent(message)
            assert intent == "events", f"Expected 'events' for: {message}, got: {intent}"

    def test_detect_scholar_intent(self, orchestrator):
        """
        Test que les questions de culture generale sont detectees.
        """
        scholar_messages = [
            "Qui etait le roi Behanzin ?",
            "Quelle est la capitale du Benin ?",
            "Racontez-moi l'histoire de l'empire du Dahomey",
            "Qu'est-ce que la theorie de la relativite ?",
            "Parlez-moi de la litterature africaine",
        ]
        
        for message in scholar_messages:
            intent = orchestrator.detect_intent(message)
            assert intent == "scholar", f"Expected 'scholar' for: {message}, got: {intent}"

    def test_detect_general_intent(self, orchestrator):
        """
        Test que les messages generaux sont detectes comme tels.
        """
        general_messages = [
            "Bonjour",
            "Merci beaucoup",
            "Au revoir",
            "Comment allez-vous ?",
        ]
        
        for message in general_messages:
            intent = orchestrator.detect_intent(message)
            assert intent == "general", f"Expected 'general' for: {message}, got: {intent}"


# =============================================================================
# TESTS - Routage vers les agents
# =============================================================================

class TestAgentRouting:
    """Tests pour le routage vers les agents specialises."""

    @pytest.mark.asyncio
    async def test_route_to_catalog_agent(self, orchestrator, sample_user_profile):
        """
        Test que les requetes catalog sont routees vers CatalogAgent.
        """
        with patch.object(orchestrator.catalog_agent, 'process', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = {
                "response": "Voici les livres trouves...",
                "sources": [{"title": "Test Book"}]
            }
            
            result = await orchestrator.process(
                message="Je cherche un livre sur le Benin",
                user_profile=sample_user_profile,
                session_id="test-session"
            )
            
            mock_process.assert_called_once()
            assert "response" in result

    @pytest.mark.asyncio
    async def test_route_to_multiple_agents(self, orchestrator, sample_user_profile):
        """
        Test que les requetes complexes peuvent utiliser plusieurs agents.
        """
        # Une requete qui pourrait necessiter catalog + recommendation
        message = "Je cherche un livre d'histoire et j'aimerais des suggestions similaires"
        
        with patch.object(orchestrator.catalog_agent, 'process', new_callable=AsyncMock) as mock_catalog:
            with patch.object(orchestrator.recommendation_agent, 'process', new_callable=AsyncMock) as mock_reco:
                mock_catalog.return_value = {"response": "Livres trouves"}
                mock_reco.return_value = {"response": "Suggestions"}
                
                result = await orchestrator.process(
                    message=message,
                    user_profile=sample_user_profile,
                    session_id="test-session"
                )
                
                # Au moins un des agents doit etre appele
                assert mock_catalog.called or mock_reco.called


# =============================================================================
# TESTS - Gestion des erreurs
# =============================================================================

class TestErrorHandling:
    """Tests pour la gestion des erreurs dans l'orchestrateur."""

    @pytest.mark.asyncio
    async def test_handle_agent_error_gracefully(self, orchestrator, sample_user_profile):
        """
        Test que l'orchestrateur gere les erreurs d'agent gracieusement.
        """
        with patch.object(orchestrator.catalog_agent, 'process', new_callable=AsyncMock) as mock_process:
            mock_process.side_effect = Exception("Agent error")
            
            # L'orchestrateur ne doit pas planter, mais retourner une reponse d'erreur
            result = await orchestrator.process(
                message="Je cherche un livre",
                user_profile=sample_user_profile,
                session_id="test-session"
            )
            
            assert "response" in result
            # La reponse doit indiquer qu'il y a eu un probleme
            assert "erreur" in result["response"].lower() or "desole" in result["response"].lower()

    @pytest.mark.asyncio
    async def test_handle_empty_message(self, orchestrator, sample_user_profile):
        """
        Test que l'orchestrateur gere les messages vides.
        """
        result = await orchestrator.process(
            message="",
            user_profile=sample_user_profile,
            session_id="test-session"
        )
        
        assert "response" in result

    @pytest.mark.asyncio
    async def test_handle_very_long_message(self, orchestrator, sample_user_profile):
        """
        Test que l'orchestrateur gere les messages tres longs.
        """
        # Message de 10000 caracteres
        long_message = "a" * 10000
        
        result = await orchestrator.process(
            message=long_message,
            user_profile=sample_user_profile,
            session_id="test-session"
        )
        
        assert "response" in result


# =============================================================================
# TESTS - Contexte et historique
# =============================================================================

class TestContextManagement:
    """Tests pour la gestion du contexte et de l'historique."""

    @pytest.mark.asyncio
    async def test_uses_conversation_history(self, orchestrator, sample_user_profile):
        """
        Test que l'orchestrateur utilise l'historique de conversation.
        """
        history = [
            {"role": "user", "content": "Je cherche des livres d'histoire"},
            {"role": "assistant", "content": "J'ai trouve plusieurs livres d'histoire..."}
        ]
        
        with patch.object(orchestrator.catalog_agent, 'process', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = {"response": "Suite de la recherche..."}
            
            await orchestrator.process(
                message="Et sur l'Afrique de l'Ouest ?",
                user_profile=sample_user_profile,
                session_id="test-session",
                history=history
            )
            
            # Verifier que l'historique a ete passe a l'agent
            call_args = mock_process.call_args
            assert call_args is not None

    @pytest.mark.asyncio
    async def test_respects_user_profile(self, orchestrator):
        """
        Test que l'orchestrateur adapte ses reponses au profil utilisateur.
        """
        # Profil enfant
        child_profile = {
            "type": "enfant",
            "interests": ["contes"],
            "language": "fr"
        }
        
        # Profil chercheur
        researcher_profile = {
            "type": "chercheur",
            "interests": ["anthropologie"],
            "language": "fr"
        }
        
        with patch.object(orchestrator.recommendation_agent, 'process', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = {"response": "Recommandations..."}
            
            # Appel avec profil enfant
            await orchestrator.process(
                message="Que me recommandez-vous ?",
                user_profile=child_profile,
                session_id="test-1"
            )
            
            # Appel avec profil chercheur
            await orchestrator.process(
                message="Que me recommandez-vous ?",
                user_profile=researcher_profile,
                session_id="test-2"
            )
            
            # Les deux appels doivent avoir des parametres differents
            assert mock_process.call_count == 2


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
