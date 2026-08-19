import sys
import os

# Add project root directory to sys.path so we can import backend packages
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app as base_app, create_app

flask_app = create_app()

class VercelWSGIHandler:
    def __init__(self, wsgi):
        self.wsgi = wsgi

    def __call__(self, environ, start_response):
        # On Vercel, the true requested URL is in RAW_URI, REQUEST_URI, or HTTP_X_FORWARDED_URI
        raw_path = environ.get('RAW_URI') or environ.get('REQUEST_URI') or environ.get('HTTP_X_FORWARDED_URI')
        if raw_path:
            clean_path = raw_path.split('?')[0]
            environ['PATH_INFO'] = clean_path

        return self.wsgi(environ, start_response)

flask_app.wsgi_app = VercelWSGIHandler(flask_app.wsgi_app)

app = flask_app


