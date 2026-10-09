"""Pydantic v2 request/response schemas.

Response models are deliberately split per audience so that data exposure is
enforced at the serialization layer as well as the route layer:
  * OrderOut              -> the customer who owns the order
  * OrderFulfillmentOut   -> admins (shipping data only, no account data)
  * OrderManagerOut       -> managers (full data incl. customer account)
"""
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer

from .models import Category, Gender, MediaType, OrderStatus, UserRole

Money = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ------------------------------- Auth / Users ------------------------------ #
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CustomerRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=30)


class StaffCreate(CustomerRegister):
    role: Literal["manager", "admin"]


class StaffUpdate(BaseModel):
    is_active: bool | None = None
    role: Literal["manager", "admin"] | None = None


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


# --------------------------------- Products -------------------------------- #
class MediaOut(ORM):
    id: int
    url: str
    media_type: MediaType
    sort_order: int


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    category: Category
    gender: Gender
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    stock: int = Field(ge=0, default=0)
    discount_percent: int = Field(ge=0, le=90, default=0)
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    category: Category | None = None
    gender: Gender | None = None
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)
    discount_percent: int | None = Field(default=None, ge=0, le=90)
    is_active: bool | None = None


class DiscountIn(BaseModel):
    percent: int = Field(ge=1, le=90)


class ProductOut(ORM):
    """Public product representation (no exact inventory)."""
    id: int
    name: str
    description: str | None
    category: Category
    gender: Gender
    price: Money
    discount_percent: int
    has_discount: bool
    final_price: Money
    in_stock: bool
    media: list[MediaOut]
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


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)
    shipping_name: str = Field(min_length=2, max_length=150)
    shipping_phone: str = Field(min_length=6, max_length=30)
    shipping_city: str = Field(min_length=2, max_length=100)
    shipping_address: str = Field(min_length=5, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderItemOut(ORM):
    id: int
    product_id: int | None
    product_name: str
    product_category: Category
    unit_price: Money
    discount_percent: int
    final_unit_price: Money
    quantity: int
    line_total: Money


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
