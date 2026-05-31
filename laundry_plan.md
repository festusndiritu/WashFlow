# Laundry Management System — Full Implementation Plan

## Project Overview

A full-stack laundry business management system for a pickup-and-delivery laundry service. Features include order management, customer records, receipt generation, M-Pesa STK Push payments, WhatsApp order intake, role-based access for workers, and reporting.

---

## Repository Structure

Monorepo — one GitHub repo, two services. They are always deployed together, share no published packages, and have a single developer. Dokploy reads one `compose.yml` at the repo root.

```
laundry-app/                    # GitHub repo root
├── compose.yml                 # Dokploy reads this to build and run all services
├── .env.example                # Template for all required environment variables
├── .gitignore                  # Excludes .env, __pycache__, node_modules, dist
├── web/                        # Frontend service
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Orders.tsx
│       │   ├── OrderDetail.tsx
│       │   ├── NewOrder.tsx
│       │   ├── Customers.tsx
│       │   ├── Workers.tsx
│       │   ├── Reports.tsx
│       │   └── PrintReceipt.tsx
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── OrderCard.tsx
│       │   ├── MpesaButton.tsx
│       │   ├── ReceiptTemplate.tsx
│       │   └── ProtectedRoute.tsx
│       ├── api/
│       │   └── client.ts       # Axios instance with JWT interceptor
│       ├── hooks/
│       │   ├── useOrders.ts
│       │   ├── useCustomers.ts
│       │   └── useReports.ts
│       ├── store/
│       │   └── auth.ts         # Zustand store for user/token
│       └── types/
│           └── index.ts        # Shared TypeScript interfaces
└── api/                        # Backend service
    ├── Dockerfile
    ├── requirements.txt
    ├── alembic.ini
    └── app/
        ├── main.py             # FastAPI app, CORS, router registration
        ├── routers/
        │   ├── auth.py
        │   ├── orders.py
        │   ├── customers.py
        │   ├── payments.py     # M-Pesa Daraja integration
        │   ├── whatsapp.py     # WhatsApp Business webhook
        │   ├── reports.py
        │   ├── receipts.py
        │   └── workers.py
        ├── models/
        │   ├── __init__.py
        │   ├── base.py
        │   ├── user.py
        │   ├── customer.py
        │   ├── order.py
        │   ├── order_item.py
        │   ├── payment.py
        │   └── receipt.py
        ├── schemas/            # Pydantic request/response models
        │   ├── auth.py
        │   ├── order.py
        │   ├── customer.py
        │   ├── payment.py
        │   └── report.py
        ├── services/
        │   ├── mpesa.py        # Daraja API calls
        │   ├── whatsapp.py     # Message parsing and reply logic
        │   └── pdf.py          # WeasyPrint receipt generation
        ├── core/
        │   ├── config.py       # Pydantic settings from env vars
        │   ├── auth.py         # JWT encode/decode, password hashing
        │   └── db.py           # SQLAlchemy engine and session
        └── migrations/
            └── versions/       # Alembic migration files
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | SPA, served by Nginx |
| Styling | Tailwind CSS | Utility-first, no component library needed |
| State / data fetching | React Query (TanStack Query) + Zustand | Server state vs client state |
| Backend | Python 3.12 + FastAPI | Async, auto-generates OpenAPI docs at `/api/docs` |
| ORM | SQLAlchemy 2.0 + Alembic | ORM for models, Alembic for migrations |
| Database | PostgreSQL 16 | Persisted via Docker volume |
| Auth | JWT (python-jose) + bcrypt (passlib) | Role claim in token: `admin` or `worker` |
| PDF | WeasyPrint | Renders Jinja2 HTML templates to PDF |
| Payments | Safaricom Daraja API | STK Push + callback |
| WhatsApp | Meta WhatsApp Business Cloud API | Webhook receiver + reply sender |
| Web server | Nginx (Alpine) | Serves React build, proxies /api to FastAPI |
| Deployment | Dokploy on VPS | Podman containers via compose.yml |

---

## Deployment Architecture

```
Internet
    │  HTTPS (Traefik handles TLS via Let's Encrypt — Dokploy manages this)
    ▼
VPS running Dokploy
    │
    ├── web container  (Nginx, port 80 internally)
    │       ├── serves /  →  React SPA (dist/)
    │       └── proxies /api/*  →  api:8000
    │
    ├── api container  (uvicorn, port 8000 internally, NOT exposed publicly)
    │       └── connects to db:5432
    │
    └── db container   (PostgreSQL, port 5432 internally, NOT exposed publicly)
            └── volume: pg_data (persisted on VPS disk)

All three share one internal Podman network: laundry_net
```

### compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    networks:
      - laundry_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: .env
    networks:
      - laundry_net
    depends_on:
      db:
        condition: service_healthy

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    restart: unless-stopped
    networks:
      - laundry_net
    depends_on:
      - api
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.laundry.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.laundry.entrypoints=websecure"
      - "traefik.http.routers.laundry.tls.certresolver=letsencrypt"

volumes:
  pg_data:

networks:
  laundry_net:
    driver: bridge
```

### web/Dockerfile

```dockerfile
# Stage 1: build React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### web/nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to FastAPI container
    location /api/ {
        proxy_pass http://api:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing: unknown paths serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### api/Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app

# Install system deps for WeasyPrint
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b \
    libffi-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Entrypoint: run migrations then start server
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

### api/entrypoint.sh

```bash
#!/bin/bash
set -e
echo "Running database migrations..."
alembic upgrade head
echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Database Schema

Create these tables via Alembic migrations.

### users
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          VARCHAR(100) NOT NULL
email         VARCHAR(150) UNIQUE NOT NULL
hashed_password TEXT NOT NULL
role          VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'worker'))
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()
```

### customers
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          VARCHAR(100) NOT NULL
phone         VARCHAR(20) UNIQUE NOT NULL   -- used for M-Pesa STK push
email         VARCHAR(150)
address       TEXT
notes         TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

### orders
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
customer_id   UUID REFERENCES customers(id)
worker_id     UUID REFERENCES users(id)     -- assigned worker (nullable)
status        VARCHAR(20) NOT NULL DEFAULT 'received'
              -- received | assigned | cleaning | ready | delivered | paid
source        VARCHAR(20) DEFAULT 'manual'  -- manual | whatsapp
pickup_date   DATE
delivery_date DATE
notes         TEXT
total_amount  NUMERIC(10,2)
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```

### order_items
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
order_id      UUID REFERENCES orders(id) ON DELETE CASCADE
item_name     VARCHAR(100) NOT NULL         -- e.g. "Shirt", "Trouser", "Bedsheet"
quantity      INTEGER NOT NULL DEFAULT 1
unit_price    NUMERIC(10,2) NOT NULL
```

### payments
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
order_id      UUID REFERENCES orders(id)
amount        NUMERIC(10,2) NOT NULL
method        VARCHAR(20) DEFAULT 'mpesa'   -- mpesa | cash
mpesa_ref     VARCHAR(50)                   -- M-Pesa confirmation code
checkout_request_id VARCHAR(100)            -- Daraja CheckoutRequestID for callback matching
status        VARCHAR(20) DEFAULT 'pending' -- pending | completed | failed
initiated_at  TIMESTAMPTZ DEFAULT now()
completed_at  TIMESTAMPTZ
```

### receipts
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
order_id      UUID REFERENCES orders(id)
pdf_path      TEXT                          -- path on disk inside container
created_at    TIMESTAMPTZ DEFAULT now()
printed_at    TIMESTAMPTZ                   -- set when admin clicks Print
```

---

## Backend Implementation

### api/requirements.txt
```
fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy==2.0.31
alembic==1.13.2
psycopg2-binary==2.9.9
pydantic==2.8.0
pydantic-settings==2.3.4
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
httpx==0.27.0
weasyprint==62.3
jinja2==3.1.4
```

### app/core/config.py
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    MPESA_CONSUMER_KEY: str
    MPESA_CONSUMER_SECRET: str
    MPESA_SHORTCODE: str
    MPESA_PASSKEY: str
    MPESA_CALLBACK_URL: str  # must be public HTTPS URL

    WHATSAPP_VERIFY_TOKEN: str
    WHATSAPP_ACCESS_TOKEN: str
    WHATSAPP_PHONE_NUMBER_ID: str

    class Config:
        env_file = ".env"

settings = Settings()
```

### app/core/auth.py
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise credentials_exception
        return {"id": user_id, "role": role}
    except JWTError:
        raise credentials_exception

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
```

### app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, orders, customers, payments, whatsapp, reports, receipts, workers

app = FastAPI(title="Laundry Management API", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server; Nginx handles prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/auth",       tags=["auth"])
app.include_router(orders.router,     prefix="/orders",     tags=["orders"])
app.include_router(customers.router,  prefix="/customers",  tags=["customers"])
app.include_router(payments.router,   prefix="/payments",   tags=["payments"])
app.include_router(whatsapp.router,   prefix="/whatsapp",   tags=["whatsapp"])
app.include_router(reports.router,    prefix="/reports",    tags=["reports"])
app.include_router(receipts.router,   prefix="/receipts",   tags=["receipts"])
app.include_router(workers.router,    prefix="/workers",    tags=["workers"])
```

### app/routers/orders.py — key patterns
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.auth import get_current_user, require_admin
from ..core.db import get_db
from ..models.order import Order
from ..schemas.order import OrderCreate, OrderUpdate, OrderResponse

router = APIRouter()

@router.get("/", response_model=list[OrderResponse])
async def list_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user["role"] == "admin":
        return db.query(Order).order_by(Order.created_at.desc()).all()
    # Workers only see orders assigned to them
    return db.query(Order).filter(Order.worker_id == current_user["id"]).all()

@router.post("/", response_model=OrderResponse, dependencies=[Depends(require_admin)])
async def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    order = Order(**payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

@router.patch("/{order_id}/status")
async def update_status(order_id: str, status: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Workers can only update their own assigned orders
    if current_user["role"] == "worker" and str(order.worker_id) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    order.status = status
    db.commit()
    return {"status": order.status}
```

---

## M-Pesa STK Push (Daraja API)

### app/services/mpesa.py
```python
import httpx
import base64
from datetime import datetime
from ..core.config import settings

async def get_access_token() -> str:
    credentials = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {credentials}"}
        )
        return r.json()["access_token"]

async def stk_push(phone: str, amount: int, order_id: str) -> dict:
    token = await get_access_token()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
    ).decode()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,          # Customer phone: 2547XXXXXXXX format
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": f"ORDER-{order_id[:8].upper()}",
        "TransactionDesc": "Laundry payment"
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        return r.json()
```

### app/routers/payments.py
```python
@router.post("/stk-push", dependencies=[Depends(require_admin)])
async def initiate_stk_push(order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    result = await stk_push(customer.phone, int(order.total_amount), order_id)

    payment = Payment(
        order_id=order_id,
        amount=order.total_amount,
        method="mpesa",
        checkout_request_id=result.get("CheckoutRequestID"),
        status="pending"
    )
    db.add(payment)
    db.commit()
    return {"message": "STK push sent", "checkout_request_id": result.get("CheckoutRequestID")}

@router.post("/mpesa-callback")  # Public endpoint — Safaricom posts here
async def mpesa_callback(payload: dict, db: Session = Depends(get_db)):
    body = payload.get("Body", {}).get("stkCallback", {})
    checkout_id = body.get("CheckoutRequestID")
    result_code = body.get("ResultCode")

    payment = db.query(Payment).filter(Payment.checkout_request_id == checkout_id).first()
    if not payment:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    if result_code == 0:  # Success
        items = {i["Name"]: i["Value"] for i in body["CallbackMetadata"]["Item"]}
        payment.status = "completed"
        payment.mpesa_ref = items.get("MpesaReceiptNumber")
        payment.completed_at = datetime.utcnow()
        # Mark the order as paid
        order = db.query(Order).filter(Order.id == payment.order_id).first()
        order.status = "paid"
    else:
        payment.status = "failed"

    db.commit()
    return {"ResultCode": 0, "ResultDesc": "Accepted"}
```

---

## WhatsApp Order Intake

### app/routers/whatsapp.py
```python
from fastapi import APIRouter, Request, Query
from ..core.config import settings
from ..services.whatsapp import parse_order_from_message, send_reply

router = APIRouter()

# Webhook verification (Meta requires this GET endpoint)
@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token")
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    return {"error": "Verification failed"}

# Incoming messages
@router.post("/webhook")
async def receive_message(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    try:
        entry = data["entry"][0]["changes"][0]["value"]
        message = entry["messages"][0]
        from_number = message["from"]     # e.g. "254712345678"
        text = message["text"]["body"]
        wa_message_id = message["id"]
    except (KeyError, IndexError):
        return {"status": "ignored"}

    # Find or create customer by phone number
    customer = db.query(Customer).filter(Customer.phone == from_number).first()
    if not customer:
        customer = Customer(phone=from_number, name=f"WA {from_number[-4:]}")
        db.add(customer)
        db.flush()

    # Create a draft order
    order = Order(customer_id=customer.id, status="received", source="whatsapp", notes=text)
    db.add(order)
    db.commit()

    # Auto-reply with ticket number
    short_id = str(order.id)[:8].upper()
    await send_reply(from_number, f"Hi! Your order #{short_id} has been received. We'll confirm pickup details shortly.")
    return {"status": "ok"}
```

### app/services/whatsapp.py
```python
import httpx
from ..core.config import settings

async def send_reply(to: str, message: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": message}
            },
            headers={"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}
        )
```

---

## Receipt Generation

### app/services/pdf.py
```python
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader
from pathlib import Path

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
OUTPUT_DIR = Path("/app/receipts")
OUTPUT_DIR.mkdir(exist_ok=True)

def generate_receipt_pdf(order: dict, customer: dict, items: list, payment: dict) -> str:
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template("receipt.html")
    html_content = template.render(order=order, customer=customer, items=items, payment=payment)

    output_path = OUTPUT_DIR / f"receipt-{order['id'][:8]}.pdf"
    HTML(string=html_content).write_pdf(str(output_path))
    return str(output_path)
```

### app/templates/receipt.html (thermal 80mm layout)
```html
<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: monospace; font-size: 11px; width: 72mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; }
  .total { font-size: 13px; font-weight: bold; }
</style>
</head>
<body>
  <div class="center bold" style="font-size:14px">FRESH CLEAN LAUNDRY</div>
  <div class="center">Tel: 0700 000 000</div>
  <div class="line"></div>
  <div class="row"><span>Order #:</span><span>{{ order.id[:8].upper() }}</span></div>
  <div class="row"><span>Date:</span><span>{{ order.created_at.strftime('%d/%m/%Y %H:%M') }}</span></div>
  <div class="row"><span>Customer:</span><span>{{ customer.name }}</span></div>
  <div class="row"><span>Phone:</span><span>{{ customer.phone }}</span></div>
  <div class="line"></div>
  {% for item in items %}
  <div class="row">
    <span>{{ item.item_name }} x{{ item.quantity }}</span>
    <span>KES {{ "%.0f"|format(item.unit_price * item.quantity) }}</span>
  </div>
  {% endfor %}
  <div class="line"></div>
  <div class="row total"><span>TOTAL</span><span>KES {{ "%.0f"|format(order.total_amount) }}</span></div>
  <div class="row"><span>Status:</span><span>{{ payment.status.upper() if payment else 'UNPAID' }}</span></div>
  {% if payment and payment.mpesa_ref %}
  <div class="row"><span>M-Pesa Ref:</span><span>{{ payment.mpesa_ref }}</span></div>
  {% endif %}
  <div class="line"></div>
  <div class="center">Thank you for choosing us!</div>
</body>
</html>
```

---

## Frontend Implementation

### src/api/client.ts
```typescript
import axios from 'axios'
import { useAuthStore } from '../store/auth'

const client = axios.create({
  baseURL: '/api',  // Nginx proxies this to FastAPI
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
```

### src/store/auth.ts
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: { id: string; name: string; role: 'admin' | 'worker' } | null
  setAuth: (token: string, user: AuthState['user']) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'laundry-auth' }
  )
)
```

### src/components/ProtectedRoute.tsx
```typescript
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

interface Props {
  children: React.ReactNode
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: Props) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/orders" replace />
  return <>{children}</>
}
```

### src/hooks/useOrders.ts
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => client.get('/orders').then(r => r.data),
    refetchInterval: 30_000,  // Poll every 30s for status updates
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      client.patch(`/orders/${id}/status`, null, { params: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
```

### Order status pipeline (UI status badge colors)
```typescript
// src/types/index.ts
export type OrderStatus = 'received' | 'assigned' | 'cleaning' | 'ready' | 'delivered' | 'paid'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received:  'Received',
  assigned:  'Assigned',
  cleaning:  'Cleaning',
  ready:     'Ready',
  delivered: 'Delivered',
  paid:      'Paid',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  received:  'bg-gray-100 text-gray-700',
  assigned:  'bg-blue-100 text-blue-700',
  cleaning:  'bg-yellow-100 text-yellow-700',
  ready:     'bg-green-100 text-green-700',
  delivered: 'bg-teal-100 text-teal-700',
  paid:      'bg-emerald-100 text-emerald-700',
}
```

### Print receipt (browser print, no PDF needed for quick printing)
```typescript
// src/pages/PrintReceipt.tsx
// Add this CSS to index.css:
// @media print { .no-print { display: none; } @page { size: 80mm auto; margin: 4mm; } }

export function PrintReceipt() {
  const { id } = useParams()
  const { data: order } = useQuery({ queryKey: ['order', id], queryFn: () => client.get(`/orders/${id}`).then(r => r.data) })

  useEffect(() => {
    if (order) window.print()
  }, [order])

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, width: 288 }}>
      {/* Receipt layout — same structure as HTML template above */}
    </div>
  )
}
```

---

## Role Permissions Reference

| Feature | Admin | Worker |
|---|---|---|
| View all orders | Yes | No (own only) |
| Create orders | Yes | No |
| Edit order details | Yes | No |
| Update order status | Yes | Yes (own only) |
| Assign worker to order | Yes | No |
| View all customers | Yes | No |
| Create/edit customers | Yes | No |
| Trigger M-Pesa STK push | Yes | No |
| View payment records | Yes | No |
| Generate/print receipts | Yes | No |
| View reports | Yes | No |
| Create/deactivate workers | Yes | No |

---

## Environment Variables

### .env.example
```bash
# Database
POSTGRES_DB=laundry
POSTGRES_USER=laundry_user
POSTGRES_PASSWORD=change_me_strong_password
DATABASE_URL=postgresql://laundry_user:change_me_strong_password@db:5432/laundry

