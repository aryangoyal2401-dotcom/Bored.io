"""
MongoDB Service for document and timeline storage with automatic in-memory fallback
"""

import os
from typing import List, Optional, Dict
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING


class MongoService:
    """MongoDB service for storing documents and timelines with resilient fallback"""
    
    def __init__(self):
        self.client = None
        self.db = None
        self.mongodb_url = os.environ.get('MONGODB_URL', 'mongodb://admin:phc2024@mongodb:27017/phc?authSource=admin')
        self._memory_documents: Dict[str, Dict] = {}
        self._memory_timelines: Dict[str, Dict] = {}
        self._memory_batches: Dict[str, Dict] = {}
        
    async def connect(self):
        """Connect to MongoDB"""
        if self.client is None:
            try:
                self.client = AsyncIOMotorClient(self.mongodb_url, serverSelectionTimeoutMS=1500)
                self.db = self.client.phc
                # Create indexes
                await self._create_indexes()
                print("MongoDB connected for documents & timelines")
            except Exception as e:
                print(f"MongoDB not available for mongo_service: {e}. Using in-memory fallback.")
                self.db = None
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("MongoDB disconnected")
    
    async def _create_indexes(self):
        """Create database indexes for efficient queries"""
        if not self.db:
            return
        try:
            await self.db.documents.create_index([("patient_id", ASCENDING)])
            await self.db.documents.create_index([("batch_id", ASCENDING)])
            await self.db.documents.create_index([("uploaded_at", DESCENDING)])
            await self.db.timelines.create_index([("patient_id", ASCENDING)])
            await self.db.timelines.create_index([("generated_at", DESCENDING)])
            await self.db.batches.create_index([("patient_id", ASCENDING)])
            await self.db.batches.create_index([("status", ASCENDING)])
        except Exception:
            pass
    
    # ==================== DOCUMENT OPERATIONS ====================
    
    async def save_document(self, document_data: Dict) -> str:
        """Save a single document"""
        doc_id = document_data.get("document_id") or f"DOC_{len(self._memory_documents) + 1}"
        if self.db is not None:
            try:
                result = await self.db.documents.insert_one(document_data)
                return str(result.inserted_id)
            except Exception:
                pass
        self._memory_documents[doc_id] = document_data
        return doc_id
    
    async def get_document(self, document_id: str) -> Optional[Dict]:
        """Get single document by ID"""
        if self.db is not None:
            try:
                return await self.db.documents.find_one({"document_id": document_id})
            except Exception:
                pass
        return self._memory_documents.get(document_id)
    
    async def get_patient_documents(self, patient_id: str) -> List[Dict]:
        """Get all documents for a patient"""
        if self.db is not None:
            try:
                cursor = self.db.documents.find({"patient_id": patient_id}).sort("uploaded_at", DESCENDING)
                return await cursor.to_list(length=None)
            except Exception:
                pass
        return [doc for doc in self._memory_documents.values() if doc.get("patient_id") == patient_id]
    
    async def get_batch_documents(self, batch_id: str) -> List[Dict]:
        """Get all documents in a batch"""
        if self.db is not None:
            try:
                cursor = self.db.documents.find({"batch_id": batch_id}).sort("uploaded_at", ASCENDING)
                return await cursor.to_list(length=None)
            except Exception:
                pass
        return [doc for doc in self._memory_documents.values() if doc.get("batch_id") == batch_id]
    
    async def update_document_status(self, document_id: str, status: str, extracted_data: Optional[Dict] = None):
        """Update document processing status"""
        update_data = {"status": status}
        if extracted_data is not None:
            update_data["extracted_data"] = extracted_data
        
        if self.db is not None:
            try:
                await self.db.documents.update_one(
                    {"document_id": document_id},
                    {"$set": update_data}
                )
                return
            except Exception:
                pass
        
        if document_id in self._memory_documents:
            self._memory_documents[document_id].update(update_data)
    
    # ==================== BATCH OPERATIONS ====================
    
    async def create_batch(self, batch_data: Dict) -> str:
        """Create a new document batch"""
        batch_id = batch_data.get("batch_id") or f"BATCH_{len(self._memory_batches) + 1}"
        if self.db is not None:
            try:
                result = await self.db.batches.insert_one(batch_data)
                return str(result.inserted_id)
            except Exception:
                pass
        self._memory_batches[batch_id] = batch_data
        return batch_id
    
    async def get_batch(self, batch_id: str) -> Optional[Dict]:
        """Get batch by ID"""
        if self.db is not None:
            try:
                return await self.db.batches.find_one({"batch_id": batch_id})
            except Exception:
                pass
        return self._memory_batches.get(batch_id)
    
    async def add_document_to_batch(self, batch_id: str, document_id: str):
        """Add document to existing batch"""
        if self.db is not None:
            try:
                await self.db.batches.update_one(
                    {"batch_id": batch_id},
                    {"$push": {"document_ids": document_id}}
                )
                return
            except Exception:
                pass
        
        if batch_id in self._memory_batches:
            doc_ids = self._memory_batches[batch_id].get("document_ids", [])
            doc_ids.append(document_id)
            self._memory_batches[batch_id]["document_ids"] = doc_ids
    
    async def update_batch_status(self, batch_id: str, status: str):
        """Update batch status"""
        update_data = {"status": status}
        if status == "completed":
            update_data["completed_at"] = datetime.now().isoformat()
        
        if self.db is not None:
            try:
                await self.db.batches.update_one(
                    {"batch_id": batch_id},
                    {"$set": update_data}
                )
                return
            except Exception:
                pass
        
        if batch_id in self._memory_batches:
            self._memory_batches[batch_id].update(update_data)
    
    async def get_active_batch(self, patient_id: str) -> Optional[Dict]:
        """Get active (pending/processing) batch for patient"""
        if self.db is not None:
            try:
                return await self.db.batches.find_one({
                    "patient_id": patient_id,
                    "status": {"$in": ["pending", "processing"]}
                })
            except Exception:
                pass
        
        for batch in self._memory_batches.values():
            if batch.get("patient_id") == patient_id and batch.get("status") in ["pending", "processing"]:
                return batch
        return None
    
    # ==================== TIMELINE OPERATIONS ====================
    
    async def save_timeline(self, timeline_data: Dict) -> str:
        """Save generated timeline"""
        patient_id = timeline_data.get("patient_id")
        if self.db is not None:
            try:
                await self.db.timelines.delete_many({"patient_id": patient_id})
                result = await self.db.timelines.insert_one(timeline_data)
                return str(result.inserted_id)
            except Exception:
                pass
        
        # In-memory storage
        self._memory_timelines[patient_id] = timeline_data
        return f"TL_{patient_id}"
    
    async def get_patient_timeline(self, patient_id: str) -> Optional[Dict]:
        """Get latest timeline for patient"""
        if self.db is not None:
            try:
                return await self.db.timelines.find_one(
                    {"patient_id": patient_id},
                    sort=[("generated_at", DESCENDING)]
                )
            except Exception:
                pass
        
        return self._memory_timelines.get(patient_id)
    
    async def get_all_timelines(self) -> List[Dict]:
        """Get all timelines (for admin view)"""
        if self.db is not None:
            try:
                cursor = self.db.timelines.find().sort("generated_at", DESCENDING)
                return await cursor.to_list(length=None)
            except Exception:
                pass
        return list(self._memory_timelines.values())


# Singleton instance
mongo_service = MongoService()
