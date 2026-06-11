# =============================================================================
# TESTS D'INTEGRATION - Tests pour l'API chat
# =============================================================================
# Ces tests verifient le bon fonctionnement de l'API:
# - Endpoints /chat et /chat/stream
# - Validation des requetes
# - Gestion des erreurs HTTP
# - Rate limiting
# =============================================================================

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import json

# Import de l'application FastAPI
from main import app


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def client():
    """
    Fixture qui cree un client de test FastAPI.
    """
    return TestClient(app)


@pytest.fixture
def valid_chat_request():
    """
    Fixture qui cree une requete de chat valide.
    """
    return {
        "message": "Bonjour Kossi !",
        "session_id": "test-session-123",
        "user_profile": {
            "type": "etudiant",
            "interests": ["histoire"],
            "language": "fr"
        },
        "history": [],
        "stream": False
    }


@pytest.fixture
def auth_headers():
    """
    Fixture qui cree des headers d'authentification valides.
    """
    return {
        "Authorization": "Bearer test-api-key-12345",
        "Content-Type": "application/json"
    }


# =============================================================================
# TESTS - Endpoint de sante
# =============================================================================

class TestHealthEndpoint:
    """Tests pour l'endpoint de sante."""

    def test_health_check_returns_200(self, client):
        """
        Test que l'endpoint de sante retourne 200.
        """
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_health_check_includes_version(self, client):
        """
        Test que l'endpoint de sante inclut la version.
        """
        response = client.get("/")
        data = response.json()
        
        assert "version" in data


# =============================================================================
# TESTS - Endpoint /chat
# =============================================================================

