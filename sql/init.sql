-- Database initialization schema
SELECT 'CREATE DATABASE neuronex_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'neuronex_db')\gexec
\c neuronex_db;

-- Enable vector extensions
CREATE EXTENSION IF NOT EXISTS vector;