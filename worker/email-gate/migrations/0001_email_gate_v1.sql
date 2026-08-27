CREATE TABLE email_gate_challenges (
  challenge_id TEXT PRIMARY KEY,
  normalized_email TEXT NOT NULL,
  state TEXT NOT NULL CHECK (
    state IN (
      'delivery_pending',
      'active',
      'verified',
      'expired',
      'superseded',
      'terminal_failed',
      'delivery_failed'
    )
  ),
  otp_key_version INTEGER NOT NULL CHECK (otp_key_version >= 1),
  provider_send_event_id TEXT NOT NULL UNIQUE,
  delivery_payload_version INTEGER NOT NULL CHECK (delivery_payload_version >= 1),
  provider_attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (
    provider_attempt_count BETWEEN 0 AND 3
  ),
  provider_attempt_lease_until INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  predecessor_challenge_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at = created_at + 600000),
  activated_at INTEGER,
  verified_at INTEGER,
  terminal_at INTEGER,
  last_provider_attempt_at INTEGER,
  reconciled_at INTEGER,
  reconciliation_version INTEGER CHECK (
    reconciliation_version IS NULL OR reconciliation_version >= 1
  ),
  deletion_eligible_at INTEGER,
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  FOREIGN KEY (predecessor_challenge_id)
    REFERENCES email_gate_challenges(challenge_id) ON DELETE SET NULL,
  CHECK (
    activated_at IS NULL OR
    (activated_at >= created_at AND activated_at < expires_at)
  ),
  CHECK (
    verified_at IS NULL OR
    (activated_at IS NOT NULL AND verified_at >= activated_at AND verified_at < expires_at)
  ),
  CHECK (
    terminal_at IS NULL OR
    (terminal_at >= created_at AND terminal_at <= expires_at)
  ),
  CHECK (
    deletion_eligible_at IS NULL OR
    (terminal_at IS NOT NULL AND deletion_eligible_at >= terminal_at AND
      deletion_eligible_at <= terminal_at + 604800000)
  ),
  CHECK (
    (reconciled_at IS NULL AND reconciliation_version IS NULL) OR
    (reconciled_at IS NOT NULL AND reconciliation_version IS NOT NULL AND
      terminal_at IS NOT NULL AND reconciled_at >= terminal_at)
  ),
  CHECK (
    (provider_attempt_count = 0 AND last_provider_attempt_at IS NULL) OR
    (provider_attempt_count BETWEEN 1 AND 3 AND last_provider_attempt_at IS NOT NULL)
  ),
  CHECK (
    last_provider_attempt_at IS NULL OR
    (last_provider_attempt_at >= created_at AND last_provider_attempt_at < expires_at)
  ),
  CHECK (
    provider_attempt_lease_until IS NULL OR
    (last_provider_attempt_at IS NOT NULL AND provider_attempt_lease_until > last_provider_attempt_at)
  ),
  CHECK (
    (state = 'delivery_pending' AND activated_at IS NULL AND verified_at IS NULL AND
      terminal_at IS NULL AND deletion_eligible_at IS NULL AND attempt_count = 0) OR
    (state = 'active' AND activated_at IS NOT NULL AND verified_at IS NULL AND
      terminal_at IS NULL AND deletion_eligible_at IS NULL AND attempt_count BETWEEN 0 AND 4 AND
      provider_attempt_count >= 1) OR
    (state = 'verified' AND activated_at IS NOT NULL AND verified_at IS NOT NULL AND
      terminal_at = verified_at AND deletion_eligible_at IS NOT NULL AND attempt_count BETWEEN 0 AND 4 AND
      provider_attempt_count >= 1) OR
    (state = 'expired' AND verified_at IS NULL AND terminal_at = expires_at AND
      deletion_eligible_at IS NOT NULL AND
      ((activated_at IS NULL AND attempt_count = 0) OR
       (activated_at IS NOT NULL AND attempt_count BETWEEN 0 AND 4))) OR
    (state = 'superseded' AND activated_at IS NOT NULL AND verified_at IS NULL AND
      terminal_at IS NOT NULL AND deletion_eligible_at IS NOT NULL AND attempt_count BETWEEN 0 AND 4 AND
      provider_attempt_count >= 1) OR
    (state = 'terminal_failed' AND activated_at IS NOT NULL AND verified_at IS NULL AND
      terminal_at IS NOT NULL AND deletion_eligible_at IS NOT NULL AND attempt_count = 5 AND
      provider_attempt_count >= 1) OR
    (state = 'delivery_failed' AND activated_at IS NULL AND verified_at IS NULL AND
      terminal_at IS NOT NULL AND deletion_eligible_at IS NOT NULL AND attempt_count = 0 AND
      provider_attempt_count >= 1)
  )
);

CREATE UNIQUE INDEX email_gate_challenges_one_active_per_email
  ON email_gate_challenges(normalized_email)
  WHERE state = 'active';

CREATE UNIQUE INDEX email_gate_challenges_one_pending_per_email
  ON email_gate_challenges(normalized_email)
  WHERE state = 'delivery_pending';

CREATE INDEX email_gate_challenges_email_created
  ON email_gate_challenges(normalized_email, created_at);

CREATE INDEX email_gate_challenges_state_expiry
  ON email_gate_challenges(state, expires_at);

CREATE INDEX email_gate_challenges_reconciliation_due
  ON email_gate_challenges(reconciled_at, terminal_at)
  WHERE terminal_at IS NOT NULL;

CREATE INDEX email_gate_challenges_deletion_due
  ON email_gate_challenges(deletion_eligible_at)
  WHERE reconciled_at IS NOT NULL AND deletion_eligible_at IS NOT NULL;

CREATE TABLE email_gate_send_reservations (
  provider_send_event_id TEXT PRIMARY KEY,
  reserved_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at = reserved_at + 86400000)
);

CREATE INDEX email_gate_send_reservations_expiry
  ON email_gate_send_reservations(expires_at);

CREATE TABLE email_gate_daily_aggregates (
  aggregate_date TEXT NOT NULL,
  aggregate_schema_version INTEGER NOT NULL CHECK (aggregate_schema_version >= 1),
  reconciliation_algorithm_version INTEGER NOT NULL CHECK (
    reconciliation_algorithm_version >= 1
  ),
  challenges_issued INTEGER NOT NULL DEFAULT 0 CHECK (challenges_issued >= 0),
  verification_successes INTEGER NOT NULL DEFAULT 0 CHECK (
    verification_successes >= 0
  ),
  verification_invalid_attempts INTEGER NOT NULL DEFAULT 0 CHECK (
    verification_invalid_attempts >= 0
  ),
  verification_locked INTEGER NOT NULL DEFAULT 0 CHECK (
    verification_locked >= 0
  ),
  verification_expired INTEGER NOT NULL DEFAULT 0 CHECK (
    verification_expired >= 0
  ),
  delivery_failures INTEGER NOT NULL DEFAULT 0 CHECK (delivery_failures >= 0),
  PRIMARY KEY (
    aggregate_date,
    aggregate_schema_version,
    reconciliation_algorithm_version
  )
);
