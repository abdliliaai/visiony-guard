#!/usr/bin/env python3
"""
Vision-Y YOLOv8 Detection Service
FastAPI microservice for real-time object detection using Ultralytics YOLOv8
"""

import os
import io
import base64
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import torch
import numpy as np
from PIL import Image
import cv2
from ultralytics import YOLO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Vision-Y YOLOv8 Detection Service",
    description="AI-powered object detection for security applications",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment configuration
YOLO_WEIGHTS = os.getenv("VY_YOLO_WEIGHTS", "./weights/yolov8n.pt")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
CONFIDENCE_THRESHOLD = float(os.getenv("VY_CONFIDENCE_THRESHOLD", "0.5"))
IOU_THRESHOLD = float(os.getenv("VY_IOU_THRESHOLD", "0.45"))

# Class mapping from YOLO classes to Vision-Y classes
YOLO_TO_VY_CLASSES = {
    0: "person",           # person
    1: "bicycle",          # bicycle
    2: "car",              # car
    3: "motorcycle",       # motorcycle
    5: "truck",            # bus -> truck
    7: "truck",            # truck
    14: "animal",          # bird -> animal
    15: "animal",          # cat -> animal
    16: "animal",          # dog -> animal
    17: "animal",          # horse -> animal
    # Add more mappings as needed
}

# Pydantic models
class BoundingBox(BaseModel):
    x: float = Field(..., description="Normalized x coordinate (0-1)")
    y: float = Field(..., description="Normalized y coordinate (0-1)")
    width: float = Field(..., description="Normalized width (0-1)")
    height: float = Field(..., description="Normalized height (0-1)")

class Detection(BaseModel):
    class_name: str = Field(..., description="Detected object class")
    confidence: float = Field(..., description="Detection confidence (0-1)")
    bbox: BoundingBox = Field(..., description="Bounding box coordinates")

class DetectionRequest(BaseModel):
    image_data: Optional[str] = Field(None, description="Base64 encoded image")
    image_url: Optional[str] = Field(None, description="URL to image")
    classes: List[str] = Field(default_factory=list, description="Classes to detect (empty for all)")
    thresholds: Dict[str, float] = Field(default_factory=dict, description="Per-class confidence thresholds")
    nms_iou: float = Field(default=0.45, description="NMS IoU threshold")

class DetectionResponse(BaseModel):
    detections: List[Detection]
    processing_time_ms: float
    image_size: tuple
    model_info: Dict[str, Any]

class ALPRRequest(BaseModel):
    image_data: Optional[str] = Field(None, description="Base64 encoded image")
    image_url: Optional[str] = Field(None, description="URL to image")
    region: str = Field(default="us", description="License plate region")

class ALPRResponse(BaseModel):
    plates: List[Dict[str, Any]]
    processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    timestamp: datetime

# Global model instance
model: Optional[YOLO] = None

async def load_model():
    """Load YOLOv8 model on startup"""
    global model
    try:
        logger.info(f"Loading YOLOv8 model from {YOLO_WEIGHTS} on device {DEVICE}")
        model = YOLO(YOLO_WEIGHTS)
        model.to(DEVICE)
        logger.info("YOLOv8 model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load YOLOv8 model: {e}")
        raise

