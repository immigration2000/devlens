#!/usr/bin/env python3
"""
Training script for XGBoost bug predictor model
"""

import numpy as np
import pandas as pd
from pathlib import Path
import logging
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
import matplotlib.pyplot as plt
from xgboost import XGBClassifier
import sys
import os

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.models.bug_predictor import BugPredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_training_data(csv_path: str) -> tuple[np.ndarray, np.ndarray]:
    """Load and prepare training data"""
    logger.info(f"Loading training data from {csv_path}")

    if not os.path.exists(csv_path):
        logger.error(f"Training data file not found: {csv_path}")
        logger.info("Generating synthetic training data...")
        return generate_synthetic_data()

    df = pd.read_csv(csv_path)

    # Expected columns: paste_ratio, error_rewrite_rate, undo_frequency, execution_gap_avg, had_bug
    feature_cols = ['paste_ratio', 'error_rewrite_rate', 'undo_frequency', 'execution_gap_avg']
    label_col = 'had_bug'

    if not all(col in df.columns for col in feature_cols + [label_col]):
        logger.warning(f"Missing expected columns. Found: {df.columns.tolist()}")
        return generate_synthetic_data()

    X = df[feature_cols].values.astype(np.float32)
    y = df[label_col].values.astype(np.int32)

    logger.info(f"Loaded {len(X)} samples with {X.shape[1]} features")
    logger.info(f"Class distribution: {np.bincount(y)}")

    return X, y


def generate_synthetic_data(n_samples: int = 1000) -> tuple[np.ndarray, np.ndarray]:
    """Generate synthetic training data"""
    logger.info(f"Generating {n_samples} synthetic training samples")

    np.random.seed(42)

    # Generate features
    paste_ratio = np.random.uniform(0, 1, n_samples)
    error_rewrite_rate = np.random.uniform(0, 1, n_samples)
    undo_frequency = np.random.uniform(0, 1, n_samples)
    execution_gap_avg = np.random.uniform(0, 500, n_samples)

    # Generate labels based on feature combinations
    # Higher paste_ratio + higher error_rewrite_rate + higher undo = higher bug likelihood
    bug_score = (
        paste_ratio * 0.35 +
        error_rewrite_rate * 0.30 +
        undo_frequency * 0.15 +
        (execution_gap_avg / 500) * 0.20
    )
    y = (bug_score > 0.5).astype(np.int32)

    # Add some noise
    noise_indices = np.random.choice(n_samples, size=int(n_samples * 0.1), replace=False)
    y[noise_indices] = 1 - y[noise_indices]

    X = np.column_stack([paste_ratio, error_rewrite_rate, undo_frequency, execution_gap_avg])

    logger.info(f"Generated data class distribution: {np.bincount(y)}")

    return X, y


def train_and_evaluate(X: np.ndarray, y: np.ndarray) -> BugPredictor:
    """Train XGBoost model and evaluate"""

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    logger.info(f"Train set: {len(X_train)} samples")
    logger.info(f"Test set: {len(X_test)} samples")

    # Create and train model
    logger.info("Training XGBoost model...")
    predictor = BugPredictor()

    predictor.train(X_train, y_train)

    # Evaluate on test set
    logger.info("Evaluating on test set...")
    y_pred = predictor.model.predict(X_test)
    y_pred_proba = predictor.model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    logger.info("=" * 60)
    logger.info("MODEL EVALUATION RESULTS")
    logger.info("=" * 60)
    logger.info(f"Accuracy:  {accuracy:.4f}")
    logger.info(f"Precision: {precision:.4f}")
    logger.info(f"Recall:    {recall:.4f}")
    logger.info(f"F1-Score:  {f1:.4f}")
    logger.info("")
    logger.info("Classification Report:")
    logger.info(classification_report(y_test, y_pred, target_names=["No Bug", "Bug"]))
    logger.info("=" * 60)

    # Feature importance
    if predictor.feature_importance is not None:
        logger.info("Feature Importance:")
        feature_names = ['paste_ratio', 'error_rewrite_rate', 'undo_frequency', 'execution_gap_avg']
        for name, importance in zip(feature_names, predictor.feature_importance):
            logger.info(f"  {name}: {importance:.4f}")

    return predictor


def save_results(predictor: BugPredictor, output_dir: str = "/app/models"):
    """Save trained model"""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    model_path = Path(output_dir) / "bug_predictor.json"
    predictor.save_model(str(model_path))
    logger.info(f"Model saved to {model_path}")

    # Save feature importance plot
    if predictor.feature_importance is not None:
        plot_path = Path(output_dir).parent / "training" / "plots" / "bug_feature_importance.png"
        plot_path.parent.mkdir(parents=True, exist_ok=True)

        feature_names = ['paste_ratio', 'error_rewrite_rate', 'undo_frequency', 'execution_gap_avg']
        plt.figure(figsize=(10, 6))
        plt.barh(feature_names, predictor.feature_importance)
        plt.xlabel("Importance")
        plt.title("XGBoost Bug Predictor - Feature Importance")
        plt.tight_layout()
        plt.savefig(plot_path, dpi=100)
        logger.info(f"Feature importance plot saved to {plot_path}")
        plt.close()


def main():
    """Main training pipeline"""
    logger.info("Starting bug predictor training pipeline...")

    # Load training data
    csv_path = "/app/data/bug_training_data.csv"
    X, y = load_training_data(csv_path)

    # Train and evaluate
    predictor = train_and_evaluate(X, y)

    # Save model
    save_results(predictor)

    logger.info("Training pipeline completed successfully!")


if __name__ == "__main__":
    main()
