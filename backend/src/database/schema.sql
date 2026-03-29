-- ============================================================
-- WorkNear Database Schema (PostgreSQL 15)
-- Optimized for scale: INDEX IF NOT EXISTSes, partitioning, UUID primary keys
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";       -- for geospatial queries
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- for text search

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- CREATE TYPE user_role AS ENUM ('worker', 'employer', 'admin');
-- CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
-- CREATE TYPE job_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed');
-- CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
-- CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
-- CREATE TYPE payment_method AS ENUM ('upi', 'card', 'netbanking', 'wallet', 'cash');
-- CREATE TYPE notification_type AS ENUM ('job_posted', 'booking_request', 'booking_accepted', 'booking_rejected', 'job_started', 'job_completed', 'payment_received', 'review_received');


DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('worker', 'employer', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('upi', 'card', 'netbanking', 'wallet', 'cash');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'job_posted', 'booking_request', 'booking_accepted',
        'booking_rejected', 'job_started', 'job_completed',
        'payment_received', 'review_received'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ============================================================
-- USERS TABLE 
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(15) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE,
    full_name       VARCHAR(100) NOT NULL,
    profile_photo   TEXT,
    role            user_role NOT NULL DEFAULT 'worker',
    status          user_status NOT NULL DEFAULT 'pending_verification',
    date_of_birth   DATE,
    gender          VARCHAR(10),
    aadhaar_number  VARCHAR(12),                       -- masked in API
    is_verified     BOOLEAN DEFAULT FALSE,
    rating          DECIMAL(3,2) DEFAULT 0.00,
    total_reviews   INTEGER DEFAULT 0,
    total_earnings  DECIMAL(12,2) DEFAULT 0.00,        -- for workers
    total_spent     DECIMAL(12,2) DEFAULT 0.00,        -- for employers
    language        VARCHAR(10) DEFAULT 'hi',
    fcm_token       TEXT,                               -- Firebase push token
    last_seen       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC);

-- ============================================================
-- WORKER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio                 TEXT,
    experience_years    SMALLINT DEFAULT 0,
    hourly_rate         DECIMAL(8,2),
    daily_rate          DECIMAL(8,2),
    is_available        BOOLEAN DEFAULT TRUE,
    availability_radius INTEGER DEFAULT 10,            -- km radius
    current_location    GEOGRAPHY(POINT, 4326),        -- PostGIS point
    last_location_update TIMESTAMPTZ,
    bank_account_number VARCHAR(20),                   -- encrypted
    bank_ifsc           VARCHAR(11),
    upi_id              VARCHAR(100),
    documents_verified  BOOLEAN DEFAULT FALSE,
    background_checked  BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_location ON worker_profiles USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_worker_user_id ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_available ON worker_profiles(is_available) WHERE is_available = TRUE;

-- ============================================================
-- SKILL CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    name_hi     VARCHAR(100),                          -- Hindi name
    icon_url    TEXT,
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    sort_order  SMALLINT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, name_hi, sort_order) VALUES
    ('Plumber', 'प्लंबर', 1),
    ('Electrician', 'इलेक्ट्रीशियन', 2),
    ('Carpenter', 'बढ़ई', 3),
    ('Painter', 'पेंटर', 4),
    ('Cleaner', 'सफाईकर्मी', 5),
    ('Driver', 'ड्राइवर', 6),
    ('Cook', 'रसोइया', 7),
    ('Security Guard', 'सुरक्षा गार्ड', 8),
    ('Gardener', 'माली', 9),
    ('Mason', 'राजमिस्त्री', 10),
    ('Welder', 'वेल्डर', 11),
    ('AC Technician', 'एसी तकनीशियन', 12),
    ('Helper / Labour', 'हेल्पर / मजदूर', 13),
    ('Delivery Person', 'डिलीवरी', 14),
    ('Other', 'अन्य', 99);

