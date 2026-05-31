import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    shop_id: Mapped[str] = mapped_column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), index=True)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), index=True)
    worker_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="received", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(20), default="unpaid", nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)  # manual | whatsapp
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pickup_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    items: Mapped[list["OrderItem"]] = relationship(  # type: ignore[name-defined]
        "OrderItem", lazy="selectin", cascade="all, delete-orphan"
    )
