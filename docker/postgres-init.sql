-- Postgres init script for harness store + checkpointer
-- Run automatically on first container start

-- Enable UUID extension (needed by LangGraph)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Store tables (LangGraph PostgresStore creates these, but we pre-create
-- to ensure proper permissions)
GRANT ALL PRIVILEGES ON DATABASE harness TO harness;

-- Connection pool settings (applied at connection time)
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = 256MB;
