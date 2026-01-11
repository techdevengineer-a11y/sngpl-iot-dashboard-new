-- Performance Optimization Indexes for SNGPL IoT Dashboard
-- Run this script to add indexes that optimize N+1 queries and common lookups
-- Expected impact: 5-10x faster queries on large datasets

-- 1. DeviceReading indexes
-- Index for latest reading queries (used in dashboard and sections)
CREATE INDEX IF NOT EXISTS idx_device_reading_device_timestamp
ON device_reading(device_id, timestamp DESC);

-- Index for timestamp-based queries (recent readings)
CREATE INDEX IF NOT EXISTS idx_device_reading_timestamp
ON device_reading(timestamp DESC);

-- Composite index for device + timestamp lookups
CREATE INDEX IF NOT EXISTS idx_device_reading_lookup
ON device_reading(device_id, timestamp DESC, total_volume_flow);

-- 2. Device indexes
-- Index for client_id pattern matching (SMS-I-%, SMS-II-%, etc.)
CREATE INDEX IF NOT EXISTS idx_device_client_id_pattern
ON device(client_id varchar_pattern_ops);

-- Index for active device queries
CREATE INDEX IF NOT EXISTS idx_device_active_lastseen
ON device(is_active, last_seen DESC);

-- Index for last_seen queries (online status checks)
CREATE INDEX IF NOT EXISTS idx_device_last_seen
ON device(last_seen DESC) WHERE last_seen IS NOT NULL;

-- 3. Alarm indexes
-- Index for unacknowledged alarms per device
CREATE INDEX IF NOT EXISTS idx_alarm_device_acknowledged
ON alarm(device_id, is_acknowledged) WHERE is_acknowledged = false;

-- Index for recent alarms (timeline)
CREATE INDEX IF NOT EXISTS idx_alarm_triggered_at
ON alarm(triggered_at DESC);

-- Composite index for alarm queries
CREATE INDEX IF NOT EXISTS idx_alarm_device_triggered
ON alarm(device_id, triggered_at DESC, is_acknowledged);

-- 4. AlarmThreshold indexes
-- Index for device threshold lookups
CREATE INDEX IF NOT EXISTS idx_alarm_threshold_device_param
ON alarm_threshold(device_id, parameter);

-- 5. User indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_user_username
ON "user"(username);

-- Create statistics for better query planning
ANALYZE device;
ANALYZE device_reading;
ANALYZE alarm;
ANALYZE alarm_threshold;

-- Vacuum to reclaim space and update statistics
VACUUM ANALYZE device;
VACUUM ANALYZE device_reading;
VACUUM ANALYZE alarm;
VACUUM ANALYZE alarm_threshold;

-- Display index information
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
