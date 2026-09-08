"""
Adaptive Dialogue Manager
Implements clinical questioning ontologies for patient intake:
1. SOCRATES Framework (Allopathic Chief Complaint & HPI branching)
2. AYUSH Dashavidha Pariksha & Ahara-Vihara Framework (Ayurvedic OPD mode)
Provides dual-input options (speech recognition + large touch chips with icons)
bilingual (English & Hindi) for low-literacy patient accessibility.
"""

from typing import Dict, List, Any, Optional
import uuid


class DialogueManager:
    """Manages conversational state and clinical question branching"""

    # Standard SOCRATES Question Ontology mapped by Chief Complaint
    CHIEF_COMPLAINTS = [
        {
            "id": "chest_pain",
            "label_en": "Chest Pain / Discomfort",
            "label_hi": "छाती या सीने में दर्द",
            "icon": "🫀",
            "category": "cardio",
            "keywords": ["chest", "heart", "angina", "seena", "chaati", "सीने", "छाती"]
        },
        {
            "id": "fever",
            "label_en": "Fever & Chills",
            "label_hi": "बुखार और ठंड लगना",
            "icon": "🌡️",
            "category": "infectious",
            "keywords": ["fever", "bukhar", "temperature", "chills", "thand", "बुखार"]
        },
        {
            "id": "respiratory",
            "label_en": "Cough & Breathlessness",
            "label_hi": "खांसी और सांस फूलना",
            "icon": "🫁",
            "category": "pulmo",
            "keywords": ["cough", "khansi", "breath", "saans", "asthma", "खांसी", "सांस"]
        },
        {
            "id": "abdominal",
            "label_en": "Stomach Pain / Digestion",
            "label_hi": "पेट दर्द और पाचन समस्या",
            "icon": "🤢",
            "category": "gastro",
            "keywords": ["stomach", "pet", "abdomen", "gas", "vomit", "ulti", "दस्त", "पेट"]
        },
        {
            "id": "headache",
            "label_en": "Headache & Dizziness",
            "label_hi": "सिरदर्द और चक्कर आना",
            "icon": "🤕",
            "category": "neuro",
            "keywords": ["headache", "sar dard", "sir dard", "chakkar", "migraine", "सिरदर्द", "चक्कर"]
        },
        {
            "id": "joint_pain",
            "label_en": "Joint / Body Pain",
            "label_hi": "जोड़ों या बदन में दर्द",
            "icon": "🦵",
            "category": "ortho",
            "keywords": ["joint", "jodon", "knee", "back", "kamar", "badan", "dard", "कमर दर्द"]
        },
        {
            "id": "diabetes_bp",
            "label_en": "BP / Sugar Checkup",
            "label_hi": "बीपी / शुगर नियमित जांच",
            "icon": "🩸",
            "category": "general",
            "keywords": ["sugar", "bp", "diabetes", "pressure", "checkup", "शुगर", "बीपी"]
        },
        {
            "id": "other",
            "label_en": "Other Health Issue",
            "label_hi": "अन्य स्वास्थ्य समस्या",
            "icon": "🩺",
            "category": "general",
            "keywords": ["other", "kuch aur", "aur", "general"]
        }
    ]

    # SOCRATES steps definition
    SOCRATES_STEPS = [
        "site",
        "onset",
        "character",
        "radiation",
        "associations",
        "timing",
        "exacerbating_relieving",
        "severity",
        "past_history",
        "medications_allergies"
    ]

    AYUSH_STEPS = [
        "prakriti",
        "agni_ahara",
        "koshtha_mala",
        "nidra_sleep",
        "vyayama_energy",
        "vihara_lifestyle"
    ]

    def __init__(self):
        # In-memory active kiosk sessions
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(self, patient_info: Dict[str, Any], mode: str = "ALLOPATHIC", language: str = "hi") -> Dict[str, Any]:
        session_id = f"KIOSK_{uuid.uuid4().hex[:8].upper()}"
        
        session_data = {
            "session_id": session_id,
            "patient_info": patient_info,
            "mode": mode,  # "ALLOPATHIC" or "AYUSH"
            "language": language,  # "hi" or "en"
            "current_step_index": 0,
            "chief_complaint": None,
            "chief_complaint_id": None,
            "socrates_responses": {},
            "raw_transcripts": [],
            "red_flags": [],
            "status": "IN_PROGRESS",
            "started_at": ""
        }
        self.sessions[session_id] = session_data

        first_question = self.get_chief_complaint_question(language)
        return {
            "session_id": session_id,
            "question": first_question,
            "progress_percent": 10
        }

    def get_chief_complaint_question(self, language: str = "hi") -> Dict[str, Any]:
        return {
            "step_key": "chief_complaint",
            "title_en": "What is the primary reason for your hospital visit today?",
            "title_hi": "आज अस्पताल आने का आपका मुख्य कारण क्या है?",
            "audio_en": "Please tell us or touch your main symptom.",
            "audio_hi": "कृपया अपनी मुख्य तकलीफ बोलकर बताएं या नीचे दिए गए विकल्पों को छुएं।",
            "input_type": "chips",
            "allow_voice": True,
            "chips": [
                {
                    "id": c["id"],
                    "icon": c["icon"],
                    "text_en": c["label_en"],
                    "text_hi": c["label_hi"],
                    "value": c["label_en"]
                }
                for c in self.CHIEF_COMPLAINTS
            ]
        }

    def detect_chief_complaint(self, text: str) -> Optional[Dict[str, Any]]:
        text_lower = text.lower()
        for cc in self.CHIEF_COMPLAINTS:
            for kw in cc["keywords"]:
                if kw in text_lower:
                    return cc
        return self.CHIEF_COMPLAINTS[0]  # Default to chest pain if unknown

    def get_next_question(self, session_id: str, user_input: str) -> Dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            # Create a fallback ad-hoc session
            session_id = f"KIOSK_{uuid.uuid4().hex[:8].upper()}"
            session = {
                "session_id": session_id,
                "patient_info": {},
                "mode": "ALLOPATHIC",
                "language": "hi",
                "current_step_index": 0,
                "chief_complaint": user_input,
                "chief_complaint_id": "chest_pain",
                "socrates_responses": {},
                "raw_transcripts": [],
                "red_flags": [],
                "status": "IN_PROGRESS"
            }
            self.sessions[session_id] = session

        lang = session.get("language", "hi")
        mode = session.get("mode", "ALLOPATHIC")
        step_idx = session.get("current_step_index", 0)

        # Step 0: Record chief complaint
        if step_idx == 0:
            session["raw_transcripts"].append(f"Chief Complaint: {user_input}")
            detected = self.detect_chief_complaint(user_input)
            session["chief_complaint_id"] = detected["id"] if detected else "general"
            session["chief_complaint"] = user_input
            session["current_step_index"] = 1
            step_idx = 1

        steps_list = self.SOCRATES_STEPS if mode == "ALLOPATHIC" else self.AYUSH_STEPS

        # If completed all steps
        if step_idx > len(steps_list):
            session["status"] = "COMPLETED"
            return {
                "is_completed": True,
                "session_id": session_id,
                "message_en": "Your medical intake is complete. Generating your clinical intake summary.",
                "message_hi": "आपकी प्राथमिक स्वास्थ्य जानकारी दर्ज हो चुकी है। डॉक्टर के लिए सारांश तैयार किया जा रहा है।",
                "socrates_data": session["socrates_responses"],
                "chief_complaint": session["chief_complaint"]
            }

        current_step_key = steps_list[step_idx - 1]
        
        # Save previous answer if step > 1
        if step_idx > 1:
            prev_step_key = steps_list[step_idx - 2]
            session["socrates_responses"][prev_step_key] = user_input
            session["raw_transcripts"].append(f"{prev_step_key}: {user_input}")

        # Fetch question schema for current step
        if mode == "ALLOPATHIC":
            question_data = self._get_socrates_question(current_step_key, session["chief_complaint_id"], lang)
        else:
            question_data = self._get_ayush_question(current_step_key, lang)

        session["current_step_index"] += 1
        progress = int((session["current_step_index"] / (len(steps_list) + 1)) * 100)

        return {
            "is_completed": False,
            "session_id": session_id,
            "progress_percent": min(progress, 95),
            "step_number": session["current_step_index"],
            "total_steps": len(steps_list) + 1,
            "question": question_data
        }

    def _get_socrates_question(self, step_key: str, cc_id: str, lang: str) -> Dict[str, Any]:
        """Dynamic SOCRATES branching based on chief complaint"""
        
        if step_key == "site":
            return {
                "step_key": "site",
                "title_en": "Where exactly is the discomfort or pain located?",
                "title_hi": "आपको यह दर्द या तकलीफ शरीर में ठीक किस जगह महसूस हो रही है?",
                "audio_en": "Where do you feel the pain? Tap a location or speak.",
                "audio_hi": "दर्द किस जगह पर है? नीचे दिए गए चित्र को छुएं या बोलें।",
                "input_type": "chips",
                "chips": [
                    {"id": "chest_center", "icon": "📍", "text_en": "Center of Chest", "text_hi": "छाती के बीच में"},
                    {"id": "chest_left", "icon": "⬅️", "text_en": "Left Side of Chest", "text_hi": "छाती के बाईं तरफ"},
                    {"id": "upper_abdomen", "icon": "👆", "text_en": "Upper Stomach", "text_hi": "पेट के ऊपरी हिस्से में"},
                    {"id": "throat_neck", "icon": "🧣", "text_en": "Throat / Neck", "text_hi": "गले या गर्दन में"},
                    {"id": "whole_body", "icon": "🧍", "text_en": "All Over Body", "text_hi": "पूरे बदन में"}
                ]
            }

        elif step_key == "onset":
            return {
                "step_key": "onset",
                "title_en": "When did this start, and how did it begin?",
                "title_hi": "यह समस्या कब शुरू हुई, और कैसे शुरू हुई?",
                "audio_en": "When did the problem begin? Sudden or gradual?",
                "audio_hi": "तकलीफ कब से शुरू हुई? अचानक या धीरे-धीरे?",
                "input_type": "chips",
                "chips": [
                    {"id": "sudden_hours", "icon": "⚡", "text_en": "Suddenly (Within hours)", "text_hi": "अचानक (कुछ घंटों पहले)"},
                    {"id": "today", "icon": "🌅", "text_en": "Since Today Morning", "text_hi": "आज सुबह से"},
                    {"id": "few_days", "icon": "🗓️", "text_en": "2 to 3 Days Ago", "text_hi": "२-३ दिन पहले से"},
                    {"id": "weeks", "icon": "📅", "text_en": "More than a Week", "text_hi": "एक हफ्ते से ज्यादा से"}
                ]
            }

        elif step_key == "character":
            return {
                "step_key": "character",
                "title_en": "What does the pain or sensation feel like?",
                "title_hi": "दर्द का प्रकार कैसा है? कैसा महसूस होता है?",
                "audio_en": "Describe the feeling. Sharp, crushing, burning or dull ache?",
                "audio_hi": "दर्द का अहसास कैसा है? भारीपन, जलन, चुभन या मीठा दर्द?",
                "input_type": "chips",
                "chips": [
                    {"id": "crushing_heavy", "icon": "🪨", "text_en": "Heavy / Tight / Crushing", "text_hi": "भारी दबाव / जकड़न"},
                    {"id": "sharp_stabbing", "icon": "🗡️", "text_en": "Sharp / Piercing", "text_hi": "तेज चुभन जैसा"},
                    {"id": "burning", "icon": "🔥", "text_en": "Burning / Acidity", "text_hi": "जलन जैसा दर्द"},
                    {"id": "dull_aching", "icon": "〰️", "text_en": "Dull Continuous Ache", "text_hi": "लगातार मीठा दर्द"}
                ]
            }

        elif step_key == "radiation":
            return {
                "step_key": "radiation",
                "title_en": "Does the pain spread or travel to any other body part?",
                "title_hi": "क्या यह दर्द शरीर के किसी अन्य हिस्से की तरफ फैलता है?",
                "audio_en": "Does pain travel to your left arm, shoulder, jaw or back?",
                "audio_hi": "क्या दर्द बाएं हाथ, कंधे, जबड़े या पीठ की तरफ जाता है?",
                "input_type": "chips",
                "chips": [
                    {"id": "left_arm_shoulder", "icon": "💪", "text_en": "Spreads to Left Arm/Shoulder", "text_hi": "बाएं हाथ / कंधे में फैलता है"},
                    {"id": "jaw_neck", "icon": "🗣️", "text_en": "Spreads to Jaw / Neck", "text_hi": "जबड़े या गर्दन की तरफ जाता है"},
                    {"id": "back", "icon": "🔙", "text_en": "Spreads to Back", "text_hi": "पीठ की तरफ जाता है"},
                    {"id": "no_spread", "icon": "🛑", "text_en": "No, Stays in one place", "text_hi": "नहीं, एक ही जगह रहता है"}
                ]
            }

        elif step_key == "associations":
            return {
                "step_key": "associations",
                "title_en": "Do you have any of these associated symptoms?",
                "title_hi": "क्या आपको इसके साथ इनमें से कोई अन्य लक्षण भी हैं?",
                "audio_en": "Select any accompanying symptoms like sweating or nausea.",
                "audio_hi": "पसीना, उल्टी, घबराहट या सांस फूलना जैसा कोई लक्षण है?",
                "input_type": "chips",
                "chips": [
                    {"id": "sweating_dizziness", "icon": "💦", "text_en": "Cold Sweating / Dizziness", "text_hi": "ठंडा पसीना / चक्कर"},
                    {"id": "shortness_of_breath", "icon": "😮‍💨", "text_en": "Shortness of Breath", "text_hi": "सांस लेने में कठिनाई"},
                    {"id": "nausea_vomiting", "icon": "🤢", "text_en": "Nausea or Vomiting", "text_hi": "जी मिचलाना या उल्टी"},
                    {"id": "none", "icon": "✅", "text_en": "None of these", "text_hi": "इनमें से कोई नहीं"}
                ]
            }

        elif step_key == "timing":
            return {
                "step_key": "timing",
                "title_en": "Is the discomfort constant or does it come and go?",
                "title_hi": "क्या यह तकलीफ लगातार बनी रहती है या बीच-बीच में आती है?",
                "audio_en": "Is it continuous, or does it come in waves?",
                "audio_hi": "क्या दर्द लगातार है या लहरों की तरह आता जाता है?",
                "input_type": "chips",
                "chips": [
                    {"id": "constant", "icon": "⏱️", "text_en": "Constant / Non-stop", "text_hi": "लगातार बना हुआ है"},
                    {"id": "intermittent", "icon": "🌊", "text_en": "Comes and Goes in Waves", "text_hi": "आता-जाता रहता है"},
                    {"id": "morning_worse", "icon": "🌅", "text_en": "Worse in Morning", "text_hi": "सुबह के समय अधिक"},
                    {"id": "night_worse", "icon": "🌙", "text_en": "Worse at Night", "text_hi": "रात के समय अधिक"}
                ]
            }

        elif step_key == "exacerbating_relieving":
            return {
                "step_key": "exacerbating_relieving",
                "title_en": "Does anything make the condition better or worse?",
                "title_hi": "किस चीज़ से तकलीफ बढ़ती या कम होती है?",
                "audio_en": "Does walking or exertion make it worse, or does rest help?",
                "audio_hi": "क्या चलने-फिरने से दर्द बढ़ता है, या आराम करने से कम होता है?",
                "input_type": "chips",
                "chips": [
                    {"id": "worse_exertion", "icon": "🏃", "text_en": "Worse with Walking / Exertion", "text_hi": "चलने या मेहनत से बढ़ता है"},
                    {"id": "better_rest", "icon": "🛋️", "text_en": "Better with Rest", "text_hi": "आराम करने से घटता है"},
                    {"id": "worse_food", "icon": "🍲", "text_en": "Worse after Eating Food", "text_hi": "खाना खाने के बाद बढ़ता है"},
                    {"id": "no_change", "icon": "⚖️", "text_en": "No change with anything", "text_hi": "किसी भी चीज से फर्क नहीं"}
                ]
            }

        elif step_key == "severity":
            return {
                "step_key": "severity",
                "title_en": "How severe is the pain right now on a scale of 1 to 10?",
                "title_hi": "1 से 10 के पैमाने पर दर्द की तीव्रता कितनी है?",
                "audio_en": "Please rate your pain from 1 to 10 on the scale.",
                "audio_hi": "कृपया अपने दर्द का स्तर 1 से 10 के बीच चुनें।",
                "input_type": "scale",
                "min": 1,
                "max": 10,
                "chips": [
                    {"id": "2", "icon": "🙂", "text_en": "1-3: Mild Discomfort", "text_hi": "१-३: हल्का दर्द"},
                    {"id": "5", "icon": "😐", "text_en": "4-6: Moderate Pain", "text_hi": "४-६: मध्यम दर्द"},
                    {"id": "8", "icon": "😣", "text_en": "7-8: Severe Pain", "text_hi": "७-८: तेज असहनीय दर्द"},
                    {"id": "10", "icon": "😫", "text_en": "9-10: Critical Worst Pain", "text_hi": "९-१०: अत्यधिक गंभीर दर्द"}
                ]
            }

        elif step_key == "past_history":
            return {
                "step_key": "past_history",
                "title_en": "Do you have any existing chronic health conditions?",
                "title_hi": "क्या आपको पहले से कोई पुरानी बीमारी या समस्या है?",
                "audio_en": "Do you have Blood Pressure, Diabetes, Thyroid or previous surgeries?",
                "audio_hi": "क्या आपको पहले से बीपी, शुगर, थायरॉयड या कोई ऑपरेशन हुआ है?",
                "input_type": "chips",
                "chips": [
                    {"id": "hypertension", "icon": "🩺", "text_en": "High Blood Pressure (Hypertension)", "text_hi": "उच्च रक्तचाप (हाई बीपी)"},
                    {"id": "diabetes", "icon": "🍬", "text_en": "Diabetes / High Sugar", "text_hi": "मधुमेह (डायबिटीज / शुगर)"},
                    {"id": "heart_stent", "icon": "❤️", "text_en": "Heart Problem / Previous Stent", "text_hi": "हृदय रोग / पुराना स्टेंट"},
                    {"id": "none_healthy", "icon": "🌟", "text_en": "No prior illnesses", "text_hi": "कोई पुरानी बीमारी नहीं"}
                ]
            }

        elif step_key == "medications_allergies":
            return {
                "step_key": "medications_allergies",
                "title_en": "Are you taking any daily medicines or have drug allergies?",
                "title_hi": "क्या आप कोई नियमित दवा लेते हैं या किसी दवा से एलर्जी है?",
                "audio_en": "Tell us about any regular pills you take or known allergies.",
                "audio_hi": "कोई नियमित दवाइयाँ या दवाओं से होने वाली एलर्जी के बारे में बताएं।",
                "input_type": "chips",
                "chips": [
                    {"id": "takes_daily_meds", "icon": "💊", "text_en": "Taking Daily BP/Sugar Meds", "text_hi": "बीपी या शुगर की दवा नियमित"},
                    {"id": "penicillin_allergy", "icon": "⚠️", "text_en": "Allergic to Penicillin / Sulfa", "text_hi": "पेनिसिलिन या अन्य दवा से एलर्जी"},
                    {"id": "no_meds", "icon": "🟢", "text_en": "No Regular Meds or Allergies", "text_hi": "कोई नियमित दवा या एलर्जी नहीं"},
                    {"id": "have_prescription", "icon": "📄", "text_en": "I have old prescription to scan", "text_hi": "मेरे पास पुरानी पर्ची है (स्कैन करें)"}
                ]
            }

        # Fallback question
        return {
            "step_key": step_key,
            "title_en": "Please provide any additional details about your condition.",
            "title_hi": "कृपया अपनी तकलीफ के बारे में कोई अन्य जानकारी दें।",
            "audio_en": "Any additional information you want to share?",
            "audio_hi": "क्या आप डॉक्टर को कोई और बात बताना चाहते हैं?",
            "input_type": "chips",
            "chips": [
                {"id": "done", "icon": "✅", "text_en": "That is all, ready for doctor", "text_hi": "बस इतना ही, डॉक्टर के पास भेजें"}
            ]
        }

    def _get_ayush_question(self, step_key: str, lang: str) -> Dict[str, Any]:
        """Dashavidha Pariksha & Ahara-Vihara for Ayurvedic OPD"""
        
        if step_key == "prakriti":
            return {
                "step_key": "prakriti",
                "title_en": "AYUSH Intake: Body Constitution (Prakriti Assessment)",
                "title_hi": "आयुष प्रकृति परीक्षा: आपकी शारीरिक प्रकृति कैसी है?",
                "audio_en": "Select how your body feels naturally. Warm or cold tolerant?",
                "audio_hi": "आपकी शारीरिक तासीर कैसी है? सर्दी या गर्मी किसमें ज्यादा परेशानी होती है?",
                "input_type": "chips",
                "chips": [
                    {"id": "vata", "icon": "💨", "text_en": "Vata (Dry skin, sensitive to cold, light sleep)", "text_hi": "वात (रूखी त्वचा, ठंड से परेशानी, हल्की नींद)"},
                    {"id": "pitta", "icon": "🔥", "text_en": "Pitta (Warm body, intolerant to heat, strong hunger)", "text_hi": "पित्त (गर्म तासीर, गर्मी से परेशानी, तेज भूख)"},
                    {"id": "kapha", "icon": "💧", "text_en": "Kapha (Heavy build, slow digestion, calm nature)", "text_hi": "कफ (भारी बदन, धीमी पाचन, शांत स्वभाव)"}
                ]
            }
        elif step_key == "agni_ahara":
            return {
                "step_key": "agni_ahara",
                "title_en": "Agni & Ahara Shakti (Digestive Fire Assessment)",
                "title_hi": "अग्नि व आहार शक्ति: आपकी भूख और पाचन क्षमता कैसी है?",
                "audio_en": "How is your appetite and digestion capacity?",
                "audio_hi": "भूख समय पर लगती है या खाना पचने में भारीपन रहता है?",
                "input_type": "chips",
                "chips": [
                    {"id": "sama_agni", "icon": "⚖️", "text_en": "Normal Appetite & Easy Digestion", "text_hi": "सामान्य भूख व उत्तम पाचन"},
                    {"id": "manda_agni", "icon": "🐌", "text_en": "Slow Digestion / Heavy Stomach", "text_hi": "धीमी पाचन / पेट में भारीपन"},
                    {"id": "tikshna_agni", "icon": "🔥", "text_en": "Excessive Hunger / Acidity (Tikshna)", "text_hi": "तीव्र भूख / सीने में जलन व खट्टी डकार"},
                    {"id": "vishama_agni", "icon": "🌪️", "text_en": "Irregular Appetite & Gas (Vishama)", "text_hi": "अनियमित भूख / गैस और अफारा"}
                ]
            }
        elif step_key == "koshtha_mala":
            return {
                "step_key": "koshtha_mala",
                "title_en": "Koshtha (Bowel Habit & Elimination)",
                "title_hi": "कोष्ठ परीक्षा: पेट साफ होने की स्थिति कैसी है?",
                "audio_en": "Do you experience regular bowel movements or constipation?",
                "audio_hi": "पेट खुलकर साफ होता है या कब्ज की शिकायत रहती है?",
                "input_type": "chips",
                "chips": [
                    {"id": "krura", "icon": "🧱", "text_en": "Hard stools / Severe Constipation (Krura)", "text_hi": "कड़ा मल / पुरानी कब्ज (क्रूर कोष्ठ)"},
                    {"id": "mridu", "icon": "🌊", "text_en": "Loose Stools / Sensitive gut (Mridu)", "text_hi": "ढीला मल / तुरंत पेट खराब (मृदु कोष्ठ)"},
                    {"id": "madhyama", "icon": "🌿", "text_en": "Normal Daily Regular Elimination", "text_hi": "प्रतिदिन सामान्य व नियमित पेट साफ"}
                ]
            }
        elif step_key == "nidra_sleep":
            return {
                "step_key": "nidra_sleep",
                "title_en": "Nidra (Sleep Pattern & Quality)",
                "title_hi": "निद्रा परीक्षा: आपकी नींद कैसी रहती है?",
                "audio_en": "How is the quality of your night sleep?",
                "audio_hi": "रात को नींद कैसी आती है? गहरी या बार-बार खुलती है?",
                "input_type": "chips",
                "chips": [
                    {"id": "sound_sleep", "icon": "😴", "text_en": "Deep Sound Sleep (6-8 hours)", "text_hi": "गहरी व सुकून भरी नींद (६-८ घंटे)"},
                    {"id": "disturbed", "icon": "👀", "text_en": "Disturbed / Frequent waking", "text_hi": "टूटी-फूटी नींद / बार-बार जागना"},
                    {"id": "insomnia", "icon": "🌑", "text_en": "Difficulty Falling Asleep (Insomnia)", "text_hi": "नींद न आना या देर से आना (अनिद्रा)"}
                ]
            }
        elif step_key == "vyayama_energy":
            return {
                "step_key": "vyayama_energy",
                "title_en": "Vyayama Shakti (Physical Stamina & Daily Energy)",
                "title_hi": "व्यायाम शक्ति: आपका शारीरिक बल और स्फूर्ति कैसी है?",
                "audio_en": "Rate your daily physical strength and fatigue levels.",
                "audio_hi": "क्या दिन भर थकान महसूस होती है या ऊर्जा बनी रहती है?",
                "input_type": "chips",
                "chips": [
                    {"id": "pravara", "icon": "💪", "text_en": "High Stamina & Energetic (Pravara)", "text_hi": "उत्तम बल व स्फूर्ति"},
                    {"id": "madhyama", "icon": "🚶", "text_en": "Moderate Stamina (Madhyama)", "text_hi": "मध्यम बल, सामान्य काम"},
                    {"id": "avara", "icon": "🪫", "text_en": "Low Energy / Easily Fatigued (Avara)", "text_hi": "जल्दी थकान व कमजोरी महसूस होना"}
                ]
            }
        elif step_key == "vihara_lifestyle":
            return {
                "step_key": "vihara_lifestyle",
                "title_en": "Ahara-Vihara (Dietary Habits & Daily Lifestyle)",
                "title_hi": "आहार-विहार: आपकी खान-पान और दिनचर्या कैसी है?",
                "audio_en": "What type of food do you take most often?",
                "audio_hi": "खान-पान में तेल, मिर्च-मसाला या बाहर का खाना कितना लेते हैं?",
                "input_type": "chips",
                "chips": [
                    {"id": "satvik", "icon": "🥗", "text_en": "Simple Homemade Veg / Satvik Diet", "text_hi": "सादा घर का भोजन / कम मिर्च-मसाला"},
                    {"id": "spicy_fried", "icon": "🌶️", "text_en": "Spicy / Fried / Outside Food", "text_hi": "तला-भुना, तेज मिर्च या बासी खाना"},
                    {"id": "sedentary", "icon": "🪑", "text_en": "Sedentary / Sitting Long Hours", "text_hi": "अधिकतर बैठे रहने का कार्य / कम व्यायाम"},
                    {"id": "stress", "icon": "🤯", "text_en": "High Stress / Irregular Timings", "text_hi": "मानसिक तनाव व अनियमित भोजन का समय"}
                ]
            }
        
        return {
            "step_key": step_key,
            "title_en": "AYUSH assessment complete.",
            "title_hi": "आयुष परीक्षा पूर्ण।",
            "audio_en": "Assessment completed.",
            "audio_hi": "विवरण दर्ज हो गया है।",
            "input_type": "chips",
            "chips": [{"id": "done", "icon": "✅", "text_en": "Proceed to Doctor", "text_hi": "डॉक्टर के पास भेजें"}]
        }


# Singleton instance
dialogue_manager = DialogueManager()
