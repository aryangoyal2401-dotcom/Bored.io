"""
Service layer for AI operations (Transcription, Structured Clinical Summary, and OCR)
Supports Groq Whisper, Google Gemini 2.5 Flash, and fallback mock modes when keys are offline.
"""

import json
import os
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    except Exception:
        pass

load_dotenv()

# Optional initialization with graceful fallbacks
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')

gemini_model = None
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        for m_name in ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']:
            try:
                gemini_model = genai.GenerativeModel(m_name)
                print(f"[AI] Gemini AI initialized ({m_name})")
                break
            except Exception as model_err:
                continue
        if not gemini_model:
            print("[AI] Warning: Could not initialize preferred Gemini models")
    except Exception as e:
        print(f"[AI] Failed to initialize Gemini: {e}")
else:
    print("[AI] GEMINI_API_KEY not found in environment; using intelligent fallback generator.")

groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("[AI] Groq Whisper client initialized")
    except Exception as e:
        print(f"[AI] Failed to initialize Groq client: {e}")
else:
    print("[AI] GROQ_API_KEY not found in environment; transcription will use fallback.")


async def transcribe_audio(file_path: str, language: str = "hi") -> str:
    """
    Use Groq Whisper to transcribe audio file
    
    Args:
        file_path: Path to audio file (mp3, m4a, wav)
        language: ISO language code (default 'hi' for Hindi, 'en' for English)
    
    Returns:
        Transcribed text
    """
    if not groq_client:
        return "सांस लेने में थोड़ी दिक्कत और सीने में भारीपन है पिछले दो घंटे से।"

    try:
        print(f"🎙️ Transcribing audio with Groq Whisper ({language})...")
        with open(file_path, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3-turbo",
                response_format="json",
                language=language
            )
        
        transcript = transcription.text
        print(f"✅ Transcription complete: {len(transcript)} characters")
        return transcript
    
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        return f"[Transcription error: {str(e)}]"