# JWT
SECRET_KEY=change_me_64_char_random_string
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"

# M-Pesa (Safaricom Daraja)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa-callback

# WhatsApp Business Cloud API (Meta Developer Console)
WHATSAPP_VERIFY_TOKEN=pick_any_random_string
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

Set `DATABASE_URL`, `SECRET_KEY`, and all secrets in **Dokploy's environment variable panel**, not in a committed `.env` file.

---

## Build Phases

### Phase 1 — Scaffold & auth (Week 1)
- Initialize monorepo: `web/` with Vite+React+TS, `api/` with FastAPI skeleton
- Write both Dockerfiles and `compose.yml`
- Implement login endpoint, JWT generation, `get_current_user` + `require_admin` dependencies
- Frontend: Login page, Zustand auth store, Axios interceptor, ProtectedRoute
- Deploy the empty shell to Dokploy and confirm it builds and serves correctly
- **Done when:** You can log in, get a JWT, and hit a protected route

### Phase 2 — Orders & customers (Week 2)
- Alembic: create all tables (users, customers, orders, order_items)
- Full CRUD for orders and customers
- Worker assignment and status update endpoint
- Frontend: Orders list, OrderDetail, NewOrder form, Customers page
- Role-based filtering (workers see own orders only)
- **Done when:** Admin can create an order, assign a worker, worker can update status

