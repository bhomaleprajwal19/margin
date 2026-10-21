from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

User = get_user_model()


class AuthFlowTests(APITestCase):
    def test_register_returns_token_and_user(self):
        res = self.client.post(
            reverse("register"),
            {"username": "ada", "email": "Ada@Example.com", "password": "analytical-engine-1"},
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["email"], "ada@example.com")

    def test_register_rejects_weak_password(self):
        res = self.client.post(
            reverse("register"), {"username": "bob", "email": "b@x.com", "password": "123"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.data)

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user("ada", "ada@example.com", "analytical-engine-1")
        res = self.client.post(
            reverse("register"),
            {"username": "ada2", "email": "ADA@example.com", "password": "analytical-engine-1"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data)

    def test_login_logout_and_me(self):
        User.objects.create_user("ada", "ada@example.com", "analytical-engine-1")
        res = self.client.post(
            reverse("login"), {"username": "ada", "password": "analytical-engine-1"}
        )
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res.data['token']}")

        me = self.client.get(reverse("me"))
        self.assertEqual(me.data["username"], "ada")

        self.assertEqual(self.client.post(reverse("logout")).status_code, 204)
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)

    def test_login_with_wrong_password(self):
        User.objects.create_user("ada", "ada@example.com", "analytical-engine-1")
        res = self.client.post(reverse("login"), {"username": "ada", "password": "nope"})
        self.assertEqual(res.status_code, 400)


class TokenExpiryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("ada", "ada@example.com", "analytical-engine-1")

    def login(self):
        res = self.client.post(
            reverse("login"), {"username": "ada", "password": "analytical-engine-1"}
        )
        return res.data["token"]

    def test_expired_token_is_rejected_and_deleted(self):
        from datetime import timedelta

        from django.utils import timezone
        from rest_framework.authtoken.models import Token

        key = self.login()
        Token.objects.filter(key=key).update(created=timezone.now() - timedelta(days=30))
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {key}")
        res = self.client.get(reverse("me"))
        self.assertEqual(res.status_code, 401)
        self.assertIn("expired", res.data["detail"])
        self.assertFalse(Token.objects.filter(key=key).exists())

    def test_login_replaces_expired_token(self):
        from datetime import timedelta

        from django.utils import timezone
        from rest_framework.authtoken.models import Token

        old = self.login()
        Token.objects.filter(key=old).update(created=timezone.now() - timedelta(days=30))
        new = self.login()
        self.assertNotEqual(old, new)

    def test_login_reuses_valid_token(self):
        self.assertEqual(self.login(), self.login())
