from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings as app_settings
from .core.db import Base, engine
from .routers import auth, customers, expenses, orders, payments, platform, reports, services, settings as settings_router, shops, team

app = FastAPI(title="Laundry SaaS API", docs_url="/api/docs", redirect_slashes=False)

origins = [origin.strip() for origin in app_settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    # Bootstrap tables for initial development; switch to Alembic as next step.
    Base.metadata.create_all(bind=engine)
    # Add columns to existing tables that were introduced after initial migration.
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS worker_id VARCHAR(36)"))
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_date DATE"))
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE"))
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual'"))
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'"))
        conn.execute(text("ALTER TABLE payments ADD COLUMN IF NOT EXISTS citapay_reference VARCHAR(100)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payments_citapay_reference ON payments (citapay_reference) WHERE citapay_reference IS NOT NULL"))
        conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'"))
        conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan VARCHAR(30) NOT NULL DEFAULT 'free'"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS expenses (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                shop_id VARCHAR(36) REFERENCES shops(id) ON DELETE SET NULL,
                amount NUMERIC(10,2) NOT NULL,
                category VARCHAR(30) NOT NULL DEFAULT 'other',
                description TEXT NOT NULL,
                reference VARCHAR(100),
                expense_date DATE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.commit()


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(shops.router, prefix="/shops", tags=["shops"])
app.include_router(customers.router, prefix="/customers", tags=["customers"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(team.router, prefix="/team", tags=["team"])
app.include_router(platform.router, prefix="/platform", tags=["platform"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(services.router, prefix="/services", tags=["services"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
