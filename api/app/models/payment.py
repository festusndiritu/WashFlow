import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), index=True)
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(20), default="cash", nullable=False)  # cash | mpesa
    mpesa_ref: Mapped[str | None] = mapped_column(String(50), nullable=True)
    citapay_reference: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)  # pending | completed | failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
