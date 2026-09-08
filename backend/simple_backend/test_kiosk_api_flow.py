"""
End-to-End API Integration Test for MediKiosk endpoints in FastAPI.
Tests the complete patient journey from ABHA login to physician queue review.
"""

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    except Exception:
        pass

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_api_flow():
    print("=" * 65)
    print("MEDIKIOSK END-TO-END API TEST FLOW")
    print("=" * 65)

    # 1. Verify ABHA
    print("\n[Step 1] POST /kiosk/abha/verify")
    res = client.post("/kiosk/abha/verify", json={"abha_number": "91-5043-5666-3218"})
    assert res.status_code == 200, f"Verify failed: {res.text}"
    vdata = res.json()
    assert vdata["exists"] is True
    print(f"   [OK] ABHA Verified: {vdata['name']}, Gender: {vdata['gender']}")

    # 2. Request OTP
    print("\n[Step 2] POST /kiosk/abha/request-otp")
    res = client.post("/kiosk/abha/request-otp", json={"abha_number": "91-5043-5666-3218"})
    assert res.status_code == 200
    otp_data = res.json()
    tx_id = otp_data["transaction_id"]
    print(f"   [OK] OTP Requested: Transaction {tx_id}")

    # 3. Verify OTP
    print("\n[Step 3] POST /kiosk/abha/verify-otp")
    res = client.post("/kiosk/abha/verify-otp", json={"transaction_id": tx_id, "otp": "123456"})
    assert res.status_code == 200
    p_data = res.json()
    assert p_data["success"] is True
    patient = p_data["patient"]
    print(f"   [OK] OTP Verified. Patient Authenticated: {patient['name']} (ID: {patient['id']})")

    # 4. Consent
    print("\n[Step 4] POST /kiosk/consent")
    res = client.post("/kiosk/consent", json={
        "patient_id": patient["id"],
        "abha_number": patient["abha_number"],
        "clinical_intake": True,
        "ayush_assessment": False,
        "data_storage": True
    })
    assert res.status_code == 200
    c_data = res.json()
    assert c_data["success"] is True
    print(f"   [OK] Consent Recorded: {c_data['consent_id']}")

    # 5. Start Session
    print("\n[Step 5] POST /kiosk/session/start (Allopathic Mode)")
    res = client.post("/kiosk/session/start", json={
        "patient": patient,
        "mode": "ALLOPATHIC",
        "language": "hi"
    })
    assert res.status_code == 200
    s_data = res.json()
    session_id = s_data["session_id"]
    q1 = s_data["question"]
    print(f"   [OK] Session Started: {session_id}")
    print(f"   First Question: {q1['title_hi']}")

    # 6. Conversational Turn 1: Chief Complaint
    print("\n[Step 6] POST /kiosk/session/message (Turn 1)")
    res = client.post("/kiosk/session/message", json={
        "session_id": session_id,
        "input_text": "सीने में बहुत तेज दर्द और भारीपन है (Severe crushing chest pain)",
        "input_type": "voice",
        "language": "hi"
    })
    assert res.status_code == 200
    t1_data = res.json()
    print(f"   Red Flag Status: {t1_data['red_flag']['is_emergency']}")
    assert t1_data['red_flag']['is_emergency'] is True, "Expected emergency red flag for crushing chest pain"
    print(f"   [ALERT] Red Flag Triggered: {t1_data['red_flag']['condition']} ({t1_data['red_flag']['severity']})")
    print(f"   Next Question: {t1_data['question']['title_hi']}")

    # 7. Turn 2: Site & Radiation
    print("\n[Step 7] POST /kiosk/session/message (Turn 2)")
    res = client.post("/kiosk/session/message", json={
        "session_id": session_id,
        "input_text": "छाती के बीच में, बाएं कंधे और जबड़े तक जा रहा है",
        "input_type": "touch_chip",
        "language": "hi"
    })
    assert res.status_code == 200
    t2_data = res.json()
    print(f"   Next Question: {t2_data['question']['title_hi']}")

    # 8. Complete Session
    print("\n[Step 8] POST /kiosk/session/complete")
    res = client.post("/kiosk/session/complete", json={
        "session_id": session_id,
        "patient": patient,
        "mode": "ALLOPATHIC",
        "language": "hi",
        "documents": []
    })
    assert res.status_code == 200
    comp_data = res.json()
    assert comp_data["success"] is True
    print(f"   [OK] Intake Completed!")
    print(f"   Queue Token Slip: #{comp_data['token_number']}")
    print(f"   Triage Priority: {comp_data['priority']}")
    print(f"   Chief Complaint in Structured Summary: {comp_data['structured_summary']['chief_complaint']}")
    print(f"   Patient Audio Confirmation: {comp_data['patient_audio_confirmation']['hi'][:80]}...")

    # 9. Verify Queue status
    print("\n[Step 9] GET /queue")
    res = client.get("/queue")
    assert res.status_code == 200
    queue_data = res.json()
    queue_items = queue_data.get("queue", []) if isinstance(queue_data, dict) else queue_data
    found = any(q.get("patient_id") == patient["id"] for q in queue_items)
    assert found, "Patient not found in queue"
    print(f"   [OK] Patient verified in live doctor queue (Total waiting: {len(queue_items)})")

    # 10. Test Physician Review (Accept / Amend)
    print("\n[Step 10] POST /kiosk/review/{patient_id}/{note_id}")
    res = client.post(f"/kiosk/review/{patient['id']}/latest", json={
        "action": "ACCEPT",
        "doctor_notes": "Immediate 12-lead ECG completed. STEMI alert activated. Patient transferred to CCU.",
        "doctor_name": "Dr. Chahat Kesharwani"
    })
    assert res.status_code == 200
    rev_data = res.json()
    assert rev_data["success"] is True
    print(f"   [OK] Physician Review Recorded: {rev_data['review_status']}")

    # 11. Ephemeral session cleanup
    print("\n[Step 11] POST /kiosk/session/cleanup")
    res = client.post("/kiosk/session/cleanup", json={"session_id": session_id})
    assert res.status_code == 200
    clean_data = res.json()
    assert clean_data["success"] is True
    print(f"   [OK] Ephemeral Session Purged: {clean_data['session_id']}")

    print("\n" + "=" * 65)
    print("ALL END-TO-END API TESTS PASSED PERFECTLY! [SUCCESS]")
    print("=" * 65)

if __name__ == "__main__":
    run_api_flow()
