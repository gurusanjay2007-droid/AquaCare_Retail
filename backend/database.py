"""
PureFlow Service Hub – Database Models (SQLAlchemy)
Supports SQLite (default) and MySQL via DATABASE_URL in .env
"""

import os
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


# ─────────────────────────────────────────────
# User (Business Owner)
# ─────────────────────────────────────────────
class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id               = db.Column(db.Integer, primary_key=True, autoincrement=True)
    business_name    = db.Column(db.String(200), nullable=False)
    owner_name       = db.Column(db.String(150), nullable=False)
    email            = db.Column(db.String(150), nullable=False, unique=True)
    mobile           = db.Column(db.String(15),  nullable=False)
    password         = db.Column(db.String(255), nullable=False)
    business_address = db.Column(db.Text,        nullable=False)
    gst_number       = db.Column(db.String(20),  nullable=True)
    created_at       = db.Column(db.DateTime,    default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime,    default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    customers = db.relationship('Customer', backref='owner', lazy=True)

    def set_password(self, raw_password):
        self.password = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password, raw_password)

    def to_dict(self):
        return {
            'id': self.id,
            'business_name': self.business_name,
            'owner_name': self.owner_name,
            'email': self.email,
            'mobile': self.mobile,
            'business_address': self.business_address,
            'gst_number': self.gst_number,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────
# Technician
# ─────────────────────────────────────────────
class Technician(db.Model):
    __tablename__ = 'technicians'

    id               = db.Column(db.Integer,     primary_key=True, autoincrement=True)
    tech_id          = db.Column(db.String(50),  unique=True, nullable=True)
    passcode         = db.Column(db.String(255), nullable=True)
    technician_name  = db.Column(db.String(150), nullable=False)
    mobile           = db.Column(db.String(15),  nullable=False)
    email            = db.Column(db.String(150), nullable=True)
    address          = db.Column(db.Text,        nullable=True)
    status           = db.Column(db.String(20),  nullable=False, default='Active')
    photo_url        = db.Column(db.String(500), nullable=True)
    created_at       = db.Column(db.DateTime,    default=datetime.utcnow)

    installations = db.relationship('Installation', backref='technician', lazy=True)
    services      = db.relationship('Service',      backref='technician', lazy=True)

    def set_passcode(self, raw_passcode):
        if raw_passcode:
            self.passcode = generate_password_hash(raw_passcode)
        else:
            self.passcode = None

    def check_passcode(self, raw_passcode):
        if not self.passcode:
            return False
        # Support both hashed and legacy plain passcode for easy demo/hub admin setup
        if self.passcode == raw_passcode:
            return True
        return check_password_hash(self.passcode, raw_passcode)

    def to_dict(self):
        return {
            'id': self.id,
            'tech_id': self.tech_id,
            'passcode': self.passcode,
            'technician_name': self.technician_name,
            'mobile': self.mobile,
            'email': self.email,
            'address': self.address,
            'status': self.status,
            'photo_url': self.photo_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }



# ─────────────────────────────────────────────
# Customer
# ─────────────────────────────────────────────
class Customer(db.Model):
    __tablename__ = 'customers'

    id               = db.Column(db.Integer,     primary_key=True, autoincrement=True)
    user_id          = db.Column(db.Integer,     db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    customer_name    = db.Column(db.String(150), nullable=False)
    mobile           = db.Column(db.String(15),  nullable=False, unique=True)
    alternate_mobile = db.Column(db.String(15),  nullable=True)
    address          = db.Column(db.Text,        nullable=True)
    landmark         = db.Column(db.String(200), nullable=True)
    city             = db.Column(db.String(100), nullable=True)
    pincode          = db.Column(db.String(10),  nullable=True)
    created_at       = db.Column(db.DateTime,    default=datetime.utcnow)

    installations    = db.relationship('Installation',    backref='customer', lazy=True)
    service_schedule = db.relationship('ServiceSchedule', backref='customer', lazy=True)
    services         = db.relationship('Service',         backref='customer', lazy=True)
    bills            = db.relationship('Bill',            backref='customer', lazy=True)
    sms_logs         = db.relationship('SmsLog',          backref='customer', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'customer_name': self.customer_name,
            'mobile': self.mobile,
            'alternate_mobile': self.alternate_mobile,
            'address': self.address,
            'landmark': self.landmark,
            'city': self.city,
            'pincode': self.pincode,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────
# Product
# ─────────────────────────────────────────────
class Product(db.Model):
    __tablename__ = 'products'

    id              = db.Column(db.Integer,       primary_key=True, autoincrement=True)
    product_name    = db.Column(db.String(200),   nullable=False)
    brand           = db.Column(db.String(100),   nullable=False)
    model_number    = db.Column(db.String(100),   nullable=True)
    serial_number   = db.Column(db.String(100),   nullable=True)
    cost_price      = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    selling_price   = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    warranty_months = db.Column(db.Integer,       nullable=False, default=12)
    created_at      = db.Column(db.DateTime,      default=datetime.utcnow)

    installations   = db.relationship('Installation', backref='product', lazy=True)

    @property
    def profit_margin(self):
        return float(self.selling_price or 0) - float(self.cost_price or 0)

    def to_dict(self):
        return {
            'id': self.id,
            'product_name': self.product_name,
            'brand': self.brand,
            'model_number': self.model_number,
            'serial_number': self.serial_number,
            'cost_price': float(self.cost_price or 0),
            'selling_price': float(self.selling_price or 0),
            'profit_margin': self.profit_margin,
            'warranty_months': self.warranty_months,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }



# ─────────────────────────────────────────────
# Installation
# ─────────────────────────────────────────────
class Installation(db.Model):
    __tablename__ = 'installations'

    id                  = db.Column(db.Integer,       primary_key=True, autoincrement=True)
    customer_id         = db.Column(db.Integer,       db.ForeignKey('customers.id', ondelete='CASCADE'),    nullable=False)
    product_id          = db.Column(db.Integer,       db.ForeignKey('products.id', ondelete='RESTRICT'),   nullable=False)
    technician_id       = db.Column(db.Integer,       db.ForeignKey('technicians.id', ondelete='RESTRICT'),nullable=False)
    installation_photo  = db.Column(db.String(500),   nullable=True)
    source_water_type   = db.Column(db.String(100),   nullable=True)
    input_tds           = db.Column(db.Numeric(8, 2), nullable=True)
    output_tds          = db.Column(db.Numeric(8, 2), nullable=True)
    installation_date   = db.Column(db.Date,          nullable=False)
    cost_price          = db.Column(db.Numeric(10, 2),nullable=False, default=0.00)
    selling_price       = db.Column(db.Numeric(10, 2),nullable=False, default=0.00)
    remarks             = db.Column(db.Text,          nullable=True)
    created_at          = db.Column(db.DateTime,      default=datetime.utcnow)

    service_schedule    = db.relationship('ServiceSchedule', backref='installation', lazy=True)
    services            = db.relationship('Service',         backref='installation', lazy=True)
    bills               = db.relationship('Bill',            backref='installation', lazy=True)

    @property
    def profit(self):
        return float(self.selling_price or 0) - float(self.cost_price or 0)

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.customer_name if self.customer else None,
            'product_id': self.product_id,
            'product_name': self.product.product_name if self.product else None,
            'technician_id': self.technician_id,
            'technician_name': self.technician.technician_name if self.technician else None,
            'installation_photo': self.installation_photo,
            'source_water_type': self.source_water_type,
            'input_tds': float(self.input_tds) if self.input_tds else None,
            'output_tds': float(self.output_tds) if self.output_tds else None,
            'installation_date': self.installation_date.isoformat() if self.installation_date else None,
            'cost_price': float(self.cost_price),
            'selling_price': float(self.selling_price),
            'profit': self.profit,
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────
# Service Schedule
# ─────────────────────────────────────────────
class ServiceSchedule(db.Model):
    __tablename__ = 'service_schedule'

    id                      = db.Column(db.Integer,  primary_key=True, autoincrement=True)
    installation_id         = db.Column(db.Integer,  db.ForeignKey('installations.id', ondelete='CASCADE'), nullable=False)
    customer_id             = db.Column(db.Integer,  db.ForeignKey('customers.id',     ondelete='CASCADE'), nullable=False)
    next_service_date       = db.Column(db.Date,     nullable=False)
    service_interval_months = db.Column(db.Integer,  nullable=False, default=6)
    status                  = db.Column(db.String(20),nullable=False, default='Pending')
    reminder_sent           = db.Column(db.String(5), nullable=False, default='No')

    def to_dict(self):
        return {
            'id': self.id,
            'installation_id': self.installation_id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.customer_name if self.customer else None,
            'customer_mobile': self.customer.mobile if self.customer else None,
            'next_service_date': self.next_service_date.isoformat() if self.next_service_date else None,
            'service_interval_months': self.service_interval_months,
            'status': self.status,
            'reminder_sent': self.reminder_sent,
        }


# ─────────────────────────────────────────────
# Service
# ─────────────────────────────────────────────
class Service(db.Model):
    __tablename__ = 'services'

    id               = db.Column(db.Integer,       primary_key=True, autoincrement=True)
    installation_id  = db.Column(db.Integer,       db.ForeignKey('installations.id', ondelete='CASCADE'),  nullable=False)
    customer_id      = db.Column(db.Integer,       db.ForeignKey('customers.id',     ondelete='CASCADE'),  nullable=False)
    technician_id    = db.Column(db.Integer,       db.ForeignKey('technicians.id',   ondelete='RESTRICT'), nullable=False)
    service_date     = db.Column(db.Date,          nullable=False)
    service_type     = db.Column(db.String(20),    nullable=False, default='Regular')
    tds_before       = db.Column(db.Numeric(8, 2), nullable=True)
    tds_after        = db.Column(db.Numeric(8, 2), nullable=True)
    service_charge   = db.Column(db.Numeric(10, 2),nullable=False, default=0.00)
    parts_total_cost = db.Column(db.Numeric(10, 2),nullable=False, default=0.00)
    total_bill       = db.Column(db.Numeric(10, 2),nullable=False, default=0.00)
    remarks          = db.Column(db.Text,          nullable=True)
    created_at       = db.Column(db.DateTime,      default=datetime.utcnow)

    parts = db.relationship('ServicePart', backref='service', lazy=True, cascade='all, delete-orphan')
    bills = db.relationship('Bill',        backref='service', lazy=True)

    def recalculate_totals(self):
        self.parts_total_cost = sum(float(p.selling_price or 0) * int(p.quantity or 1) for p in self.parts)
        self.total_bill = float(self.service_charge or 0) + self.parts_total_cost

    def to_dict(self):
        return {
            'id': self.id,
            'installation_id': self.installation_id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.customer_name if self.customer else None,
            'technician_id': self.technician_id,
            'technician_name': self.technician.technician_name if self.technician else None,
            'service_date': self.service_date.isoformat() if self.service_date else None,
            'service_type': self.service_type,
            'tds_before': float(self.tds_before) if self.tds_before else None,
            'tds_after': float(self.tds_after) if self.tds_after else None,
            'service_charge': float(self.service_charge),
            'parts_total_cost': float(self.parts_total_cost),
            'total_bill': float(self.total_bill),
            'remarks': self.remarks,
            'parts': [p.to_dict() for p in self.parts],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────
# Service Parts
# ─────────────────────────────────────────────
class ServicePart(db.Model):
    __tablename__ = 'service_parts'

    id            = db.Column(db.Integer,       primary_key=True, autoincrement=True)
    service_id    = db.Column(db.Integer,       db.ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    part_name     = db.Column(db.String(200),   nullable=False)
    quantity      = db.Column(db.Integer,       nullable=False, default=1)
    cost_price    = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    selling_price = db.Column(db.Numeric(10,2), nullable=False, default=0.00)

    @property
    def profit(self):
        return (float(self.selling_price or 0) - float(self.cost_price or 0)) * int(self.quantity or 1)

    def to_dict(self):
        return {
            'id': self.id,
            'service_id': self.service_id,
            'part_name': self.part_name,
            'quantity': self.quantity,
            'cost_price': float(self.cost_price),
            'selling_price': float(self.selling_price),
            'profit': self.profit,
        }


# ─────────────────────────────────────────────
# Bill / Invoice
# ─────────────────────────────────────────────
class Bill(db.Model):
    __tablename__ = 'bills'

    id               = db.Column(db.Integer,       primary_key=True, autoincrement=True)
    invoice_number   = db.Column(db.String(50),    nullable=False, unique=True)
    customer_id      = db.Column(db.Integer,       db.ForeignKey('customers.id',     ondelete='CASCADE'), nullable=False)
    installation_id  = db.Column(db.Integer,       db.ForeignKey('installations.id', ondelete='SET NULL'),nullable=True)
    service_id       = db.Column(db.Integer,       db.ForeignKey('services.id',      ondelete='SET NULL'),nullable=True)
    bill_date        = db.Column(db.Date,          nullable=False)
    subtotal         = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    service_charge   = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    grand_total      = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    payment_status   = db.Column(db.String(20),    nullable=False, default='Unpaid')
    payment_mode     = db.Column(db.String(30),    nullable=False, default='Cash')

    # SMS logs are linked via customer_id and handled in routes directly

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'customer_id': self.customer_id,
            'customer_name': self.customer.customer_name if self.customer else None,
            'installation_id': self.installation_id,
            'service_id': self.service_id,
            'bill_date': self.bill_date.isoformat() if self.bill_date else None,
            'subtotal': float(self.subtotal),
            'service_charge': float(self.service_charge),
            'grand_total': float(self.grand_total),
            'payment_status': self.payment_status,
            'payment_mode': self.payment_mode,
        }


# ─────────────────────────────────────────────
# SMS Log
# ─────────────────────────────────────────────
class SmsLog(db.Model):
    __tablename__ = 'sms_logs'

    id          = db.Column(db.Integer,   primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer,   db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    mobile      = db.Column(db.String(15),nullable=False)
    message     = db.Column(db.Text,      nullable=False)
    status      = db.Column(db.String(50),nullable=False, default='Sent')
    sent_at     = db.Column(db.DateTime,  default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'mobile': self.mobile,
            'message': self.message,
            'status': self.status,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
        }


# ─────────────────────────────────────────────
# Inventory
# ─────────────────────────────────────────────
class Inventory(db.Model):
    __tablename__ = 'inventory'

    id              = db.Column(db.Integer,       primary_key=True, autoincrement=True)
    part_name       = db.Column(db.String(200),   nullable=False)
    brand           = db.Column(db.String(100),   nullable=True)
    available_stock = db.Column(db.Integer,       nullable=False, default=0)
    purchase_price  = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    selling_price   = db.Column(db.Numeric(10,2), nullable=False, default=0.00)
    reorder_level   = db.Column(db.Integer,       nullable=False, default=5)
    created_at      = db.Column(db.DateTime,      default=datetime.utcnow)

    @property
    def is_low_stock(self):
        return self.available_stock <= self.reorder_level

    def to_dict(self):
        return {
            'id': self.id,
            'part_name': self.part_name,
            'brand': self.brand,
            'available_stock': self.available_stock,
            'purchase_price': float(self.purchase_price),
            'selling_price': float(self.selling_price),
            'reorder_level': self.reorder_level,
            'is_low_stock': self.is_low_stock,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
