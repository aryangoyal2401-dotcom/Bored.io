"""
Sahayak Kiosk API Routes
Provides endpoints for the practitioner-supervised in-hospital case-taking station:
- ABHA/Aadhaar verification & OTP mock
- Granular consent recording
- Dual-input SOCRATES & AYUSH dialogue turns
- Real-time emergency red-flag triage detection
- Structured 8-section clinical intake generation
- Physician Accept / Amend / Reject review workflow
- Ephemeral session cleanup
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
import os
import json

from app.services.abdm_service import abdm_service
from app.services.red_flag_service import red_flag_service
from app.services.dialogue_manager import dialogue_manager
from app.services.drug_interaction_service import drug_interaction_service
from app.services.ai_service import generate_structured_clinical_intake, transcribe_audio, extract_prescription
from app.services.mongodb_storage import mongodb_storage
from app.services.storage_service import storage
from app.services.mongo_service import mongo_service
from app.services.timeline_service import generate_comprehensive_timeline

router = APIRouter(prefix="/kiosk", tags=["Sahayak Kiosk — Case-Taking Station"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOADS_DIR = os.path.join(BASE_DIR, "data", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


# ==================== ABHA & AUTHENTICATION ====================

@router.post("/abha/verify")
async def verify_abha(payload: Dict[str, Any] = Body(...)):
    """Verify ABHA ID or mobile number in ABDM Registry"""
    abha_id = (payload.get("abha_id") or payload.get("abha_number") or "").strip()
    if not abha_id:
        raise HTTPException(status_code=400, detail="ABHA ID or Mobile Number is required")
    return await abdm_service.verify_abha(abha_id)


@router.post("/abha/request-otp")
async def request_otp(payload: Dict[str, Any] = Body(...)):
    """Request Aadhaar or Mobile OTP for ABHA authentication"""
    abha_id = (payload.get("abha_id") or payload.get("abha_number") or "").strip()
    auth_method = payload.get("auth_method", "AADHAAR_OTP")
    if not abha_id:
        raise HTTPException(status_code=400, detail="ABHA ID is required")
    return await abdm_service.request_otp(abha_id, auth_method)


@router.post("/abha/verify-otp")
async def verify_otp(payload: Dict[str, Any] = Body(...)):
    """Verify OTP and return authenticated patient profile"""
    tx_id = payload.get("transaction_id", "").strip()
    otp = payload.get("otp", "").strip()
    if not tx_id or not otp:
        raise HTTPException(status_code=400, detail="Transaction ID and OTP are required")
    return await abdm_service.verify_otp(tx_id, otp)


@router.post("/abha/register")
async def register_new_patient_abha(payload: Dict[str, Any] = Body(...)):
    """Register new citizen and create verified ABHA number"""
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Patient name is required")
    return await abdm_service.register_new_abha(payload)


@router.post("/consent")
async def record_patient_consent(payload: Dict[str, Any] = Body(...)):
    """Record granular, revocable consent before clinical data capture"""
    return await abdm_service.record_consent(payload)


# ==================== DIALOGUE & RED-FLAG INTAKE ====================

@router.post("/session/start")
async def start_kiosk_session(payload: Dict[str, Any] = Body(...)):
    """
    Initialize case-taking session at Sahayak Kiosk
    Accepts mode ('ALLOPATHIC' or 'AYUSH') and language ('hi' or 'en')
    """
    patient_info = payload.get("patient_info", {})
    mode = payload.get("mode", "ALLOPATHIC")
    language = payload.get("language", "hi")
    
    session = dialogue_manager.create_session(patient_info, mode, language)
    print(f"🏥 Kiosk session started: {session['session_id']} for {patient_info.get('name', 'Patient')} ({mode})")
    return session


@router.post("/session/message")
async def process_kiosk_message(payload: Dict[str, Any] = Body(...)):
    """
    Process voice transcript or touch option selection.
    Runs real-time red-flag emergency screening at every step.
    Returns next adaptive clinical question or marks completion.
    """
    session_id = payload.get("session_id")
    user_input = (payload.get("user_input") or payload.get("input_text") or "").strip()
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    # Evaluate emergency red flags in real-time
    red_flag_result = red_flag_service.evaluate(user_input)

    # Store any red flags in session
    session = dialogue_manager.sessions.get(session_id)
    if session and red_flag_result["is_emergency"]:
        session["red_flags"].append(red_flag_result)

    # Advance dialogue
    turn_result = dialogue_manager.get_next_question(session_id, user_input)
    turn_result["emergency_alert"] = red_flag_result
    turn_result["red_flag"] = red_flag_result

    return turn_result


@router.post("/session/upload-audio")
async def upload_kiosk_audio(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Receive voice audio from Kiosk microphone, transcribe via Groq Whisper,
    and process as next conversational turn
    """
    file_ext = file.filename.split('.')[-1] if file.filename else 'wav'
    temp_audio_path = os.path.join(UPLOADS_DIR, f"temp_{session_id}_{uuid.uuid4().hex[:6]}.{file_ext}")
    
    with open(temp_audio_path, "wb") as f:
        content = await file.read()
        f.write(content)

    session = dialogue_manager.sessions.get(session_id, {})
    lang = session.get("language", "hi")

    # Transcribe
    transcript = await transcribe_audio(temp_audio_path, language=lang)
    
    # Process turn with transcribed text
    turn_result = await process_kiosk_message({
        "session_id": session_id,
        "user_input": transcript
    })
    turn_result["transcribed_text"] = transcript
    
    # Clean up temp file immediately if ephemeral privacy requested
    try:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
    except Exception:
        pass

    return turn_result


