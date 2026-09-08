# Sahayak — Client (React Web App)

This is the React + Vite web frontend for **Sahayak**, serving the Doctor Dashboard and Admin Panel.

---

## 1. Nurse Mobile App

**Main Flow:**
Queue → Patient Info → AI Scribe → AI Digitizer → Submit → Next Patient

### Dashboard / Queue Screen

* Patient Queue List (with name, UHID, symptoms tag, status: *waiting / in-progress / done*)
* "Start Encounter" button for each patient
* Search bar to find a patient by UHID
* Refresh button (to sync latest patient queue)

### Patient Profile / Encounter Start Screen

* Display Patient Info Card (Name, Age, Gender, UHID, Last Visit Date)
* Two main buttons:
  * "Start AI Transcribe"
  * "Scan Documents"

---

### AI Transcribe Screen

* Big circular **Record** button (toggle: Start/Stop Recording)
* Real-time **Audio Waveform Animation** (visual feedback while recording)
* Display **Live Transcription Textbox** (editable text showing recognized speech)
* "Summarize for Doctor" button → triggers GenAI summarization
* Loader + "Transcribing..." state animation
* Success toast: "Transcription uploaded to doctor's dashboard"

**Backend Integration:**
→ `POST /encounter/scribe`

---

### AI Digitizer (Document Scan) Screen

* "Upload or Scan Documents" button (camera/gallery)
* Display thumbnails of scanned documents (with dates)
* "Analyze Documents" button → calls GenAI OCR
* Result: Structured timeline (e.g., medication history)
* "Send to Doctor" button → sends data to backend

**Backend Integration:**
→ `POST /encounter/scan`

---

### Summary / Confirmation Screen

* Show summarized SOAP note
* Show extracted document history
* "Submit & Move to Next Patient" button

---

## 2. Doctor's Web Dashboard (React Web)

**Main Flow:** Queue → View Patient → SOAP Note + History → Insights / Map

### Header / Global UI

* Logo + "Sahayak" title
* Doctor's Name (e.g., "Dr. Priya") + Profile Icon
* "Active Patients" count
* "Outbreak Map" link in top nav

---

### Patient Queue Panel

* Left sidebar listing current patients
* Status indicator (Active / Waiting / Done)
* Each patient card shows:
  * Name + Age
  * UHID
  * Symptoms summary (from AI Scribe)

---

### Patient Details Panel

* Patient Info Card (basic demographics + UHID)
* Tabs / Sections:

  1. **SOAP Note (Live Typing Animation)**
     * Subjective, Objective, Assessment, Plan
     * "Last updated: [time ago]"
  2. **Medical History Timeline**
     * Left: Uploaded document preview (image)
     * Right: Structured extracted data (e.g., "Amlodipine 5mg — 12 May 2024")
  3. **Insights (Future)**
     * AI Suggestions / Red flags

**Backend Integration:**
→ `GET /dashboard/patient/{id}` (polls every 2s)

---

### Outbreak Map

* Dark-mode map background
* Pulsing red markers at high case-density areas
* Tooltip showing "12 Fever Cases in Village X"
* Dropdown: Filter by symptom type (fever, cough, etc.)
* Legend + Last updated time

---

## 3. Admin Dashboard (Web)

**Purpose:** Monitor system usage, outbreaks, and queue statistics.

### Header / Global Controls

* "Admin Console" title
* Filter by region / PHC center
* "Export Report" button (download CSV/PDF)
* "Log out" button

### Overview Cards

* Total Active Patients
* Total Registered Nurses
* Total Registered Doctors
* Total Reports Generated Today

### Analytics Section

* Chart: "Cases per Symptom Type" (Bar Chart)
* Chart: "Patient Load per Doctor" (Bar / Pie)
* Outbreak Map (same as Doctor's view, larger)
* Line Chart: "Trend of New Cases (7 days)"

### Management Section

* Manage Doctors & Nurses (add/remove/update)
* View all Patient Records (table: name, UHID, date, doctor assigned)
* Access Logs (who accessed what)
* Alert System (manual override or alert creation)

---

## 4. Public Report Access Page

**URL:** `/report`

* Input field: "Enter Your UHID"
* "Search" button
* Once found: Show basic patient details, "Download Report (PDF)" button, preview SOAP + timeline
* Handle invalid UHID gracefully ("No record found.")

---

## Summary Table

| Interface              | Core Components                                             |
| ---------------------- | ----------------------------------------------------------- |
| **Nurse App**          | Queue List, AI Transcribe, Document Scanner, Summary        |
| **Doctor Dashboard**   | Patient Queue, Live SOAP Note, History Viewer, Outbreak Map |
| **Admin Dashboard**    | Overview Analytics, Outbreak Map, Management Tools          |
| **Public Report Page** | UHID Input, Patient Report Download                         |

---

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```
