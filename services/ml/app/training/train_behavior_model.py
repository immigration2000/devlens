#!/usr/bin/env python3
"""
Training script for Random Forest behavior classifier model
"""

import numpy as np
import pandas as pd
from pathlib import Path
import logging
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import matplotlib.pyplot as plt
import seaborn as sns
import sys
import os

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.models.behavior_classifier import BehaviorClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_training_data(csv_path: str) -> tuple[np.ndarray, np.ndarray]:
    """Load and prepare training data"""
    logger.info(f"Loading training data from {csv_path}")

    if not os.path.exists(csv_path):
        logger.warning(f"Training data file not found: {csv_path}")
        logger.info("Generating synthetic training data...")
        return generate_synthetic_data()

    df = pd.read_csv(csv_path)

    # Expected columns
    feature_cols = [
        'exploration_ratio', 'focus_ratio', 'stuck_ratio',
        'hint_count', 'avg_loop_efficiency', 'undo_rate', 'pause_frequency'
    ]
    label_col = 'developer_type'

    if not all(col in df.columns for col in feature_cols + [label_col]):
        logger.warning(f"Missing expected columns. Found: {df.columns.tolist()}")
        return generate_synthetic_data()

    X = df[feature_cols].values.astype(np.float32)
    y = df[label_col].values

    logger.info(f"Loaded {len(X)} samples with {X.shape[1]} features")
    logger.info(f"Class distribution:\n{pd.Series(y).value_counts()}")

    return X, y


def generate_synthetic_data(n_samples: int = 500) -> tuple[np.ndarray, np.ndarray]:
    """Generate synthetic training data"""
    logger.info(f"Generating {n_samples} synthetic training samples")

    np.random.seed(42)

    developer_types = ["explorer", "planner", "iterative"]
    y = np.array(np.random.choice(developer_types, n_samples))

    # Generate features based on developer type
    X = np.zeros((n_samples, 7), dtype=np.float32)

    for i, dtype in enumerate(y):
        if dtype == "explorer":
            # High exploration, low focus
            X[i, 0] = np.random.uniform(0.6, 0.9)  # exploration_ratio
            X[i, 1] = np.random.uniform(0.1, 0.3)  # focus_ratio
            X[i, 2] = np.random.uniform(0.1, 0.3)  # stuck_ratio
            X[i, 3] = np.random.uniform(0, 3)     # hint_count
            X[i, 4] = np.random.uniform(0.3, 0.6) # loop_efficiency
            X[i, 5] = np.random.uniform(0.2, 0.5) # undo_rate
            X[i, 6] = np.random.uniform(0, 0.2)   # pause_frequency

        elif dtype == "planner":
            # Low exploration, high focus
            X[i, 0] = np.random.uniform(0.1, 0.3)  # exploration_ratio
            X[i, 1] = np.random.uniform(0.6, 0.9)  # focus_ratio
            X[i, 2] = np.random.uniform(0.0, 0.1)  # stuck_ratio
            X[i, 3] = np.random.uniform(0, 1)     # hint_count
            X[i, 4] = np.random.uniform(0.7, 0.95) # loop_efficiency
            X[i, 5] = np.random.uniform(0.0, 0.2)  # undo_rate
            X[i, 6] = np.random.uniform(0, 0.3)   # pause_frequency

        else:  # iterative
            # Medium exploration and focus, high undo
            X[i, 0] = np.random.uniform(0.3, 0.6)  # exploration_ratio
            X[i, 1] = np.random.uniform(0.2, 0.5)  # focus_ratio
            X[i, 2] = np.random.uniform(0.2, 0.4)  # stuck_ratio
            X[i, 3] = np.random.uniform(1, 4)     # hint_count
            X[i, 4] = np.random.uniform(0.4, 0.7) # loop_efficiency
            X[i, 5] = np.random.uniform(0.4, 0.7) # undo_rate
            X[i, 6] = np.random.uniform(0.1, 0.3) # pause_frequency

    logger.info(f"Generated data class distribution:\n{pd.Series(y).value_counts()}")

    return X, y


