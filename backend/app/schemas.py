"""Pydantic v2 request/response schemas.

Response models are deliberately split per audience so that data exposure is
enforced at the serialization layer as well as the route layer:
  * OrderOut              -> the customer who owns the order
  * OrderFulfillmentOut   -> admins (shipping data only, no account data)
  * OrderManagerOut       -> managers (full data incl. customer account)
"""
import re
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer, field_validator

from .models import Gender, MediaType, OrderStatus, UserRole

Money = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]

EGYPT_PHONE_REGEX = r"^\+201[0125][0-9]{8}$"
STAFF_PASSWORD_REGEX = r"^[a-zA-Z0-9]{4}$"


def normalize_egyptian_phone(value: str | None) -> str | None:
    """Normalizes Egyptian phone numbers into unified international format (+201...).

    Handles inputs like:
    - 01096417408 -> +201096417408
    - 011..., 012..., 015... -> +201...
    - +2010... -> +2010...
    - 201... -> +201...
    - Strips whitespace, dashes, parentheses, and converts Arabic digits.
    """
    if not value or not isinstance(value, str):
        return value
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    cleaned = value.strip()
    for i, d in enumerate(arabic_digits):
        cleaned = cleaned.replace(d, str(i))
    cleaned = re.sub(r"[\s\-\(\)\.]+", "", cleaned)
    if not cleaned:
        return cleaned

    if cleaned.startswith("+201"):
        return cleaned
    if cleaned.startswith("00201"):
        return "+" + cleaned[2:]
    if cleaned.startswith("201"):
        return "+" + cleaned
    if cleaned.startswith("01"):
        return "+2" + cleaned
    if cleaned.startswith("1") and len(cleaned) == 10 and cleaned[1] in "0125":
        return "+20" + cleaned
    return cleaned


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# -------------------------------- Departments ------------------------------ #
class DepartmentOut(ORM):
    id: int
    name: str
    image_url: str
    created_at: datetime | None = None


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    image_url: str = Field(min_length=2, max_length=500)


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    image_url: str | None = Field(default=None, min_length=2, max_length=500)


# -------------------------------- Categories ------------------------------- #
class CategoryOut(ORM):
    id: int
    name: str
    image_url: str
    created_at: datetime | None = None
    products_count: int | None = None


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    image_url: str = Field(min_length=2, max_length=500)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    image_url: str | None = Field(default=None, min_length=2, max_length=500)


# ------------------------------- Auth / Users ------------------------------ #
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RequestOTPIn(BaseModel):
    email: EmailStr


class VerifyOTPIn(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=4, max_length=10)


class CustomerRegister(BaseModel):
    """Customer registration without password. Must have at least two names and valid Egyptian phone."""
    email: EmailStr
    full_name: str = Field(min_length=3, max_length=150)
    phone: str = Field(pattern=EGYPT_PHONE_REGEX, description="Egyptian mobile number (+201...)")

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone_number(cls, v: str) -> str:
        return normalize_egyptian_phone(v)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        parts = v.strip().split()
        if len(parts) < 2:
            raise ValueError("يجب إدخال الاسم ثنائياً على الأقل (الاسم واسم العائلة)")
        return " ".join(parts)


class CustomerPasswordlessLogin(BaseModel):
    """Passwordless login via Egyptian phone or registered email."""
    identifier: str = Field(min_length=3, max_length=255)


class StaffCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = Field(default=None, pattern=EGYPT_PHONE_REGEX)
    role: Literal["manager", "admin"]
    password: str | None = None

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_staff_phone(cls, v: str | None) -> str | None:
        return normalize_egyptian_phone(v)


class StaffUpdate(BaseModel):
    is_active: bool | None = None
    role: Literal["manager", "admin"] | None = None
    password: str | None = None


class UserOut(ORM):
    id: int
    email: EmailStr
    full_name: str
    phone: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class CustomerSummary(UserOut):
    orders_count: int = 0
    total_spent: Money = Decimal("0")


# --------------------------------- Variants -------------------------------- #
class ProductSizeIn(BaseModel):
    size: int = Field(ge=30, le=50, description="Shoe size restricted to 30-50")
    stock: int = Field(ge=0, default=0)


class ProductSizeOut(ORM):
    id: int
    size: int
    stock: int


class ProductColorIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    code: str | None = Field(default=None, max_length=20)


class ProductColorOut(ORM):
    id: int
    name: str
    code: str | None


