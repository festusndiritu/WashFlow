"""CitaPay M-Pesa STK Push integration."""
import logging
import re
import uuid

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

_SANDBOX_BASE = "https://sandbox.citapayapi.citatech.cloud/api/v1"
_PROD_BASE = "https://citapayapi.citatech.cloud/api/v1"

# CitaPay terminal statuses (all uppercase from the API)
STATUS_COMPLETED = "COMPLETED"
STATUS_FAILED = "FAILED"
STATUS_CANCELLED = "CANCELLED"
STATUS_PENDING = "PENDING"
STATUS_PROCESSING = "PROCESSING"
TERMINAL_STATUSES = {STATUS_COMPLETED, STATUS_FAILED, STATUS_CANCELLED}


def _base_url() -> str:
    return _SANDBOX_BASE if settings.CITAPAY_ENV == "sandbox" else _PROD_BASE


def _normalize_phone(phone: str) -> str:
    """
    Normalize any Kenyan phone to 254XXXXXXXXX (12 digits) for CitaPay API calls.
    Accepts: 07xxx, 01xxx, 7xxx, 1xxx, +2547xxx, 2547xxx, 00254xxx.
    """
    p = re.sub(r"[\s\-\(\)]", "", phone).lstrip("+")
    if p.startswith("00254"):
        p = p[2:]          # 00254 → 254
    elif p.startswith("254"):
        pass               # already international
    elif p.startswith("0") and len(p) >= 9:
        p = "254" + p[1:]  # 07xxx / 01xxx → 254xxx
    elif (p.startswith("7") or p.startswith("1")) and len(p) == 9:
        p = "254" + p      # 7xxxxxxxx → 2547xxxxxxxx
    return p


def localize_phone(phone: str) -> str:
    """
    Convert any Kenyan phone format to local 07xxx / 01xxx (10 digits).
    Use for display and storage; use _normalize_phone() for API calls.
    """
    intl = _normalize_phone(phone)
    if intl.startswith("254") and len(intl) == 12:
        return "0" + intl[3:]
    return phone  # return as-is if unparseable


async def send_stk_push(
    phone: str,
    amount: int,
    order_id: str,
    customer_name: str = "",
    idempotency_key: str | None = None,
) -> dict | None:
    """
    Initiate an M-Pesa STK Push via CitaPay.

    Returns the CitaPay response dict on success, None if CitaPay is not
    configured. Raises httpx.HTTPError on network/HTTP failure.

    Docs response fields: transactionId, reference, status ("PENDING"), amount,
    currency, customerPhone, createdAt.
    """
    if not settings.CITAPAY_API_KEY:
        return None

    phone_fmt = _normalize_phone(phone)
    idem_key = idempotency_key or str(uuid.uuid4())

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{_base_url()}/checkout/payments",
                headers={
                    "Authorization": f"Bearer {settings.CITAPAY_API_KEY}",
                    "Content-Type": "application/json",
                    "Idempotency-Key": idem_key,
                },
                json={
                    "amount": max(1, amount),
                    "paymentMethod": "MPESA",
                    "phoneNumber": phone_fmt,
                    "customerName": customer_name or None,
                    "metadata": {"order_id": order_id},
                },
            )
            res.raise_for_status()
            data = res.json()
            logger.info(
                "CitaPay STK Push initiated: order=%s phone=%s ref=%s txn=%s",
                order_id, phone_fmt, data.get("reference"), data.get("transactionId"),
            )
            return data
    except httpx.HTTPStatusError as exc:
        logger.error(
            "CitaPay STK Push HTTP error %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise
    except Exception as exc:
        logger.error("CitaPay STK Push failed: %s", exc)
        raise


async def get_transaction_status(reference: str) -> dict | None:
    """
    Poll CitaPay for the current status of a transaction by its reference.

    Docs response fields: reference, status (PENDING|PROCESSING|COMPLETED|FAILED|CANCELLED),
    amount, currency, externalReference (M-Pesa receipt), metadata, createdAt, completedAt,
    failedAt, failReason.
    Returns None if CitaPay not configured or transaction not found (404).
    """
    if not settings.CITAPAY_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                f"{_base_url()}/checkout/payments/{reference}",
                headers={"Authorization": f"Bearer {settings.CITAPAY_API_KEY}"},
            )
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return None
        logger.error(
            "CitaPay status check HTTP error %s for ref %s: %s",
            exc.response.status_code, reference, exc.response.text,
        )
        raise
    except Exception as exc:
        logger.error("CitaPay status check failed for ref %s: %s", reference, exc)
        raise


