"""
PureFlow Service Hub – Flask Application
REST API Backend serving the SPA frontend
"""

import os
import json
from datetime import datetime, date, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_session import Session
from dotenv import load_dotenv

load_dotenv()

# ─── App Setup ───────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMPL_DIR  = os.path.join(BASE_DIR, 'frontend', 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'frontend', 'static')

app = Flask(__name__, template_folder=TMPL_DIR, static_folder=STATIC_DIR, instance_path=os.path.join(BASE_DIR, 'instance'))

app.config['SECRET_KEY']            = os.getenv('SECRET_KEY', 'pureflow-dev-secret-2024')
app.config['SQLALCHEMY_DATABASE_URI']= os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "pureflow.db")}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_TYPE']          = 'filesystem'
app.config['SESSION_FILE_DIR']      = os.path.join(BASE_DIR, 'flask_session')



from backend.database import (
    db, User, Technician, Customer, Product,
    Installation, ServiceSchedule, Service,
    ServicePart, Bill, SmsLog, Inventory
)

db.init_app(app)
Session(app)

login_manager = LoginManager(app)
login_manager.login_view = 'serve_index'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ─── Helpers ─────────────────────────────────────────────────
def api_success(data=None, message='OK', status=200):
    return jsonify({'success': True, 'message': message, 'data': data}), status

def api_error(message='Error', status=400):
    return jsonify({'success': False, 'message': message}), status

def generate_invoice_number():
    today = date.today()
    count = Bill.query.filter(Bill.bill_date == today).count() + 1
    return f"INV-{today.strftime('%Y%m%d')}-{count:04d}"

def log_sms(customer, message):
    sms = SmsLog(
        customer_id=customer.id,
        mobile=customer.mobile,
        message=message,
        status='Sent',
        sent_at=datetime.utcnow()
    )
    db.session.add(sms)


# ─── Static / SPA ────────────────────────────────────────────
@app.route('/')
def serve_index():
    return send_from_directory(TMPL_DIR, 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)


# ═══════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════════════════
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['business_name','owner_name','email','mobile','password','business_address']
    for f in required:
        if not data.get(f):
            return api_error(f'Field "{f}" is required')

    if User.query.filter_by(email=data['email']).first():
        return api_error('Email already registered', 409)

    user = User(
        business_name    = data['business_name'],
        owner_name       = data['owner_name'],
        email            = data['email'],
        mobile           = data['mobile'],
        business_address = data['business_address'],
        gst_number       = data.get('gst_number')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return api_success(user.to_dict(), 'Registered successfully', 201)


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return api_error('Invalid email or password', 401)
    login_user(user, remember=True)
    return api_success(user.to_dict(), 'Logged in')


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return api_success(message='Logged out')


@app.route('/api/auth/me', methods=['GET'])
def me():
    if current_user.is_authenticated:
        return api_success(current_user.to_dict())
    return api_error('Not authenticated', 401)


# ═══════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    total_customers     = Customer.query.count()
    total_installations = Installation.query.count()
    total_services      = Service.query.count()
    total_technicians   = Technician.query.filter_by(status='Active').count()

    # Revenue & profit
    all_bills     = Bill.query.all()
    total_revenue = sum(float(b.grand_total) for b in all_bills)
    paid_revenue  = sum(float(b.grand_total) for b in all_bills if b.payment_status == 'Paid')

    # Installation profit
    all_inst      = Installation.query.all()
    install_profit= sum(i.profit for i in all_inst)

    # Service profit from parts
    all_parts     = ServicePart.query.all()
    parts_profit  = sum(p.profit for p in all_parts)
    total_profit  = install_profit + parts_profit

    # Overdue services
    overdue_count = ServiceSchedule.query.filter(
        ServiceSchedule.status != 'Completed',
        ServiceSchedule.next_service_date < today
    ).count()

    # Update overdue statuses
    overdue_schedules = ServiceSchedule.query.filter(
        ServiceSchedule.status == 'Pending',
        ServiceSchedule.next_service_date < today
    ).all()
    for s in overdue_schedules:
        s.status = 'Overdue'
    if overdue_schedules:
        db.session.commit()

    # Pending services (due within 7 days)
    due_soon = ServiceSchedule.query.filter(
        ServiceSchedule.status == 'Pending',
        ServiceSchedule.next_service_date <= today + timedelta(days=7),
        ServiceSchedule.next_service_date >= today
    ).count()

    # Low stock items
    low_stock_count = sum(1 for i in Inventory.query.all() if i.is_low_stock)

    # Recent services (last 30 days)
    recent_services = Service.query.filter(
        Service.service_date >= thirty_days_ago
    ).order_by(Service.service_date.desc()).limit(5).all()

    # Monthly revenue chart data (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=30*i))
        month_start = month_start.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year+1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month+1, day=1)
        month_bills = Bill.query.filter(
            Bill.bill_date >= month_start,
            Bill.bill_date < month_end
        ).all()
        monthly_data.append({
            'month': month_start.strftime('%b %Y'),
            'revenue': sum(float(b.grand_total) for b in month_bills),
            'paid': sum(float(b.grand_total) for b in month_bills if b.payment_status == 'Paid'),
        })

    # Service type breakdown
    service_types = {}
    for s in Service.query.all():
        service_types[s.service_type] = service_types.get(s.service_type, 0) + 1

    return api_success({
        'stats': {
            'total_customers': total_customers,
            'total_installations': total_installations,
            'total_services': total_services,
            'total_technicians': total_technicians,
            'total_revenue': round(total_revenue, 2),
            'paid_revenue': round(paid_revenue, 2),
            'total_profit': round(total_profit, 2),
            'overdue_count': overdue_count,
            'due_soon': due_soon,
            'low_stock_count': low_stock_count,
        },
        'monthly_revenue': monthly_data,
        'service_types': service_types,
        'recent_services': [s.to_dict() for s in recent_services],
    })