# --------------------------------- Products -------------------------------- #
class MediaOut(ORM):
    id: int
    url: str
    media_type: MediaType
    sort_order: int


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    category_id: int | None = None
    category_ids: list[int] = Field(default_factory=list)
    department_id: int | None = None
    department_ids: list[int] = Field(default_factory=list)
    gender: Gender = Gender.UNISEX
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    stock: int = Field(ge=0, default=0)
    discount_percent: int = Field(ge=0, le=90, default=0)
    is_active: bool = True


class ProductCreate(ProductBase):
    sizes: list[ProductSizeIn] | None = None
    colors: list[ProductColorIn] | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    category_id: int | None = None
    category_ids: list[int] | None = None
    department_id: int | None = None
    department_ids: list[int] | None = None
    gender: Gender | None = None
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)
    discount_percent: int | None = Field(default=None, ge=0, le=90)
    is_active: bool | None = None
    sizes: list[ProductSizeIn] | None = None
    colors: list[ProductColorIn] | None = None


class DiscountIn(BaseModel):
    percent: int = Field(ge=1, le=90)


class ProductOut(ORM):
    """Public product representation."""
    id: int
    name: str
    description: str | None
    category_id: int | None = None
    category: CategoryOut | None = None
    category_ids: list[int] = []
    categories: list[CategoryOut] = []
    department_id: int | None = None
    department: DepartmentOut | None = None
    department_ids: list[int] = []
    departments: list[DepartmentOut] = []
    gender: Gender
    price: Money
    discount_percent: int
    has_discount: bool
    final_price: Money
    in_stock: bool
    media: list[MediaOut] = []
    sizes: list[ProductSizeOut] = []
    colors: list[ProductColorOut] = []
    created_at: datetime


class ProductAdminOut(ProductOut):
    stock: int
    is_active: bool
    updated_at: datetime


class ProductPage(BaseModel):
    total: int
    items: list[ProductOut]


class ProductAdminPage(BaseModel):
    total: int
    items: list[ProductAdminOut]


# ---------------------------------- Orders --------------------------------- #
class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=50)
    selected_size: int | None = Field(default=None, ge=30, le=50)
    selected_color: str | None = Field(default=None, max_length=50)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)
    shipping_name: str = Field(min_length=2, max_length=150)
    shipping_phone: str = Field(pattern=EGYPT_PHONE_REGEX, description="Egyptian phone +201...")
    shipping_city: str = Field(min_length=2, max_length=100)
    shipping_address: str = Field(min_length=5, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("shipping_phone", mode="before")
    @classmethod
    def normalize_shipping_phone(cls, v: str) -> str:
        return normalize_egyptian_phone(v)

    @field_validator("shipping_name")
    @classmethod
    def validate_shipping_name(cls, v: str) -> str:
        parts = v.strip().split()
        if len(parts) < 2:
            raise ValueError("يجب إدخال الاسم ثنائياً على الأقل")
        return " ".join(parts)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        if isinstance(v, str):
            v_clean = v.strip()
            v_upper = v_clean.upper()
            if v_upper in OrderStatus.__members__:
                return OrderStatus[v_upper]
            if v_upper in ("CONFIRMED", "SHIPPED"):
                return OrderStatus.PROCESSING
            if v_upper in ("CANCELLED", "CANCELED"):
                return OrderStatus.NOT_RECEIVED
            # Arabic status translations
            if "توصيل" in v_clean or "تسليم" in v_clean:
                return OrderStatus.DELIVERED
            if "لم يتم" in v_clean or "ملغي" in v_clean or "إلغاء" in v_clean or "الغاء" in v_clean:
                return OrderStatus.NOT_RECEIVED
            if "تجهيز" in v_clean or "شحن" in v_clean:
                return OrderStatus.PROCESSING
            if "مراجعة" in v_clean:
                return OrderStatus.PENDING
        return v


class OrderItemOut(ORM):
    id: int
    product_id: int | None
    product_name: str
    product_category: str
    unit_price: Money
    discount_percent: int
    final_unit_price: Money
    quantity: int
    line_total: Money
    selected_size: int | None = None
    selected_color: str | None = None


class OrderOut(ORM):
    id: int
    status: OrderStatus
    subtotal: Money
    discount_total: Money
    total: Money
    shipping_name: str
    shipping_phone: str
    shipping_city: str
    shipping_address: str
    notes: str | None
    created_at: datetime
    items: list[OrderItemOut]


class OrderFulfillmentOut(OrderOut):
    """Admin view: shipping snapshot only – no customer account data."""


class OrderManagerOut(OrderOut):
    customer_id: int | None
    customer: UserOut | None


class CustomerDetail(UserOut):
    orders: list[OrderOut]
