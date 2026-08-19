import sys
import os

# Add project root directory to sys.path so we can import backend packages
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app, create_app

# Vercel entrypoint: ensure database schema and default records are initialized
app = create_app()