-- ============================================================
-- WORKER SKILLS (many-to-many)
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_skills (
    worker_id   UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    is_primary  BOOLEAN DEFAULT FALSE,
    verified    BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (worker_id, category_id)
);

-- ============================================================
-- ADDRESSES
-- ============================================================

CREATE TABLE IF NOT EXISTS addresses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(50),                           -- Home, Work, Site etc.
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city        VARCHAR(100),
    state       VARCHAR(100),
    pincode     VARCHAR(10),
    landmark    TEXT,
    location    GEOGRAPHY(POINT, 4326),
    is_default  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_location ON addresses USING GIST(location);

-- ============================================================
-- JOBS TABLE IF NOT EXISTS (partitioned by created_at for scale)
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
    id              UUID DEFAULT uuid_generate_v4(),
    employer_id     UUID NOT NULL REFERENCES users(id),
    category_id     UUID NOT NULL REFERENCES categories(id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    address_text    TEXT NOT NULL,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    budget_min      DECIMAL(10,2),
    budget_max      DECIMAL(10,2),
    duration_hours  DECIMAL(5,2),
    is_urgent       BOOLEAN DEFAULT FALSE,
    workers_needed  SMALLINT DEFAULT 1,
    workers_hired   SMALLINT DEFAULT 0,
    scheduled_at    TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    status          job_status DEFAULT 'open',
    photos          TEXT[],                            -- array of image URLs
    requirements    TEXT[],
    views_count     INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions (create for 2024-2026)
CREATE TABLE IF NOT EXISTS jobs_2024_q1 PARTITION OF jobs FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS jobs_2024_q2 PARTITION OF jobs FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS jobs_2024_q3 PARTITION OF jobs FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS jobs_2024_q4 PARTITION OF jobs FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS jobs_2025_q1 PARTITION OF jobs FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS jobs_2025_q2 PARTITION OF jobs FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS jobs_2025_q3 PARTITION OF jobs FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS jobs_2025_q4 PARTITION OF jobs FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS jobs_2026_q1 PARTITION OF jobs FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS jobs_future    PARTITION OF jobs FOR VALUES FROM ('2026-04-01') TO (MAXVALUE);

CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_urgent ON jobs(is_urgent) WHERE is_urgent = TRUE;

-- ============================================================
-- BOOKINGS (Job Applications)
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL,
    job_created_at  TIMESTAMPTZ NOT NULL,
    worker_id       UUID NOT NULL REFERENCES users(id),
    employer_id     UUID NOT NULL REFERENCES users(id),
    status          booking_status DEFAULT 'pending',
    proposed_rate   DECIMAL(10,2),
    message         TEXT,
    otp             VARCHAR(6),                        -- job start OTP
    otp_verified    BOOLEAN DEFAULT FALSE,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    worker_notes    TEXT,
    employer_notes  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (job_id, job_created_at) REFERENCES jobs(id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_bookings_job ON bookings(job_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON bookings(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_employer ON bookings(employer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, created_at DESC);

-- ============================================================
-- REAL-TIME LOCATION TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS location_tracking (
    id          BIGSERIAL,
    booking_id  UUID NOT NULL REFERENCES bookings(id),
    worker_id   UUID NOT NULL REFERENCES users(id),
    location    GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy    DECIMAL(6,2),
    speed       DECIMAL(6,2),
    heading     DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Retain only 30 days of raw tracking, archive to cold storage
CREATE TABLE IF NOT EXISTS location_tracking_current PARTITION OF location_tracking
    FOR VALUES FROM (NOW() - INTERVAL '30 days') TO (MAXVALUE);

CREATE INDEX IF NOT EXISTS idx_tracking_booking ON location_tracking(booking_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_worker ON location_tracking(worker_id, recorded_at DESC);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id          UUID NOT NULL REFERENCES bookings(id),
    payer_id            UUID NOT NULL REFERENCES users(id),      -- employer
    payee_id            UUID NOT NULL REFERENCES users(id),      -- worker
    amount              DECIMAL(12,2) NOT NULL,
    platform_fee        DECIMAL(10,2) DEFAULT 0,                  -- 10-15%
    gst                 DECIMAL(10,2) DEFAULT 0,
    worker_payout       DECIMAL(12,2),
    currency            VARCHAR(3) DEFAULT 'INR',
    method              payment_method,
    status              payment_status DEFAULT 'pending',
    gateway             VARCHAR(50),                               -- razorpay/stripe
    gateway_order_id    VARCHAR(200),
    gateway_payment_id  VARCHAR(200),
    gateway_signature   TEXT,
    failure_reason      TEXT,
    refund_id           VARCHAR(200),
    refund_amount       DECIMAL(12,2),
    refunded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON payments(gateway_order_id);

-- ============================================================
-- WALLET (for workers)
-- ============================================================

CREATE TABLE IF NOT EXISTS wallets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID UNIQUE NOT NULL REFERENCES users(id),
    balance     DECIMAL(12,2) DEFAULT 0.00,
    locked      DECIMAL(12,2) DEFAULT 0.00,            -- pending payouts
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id          BIGSERIAL PRIMARY KEY,
    wallet_id   UUID NOT NULL REFERENCES wallets(id),
    amount      DECIMAL(12,2) NOT NULL,
    type        VARCHAR(20) NOT NULL,                   -- credit/debit/payout
    reference   TEXT,
    balance_after DECIMAL(12,2),
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, created_at DESC);

-- ============================================================
-- REVIEWS & RATINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID UNIQUE NOT NULL REFERENCES bookings(id),
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    reviewee_id     UUID NOT NULL REFERENCES users(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    photos          TEXT[],
    is_public       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL,
    user_id     UUID NOT NULL REFERENCES users(id),
    type        notification_type NOT NULL,
    title       VARCHAR(200),
    body        TEXT,
    data        JSONB,
    is_read     BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, sent_at)
) PARTITION BY RANGE (sent_at);

CREATE TABLE IF NOT EXISTS notifications_current PARTITION OF notifications
    FOR VALUES FROM (NOW() - INTERVAL '90 days') TO (MAXVALUE);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, sent_at DESC);

-- ============================================================
-- OTP VERIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS otp_verifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone       VARCHAR(15) NOT NULL,
    otp         VARCHAR(6) NOT NULL,
    purpose     VARCHAR(50),                            -- login, register, job_start
    attempts    SMALLINT DEFAULT 0,
    verified    BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone, expires_at);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGSERIAL,
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   TEXT,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS audit_logs_current PARTITION OF audit_logs
    FOR VALUES FROM (NOW() - INTERVAL '6 months') TO (MAXVALUE);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update user rating after review
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET
        rating = (SELECT AVG(rating) FROM reviews WHERE reviewee_id = NEW.reviewee_id),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id)
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Nearby workers function (uses PostGIS)
CREATE OR REPLACE FUNCTION get_nearby_workers(
    lat DECIMAL, lng DECIMAL, radius_km INTEGER DEFAULT 10, category UUID DEFAULT NULL
)
RETURNS TABLE (
    worker_id UUID, user_id UUID, full_name TEXT, rating DECIMAL,
    distance_km DECIMAL, hourly_rate DECIMAL, profile_photo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT wp.id, u.id, u.full_name, u.rating,
        (ST_Distance(wp.current_location::geography,
            ST_MakePoint(lng, lat)::geography) / 1000)::DECIMAL as dist_km,
        wp.hourly_rate, u.profile_photo
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    WHERE wp.is_available = TRUE
      AND u.status = 'active'
      AND ST_DWithin(wp.current_location::geography, ST_MakePoint(lng, lat)::geography, radius_km * 1000)
      AND (category IS NULL OR EXISTS (
          SELECT 1 FROM worker_skills ws WHERE ws.worker_id = wp.id AND ws.category_id = category
      ))
    ORDER BY dist_km ASC, u.rating DESC;
END;
$$ LANGUAGE plpgsql;