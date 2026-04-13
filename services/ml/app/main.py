import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import logging
import os
from typing import Optional
from app.models.bug_predictor import BugPredictor
from app.models.behavior_classifier import BehaviorClassifier
from app.models.risk_detector import RiskDetector
from app.features.feature_engineering import (
    compute_bug_features,
    compute_behavior_features,
    compute_session_vector
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Global model instances
bug_predictor: Optional[BugPredictor] = None
behavior_classifier: Optional[BehaviorClassifier] = None
risk_detector: Optional[RiskDetector] = None


# Request/Response Models
class PredictBugRiskRequest(BaseModel):
    features: list[float] = Field(..., description="[paste_ratio, error_rewrite_rate, undo_frequency, execution_gap_avg]")


class PredictBugRiskResponse(BaseModel):
    probability: float
    risk_level: str
    contributing_factors: list[str]


class ClassifyBehaviorRequest(BaseModel):
    features: list[float] = Field(..., description="[exploration_ratio, focus_ratio, stuck_ratio, hint_usage, loop_efficiency, avg_pause_duration, ...]")


class ClassifyBehaviorResponse(BaseModel):
    developer_type: str
    confidence: float
    segment_analysis: dict[str, float]


class DetectRiskRequest(BaseModel):
    session_vector: list[float]
    quest_id: str


class DetectRiskResponse(BaseModel):
    risk_level: str
    similarity_score: float
    similar_failures: list[dict]
    triggers: list[str]


class ComputeFeaturesRequest(BaseModel):
    events: list[dict]


class ComputeFeaturesResponse(BaseModel):
    bug_features: list[float]
    behavior_features: list[float]
    session_vector: list[float]


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict[str, bool]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Loading ML models...")
    global bug_predictor, behavior_classifier, risk_detector

    try:
        bug_predictor = BugPredictor()
        model_path = os.getenv("BUG_PREDICTOR_MODEL_PATH", "/app/models/bug_predictor.json")
        if os.path.exists(model_path):
            bug_predictor.load_model(model_path)
            logger.info("Bug predictor model loaded")
        else:
            logger.info("Bug predictor model not found, using default model")
    except Exception as e:
        logger.warning(f"Could not load bug predictor model: {e}")
        bug_predictor = BugPredictor()

    try:
        behavior_classifier = BehaviorClassifier()
        model_path = os.getenv("BEHAVIOR_CLASSIFIER_MODEL_PATH", "/app/models/behavior_classifier.pkl")
        if os.path.exists(model_path):
            behavior_classifier.load_model(model_path)
            logger.info("Behavior classifier model loaded")
        else:
            logger.info("Behavior classifier model not found, using default model")
    except Exception as e:
        logger.warning(f"Could not load behavior classifier model: {e}")
        behavior_classifier = BehaviorClassifier()

    try:
        risk_detector = RiskDetector()
        logger.info("Risk detector initialized with pgvector")
    except Exception as e:
        logger.warning(f"Could not initialize risk detector: {e}")
        risk_detector = RiskDetector()

    logger.info("ML models loaded successfully")
    yield
    # Shutdown
    logger.info("Shutting down ML service")


app = FastAPI(title="DevLens ML Service", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": {
            "bug_predictor": bug_predictor is not None and bug_predictor.is_loaded,
            "behavior_classifier": behavior_classifier is not None and behavior_classifier.is_loaded,
            "risk_detector": risk_detector is not None,
        }
    }


@app.post("/predict/bug-risk", response_model=PredictBugRiskResponse)
async def predict_bug_risk(request: PredictBugRiskRequest):
    """Predict bug risk probability for given features"""
    if not bug_predictor:
        raise HTTPException(status_code=503, detail="Bug predictor model not loaded")

    try:
        features = np.array(request.features)
        result = bug_predictor.predict(features)

        probability = result["probability"]

        # Determine risk level
        if probability > 0.8:
            risk_level = "critical"
        elif probability > 0.6:
            risk_level = "high"
        elif probability > 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Extract contributing factors
        contributing_factors = []
        if request.features[0] > 0.3:  # paste_ratio
            contributing_factors.append("High paste ratio detected")
        if request.features[1] > 0.4:  # error_rewrite_rate
            contributing_factors.append("Frequent error rewrites")
        if request.features[2] > 0.3:  # undo_frequency
            contributing_factors.append("Frequent undo operations")
        if request.features[3] > 100:  # execution_gap_avg (in ms)
            contributing_factors.append("Large gaps between executions")

        if not contributing_factors:
            contributing_factors.append("Low risk indicators")

        return {
            "probability": round(probability, 3),
            "risk_level": risk_level,
            "contributing_factors": contributing_factors
        }
    except Exception as e:
        logger.error(f"Error predicting bug risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/behavior", response_model=ClassifyBehaviorResponse)
async def classify_behavior(request: ClassifyBehaviorRequest):
    """Classify developer behavior type"""
    if not behavior_classifier:
        raise HTTPException(status_code=503, detail="Behavior classifier model not loaded")

    try:
        features = np.array(request.features).reshape(1, -1)
        result = behavior_classifier.classify(features)

        developer_type = result["developer_type"]
        confidence = result["confidence"]

        # Create segment analysis
        segment_analysis = {
            "exploration": request.features[0] if len(request.features) > 0 else 0.0,
            "focus": request.features[1] if len(request.features) > 1 else 0.0,
            "stuck": request.features[2] if len(request.features) > 2 else 0.0,
            "hint_usage": request.features[3] if len(request.features) > 3 else 0.0,
        }

        return {
            "developer_type": developer_type,
            "confidence": round(confidence, 3),
            "segment_analysis": segment_analysis
        }
    except Exception as e:
        logger.error(f"Error classifying behavior: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect/risk", response_model=DetectRiskResponse)
async def detect_risk(request: DetectRiskRequest):
    """Detect risk based on session vector similarity"""
    if not risk_detector:
        raise HTTPException(status_code=503, detail="Risk detector not initialized")

    try:
        session_vector = np.array(request.session_vector)
        result = risk_detector.detect(session_vector, request.quest_id)

        risk_level = result["risk_level"]
        similarity_score = result["similarity_score"]
        similar_failures = result["similar_failures"]

        # Determine triggers
        triggers = []
        if similarity_score > 0.85:
            triggers.append("high_similarity_to_failure")
        if len(similar_failures) > 2:
            triggers.append("multiple_similar_patterns")
        if any(f.get("severity") == "high" for f in similar_failures):
            triggers.append("severe_pattern_detected")

        return {
            "risk_level": risk_level,
            "similarity_score": round(similarity_score, 3),
            "similar_failures": similar_failures,
            "triggers": triggers
        }
    except Exception as e:
        logger.error(f"Error detecting risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compute-features", response_model=ComputeFeaturesResponse)
async def compute_features(request: ComputeFeaturesRequest):
    """Compute feature vectors from raw events"""
    try:
        if not request.events:
            raise HTTPException(status_code=400, detail="Events list cannot be empty")

        bug_features = compute_bug_features(request.events)
        behavior_features = compute_behavior_features(request.events)
        session_vector = compute_session_vector(request.events)

        return {
            "bug_features": bug_features.tolist(),
            "behavior_features": behavior_features.tolist(),
            "session_vector": session_vector.tolist(),
        }
    except Exception as e:
        logger.error(f"Error computing features: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
