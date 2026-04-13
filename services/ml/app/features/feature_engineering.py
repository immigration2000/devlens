import numpy as np
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


def compute_bug_features(events: List[Dict[str, Any]]) -> np.ndarray:
    """
    Compute the 4 key features from raw events for bug prediction

    Args:
        events: List of event dictionaries

    Returns:
        Feature vector: [paste_ratio, error_rewrite_rate, undo_frequency, execution_gap_avg]
    """
    try:
        if not events:
            return np.zeros(4)

        # Feature 1: Paste Ratio
        paste_count = sum(1 for e in events if e.get('change_type') == 'paste' or e.get('type') == 'paste')
        paste_ratio = paste_count / len(events) if events else 0.0

        # Feature 2: Error Rewrite Rate
        # Count large deletes (>20 chars) within 10 events after error
        error_rewrite = 0
        error_indices = []

        for i, e in enumerate(events):
            if e.get('event') == 'execution' and e.get('result') in ['runtime_error', 'syntax_error']:
                error_indices.append(i)

        for error_idx in error_indices:
            # Look for large deletes in next 10 events
            for j in range(error_idx + 1, min(error_idx + 11, len(events))):
                event = events[j]
                if event.get('change_type') == 'delete' and event.get('char_count_delta', 0) < -20:
                    error_rewrite += 1
                    break

        error_rewrite_rate = error_rewrite / max(len(error_indices), 1) if error_indices else 0.0

        # Feature 3: Undo Frequency
        undo_count = sum(1 for e in events if e.get('is_undo') or e.get('event') == 'undo' or e.get('type') == 'undo')
        undo_frequency = undo_count / len(events) if events else 0.0

        # Feature 4: Execution Gap Average
        execution_timestamps = [
            float(e.get('timestamp', 0)) if isinstance(e.get('timestamp'), str) else e.get('timestamp', 0)
            for e in events
            if e.get('event') == 'execution'
        ]

        if len(execution_timestamps) > 1:
            gaps = [
                execution_timestamps[i] - execution_timestamps[i - 1]
                for i in range(1, len(execution_timestamps))
            ]
            execution_gap_avg = np.mean(gaps) if gaps else 0.0
        else:
            execution_gap_avg = 0.0

        features = np.array([
            paste_ratio,
            error_rewrite_rate,
            undo_frequency,
            execution_gap_avg
        ], dtype=np.float32)

        logger.debug(f"Computed bug features: paste={paste_ratio:.3f}, "
                    f"error_rewrite={error_rewrite_rate:.3f}, "
                    f"undo={undo_frequency:.3f}, "
                    f"gap={execution_gap_avg:.1f}")

        return features

    except Exception as e:
        logger.error(f"Error computing bug features: {e}")
        return np.zeros(4)


