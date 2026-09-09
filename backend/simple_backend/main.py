
"""
Sahayak Backend - Modular FastAPI
Version: 3.0.0
Features: Queue Management, Groq Whisper, Gemini Vision, Organized Architecture
"""

import os
import sys
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import patients, queue, uploads, notes, documents, reports, kiosk
from app.services.storage_service import storage
from app.services.mongo_service import mongo_service
from app.services.mongodb_storage import mongodb_storage

# Load environment variables (supports local and root .env)
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

# Verify API keys with graceful warning fallback
required_keys = ['GEMINI_API_KEY', 'GROQ_API_KEY']
missing_keys = [key for key in required_keys if not os.environ.get(key)]
if missing_keys:
    print(f"[WARN] Notice: Missing API keys {missing_keys}. Intelligent mock/fallback services will be used for testing.")

# Initialize FastAPI
app = FastAPI(
    title="Sahayak Backend",
    description="""
    ## 🏥 Sahayak — Patient Case-Taking Software (PS #26047)
    
    Complete backend system for Indian PHCs featuring:
    - **Patient Registration & Management**
    - **Queue Management System**
    - **AI Scribe** (Audio → SOAP Notes via Groq Whisper + Gemini)
    - **AI Digitizer** (Prescription Images → Structured Data via Gemini Vision)
    - **Real-time Medical Records**
    
    ### Key Features:
    - 🎙️ **Groq Whisper** for Hindi/English audio transcription
    - 🤖 **Gemini 2.0 Flash** for medical note structuring
    - 📸 **Gemini Vision** for prescription OCR
    - 📊 Queue management for efficient patient flow
    - 💾 JSON-based storage (ready for DynamoDB migration)
    
    ### Target Users:
    - **Patients** - Self-service intake at Sahayak Kiosk
    - **Practitioners** - Supervise intake + review AI summaries on dashboard
    """,
    version="3.0.0",
    contact={
        "name": "Team Bored.io",
        "url": "https://github.com/Abhishek040207/Bored.io"
    }
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== INCLUDE ROUTERS ====================

app.include_router(patients.router)
app.include_router(queue.router)
app.include_router(uploads.router)
app.include_router(notes.router)
app.include_router(documents.router)
app.include_router(reports.router)
app.include_router(kiosk.router)


# ==================== ROOT ENDPOINT ====================

@app.get("/", tags=["System"])
def root():
    """
    API Information & Real-time Statistics
    
    Shows current system status and usage metrics
    """
    
    # Get real-time stats
    patients_data = storage.get_all_patients()
    queue_data = storage.get_queue()
    notes_data = storage.get_all_notes()
    
    queue_stats = {
        "waiting": len([q for q in queue_data if q['status'] == 'waiting']),
        "in_progress": len([q for q in queue_data if q['status'] == 'in_progress']),
        "completed_today": len([q for q in queue_data if q['status'] == 'completed']),
        "total": len(queue_data)
    }
    
    total_notes = sum(len(notes) for notes in notes_data.values())
    
    return {
        "service": "PHC AI Co-Pilot Backend",
        "version": "3.0.0",
        "status": "🟢 Running",
        "architecture": "Modular FastAPI",
        "features": [
            "Patient Management",
            "Queue Management",
            "Groq Whisper Transcription (Hindi/English)",
            "Gemini 2.0 Vision OCR",
            "Real-time SOAP Notes",
            "Prescription History",
            "Bhashini NMT Translation (12 Indian Languages)",
            "Bhashini TTS Text-to-Speech",
            "Bhashini ASR Speech-to-Text"
        ],
        "endpoints": {
            "docs": "/docs",
            "patients": "/patients",
            "queue": "/queue",
            "uploads": "/upload",
            "notes": "/notes",
            "history": "/history",
            "translate": "/kiosk/translate",
            "tts": "/kiosk/speech/tts",
            "bhashini_status": "/kiosk/bhashini/status"
        },
        "statistics": {
            "total_patients": len(patients_data),
            "queue": queue_stats,
            "total_notes": total_notes,
            "storage": "JSON (File-based)"
        },
        "integrations": {
            "transcription": "Groq Whisper (whisper-large-v3-turbo)",
            "ai_structuring": "Gemini 2.5 Flash",
            "ocr": "Gemini Vision",
            "translation": "Bhashini NLTM NMT (12 Indian Languages)",
            "tts": "Bhashini NLTM TTS (Natural Indian Voices)",
            "asr": "Bhashini NLTM ASR + Groq Whisper Fallback"
        }
    }


@app.get("/health", tags=["System"])
def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "version": "3.0.0"
    }


@app.get("/stats", tags=["System"])
def detailed_stats():
    """
    Detailed system statistics
    
    For admin dashboard or monitoring
    """
    
    patients_data = storage.get_all_patients()
    queue_data = storage.get_queue()
    notes_data = storage.get_all_notes()
    history_data = storage.get_all_history()
    
    # Calculate detailed stats
    active_patients = [p for p in patients_data.values() if p['status'] == 'active']
    
    patients_by_gender = {}
    for p in patients_data.values():
        gender = p.get('gender', 'unknown')
        patients_by_gender[gender] = patients_by_gender.get(gender, 0) + 1
    
    return {
        "patients": {
            "total": len(patients_data),
            "active": len(active_patients),
            "by_gender": patients_by_gender
        },
        "queue": {
            "current_size": len([q for q in queue_data if q['status'] != 'completed']),
            "waiting": len([q for q in queue_data if q['status'] == 'waiting']),
            "in_progress": len([q for q in queue_data if q['status'] == 'in_progress']),
            "completed": len([q for q in queue_data if q['status'] == 'completed'])
        },
        "notes": {
            "total": sum(len(notes) for notes in notes_data.values()),
            "patients_with_notes": len(notes_data)
        },
        "history": {
            "total_prescriptions": sum(len(h) for h in history_data.values()),
            "patients_with_history": len(history_data)
        }
    }


# ==================== STARTUP/SHUTDOWN EVENTS ====================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("\n" + "="*60)
    print("🏥 PHC AI Co-Pilot Backend Starting...")
    print("="*60)
    print("✅ Storage initialized")
    print("✅ AI services configured (Groq + Gemini)")
    print("🔄 Connecting to storage...")
    try:
        await mongo_service.connect()
        await mongodb_storage.connect()
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️ MongoDB connection unavailable ({e}). Using file-based storage fallback.")
    print("✅ Routes loaded:")
    print("   - /patients  (Patient Management)")
    print("   - /queue     (Queue Management)")
    print("   - /upload    (Audio & Image Processing)")
    print("   - /notes     (Medical Notes)")
    print("   - /history   (Prescription History)")
    print("   - /documents (Multi-Document Timeline)")
    print("   - /kiosk     (MediKiosk Patient Self-Service)")
    print("   - /kiosk/translate  (Bhashini NMT Translation)")
    print("   - /kiosk/speech/tts (Bhashini TTS Text-to-Speech)")
    print("   - /kiosk/bhashini/status (Pipeline Status)")
    print("="*60)
    print("📚 API Documentation: http://localhost:8000/docs")
    print("="*60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("\n🛑 PHC AI Co-Pilot Backend shutting down...")
    await mongo_service.disconnect()
    await mongodb_storage.disconnect()  # NEW: Disconnect MongoDB storage


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
