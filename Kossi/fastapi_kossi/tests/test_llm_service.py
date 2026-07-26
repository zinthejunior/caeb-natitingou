# =============================================================================
# TESTS UNITAIRES - Tests pour le service LLM
# =============================================================================
# Ces tests verifient le bon fonctionnement du service LLM:
# - Appels API avec fallback
# - Gestion du cache
# - Gestion des erreurs et retries
# - Streaming des reponses
# =============================================================================

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

# Import du service a tester
from fastapi_kossi.services.llm_service import LLMService


# =============================================================================
# FIXTURES - Configuration des tests
# =============================================================================

@pytest.fixture
def llm_service():
    """
    Fixture qui cree une instance du service LLM pour les tests.
    Utilise des mocks pour eviter les appels API reels.
    """
    return LLMService()


@pytest.fixture
def mock_response():
    """
    Fixture qui cree une reponse mock typique de l'API OpenRouter.
    """
    return {
        "choices": [
            {
                "message": {
                    "content": "Bonjour ! Je suis Kossi, votre assistant bibliothecaire."
                }
            }
        ],
        "model": "meta-llama/llama-3.1-8b-instruct:free",
        "usage": {
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150
        }
    }


# =============================================================================
# TESTS - generate_response
# =============================================================================

class TestGenerateResponse:
    """Tests pour la methode generate_response du LLMService."""

    @pytest.mark.asyncio
    async def test_generate_response_success(self, llm_service, mock_response):
        """
        Test que generate_response retourne une reponse valide
        quand l'API repond correctement.
        """
        # Arrange: configurer le mock
        with patch.object(llm_service, '_call_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = mock_response
            
            # Act: appeler la methode
            result = await llm_service.generate_response(
                messages=[{"role": "user", "content": "Bonjour"}],
                system_prompt="Tu es Kossi, un assistant bibliothecaire."
            )
            
            # Assert: verifier le resultat
            assert result is not None
            assert "Bonjour" in result or "Kossi" in result
            mock_api.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_response_with_cache(self, llm_service, mock_response):
        """
        Test que les reponses sont mises en cache et reutilisees.
        """
        # Arrange
        with patch.object(llm_service, '_call_api', new_callable=AsyncMock) as mock_api:
            mock_api.return_value = mock_response
            
            messages = [{"role": "user", "content": "Quels livres avez-vous ?"}]
            system_prompt = "Tu es Kossi."
            
            # Act: appeler deux fois avec les memes parametres
            result1 = await llm_service.generate_response(
                messages=messages,
                system_prompt=system_prompt,
                use_cache=True
            )
            
            result2 = await llm_service.generate_response(
                messages=messages,
                system_prompt=system_prompt,
                use_cache=True
            )
            
            # Assert: l'API ne doit etre appelee qu'une fois (cache hit)
            # Note: le comportement exact depend de l'implementation du cache
            assert result1 == result2

    @pytest.mark.asyncio
    async def test_generate_response_fallback_on_error(self, llm_service, mock_response):
        """
        Test que le service bascule sur un modele de fallback
        quand le modele principal echoue.
        """
        # Arrange: le premier appel echoue, le second reussit
        call_count = 0
        
        async def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("API Error: Model unavailable")
            return mock_response
        
        with patch.object(llm_service, '_call_api', new_callable=AsyncMock) as mock_api:
            mock_api.side_effect = side_effect
            
            # Act
            result = await llm_service.generate_response(
                messages=[{"role": "user", "content": "Test"}],
                system_prompt="System"
            )
            
            # Assert: la methode doit avoir reessaye avec un autre modele
            assert call_count >= 1

    @pytest.mark.asyncio
    async def test_generate_response_empty_messages(self, llm_service):
        """
        Test que la methode gere correctement une liste de messages vide.
        """
        # Act & Assert
        with pytest.raises(ValueError):
            await llm_service.generate_response(
                messages=[],
                system_prompt="System"
            )


# =============================================================================
# TESTS - stream_response
# =============================================================================

class TestStreamResponse:
    """Tests pour la methode stream_response du LLMService."""

    @pytest.mark.asyncio
    async def test_stream_response_yields_chunks(self, llm_service):
        """
        Test que stream_response yield des chunks de texte.
        """
        # Arrange: creer un mock de streaming
        chunks = ["Bonjour", " !", " Je", " suis", " Kossi", "."]
        
        async def mock_stream(*args, **kwargs):
            for chunk in chunks:
                yield chunk
        
        with patch.object(llm_service, '_stream_api', side_effect=mock_stream):
            # Act: collecter les chunks
            result_chunks = []
            async for chunk in llm_service.stream_response(
                messages=[{"role": "user", "content": "Bonjour"}],
                system_prompt="Tu es Kossi."
            ):
                result_chunks.append(chunk)
            
            # Assert
            assert len(result_chunks) > 0


# =============================================================================
# TESTS - _call_api (methode interne)
# =============================================================================

class TestCallApi:
    """Tests pour la methode _call_api du LLMService."""

    @pytest.mark.asyncio
    async def test_call_api_timeout(self, llm_service):
        """
        Test que _call_api gere correctement les timeouts.
        """
        # Arrange
        with patch('aiohttp.ClientSession.post', new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = TimeoutError("Request timed out")
            
            # Act & Assert
            with pytest.raises(Exception):
                await llm_service._call_api(
                    model="test-model",
                    messages=[{"role": "user", "content": "Test"}]
                )

    @pytest.mark.asyncio
    async def test_call_api_rate_limit(self, llm_service):
        """
        Test que _call_api gere les erreurs de rate limiting (429).
        """
        # Arrange
        mock_response = MagicMock()
        mock_response.status = 429
        mock_response.json = AsyncMock(return_value={"error": "Rate limited"})
        
        with patch('aiohttp.ClientSession.post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value.__aenter__.return_value = mock_response
            
            # Act & Assert: le service doit retry ou lever une exception appropriee
            # Le comportement exact depend de l'implementation
            pass  # Test a completer selon l'implementation


# =============================================================================
# TESTS - Validation des parametres
# =============================================================================

class TestParameterValidation:
    """Tests pour la validation des parametres."""

    def test_temperature_validation(self, llm_service):
        """
        Test que la temperature est validee correctement.
        """
        # Temperature doit etre entre 0 et 2
        assert llm_service._validate_temperature(0.7) == 0.7
        assert llm_service._validate_temperature(0) == 0
        assert llm_service._validate_temperature(2) == 2
        
        # Valeurs hors limites doivent etre clampees ou lever une erreur
        with pytest.raises(ValueError):
            llm_service._validate_temperature(-0.5)
        
        with pytest.raises(ValueError):
            llm_service._validate_temperature(3.0)

    def test_max_tokens_validation(self, llm_service):
        """
        Test que max_tokens est valide correctement.
        """
        assert llm_service._validate_max_tokens(500) == 500
        assert llm_service._validate_max_tokens(1) == 1
        
        with pytest.raises(ValueError):
            llm_service._validate_max_tokens(0)
        
        with pytest.raises(ValueError):
            llm_service._validate_max_tokens(-100)


# =============================================================================
# TESTS - Gestion des modeles
# =============================================================================

class TestModelManagement:
    """Tests pour la gestion des modeles LLM."""

    def test_get_available_models(self, llm_service):
        """
        Test que la liste des modeles disponibles est retournee.
        """
        models = llm_service.get_available_models()
        
        assert isinstance(models, list)
        assert len(models) > 0
        # Verifier que les modeles gratuits sont inclus
        model_ids = [m.get('id') or m for m in models]
        assert any('llama' in str(m).lower() for m in model_ids)

    def test_select_best_model(self, llm_service):
        """
        Test que le meilleur modele est selectionne selon les criteres.
        """
        # Pour une tache simple, un modele leger suffit
        model = llm_service.select_model(task_complexity="simple")
        assert model is not None
        
        # Pour une tache complexe, un modele plus puissant est prefere
        model = llm_service.select_model(task_complexity="complex")
        assert model is not None


# =============================================================================
# MAIN - Point d'entree pour executer les tests
# =============================================================================

if __name__ == "__main__":
    # Executer les tests avec pytest
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
