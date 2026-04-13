-- Enable pgvector and uuid-ossp extensions
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id BIGINT UNIQUE,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(2048),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_username ON users(username);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(512) NOT NULL,
    description TEXT,
    difficulty INT CHECK (difficulty >= 1 AND difficulty <= 5),
    starter_code TEXT,
    time_limit_min INT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quests_slug ON quests(slug);
CREATE INDEX idx_quests_difficulty ON quests(difficulty);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    quest_id UUID NOT NULL REFERENCES quests(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
    final_code TEXT,
    health_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_quest_id ON sessions(quest_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- Analysis summaries table
CREATE TABLE IF NOT EXISTS analysis_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL UNIQUE REFERENCES sessions(id),
    code_change_score FLOAT NOT NULL,
    execution_score FLOAT NOT NULL,
    test_result_score FLOAT NOT NULL,
    behavior_score FLOAT NOT NULL,
    structure_score FLOAT NOT NULL,
    health_score FLOAT NOT NULL,
    developer_type VARCHAR(100),
    loop_efficiency FLOAT,
    total_events INT,
    report_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_summaries_session_id ON analysis_summaries(session_id);
CREATE INDEX idx_analysis_summaries_created_at ON analysis_summaries(created_at);

-- Code embeddings table with vector index
CREATE TABLE IF NOT EXISTS code_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quest_id UUID NOT NULL REFERENCES quests(id),
    label VARCHAR(100) NOT NULL CHECK (label IN ('correct', 'incorrect', 'partial')),
    code_snippet TEXT NOT NULL,
    description TEXT,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_code_embeddings_quest_id ON code_embeddings(quest_id);
CREATE INDEX idx_code_embeddings_embedding ON code_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Failure patterns table with vector index
CREATE TABLE IF NOT EXISTS failure_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id),
    quest_id UUID NOT NULL REFERENCES quests(id),
    feature_vector vector(20) NOT NULL,
    failure_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_failure_patterns_session_id ON failure_patterns(session_id);
CREATE INDEX idx_failure_patterns_quest_id ON failure_patterns(quest_id);
CREATE INDEX idx_failure_patterns_feature_vector ON failure_patterns USING ivfflat (feature_vector vector_l2_ops);
