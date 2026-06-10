-- Migration: 001_initial
-- 4EVRcustoms - Initial schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM (
  'SUPER_ADMIN', 'WORKSHOP_ADMIN', 'TECHNICIAN', 'CLIENT'
);

CREATE TYPE "AppointmentStatus" AS ENUM (
  'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
);

CREATE TYPE "WorkOrderStatus" AS ENUM (
  'RECEIVED', 'DIAGNOSIS', 'AWAITING_AUTH', 'IN_REPAIR',
  'FINAL_TESTING', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'
);

CREATE TYPE "QuoteStatus" AS ENUM (
  'DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'
);

CREATE TYPE "NotificationType" AS ENUM (
  'APPOINTMENT_REMINDER', 'STATUS_UPDATE', 'QUOTE_READY',
  'SERVICE_COMPLETE', 'MAINTENANCE_REMINDER', 'CUSTOM'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING', 'PARTIAL', 'PAID', 'REFUNDED'
);

CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- ─── workshops ────────────────────────────────────────────────────────────────

CREATE TABLE workshops (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  phone      VARCHAR(20) NOT NULL,
  email      VARCHAR(255),
  address    TEXT,
  city       VARCHAR(100),
  state      VARCHAR(100),
  zip_code   VARCHAR(20),
  country    VARCHAR(10) NOT NULL DEFAULT 'MX',
  logo_url   TEXT,
  timezone   VARCHAR(50) NOT NULL DEFAULT 'America/Mexico_City',
  tax_id     VARCHAR(50),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workshops_slug ON workshops(slug);

-- ─── users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         VARCHAR(20) NOT NULL UNIQUE,
  email         VARCHAR(255) UNIQUE,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  fcm_token     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- ─── workshop_users ───────────────────────────────────────────────────────────

CREATE TABLE workshop_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        "UserRole" NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workshop_id, user_id)
);

CREATE INDEX idx_workshop_users_workshop ON workshop_users(workshop_id);
CREATE INDEX idx_workshop_users_user ON workshop_users(user_id);

-- ─── otp_codes ────────────────────────────────────────────────────────────────

CREATE TABLE otp_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      VARCHAR(20) NOT NULL,
  code       VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  attempts   SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- ─── customers ────────────────────────────────────────────────────────────────

CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20) NOT NULL,
  email       VARCHAR(255),
  address     TEXT,
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workshop_id, phone)
);

CREATE INDEX idx_customers_workshop ON customers(workshop_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers USING gin(
  (first_name || ' ' || last_name) gin_trgm_ops
);

-- ─── vehicles ─────────────────────────────────────────────────────────────────

CREATE TABLE vehicles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id   UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  make          VARCHAR(100) NOT NULL,
  model         VARCHAR(100) NOT NULL,
  year          SMALLINT NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  vin           VARCHAR(17),
  license_plate VARCHAR(20),
  color         VARCHAR(50),
  engine_type   VARCHAR(100),
  mileage       INTEGER CHECK (mileage >= 0),
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_workshop ON vehicles(workshop_id);
CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate) WHERE license_plate IS NOT NULL;
CREATE INDEX idx_vehicles_vin ON vehicles(vin) WHERE vin IS NOT NULL;

-- ─── appointments ─────────────────────────────────────────────────────────────

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id     UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration        SMALLINT NOT NULL DEFAULT 60 CHECK (duration > 0),
  service_type    VARCHAR(200) NOT NULL,
  notes           TEXT,
  status          "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
  assigned_to_id  UUID REFERENCES workshop_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_workshop ON appointments(workshop_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_vehicle ON appointments(vehicle_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ─── work_orders ──────────────────────────────────────────────────────────────

CREATE TABLE work_orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id      UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
  appointment_id   UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
  order_number     VARCHAR(50) NOT NULL,
  status           "WorkOrderStatus" NOT NULL DEFAULT 'RECEIVED',
  description      TEXT,
  diagnosis        TEXT,
  technician_notes TEXT,
  technician_id    UUID REFERENCES workshop_users(id) ON DELETE SET NULL,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_ready  TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  mileage_in       INTEGER CHECK (mileage_in >= 0),
  mileage_out      INTEGER CHECK (mileage_out >= 0),
  payment_status   "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workshop_id, order_number)
);

CREATE INDEX idx_work_orders_workshop ON work_orders(workshop_id);
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_received ON work_orders(received_at);

-- ─── quotes ───────────────────────────────────────────────────────────────────

CREATE TABLE quotes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id      UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id),
  work_order_id    UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  quote_number     VARCHAR(50) NOT NULL,
  status           "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  valid_until      TIMESTAMPTZ,
  notes            TEXT,
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax              NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workshop_id, quote_number)
);

CREATE INDEX idx_quotes_workshop ON quotes(workshop_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_work_order ON quotes(work_order_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- ─── quote_items ──────────────────────────────────────────────────────────────

CREATE TABLE quote_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  part_id     UUID,
  quantity    NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total       NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  is_labor    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- ─── photos ───────────────────────────────────────────────────────────────────

CREATE TABLE photos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id    UUID NOT NULL,
  work_order_id  UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  thumbnail_url  TEXT,
  caption        VARCHAR(500),
  uploaded_by_id UUID NOT NULL,
  taken_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_work_order ON photos(work_order_id);
CREATE INDEX idx_photos_workshop ON photos(workshop_id);

-- ─── parts ────────────────────────────────────────────────────────────────────

CREATE TABLE parts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  sku         VARCHAR(100),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  brand       VARCHAR(100),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workshop_id, sku)
);

CREATE INDEX idx_parts_workshop ON parts(workshop_id);
CREATE INDEX idx_parts_name ON parts USING gin(name gin_trgm_ops);

-- ─── inventory ────────────────────────────────────────────────────────────────

CREATE TABLE inventory (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id  UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  part_id      UUID NOT NULL UNIQUE REFERENCES parts(id) ON DELETE CASCADE,
  quantity     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  location     VARCHAR(100),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_workshop ON inventory(workshop_id);

-- ─── inventory_movements ──────────────────────────────────────────────────────

CREATE TABLE inventory_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  type         "MovementType" NOT NULL,
  quantity     NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  reason       VARCHAR(500),
  reference    VARCHAR(200),
  performed_by UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_inv_movements_created ON inventory_movements(created_at);

-- ─── work_order_parts ─────────────────────────────────────────────────────────

CREATE TABLE work_order_parts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id       UUID NOT NULL REFERENCES parts(id),
  quantity      NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total         NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_order_parts_order ON work_order_parts(work_order_id);

-- ─── service_history ──────────────────────────────────────────────────────────

CREATE TABLE service_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id    UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  vehicle_id     UUID NOT NULL REFERENCES vehicles(id),
  work_order_id  UUID NOT NULL REFERENCES work_orders(id),
  service_date   TIMESTAMPTZ NOT NULL,
  description    TEXT NOT NULL,
  mileage        INTEGER CHECK (mileage >= 0),
  technician_id  UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_history_workshop ON service_history(workshop_id);
CREATE INDEX idx_service_history_vehicle ON service_history(vehicle_id);
CREATE INDEX idx_service_history_date ON service_history(service_date);

-- ─── notifications ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type        "NotificationType" NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_customer ON notifications(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_notifications_workshop ON notifications(workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ─── audit_logs ───────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(20) NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE')),
  entity      VARCHAR(100) NOT NULL,
  entity_id   UUID NOT NULL,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_workshop ON audit_logs(workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX idx_audit_user ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workshops','users','workshop_users','customers','vehicles',
    'appointments','work_orders','quotes','parts','inventory'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