# ═══════════════════════════════════════════════════════════════
# CUSTOMERS
# ═══════════════════════════════════════════════════════════════
@app.route('/api/customers', methods=['GET'])
def get_customers():
    q      = request.args.get('q', '')
    page   = int(request.args.get('page', 1))
    limit  = int(request.args.get('limit', 20))
    query  = Customer.query
    if q:
        query = query.filter(
            db.or_(Customer.customer_name.ilike(f'%{q}%'),
                   Customer.mobile.ilike(f'%{q}%'),
                   Customer.city.ilike(f'%{q}%'))
        )
    total  = query.count()
    items  = query.order_by(Customer.created_at.desc()).offset((page-1)*limit).limit(limit).all()
    return api_success({'items': [c.to_dict() for c in items], 'total': total})


@app.route('/api/customers/<int:cid>', methods=['GET'])
def get_customer(cid):
    c = Customer.query.get_or_404(cid)
    data = c.to_dict()
    data['installations'] = [i.to_dict() for i in c.installations]
    data['services']      = [s.to_dict() for s in c.services]
    data['bills']         = [b.to_dict() for b in c.bills]
    data['sms_logs']      = [l.to_dict() for l in c.sms_logs]
    data['schedule']      = [sc.to_dict() for sc in c.service_schedule]
    return api_success(data)


@app.route('/api/customers', methods=['POST'])
def create_customer():
    data = request.get_json()
    if not data.get('customer_name') or not data.get('mobile'):
        return api_error('customer_name and mobile are required')
    if Customer.query.filter_by(mobile=data['mobile']).first():
        return api_error('Mobile number already registered', 409)
    c = Customer(**{k: data.get(k) for k in [
        'customer_name','mobile','alternate_mobile','address','landmark','city','pincode'
    ]})
    if current_user.is_authenticated:
        c.user_id = current_user.id
    db.session.add(c)
    db.session.commit()
    return api_success(c.to_dict(), 'Customer created', 201)


@app.route('/api/customers/<int:cid>', methods=['PUT'])
def update_customer(cid):
    c    = Customer.query.get_or_404(cid)
    data = request.get_json()
    for field in ['customer_name','mobile','alternate_mobile','address','landmark','city','pincode']:
        if field in data:
            setattr(c, field, data[field])
    db.session.commit()
    return api_success(c.to_dict(), 'Customer updated')


@app.route('/api/customers/<int:cid>', methods=['DELETE'])
def delete_customer(cid):
    c = Customer.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    return api_success(message='Customer deleted')


# ═══════════════════════════════════════════════════════════════
# TECHNICIANS
# ═══════════════════════════════════════════════════════════════
@app.route('/api/technicians', methods=['GET'])
def get_technicians():
    items = Technician.query.order_by(Technician.technician_name).all()
    return api_success([t.to_dict() for t in items])


@app.route('/api/technicians', methods=['POST'])
def create_technician():
    data = request.get_json()
    if not data.get('technician_name') or not data.get('mobile'):
        return api_error('technician_name and mobile are required')
    t = Technician(**{k: data.get(k) for k in ['technician_name','mobile','email','address','status']})
    db.session.add(t)
    db.session.commit()
    return api_success(t.to_dict(), 'Technician created', 201)