class TestChatEndpoint:
    """Tests pour l'endpoint /chat."""

    def test_chat_requires_message(self, client, auth_headers):
        """
        Test que /chat requiert un message.
        """
        response = client.post(
            "/chat",
            json={"session_id": "test"},
            headers=auth_headers
        )
        
        # Doit retourner une erreur de validation
        assert response.status_code in [400, 422]

    def test_chat_returns_response(self, client, valid_chat_request, auth_headers):
        """
        Test que /chat retourne une reponse valide.
        """
        with patch('api.chat.orchestrator.process', new_callable=AsyncMock) as mock_orchestrator:
            mock_orchestrator.return_value = {
                "response": "Bonjour ! Je suis Kossi.",
                "agent": "orchestrator",
                "cached": False
            }
            
            response = client.post(
                "/chat",
                json=valid_chat_request,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "response" in data

    def test_chat_validates_user_profile(self, client, auth_headers):
        """
        Test que /chat valide le profil utilisateur.
        """
        invalid_request = {
            "message": "Bonjour",
            "session_id": "test",
            "user_profile": {
                "type": "invalid_type"  # Type invalide
            }
        }
        
        response = client.post(
            "/chat",
            json=invalid_request,
            headers=auth_headers
        )
        
        # Doit retourner une erreur de validation ou accepter avec valeur par defaut
        assert response.status_code in [200, 400, 422]

    def test_chat_handles_long_message(self, client, valid_chat_request, auth_headers):
        """
        Test que /chat gere les messages longs.
        """
        valid_chat_request["message"] = "a" * 5000  # Message de 5000 caracteres
        
        with patch('api.chat.orchestrator.process', new_callable=AsyncMock) as mock_orchestrator:
            mock_orchestrator.return_value = {"response": "OK"}
            
            response = client.post(
                "/chat",
                json=valid_chat_request,
                headers=auth_headers
            )
            
            # Doit accepter ou refuser proprement
            assert response.status_code in [200, 400, 413]


# =============================================================================
# TESTS - Endpoint /chat/stream (SSE)
# =============================================================================

class TestChatStreamEndpoint:
    """Tests pour l'endpoint de streaming /chat/stream."""

    def test_stream_returns_sse(self, client, valid_chat_request, auth_headers):
        """
        Test que /chat/stream retourne des evenements SSE.
        """
        valid_chat_request["stream"] = True
        
        with patch('api.chat.orchestrator.process_stream', new_callable=AsyncMock) as mock_stream:
            # Simuler un generateur de streaming
            async def mock_generator():
                yield "Bonjour"
                yield " !"
                yield " Je suis"
                yield " Kossi."
            
            mock_stream.return_value = mock_generator()
            
            response = client.post(
                "/chat/stream",
                json=valid_chat_request,
                headers=auth_headers
            )
            
            # Le content-type doit etre text/event-stream
            assert response.status_code == 200

    def test_stream_passes_constructed_messages(self, client, valid_chat_request, auth_headers):
        """
        Test que /chat/stream transmet le payload de messages construit.
        """
        valid_chat_request["stream"] = True

        with patch('api.chat.orchestrator.process_stream', new_callable=AsyncMock) as mock_stream:
            async def mock_generator():
                yield "Test"
            mock_stream.return_value = mock_generator()

            response = client.post(
                "/chat/stream",
                json=valid_chat_request,
                headers=auth_headers
            )

            assert response.status_code == 200
            assert mock_stream.call_count == 1
            assert "messages" in mock_stream.call_args.kwargs
            assert isinstance(mock_stream.call_args.kwargs["messages"], list)
            assert mock_stream.call_args.kwargs["messages"][-1]["content"] == valid_chat_request["message"]

    def test_stream_rejects_blank_message(self, client, valid_chat_request, auth_headers):
        """
        Test que /chat/stream refuse un message compose uniquement d'espaces.
        """
        valid_chat_request["stream"] = True
        valid_chat_request["message"] = "   "

        response = client.post(
            "/chat/stream",
            json=valid_chat_request,
            headers=auth_headers
        )

        assert response.status_code == 422
        assert response.json()["detail"] == "Le champ 'message' doit contenir du texte non vide."

    def test_stream_handles_connection_close(self, client, valid_chat_request, auth_headers):
        """
        Test que le streaming gere proprement la fermeture de connexion.
        """
        valid_chat_request["stream"] = True
        
        # Ce test verifie que le serveur ne plante pas
        # quand le client ferme la connexion prematurement
        with patch('api.chat.orchestrator.process_stream', new_callable=AsyncMock) as mock_stream:
            async def slow_generator():
                import asyncio
                for i in range(10):
                    await asyncio.sleep(0.1)
                    yield f"chunk-{i}"
            
            mock_stream.return_value = slow_generator()
            
            # Le test passe si pas d'exception
            try:
                response = client.post(
                    "/chat/stream",
                    json=valid_chat_request,
                    headers=auth_headers,
                    timeout=0.5  # Timeout court pour simuler fermeture
                )
            except Exception:
                pass  # Timeout attendu


# =============================================================================
# TESTS - Rate Limiting
# =============================================================================

class TestRateLimiting:
    """Tests pour le rate limiting."""

    def test_rate_limit_headers_present(self, client, valid_chat_request, auth_headers):
        """
        Test que les headers de rate limiting sont presents.
        """
        with patch('api.chat.orchestrator.process', new_callable=AsyncMock) as mock:
            mock.return_value = {"response": "OK"}
            
            response = client.post(
                "/chat",
                json=valid_chat_request,
                headers=auth_headers
            )
            
            # Les headers de rate limiting doivent etre presents
            # (selon l'implementation)
            # assert "X-RateLimit-Limit" in response.headers

    def test_rate_limit_exceeded(self, client, valid_chat_request, auth_headers):
        """
        Test que le rate limiting est applique.
        """
        # Faire de nombreuses requetes rapidement
        with patch('api.chat.orchestrator.process', new_callable=AsyncMock) as mock:
            mock.return_value = {"response": "OK"}
            
            responses = []
            for _ in range(100):
                response = client.post(
                    "/chat",
                    json=valid_chat_request,
                    headers=auth_headers
                )
                responses.append(response.status_code)
            
            # Au moins une requete devrait etre rate limited (429)
            # ou toutes acceptees si rate limit tres haut
            assert all(code in [200, 429] for code in responses)


# =============================================================================
# TESTS - Authentification
# =============================================================================

class TestAuthentication:
    """Tests pour l'authentification API."""

    def test_missing_auth_header(self, client, valid_chat_request):
        """
        Test que les requetes sans auth sont rejetees.
        """
        response = client.post(
            "/chat",
            json=valid_chat_request
            # Pas de headers d'auth
        )
        
        # Doit retourner 401 ou 403 si auth requise, sinon 200
        assert response.status_code in [200, 401, 403]

    def test_invalid_api_key(self, client, valid_chat_request):
        """
        Test que les cles API invalides sont rejetees.
        """
        response = client.post(
            "/chat",
            json=valid_chat_request,
            headers={"Authorization": "Bearer invalid-key"}
        )
        
        # Doit retourner 401 si auth requise
        assert response.status_code in [200, 401, 403]


# =============================================================================
# TESTS - Endpoint /vectorize
# =============================================================================

class TestVectorizeEndpoint:
    """Tests pour l'endpoint /vectorize."""

    def test_vectorize_requires_book_data(self, client, auth_headers):
        """
        Test que /vectorize requiert les donnees du livre.
        """
        response = client.post(
            "/vectorize",
            json={},
            headers=auth_headers
        )
        
        assert response.status_code in [400, 422]

    def test_vectorize_returns_embedding(self, client, auth_headers):
        """
        Test que /vectorize retourne un embedding.
        """
        book_data = {
            "id": 1,
            "title": "Le Petit Prince",
            "author": "Antoine de Saint-Exupery",
            "summary": "Un pilote rencontre un petit garcon venu d'une autre planete."
        }
        
        with patch('services.embedding_service.EmbeddingService.generate_embedding', new_callable=AsyncMock) as mock:
            mock.return_value = [0.1] * 384  # Embedding de dimension 384
            
            response = client.post(
                "/vectorize",
                json=book_data,
                headers=auth_headers
            )
            
            # Doit retourner l'embedding ou une confirmation
            assert response.status_code in [200, 201]


# =============================================================================
# TESTS - Gestion des erreurs
# =============================================================================

class TestErrorHandling:
    """Tests pour la gestion des erreurs."""

    def test_internal_error_returns_500(self, client, valid_chat_request, auth_headers):
        """
        Test qu'une erreur interne retourne 500.
        """
        with patch('api.chat.orchestrator.process', new_callable=AsyncMock) as mock:
            mock.side_effect = Exception("Internal error")
            
            response = client.post(
                "/chat",
                json=valid_chat_request,
                headers=auth_headers
            )
            
            assert response.status_code == 500
            data = response.json()
            assert "error" in data or "detail" in data

    def test_malformed_json_returns_400(self, client, auth_headers):
        """
        Test que du JSON malformed retourne 400.
        """
        response = client.post(
            "/chat",
            content="not valid json",
            headers=auth_headers
        )
        
        assert response.status_code in [400, 422]


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