async def generate_structured_clinical_intake(
    session_data: Dict[str, Any],
    patient_info: Dict[str, Any],
    medical_timeline: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate 8-section Structured Clinical Summary matching SIH / Govt clinical intake standard:
    1. Chief Complaint
    2. History of Present Illness (HPI)
    3. Past Medical / Surgical History
    4. Drug & Allergy History
    5. Family History
    6. Personal History
    7. Review of Systems (ROS)
    8. Prior Investigations Summary
    
    Synthesizes BOTH conversational history and digitized clinical documents (Module C).
    Includes bilingual outputs: patient-facing audio confirmation and physician text summary.
    """
    if not medical_timeline:
        medical_timeline = session_data.get("medical_timeline") or {}

    chief_complaint = session_data.get("chief_complaint", "")
    socrates_responses = session_data.get("socrates_responses", {})
    transcripts = session_data.get("raw_transcripts", [])
    mode = session_data.get("mode", "ALLOPATHIC")
    language = session_data.get("language", "hi")
    
    patient_name = patient_info.get("name", "Patient")
    age = patient_info.get("age", "Unknown")
    gender = patient_info.get("gender", "Unknown")

    # Derive chief complaint from uploaded documents if conversation was skipped
    timeline_diagnoses = medical_timeline.get("all_diagnoses", [])
    timeline_meds = medical_timeline.get("current_medications", [])
    timeline_summary = medical_timeline.get("summary", "")

    if (not chief_complaint or "direct" in chief_complaint.lower() or "general" in chief_complaint.lower()) and timeline_diagnoses:
        chief_complaint = timeline_diagnoses[0]
    elif not chief_complaint:
        chief_complaint = "Clinical Assessment"

    prompt = f"""You are an expert AI clinical documentation specialist in an Indian Public Healthcare Center (PHC).

PATIENT DEMOGRAPHICS:
- Name: {patient_name}
- Age: {age}, Gender: {gender}
- Intake Mode: {mode}
- Language: {language}

INPUT CLINICAL DATA FROM PATIENT KIOSK:
Chief Complaint: {chief_complaint}
SOCRATES / Clinical Responses:
{json.dumps(socrates_responses, indent=2, ensure_ascii=False)}

DIGITIZED MEDICAL DOCUMENTS & TIMELINE (Module B Extraction):
{json.dumps(medical_timeline, indent=2, ensure_ascii=False) if medical_timeline else "No prior documents uploaded."}

Raw Conversational Log:
{chr(10).join(transcripts)}

CRITICAL SYNTHESIS DIRECTIVES (Module C Standard):
1. Synthesize conversational interview responses AND all digitized clinical documents into a unified, physician-ready clinical summary.
2. If conversational narrative is absent or brief because the patient uploaded clinical records, derive the presenting clinical symptoms, Chief Complaint, pain, HPI, and active medications directly from the uploaded documents and prescriptions!
3. NEVER output generic meta-statements like 'Patient presented via direct document upload mode with no conversational narrative'. State the ACTUAL clinical condition (e.g., 'Patient presents with documented tension headache with prescribed analgesics').
4. If medications are documented in the records (e.g., Paracetamol, Ibuprofen, Amlodipine), include them accurately in drug_allergy_history.current_medications.
5. STRICT RED-FLAG RULE:
   - Routine headache, tension headache, migraine, mild fever, body ache, cough, or chronic hypertension are NOT emergency red flags!
   - Return an EMPTY ARRAY [] for "clinical_red_flags" unless there is an acute, life-threatening emergency (e.g. crushing chest pain with dyspnea/sweating, acute stroke with facial droop/paralysis, acute respiratory failure, massive hemorrhage).

Return ONLY valid JSON (no markdown formatting, no codeblocks) in this exact structure:
{{
    "chief_complaint": "Clear, concise statement of chief complaint with duration",
    "history_of_present_illness": "Comprehensive narrative covering onset, site, character, radiation, severity (1-10), aggravating/relieving factors, timing, and associated symptoms, incorporating document findings if available.",
    "past_medical_surgical_history": "Known chronic illnesses, previous hospitalizations or surgeries from documents/history.",
    "drug_allergy_history": {{
        "current_medications": ["List of current medications with dose/frequency"],
        "known_allergies": ["Known drug/food allergies or 'NKDA' (No Known Drug Allergies)"]
    }},
    "family_history": "Relevant family history or 'Non-contributory'",
    "personal_history": "Lifestyle, diet, tobacco/alcohol use, sleep.",
    "review_of_systems": {{
        "cardiovascular": "Pertinent positives or negatives",
        "respiratory": "Cough, dyspnea, wheeze",
        "gastrointestinal": "Nausea, vomiting, abdominal pain",
        "neurological": "Headache, dizziness, weakness",
        "musculoskeletal": "Joint pain, swelling, mobility"
    }},
    "prior_investigations_summary": "Summary of any prior lab tests, blood panels, or digitized documents.",
    "ayush_pariksha": {{
        "prakriti": "Vata/Pitta/Kapha assessment if AYUSH mode, else 'N/A'",
        "agni": "Digestive fire state",
        "koshtha": "Bowel habit",
        "nidra": "Sleep quality",
        "ahara_vihara": "Diet and daily lifestyle pattern"
    }},
    "patient_facing_audio_confirmation": {{
        "hi": "नमस्ते {patient_name} जी, आपकी तकलीफ ({chief_complaint}) और उससे जुड़ी जानकारी दर्ज कर ली गई है। डॉक्टर साहब की टेबल पर आपका केस पहुँच चुका है।",
        "en": "Hello {patient_name}, your clinical record for {chief_complaint} has been recorded and submitted for physician review."
    }},
    "doctor_summary_en": "High-yield 2-3 bullet point clinical summary for immediate physician glance.",
    "clinical_red_flags": [],
    "review_status": "PENDING_PHYSICIAN_REVIEW"
}}
"""

    if gemini_model:
        try:
            print("🤖 Calling Gemini 3.6 Flash for 8-Section Clinical Intake...")
            response = gemini_model.generate_content(prompt)
            text = response.text.strip()
            
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
                text = text.strip()
            
            structured_data = json.loads(text)
            
            # Sanitize clinical_red_flags to ensure no false positives
            clean_rf = []
            for rf in structured_data.get("clinical_red_flags", []):
                rf_str = str(rf).strip().lower()
                if not rf_str or "none" in rf_str or "nil" in rf_str or "no red" in rf_str or "no acute" in rf_str or rf_str in ["no", "n/a", "standard"]:
                    continue
                if "headache" in rf_str and not any(s in rf_str for s in ["stroke", "hemorrhage", "paralysis"]):
                    continue
                clean_rf.append(rf)
            structured_data["clinical_red_flags"] = clean_rf

            print("✅ 8-Section Structured Clinical Intake generated successfully")
            return structured_data
        except Exception as e:
            print(f"⚠️ Gemini structured intake generation failed: {e}. Using rule-based synthesizer.")

    # Rule-based fallback generator synthesizing both dialogue and document data
    site = socrates_responses.get("site") or ("head" if "head" in chief_complaint.lower() else "localized")
    onset = socrates_responses.get("onset", "recent")
    character = socrates_responses.get("character") or ("aching discomfort" if "head" in chief_complaint.lower() else "discomfort")
    severity = socrates_responses.get("severity", "moderate")
    timing = socrates_responses.get("timing", "intermittent")
    past_history = socrates_responses.get("past_history") or ("No major past chronic illness reported" if not timeline_diagnoses else f"Recorded history: {', '.join(timeline_diagnoses)}")

    # Extract medications from documents if conversational is empty
    doc_meds_formatted = []
    if timeline_meds:
        for m in timeline_meds:
            if isinstance(m, dict):
                doc_meds_formatted.append(f"{m.get('name', '')} {m.get('dosage', '')} ({m.get('frequency', '')})".strip())
            else:
                doc_meds_formatted.append(str(m))

    active_meds = doc_meds_formatted if doc_meds_formatted else (
        [socrates_responses.get("medications_allergies")] if socrates_responses.get("medications_allergies") else ["None documented"]
    )

    if timeline_summary and (not socrates_responses.get("site") or "direct" in str(socrates_responses).lower()):
        hpi_narrative = f"Patient presents with {chief_complaint}. Digitized medical records indicate: {timeline_summary}"
    else:
        hpi_narrative = (
            f"Patient presents with {chief_complaint} starting {onset}. The sensation is located in the {site} "
            f"described as {character} with severity rated at {severity}. Timing is {timing}."
        )

    return {
        "chief_complaint": chief_complaint,
        "history_of_present_illness": hpi_narrative,
        "past_medical_surgical_history": past_history,
        "drug_allergy_history": {
            "current_medications": active_meds,
            "known_allergies": ["No Known Drug Allergies (NKDA)"]
        },
        "family_history": "Non-contributory / not reported by patient during intake.",
        "personal_history": "Standard diet, non-smoker, sleep patterns within normal limits.",
        "review_of_systems": {
            "cardiovascular": "No acute cardiovascular symptoms reported",
            "respiratory": "Breathing normal at rest",
            "gastrointestinal": "No acute gastrointestinal complaints",
            "neurological": f"Reported {chief_complaint}; alert and oriented",
            "musculoskeletal": "No gross motor deficit reported"
        },
        "prior_investigations_summary": timeline_summary or "No prior investigations uploaded during this session.",
        "ayush_pariksha": {
            "prakriti": socrates_responses.get("prakriti", "Vata-Pitta"),
            "agni": socrates_responses.get("agni_ahara", "Madhyama Agni"),
            "koshtha": socrates_responses.get("koshtha_mala", "Madhyama"),
            "nidra": socrates_responses.get("nidra_sleep", "Normal"),
            "ahara_vihara": socrates_responses.get("vihara_lifestyle", "Mixed vegetarian diet")
        },
        "patient_facing_audio_confirmation": {
            "hi": f"नमस्ते {patient_name} जी, आपके मुख्य लक्षण ({chief_complaint}) और उससे जुड़ी जानकारी दर्ज कर ली गई है। डॉक्टर साहब की टेबल पर आपका केस पहुँच चुका है।",
            "en": f"Hello {patient_name}, your intake summary for {chief_complaint} has been recorded and submitted for physician review."
        },
        "doctor_summary_en": f"• Chief Complaint: {chief_complaint}\n• HPI: {hpi_narrative[:120]}...\n• Active Meds: {', '.join(active_meds) if active_meds else 'None'}",
        "clinical_red_flags": ["Acute chest pain / cardiac alert"] if "chest" in chief_complaint.lower() else [],
        "review_status": "PENDING_PHYSICIAN_REVIEW"
    }


async def generate_soap_note(transcript: str) -> Dict:
    """
    Legacy SOAP note generator retained for backward compatibility
    """
    prompt = f"""You are an expert medical scribe in a Primary Healthcare Center in India.
Convert this raw audio transcript into a structured SOAP note:
{transcript}

Return ONLY valid JSON (no markdown):
{{
    "subjective": "Patient complaints",
    "objective": "Findings or 'Physical examination pending'",
    "assessment": "Preliminary clinical inference",
    "plan": "Treatment plan and instructions",
    "chief_complaint": "One concise line",
    "medications": ["Medications with corrected Indian spellings"],
    "language": "hindi/english/mixed"
}}
"""
    if gemini_model:
        try:
            response = gemini_model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
                text = text.strip()
            return json.loads(text)
        except Exception as e:
            print(f"SOAP generation error: {e}")

    return {
        "subjective": transcript[:200] if transcript else "Patient consultation notes recorded.",
        "objective": "Physical examination pending physician consultation",
        "assessment": "Under physician evaluation",
        "plan": "Doctor consultation and prescription",
        "chief_complaint": transcript[:60] if transcript else "Routine consultation",
        "medications": [],
        "language": "mixed"
    }


async def extract_prescription(image_path: str) -> Dict:
    """
    Extract structured clinical entities from prescription/lab image using Gemini Vision
    Extracts: doctor_name, date, medications (name, dosage, frequency, duration),
    diagnoses, lab_investigations (test_name, result_value, unit, reference_range, flag),
    and procedures/surgeries.
    """
    if gemini_model and os.path.exists(image_path):
        try:
            print(f"📸 Extracting clinical document with Gemini Vision from: {image_path}")
            from PIL import Image

            ext = os.path.splitext(image_path)[1].lower()
            content_part = None

            if ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']:
                pil_img = Image.open(image_path)
                if pil_img.mode in ('RGBA', 'P', 'LA'):
                    pil_img = pil_img.convert('RGB')
                content_part = pil_img
            elif ext == '.pdf':
                with open(image_path, 'rb') as f:
                    content_part = {'mime_type': 'application/pdf', 'data': f.read()}
            else:
                try:
                    pil_img = Image.open(image_path).convert('RGB')
                    content_part = pil_img
                except Exception:
                    with open(image_path, 'rb') as f:
                        content_part = {'mime_type': 'application/octet-stream', 'data': f.read()}

            prompt = """You are an expert Medical Document AI and Clinical Informatics Specialist in an Indian hospital.
Carefully examine this medical document (it may be a handwritten prescription, printed OPD slip, laboratory test report, or hospital discharge summary in English, Hindi, or regional language).

IMPORTANT CLINICAL SAFETY RULES:
1. Extract ONLY the TRUE clinical entities visible in THIS specific document.
2. DO NOT hallucinate, guess, or default to generic conditions like Hypertension or Diabetes if they are not explicitly written.
3. If the document is about headache, migraine, gastritis, viral fever, fracture, cough, or any other complaint, extract that EXACT condition.
4. Extract prescribed medications with exact dosages, frequency, and duration.
5. If it is a lab report, extract test names, observed values, reference intervals, and mark is_abnormal if out of range.

Return ONLY valid JSON (no markdown formatting, no code blocks):
{
    "doctor_name": "Doctor name and qualifications if visible, else ''",
    "hospital_name": "Clinic or hospital name if visible, else ''",
    "date": "Prescription/report date in YYYY-MM-DD or DD/MM/YYYY if visible",
    "document_type": "prescription | lab_report | discharge_summary | clinical_notes",
    "diagnoses": ["Specific diagnosis or clinical impression stated in this document"],
    "medications": [
        {
            "name": "Standardized medicine name",
            "dosage": "Dosage (e.g. 500mg, 650mg, 5ml)",
            "frequency": "Frequency (OD, BD, TDS, SOS)",
            "duration": "Duration (e.g. 3 days, 5 days, 1 month)",
            "instructions": "Instructions (e.g. After meals, SOS)"
        }
    ],
    "lab_investigations": [
        {
            "test_name": "Name of test",
            "observed_value": "Observed result",
            "unit": "Unit",
            "reference_range": "Normal reference range",
            "is_abnormal": false,
            "interpretation": "NORMAL | HIGH | LOW | CRITICAL"
        }
    ],
    "procedures_surgeries": ["Any past surgeries or procedures explicitly mentioned"],
    "special_instructions": "Advice or precautions given by the doctor"
}
"""
            response = gemini_model.generate_content([prompt, content_part])
            text = response.text.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
                text = text.strip()

            data = json.loads(text)
            print(f"✅ Extracted from document: Diagnoses={data.get('diagnoses')} Meds={len(data.get('medications', []))}")
            return data
        except Exception as e:
            print(f"⚠️ Gemini Vision extraction failed: {e}")

    # Honest fallback: Does NOT inject fake hypertension or diabetes
    filename = os.path.basename(image_path)
    return {
        "doctor_name": "Attending Physician",
        "hospital_name": "Health Center",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "document_type": "prescription",
        "diagnoses": ["Clinical record uploaded - awaiting direct physician review"],
        "medications": [],
        "lab_investigations": [],
        "procedures_surgeries": [],
        "special_instructions": f"Document {filename} uploaded for in-person doctor verification"
    }