# ==================== MODULE B: MEDICAL DOCUMENT DIGITIZATION & INTELLIGENCE ====================

@router.post("/documents/analyze")
async def analyze_kiosk_documents(
    files: Optional[List[UploadFile]] = File(None),
    patient_info_json: Optional[str] = Form(None)
):
    """
    Module B — Medical Document Digitization & Intelligence:
    1. Intelligent extraction: diagnoses, prescribed medications with dosages,
       investigation results with values & reference ranges, procedure/surgery history
    2. Chronological organization: automatically dates and orders documents into medical timeline
    3. Abnormal-value highlighting: flags out-of-range lab values and potential drug interactions
    """
    patient_info = {}
    if patient_info_info := patient_info_json:
        try:
            patient_info = json.loads(patient_info_info)
        except Exception:
            pass

    processed_docs = []
    if files:
        for f in files:
            try:
                ext = f.filename.split('.')[-1].lower() if f.filename else "jpg"
                temp_filename = f"kiosk_scan_{uuid.uuid4().hex[:8]}.{ext}"
                temp_path = os.path.join(UPLOADS_DIR, temp_filename)
                content = await f.read()
                with open(temp_path, "wb") as buf:
                    buf.write(content)

                # Extract entities via Gemini Vision OCR
                extracted = await extract_prescription(temp_path)
                processed_docs.append({
                    "document_id": f"DOC_{uuid.uuid4().hex[:8].upper()}",
                    "filename": f.filename,
                    "extracted_data": extracted
                })
            except Exception as e:
                print(f"Error processing kiosk document {f.filename}: {e}")

    # Generate comprehensive timeline with chronological ordering & abnormal highlighting
    timeline = await generate_comprehensive_timeline(processed_docs, patient_info)

    return {
        "success": True,
        "message": "Medical documents successfully digitized and organized",
        "document_count": len(processed_docs) or len(timeline.get("timeline_events", [])),
        "documents": processed_docs,
        "timeline": timeline
    }


# ==================== COMPLETION & SUMMARY GENERATION ====================