def compute_behavior_features(events: List[Dict[str, Any]]) -> np.ndarray:
    """
    Compute behavior features from raw events

    Args:
        events: List of event dictionaries

    Returns:
        Feature vector: [exploration_ratio, focus_ratio, stuck_ratio, hint_count,
                        avg_loop_efficiency, undo_rate, pause_frequency]
    """
    try:
        if not events:
            return np.zeros(7)

        # Divide session into segments (exploration, focus, stuck)
        # Based on event density and change patterns
        if len(events) < 3:
            segment_length = 1
        else:
            segment_length = max(3, len(events) // 10)  # Divide into ~10 segments

        exploration_count = 0
        focus_count = 0
        stuck_count = 0

        for i in range(0, len(events), segment_length):
            segment = events[i:i + segment_length]
            changes = sum(1 for e in segment if e.get('event') == 'code_change')
            executions = sum(1 for e in segment if e.get('event') == 'execution')
            undos = sum(1 for e in segment if e.get('is_undo'))

            if changes > executions * 2:
                # Many changes, few executions = exploration
                exploration_count += 1
            elif executions > 0 and undos == 0:
                # Executions without undos = focus
                focus_count += 1
            elif undos > 0 and executions == 0:
                # Undos without progress = stuck
                stuck_count += 1

        num_segments = (len(events) + segment_length - 1) // segment_length
        exploration_ratio = exploration_count / max(num_segments, 1)
        focus_ratio = focus_count / max(num_segments, 1)
        stuck_ratio = stuck_count / max(num_segments, 1)

        # Feature: Hint count
        hint_count = sum(1 for e in events if e.get('type') == 'hint_use' or
                        (e.get('event') == 'behavior' and e.get('type') == 'hint_use'))

        # Feature: Avg loop efficiency
        # Successful executions / total executions
        total_executions = sum(1 for e in events if e.get('event') == 'execution')
        success_executions = sum(1 for e in events if e.get('event') == 'execution' and e.get('result') == 'success')
        avg_loop_efficiency = success_executions / max(total_executions, 1)

        # Feature: Undo rate
        total_changes = sum(1 for e in events if e.get('event') == 'code_change')
        undo_rate = sum(1 for e in events if e.get('is_undo')) / max(total_changes, 1)

        # Feature: Pause frequency
        # Pauses > 30s per session duration
        pause_count = sum(1 for e in events if e.get('event') == 'behavior' and e.get('type') == 'pause')
        pause_durations = [e.get('duration_ms', 0) for e in events if e.get('event') == 'behavior' and e.get('type') == 'pause']
        long_pause_count = sum(1 for d in pause_durations if d > 30000)  # > 30s

        total_duration_ms = 0
        if events:
            first_ts = _parse_timestamp(events[0].get('timestamp', 0))
            last_ts = _parse_timestamp(events[-1].get('timestamp', 0))
            total_duration_ms = (last_ts - first_ts) if last_ts >= first_ts else 0

        pause_frequency = long_pause_count / max(total_duration_ms / 60000, 1) if total_duration_ms > 0 else 0.0

        features = np.array([
            exploration_ratio,
            focus_ratio,
            stuck_ratio,
            float(hint_count),
            avg_loop_efficiency,
            undo_rate,
            pause_frequency
        ], dtype=np.float32)

        logger.debug(f"Computed behavior features: exploration={exploration_ratio:.3f}, "
                    f"focus={focus_ratio:.3f}, stuck={stuck_ratio:.3f}, "
                    f"efficiency={avg_loop_efficiency:.3f}")

        return features

    except Exception as e:
        logger.error(f"Error computing behavior features: {e}")
        return np.zeros(7)


def compute_session_vector(events: List[Dict[str, Any]]) -> np.ndarray:
    """
    Compute comprehensive session vector (20 features) for risk detection

    Args:
        events: List of event dictionaries

    Returns:
        Feature vector of 20 features
    """
    try:
        if not events:
            return np.zeros(20)

        # Get bug features (4) and behavior features (7)
        bug_features = compute_bug_features(events)
        behavior_features = compute_behavior_features(events)

        # Additional features (9 more)
        total_events = len(events)

        # Unique functions modified
        unique_functions = set()
        for e in events:
            if e.get('event') == 'structure_change':
                affected = e.get('affected_symbols', [])
                unique_functions.update(affected)
        unique_functions_modified = len(unique_functions)

        # Avg edit size
        edit_sizes = [abs(e.get('char_count_delta', 0)) for e in events if e.get('event') == 'code_change']
        avg_edit_size = np.mean(edit_sizes) if edit_sizes else 0.0

        # Max consecutive errors
        max_consecutive_errors = 0
        current_consecutive = 0
        for e in events:
            if e.get('event') == 'execution' and e.get('result') in ['runtime_error', 'syntax_error']:
                current_consecutive += 1
                max_consecutive_errors = max(max_consecutive_errors, current_consecutive)
            else:
                current_consecutive = 0

        # Test pass rate
        test_events = [e for e in events if e.get('event') == 'test_result']
        test_pass_rate = sum(1 for e in test_events if e.get('result') == 'pass') / max(len(test_events), 1)

        # Total duration (minutes)
        if events:
            first_ts = _parse_timestamp(events[0].get('timestamp', 0))
            last_ts = _parse_timestamp(events[-1].get('timestamp', 0))
            total_duration_min = (last_ts - first_ts) / 60 if last_ts >= first_ts else 0
        else:
            total_duration_min = 0

        # Code growth rate
        insert_chars = sum(e.get('char_count_delta', 0) for e in events
                          if e.get('event') == 'code_change' and e.get('char_count_delta', 0) > 0)
        delete_chars = abs(sum(e.get('char_count_delta', 0) for e in events
                              if e.get('event') == 'code_change' and e.get('char_count_delta', 0) < 0))
        code_growth_rate = (insert_chars - delete_chars) / max(insert_chars, 1) if insert_chars > 0 else 0

        # Final code complexity (normalized by lines of code)
        final_complexity = _estimate_complexity(events[-1]) if events else 0

        # Error diversity
        error_types = set()
        for e in events:
            if e.get('event') == 'execution' and e.get('error_type'):
                error_types.add(e.get('error_type'))
        error_diversity = len(error_types)

        # Combine all features
        additional_features = np.array([
            total_events,
            float(unique_functions_modified),
            avg_edit_size,
            float(max_consecutive_errors),
            test_pass_rate,
            total_duration_min,
            code_growth_rate,
            final_complexity,
            float(error_diversity)
        ], dtype=np.float32)

        # Concatenate all features
        session_vector = np.concatenate([bug_features, behavior_features, additional_features])

        # Normalize to unit vector
        norm = np.linalg.norm(session_vector)
        if norm > 0:
            session_vector = session_vector / norm

        return session_vector

    except Exception as e:
        logger.error(f"Error computing session vector: {e}")
        return np.zeros(20)


def _parse_timestamp(ts: Any) -> float:
    """Parse timestamp to float (milliseconds since epoch)"""
    try:
        if isinstance(ts, str):
            # Parse ISO 8601 datetime
            import datetime
            dt = datetime.datetime.fromisoformat(ts.replace('Z', '+00:00'))
            return dt.timestamp() * 1000
        elif isinstance(ts, (int, float)):
            return float(ts)
        else:
            return 0.0
    except:
        return 0.0


def _estimate_complexity(final_event: Dict[str, Any]) -> float:
    """Estimate code complexity from final event"""
    try:
        # Simple heuristic: estimate based on affected symbols and change density
        if final_event.get('event') == 'structure_change':
            affected = len(final_event.get('affected_symbols', []))
            complexity = min(affected / 10.0, 1.0)
            return complexity
        return 0.5
    except:
        return 0.5
