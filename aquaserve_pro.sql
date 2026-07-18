-- ============================================================
-- PureFlow Service Hub – AquaServe Pro
-- MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS aquaserve_pro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aquaserve_pro;

-- ============================================================
-- Table 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id               INT            NOT NULL AUTO_INCREMENT,
    business_name    VARCHAR(200)   NOT NULL,
    owner_name       VARCHAR(150)   NOT NULL,
    email            VARCHAR(150)   NOT NULL UNIQUE,
    mobile           VARCHAR(15)    NOT NULL,
    password         VARCHAR(255)   NOT NULL COMMENT 'Bcrypt hashed password',
    business_address TEXT           NOT NULL,
    gst_number       VARCHAR(20)    NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 2: technicians
-- ============================================================
CREATE TABLE IF NOT EXISTS technicians (
    id               INT            NOT NULL AUTO_INCREMENT,
    technician_name  VARCHAR(150)   NOT NULL,
    mobile           VARCHAR(15)    NOT NULL,
    email            VARCHAR(150)   NULL,
    address          TEXT           NULL,
    status           ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 3: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id               INT            NOT NULL AUTO_INCREMENT,
    user_id          INT            NULL COMMENT 'Owner business user',
    customer_name    VARCHAR(150)   NOT NULL,
    mobile           VARCHAR(15)    NOT NULL UNIQUE,
    alternate_mobile VARCHAR(15)    NULL,
    address          TEXT           NULL,
    landmark         VARCHAR(200)   NULL,
    city             VARCHAR(100)   NULL,
    pincode          VARCHAR(10)    NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 4: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id               INT            NOT NULL AUTO_INCREMENT,
    product_name     VARCHAR(200)   NOT NULL,
    brand            VARCHAR(100)   NOT NULL,
    model_number     VARCHAR(100)   NULL,
    serial_number    VARCHAR(100)   NULL,
    warranty_months  INT            NOT NULL DEFAULT 12,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 5: installations
-- ============================================================
CREATE TABLE IF NOT EXISTS installations (
    id                   INT            NOT NULL AUTO_INCREMENT,
    customer_id          INT            NOT NULL,
    product_id           INT            NOT NULL,
    technician_id        INT            NOT NULL,
    installation_photo   VARCHAR(500)   NULL COMMENT 'File path or URL',
    source_water_type    VARCHAR(100)   NULL COMMENT 'e.g. Borewell, Municipal',
    input_tds            DECIMAL(8,2)   NULL COMMENT 'TDS in ppm before RO',
    output_tds           DECIMAL(8,2)   NULL COMMENT 'TDS in ppm after RO',
    installation_date    DATE           NOT NULL,
    cost_price           DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    selling_price        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    profit               DECIMAL(10,2)  GENERATED ALWAYS AS (selling_price - cost_price) STORED,
    remarks              TEXT           NULL,
    created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_inst_customer    FOREIGN KEY (customer_id)   REFERENCES customers(id)   ON DELETE CASCADE,
    CONSTRAINT fk_inst_product     FOREIGN KEY (product_id)    REFERENCES products(id)    ON DELETE RESTRICT,
    CONSTRAINT fk_inst_technician  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 6: service_schedule
-- ============================================================
CREATE TABLE IF NOT EXISTS service_schedule (
    id                       INT            NOT NULL AUTO_INCREMENT,
    installation_id          INT            NOT NULL,
    customer_id              INT            NOT NULL,
    next_service_date        DATE           NOT NULL,
    service_interval_months  INT            NOT NULL DEFAULT 6,
    status                   ENUM('Pending','Completed','Overdue') NOT NULL DEFAULT 'Pending',
    reminder_sent            ENUM('Yes','No') NOT NULL DEFAULT 'No',
    PRIMARY KEY (id),
    CONSTRAINT fk_sched_installation FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sched_customer     FOREIGN KEY (customer_id)     REFERENCES customers(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 7: services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id                INT            NOT NULL AUTO_INCREMENT,
    installation_id   INT            NOT NULL,
    customer_id       INT            NOT NULL,
    technician_id     INT            NOT NULL,
    service_date      DATE           NOT NULL,
    service_type      ENUM('Regular','Paid','Complaint','Emergency') NOT NULL DEFAULT 'Regular',
    tds_before        DECIMAL(8,2)   NULL,
    tds_after         DECIMAL(8,2)   NULL,
    service_charge    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    parts_total_cost  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    total_bill        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    remarks           TEXT           NULL,
    created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_svc_installation  FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
    CONSTRAINT fk_svc_customer      FOREIGN KEY (customer_id)     REFERENCES customers(id)     ON DELETE CASCADE,
    CONSTRAINT fk_svc_technician    FOREIGN KEY (technician_id)   REFERENCES technicians(id)   ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 8: service_parts
-- ============================================================
CREATE TABLE IF NOT EXISTS service_parts (
    id            INT            NOT NULL AUTO_INCREMENT,
    service_id    INT            NOT NULL,
    part_name     VARCHAR(200)   NOT NULL,
    quantity      INT            NOT NULL DEFAULT 1,
    cost_price    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    profit        DECIMAL(10,2)  GENERATED ALWAYS AS ((selling_price - cost_price) * quantity) STORED,
    PRIMARY KEY (id),
    CONSTRAINT fk_parts_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 9: bills
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
    id               INT            NOT NULL AUTO_INCREMENT,
    invoice_number   VARCHAR(50)    NOT NULL UNIQUE,
    customer_id      INT            NOT NULL,
    installation_id  INT            NULL,
    service_id       INT            NULL,
    bill_date        DATE           NOT NULL,
    subtotal         DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    service_charge   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    grand_total      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    payment_status   ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
    payment_mode     ENUM('Cash','UPI','Card','Bank Transfer') NOT NULL DEFAULT 'Cash',
    PRIMARY KEY (id),
    CONSTRAINT fk_bill_customer     FOREIGN KEY (customer_id)     REFERENCES customers(id)     ON DELETE CASCADE,
    CONSTRAINT fk_bill_installation FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE SET NULL,
    CONSTRAINT fk_bill_service      FOREIGN KEY (service_id)      REFERENCES services(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 10: sms_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_logs (
    id           INT            NOT NULL AUTO_INCREMENT,
    customer_id  INT            NOT NULL,
    mobile       VARCHAR(15)    NOT NULL,
    message      TEXT           NOT NULL,
    status       VARCHAR(50)    NOT NULL DEFAULT 'Sent',
    sent_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_sms_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table 11: inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
    id               INT            NOT NULL AUTO_INCREMENT,
    part_name        VARCHAR(200)   NOT NULL,
    brand            VARCHAR(100)   NULL,
    available_stock  INT            NOT NULL DEFAULT 0,
    purchase_price   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    selling_price    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    reorder_level    INT            NOT NULL DEFAULT 5,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- Trigger: Auto-create service schedule on new installation
CREATE TRIGGER after_installation_insert
AFTER INSERT ON installations
FOR EACH ROW
BEGIN
    INSERT INTO service_schedule (
        installation_id,
        customer_id,
        next_service_date,
        service_interval_months,
        status,
        reminder_sent
    ) VALUES (
        NEW.id,
        NEW.customer_id,
        DATE_ADD(NEW.installation_date, INTERVAL 6 MONTH),
        6,
        'Pending',
        'No'
    );
END$$

-- Trigger: Auto-log SMS when a bill is generated
CREATE TRIGGER after_bill_insert
AFTER INSERT ON bills
FOR EACH ROW
BEGIN
    DECLARE v_mobile   VARCHAR(15);
    DECLARE v_name     VARCHAR(150);
    DECLARE v_message  TEXT;

    SELECT mobile, customer_name
    INTO v_mobile, v_name
    FROM customers
    WHERE id = NEW.customer_id;

    SET v_message = CONCAT(
        'Dear ', v_name, ', your invoice ', NEW.invoice_number,
        ' of Rs.', NEW.grand_total, ' has been generated. ',
        'Payment Status: ', NEW.payment_status, '. Thank you – PureFlow Service Hub.'
    );

    INSERT INTO sms_logs (customer_id, mobile, message, status, sent_at)
    VALUES (NEW.customer_id, v_mobile, v_message, 'Sent', NOW());
END$$

-- Trigger: Recalculate service total_bill when parts are added
CREATE TRIGGER after_service_part_insert
AFTER INSERT ON service_parts
FOR EACH ROW
BEGIN
    UPDATE services
    SET parts_total_cost = (
            SELECT COALESCE(SUM(selling_price * quantity), 0)
            FROM service_parts WHERE service_id = NEW.service_id
        ),
        total_bill = service_charge + (
            SELECT COALESCE(SUM(selling_price * quantity), 0)
            FROM service_parts WHERE service_id = NEW.service_id
        )
    WHERE id = NEW.service_id;
END$$

DELIMITER ;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_customers_mobile       ON customers(mobile);
CREATE INDEX idx_installations_customer ON installations(customer_id);
CREATE INDEX idx_installations_date     ON installations(installation_date);
CREATE INDEX idx_services_customer      ON services(customer_id);
CREATE INDEX idx_services_date          ON services(service_date);
CREATE INDEX idx_schedule_next_date     ON service_schedule(next_service_date);
CREATE INDEX idx_schedule_status        ON service_schedule(status);
CREATE INDEX idx_bills_invoice          ON bills(invoice_number);
CREATE INDEX idx_inventory_stock        ON inventory(available_stock);