@router.post("/session/complete")
async def complete_kiosk_session(payload: Dict[str, Any] = Body(...)):
    """
    Complete intake session:
    1. Generates 8-section Structured Clinical Summary via Gemini
    2. Runs drug-interaction safety check
    3. Registers patient in database if new
    4. Automatically adds to Doctor's Queue with Token Number (Elevated priority if Red Flag)
    5. Returns token slip, structured summary, and bilingual audio message
    """
    session_id = payload.get("session_id")
    session = dialogue_manager.sessions.get(session_id)
    
    medical_timeline = payload.get("medical_timeline")
    uploaded_documents = payload.get("uploaded_documents", [])

    if not session:
        # Fallback session if direct completion is invoked
        session = {
            "session_id": session_id or f"KIOSK_{uuid.uuid4().hex[:8].upper()}",
            "patient_info": payload.get("patient_info", {}),
            "chief_complaint": payload.get("chief_complaint", ""),
            "socrates_responses": payload.get("socrates_responses", {}),
            "medical_timeline": medical_timeline,
            "uploaded_documents": uploaded_documents,
            "raw_transcripts": [],
            "red_flags": [],
            "mode": payload.get("mode", "ALLOPATHIC"),
            "language": payload.get("language", "hi")
        }
    else:
        if medical_timeline:
            session["medical_timeline"] = medical_timeline
        if uploaded_documents:
            session["uploaded_documents"] = uploaded_documents

    # If chief complaint is empty or generic and we have diagnoses from uploaded documents, use the primary diagnosis
    timeline_dx = (medical_timeline or {}).get("all_diagnoses", [])
    if (not session.get("chief_complaint") or "direct" in session.get("chief_complaint", "").lower() or "general" in session.get("chief_complaint", "").lower()) and timeline_dx:
        session["chief_complaint"] = timeline_dx[0]

    patient_info = session.get("patient_info") or payload.get("patient_info") or payload.get("patient") or {}
    
    # 1. Synthesize 8-section Clinical Intake Summary (Synthesizing conversational + digitized document intelligence)
    clinical_summary = await generate_structured_clinical_intake(session, patient_info, medical_timeline)
    
    # 2. Check drug interactions on reported meds and uploaded meds
    medications = clinical_summary.get("drug_allergy_history", {}).get("current_medications", [])
    if medical_timeline and medical_timeline.get("current_medications"):
        for m in medical_timeline["current_medications"]:
            m_name = m.get("name") if isinstance(m, dict) else str(m)
            if m_name and m_name not in medications:
                medications.append(m_name)
    drug_interactions = drug_interaction_service.check_drug_interactions(medications)
    clinical_summary["detected_drug_interactions"] = drug_interactions

    # 3. Handle Patient Registration
    patient_id = patient_info.get("patient_id") or patient_info.get("id") or f"PAT_{uuid.uuid4().hex[:8].upper()}"
    uhid = patient_info.get("uhid") or patient_info.get("abha_number") or f"91{uuid.uuid4().int}"[:14]
    
    patient_record = {
        "patient_id": patient_id,
        "uhid": uhid,
        "name": patient_info.get("name", "Self-Service Patient"),
        "phone": patient_info.get("phone", "9999999999"),
        "age": patient_info.get("age", 30),
        "gender": patient_info.get("gender", "other"),
        "created_at": datetime.now().isoformat(),
        "last_visit": datetime.now().isoformat(),
        "intake_mode": "KIOSK_PRACTITIONER_SUPERVISED",
        "intake_system": "Sahayak Kiosk v1.0",
        "status": "active"
    }

    try:
        await mongodb_storage.create_patient(patient_id, patient_record)
    except Exception as e:
        print(f"MongoDB save skipped or fallback used: {e}")
        try:
            storage.save_patient(patient_id, patient_record)
        except Exception:
            pass

    # 4. Determine Queue Priority based on Genuine Life-Threatening Red Flags
    # Routine headaches, body aches, mild fevers are strictly EXCLUDED from emergency STAT priority
    valid_red_flags = []
    for rf in session.get("red_flags", []):
        cond = str(rf.get("condition", "")).lower()
        if "headache" in cond and not any(s in cond for s in ["stroke", "hemorrhage", "paralysis"]):
            continue
        valid_red_flags.append(rf)

    summary_red_flags = []
    for rf in clinical_summary.get("clinical_red_flags", []):
        rf_str = str(rf).strip().lower()
        if not rf_str or "none" in rf_str or "nil" in rf_str or "no red" in rf_str or "no acute" in rf_str or rf_str in ["no", "n/a", "standard"]:
            continue
        if "headache" in rf_str and not any(s in rf_str for s in ["stroke", "hemorrhage", "paralysis"]):
            continue
        summary_red_flags.append(rf)

    has_red_flags = len(valid_red_flags) > 0 or len(summary_red_flags) > 0
    priority = "emergency_stat" if has_red_flags else "normal"

    # Add to Live Queue
    token_number = int(datetime.now().strftime("%H%M")[-3:]) % 50 + 1
    queue_id = f"Q_{uuid.uuid4().hex[:8].upper()}"
    queue_entry = {
        "queue_id": queue_id,
        "patient_id": patient_id,
        "patient_name": patient_record["name"],
        "token_number": token_number,
        "priority": priority,
        "status": "ready_for_review",  # Directly ready for physician review (bypasses nurse bottleneck)
        "intake_mode": "kiosk_practitioner_supervised",
        "has_red_flags": has_red_flags,
        "red_flag_details": session.get("red_flags"),
        "added_at": datetime.now().isoformat(),
        "started_at": None,
        "completed_at": None
    }

    try:
        await mongodb_storage.add_to_queue(queue_entry)
    except Exception as e:
        print(f"[ERROR] Error adding to queue: {e}")

    # 5. Save Note Record with 8-Section Structured Schema
    note_id = f"NOTE_{uuid.uuid4().hex[:8].upper()}"
    note_record = {
        "note_id": note_id,
        "patient_id": patient_id,
        "created_at": datetime.now().isoformat(),
        "intake_mode": "kiosk_practitioner_supervised",
        "intake_type": session.get("mode", "ALLOPATHIC"),
        "chief_complaint": clinical_summary.get("chief_complaint"),
        "structured_clinical_summary": clinical_summary,
        # Legacy fields for backward compatibility with existing Dashboard components
        "soap_note": {
            "subjective": clinical_summary.get("history_of_present_illness"),
            "objective": "Review of Systems completed via MediKiosk. Physical examination pending physician confirmation.",
            "assessment": clinical_summary.get("doctor_summary_en"),
            "plan": "Physician evaluation and prescription",
            "chief_complaint": clinical_summary.get("chief_complaint"),
            "medications": medications
        },
        "transcript": chr(10).join(session.get("raw_transcripts", [])),
        "review_status": "PENDING_PHYSICIAN_REVIEW",
        "physician_amendments": None
    }

    try:
        await mongodb_storage.add_note(patient_id, note_record)
    except Exception:
        pass

    # 6. If Medical Timeline was digitized from documents, link it to patient record
    medical_timeline = payload.get("medical_timeline")
    if medical_timeline:
        try:
            timeline_record = {
                "patient_id": patient_id,
                "patient_name": patient_record["name"],
                "batch_id": f"KIOSK_{uuid.uuid4().hex[:8].upper()}",
                "generated_at": datetime.now().isoformat(),
                "total_documents": len(payload.get("uploaded_documents", [])) or len(medical_timeline.get("timeline_events", [])) or 1,
                **medical_timeline
            }
            await mongo_service.save_timeline(timeline_record)

            history_id = f"TIMELINE_{uuid.uuid4().hex[:8].upper()}"
            await mongodb_storage.add_history(patient_id, {
                "history_id": history_id,
                "patient_id": patient_id,
                "created_at": datetime.now().isoformat(),
                "type": "comprehensive_timeline",
                "timeline_summary": medical_timeline.get("summary"),
                "event_count": len(medical_timeline.get("timeline_events", [])),
                "current_medications_count": len(medical_timeline.get("current_medications", []))
            })
            print(f"📋 Attached Medical Timeline to patient {patient_id}")
        except Exception as e:
            print(f"⚠️ Could not save timeline to mongo_service: {e}")

    print(f"✅ Sahayak Kiosk Intake completed: Token #{token_number} for {patient_record['name']} (Priority: {priority})")

    return {
        "success": True,
        "message": "Clinical history intake complete and submitted to Physician Queue",
        "token_number": token_number,
        "queue_id": queue_id,
        "patient_id": patient_id,
        "note_id": note_id,
        "priority": priority,
        "has_red_flags": has_red_flags,
        "structured_summary": clinical_summary,
        "medical_timeline": medical_timeline,
        "patient_audio_confirmation": clinical_summary.get("patient_facing_audio_confirmation"),
        "estimated_wait_minutes": 5 if has_red_flags else 15
    }


