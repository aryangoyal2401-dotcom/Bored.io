"""
Emergency Red-Flag Detection Service
Classifies patient complaints at the kiosk in real time.
Flags life-threatening emergencies (ACS, Stroke FAST, Respiratory Failure, Severe Bleeding, Anaphylaxis)
and generates immediate triage priority alerts for doctor/nurse dashboard.
"""

from typing import Dict, Any, List
import re


class RedFlagService:
    """Clinical emergency detector for triage intercept"""

    # Comprehensive bilingual emergency keyword rules
    EMERGENCY_RULES: List[Dict[str, Any]] = [
        {
            "category": "ACUTE_CORONARY_SYNDROME",
            "condition": "Suspected Acute Myocardial Infarction / Angina",
            "keywords": [
                r"\bchest pain\b", r"\bcrushing pain\b", r"\bheart pain\b",
                r"\bpain in chest\b", r"\bradiating to arm\b", r"\bradiating to jaw\b",
                r"\bseene mein dard\b", r"\bchaati mein dard\b", r"\bseene me dard\b",
                r"\bchaati me dard\b", r"\bheart attack\b", r"\bdil ka daura\b",
                r"\bseene par dabaav\b", r"\bheavy chest\b",
                r"छाती में दर्द", r"सीने में दर्द", r"दिल का दौरा"
            ],
            "secondary_triggers": ["sweating", "cold sweat", "breathless", "nausea", "dizziness", "ultee", "pasina", "पसीना"],
            "severity": "CRITICAL",
            "action": "Immediate ECG, Triage Bay Allocation, Physician Stat Alert"
        },
        {
            "category": "STROKE_FAST",
            "condition": "Suspected Acute Ischemic Stroke (FAST Protocol)",
            "keywords": [
                r"\bface droop\b", r"\bslurred speech\b", r"\barm weakness\b",
                r"\bparalysis\b", r"\bone side weak\b", r"\bcannot speak\b",
                r"\blakwa\b", r"\blakva\b", r"\bbolne me dikkat\b", r"\bmunh tedha\b",
                r"\bthunderclap headache\b", r"\bsudden numbness\b",
                r"लकवा", r"मुंह टेढ़ा", r"बोलने में असमर्थ"
            ],
            "severity": "CRITICAL",
            "action": "Code Stroke, Immediate Neurological Assessment, CT Prep"
        },
        {
            "category": "ACUTE_RESPIRATORY_DISTRESS",
            "condition": "Severe Respiratory Failure / Asthma Exacerbation",
            "keywords": [
                r"\bcannot breathe\b", r"\bgasping\b", r"\bchoking\b",
                r"\bsevere breathless\b", r"\bblue lips\b", r"\bstridor\b",
                r"\bsaans nahi aa rahi\b", r"\bdam ghut raha\b", r"\bsevere asthma\b",
                r"सांस नहीं आ रही", r"दम घुट रहा", r"सांस फूलना"
            ],
            "severity": "CRITICAL",
            "action": "Oxygen Stat, Nebulization, Vital signs SpO2 check"
        },
        {
            "category": "MASSIVE_HEMORRHAGE",
            "condition": "Uncontrolled Bleeding / Hemorrhagic Shock",
            "keywords": [
                r"\bheavy bleeding\b", r"\buncontrolled blood\b", r"\bcoughing blood\b",
                r"\bhemoptysis\b", r"\bvomiting blood\b", r"\bkhoon ki ulti\b",
                r"\bbohot khoon beh raha\b", r"\bdeep wound\b",
                r"खून की उल्टी", r"बहुत खून", r"खून बह रहा"
            ],
            "severity": "CRITICAL",
            "action": "Pressure Dressing, IV Access, Urgent Surgical Triage"
        },
        {
            "category": "ANAPHYLAXIS",
            "condition": "Severe Anaphylactic Allergic Reaction",
            "keywords": [
                r"\ballergic reaction\b", r"\blips swollen\b", r"\btongue swollen\b",
                r"\bthroat closing\b", r"\bhives and wheezing\b", r"\bgale mein soojan\b",
                r"एलर्जी", r"गले में सूजन", r"जीभ सूज गई"
            ],
            "severity": "CRITICAL",
            "action": "Stat Epinephrine (IM), Airway Management, Antihistamines"
        },
        {
            "category": "ALTERED_MENTAL_STATUS",
            "condition": "Acute Confusion / Loss of Consciousness",
            "keywords": [
                r"\bfainted\b", r"\bunconscious\b", r"\bpassed out\b",
                r"\bbehosh\b", r"\bcollapse\b", r"\bseizure\b", r"\bconvulsions\b",
                r"\bdaura padna\b", r"\bmirgi\b",
                r"बेहोश", r"दौरा पड़ना", r"मिरगी"
            ],
            "severity": "CRITICAL",
            "action": "GCS Evaluation, Blood Glucose Stix, Recovery Position"
        }
    ]

    def evaluate(self, text: str, socrates_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Evaluate patient transcript or touch inputs for acute emergency red flags.
        """
        text_lower = text.lower() if text else ""
        socrates_data = socrates_data or {}

        # Standard headaches, migraines, or body pain are NOT life-threatening emergencies
        is_routine_headache = any(h in text_lower for h in ["headache", "head ache", "sir dard", "sar dard", "migraine", "tension headache"])
        has_focal_stroke = any(s in text_lower for s in ["paralysis", "lakwa", "slurred speech", "face droop", "munh tedha", "one side weak"])
        if is_routine_headache and not has_focal_stroke:
            return {
                "is_emergency": False,
                "severity": "ROUTINE",
                "category": "HEADACHE_EVALUATION",
                "condition": "Headache / Cephalea (Non-Emergency)",
                "matched_terms": [],
                "secondary_factors": [],
                "recommended_action": "Standard clinical consultation for headache diagnosis and symptomatic management",
                "alert_message": None,
                "triage_priority": "PRIORITY_3_NORMAL"
            }

        # Check pain severity from SOCRATES
        pain_severity = socrates_data.get("severity", 0)
        try:
            pain_severity = int(pain_severity)
        except (ValueError, TypeError):
            pain_severity = 0

        # Run regex checks against all rules
        for rule in self.EMERGENCY_RULES:
            matched_keywords = []
            for pattern in rule["keywords"]:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    matched_keywords.append(pattern.replace(r"\b", ""))

            if matched_keywords:
                # Calculate confidence and secondary aggravating symptoms
                secondary_matches = [
                    sec for sec in rule.get("secondary_triggers", [])
                    if sec.lower() in text_lower
                ]
                
                return {
                    "is_emergency": True,
                    "severity": rule["severity"],
                    "category": rule["category"],
                    "condition": rule["condition"],
                    "matched_terms": matched_keywords,
                    "secondary_factors": secondary_matches,
                    "recommended_action": rule["action"],
                    "alert_message": f"🚨 EMERGENCY TRIAGE ALERT: {rule['condition']} detected. Immediate clinical intervention required!",
                    "triage_priority": "PRIORITY_1_STAT"
                }

        # Check for extreme pain score >= 9 with acute onset
        if pain_severity >= 9:
            return {
                "is_emergency": True,
                "severity": "URGENT",
                "category": "SEVERE_PAIN_CRISIS",
                "condition": "Severe Acute Pain Crisis (Severity 9-10/10)",
                "matched_terms": [f"Pain severity {pain_severity}/10"],
                "secondary_factors": [],
                "recommended_action": "Urgent physician pain management evaluation",
                "alert_message": "⚠️ URGENT: Patient reporting critical pain level (9-10/10). Expedite consultation.",
                "triage_priority": "PRIORITY_2_URGENT"
            }

        return {
            "is_emergency": False,
            "severity": "ROUTINE",
            "category": "STANDARD_CONSULTATION",
            "condition": "Routine Primary Care Intake",
            "matched_terms": [],
            "secondary_factors": [],
            "recommended_action": "Proceed with regular SOCRATES intake queue",
            "alert_message": None,
            "triage_priority": "PRIORITY_3_NORMAL"
        }


# Singleton instance
red_flag_service = RedFlagService()
