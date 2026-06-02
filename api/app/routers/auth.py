import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import TokenDecodeError, create_access_token, decode_access_token, hash_password, verify_password
from ..deps import Identity, can_access_shop, get_current_identity
from ..models import Membership, MembershipRole, MembershipScope, Shop, Tenant, User
from ..schemas.auth import AuthResponse, AuthUserResponse, GoogleAuthRequest, LoginRequest, PlatformBootstrapRequest, ShopSummary, SignupRequest, SwitchShopRequest, TenantSummary

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


_slug_non_alnum = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    lowered = value.strip().lower()
    slug = _slug_non_alnum.sub("-", lowered).strip("-")
    return slug or "shop"


def make_shop_code(name: str) -> str:
    base = "".join(ch for ch in name.upper() if ch.isalnum())[:6]
    if len(base) < 3:
        base = (base + "SHOP")[:4]
    return f"{base}-{secrets.token_hex(2).upper()}"


def resolve_active_shop_id(membership: Membership, shops: list[Shop], requested_shop_id: str | None = None) -> str | None:
    if requested_shop_id:
        if any(shop.id == requested_shop_id for shop in shops):
            return requested_shop_id
    if membership.shop_id and any(shop.id == membership.shop_id for shop in shops):
        return membership.shop_id
    if shops:
        return shops[0].id
    return None


def build_auth_payload(
    user: User,
    tenant: Tenant | None,
    membership: Membership | None,
    shops: list[Shop] | None,
    requested_shop_id: str | None = None,
) -> AuthResponse:
    tenant_shops = shops or []
    if tenant and membership:
        active_shop_id = resolve_active_shop_id(membership, tenant_shops, requested_shop_id=requested_shop_id)
    else:
        active_shop_id = None

    role = "platform_owner" if user.is_platform_owner and membership is None else (membership.role if membership else "worker")
    token = create_access_token(
        {
            "sub": user.id,
            "tenant_id": tenant.id if tenant else None,
            "role": role,
            "shop_id": active_shop_id,
            "platform_owner": user.is_platform_owner,
        }
    )
    return AuthResponse(
        access_token=token,
        user=AuthUserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=role,
            is_platform_owner=user.is_platform_owner,
        ),
        tenant=TenantSummary(id=tenant.id, name=tenant.name, slug=tenant.slug) if tenant else None,
        shops=[ShopSummary(id=s.id, name=s.name, code=s.code) for s in tenant_shops],
        active_shop_id=active_shop_id,
    )


