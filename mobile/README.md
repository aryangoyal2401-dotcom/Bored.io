# Sahayak — Nurse Mobile App (Flutter)

## Overview
Mobile app for nurses to register patients, record conversations, and scan documents.

## Features
- Nurse Dashboard
- Patient Registration
- AI Scribe (Audio Recording)
- AI Digitizer (Document Scanning)

## Tech Stack
- Flutter 3.x
- Dart 3.x
- Key Packages:
  - `http` - API calls
  - `flutter_sound` - Audio recording
  - `camera` - Image capture
  - `path_provider` - File storage

## Setup

```bash
# Navigate to the app directory
cd nurse_app

# Get dependencies
flutter pub get

# Run on Android emulator/device
flutter run
```

## Project Structure
```
lib/
├── main.dart              # App entry point
├── screens/
│   ├── dashboard.dart     # Nurse dashboard
│   ├── patient_registration.dart
│   ├── ai_scribe.dart     # Audio recording
│   └── ai_digitizer.dart  # Document scanning
├── services/
│   ├── api_service.dart   # Backend API calls
│   └── s3_service.dart    # S3 uploads
└── models/
    └── patient.dart       # Patient data model
```

## Build APK
```bash
flutter build apk --release
# APK will be at: build/app/outputs/flutter-apk/app-release.apk
```

## Environment Variables
Create `lib/config.dart`:
```dart
class Config {
  static const String apiEndpoint = 'https://your-api-gateway-url.com/Prod';
  static const String region = 'ap-south-1';
}
```
