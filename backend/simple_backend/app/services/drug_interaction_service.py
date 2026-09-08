"""
Clinical Drug-Drug Interaction & Lab Abnormalities Service
Detects dangerous medication combinations, contraindications, and abnormal lab ranges
for physician alerting on the Swasya Sync / Doctor Dashboard.
"""

from typing import List, Dict, Any
import re


class DrugInteractionService:
    """Clinical safety check for drug interactions and abnormal lab alerts"""

    # Common high-risk adverse interactions in primary care
    INTERACTION_RULES = [
        {
            "drug1_patterns": [r"\baspirin\b", r"\becosprin\b", r"\bdisprin\b"],
            "drug2_patterns": [r"\bwarfarin\b", r"\bclopidogrel\b", r"\bclopilet\b", r"\bheparin\b", r"\bapixaban\b"],
            "severity": "HIGH",
            "effect": "Severe hemorrhage & gastrointestinal bleeding risk",
            "recommendation": "Monitor INR / Bleeding time. Consider PPI gastroprotection or dose adjustment."
        },
        {
            "drug1_patterns": [r"\bmetformin\b", r"\bglycomet\b"],
            "drug2_patterns": [r"\bcontrast\b", r"\bct contrast\b", r"\bdiclofenac\b", r"\bibuprofen\b", r"\bcombiflam\b"],
            "severity": "MODERATE",
            "effect": "Increased risk of lactic acidosis & acute kidney injury (AKI)",
            "recommendation": "Hydrate adequately, withhold metformin 48 hrs prior to contrast, check eGFR/Creatinine."
        },
        {
            "drug1_patterns": [r"\benalapril\b", r"\bramipril\b", r"\btelmisartan\b", r"\blosartan\b"],
            "drug2_patterns": [r"\bspironolactone\b", r"\baldoctone\b", r"\bpotassium\b", r"\bk-cit\b"],
            "severity": "HIGH",
            "effect": "Severe life-threatening hyperkalemia & cardiac arrhythmia risk",
            "recommendation": "Monitor serum potassium and renal function closely."
        },
        {
            "drug1_patterns": [r"\bsildenafil\b", r"\btadalafil\b"],
            "drug2_patterns": [r"\bnitroglycerin\b", r"\bsorbitrate\b", r"\bisosorbide\b", r"\bmonotrate\b"],
            "severity": "CRITICAL",
            "effect": "Severe refractory hypotension and cardiovascular collapse",
            "recommendation": "CONTRAINDICATED. Do NOT administer organic nitrates within 24-48h of PDE5 inhibitors."
        },
        {
            "drug1_patterns": [r"\bciprofloxacin\b", r"\bcifran\b", r"\bnorfloxacin\b"],
            "drug2_patterns": [r"\bantacid\b", r"\bgelusil\b", r"\bdigene\b", r"\bcalcium\b", r"\biron\b", r"\borofer\b"],
            "severity": "MODERATE",
            "effect": "Chelation binding causing marked reduction in antibiotic absorption",
            "recommendation": "Separate administration by at least 2 hours before or 4 hours after antacid."
        }
    ]

    # Standard lab value reference ranges
    LAB_REFERENCE_RANGES = {
        "fasting_blood_sugar": {"min": 70, "max": 100, "unit": "mg/dL", "critical_high": 250, "critical_low": 50},
        "post_prandial_blood_sugar": {"min": 70, "max": 140, "unit": "mg/dL", "critical_high": 300, "critical_low": 50},
        "hba1c": {"min": 4.0, "max": 5.6, "unit": "%", "critical_high": 10.0, "critical_low": 3.5},
        "blood_pressure_systolic": {"min": 90, "max": 120, "unit": "mmHg", "critical_high": 180, "critical_low": 85},
        "blood_pressure_diastolic": {"min": 60, "max": 80, "unit": "mmHg", "critical_high": 120, "critical_low": 55},
        "hemoglobin": {"min": 12.0, "max": 16.5, "unit": "g/dL", "critical_high": 20.0, "critical_low": 7.0},
        "serum_creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL", "critical_high": 3.0, "critical_low": 0.3},
        "platelet_count": {"min": 150000, "max": 450000, "unit": "/mcL", "critical_high": 1000000, "critical_low": 40000}
    }

    def check_drug_interactions(self, medications: List[Any]) -> List[Dict[str, Any]]:
        """Check a list of prescribed/extracted medications for potential adverse interactions"""
        med_names = []
        for m in medications:
            if isinstance(m, dict):
                name = m.get("name", "")
            else:
                name = str(m)
            if name:
                med_names.append(name.strip().lower())

        flagged_interactions = []
        for rule in self.INTERACTION_RULES:
            found_drug1 = None
            found_drug2 = None

            for med in med_names:
                for p1 in rule["drug1_patterns"]:
                    if re.search(p1, med, re.IGNORECASE):
                        found_drug1 = med
                        break
                for p2 in rule["drug2_patterns"]:
                    if re.search(p2, med, re.IGNORECASE):
                        found_drug2 = med
                        break

            if found_drug1 and found_drug2 and found_drug1 != found_drug2:
                flagged_interactions.append({
                    "drug_a": found_drug1.title(),
                    "drug_b": found_drug2.title(),
                    "severity": rule["severity"],
                    "effect": rule["effect"],
                    "clinical_recommendation": rule["recommendation"]
                })

        return flagged_interactions

    def evaluate_lab_value(self, test_name: str, value: float) -> Dict[str, Any]:
        """Evaluate a test result against clinical reference ranges"""
        test_key = test_name.lower().replace(" ", "_")
        range_data = self.LAB_REFERENCE_RANGES.get(test_key)
        
        if not range_data:
            return {
                "test_name": test_name,
                "value": value,
                "status": "NORMAL",
                "is_abnormal": False
            }

        min_val = range_data["min"]
        max_val = range_data["max"]
        crit_high = range_data.get("critical_high", float("inf"))
        crit_low = range_data.get("critical_low", float("-inf"))
        unit = range_data.get("unit", "")

        if value >= crit_high:
            return {
                "test_name": test_name,
                "value": value,
                "unit": unit,
                "reference_range": f"{min_val} - {max_val} {unit}",
                "status": "CRITICAL_HIGH",
                "is_abnormal": True,
                "flag": "🚨 CRITICALLY ELEVATED"
            }
        elif value <= crit_low:
            return {
                "test_name": test_name,
                "value": value,
                "unit": unit,
                "reference_range": f"{min_val} - {max_val} {unit}",
                "status": "CRITICAL_LOW",
                "is_abnormal": True,
                "flag": "🚨 CRITICALLY LOW"
            }
        elif value > max_val:
            return {
                "test_name": test_name,
                "value": value,
                "unit": unit,
                "reference_range": f"{min_val} - {max_val} {unit}",
                "status": "HIGH",
                "is_abnormal": True,
                "flag": "⚠️ ABOVE NORMAL RANGE"
            }
        elif value < min_val:
            return {
                "test_name": test_name,
                "value": value,
                "unit": unit,
                "reference_range": f"{min_val} - {max_val} {unit}",
                "status": "LOW",
                "is_abnormal": True,
                "flag": "⚠️ BELOW NORMAL RANGE"
            }
        else:
            return {
                "test_name": test_name,
                "value": value,
                "unit": unit,
                "reference_range": f"{min_val} - {max_val} {unit}",
                "status": "NORMAL",
                "is_abnormal": False,
                "flag": "NORMAL"
            }


# Singleton instance
drug_interaction_service = DrugInteractionService()