async def cancel_transaction(reference: str) -> dict | None:
    """
    Cancel a pending CitaPay STK transaction.
    Safe to call on already-terminal transactions — returns current status with cancelled=false.
    Returns None if CitaPay not configured.
    """
    if not settings.CITAPAY_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{_base_url()}/checkout/transactions/{reference}/cancel",
                headers={"Authorization": f"Bearer {settings.CITAPAY_API_KEY}"},
            )
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "CitaPay cancel HTTP error %s for ref %s: %s",
            exc.response.status_code, reference, exc.response.text,
        )
        raise
    except Exception as exc:
        logger.error("CitaPay cancel failed for ref %s: %s", reference, exc)
        raise



def _normalize_phone(phone: str) -> str:
    """
    Normalize any Kenyan phone format to 2547XXXXXXXX / 2541XXXXXXXX.
    Accepts: 07xxx, 01xxx, 7xxx, 1xxx, +2547xxx, 2547xxx, 00254xxx.
    """
    p = re.sub(r"[\s\-\(\)]", "", phone).lstrip("+")
    if p.startswith("00254"):
        p = p[2:]          # 00254 → 254
    elif p.startswith("254"):
        pass               # already international
    elif p.startswith("0") and len(p) >= 9:
        p = "254" + p[1:]  # 07xxx / 01xxx → 254xxx
    elif (p.startswith("7") or p.startswith("1")) and len(p) == 9:
        p = "254" + p      # 7xxxxxxxx → 2547xxxxxxxx
    return p


def localize_phone(phone: str) -> str:
    """
    Convert any Kenyan phone format to local 07xxx / 01xxx (10 digits).
    Suitable for display and storage.
    """
    intl = _normalize_phone(phone)
    if intl.startswith("254") and len(intl) == 12:
        return "0" + intl[3:]
    return phone  # return as-is if we can't parse it


async def send_stk_push(
    phone: str,
    amount: int,
    order_id: str,
    customer_name: str = "",
) -> dict | None:
    """
    Initiate an M-Pesa STK Push via CitaPay.

    Returns the CitaPay response dict on success, None if CitaPay is not
    configured. Raises httpx.HTTPError on network/HTTP failure.
    """
    if not settings.CITAPAY_API_KEY:
        return None

    phone_fmt = _normalize_phone(phone)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{_base_url()}/checkout/payments",
                headers={
                    "Authorization": f"Bearer {settings.CITAPAY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "amount": max(1, amount),
                    "paymentMethod": "MPESA",
                    "phoneNumber": phone_fmt,
                    "customerName": customer_name or None,
                    "metadata": {
                        "order_id": order_id,
                    },
                },
            )
            res.raise_for_status()
            data = res.json()
            logger.info(
                "CitaPay STK Push initiated: order=%s phone=%s ref=%s",
                order_id,
                phone_fmt,
                data.get("reference"),
            )
            return data
    except httpx.HTTPStatusError as exc:
        logger.error(
            "CitaPay STK Push HTTP error %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise
    except Exception as exc:
        logger.error("CitaPay STK Push failed: %s", exc)
        raise


async def get_transaction_status(reference: str) -> dict | None:
    """
    Poll CitaPay for the current status of a transaction by its reference.

    Returns the CitaPay status dict or None if not configured / not found.
    Expected response fields: status ('pending'|'completed'|'failed'),
    reference, amount, customerPhone, metadata.
    """
    if not settings.CITAPAY_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                f"{_base_url()}/checkout/payments/{reference}",
                headers={"Authorization": f"Bearer {settings.CITAPAY_API_KEY}"},
            )
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return None
        logger.error(
            "CitaPay status check HTTP error %s for ref %s: %s",
            exc.response.status_code,
            reference,
            exc.response.text,
        )
        raise
    except Exception as exc:
        logger.error("CitaPay status check failed for ref %s: %s", reference, exc)
        raise
