from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom authentication class that looks for the 'access' token in HttpOnly cookies.
    This allows session persistence without exposing tokens to JavaScript (XSS protection).
    """
    def authenticate(self, request):
        # Chercher d'abord dans les headers classiques (compatibilité avec d'autres clients)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                return super().authenticate(request)

        # Chercher ensuite dans les cookies si aucun header n'est présent
        raw_token = request.COOKIES.get('access')
        if raw_token is None:
            return None

        # Valider le jeton trouvé dans le cookie
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