def train_and_evaluate(X: np.ndarray, y: np.ndarray) -> BehaviorClassifier:
    """Train Random Forest model and evaluate"""

    # Train/test split with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    logger.info(f"Train set: {len(X_train)} samples")
    logger.info(f"Test set: {len(X_test)} samples")

    # Create and train model
    logger.info("Training Random Forest classifier...")
    classifier = BehaviorClassifier()

    classifier.train(X_train, y_train)

    # Evaluate on test set
    logger.info("Evaluating on test set...")

    # Encode labels for evaluation
    label_encoder = classifier.label_encoder
    y_test_encoded = label_encoder.transform(y_test)

    y_pred_encoded = classifier.model.predict(X_test)
    y_pred = label_encoder.inverse_transform(y_pred_encoded)

    accuracy = accuracy_score(y_test, y_pred)

    logger.info("=" * 60)
    logger.info("MODEL EVALUATION RESULTS")
    logger.info("=" * 60)
    logger.info(f"Accuracy: {accuracy:.4f}")
    logger.info("")
    logger.info("Classification Report:")
    logger.info(classification_report(y_test, y_pred))
    logger.info("")

    # Confusion matrix
    cm = confusion_matrix(y_test_encoded, y_pred_encoded)
    logger.info("Confusion Matrix:")
    logger.info(cm)
    logger.info("=" * 60)

    # Feature importance
    if hasattr(classifier.model, 'feature_importances_'):
        logger.info("Feature Importance:")
        for name, importance in zip(classifier.feature_names, classifier.model.feature_importances_):
            logger.info(f"  {name}: {importance:.4f}")

    return classifier


def save_results(classifier: BehaviorClassifier, output_dir: str = "/app/models"):
    """Save trained model and visualizations"""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    model_path = Path(output_dir) / "behavior_classifier.pkl"
    classifier.save_model(str(model_path))
    logger.info(f"Model saved to {model_path}")

    # Save feature importance plot
    if hasattr(classifier.model, 'feature_importances_'):
        plot_path = Path(output_dir).parent / "training" / "plots" / "behavior_feature_importance.png"
        plot_path.parent.mkdir(parents=True, exist_ok=True)

        plt.figure(figsize=(10, 6))
        plt.barh(classifier.feature_names, classifier.model.feature_importances_)
        plt.xlabel("Importance")
        plt.title("Random Forest Behavior Classifier - Feature Importance")
        plt.tight_layout()
        plt.savefig(plot_path, dpi=100)
        logger.info(f"Feature importance plot saved to {plot_path}")
        plt.close()


def cross_validate(X: np.ndarray, y: np.ndarray):
    """Perform cross-validation"""
    logger.info("Performing 5-fold cross-validation...")

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    label_encoder = LabelEncoder()
    label_encoder.fit(BehaviorClassifier.DEVELOPER_TYPES)

    accuracies = []

    for fold, (train_idx, test_idx) in enumerate(skf.split(X, y), 1):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        classifier = BehaviorClassifier()
        classifier.train(X_train, y_train)

        y_test_encoded = label_encoder.transform(y_test)
        y_pred = classifier.model.predict(X_test)

        accuracy = accuracy_score(y_test_encoded, y_pred)
        accuracies.append(accuracy)

        logger.info(f"Fold {fold}: Accuracy = {accuracy:.4f}")

    logger.info(f"Cross-validation - Mean Accuracy: {np.mean(accuracies):.4f} (+/- {np.std(accuracies):.4f})")


def main():
    """Main training pipeline"""
    logger.info("Starting behavior classifier training pipeline...")

    # Load training data
    csv_path = "/app/data/behavior_training_data.csv"
    X, y = load_training_data(csv_path)

    # Train and evaluate
    classifier = train_and_evaluate(X, y)

    # Cross-validation
    cross_validate(X, y)

    # Save model
    save_results(classifier)

    logger.info("Training pipeline completed successfully!")


if __name__ == "__main__":
    main()
