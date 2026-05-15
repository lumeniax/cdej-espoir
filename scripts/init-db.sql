-- CDEJ Espoir TG0154 — Initialisation PostgreSQL
-- Ce script est exécuté automatiquement au premier démarrage du conteneur Docker

-- Extension UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Paramètres de performance
ALTER SYSTEM SET max_connections = '100';
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '4MB';
ALTER SYSTEM SET default_statistics_target = '100';

SELECT pg_reload_conf();