@app.route('/api/technicians/<int:tid>', methods=['PUT'])
def update_technician(tid):
    t    = Technician.query.get_or_404(tid)
    data = request.get_json()
    for field in ['technician_name','mobile','email','address','status']:
        if field in data:
            setattr(t, field, data[field])
    db.session.commit()
    return api_success(t.to_dict(), 'Technician updated')


@app.route('/api/technicians/<int:tid>', methods=['DELETE'])
def delete_technician(tid):
    t = Technician.query.get_or_404(tid)
    db.session.delete(t)
    db.session.commit()
    return api_success(message='Technician deleted')


# ═══════════════════════════════════════════════════════════════
# PRODUCTS
# ═══════════════════════════════════════════════════════════════
@app.route('/api/products', methods=['GET'])
def get_products():
    items = Product.query.order_by(Product.product_name).all()
    return api_success([p.to_dict() for p in items])


@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()
    if not data.get('product_name') or not data.get('brand'):
        return api_error('product_name and brand are required')
    p = Product(**{k: data.get(k) for k in ['product_name','brand','model_number','serial_number','warranty_months']})
    db.session.add(p)
    db.session.commit()
    return api_success(p.to_dict(), 'Product created', 201)


@app.route('/api/products/<int:pid>', methods=['PUT'])
def update_product(pid):
    p    = Product.query.get_or_404(pid)
    data = request.get_json()
    for field in ['product_name','brand','model_number','serial_number','warranty_months']:
        if field in data:
            setattr(p, field, data[field])
    db.session.commit()
    return api_success(p.to_dict(), 'Product updated')


# ═══════════════════════════════════════════════════════════════
# INSTALLATIONS
# ═══════════════════════════════════════════════════════════════
@app.route('/api/installations', methods=['GET'])
def get_installations():
    q     = request.args.get('q', '')
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    query = Installation.query.join(Customer)
    if q:
        query = query.filter(
            db.or_(Customer.customer_name.ilike(f'%{q}%'),
                   Customer.mobile.ilike(f'%{q}%'))
        )
    total = query.count()
    items = query.order_by(Installation.installation_date.desc()).offset((page-1)*limit).limit(limit).all()
    return api_success({'items': [i.to_dict() for i in items], 'total': total})


@app.route('/api/installations', methods=['POST'])
def create_installation():
    data = request.get_json()
    required = ['customer_id','product_id','technician_id','installation_date','selling_price','cost_price']
    for f in required:
        if data.get(f) is None:
            return api_error(f'Field "{f}" is required')

    inst = Installation(
        customer_id       = data['customer_id'],
        product_id        = data['product_id'],
        technician_id     = data['technician_id'],
        installation_photo= data.get('installation_photo'),
        source_water_type = data.get('source_water_type'),
        input_tds         = data.get('input_tds'),
        output_tds        = data.get('output_tds'),
        installation_date = datetime.strptime(data['installation_date'], '%Y-%m-%d').date(),
        cost_price        = float(data['cost_price']),
        selling_price     = float(data['selling_price']),
        remarks           = data.get('remarks'),
    )
    db.session.add(inst)
    db.session.flush()  # get inst.id

    # Auto-create service schedule (6 months from installation)
    interval = int(data.get('service_interval_months', 6))
    next_date = inst.installation_date + timedelta(days=30 * interval)
    schedule  = ServiceSchedule(
        installation_id         = inst.id,
        customer_id             = inst.customer_id,
        next_service_date       = next_date,
        service_interval_months = interval,
        status                  = 'Pending',
        reminder_sent           = 'No',
    )
    db.session.add(schedule)
    db.session.commit()
    return api_success(inst.to_dict(), 'Installation recorded with service schedule', 201)


@app.route('/api/installations/<int:iid>', methods=['GET'])
def get_installation(iid):
    inst = Installation.query.get_or_404(iid)
    data = inst.to_dict()
    data['services']  = [s.to_dict() for s in inst.services]
    data['schedule']  = [sc.to_dict() for sc in inst.service_schedule]
    return api_success(data)


@app.route('/api/installations/<int:iid>', methods=['PUT'])
def update_installation(iid):
    inst = Installation.query.get_or_404(iid)
    data = request.get_json()
    for field in ['source_water_type','input_tds','output_tds','cost_price','selling_price','remarks','installation_photo']:
        if field in data:
            setattr(inst, field, data[field])
    if 'installation_date' in data:
        inst.installation_date = datetime.strptime(data['installation_date'], '%Y-%m-%d').date()
    db.session.commit()
    return api_success(inst.to_dict(), 'Installation updated')


