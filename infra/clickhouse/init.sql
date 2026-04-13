CREATE DATABASE IF NOT EXISTS devlens;

USE devlens;

CREATE TABLE IF NOT EXISTS code_change_events (
    session_id UUID,
    user_id UUID,
    quest_id UUID,
    ts DateTime64(3, 'UTC'),
    diff String,
    change_type Enum8(
        'insertion' = 1,
        'deletion' = 2,
        'modification' = 3,
        'replacement' = 4
    ),
    cursor_line UInt32,
    cursor_col UInt32,
    char_delta Int32,
    is_undo UInt8
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (session_id, ts)
TTL ts + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS execution_events (
    session_id UUID,
    user_id UUID,
    quest_id UUID,
    ts DateTime64(3, 'UTC'),
    code_snapshot_hash String,
    result Enum8(
        'success' = 1,
        'failure' = 2,
        'timeout' = 3,
        'error' = 4
    ),
    error_type Nullable(String),
    error_line Nullable(UInt32),
    duration_ms UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (session_id, ts)
TTL ts + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS test_result_events (
    session_id UUID,
    user_id UUID,
    quest_id UUID,
    ts DateTime64(3, 'UTC'),
    test_case_id String,
    result Enum8(
        'passed' = 1,
        'failed' = 2,
        'error' = 3,
        'skipped' = 4
    ),
    actual_output String,
    expected_output String,
    retry_count UInt16
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (session_id, ts)
TTL ts + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS behavior_events (
    session_id UUID,
    user_id UUID,
    quest_id UUID,
    ts DateTime64(3, 'UTC'),
    type Enum8(
        'focus_lost' = 1,
        'copy_paste' = 2,
        'code_hint_requested' = 3,
        'syntax_check' = 4,
        'debug_step' = 5,
        'test_run' = 6
    ),
    duration_ms UInt32,
    context_line Nullable(UInt32)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (session_id, ts)
TTL ts + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS structure_change_events (
    session_id UUID,
    user_id UUID,
    quest_id UUID,
    ts DateTime64(3, 'UTC'),
    ast_diff_added Array(String),
    ast_diff_removed Array(String),
    ast_diff_modified Array(String),
    affected_symbols Array(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (session_id, ts)
TTL ts + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS analysis_snapshots (
    session_id UUID,
    user_id UUID,
    quest_id UUID,
    ts DateTime64(3, 'UTC'),
    module Enum8(
        'code_change' = 1,
        'execution' = 2,
        'test_result' = 3,
        'behavior' = 4,
        'structure' = 5
    ),
    score Float32,
    details String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (session_id, ts);
