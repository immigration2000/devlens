import numpy as np
import logging
from typing import Tuple, Optional
import os
import psycopg
from pgvector.psycopg import register_vector

logger = logging.getLogger(__name__)


class RiskDetector:
    """Vector similarity based risk detection using pgvector"""

    def __init__(self):
        """Initialize risk detector with pgvector connection"""
        self.conn = None
        self.initialized = False
        self._initialize_pgvector()

    def _initialize_pgvector(self) -> None:
        """Initialize connection to PostgreSQL with pgvector"""
        try:
            db_url = os.getenv(
                "DATABASE_URL",
                "postgresql://postgres:postgres@localhost:5432/devlens"
            )
            self.conn = psycopg.connect(db_url)
            register_vector(self.conn)
            self.initialized = True
            logger.info("Risk detector initialized with pgvector")
        except Exception as e:
            logger.warning(f"Could not connect to pgvector database: {e}")
            self.initialized = False

    def detect(self, session_vector: np.ndarray, quest_id: str) -> dict:
        """
        Detect risk based on session vector similarity to failure patterns

        Args:
            session_vector: numpy array representing current session state
            quest_id: UUID of the quest

        Returns:
            Dict with risk_level, similarity_score, similar_failures, and triggers
        """
        if not isinstance(session_vector, np.ndarray):
            session_vector = np.array(session_vector)

        try:
            # Normalize vector
            norm = np.linalg.norm(session_vector)
            if norm > 0:
                session_vector = session_vector / norm

            similar_failures = []
            max_similarity = 0.0

            if self.initialized and self.conn:
                similar_failures = self._query_similar_patterns(session_vector, quest_id)
                if similar_failures:
                    max_similarity = similar_failures[0].get("similarity", 0.0)
            else:
                # Fallback when database unavailable
                logger.warning("pgvector unavailable, using default risk detection")
                similar_failures = self._default_similar_patterns()
                max_similarity = similar_failures[0].get("similarity", 0.0) if similar_failures else 0.0

            # Determine risk level based on similarity
            risk_level = self._determine_risk_level(max_similarity, similar_failures)

            logger.info(f"Risk detection completed: {risk_level} with similarity {max_similarity:.3f}")

            return {
                "risk_level": risk_level,
                "similarity_score": max_similarity,
                "similar_failures": similar_failures,
                "triggers": self._extract_triggers(max_similarity, similar_failures)
            }

        except Exception as e:
            logger.error(f"Error detecting risk: {e}")
            return {
                "risk_level": "unknown",
                "similarity_score": 0.0,
                "similar_failures": [],
                "triggers": ["error_in_detection"]
            }

    def _query_similar_patterns(self, session_vector: np.ndarray, quest_id: str) -> list[dict]:
        """Query pgvector for top-5 similar failure patterns"""
        try:
            if not self.conn:
                return []

            cursor = self.conn.cursor()

            # Query for similar failure patterns using vector similarity
            query = """
            SELECT
                id,
                session_id,
                quest_id,
                feature_vector <=> %s as similarity,
                failure_type,
                severity,
                description,
                occurrences
            FROM failure_patterns
            WHERE quest_id = %s
            ORDER BY feature_vector <=> %s
            LIMIT 5
            """

            cursor.execute(query, (session_vector.tolist(), quest_id, session_vector.tolist()))
            results = cursor.fetchall()
            cursor.close()

            similar_failures = []
            for row in results:
                # Invert distance to get similarity (smaller distance = higher similarity)
                similarity = 1.0 - min(row[3], 1.0)
                similar_failures.append({
                    "pattern_id": str(row[0]),
                    "session_id": str(row[1]),
                    "failure_type": row[4],
                    "severity": row[5],
                    "similarity": similarity,
                    "description": row[6] or "No description",
                    "occurrences": row[7] or 0
                })

            return similar_failures

        except Exception as e:
            logger.error(f"Error querying pgvector: {e}")
            return []

    def _default_similar_patterns(self) -> list[dict]:
        """Return default similar patterns when database unavailable"""
        return [
            {
                "pattern_id": "fp_001",
                "session_id": "session_001",
                "failure_type": "high_paste_ratio",
                "severity": "high",
                "similarity": 0.42,
                "description": "High paste ratio with multiple rewrites",
                "occurrences": 12
            },
            {
                "pattern_id": "fp_002",
                "session_id": "session_002",
                "failure_type": "frequent_undo",
                "severity": "medium",
                "similarity": 0.35,
                "description": "Frequent undo operations in short timespan",
                "occurrences": 8
            }
        ]

    def _determine_risk_level(self, max_similarity: float, similar_failures: list[dict]) -> str:
        """Determine risk level based on similarity and failure severities"""
        if not similar_failures:
            return "low"

        top_severity = similar_failures[0].get("severity", "low")

        if max_similarity > 0.85 and top_severity == "high":
            return "critical"
        elif max_similarity > 0.75 or top_severity == "high":
            return "high"
        elif max_similarity > 0.65 or top_severity == "medium":
            return "medium"
        else:
            return "low"

    def _extract_triggers(self, max_similarity: float, similar_failures: list[dict]) -> list[str]:
        """Extract risk triggers from similarity and failure patterns"""
        triggers = []

        if max_similarity > 0.85:
            triggers.append("high_similarity_to_failure")
        if len(similar_failures) > 2:
            triggers.append("multiple_similar_patterns")
        if any(f.get("severity") == "high" for f in similar_failures):
            triggers.append("severe_pattern_detected")
        if any(f.get("occurrences", 0) > 5 for f in similar_failures):
            triggers.append("repeated_failure_pattern")

        return triggers if triggers else ["low_risk"]

    def store_failure(self, session_id: str, quest_id: str, feature_vector: np.ndarray, failure_type: str, severity: str = "medium", description: str = "") -> bool:
        """
        Store new failure pattern in pgvector database

        Args:
            session_id: UUID of the session
            quest_id: UUID of the quest
            feature_vector: Feature vector representation
            failure_type: Type of failure
            severity: Severity level (low, medium, high)
            description: Description of the failure

        Returns:
            True if stored successfully, False otherwise
        """
        try:
            if not self.initialized or not self.conn:
                logger.warning("Cannot store failure pattern: pgvector unavailable")
                return False

            if not isinstance(feature_vector, np.ndarray):
                feature_vector = np.array(feature_vector)

            # Normalize vector
            norm = np.linalg.norm(feature_vector)
            if norm > 0:
                feature_vector = feature_vector / norm

            cursor = self.conn.cursor()

            query = """
            INSERT INTO failure_patterns (
                session_id, quest_id, feature_vector, failure_type, severity, description, occurrences
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """

            cursor.execute(
                query,
                (
                    session_id,
                    quest_id,
                    feature_vector.tolist(),
                    failure_type,
                    severity,
                    description,
                    1
                )
            )

            self.conn.commit()
            cursor.close()

            logger.info(f"Stored failure pattern for quest {quest_id}")
            return True

        except Exception as e:
            logger.error(f"Error storing failure pattern: {e}")
            return False

    def close(self) -> None:
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Risk detector database connection closed")

    def __del__(self):
        """Cleanup on deletion"""
        self.close()