# ═══════════════════════════════════════════════════════════════
# SERVICE SCHEDULES
# ═══════════════════════════════════════════════════════════════
@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    status = request.args.get('status', '')
    today  = date.today()

    # Auto-update overdue
    overdue = ServiceSchedule.query.filter(
        ServiceSchedule.status == 'Pending',
        ServiceSchedule.next_service_date < today
    ).all()
    for s in overdue:
        s.status = 'Overdue'
    if overdue:
        db.session.commit()

    query = ServiceSchedule.query
    if status:
        query = query.filter(ServiceSchedule.status == status)
    items = query.order_by(ServiceSchedule.next_service_date).all()
    return api_success([s.to_dict() for s in items])


@app.route('/api/schedules/<int:sid>', methods=['PUT'])
def update_schedule(sid):
    s    = ServiceSchedule.query.get_or_404(sid)
    data = request.get_json()
    for field in ['status','reminder_sent','next_service_date','service_interval_months']:
        if field in data:
            if field == 'next_service_date':
                s.next_service_date = datetime.strptime(data[field], '%Y-%m-%d').date()
            else:
                setattr(s, field, data[field])
    db.session.commit()
    return api_success(s.to_dict(), 'Schedule updated')


# ═══════════════════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════════════════
@app.route('/api/services', methods=['GET'])
def get_services():
    q     = request.args.get('q', '')
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    query = Service.query.join(Customer)
    if q:
        query = query.filter(
            db.or_(Customer.customer_name.ilike(f'%{q}%'),
                   Customer.mobile.ilike(f'%{q}%'))
        )
    total = query.count()
    items = query.order_by(Service.service_date.desc()).offset((page-1)*limit).limit(limit).all()
    return api_success({'items': [s.to_dict() for s in items], 'total': total})


@app.route('/api/services', methods=['POST'])
def create_service():
    data = request.get_json()
    required = ['installation_id','customer_id','technician_id','service_date','service_type']
    for f in required:
        if not data.get(f):
            return api_error(f'Field "{f}" is required')

    svc = Service(
        installation_id = data['installation_id'],
        customer_id     = data['customer_id'],
        technician_id   = data['technician_id'],
        service_date    = datetime.strptime(data['service_date'], '%Y-%m-%d').date(),
        service_type    = data['service_type'],
        tds_before      = data.get('tds_before'),
        tds_after       = data.get('tds_after'),
        service_charge  = float(data.get('service_charge', 0)),
        remarks         = data.get('remarks'),
    )

    # Add parts if provided
    parts_data = data.get('parts', [])
    total_parts_cost = 0.0
    for pd in parts_data:
        qty       = int(pd.get('quantity', 1))
        sp_price  = float(pd.get('selling_price', 0))
        cp_price  = float(pd.get('cost_price', 0))
        part = ServicePart(
            part_name     = pd['part_name'],
            quantity      = qty,
            cost_price    = cp_price,
            selling_price = sp_price,
        )
        svc.parts.append(part)
        total_parts_cost += sp_price * qty

        # Deduct from inventory
        inv = Inventory.query.filter(
            Inventory.part_name.ilike(pd['part_name'])
        ).first()
        if inv and inv.available_stock >= qty:
            inv.available_stock -= qty

    svc.parts_total_cost = total_parts_cost
    svc.total_bill       = float(svc.service_charge) + total_parts_cost

    db.session.add(svc)

    # Mark schedule as completed
    schedule = ServiceSchedule.query.filter_by(
        installation_id=data['installation_id'],
        status='Pending'
    ).order_by(ServiceSchedule.next_service_date).first()
    if not schedule:
        schedule = ServiceSchedule.query.filter_by(
            installation_id=data['installation_id'],
            status='Overdue'
        ).order_by(ServiceSchedule.next_service_date).first()

    if schedule:
        schedule.status = 'Completed'
        # Create next schedule
        interval  = schedule.service_interval_months
        next_date = svc.service_date + timedelta(days=30 * interval)
        new_sched = ServiceSchedule(
            installation_id         = data['installation_id'],
            customer_id             = data['customer_id'],
            next_service_date       = next_date,
            service_interval_months = interval,
            status                  = 'Pending',
            reminder_sent           = 'No',
        )
        db.session.add(new_sched)

    db.session.commit()
    return api_success(svc.to_dict(), 'Service recorded', 201)


@app.route('/api/services/<int:sid>', methods=['GET'])
def get_service(sid):
    s = Service.query.get_or_404(sid)
    return api_success(s.to_dict())


