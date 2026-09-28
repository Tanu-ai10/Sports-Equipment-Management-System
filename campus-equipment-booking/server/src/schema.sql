-- ============================================================
-- CourtSide — Sports Equipment Booking System
-- PostgreSQL schema
-- ============================================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS equipment_status CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS booking_purpose CASCADE;
DROP TYPE IF EXISTS damage_status CASCADE;
DROP TYPE IF EXISTS fine_reason CASCADE;

CREATE TYPE user_role AS ENUM ('Student', 'Admin');
CREATE TYPE equipment_status AS ENUM ('Available', 'Limited', 'Unavailable', 'Maintenance');
CREATE TYPE booking_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Issued', 'Returned', 'Cancelled', 'Overdue');
CREATE TYPE booking_purpose AS ENUM ('Practice', 'Tournament', 'Event');
CREATE TYPE damage_status AS ENUM ('Under Review', 'Confirmed', 'Dismissed');
CREATE TYPE fine_reason AS ENUM ('Late Return', 'Damage', 'Lost Equipment');

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE Users (
  UserID        SERIAL PRIMARY KEY,
  Name          VARCHAR(120) NOT NULL,
  Email         VARCHAR(160) NOT NULL UNIQUE,
  PasswordHash  TEXT NOT NULL,
  Role          user_role NOT NULL DEFAULT 'Student',
  Department    VARCHAR(120),
  Phone         VARCHAR(20),
  EmailVerified BOOLEAN NOT NULL DEFAULT TRUE,
  CreatedAt     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Equipment
-- ------------------------------------------------------------
CREATE TABLE Equipment (
  EquipmentID       SERIAL PRIMARY KEY,
  Name              VARCHAR(120) NOT NULL,
  Sport             VARCHAR(60) NOT NULL,
  Image             TEXT,
  Description       TEXT,
  Quantity          INT NOT NULL DEFAULT 0 CHECK (Quantity >= 0),
  AvailableQuantity INT NOT NULL DEFAULT 0 CHECK (AvailableQuantity >= 0),
  Condition         VARCHAR(40) NOT NULL DEFAULT 'Good',
  Location          VARCHAR(120),
  Status            equipment_status NOT NULL DEFAULT 'Available',
  CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (AvailableQuantity <= Quantity)
);

-- ------------------------------------------------------------
-- Bookings
-- ------------------------------------------------------------
CREATE TABLE Bookings (
  BookingID    SERIAL PRIMARY KEY,
  UserID       INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
  EquipmentID  INT NOT NULL REFERENCES Equipment(EquipmentID) ON DELETE CASCADE,
  Date         DATE NOT NULL,
  TimeSlot     VARCHAR(40) NOT NULL,
  Quantity     INT NOT NULL DEFAULT 1 CHECK (Quantity > 0),
  Purpose      booking_purpose NOT NULL DEFAULT 'Practice',
  Status       booking_status NOT NULL DEFAULT 'Pending',
  IssuedAt     TIMESTAMPTZ,
  CreatedAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user ON Bookings(UserID);
CREATE INDEX idx_bookings_equipment ON Bookings(EquipmentID);
CREATE INDEX idx_bookings_status ON Bookings(Status);
CREATE INDEX idx_bookings_date ON Bookings(Date);

-- ------------------------------------------------------------
-- Returns
-- ------------------------------------------------------------
CREATE TABLE Returns (
  ReturnID           SERIAL PRIMARY KEY,
  BookingID          INT NOT NULL REFERENCES Bookings(BookingID) ON DELETE CASCADE,
  ReturnDate         DATE NOT NULL,
  EquipmentCondition VARCHAR(40) NOT NULL,
  CreatedAt          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- DamageReports
-- ------------------------------------------------------------
CREATE TABLE DamageReports (
  ReportID     SERIAL PRIMARY KEY,
  EquipmentID  INT NOT NULL REFERENCES Equipment(EquipmentID) ON DELETE CASCADE,
  UserID       INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
  BookingID    INT REFERENCES Bookings(BookingID) ON DELETE SET NULL,
  Description  TEXT NOT NULL,
  Image        TEXT,
  Status       damage_status NOT NULL DEFAULT 'Under Review',
  CreatedAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
CREATE TABLE Notifications (
  NotificationID SERIAL PRIMARY KEY,
  UserID         INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
  Message        TEXT NOT NULL,
  ReadStatus     BOOLEAN NOT NULL DEFAULT FALSE,
  CreatedAt      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON Notifications(UserID);

-- ------------------------------------------------------------
-- Fines  (supports the Fine Management feature / Admin "Fine Collection")
-- ------------------------------------------------------------
CREATE TABLE Fines (
  FineID      SERIAL PRIMARY KEY,
  BookingID   INT REFERENCES Bookings(BookingID) ON DELETE CASCADE,
  UserID      INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
  Reason      fine_reason NOT NULL,
  Amount      NUMERIC(10,2) NOT NULL CHECK (Amount >= 0),
  PaidStatus  BOOLEAN NOT NULL DEFAULT FALSE,
  CreatedAt   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fines_user ON Fines(UserID);
