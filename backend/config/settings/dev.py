from .base import *  # noqa: F401,F403

DEBUG = True
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [  # noqa: F405
    "apps.accounts.authentication.ExpiringTokenAuthentication",
    # lets you explore the API in the browser after logging into /admin
    "rest_framework.authentication.SessionAuthentication",
]
