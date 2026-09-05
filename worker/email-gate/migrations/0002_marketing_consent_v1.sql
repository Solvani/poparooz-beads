CREATE TABLE marketing_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  canonical_email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'withdrawn')),
  consent_version TEXT NOT NULL,
  consent_version_sequence INTEGER NOT NULL
    CHECK (consent_version_sequence >= 1),
  consent_source_context TEXT NOT NULL,
  consent_timestamp INTEGER NOT NULL CHECK (consent_timestamp >= 0),
  withdrawn_timestamp INTEGER,
  retention_delete_after INTEGER,
  state_version INTEGER NOT NULL CHECK (state_version >= 1),
  last_transition_operation_key TEXT NOT NULL UNIQUE
    CHECK (
      length(last_transition_operation_key) = 64
      AND last_transition_operation_key NOT GLOB '*[^0-9a-f]*'
    ),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0),
  CHECK (updated_at >= created_at),
  CHECK (
    consent_timestamp >= created_at
    AND consent_timestamp <= updated_at
  ),
  CHECK (
    (
      status = 'active'
      AND withdrawn_timestamp IS NULL
      AND retention_delete_after IS NULL
    )
    OR
    (
      status = 'withdrawn'
      AND withdrawn_timestamp IS NOT NULL
      AND withdrawn_timestamp >= consent_timestamp
      AND withdrawn_timestamp <= updated_at
      AND retention_delete_after =
        withdrawn_timestamp + 63072000000
    )
  )
);

CREATE TABLE marketing_consent_events (
  event_id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  subscription_state_version INTEGER NOT NULL
    CHECK (subscription_state_version >= 1),
  operation_key TEXT NOT NULL UNIQUE
    CHECK (
      length(operation_key) = 64
      AND operation_key NOT GLOB '*[^0-9a-f]*'
    ),
  event_type TEXT NOT NULL CHECK (event_type IN ('granted', 'withdrawn')),
  consent_version TEXT NOT NULL,
  consent_version_sequence INTEGER NOT NULL
    CHECK (consent_version_sequence >= 1),
  source_context TEXT NOT NULL,
  event_timestamp INTEGER NOT NULL CHECK (event_timestamp >= 0),
  FOREIGN KEY (subscription_id)
    REFERENCES marketing_subscriptions(subscription_id)
    ON DELETE CASCADE,
  UNIQUE (subscription_id, subscription_state_version)
);

CREATE INDEX marketing_consent_events_subscription_time
  ON marketing_consent_events(subscription_id, event_timestamp);

CREATE INDEX marketing_subscriptions_retention_due
  ON marketing_subscriptions(retention_delete_after)
  WHERE status = 'withdrawn'
    AND retention_delete_after IS NOT NULL;