def decode_image(image_data: str) -> np.ndarray:
    """Decode base64 image data to numpy array"""
    try:
        # Remove data URL prefix if present
        if image_data.startswith("data:image"):
            image_data = image_data.split(",")[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Convert to numpy array
        return np.array(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

def normalize_bbox(bbox, img_width: int, img_height: int) -> BoundingBox:
    """Convert pixel coordinates to normalized coordinates"""
    x1, y1, x2, y2 = bbox
    return BoundingBox(
        x=float(x1 / img_width),
        y=float(y1 / img_height),
        width=float((x2 - x1) / img_width),
        height=float((y2 - y1) / img_height)
    )

def filter_detections(
    results,
    classes: List[str],
    thresholds: Dict[str, float],
    img_width: int,
    img_height: int
) -> List[Detection]:
    """Filter and format detection results"""
    detections = []
    
    for result in results:
        if result.boxes is None:
            continue
            
        boxes = result.boxes.xyxy.cpu().numpy()  # x1, y1, x2, y2
        confidences = result.boxes.conf.cpu().numpy()
        class_ids = result.boxes.cls.cpu().numpy().astype(int)
        
        for box, conf, class_id in zip(boxes, confidences, class_ids):
            # Map YOLO class to Vision-Y class
            vy_class = YOLO_TO_VY_CLASSES.get(class_id)
            if not vy_class:
                continue
                
            # Filter by requested classes
            if classes and vy_class not in classes:
                continue
                
            # Apply class-specific threshold
            threshold = thresholds.get(vy_class, CONFIDENCE_THRESHOLD)
            if conf < threshold:
                continue
            
            # Create detection
            detection = Detection(
                class_name=vy_class,
                confidence=float(conf),
                bbox=normalize_bbox(box, img_width, img_height)
            )
            detections.append(detection)
    
    return detections

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    await load_model()

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model is not None else "unhealthy",
        model_loaded=model is not None,
        device=DEVICE,
        timestamp=datetime.now()
    )

@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(request: DetectionRequest):
    """Detect objects in image using YOLOv8"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Get image data
        if request.image_data:
            img_array = decode_image(request.image_data)
        elif request.image_url:
            # In production, implement URL fetching with proper error handling
            raise HTTPException(status_code=400, detail="Image URL not supported yet")
        else:
            raise HTTPException(status_code=400, detail="Either image_data or image_url required")
        
        img_height, img_width = img_array.shape[:2]
        
        # Run inference
        results = model(
            img_array,
            conf=min(request.thresholds.values()) if request.thresholds else CONFIDENCE_THRESHOLD,
            iou=request.nms_iou,
            verbose=False
        )
        
        # Filter and format detections
        detections = filter_detections(
            results,
            request.classes,
            request.thresholds,
            img_width,
            img_height
        )
        
        processing_time = (asyncio.get_event_loop().time() - start_time) * 1000
        
        return DetectionResponse(
            detections=detections,
            processing_time_ms=processing_time,
            image_size=(img_width, img_height),
            model_info={
                "model_name": "YOLOv8",
                "device": DEVICE,
                "num_classes": len(YOLO_TO_VY_CLASSES),
            }
        )
        
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")

@app.post("/alpr", response_model=ALPRResponse)
async def alpr_detection(request: ALPRRequest):
    """ALPR (Automatic License Plate Recognition) - Stub implementation"""
    start_time = asyncio.get_event_loop().time()
    
    # Stub implementation - replace with actual ALPR model
    # This could integrate with OpenALPR, EasyOCR, or a custom model
    
    processing_time = (asyncio.get_event_loop().time() - start_time) * 1000
    
    return ALPRResponse(
        plates=[
            {
                "plate": "ABC-1234",
                "confidence": 0.95,
                "region": request.region,
                "bbox": {"x": 0.3, "y": 0.4, "width": 0.2, "height": 0.1}
            }
        ],
        processing_time_ms=processing_time
    )

@app.post("/batch-validate")
async def batch_validate(files: List[UploadFile] = File(...)):
    """Batch validation endpoint for testing"""
    results = []
    
    for file in files:
        try:
            # Read file
            content = await file.read()
            
            # Convert to base64 for processing
            image_data = base64.b64encode(content).decode()
            
            # Process with detection endpoint
            request = DetectionRequest(image_data=image_data)
            result = await detect_objects(request)
            
            results.append({
                "filename": file.filename,
                "detections": len(result.detections),
                "processing_time_ms": result.processing_time_ms,
                "success": True
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e),
                "success": False
            })
    
    return {"results": results}

if __name__ == "__main__":
    # Download default model if not exists
    if not os.path.exists(YOLO_WEIGHTS):
        logger.info("Downloading default YOLOv8 model...")
        os.makedirs(os.path.dirname(YOLO_WEIGHTS), exist_ok=True)
        temp_model = YOLO("yolov8n.pt")  # This will download the model
        # Move to weights directory if needed
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8001")),
        reload=os.getenv("ENV") == "development",
        log_level="info"
    )