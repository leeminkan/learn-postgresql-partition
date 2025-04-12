-- Create the main partitioned table (parent)
CREATE TABLE IF NOT EXISTS "event_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "event_type" varchar(50) NOT NULL,
    "payload" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id, created_at) 
) PARTITION BY RANGE (created_at); -- Define partitioning strategy

-- Create indexes (Primary key index is created automatically)
-- Indexing the partition key separately is still often beneficial for range scans
CREATE INDEX IF NOT EXISTS event_logs_created_at_idx ON event_logs (created_at);
CREATE INDEX IF NOT EXISTS event_logs_event_type_idx ON event_logs (event_type);

-- Create the first partitions (e.g., from April 2025)
-- Let's assume today is 2025-04-12, so we create these partition
CREATE TABLE IF NOT EXISTS event_logs_y2025m01 PARTITION OF event_logs
    FOR VALUES FROM ('2025-01-01 00:00:00+07') TO ('2025-02-01 00:00:00+07');
CREATE TABLE IF NOT EXISTS event_logs_y2025m02 PARTITION OF event_logs
    FOR VALUES FROM ('2025-02-01 00:00:00+07') TO ('2025-03-01 00:00:00+07');
CREATE TABLE IF NOT EXISTS event_logs_y2025m03 PARTITION OF event_logs
    FOR VALUES FROM ('2025-03-01 00:00:00+07') TO ('2025-04-01 00:00:00+07');
CREATE TABLE IF NOT EXISTS event_logs_y2025m04 PARTITION OF event_logs
    FOR VALUES FROM ('2025-04-01 00:00:00+07') TO ('2025-05-01 00:00:00+07');

-- Optional: Create next month's partition proactively
-- CREATE TABLE IF NOT EXISTS event_logs_y2025m05 PARTITION OF event_logs
--     FOR VALUES FROM ('2025-05-01 00:00:00+07') TO ('2025-06-01 00:00:00+07');