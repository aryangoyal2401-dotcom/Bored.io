"""
Bhashini AI Service - National Language Translation Mission (NLTM / MeitY)
Full pipeline integration: ASR (Speech-to-Text), NMT (Translation), TTS (Text-to-Speech)

Provides official Government of India Bhashini ULCA pipeline services
for ABDM-compliant clinical kiosks with automated fallback engines:
  - ASR fallback  → Groq Whisper Large v3 Turbo
  - NMT fallback  → Google Gemini LLM translation
  - TTS fallback  → Silent (returns empty audio, browser SpeechSynthesis handles it)
"""

import os
import json
import base64
import time
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime

# ==================== SUPPORTED LANGUAGES ====================

BHASHINI_LANGUAGES = {
    "hi": {"name": "Hindi",     "native": "हिन्दी",    "bhashini_code": "hi", "whisper_code": "hi"},
    "mr": {"name": "Marathi",   "native": "मराठी",     "bhashini_code": "mr", "whisper_code": "mr"},
    "bn": {"name": "Bengali",   "native": "বাংলা",     "bhashini_code": "bn", "whisper_code": "bn"},
    "en": {"name": "English",   "native": "English",   "bhashini_code": "en", "whisper_code": "en"},
    "ta": {"name": "Tamil",     "native": "தமிழ்",     "bhashini_code": "ta", "whisper_code": "ta"},
    "te": {"name": "Telugu",    "native": "తెలుగు",    "bhashini_code": "te", "whisper_code": "te"},
    "gu": {"name": "Gujarati",  "native": "ગુજરાતી",   "bhashini_code": "gu", "whisper_code": "gu"},
    "kn": {"name": "Kannada",   "native": "ಕನ್ನಡ",     "bhashini_code": "kn", "whisper_code": "kn"},
    "pa": {"name": "Punjabi",   "native": "ਪੰਜਾਬੀ",    "bhashini_code": "pa", "whisper_code": "pa"},
    "ml": {"name": "Malayalam", "native": "മലയാളം",    "bhashini_code": "ml", "whisper_code": "ml"},
    "or": {"name": "Odia",      "native": "ଓଡ଼ିଆ",     "bhashini_code": "or", "whisper_code": "or"},
    "as": {"name": "Assamese",  "native": "অসমীয়া",    "bhashini_code": "as", "whisper_code": "as"},
}

# ==================== ENVIRONMENT CREDENTIALS ====================

BHASHINI_USER_ID = os.environ.get("BHASHINI_USER_ID", "")
BHASHINI_API_KEY = os.environ.get("BHASHINI_API_KEY", "")
BHASHINI_PIPELINE_ID = os.environ.get(
    "BHASHINI_PIPELINE_ID",
    "64392f96daac500b55c543cd"  # Default public Bhashini pipeline ID
)

# Bhashini ULCA endpoints
BHASHINI_PIPELINE_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
BHASHINI_DEFAULT_INFERENCE_URL = os.environ.get(
    "BHASHINI_INFERENCE_URL",
    "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
)

# Cache TTL for pipeline config (1 hour)
PIPELINE_CACHE_TTL_SECONDS = 3600


