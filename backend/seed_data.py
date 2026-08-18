"""
PureFlow Service Hub – Seed Data Script
Populates the database with realistic mock data for demonstration
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
from backend.app import app, db
from backend.database import (
    User, Technician, Customer, Product,
    Installation, ServiceSchedule, Service,
    ServicePart, Bill, SmsLog, Inventory
)

def seed():
    with app.app_context():
        db.create_all()

        # Clear existing data (order matters for FK)
        SmsLog.query.delete()
        Bill.query.delete()
        ServicePart.query.delete()
        Service.query.delete()
        ServiceSchedule.query.delete()
        Installation.query.delete()
        Product.query.delete()
        Customer.query.delete()
        Technician.query.delete()
        Inventory.query.delete()
        User.query.delete()
        db.session.commit()

        print("[*] Seeding PureFlow Service Hub...")

        # ── Users ─────────────────────────────────────────────
        user = User(
            business_name    = "PureFlow Water Solutions",
            owner_name       = "Rajesh Kumar",
            email            = "admin@pureflow.in",
            mobile           = "9876543210",
            business_address = "Shop No. 12, Water Market, Hyderabad – 500001",
            gst_number       = "36AADCP1234F1Z5"
        )
        user.set_password("admin123")
        db.session.add(user)
        db.session.flush()
        print("  [+] User created")

        # ── Technicians ───────────────────────────────────────
        techs = [
            Technician(technician_name="Suresh Babu",   mobile="9000111001", email="suresh@pureflow.in",  address="LB Nagar, Hyderabad",    status="Active",   tech_id="TECH101"),
            Technician(technician_name="Ramesh Yadav",  mobile="9000111002", email="ramesh@pureflow.in",  address="Dilsukhnagar, Hyderabad", status="Active",  tech_id="TECH102"),
            Technician(technician_name="Prasad Reddy",  mobile="9000111003", email="prasad@pureflow.in",  address="Kukatpally, Hyderabad",   status="Active",   tech_id="TECH103"),
            Technician(technician_name="Vinod Kumar",   mobile="9000111004", email="vinod@pureflow.in",   address="Begumpet, Hyderabad",     status="Inactive", tech_id="TECH104"),
        ]
        for t in techs:
            t.set_passcode("123456")
            db.session.add(t)
        db.session.flush()
        print(f"  [+] {len(techs)} technicians created")

        # ── Products ──────────────────────────────────────────
        products = [
            Product(product_name="AquaGuard Marvel 6L",  brand="Eureka Forbes",  model_number="AG-M6L-001", serial_number="EF202401001", warranty_months=24),
            Product(product_name="Kent Grand Plus 8L",   brand="Kent",           model_number="KGP-8L-002", serial_number="KN202401002", warranty_months=12),
            Product(product_name="HUL Pureit Eco 10L",   brand="HUL Pureit",     model_number="PE-10L-003", serial_number="HU202401003", warranty_months=12),
            Product(product_name="Livpure Glo Pro 7L",   brand="Livpure",        model_number="LG-7L-004",  serial_number="LP202401004", warranty_months=18),
            Product(product_name="Blue Star Pristine 7L",brand="Blue Star",      model_number="BS-P7L-005", serial_number="BS202401005", warranty_months=24),
            Product(product_name="AO Smith Z8 8L",       brand="A.O. Smith",     model_number="AO-Z8-006",  serial_number="AO202401006", warranty_months=12),
        ]
        for p in products:
            db.session.add(p)
        db.session.flush()
        print(f"  [+] {len(products)} products created")

        # ── Customers ─────────────────────────────────────────
        customers_data = [
            dict(user_id=user.id, customer_name="Arjun Sharma",    mobile="9100001001", alternate_mobile="9100001002", address="Flat 3A, Sunshine Apts, Miyapur",    landmark="Near Metro Station", city="Hyderabad", pincode="500049"),
            dict(user_id=user.id, customer_name="Priya Reddy",     mobile="9100002001", alternate_mobile=None,         address="Plot 45, Madhapur Road",              landmark="Opp HITEC City",     city="Hyderabad", pincode="500081"),
            dict(user_id=user.id, customer_name="Mohan Das",       mobile="9100003001", alternate_mobile="9100003002", address="H.No 7-48, Srinagar Colony",          landmark="Near Hanuman Temple",city="Hyderabad", pincode="500073"),
            dict(user_id=user.id, customer_name="Sunita Patel",    mobile="9100004001", alternate_mobile=None,         address="Flat 201, Green Park Residency",       landmark="Beside Park",        city="Secunderabad", pincode="500015"),
            dict(user_id=user.id, customer_name="Kiran Kumar",     mobile="9100005001", alternate_mobile="9100005002", address="H.No 2-34, Ameerpet",                 landmark="Near Bus Stand",     city="Hyderabad", pincode="500016"),
            dict(user_id=user.id, customer_name="Lakshmi Devi",    mobile="9100006001", alternate_mobile=None,         address="Plot 12, Vijayanagar Colony",         landmark="Adj School",         city="Hyderabad", pincode="500057"),
            dict(user_id=user.id, customer_name="Ravi Teja",       mobile="9100007001", alternate_mobile="9100007002", address="Flat 5C, Orchid Heights, Gachibowli", landmark="Near Cyber Towers",  city="Hyderabad", pincode="500032"),
            dict(user_id=user.id, customer_name="Anita Gupta",     mobile="9100008001", alternate_mobile=None,         address="H.No 8-12, Banjara Hills Road 2",     landmark="Near Pista House",   city="Hyderabad", pincode="500034"),
            dict(user_id=user.id, customer_name="Santosh Rao",     mobile="9100009001", alternate_mobile="9100009002", address="Plot 78, Sainikpuri",                 landmark="Main Road",          city="Secunderabad", pincode="500094"),
            dict(user_id=user.id, customer_name="Meera Krishnan",  mobile="9100010001", alternate_mobile=None,         address="Flat 7B, Vasavi Towers, Kompally",    landmark="Near Highway",       city="Hyderabad", pincode="500014"),
        ]
        cust_objs = []
        for cd in customers_data:
            c = Customer(**cd)
            db.session.add(c)
            cust_objs.append(c)
        db.session.flush()
        print(f"  [+] {len(cust_objs)} customers created")

        # ── Inventory ─────────────────────────────────────────
        inventory_items = [
            Inventory(part_name="RO Membrane 75 GPD",    brand="Vontron",        available_stock=15, purchase_price=350,  selling_price=650,  reorder_level=5),
            Inventory(part_name="Sediment Filter 10\"",  brand="Pentek",         available_stock=30, purchase_price=60,   selling_price=120,  reorder_level=10),
            Inventory(part_name="Carbon Block Filter",   brand="CFS",            available_stock=25, purchase_price=80,   selling_price=160,  reorder_level=8),
            Inventory(part_name="Post Carbon Filter",    brand="Aqua",           available_stock=3,  purchase_price=70,   selling_price=140,  reorder_level=8),  # Low stock
            Inventory(part_name="UV Lamp 11W",           brand="Philips",        available_stock=12, purchase_price=200,  selling_price=400,  reorder_level=5),
            Inventory(part_name="Booster Pump 24V",      brand="Aquatec",        available_stock=4,  purchase_price=800,  selling_price=1500, reorder_level=3),
            Inventory(part_name="Pressure Gauge 1/4\"",  brand="General",        available_stock=8,  purchase_price=50,   selling_price=100,  reorder_level=5),
            Inventory(part_name="Float Valve",           brand="Plastic Works",  available_stock=2,  purchase_price=40,   selling_price=80,   reorder_level=5),  # Low stock
            Inventory(part_name="RO Membrane Housing",   brand="Systec",         available_stock=6,  purchase_price=180,  selling_price=350,  reorder_level=3),
            Inventory(part_name="Check Valve 1/4\"",     brand="Watts",          available_stock=20, purchase_price=30,   selling_price=60,   reorder_level=8),
            Inventory(part_name="Inline TDS Meter",      brand="HM Digital",     available_stock=10, purchase_price=150,  selling_price=300,  reorder_level=4),
            Inventory(part_name="Storage Tank 12L",      brand="Aqua",           available_stock=5,  purchase_price=500,  selling_price=900,  reorder_level=2),
        ]
        for inv in inventory_items:
            db.session.add(inv)
        db.session.flush()
        print(f"  [+] {len(inventory_items)} inventory items created")

        # ── Installations ─────────────────────────────────────
        today = date.today()
        installations_data = [
            dict(customer=cust_objs[0], product=products[0], tech=techs[0], source="Municipal",  input_tds=420, output_tds=28, date=today - timedelta(days=180), cost=7500, sell=12000),
            dict(customer=cust_objs[1], product=products[1], tech=techs[1], source="Borewell",   input_tds=780, output_tds=35, date=today - timedelta(days=120), cost=8000, sell=13500),
            dict(customer=cust_objs[2], product=products[2], tech=techs[0], source="Municipal",  input_tds=380, output_tds=22, date=today - timedelta(days=90),  cost=7000, sell=11000),
            dict(customer=cust_objs[3], product=products[3], tech=techs[2], source="Municipal",  input_tds=510, output_tds=30, date=today - timedelta(days=60),  cost=8500, sell=14000),
            dict(customer=cust_objs[4], product=products[4], tech=techs[1], source="Borewell",   input_tds=920, output_tds=42, date=today - timedelta(days=45),  cost=9000, sell=15500),
            dict(customer=cust_objs[5], product=products[5], tech=techs[2], source="Municipal",  input_tds=350, output_tds=18, date=today - timedelta(days=30),  cost=9500, sell=16000),
            dict(customer=cust_objs[6], product=products[0], tech=techs[0], source="Tank Water", input_tds=290, output_tds=15, date=today - timedelta(days=20),  cost=7500, sell=12500),
            dict(customer=cust_objs[7], product=products[1], tech=techs[1], source="Borewell",   input_tds=650, output_tds=32, date=today - timedelta(days=15),  cost=8000, sell=13000),
            dict(customer=cust_objs[8], product=products[2], tech=techs[0], source="Municipal",  input_tds=440, output_tds=24, date=today - timedelta(days=10),  cost=7000, sell=11500),
            dict(customer=cust_objs[9], product=products[3], tech=techs[2], source="Borewell",   input_tds=1100,output_tds=48, date=today - timedelta(days=5),   cost=8500, sell=14500),
        ]

        inst_objs = []
        for i_data in installations_data:
            inst = Installation(
                customer_id       = i_data['customer'].id,
                product_id        = i_data['product'].id,
                technician_id     = i_data['tech'].id,
                source_water_type = i_data['source'],
                input_tds         = i_data['input_tds'],
                output_tds        = i_data['output_tds'],
                installation_date = i_data['date'],
                cost_price        = i_data['cost'],
                selling_price     = i_data['sell'],
                remarks           = f"Installation at {i_data['customer'].address}",
            )
            db.session.add(inst)
            inst_objs.append(inst)

        db.session.flush()

        # Auto-create service schedules
        for inst in inst_objs:
            interval  = 6
            next_date = inst.installation_date + timedelta(days=30 * interval)
            status    = 'Overdue' if next_date < today else 'Pending'
            sched = ServiceSchedule(
                installation_id         = inst.id,
                customer_id             = inst.customer_id,
                next_service_date       = next_date,
                service_interval_months = interval,
                status                  = status,
                reminder_sent           = 'No',
            )
            db.session.add(sched)
        db.session.flush()
        print(f"  [+] {len(inst_objs)} installations + schedules created")

        # ── Services ──────────────────────────────────────────
        services_data = [
            dict(inst=inst_objs[0], cust=cust_objs[0], tech=techs[0],
                 sdate=today - timedelta(days=90), stype="Regular",
                 tds_b=130, tds_a=24, charge=300,
                 parts=[
                     dict(part_name="Sediment Filter 10\"", quantity=1, cost_price=60,  selling_price=120),
                     dict(part_name="Carbon Block Filter",   quantity=1, cost_price=80,  selling_price=160),
                 ]),
            dict(inst=inst_objs[1], cust=cust_objs[1], tech=techs[1],
                 sdate=today - timedelta(days=60), stype="Paid",
                 tds_b=180, tds_a=30, charge=500,
                 parts=[
                     dict(part_name="RO Membrane 75 GPD", quantity=1, cost_price=350, selling_price=650),
                 ]),
            dict(inst=inst_objs[0], cust=cust_objs[0], tech=techs[0],
                 sdate=today - timedelta(days=10), stype="Complaint",
                 tds_b=95, tds_a=22, charge=200,
                 parts=[
                     dict(part_name="Post Carbon Filter", quantity=1, cost_price=70,  selling_price=140),
                 ]),
            dict(inst=inst_objs[3], cust=cust_objs[3], tech=techs[2],
                 sdate=today - timedelta(days=5), stype="Regular",
                 tds_b=145, tds_a=28, charge=300,
                 parts=[
                     dict(part_name="Sediment Filter 10\"", quantity=2, cost_price=60,  selling_price=120),
                 ]),
        ]

        svc_objs = []
        for sd in services_data:
            total_parts = sum(p['selling_price'] * p['quantity'] for p in sd['parts'])
            svc = Service(
                installation_id = sd['inst'].id,
                customer_id     = sd['cust'].id,
                technician_id   = sd['tech'].id,
                service_date    = sd['sdate'],
                service_type    = sd['stype'],
                tds_before      = sd['tds_b'],
                tds_after       = sd['tds_a'],
                service_charge  = sd['charge'],
                parts_total_cost= total_parts,
                total_bill      = sd['charge'] + total_parts,
            )
            for pd in sd['parts']:
                svc.parts.append(ServicePart(**pd))
            db.session.add(svc)
            svc_objs.append(svc)
        db.session.flush()
        print(f"  [+] {len(svc_objs)} services created")

        # ── Bills ─────────────────────────────────────────────
        bills_data = [
            dict(cust=cust_objs[0], inst=inst_objs[0], svc=None,        bdate=installations_data[0]['date'], subtotal=11500, charge=500, total=12000, status="Paid",   mode="Cash"),
            dict(cust=cust_objs[1], inst=inst_objs[1], svc=None,        bdate=installations_data[1]['date'], subtotal=13000, charge=500, total=13500, status="Paid",   mode="UPI"),
            dict(cust=cust_objs[2], inst=inst_objs[2], svc=None,        bdate=installations_data[2]['date'], subtotal=10500, charge=500, total=11000, status="Paid",   mode="Card"),
            dict(cust=cust_objs[3], inst=inst_objs[3], svc=None,        bdate=installations_data[3]['date'], subtotal=13500, charge=500, total=14000, status="Unpaid", mode="UPI"),
            dict(cust=cust_objs[4], inst=inst_objs[4], svc=None,        bdate=installations_data[4]['date'], subtotal=15000, charge=500, total=15500, status="Paid",   mode="Bank Transfer"),
            dict(cust=cust_objs[0], inst=None,         svc=svc_objs[0], bdate=svc_objs[0].service_date,     subtotal=580,   charge=300, total=880,   status="Paid",   mode="Cash"),
            dict(cust=cust_objs[1], inst=None,         svc=svc_objs[1], bdate=svc_objs[1].service_date,     subtotal=650,   charge=500, total=1150,  status="Paid",   mode="UPI"),
            dict(cust=cust_objs[0], inst=None,         svc=svc_objs[2], bdate=svc_objs[2].service_date,     subtotal=140,   charge=200, total=340,   status="Unpaid", mode="Cash"),
        ]

        bill_counter = 1
        for bd in bills_data:
            bdate = bd['bdate']
            bill = Bill(
                invoice_number  = f"INV-{bdate.strftime('%Y%m%d')}-{bill_counter:04d}",
                customer_id     = bd['cust'].id,
                installation_id = bd['inst'].id if bd['inst'] else None,
                service_id      = bd['svc'].id  if bd['svc']  else None,
                bill_date       = bdate,
                subtotal        = bd['subtotal'],
                service_charge  = bd['charge'],
                grand_total     = bd['total'],
                payment_status  = bd['status'],
                payment_mode    = bd['mode'],
            )
            db.session.add(bill)
            db.session.flush()

            # Auto SMS log for each bill
            cust = bd['cust']
            sms_msg = (
                f"Dear {cust.customer_name}, your invoice {bill.invoice_number} "
                f"of Rs.{bill.grand_total:.0f} has been generated. "
                f"Payment: {bill.payment_status}. Thank you – PureFlow Service Hub."
            )
            sms = SmsLog(
                customer_id = cust.id,
                mobile      = cust.mobile,
                message     = sms_msg,
                status      = "Sent",
                sent_at     = datetime.combine(bdate, datetime.min.time()) if isinstance(bdate, date) else bdate
            )
            db.session.add(sms)
            bill_counter += 1

        db.session.commit()
        print(f"  [+] {len(bills_data)} bills + SMS logs created")

        print("\n[OK] Seed complete! PureFlow Service Hub is ready.")
        print("   Open http://127.0.0.1:5000 after starting the server.")
        print("   Login: admin@pureflow.in / admin123")


if __name__ == '__main__':
    from datetime import datetime
    seed()
