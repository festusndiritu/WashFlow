import hashlib
import hmac
import json
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.db import get_db
from ..deps import Identity, get_current_identity, get_membership_for_identity
from ..models import MembershipRole, Order
from ..models.payment import Payment
from ..schemas.payment import PaymentCreate, PaymentResponse
from ..services.citapay import (
    TERMINAL_STATUSES,
    STATUS_COMPLETED,
    STATUS_FAILED,
    cancel_transaction,
    get_transaction_status,
    send_stk_push,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Cash / manual payment ─────────────────────────────────────────────────────

@router.post("", response_model=PaymentResponse, status_code=201)
def record_payment(
    payload: PaymentCreate,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Payment:
    get_membership_for_identity(db, identity)
    if identity.role == MembershipRole.WORKER.value:
        raise HTTPException(status_code=403, detail="Workers cannot record payments")

    order = db.query(Order).filter(
        Order.id == payload.order_id,
        Order.tenant_id == identity.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = Payment(
        tenant_id=identity.tenant_id,
        shop_id=order.shop_id,
        order_id=order.id,
        amount=payload.amount,
        method=payload.method,
        mpesa_ref=payload.mpesa_ref,
        notes=payload.notes,
        status="completed",
    )
    db.add(payment)
    order.payment_status = "paid"
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/order/{order_id}", response_model=list[PaymentResponse])
def list_order_payments(
    order_id: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> list[Payment]:
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == identity.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return (
        db.query(Payment)
        .filter(Payment.order_id == order_id)
        .order_by(Payment.created_at.desc())
        .all()
    )


# ── CitaPay STK Push ──────────────────────────────────────────────────────────

class STKPushPayload(BaseModel):
    order_id: str
    phone: str


@router.post("/stk-push")
async def initiate_stk_push(
    payload: STKPushPayload,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Any:
    """Send an M-Pesa STK Push prompt to the customer's phone via CitaPay."""
    get_membership_for_identity(db, identity)
    if identity.role == MembershipRole.WORKER.value:
        raise HTTPException(status_code=403, detail="Workers cannot initiate payments")

    order = db.query(Order).filter(
        Order.id == payload.order_id,
        Order.tenant_id == identity.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        result = await send_stk_push(
            phone=payload.phone,
            amount=int(order.total_amount),
            order_id=order.id,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"CitaPay error {exc.response.status_code}: {exc.response.text[:200]}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Could not reach CitaPay: {exc}") from exc

    if result is None:
        raise HTTPException(
            status_code=503,
            detail="CitaPay not configured. Set CITAPAY_API_KEY in environment.",
        )

    # Create a pending payment record so we can track it without waiting for webhook
    reference = result.get("reference") or result.get("transactionId") or ""
    pending = Payment(
        tenant_id=order.tenant_id,
        shop_id=order.shop_id,
        order_id=order.id,
        amount=float(order.total_amount),
        method="mpesa",
        citapay_reference=reference,
        notes=f"STK Push initiated to {payload.phone}",
        status="pending",
    )
    db.add(pending)
    db.commit()

    return {
        "message": "STK Push sent — waiting for customer to approve on phone",
        "reference": reference,
        "transaction_id": result.get("transactionId"),
        "payment_id": pending.id,
    }


@router.get("/status/{reference}")
async def poll_transaction_status(
    reference: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Any:
    """
    Poll CitaPay for the current status of a pending STK transaction.
    Also syncs the local payment record and order.payment_status if completed/failed.
    Status values from CitaPay: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED.
    """
    get_membership_for_identity(db, identity)

    try:
        status_data = await get_transaction_status(reference)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"CitaPay error {exc.response.status_code}: {exc.response.text[:200]}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Could not reach CitaPay: {exc}") from exc

    if status_data is None:
        raise HTTPException(status_code=404, detail="Transaction not found or CitaPay not configured")

    citapay_status = (status_data.get("status") or "").upper()

    # Sync local pending payment if terminal status reached
    if citapay_status in TERMINAL_STATUSES:
        payment = db.query(Payment).filter(
            Payment.citapay_reference == reference,
            Payment.tenant_id == identity.tenant_id,
        ).first()

        if payment and payment.status == "pending":
            if citapay_status == STATUS_COMPLETED:
                payment.status = "completed"
                # externalReference = M-Pesa receipt number (null until COMPLETED)
                payment.mpesa_ref = status_data.get("externalReference")
                order = db.query(Order).filter(Order.id == payment.order_id).first()
                if order:
                    order.payment_status = "paid"
                logger.info("Payment %s completed via poll (ref=%s)", payment.id, reference)
            else:
                payment.status = "failed"
                logger.info("Payment %s %s via poll (ref=%s)", payment.id, citapay_status, reference)
            db.commit()

    return {
        "reference": reference,
        "status": citapay_status,
        "amount": status_data.get("amount"),
        "phone": status_data.get("customerPhone"),
        "mpesa_receipt": status_data.get("externalReference"),
        "order_id": (status_data.get("metadata") or {}).get("order_id"),
    }


@router.post("/cancel/{reference}")
async def cancel_stk_push(
    reference: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Any:
    """Cancel a pending CitaPay STK Push. Safe to call on already-completed transactions."""
    get_membership_for_identity(db, identity)
    if identity.role == MembershipRole.WORKER.value:
        raise HTTPException(status_code=403, detail="Workers cannot cancel payments")

    # Verify this payment belongs to this tenant
    payment = db.query(Payment).filter(
        Payment.citapay_reference == reference,
        Payment.tenant_id == identity.tenant_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    try:
        result = await cancel_transaction(reference)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"CitaPay error {exc.response.status_code}: {exc.response.text[:200]}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Could not reach CitaPay: {exc}") from exc

    if result is None:
        raise HTTPException(status_code=503, detail="CitaPay not configured")

    # Sync local status if cancelled
    if result.get("cancelled") and payment.status == "pending":
        payment.status = "failed"
        db.commit()

    return result

@router.post("/citapay-webhook")
async def citapay_webhook(request: Request, db: Session = Depends(get_db)) -> Any:
    """
    CitaPay webhook: payment.completed / payment.failed.
    Verifies HMAC-SHA256 signature from X-CitaPay-Signature header.
    """
    raw_body = await request.body()

    if settings.CITAPAY_WEBHOOK_SECRET:
        sig_header = request.headers.get("x-citapay-signature", "")
        expected = hmac.new(
            settings.CITAPAY_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig_header):
            logger.warning("CitaPay webhook signature mismatch — ignoring")
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        body = json.loads(raw_body)
        event = body.get("event", "")
        data = body.get("data", {})

        if event == "payment.completed":
            order_id = data.get("metadata", {}).get("order_id", "")
            ref = data.get("reference", "")
            if not order_id:
                logger.warning("CitaPay webhook: no order_id in metadata")
                return {"received": True}

            order = db.query(Order).filter(Order.id == order_id).first()
            if not order:
                return {"received": True}

            # Update existing pending payment if present; otherwise create one
            payment = (
                db.query(Payment).filter(Payment.citapay_reference == ref).first()
                if ref else None
            )

            mpesa_receipt = data.get("externalReference")  # M-Pesa receipt number

            if payment:
                payment.status = "completed"
                payment.mpesa_ref = mpesa_receipt or ref
                payment.notes = f"CitaPay STK. Phone: {data.get('customerPhone', '')}"
            else:
                payment = Payment(
                    tenant_id=order.tenant_id,
                    shop_id=order.shop_id,
                    order_id=order.id,
                    amount=float(data.get("amount", order.total_amount)),
                    method="mpesa",
                    mpesa_ref=mpesa_receipt or ref,
                    citapay_reference=ref,
                    notes=f"CitaPay STK. Phone: {data.get('customerPhone', '')}",
                    status="completed",
                )
                db.add(payment)

            if order.payment_status != "paid":
                order.payment_status = "paid"

            db.commit()
            logger.info("Order %s marked paid via CitaPay webhook (ref=%s receipt=%s)", order.id, ref, mpesa_receipt)

        elif event == "payment.failed":
            order_id = data.get("metadata", {}).get("order_id", "")
            ref = data.get("reference", "")
            if ref:
                payment = db.query(Payment).filter(Payment.citapay_reference == ref).first()
                if payment and payment.status == "pending":
                    payment.status = "failed"
                    db.commit()
            logger.info("CitaPay payment failed for order %s (ref=%s)", order_id, ref)

    except Exception as exc:
        logger.error("CitaPay webhook processing error: %s", exc)

    return {"received": True}