### Phase 3 — Receipts & printing (Week 3)
- WeasyPrint PDF generation from Jinja2 template
- `GET /receipts/:order_id` returns PDF file
- PrintReceipt React page with `window.print()` and thermal CSS
- Track `printed_at` timestamp on receipt record
- **Done when:** Admin can open an order, click Print, and get a thermal receipt

### Phase 4 — M-Pesa payments (Week 4)
- Daraja API service: access token, STK push, callback handler
- Payment records in DB, optimistic UI update on frontend
- MpesaButton component that shows pending/completed/failed state
- Test with Daraja sandbox before going live
- **Done when:** Admin triggers STK push, customer confirms on phone, order auto-marks as paid

### Phase 5 — WhatsApp intake (Week 5)
- Register webhook URL in Meta Developer Console
- GET verification endpoint, POST message handler
- Customer lookup/creation by phone, draft order creation
- Auto-reply with order ticket number
- WhatsApp orders appear in dashboard with `source: whatsapp` badge
- **Done when:** Customer messages the WhatsApp number, order appears in dashboard

### Phase 6 — Reports & polish (Week 6)
- Reports API: revenue by period, orders by status, worker performance
- Frontend: Recharts bar chart (revenue), donut chart (orders by status), worker table
- UI polish: loading skeletons, error boundaries, empty states
- Production hardening: structured logging, rate limiting on callback endpoints
- **Done when:** Reports load correctly, app is stable under normal use

