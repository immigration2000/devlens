import numpy as np
import pickle
import json
from pathlib import Path
from xgboost import XGBClassifier
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class BugPredictor:
    """XGBoost model for predicting bug risk probability"""

    def __init__(self):
        """Initialize bug predictor with default model"""
        self.model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            eval_metric='logloss'
        )
        self.is_loaded = False
        self.feature_importance = None
        # Heuristic weights for fallback
        self.heuristic_weights = {
            'paste_ratio': 0.35,
            'error_rewrite_rate': 0.30,
            'undo_frequency': 0.15,
            'execution_gap_avg': 0.20
        }

    def load_model(self, path: str) -> None:
        """
        Load pretrained model from disk
        Supports both XGBoost JSON format and pickle format
        """
        try:
            path = Path(path)
            if path.exists():
                if path.suffix == '.json':
                    # Load XGBoost JSON format
                    self.model.load_model(str(path))
                else:
                    # Load pickle format
                    with open(path, 'rb') as f:
                        self.model = pickle.load(f)
                self.is_loaded = True
                logger.info(f"Loaded bug predictor model from {path}")
            else:
                logger.warning(f"Model file not found at {path}, using default model")
        except Exception as e:
            logger.error(f"Error loading bug predictor model: {e}")
            raise

    def predict(self, features: np.ndarray) -> dict:
        """
        Predict bug risk probability

        Args:
            features: numpy array of shape (n_features,) or (1, n_features)

        Returns:
            Dict with probability, risk_level, and contributing_factors
        """
        if not isinstance(features, np.ndarray):
            features = np.array(features)

        if features.ndim == 1:
            features = features.reshape(1, -1)

        # Ensure we have exactly 4 features
        if features.shape[1] != 4:
            logger.warning(f"Expected 4 features, got {features.shape[1]}")
            if features.shape[1] < 4:
                # Pad with zeros
                padding = np.zeros((features.shape[0], 4 - features.shape[1]))
                features = np.hstack([features, padding])
            else:
                # Truncate to 4 features
                features = features[:, :4]

        try:
            if self.is_loaded:
                # Use trained model
                proba = self.model.predict_proba(features)
                probability = float(proba[0, 1])
            else:
                # Use heuristic fallback
                probability = self._heuristic_predict(features[0])

            return {
                "probability": probability,
                "risk_level": self._determine_risk_level(probability),
                "contributing_factors": self._extract_factors(features[0])
            }
        except Exception as e:
            logger.error(f"Error predicting with bug predictor: {e}")
            return {
                "probability": 0.5,
                "risk_level": "medium",
                "contributing_factors": ["Prediction error"]
            }

    def _heuristic_predict(self, features: np.ndarray) -> float:
        """
        Use heuristic weights for prediction when model is not loaded

        Args:
            features: [paste_ratio, error_rewrite_rate, undo_frequency, execution_gap_avg]

        Returns:
            Probability between 0 and 1
        """
        # Normalize execution_gap_avg (assume typical range 0-1000ms)
        normalized_features = features.copy()
        if normalized_features[3] > 0:
            normalized_features[3] = min(normalized_features[3] / 1000, 1.0)

        # Calculate weighted sum
        weights = np.array([
            self.heuristic_weights['paste_ratio'],
            self.heuristic_weights['error_rewrite_rate'],
            self.heuristic_weights['undo_frequency'],
            1.0 - self.heuristic_weights['execution_gap_avg']  # Invert execution gap
        ])

        weighted_sum = np.dot(normalized_features, weights)
        # Apply sigmoid to get probability
        probability = 1.0 / (1.0 + np.exp(-weighted_sum * 2))
        return float(probability)

    def _determine_risk_level(self, probability: float) -> str:
        """Determine risk level from probability"""
        if probability > 0.8:
            return "critical"
        elif probability > 0.6:
            return "high"
        elif probability > 0.4:
            return "medium"
        else:
            return "low"

    def _extract_factors(self, features: np.ndarray) -> list[str]:
        """Extract contributing factors from features"""
        factors = []
        if features[0] > 0.3:  # paste_ratio
            factors.append("High paste ratio detected")
        if features[1] > 0.4:  # error_rewrite_rate
            factors.append("Frequent error rewrites")
        if features[2] > 0.3:  # undo_frequency
            factors.append("Frequent undo operations")
        if features[3] > 100:  # execution_gap_avg
            factors.append("Large gaps between executions")

        return factors if factors else ["Low risk indicators"]

    def train(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        Train the bug predictor model

        Args:
            X: Training features (n_samples, 4)
            y: Training labels (0 or 1)
        """
        try:
            if not isinstance(X, np.ndarray):
                X = np.array(X)
            if not isinstance(y, np.ndarray):
                y = np.array(y)

            self.model.fit(X, y)
            self.is_loaded = True
            self.feature_importance = self.model.feature_importances_
            logger.info("Bug predictor model trained successfully")
            logger.info(f"Feature importance: {self.feature_importance}")
        except Exception as e:
            logger.error(f"Error training bug predictor: {e}")
            raise

    def save_model(self, path: str) -> None:
        """Save trained model to disk"""
        try:
            path = Path(path)
            path.parent.mkdir(parents=True, exist_ok=True)

            if path.suffix == '.json':
                # Save XGBoost JSON format
                self.model.save_model(str(path))
            else:
                # Save pickle format
                with open(path, 'wb') as f:
                    pickle.dump(self.model, f)

            logger.info(f"Saved bug predictor model to {path}")
        except Exception as e:
            logger.error(f"Error saving bug predictor model: {e}")
            raise

    def get_feature_importance(self) -> Optional[dict]:
        """Get feature importance scores"""
        if self.feature_importance is not None:
            return {
                "paste_ratio": float(self.feature_importance[0]),
                "error_rewrite_rate": float(self.feature_importance[1]),
                "undo_frequency": float(self.feature_importance[2]),
                "execution_gap_avg": float(self.feature_importance[3]),
            }
        return None
