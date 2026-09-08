"""Configuration and constants for the application"""

import os

# Storage paths — uses local ./data folder when running locally
BASE_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
PATIENTS_FILE = f"{BASE_DIR}/patients.json"
QUEUE_FILE = f"{BASE_DIR}/queue.json"
NOTES_FILE = f"{BASE_DIR}/notes.json"
HISTORY_FILE = f"{BASE_DIR}/history.json"
UPLOADS_DIR = f"{BASE_DIR}/uploads"

# API Keys
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
