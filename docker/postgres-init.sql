-- Postgres init script for harness store + checkpointer
-- Run automatically on first container start

-- Enable UUID extension (needed by LangGraph)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE harness TO harness;