---

## Dokploy Deployment Steps

1. Push repo to GitHub
2. In Dokploy: New Project → Docker Compose → connect GitHub repo → select `compose.yml`
3. Add all environment variables in Dokploy's env panel (not in the repo)
4. Set your domain in Dokploy → Dokploy auto-configures Traefik + Let's Encrypt HTTPS
5. Enable auto-deploy on push (Dokploy adds a GitHub webhook)
6. Every `git push origin main` → Dokploy rebuilds images → rolls out new containers

For the M-Pesa callback and WhatsApp webhook to work, HTTPS must be live before registering those URLs.

---

## Notes for the Agent

- The `api` service depends on `db` with a healthcheck — do not skip the healthcheck condition, or FastAPI will start before Postgres is ready and migrations will fail
- Alembic runs on every container start via `entrypoint.sh` — this is safe because Alembic is idempotent
- Phone numbers for M-Pesa must be in `2547XXXXXXXX` format — strip leading `0` or `+` on input
- The WhatsApp webhook GET endpoint must return the `hub.challenge` value as a plain integer, not JSON
- WeasyPrint requires system libraries (pango, harfbuzz) — they are installed in the Dockerfile above
- The M-Pesa callback endpoint must be publicly reachable — do not put it behind auth middleware
- Receipt PDFs are stored in `/app/receipts/` inside the `api` container — add a volume if you want them to persist across deploys
- For local development: `docker compose up --build` at the repo root works the same as Dokploy
