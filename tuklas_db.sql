CREATE DATABASE IF NOT EXISTS tuklas_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE tuklas_db;

-- ------------------------------------------------------------
-- 1. USERS
--    Stores students and admin accounts.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100)  NOT NULL,
    id_number    VARCHAR(20)   NOT NULL UNIQUE,   -- e.g. 2021-00001
    email        VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,           -- bcrypt hash
    role         ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin (password = admin123 — change in production!)
INSERT INTO users (name, id_number, email, password_hash, role)
VALUES (
    'Admin',
    '0000-00000',
    'admin@tuklas.edu.ph',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
    'admin'
);

-- ------------------------------------------------------------
-- 2. ITEMS
--    Lost & found items registered by admin.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    registered_by   INT          NOT NULL,
    item_name       VARCHAR(150) NOT NULL,
    founder         VARCHAR(100) NOT NULL,
    location        VARCHAR(200) NOT NULL,
    category        ENUM('Personal Items','Accessories','Electronics','Documents','Other')
                    NOT NULL DEFAULT 'Other',
    status          ENUM('Found','Claimed','Archived') NOT NULL DEFAULT 'Found',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. CLAIM REQUESTS
--    Submitted by students when they recognize their item.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_requests (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    item_id      INT          NOT NULL,
    user_id      INT          NOT NULL,
    contact_info VARCHAR(150) NOT NULL,
    description  TEXT         NOT NULL,
    status       ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id)  REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. ACTIVITY LOGS
--    Audit trail for admin actions.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    action     VARCHAR(100) NOT NULL,   -- e.g. 'REGISTER_ITEM', 'DELETE_ITEM'
    details    TEXT,                    -- human-readable description
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);