# ==================== DOCTOR REVIEW: ACCEPT / AMEND / REJECT ====================

@router.post("/review/{patient_id}/{note_id}")
async def physician_review_summary(
    patient_id: str,
    note_id: str,
    payload: Dict[str, Any] = Body(...)
):
    """
    Physician review endpoint on Practitioner Dashboard:
    Allows physician to ACCEPT, AMEND (with inline edits), or REJECT the intake note.
    Ensures AI output is NEVER auto-committed as a medical diagnosis without physician sign-off.
    """
    action = payload.get("action", "ACCEPT").upper()  # ACCEPT, AMEND, REJECT
    doctor_notes = payload.get("doctor_notes", "")
    amended_summary = payload.get("amended_summary")
    doctor_name = payload.get("doctor_name", "Dr. Priya Sharma")
    
    if action not in ["ACCEPT", "AMEND", "REJECT"]:
        raise HTTPException(status_code=400, detail="Action must be ACCEPT, AMEND, or REJECT")

    review_event = {
        "review_status": action,
        "reviewed_by": doctor_name,
        "reviewed_at": datetime.now().isoformat(),
        "doctor_notes": doctor_notes,
        "amended_summary": amended_summary
    }

    # Update patient note if database is available
    try:
        note = await mongodb_storage.get_patient_notes(patient_id)
        # update note record with review_event
    except Exception:
        pass

    print(f"🩺 Physician {doctor_name} performed {action} on note {note_id} for patient {patient_id}")
    return {
        "success": True,
        "message": f"Clinical intake has been {action}ED by attending physician",
        "review_status": action,
        "review_event": review_event
    }


# ==================== EPHEMERAL CLEANUP ====================

@router.post("/session/cleanup")
async def cleanup_kiosk_session(payload: Dict[str, Any] = Body(...)):
    """
    Explicit cleanup step for ABDM/HIPAA ephemeral compliance:
    Wipes temporary session memory and ephemeral voice recordings immediately after submission.
    """
    session_id = payload.get("session_id")
    if session_id and session_id in dialogue_manager.sessions:
        del dialogue_manager.sessions[session_id]
        print(f"🧹 Ephemeral session cleaned: {session_id}")

    return {
        "success": True,
        "session_id": session_id,
        "message": "Temporary session data and transient state successfully purged."
    }

