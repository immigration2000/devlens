import numpy as np
import pickle
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class BehaviorClassifier:
    """Random Forest model for classifying developer behavior types"""

    DEVELOPER_TYPES = ["explorer", "planner", "iterative"]

    def __init__(self):
        """Initialize behavior classifier with default model"""
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.is_loaded = False
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(self.DEVELOPER_TYPES)
        self.feature_names = [
            "exploration_ratio",
            "focus_ratio",
            "stuck_ratio",
            "hint_count",
            "avg_loop_efficiency",
            "undo_rate",
            "pause_frequency"
        ]

    def load_model(self, path: str) -> None:
        """Load pretrained model from disk"""
        try:
            path = Path(path)
            if path.exists():
                with open(path, 'rb') as f:
                    self.model = pickle.load(f)
                self.is_loaded = True
                logger.info(f"Loaded behavior classifier model from {path}")
            else:
                logger.warning(f"Model file not found at {path}, using default model")
        except Exception as e:
            logger.error(f"Error loading behavior classifier model: {e}")
            raise

    def classify(self, features: np.ndarray) -> dict:
        """
        Classify developer behavior type

        Args:
            features: numpy array of shape (n_features,) or (1, n_features)

        Returns:
            Dict with developer_type, confidence, and profile
        """
        if not isinstance(features, np.ndarray):
            features = np.array(features)

        if features.ndim == 1:
            features = features.reshape(1, -1)

        # Ensure we have at least 7 features
        if features.shape[1] < 7:
            padding = np.zeros((features.shape[0], 7 - features.shape[1]))
            features = np.hstack([features, padding])
        elif features.shape[1] > 7:
            features = features[:, :7]

        try:
            if self.is_loaded:
                # Use trained model
                prediction = self.model.predict(features)[0]
                proba = self.model.predict_proba(features)[0]
                confidence = float(np.max(proba))
                developer_type = str(prediction)
            else:
                # Use rule-based fallback
                developer_type, confidence = self._rule_based_classify(features[0])

            return {
                "developer_type": developer_type,
                "confidence": confidence,
                "profile": self._generate_profile(features[0])
            }
        except Exception as e:
            logger.error(f"Error classifying behavior: {e}")
            return {
                "developer_type": "unknown",
                "confidence": 0.0,
                "profile": {}
            }

    def _rule_based_classify(self, features: np.ndarray) -> tuple[str, float]:
        """
        Rule-based classification when model is not loaded

        Args:
            features: [exploration_ratio, focus_ratio, stuck_ratio, hint_count, loop_efficiency, undo_rate, pause_frequency]

        Returns:
            Tuple of (developer_type, confidence)
        """
        exploration_ratio = features[0] if len(features) > 0 else 0.0
        focus_ratio = features[1] if len(features) > 1 else 0.0
        stuck_ratio = features[2] if len(features) > 2 else 0.0
        hint_count = features[3] if len(features) > 3 else 0.0
        loop_efficiency = features[4] if len(features) > 4 else 0.0
        undo_rate = features[5] if len(features) > 5 else 0.0
        pause_frequency = features[6] if len(features) > 6 else 0.0

        # Classification rules
        if exploration_ratio > 0.6:
            # Explorer: lots of exploration, various tries
            return "explorer", 0.8
        elif focus_ratio > 0.7 and exploration_ratio < 0.3:
            # Planner: planned, sequential
            return "planner", 0.8
        elif undo_rate > 0.4 and loop_efficiency < 0.5:
            # Iterative: iterative modifications, trial and error
            return "iterative", 0.8
        else:
            # Default to iterative
            return "iterative", 0.6

    def _generate_profile(self, features: np.ndarray) -> dict:
        """Generate behavior profile from features"""
        exploration_ratio = features[0] if len(features) > 0 else 0.0
        focus_ratio = features[1] if len(features) > 1 else 0.0
        stuck_ratio = features[2] if len(features) > 2 else 0.0
        hint_count = features[3] if len(features) > 3 else 0.0
        loop_efficiency = features[4] if len(features) > 4 else 0.0
        undo_rate = features[5] if len(features) > 5 else 0.0
        pause_frequency = features[6] if len(features) > 6 else 0.0

        return {
            "exploration": float(exploration_ratio),
            "focus": float(focus_ratio),
            "stuck": float(stuck_ratio),
            "help_seeking": float(hint_count),
            "efficiency": float(loop_efficiency),
            "iteration": float(undo_rate),
            "deliberation": float(pause_frequency),
        }

    def train(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        Train the behavior classifier model

        Args:
            X: Training features (n_samples, 7)
            y: Training labels (developer types as strings)
        """
        try:
            if not isinstance(X, np.ndarray):
                X = np.array(X)
            if not isinstance(y, np.ndarray):
                y = np.array(y)

            # Ensure features are correct shape
            if X.shape[1] < 7:
                padding = np.zeros((X.shape[0], 7 - X.shape[1]))
                X = np.hstack([X, padding])
            elif X.shape[1] > 7:
                X = X[:, :7]

            # Encode labels
            y_encoded = self.label_encoder.transform(y)

            self.model.fit(X, y_encoded)
            self.is_loaded = True
            logger.info("Behavior classifier model trained successfully")
            logger.info(f"Feature importance: {self.model.feature_importances_}")
        except Exception as e:
            logger.error(f"Error training behavior classifier: {e}")
            raise

    def save_model(self, path: str) -> None:
        """Save trained model to disk"""
        try:
            path = Path(path)
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'wb') as f:
                pickle.dump(self.model, f)
            logger.info(f"Saved behavior classifier model to {path}")
        except Exception as e:
            logger.error(f"Error saving behavior classifier model: {e}")
            raise

    def get_feature_importance(self) -> Optional[dict]:
        """Get feature importance scores"""
        if self.is_loaded and hasattr(self.model, 'feature_importances_'):
            return {
                name: float(importance)
                for name, importance in zip(self.feature_names, self.model.feature_importances_)
            }
        return None