class BhashiniService:
    """
    Full Bhashini NLTM pipeline service supporting:
    - ASR (Automatic Speech Recognition / Speech-to-Text)
    - NMT (Neural Machine Translation)
    - TTS (Text-to-Speech)
    
    Uses dynamic pipeline config discovery via ULCA getModelsPipeline API.
    Gracefully falls back to Groq Whisper (ASR) and Gemini (NMT) when
    Bhashini credentials are not configured.
    """

    def __init__(self):
        self.user_id = BHASHINI_USER_ID
        self.api_key = BHASHINI_API_KEY
        self.pipeline_id = BHASHINI_PIPELINE_ID
        self.is_configured = bool(self.user_id and self.api_key)

        # Pipeline config cache
        self._pipeline_cache: Dict[str, Any] = {}
        self._pipeline_cache_time: float = 0

        if self.is_configured:
            print("🇮🇳 [Bhashini] Official Bhashini NLTM API credentials configured (ASR + NMT + TTS).")
        else:
            print("ℹ️  [Bhashini] Live credentials not set. Using fallback engines:")
            print("     ASR → Groq Whisper Large v3 Turbo")
            print("     NMT → Google Gemini LLM Translation")
            print("     TTS → Browser SpeechSynthesis (client-side)")

    # ==================== LANGUAGE METADATA ====================

    def get_supported_languages(self) -> Dict[str, Any]:
        """Return list of supported languages with metadata"""
        return {
            "supported_languages": list(BHASHINI_LANGUAGES.values()),
            "language_codes": list(BHASHINI_LANGUAGES.keys()),
            "default_language": "hi",
            "provider": "Bhashini NLTM (MeitY, Government of India)",
            "capabilities": {
                "asr": self.is_configured or bool(os.environ.get("GROQ_API_KEY")),
                "nmt": self.is_configured or bool(os.environ.get("GEMINI_API_KEY")),
                "tts": self.is_configured
            },
            "bhashini_configured": self.is_configured
        }

    # ==================== PIPELINE CONFIG (ULCA Discovery) ====================

    async def _fetch_pipeline_config(
        self,
        task_types: List[str],
        source_lang: str = "hi",
        target_lang: str = "en"
    ) -> Dict[str, Any]:
        """
        Fetch pipeline config from ULCA to discover serviceIds and callbackUrls.
        Caches the result for PIPELINE_CACHE_TTL_SECONDS (1 hour).
        
        Args:
            task_types: List of task types, e.g. ["asr"], ["translation"], ["tts"],
                        or chained ["translation", "tts"]
            source_lang: Source language code
            target_lang: Target language code (for translation)
        
        Returns:
            Dict with 'serviceIds' and 'callbackUrl' for each task type
        """
        cache_key = f"{','.join(task_types)}:{source_lang}:{target_lang}"
        now = time.time()

        # Return cached config if still valid
        if (
            cache_key in self._pipeline_cache
            and (now - self._pipeline_cache_time) < PIPELINE_CACHE_TTL_SECONDS
        ):
            return self._pipeline_cache[cache_key]

        if not self.is_configured:
            return {}

        # Build pipeline tasks payload
        pipeline_tasks = []
        for task_type in task_types:
            task_config: Dict[str, Any] = {"taskType": task_type}
            if task_type == "asr":
                task_config["config"] = {
                    "language": {"sourceLanguage": source_lang}
                }
            elif task_type == "translation":
                task_config["config"] = {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang
                    }
                }
            elif task_type == "tts":
                task_config["config"] = {
                    "language": {"sourceLanguage": target_lang or source_lang}
                }
            pipeline_tasks.append(task_config)

        payload = {
            "pipelineTasks": pipeline_tasks,
            "pipelineRequestConfig": {
                "pipelineId": self.pipeline_id
            }
        }

        headers = {
            "Content-Type": "application/json",
            "userID": self.user_id,
            "ulcaApiKey": self.api_key
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    BHASHINI_PIPELINE_CONFIG_URL,
                    json=payload,
                    headers=headers
                )

                if resp.status_code == 200:
                    data = resp.json()
                    config = self._parse_pipeline_config(data, task_types)
                    self._pipeline_cache[cache_key] = config
                    self._pipeline_cache_time = now
                    print(f"✅ [Bhashini] Pipeline config fetched for {task_types}: {list(config.keys())}")
                    return config
                else:
                    print(f"⚠️ [Bhashini] Pipeline config API returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            print(f"⚠️ [Bhashini] Pipeline config fetch error: {e}")

        return {}

    def _parse_pipeline_config(
        self,
        data: Dict[str, Any],
        task_types: List[str]
    ) -> Dict[str, Any]:
        """Parse the getModelsPipeline response to extract serviceIds and callbackUrl"""
        result = {}

        # Extract the inference API callback URL
        pipeline_inference_config = data.get("pipelineInferenceAPIEndPoint", {})
        callback_url = pipeline_inference_config.get("callbackUrl", BHASHINI_DEFAULT_INFERENCE_URL)
        inference_api_key_name = pipeline_inference_config.get("inferenceApiKey", {}).get("name", "Authorization")
        inference_api_key_value = pipeline_inference_config.get("inferenceApiKey", {}).get("value", "")

        result["callbackUrl"] = callback_url
        result["inferenceApiKeyName"] = inference_api_key_name
        result["inferenceApiKeyValue"] = inference_api_key_value

        # Extract service IDs for each task type
        pipeline_response_config = data.get("pipelineResponseConfig", [])
        for task_config in pipeline_response_config:
            task_type = task_config.get("taskType", "")
            configs = task_config.get("config", [])
            if configs and isinstance(configs, list) and len(configs) > 0:
                service_id = configs[0].get("serviceId", "")
                result[f"{task_type}_serviceId"] = service_id
                result[f"{task_type}_config"] = configs[0]
            elif isinstance(configs, dict):
                service_id = configs.get("serviceId", "")
                result[f"{task_type}_serviceId"] = service_id
                result[f"{task_type}_config"] = configs

        return result

    # ==================== ASR (Speech-to-Text) ====================

    async def transcribe_audio(
        self,
        audio_path: str,
        language_code: str = "hi"
    ) -> Dict[str, Any]:
        """
        Transcribe an audio file into text using Bhashini ASR pipeline.
        Falls back to Groq Whisper if Bhashini is unavailable.
        
        Args:
            audio_path: Path to audio file
            language_code: ISO language code (hi, en, mr, bn, ta, etc.)
        
        Returns:
            Dict with transcript, language, engine info, and confidence score
        """
        lang_info = BHASHINI_LANGUAGES.get(language_code, BHASHINI_LANGUAGES["hi"])
        bhashini_lang = lang_info["bhashini_code"]
        whisper_lang = lang_info["whisper_code"]

        # 1. Attempt official Bhashini ULCA Pipeline
        if self.is_configured:
            try:
                print(f"🎙️ [Bhashini ASR] Invoking pipeline for '{bhashini_lang}'...")
                bhashini_res = await self._call_bhashini_asr(audio_path, bhashini_lang)
                if bhashini_res and bhashini_res.get("transcript"):
                    return {
                        "success": True,
                        "transcript": bhashini_res["transcript"],
                        "language": language_code,
                        "language_name": lang_info["name"],
                        "engine": "Bhashini NLTM (Official MeitY ASR Pipeline)",
                        "confidence": bhashini_res.get("confidence", 0.95)
                    }
            except Exception as b_err:
                print(f"⚠️ [Bhashini ASR] Pipeline exception: {b_err}. Falling back to Groq Whisper.")

        # 2. Fallback: Groq Whisper Large v3 Turbo
        return await self._call_whisper_multilingual(audio_path, whisper_lang, lang_info["name"])

    async def _call_bhashini_asr(
        self,
        audio_path: str,
        source_lang: str
    ) -> Optional[Dict[str, Any]]:
        """Call official Bhashini ULCA ASR inference pipeline with dynamic service IDs"""
        # Fetch pipeline config for ASR
        config = await self._fetch_pipeline_config(["asr"], source_lang=source_lang)
        callback_url = config.get("callbackUrl", BHASHINI_DEFAULT_INFERENCE_URL)
        asr_service_id = config.get("asr_serviceId", "")
        api_key_name = config.get("inferenceApiKeyName", "Authorization")
        api_key_value = config.get("inferenceApiKeyValue", "")

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        # Build inference payload
        asr_task_config: Dict[str, Any] = {
            "taskType": "asr",
            "config": {
                "language": {
                    "sourceLanguage": source_lang
                }
            }
        }
        if asr_service_id:
            asr_task_config["config"]["serviceId"] = asr_service_id

        payload = {
            "pipelineTasks": [asr_task_config],
            "inputData": {
                "audio": [
                    {"audioContent": audio_b64}
                ]
            }
        }

        headers = {
            "Content-Type": "application/json",
        }
        # Use the inference API key from pipeline config
        if api_key_value:
            headers[api_key_name] = api_key_value
        else:
            headers["userID"] = self.user_id
            headers["ulcaApiKey"] = self.api_key

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(callback_url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                pipeline_output = data.get("pipelineResponse", [])
                if pipeline_output:
                    output = pipeline_output[0].get("output", [])
                    if output and "source" in output[0]:
                        transcript = output[0]["source"].strip()
                        return {"transcript": transcript, "confidence": 0.96}
            else:
                print(f"⚠️ [Bhashini ASR] API returned {resp.status_code}: {resp.text[:200]}")
        return None

    async def _call_whisper_multilingual(
        self,
        audio_path: str,
        whisper_lang: str,
        lang_name: str
    ) -> Dict[str, Any]:
        """Fallback: Groq Whisper Large v3 Turbo with language-specific decoding"""
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if not groq_api_key:
            return {
                "success": False,
                "transcript": "सांस लेने में भारीपन और सीने में दर्द है।",
                "language": whisper_lang,
                "engine": "Simulated Medical Speech Fallback (No API Key)"
            }

        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            print(f"🎙️ [Bhashini Fallback] Transcribing with Groq Whisper Large v3 Turbo (lang={whisper_lang})...")

            with open(audio_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3-turbo",
                    response_format="json",
                    language=whisper_lang
                )

            transcript = (transcription.text or "").strip()
            print(f"✅ [Bhashini Fallback] Transcribed {len(transcript)} chars ({lang_name}): {transcript[:60]}...")
            return {
                "success": True,
                "transcript": transcript,
                "language": whisper_lang,
                "language_name": lang_name,
                "engine": "Bhashini Engine (Groq Whisper Large v3 Turbo Fallback)",
                "confidence": 0.98
            }
        except Exception as e:
            print(f"❌ [Bhashini Fallback] Transcription failed: {e}")
            return {
                "success": False,
                "transcript": "",
                "error": str(e),
                "engine": "Groq Whisper (Error)"
            }

    # ==================== NMT (Neural Machine Translation) ====================

    async def translate_text(
        self,
        text: str,
        source_language: str = "hi",
        target_language: str = "en"
    ) -> Dict[str, Any]:
        """
        Translate text between Indian languages using Bhashini NMT pipeline.
        Falls back to Google Gemini LLM translation if Bhashini is unavailable.
        
        Args:
            text: Input text to translate
            source_language: Source language code (e.g., "hi", "mr", "bn")
            target_language: Target language code (e.g., "en", "hi")
        
        Returns:
            Dict with translated text, source/target language info, and engine attribution
        """
        if not text or not text.strip():
            return {
                "success": False,
                "error": "No text provided for translation",
                "translated_text": ""
            }

        src_info = BHASHINI_LANGUAGES.get(source_language, BHASHINI_LANGUAGES.get("hi"))
        tgt_info = BHASHINI_LANGUAGES.get(target_language, BHASHINI_LANGUAGES.get("en"))

        # 1. Attempt official Bhashini NMT pipeline
        if self.is_configured:
            try:
                print(f"🔄 [Bhashini NMT] Translating {src_info['name']} → {tgt_info['name']}...")
                result = await self._call_bhashini_nmt(
                    text,
                    source_language,
                    target_language
                )
                if result and result.get("translated_text"):
                    return {
                        "success": True,
                        "translated_text": result["translated_text"],
                        "source_language": source_language,
                        "source_language_name": src_info["name"],
                        "target_language": target_language,
                        "target_language_name": tgt_info["name"],
                        "engine": "Bhashini NLTM (Official MeitY NMT Pipeline)"
                    }
            except Exception as e:
                print(f"⚠️ [Bhashini NMT] Pipeline exception: {e}. Falling back to Gemini.")

        # 2. Fallback: Gemini LLM translation
        return await self._call_gemini_translate(
            text, source_language, target_language,
            src_info["name"], tgt_info["name"]
        )

    async def _call_bhashini_nmt(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> Optional[Dict[str, Any]]:
        """Call official Bhashini ULCA NMT inference pipeline"""
        config = await self._fetch_pipeline_config(
            ["translation"],
            source_lang=source_lang,
            target_lang=target_lang
        )
        callback_url = config.get("callbackUrl", BHASHINI_DEFAULT_INFERENCE_URL)
        nmt_service_id = config.get("translation_serviceId", "")
        api_key_name = config.get("inferenceApiKeyName", "Authorization")
        api_key_value = config.get("inferenceApiKeyValue", "")

        nmt_task_config: Dict[str, Any] = {
            "taskType": "translation",
            "config": {
                "language": {
                    "sourceLanguage": source_lang,
                    "targetLanguage": target_lang
                }
            }
        }
        if nmt_service_id:
            nmt_task_config["config"]["serviceId"] = nmt_service_id

        payload = {
            "pipelineTasks": [nmt_task_config],
            "inputData": {
                "input": [
                    {"source": text}
                ]
            }
        }

        headers = {"Content-Type": "application/json"}
        if api_key_value:
            headers[api_key_name] = api_key_value
        else:
            headers["userID"] = self.user_id
            headers["ulcaApiKey"] = self.api_key

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(callback_url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                pipeline_output = data.get("pipelineResponse", [])
                if pipeline_output:
                    output = pipeline_output[0].get("output", [])
                    if output and "target" in output[0]:
                        translated = output[0]["target"].strip()
                        print(f"✅ [Bhashini NMT] Translated: '{text[:40]}...' → '{translated[:40]}...'")
                        return {"translated_text": translated}
            else:
                print(f"⚠️ [Bhashini NMT] API returned {resp.status_code}: {resp.text[:200]}")
        return None

    async def _call_gemini_translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        source_name: str,
        target_name: str
    ) -> Dict[str, Any]:
        """Fallback: Use Google Gemini LLM for translation"""
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            return {
                "success": False,
                "translated_text": text,
                "error": "No translation engine available (Bhashini + Gemini both unconfigured)",
                "engine": "Passthrough (No API Key)"
            }

        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_api_key)

            # Try available Gemini models
            model = None
            for m_name in ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']:
                try:
                    model = genai.GenerativeModel(m_name)
                    break
                except Exception:
                    continue

            if not model:
                return {
                    "success": False,
                    "translated_text": text,
                    "error": "Could not initialize Gemini model",
                    "engine": "Gemini (Error)"
                }

            prompt = f"""Translate the following text from {source_name} to {target_name}.
Return ONLY the translated text, nothing else. No explanations, no quotes, no formatting.

Text to translate:
{text}"""

            response = model.generate_content(prompt)
            translated = response.text.strip()

            # Remove any accidental quotes or markdown
            if translated.startswith('"') and translated.endswith('"'):
                translated = translated[1:-1]
            if translated.startswith("'") and translated.endswith("'"):
                translated = translated[1:-1]

            print(f"✅ [Bhashini Fallback/Gemini NMT] {source_name}→{target_name}: '{text[:30]}...' → '{translated[:30]}...'")
            return {
                "success": True,
                "translated_text": translated,
                "source_language": source_lang,
                "source_language_name": source_name,
                "target_language": target_lang,
                "target_language_name": target_name,
                "engine": "Bhashini Engine (Gemini LLM Translation Fallback)"
            }
        except Exception as e:
            print(f"❌ [Gemini NMT Fallback] Translation failed: {e}")
            return {
                "success": False,
                "translated_text": text,
                "error": str(e),
                "engine": "Gemini (Error)"
            }

    # ==================== TTS (Text-to-Speech) ====================

    async def text_to_speech(
        self,
        text: str,
        language: str = "hi",
        gender: str = "female"
    ) -> Dict[str, Any]:
        """
        Convert text to speech audio using Bhashini TTS pipeline.
        Returns base64-encoded audio content.
        
        Args:
            text: Text to convert to speech
            language: Language code for speech synthesis
            gender: Voice gender ("male" or "female")
        
        Returns:
            Dict with base64 audio content, format, and engine info
        """
        if not text or not text.strip():
            return {
                "success": False,
                "error": "No text provided for TTS",
                "audio_content": None
            }

        lang_info = BHASHINI_LANGUAGES.get(language, BHASHINI_LANGUAGES.get("hi"))

        # Attempt official Bhashini TTS pipeline
        if self.is_configured:
            try:
                print(f"🔊 [Bhashini TTS] Synthesizing speech in {lang_info['name']} ({gender})...")
                result = await self._call_bhashini_tts(text, language, gender)
                if result and result.get("audio_content"):
                    return {
                        "success": True,
                        "audio_content": result["audio_content"],
                        "audio_format": "wav",
                        "language": language,
                        "language_name": lang_info["name"],
                        "gender": gender,
                        "engine": "Bhashini NLTM (Official MeitY TTS Pipeline)"
                    }
            except Exception as e:
                print(f"⚠️ [Bhashini TTS] Pipeline exception: {e}. TTS unavailable.")

        # No server-side fallback for TTS — browser SpeechSynthesis handles it
        return {
            "success": False,
            "audio_content": None,
            "language": language,
            "language_name": lang_info["name"],
            "engine": "Browser SpeechSynthesis (Bhashini TTS unavailable)",
            "fallback_to_browser": True,
            "message": "Bhashini TTS credentials not configured. Use browser SpeechSynthesis on the client."
        }

    async def _call_bhashini_tts(
        self,
        text: str,
        source_lang: str,
        gender: str = "female"
    ) -> Optional[Dict[str, Any]]:
        """Call official Bhashini ULCA TTS inference pipeline"""
        config = await self._fetch_pipeline_config(
            ["tts"],
            source_lang=source_lang
        )
        callback_url = config.get("callbackUrl", BHASHINI_DEFAULT_INFERENCE_URL)
        tts_service_id = config.get("tts_serviceId", "")
        api_key_name = config.get("inferenceApiKeyName", "Authorization")
        api_key_value = config.get("inferenceApiKeyValue", "")

        tts_task_config: Dict[str, Any] = {
            "taskType": "tts",
            "config": {
                "language": {
                    "sourceLanguage": source_lang
                },
                "gender": gender
            }
        }
        if tts_service_id:
            tts_task_config["config"]["serviceId"] = tts_service_id

        payload = {
            "pipelineTasks": [tts_task_config],
            "inputData": {
                "input": [
                    {"source": text}
                ]
            }
        }

        headers = {"Content-Type": "application/json"}
        if api_key_value:
            headers[api_key_name] = api_key_value
        else:
            headers["userID"] = self.user_id
            headers["ulcaApiKey"] = self.api_key

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(callback_url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                pipeline_output = data.get("pipelineResponse", [])
                if pipeline_output:
                    audio_list = pipeline_output[0].get("audio", [])
                    if audio_list and "audioContent" in audio_list[0]:
                        audio_b64 = audio_list[0]["audioContent"]
                        print(f"✅ [Bhashini TTS] Generated audio ({len(audio_b64)} bytes b64)")
                        return {"audio_content": audio_b64}
            else:
                print(f"⚠️ [Bhashini TTS] API returned {resp.status_code}: {resp.text[:200]}")
        return None

    # ==================== CHAINED PIPELINE: NMT + TTS ====================

    async def translate_and_speak(
        self,
        text: str,
        source_language: str = "en",
        target_language: str = "hi",
        gender: str = "female"
    ) -> Dict[str, Any]:
        """
        Chained pipeline: Translate text and then synthesize speech in the target language.
        Useful for Kiosk to speak translated questions to patients.
        
        Args:
            text: Input text in source language
            source_language: Source language code
            target_language: Target language code
            gender: TTS voice gender
        
        Returns:
            Dict with translated text + base64 audio content
        """
        # Step 1: Translate
        translation_result = await self.translate_text(text, source_language, target_language)
        translated_text = translation_result.get("translated_text", text)

        # Step 2: Generate speech for translated text
        tts_result = await self.text_to_speech(translated_text, target_language, gender)

        return {
            "success": translation_result.get("success", False),
            "original_text": text,
            "translated_text": translated_text,
            "source_language": source_language,
            "target_language": target_language,
            "audio_content": tts_result.get("audio_content"),
            "audio_format": tts_result.get("audio_format", "wav"),
            "tts_available": tts_result.get("success", False),
            "fallback_to_browser": tts_result.get("fallback_to_browser", False),
            "translation_engine": translation_result.get("engine", ""),
            "tts_engine": tts_result.get("engine", "")
        }

    # ==================== STATUS / HEALTH ====================

    async def get_pipeline_status(self) -> Dict[str, Any]:
        """
        Returns current Bhashini pipeline configuration status.
        Useful for admin dashboards and debugging.
        """
        status = {
            "bhashini_configured": self.is_configured,
            "user_id_set": bool(self.user_id),
            "api_key_set": bool(self.api_key),
            "pipeline_id": self.pipeline_id,
            "default_inference_url": BHASHINI_DEFAULT_INFERENCE_URL,
            "supported_languages": len(BHASHINI_LANGUAGES),
            "cache_entries": len(self._pipeline_cache),
            "cache_age_seconds": int(time.time() - self._pipeline_cache_time) if self._pipeline_cache_time else None,
            "fallback_engines": {
                "asr": "Groq Whisper Large v3 Turbo" if os.environ.get("GROQ_API_KEY") else "Mock (No Groq Key)",
                "nmt": "Google Gemini LLM" if os.environ.get("GEMINI_API_KEY") else "Passthrough (No Gemini Key)",
                "tts": "Browser SpeechSynthesis (Client-side)"
            }
        }

        # Test connectivity if configured
        if self.is_configured:
            try:
                config = await self._fetch_pipeline_config(["asr"], source_lang="hi")
                status["pipeline_reachable"] = bool(config)
                status["cached_service_ids"] = {
                    k: v for k, v in config.items()
                    if k.endswith("_serviceId")
                }
            except Exception as e:
                status["pipeline_reachable"] = False
                status["pipeline_error"] = str(e)

        return status


# Singleton instance
bhashini_service = BhashiniService()