# ═══════════════════════════════════════════════════════════════
# BILLS
# ═══════════════════════════════════════════════════════════════
@app.route('/api/bills', methods=['GET'])
def get_bills():
    q     = request.args.get('q', '')
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    query = Bill.query.join(Customer)
    if q:
        query = query.filter(
            db.or_(Customer.customer_name.ilike(f'%{q}%'),
                   Bill.invoice_number.ilike(f'%{q}%'))
        )
    total = query.count()
    items = query.order_by(Bill.bill_date.desc()).offset((page-1)*limit).limit(limit).all()
    return api_success({'items': [b.to_dict() for b in items], 'total': total})


@app.route('/api/bills', methods=['POST'])
def create_bill():
    data = request.get_json()
    if not data.get('customer_id'):
        return api_error('customer_id is required')

    customer = Customer.query.get_or_404(data['customer_id'])
    bill = Bill(
        invoice_number  = generate_invoice_number(),
        customer_id     = data['customer_id'],
        installation_id = data.get('installation_id'),
        service_id      = data.get('service_id'),
        bill_date       = datetime.strptime(data.get('bill_date', date.today().isoformat()), '%Y-%m-%d').date(),
        subtotal        = float(data.get('subtotal', 0)),
        service_charge  = float(data.get('service_charge', 0)),
        grand_total     = float(data.get('grand_total', 0)),
        payment_status  = data.get('payment_status', 'Unpaid'),
        payment_mode    = data.get('payment_mode', 'Cash'),
    )
    db.session.add(bill)
    db.session.flush()

    # Auto log SMS
    sms_msg = (
        f"Dear {customer.customer_name}, your invoice {bill.invoice_number} "
        f"of Rs.{bill.grand_total:.2f} has been generated. "
        f"Payment Status: {bill.payment_status}. "
        f"Thank you – PureFlow Service Hub."
    )
    log_sms(customer, sms_msg)
    db.session.commit()
    return api_success(bill.to_dict(), 'Bill created', 201)


@app.route('/api/bills/<int:bid>', methods=['PUT'])
def update_bill(bid):
    b    = Bill.query.get_or_404(bid)
    data = request.get_json()
    for field in ['payment_status','payment_mode','subtotal','service_charge','grand_total']:
        if field in data:
            setattr(b, field, data[field])
    db.session.commit()
    return api_success(b.to_dict(), 'Bill updated')


# ═══════════════════════════════════════════════════════════════
# INVENTORY
# ═══════════════════════════════════════════════════════════════
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    low_only = request.args.get('low_stock') == 'true'
    items    = Inventory.query.order_by(Inventory.part_name).all()
    if low_only:
        items = [i for i in items if i.is_low_stock]
    return api_success([i.to_dict() for i in items])


@app.route('/api/inventory', methods=['POST'])
def create_inventory():
    data = request.get_json()
    if not data.get('part_name'):
        return api_error('part_name is required')
    inv = Inventory(**{k: data.get(k) for k in [
        'part_name','brand','available_stock','purchase_price','selling_price','reorder_level'
    ] if data.get(k) is not None})
    db.session.add(inv)
    db.session.commit()
    return api_success(inv.to_dict(), 'Inventory item created', 201)


@app.route('/api/inventory/<int:iid>', methods=['PUT'])
def update_inventory(iid):
    inv  = Inventory.query.get_or_404(iid)
    data = request.get_json()
    for field in ['part_name','brand','available_stock','purchase_price','selling_price','reorder_level']:
        if field in data:
            setattr(inv, field, data[field])
    db.session.commit()
    return api_success(inv.to_dict(), 'Inventory updated')


@app.route('/api/inventory/<int:iid>', methods=['DELETE'])
def delete_inventory(iid):
    inv = Inventory.query.get_or_404(iid)
    db.session.delete(inv)
    db.session.commit()
    return api_success(message='Item deleted')


# ═══════════════════════════════════════════════════════════════
# SMS LOGS
# ═══════════════════════════════════════════════════════════════
@app.route('/api/sms-logs', methods=['GET'])
def get_sms_logs():
    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    total = SmsLog.query.count()
    items = SmsLog.query.order_by(SmsLog.sent_at.desc()).offset((page-1)*limit).limit(limit).all()
    return api_success({'items': [s.to_dict() for s in items], 'total': total})


# ═══════════════════════════════════════════════════════════════
# APP ENTRY POINT
# ═══════════════════════════════════════════════════════════════
def create_app():
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"Warning: db.create_all() failed (expected on Vercel if DATABASE_URL is not set/configured): {e}")
    return app


if __name__ == '__main__':
    create_app()
    app.run(debug=True, port=5000, host='0.0.0.0')
