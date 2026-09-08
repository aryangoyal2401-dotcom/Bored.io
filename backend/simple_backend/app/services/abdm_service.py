"""
ABDM (Ayushman Bharat Digital Mission) / ABHA Service
Provides an interface and mock provider for ABHA authentication and consent logging.
Designed with a pluggable architecture: can swap mock with real NHA ABDM M1/M2/M3 Sandbox APIs.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
from datetime import datetime
import uuid
import re


class ABDMServiceInterface(ABC):
    """Abstract interface for Ayushman Bharat Digital Mission (ABDM) Integration"""

    @abstractmethod
    async def verify_abha(self, abha_id: str) -> Dict[str, Any]:
        """Verify ABHA Number or ABHA Address"""
        pass

    @abstractmethod
    async def request_otp(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        """Request OTP for ABHA authentication"""
        pass

    @abstractmethod
    async def verify_otp(self, transaction_id: str, otp: str) -> Dict[str, Any]:
        """Verify OTP and return authenticated patient profile"""
        pass

    @abstractmethod
    async def register_new_abha(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new patient and generate ABHA ID"""
        pass

    @abstractmethod
    async def record_consent(self, consent_record: Dict[str, Any]) -> Dict[str, Any]:
        """Record explicit, granular, revocable consent according to ABDM specs"""
        pass


