"""
Test script for MediKiosk backend services:
1. ABDM ABHA verification & OTP flow
2. Red-Flag emergency triage detector
3. SOCRATES Dialogue Manager
4. 8-Section Structured Clinical Summary formatting
5. Drug-Drug Interaction checker
"""

import asyncio
from app.services.abdm_service import abdm_service
from app.services.red_flag_service import red_flag_service
from app.services.dialogue_manager import dialogue_manager
from app.services.drug_interaction_service import drug_interaction_service
from app.services.ai_service import generate_structured_clinical_intake


async def run_tests():
    print("=" * 60)
    print("MEDIKIOSK BACKEND SERVICES INTEGRATION TEST")
    print("=" * 60)

    # 1. Test ABHA Verification & Consent
    print("\n1. Testing ABHA Verification & Consent Flow...")
    res = await abdm_service.verify_abha("91-5043-5666-3218")
    assert res["exists"] is True, "ABHA verification failed"
    print(f"   ✅ ABHA Verified: {res['name']} ({res['abha_number']})")

    otp_req = await abdm_service.request_otp(res["abha_number"])
    assert otp_req["success"] is True, "OTP request failed"
    print(f"   ✅ OTP Sent: TxID {otp_req['transaction_id']}")

    otp_res = await abdm_service.verify_otp(otp_req["transaction_id"], "123456")
    assert otp_res["success"] is True, "OTP verification failed"
    print(f"   ✅ Patient Logged In: {otp_res['patient']['name']}")

    consent_res = await abdm_service.record_consent({
        "patient_id": "PAT_TEST_01",
        "abha_number": res["abha_number"],
        "clinical_intake": True,
        "doctor_review": True
    })
    assert consent_res["success"] is True
    print(f"   ✅ Consent Logged: ID {consent_res['consent_id']}")

    # 2. Test Red-Flag Emergency Screening
    print("\n2. Testing Red-Flag Emergency Screening...")
    # Test Normal input
    normal_eval = red_flag_service.evaluate("Mild fever and runny nose since yesterday")
    assert normal_eval["is_emergency"] is False
    print(f"   ✅ Routine Symptom Check: is_emergency = {normal_eval['is_emergency']}")

    # Test Acute Chest Pain (ACS)
    emergency_eval = red_flag_service.evaluate("Severe chest pain radiating to my left arm with cold sweat")
    assert emergency_eval["is_emergency"] is True
    assert emergency_eval["severity"] == "CRITICAL"
    print(f"   🚨 Emergency Intercept Triggered: {emergency_eval['condition']}")
    print(f"      Action: {emergency_eval['recommended_action']}")

    # Test Stroke FAST
    stroke_eval = red_flag_service.evaluate("Achanak muh tedha ho gaya aur bolne me dikkat hai (sudden slurred speech)")
    assert stroke_eval["is_emergency"] is True
    print(f"   🚨 Stroke FAST Protocol: {stroke_eval['condition']}")

    # 3. Test Adaptive SOCRATES Dialogue
    print("\n3. Testing Adaptive SOCRATES Dialogue Manager...")
    session = dialogue_manager.create_session(otp_res["patient"], mode="ALLOPATHIC", language="hi")
    s_id = session["session_id"]
    print(f"   ✅ Session Initialized: {s_id}")
    print(f"      Initial Question: {session['question']['title_hi']}")

    # Answer Chief Complaint
    step1 = dialogue_manager.get_next_question(s_id, "सीने में दर्द (Chest pain)")
    print(f"   ✅ Turn 1 Next Question: {step1['question']['title_hi']}")

    # Answer Site
    step2 = dialogue_manager.get_next_question(s_id, "Center of Chest")
    print(f"   ✅ Turn 2 Next Question: {step2['question']['title_hi']}")

    # Answer Onset
    step3 = dialogue_manager.get_next_question(s_id, "अचानक 2 घंटे पहले (Suddenly 2 hours ago)")
    print(f"   ✅ Turn 3 Next Question: {step3['question']['title_hi']}")

    # 4. Test AYUSH Mode
    print("\n4. Testing AYUSH / Ayurvedic OPD Mode...")
    ayush_session = dialogue_manager.create_session(otp_res["patient"], mode="AYUSH", language="hi")
    ay_id = ayush_session["session_id"]
    ay_q1 = dialogue_manager.get_next_question(ay_id, "पाचन समस्या व गैस")
    print(f"   🌿 AYUSH Dashavidha Question: {ay_q1['question']['title_hi']}")

    # 5. Test 8-Section Structured Summary Synthesis
    print("\n5. Testing 8-Section Structured Clinical Summary Generator...")
    mock_session = {
        "chief_complaint": "Acute central chest pain for 2 hours",
        "socrates_responses": {
            "site": "Center of chest",
            "onset": "Acute onset 2 hours ago",
            "character": "Heavy crushing pressure",
            "radiation": "Radiates to left shoulder and jaw",
            "associations": "Diaphoresis and shortness of breath",
            "severity": "8/10",
            "timing": "Constant",
            "exacerbating_relieving": "Worse with exertion",
            "past_history": "Hypertension for 5 years",
            "medications_allergies": "Amlodipine 5mg OD"
        },
        "raw_transcripts": ["Patient reports crushing chest pain..."],
        "mode": "ALLOPATHIC",
        "language": "hi"
    }
    summary = await generate_structured_clinical_intake(mock_session, otp_res["patient"])
    assert "chief_complaint" in summary
    assert "history_of_present_illness" in summary
    assert "drug_allergy_history" in summary
    assert "review_of_systems" in summary
    assert "patient_facing_audio_confirmation" in summary
    print(f"   ✅ 8-Section Summary generated!")
    print(f"      Chief Complaint: {summary['chief_complaint']}")
    print(f"      HPI: {summary['history_of_present_illness'][:90]}...")
    print(f"      Audio Text (Hindi): {summary['patient_facing_audio_confirmation']['hi'][:80]}...")

    # 6. Test Drug Interaction & Lab Abnormalities
    print("\n6. Testing Drug Interaction Checker...")
    interactions = drug_interaction_service.check_drug_interactions([
        {"name": "Aspirin 75mg"},
        {"name": "Warfarin 5mg"}
    ])
    assert len(interactions) > 0, "Expected interaction between Aspirin and Warfarin"
    print(f"   ⚠️ Drug Interaction Flagged: {interactions[0]['drug_a']} + {interactions[0]['drug_b']}")
    print(f"      Clinical Effect: {interactions[0]['effect']}")

    # Test Lab evaluation
    lab_eval = drug_interaction_service.evaluate_lab_value("fasting_blood_sugar", 185.0)
    assert lab_eval["is_abnormal"] is True
    print(f"   ⚠️ Lab Abnormality Evaluated: {lab_eval['test_name']} = {lab_eval['value']} ({lab_eval['flag']})")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! 🎯")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_tests())
