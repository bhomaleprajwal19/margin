from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed


def token_expired(token):
    return token.created < timezone.now() - timedelta(hours=settings.AUTH_TOKEN_TTL_HOURS)


def issue_token(user):
    """Return the user's token, replacing it if it has expired."""
    token, created = Token.objects.get_or_create(user=user)
    if not created and token_expired(token):
        token.delete()
        token = Token.objects.create(user=user)
    return token


class ExpiringTokenAuthentication(TokenAuthentication):
    """DRF token auth, but tokens stop working AUTH_TOKEN_TTL_HOURS after they were issued."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if token_expired(token):
            token.delete()
            raise AuthenticationFailed("Your session has expired. Please sign in again.")
        return user, token
