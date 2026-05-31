import uuid
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class MembershipRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    WORKER = "worker"


class MembershipScope(StrEnum):
    ALL_SHOPS = "all_shops"
    SINGLE_SHOP = "single_shop"


class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    shop_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("shops.id", ondelete="SET NULL"), nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(20), default=MembershipRole.WORKER.value, nullable=False)
    scope: Mapped[str] = mapped_column(String(20), default=MembershipScope.SINGLE_SHOP.value, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="memberships")
    tenant = relationship("Tenant", back_populates="memberships")
    shop = relationship("Shop", back_populates="memberships")
