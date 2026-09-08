"""
MongoDB Storage Service for Patients, Queue, Notes, and History
Replaces JSON file-based storage with MongoDB collections
Includes automatic graceful fallback to JSON storage when MongoDB is offline
"""

import os
from typing import Dict, List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from app.services.storage_service import storage


class MongoDBStorage:
    """MongoDB storage service for all application data with graceful file-storage fallback"""
    
    def __init__(self):
        self.client = None
        self.db = None
        self.mongodb_url = os.environ.get('MONGODB_URL', 'mongodb://admin:phc2024@mongodb:27017/phc?authSource=admin')
        
    async def connect(self):
        """Connect to MongoDB and create indexes"""
        if self.client is None:
            try:
                self.client = AsyncIOMotorClient(self.mongodb_url, serverSelectionTimeoutMS=2000)
                self.db = self.client.phc
                await self._create_indexes()
                print("MongoDB Storage connected (patients, queue, notes, history)")
            except Exception as e:
                print(f"MongoDB not available, defaulting to file-based storage fallback: {e}")
                self.db = None
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("MongoDB Storage disconnected")
    
    async def _create_indexes(self):
        """Create database indexes for efficient queries"""
        if self.db is None:
            return
        # Patients collection
        await self.db.patients.create_index([("patient_id", ASCENDING)], unique=True)
        await self.db.patients.create_index([("uhid", ASCENDING)], unique=True, sparse=True)
        await self.db.patients.create_index([("created_at", DESCENDING)])
        
        # Queue collection
        await self.db.queue.create_index([("queue_id", ASCENDING)], unique=True)
        await self.db.queue.create_index([("patient_id", ASCENDING)])
        await self.db.queue.create_index([("status", ASCENDING)])
        await self.db.queue.create_index([("added_at", DESCENDING)])
        
        # Notes collection
        await self.db.notes.create_index([("note_id", ASCENDING)], unique=True)
        await self.db.notes.create_index([("patient_id", ASCENDING)])
        await self.db.notes.create_index([("created_at", DESCENDING)])
        
        # History collection
        await self.db.history.create_index([("history_id", ASCENDING)], unique=True)
        await self.db.history.create_index([("patient_id", ASCENDING)])
        await self.db.history.create_index([("date", DESCENDING)])
    
    # ==================== PATIENTS ====================
    
    async def get_all_patients(self) -> Dict:
        """Get all patients as dict (for compatibility with JSON storage)"""
        if self.db is None:
            return storage.get_all_patients()
        cursor = self.db.patients.find({}, {"_id": 0}).sort("created_at", DESCENDING)
        patients_list = await cursor.to_list(length=None)
        return {p['patient_id']: p for p in patients_list}
    
    async def get_patient(self, patient_id: str) -> Optional[Dict]:
        """Get single patient by ID"""
        if self.db is None:
            return storage.get_patient(patient_id)
        return await self.db.patients.find_one({"patient_id": patient_id}, {"_id": 0})
    
    async def get_patient_by_uhid(self, uhid: str) -> Optional[Dict]:
        """Get patient by UHID"""
        if self.db is None:
            return storage.get_patient_by_uhid(uhid)
        return await self.db.patients.find_one({"uhid": uhid}, {"_id": 0})
    
    async def create_patient(self, patient_id: str, patient_data: Dict) -> Dict:
        """Create new patient"""
        if self.db is None:
            return storage.create_patient(patient_id, patient_data)
        patient_data['patient_id'] = patient_id
        patient_data['created_at'] = patient_data.get('created_at', datetime.now().isoformat())
        patient_data['updated_at'] = datetime.now().isoformat()
        
        await self.db.patients.insert_one(patient_data)
        return patient_data
    
    async def update_patient(self, patient_id: str, updates: Dict) -> Optional[Dict]:
        """Update patient data"""
        if self.db is None:
            return storage.update_patient(patient_id, updates)
        updates['updated_at'] = datetime.now().isoformat()
        
        result = await self.db.patients.find_one_and_update(
            {"patient_id": patient_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop('_id', None)
        return result
    
    # ==================== QUEUE ====================
    
    async def get_queue(self) -> List[Dict]:
        """Get all queue entries"""
        if self.db is None:
            return storage.get_queue()
        cursor = self.db.queue.find({}, {"_id": 0}).sort("added_at", ASCENDING)
        return await cursor.to_list(length=None)
    
    async def add_to_queue(self, queue_entry: Dict) -> Dict:
        """Add entry to queue"""
        if self.db is None:
            return storage.add_to_queue(queue_entry)
        await self.db.queue.insert_one(queue_entry)
        return queue_entry
    
    async def update_queue_status(self, queue_id: str, status: str, **kwargs) -> Optional[Dict]:
        """Update queue entry status"""
        if self.db is None:
            return storage.update_queue_status(queue_id, status, **kwargs)
        updates = {"status": status}
        updates.update(kwargs)
        
        result = await self.db.queue.find_one_and_update(
            {"queue_id": queue_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop('_id', None)
        return result
    
    async def get_queue_by_status(self, status: str) -> List[Dict]:
        """Get queue entries by status"""
        if self.db is None:
            return storage.get_queue_by_status(status)
        cursor = self.db.queue.find({"status": status}, {"_id": 0})
        return await cursor.to_list(length=None)
    
    async def clear_completed_queue(self):
        """Remove completed entries from queue"""
        if self.db is None:
            q = storage.get_queue()
            active = [x for x in q if x.get("status") != "completed"]
            storage.save_json(storage.queue_file, active)
            return len(q) - len(active)
        result = await self.db.queue.delete_many({"status": "completed"})
        return result.deleted_count
    
    # ==================== NOTES ====================
    
    async def get_all_notes(self) -> Dict:
        """Get all notes organized by patient_id (for compatibility)"""
        if self.db is None:
            return storage.get_all_notes()
        cursor = self.db.notes.find({}, {"_id": 0})
        all_notes = await cursor.to_list(length=None)
        
        notes_by_patient = {}
        for note in all_notes:
            patient_id = note['patient_id']
            if patient_id not in notes_by_patient:
                notes_by_patient[patient_id] = []
            notes_by_patient[patient_id].append(note)
        
        return notes_by_patient
    
    async def get_patient_notes(self, patient_id: str) -> List[Dict]:
        """Get all notes for a patient"""
        if self.db is None:
            return storage.get_patient_notes(patient_id)
        cursor = self.db.notes.find(
            {"patient_id": patient_id}, 
            {"_id": 0}
        ).sort("created_at", DESCENDING)
        return await cursor.to_list(length=None)
    
    async def add_note(self, patient_id: str, note: Dict) -> Dict:
        """Add note for patient"""
        if self.db is None:
            return storage.add_note(patient_id, note)
        note['patient_id'] = patient_id
        note['created_at'] = note.get('created_at', datetime.now().isoformat())
        note['updated_at'] = datetime.now().isoformat()
        
        if 'note_id' not in note:
            import uuid
            note['note_id'] = f"NOTE_{uuid.uuid4().hex[:8].upper()}"
        
        await self.db.notes.insert_one(note)
        return note
    
    # ==================== HISTORY ====================
    
    async def get_all_history(self) -> Dict:
        """Get all history organized by patient_id (for compatibility)"""
        if self.db is None:
            return storage.get_all_history()
        cursor = self.db.history.find({}, {"_id": 0})
        all_history = await cursor.to_list(length=None)
        
        history_by_patient = {}
        for entry in all_history:
            patient_id = entry['patient_id']
            if patient_id not in history_by_patient:
                history_by_patient[patient_id] = []
            history_by_patient[patient_id].append(entry)
        
        return history_by_patient
    
    async def get_patient_history(self, patient_id: str) -> List[Dict]:
        """Get all history for a patient"""
        if self.db is None:
            return storage.get_patient_history(patient_id)
        cursor = self.db.history.find(
            {"patient_id": patient_id}, 
            {"_id": 0}
        ).sort("date", DESCENDING)
        return await cursor.to_list(length=None)
    
    async def add_history(self, patient_id: str, history_entry: Dict) -> Dict:
        """Add history entry for patient"""
        if self.db is None:
            return storage.add_history(patient_id, history_entry)
        history_entry['patient_id'] = patient_id
        history_entry['created_at'] = history_entry.get('created_at', datetime.now().isoformat())
        history_entry['updated_at'] = datetime.now().isoformat()
        
        if 'history_id' not in history_entry:
            import uuid
            history_entry['history_id'] = f"HIST_{uuid.uuid4().hex[:8].upper()}"
        
        await self.db.history.insert_one(history_entry)
        return history_entry


# Singleton instance
mongodb_storage = MongoDBStorage()