@router.post("/platform-bootstrap", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def platform_bootstrap(payload: PlatformBootstrapRequest, db: Session = Depends(get_db)) -> AuthResponse:
    platform_owner_exists = db.query(User).filter(User.is_platform_owner.is_(True)).first()
    if platform_owner_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Platform owner already exists")

    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_platform_owner=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return build_auth_payload(user=user, tenant=None, membership=None, shops=[])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    base_slug = slugify(payload.business_name)
    candidate_slug = base_slug
    counter = 1
    while db.query(Tenant).filter(Tenant.slug == candidate_slug).first():
        counter += 1
        candidate_slug = f"{base_slug}-{counter}"

    tenant = Tenant(name=payload.business_name, slug=candidate_slug)
    first_shop = Shop(name=payload.first_shop_name, code=make_shop_code(payload.first_shop_name), tenant=tenant)
    owner = User(name=payload.owner_name, email=payload.email, hashed_password=hash_password(payload.password))
    membership = Membership(
        user=owner,
        tenant=tenant,
        shop=first_shop,
        role=MembershipRole.OWNER.value,
        scope=MembershipScope.ALL_SHOPS.value,
    )

    db.add_all([tenant, first_shop, owner, membership])
    db.commit()
    db.refresh(tenant)
    db.refresh(owner)
    db.refresh(membership)

    shops = db.query(Shop).filter(Shop.tenant_id == tenant.id).order_by(Shop.created_at.asc()).all()
    return build_auth_payload(owner, tenant, membership, shops)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.is_platform_owner:
        return build_auth_payload(user=user, tenant=None, membership=None, shops=[])

    membership = (
        db.query(Membership)
        .filter(Membership.user_id == user.id)
        .order_by(Membership.created_at.asc())
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tenant membership found")

    tenant = db.query(Tenant).filter(Tenant.id == membership.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    if membership.role == MembershipRole.OWNER.value or membership.scope == MembershipScope.ALL_SHOPS.value:
        shops = db.query(Shop).filter(Shop.tenant_id == membership.tenant_id).order_by(Shop.created_at.asc()).all()
    elif membership.shop_id:
        shops = db.query(Shop).filter(Shop.id == membership.shop_id).all()
    else:
        shops = []

    return build_auth_payload(user, tenant, membership, shops)


@router.get("/me", response_model=AuthResponse)
def me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> AuthResponse:
    try:
        payload = decode_access_token(token)
    except TokenDecodeError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if payload.get("platform_owner"):
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id, User.is_platform_owner.is_(True)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return build_auth_payload(user=user, tenant=None, membership=None, shops=[])

    identity = get_current_identity(token=token, db=db)
    user = db.query(User).filter(User.id == identity.user_id).first()
    membership = (
        db.query(Membership)
        .filter(Membership.user_id == identity.user_id, Membership.tenant_id == identity.tenant_id)
        .first()
    )
    tenant = db.query(Tenant).filter(Tenant.id == identity.tenant_id).first()

    if not user or not membership or not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Identity context not found")

    if membership.role == MembershipRole.OWNER.value or membership.scope == MembershipScope.ALL_SHOPS.value:
        shops = db.query(Shop).filter(Shop.tenant_id == identity.tenant_id).order_by(Shop.created_at.asc()).all()
    elif membership.shop_id:
        shops = db.query(Shop).filter(Shop.id == membership.shop_id).all()
    else:
        shops = []

    return build_auth_payload(user, tenant, membership, shops, requested_shop_id=identity.shop_id)


@router.post("/switch-shop", response_model=AuthResponse)
def switch_shop(
    payload: SwitchShopRequest,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> AuthResponse:
    user = db.query(User).filter(User.id == identity.user_id).first()
    membership = (
        db.query(Membership)
        .filter(Membership.user_id == identity.user_id, Membership.tenant_id == identity.tenant_id)
        .first()
    )
    tenant = db.query(Tenant).filter(Tenant.id == identity.tenant_id).first()
    if not user or not membership or not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Identity context not found")

    shop = (
        db.query(Shop)
        .filter(Shop.id == payload.shop_id, Shop.tenant_id == identity.tenant_id)
        .first()
    )
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")

    if not can_access_shop(identity, membership, payload.shop_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to requested shop")

    if membership.role == MembershipRole.OWNER.value or membership.scope == MembershipScope.ALL_SHOPS.value:
        shops = db.query(Shop).filter(Shop.tenant_id == identity.tenant_id).order_by(Shop.created_at.asc()).all()
    elif membership.shop_id:
        shops = db.query(Shop).filter(Shop.id == membership.shop_id).all()
    else:
        shops = []

    return build_auth_payload(user, tenant, membership, shops, requested_shop_id=payload.shop_id)


# ---------------------------------------------------------------------------
# Google OAuth — RS256 ID token verification via Google's JWK endpoint
# ---------------------------------------------------------------------------

_GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"
_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _verify_google_id_token(credential: str, client_id: str) -> dict:
    """Verify a Google ID token (RS256 JWT) using Google's public JWKs.

    Returns the decoded claims dict or raises HTTPException 400.
    """
    import httpx
    from jose import JWTError, jwk, jwt
    from jose.utils import base64url_decode

    # 1. Fetch Google's public JWK set (small, cacheable, but fresh each call is fine in dev)
    try:
        resp = httpx.get(_GOOGLE_JWKS_URI, timeout=5)
        resp.raise_for_status()
        jwks = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Could not fetch Google public keys: {exc}")

    # 2. Find the JWK that matches the token's `kid` header
    try:
        unverified_header = jwt.get_unverified_header(credential)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Malformed Google token header: {exc}")

    kid = unverified_header.get("kid")
    matching_key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if matching_key is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token signed with unknown key")

    # 3. Decode and verify signature + standard claims
    try:
        claims = jwt.decode(
            credential,
            matching_key,
            algorithms=["RS256"],
            audience=client_id,
            options={"verify_exp": True, "verify_aud": True, "verify_iss": False},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google token verification failed: {exc}")

    # 4. Validate issuer manually (jose options dict doesn't expose iss key)
    if claims.get("iss") not in _GOOGLE_ISSUERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token issuer")

    # 5. email_verified must be true
    if not claims.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account email not verified")

    return claims


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    from ..core.config import settings as app_settings  # local import avoids circular

    if not app_settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google OAuth not configured on this server")

    claims = _verify_google_id_token(payload.credential, app_settings.GOOGLE_CLIENT_ID)

    email: str = claims["email"]
    name: str = claims.get("name") or email.split("@")[0]

    # --- Look up existing user ---
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        # New user — require business details to create a tenant
        if not payload.business_name or not payload.first_shop_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="new_google_user",  # sentinel the frontend uses to show signup form
            )

        # Create user with a random unguessable password (Google users authenticate via token only)
        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(secrets.token_hex(32)),
        )
        db.add(user)
        db.flush()

        # Reuse the same tenant-creation logic as /signup
        base_slug = slugify(payload.business_name)
        candidate_slug = base_slug
        counter = 1
        while db.query(Tenant).filter(Tenant.slug == candidate_slug).first():
            candidate_slug = f"{base_slug}-{counter}"
            counter += 1

        tenant = Tenant(name=payload.business_name, slug=candidate_slug)
        db.add(tenant)
        db.flush()

        shop = Shop(tenant_id=tenant.id, name=payload.first_shop_name, code=make_shop_code(payload.first_shop_name))
        db.add(shop)
        db.flush()

        membership = Membership(
            user_id=user.id,
            tenant_id=tenant.id,
            shop_id=None,
            role=MembershipRole.OWNER.value,
            scope=MembershipScope.ALL_SHOPS.value,
        )
        db.add(membership)
        db.commit()
        db.refresh(user)

        shops_list = [shop]
        return build_auth_payload(user, tenant, membership, shops_list)

    # --- Existing user ---
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # Platform owner — no tenant context
    if user.is_platform_owner:
        return build_auth_payload(user=user, tenant=None, membership=None, shops=[])

    membership = (
        db.query(Membership)
        .filter(Membership.user_id == user.id)
        .order_by(Membership.created_at.asc())
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No tenant membership found for this account")

    tenant = db.query(Tenant).filter(Tenant.id == membership.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    if membership.role == MembershipRole.OWNER.value or membership.scope == MembershipScope.ALL_SHOPS.value:
        shops_list = db.query(Shop).filter(Shop.tenant_id == tenant.id).order_by(Shop.created_at.asc()).all()
    elif membership.shop_id:
        shops_list = db.query(Shop).filter(Shop.id == membership.shop_id).all()
    else:
        shops_list = []

    return build_auth_payload(user, tenant, membership, shops_list)