class MockABDMService(ABDMServiceInterface):
    """
    Mock implementation of ABDM Sandbox for Hackathon / Demonstration.
    Simulates ABDM M1 (ABHA creation & verification) and Consent Manager workflows.
    """

    def __init__(self):
        # In-memory mock database of known ABHA profiles
        self.mock_profiles = {
            "91-5043-5666-3218": {
                "id": "PAT_91504356663218",
                "abha_number": "91-5043-5666-3218",
                "abha_address": "chahat@abdm",
                "name": "Chahat Kesharwani",
                "gender": "male",
                "age": 22,
                "dob": "2004-05-15",
                "phone": "9915972220",
                "address": "Civil Lines, Prayagraj, UP - 211001",
                "photo": "https://api.dicebear.com/7.x/bottts/svg?seed=Chahat",
                "status": "VERIFIED"
            },
            "91-2345-6789-0123": {
                "id": "PAT_91234567890123",
                "abha_number": "91-2345-6789-0123",
                "abha_address": "priya.sharma@abdm",
                "name": "Priya Sharma",
                "gender": "female",
                "age": 28,
                "dob": "1998-08-20",
                "phone": "9876543210",
                "address": "Sector 62, Noida, UP - 201309",
                "photo": "https://api.dicebear.com/7.x/bottts/svg?seed=Priya",
                "status": "VERIFIED"
            },
            "91-8899-7766-5544": {
                "id": "PAT_91889977665544",
                "abha_number": "91-8899-7766-5544",
                "abha_address": "ramesh.kumar@abdm",
                "name": "Ramesh Kumar",
                "gender": "male",
                "age": 56,
                "dob": "1970-01-10",
                "phone": "9123456789",
                "address": "Village Kalyanpur, Lucknow, UP - 226022",
                "photo": "https://api.dicebear.com/7.x/bottts/svg?seed=Ramesh",
                "status": "VERIFIED"
            }
        }
        # In-memory active transactions and consent artifacts
        self.active_transactions: Dict[str, Dict[str, Any]] = {}
        self.consent_log: Dict[str, Dict[str, Any]] = {}

    def _normalize_abha(self, abha_input: str) -> str:
        """Strip spaces and dashes for checking, or return normalized representation"""
        clean = re.sub(r'[\s\-]', '', abha_input.strip())
        if len(clean) == 14 and clean.isdigit():
            return f"{clean[:2]}-{clean[2:6]}-{clean[6:10]}-{clean[10:]}"
        return abha_input.strip().lower()

    async def verify_abha(self, abha_id: str) -> Dict[str, Any]:
        normalized = self._normalize_abha(abha_id)
        
        # Check by ABHA Number or ABHA Address
        profile = self.mock_profiles.get(normalized)
        if not profile:
            for p in self.mock_profiles.values():
                if p["abha_address"].lower() == normalized or p["phone"] == normalized:
                    profile = p
                    break

        if profile:
            return {
                "success": True,
                "exists": True,
                "message": "ABHA profile found",
                "abha_number": profile["abha_number"],
                "abha_address": profile["abha_address"],
                "name": profile["name"],
                "gender": profile["gender"],
                "masked_phone": profile["phone"][:2] + "******" + profile["phone"][-2:],
                "auth_methods": ["AADHAAR_OTP", "MOBILE_OTP"]
            }

        # If not in mock list, generate a plausible profile for valid format
        if len(re.sub(r'[\s\-]', '', abha_id)) == 14 or "@abdm" in abha_id:
            synth_num = self._normalize_abha(abha_id) if len(re.sub(r'[\s\-]', '', abha_id)) == 14 else f"91-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}"
            return {
                "success": True,
                "exists": True,
                "message": "ABHA profile found via ABDM Gateway",
                "abha_number": synth_num,
                "abha_address": abha_id if "@" in abha_id else f"user_{synth_num[-4:]}@abdm",
                "name": "Verified Citizen",
                "gender": "other",
                "masked_phone": "98******10",
                "auth_methods": ["AADHAAR_OTP", "MOBILE_OTP"]
            }

        return {
            "success": False,
            "exists": False,
            "message": "ABHA ID not found in ABDM registry. You can register as a new patient."
        }

    async def request_otp(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        tx_id = f"TXN_{uuid.uuid4().hex[:8].upper()}"
        normalized = self._normalize_abha(abha_id)
        
        # Determine target phone/profile
        profile = self.mock_profiles.get(normalized)
        phone = profile["phone"] if profile else "9915972220"
        
        self.active_transactions[tx_id] = {
            "abha_id": abha_id,
            "auth_method": auth_method,
            "profile": profile,
            "expected_otp": "123456",  # Standard demo OTP
            "created_at": datetime.now().isoformat(),
            "expires_in_seconds": 300
        }

        return {
            "success": True,
            "transaction_id": tx_id,
            "message": f"OTP sent to mobile linked with Aadhaar/ABHA (Ending with {phone[-4:]})",
            "mock_hint": "For hackathon demo, use OTP: 123456"
        }

    async def verify_otp(self, transaction_id: str, otp: str) -> Dict[str, Any]:
        tx = self.active_transactions.get(transaction_id)
        if not tx:
            return {"success": False, "message": "Invalid or expired transaction ID"}

        if otp.strip() != tx["expected_otp"] and otp.strip() != "000000":
            return {"success": False, "message": "Invalid OTP. Use 123456 for demo."}

        profile = tx.get("profile")
        if not profile:
            profile = {
                "abha_number": tx["abha_id"] if len(tx["abha_id"]) > 10 else f"91-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}",
                "abha_address": f"patient_{uuid.uuid4().hex[:6]}@abdm",
                "name": "Verified Patient",
                "gender": "male",
                "age": 30,
                "phone": "9915972220",
                "address": "Sector 4, PHC Catchment Area",
                "status": "VERIFIED"
            }

        if "id" not in profile:
            profile["id"] = f"PAT_{uuid.uuid4().hex[:8].upper()}"

        return {
            "success": True,
            "message": "ABHA authenticated successfully",
            "patient": profile
        }

    async def register_new_abha(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        name = profile.get("name", "New Patient")
        phone = profile.get("phone", "9999999999")
        gender = profile.get("gender", "other")
        age = profile.get("age", 30)
        
        # Generate 14-digit ABHA Number (Format: XX-XXXX-XXXX-XXXX)
        raw_digits = f"91{uuid.uuid4().int}"[:14]
        abha_number = f"{raw_digits[:2]}-{raw_digits[2:6]}-{raw_digits[6:10]}-{raw_digits[10:14]}"
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', name.lower())[:8] or "user"
        abha_address = f"{clean_name}{raw_digits[-4:]}@abdm"

        new_record = {
            "abha_number": abha_number,
            "abha_address": abha_address,
            "name": name,
            "gender": gender,
            "age": age,
            "phone": phone,
            "address": profile.get("address", "Local District"),
            "status": "NEW_REGISTERED",
            "created_at": datetime.now().isoformat()
        }
        self.mock_profiles[abha_number] = new_record

        return {
            "success": True,
            "message": "New ABHA ID created successfully",
            "patient": new_record
        }

    async def record_consent(self, consent_record: Dict[str, Any]) -> Dict[str, Any]:
        consent_id = f"CONSENT_{uuid.uuid4().hex[:10].upper()}"
        record = {
            "consent_id": consent_id,
            "patient_id": consent_record.get("patient_id"),
            "abha_number": consent_record.get("abha_number"),
            "timestamp": datetime.now().isoformat(),
            "scope": {
                "clinical_intake": consent_record.get("clinical_intake", True),
                "doctor_review": consent_record.get("doctor_review", True),
                "ephemeral_audio_processing": consent_record.get("ephemeral_audio", True),
                "abdm_linking": consent_record.get("abdm_linking", True)
            },
            "is_revocable": True,
            "status": "ACTIVE"
        }
        self.consent_log[consent_id] = record
        return {
            "success": True,
            "consent_id": consent_id,
            "consent_record": record,
            "message": "Patient consent logged with immutable timestamp"
        }


# Singleton service instance
abdm_service: ABDMServiceInterface = MockABDMService()
