"""SQLAlchemy 2.0 ORM models for Lo2ta Accessories Store (PostgreSQL)."""
from __future__ import annotations

import enum
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


# --------------------------------------------------------------------------- #
# Enums (stored as native PostgreSQL ENUM types using lowercase values)
# --------------------------------------------------------------------------- #
class UserRole(str, enum.Enum):
    MANAGER = "manager"
    ADMIN = "admin"
    CUSTOMER = "customer"


class Category(str, enum.Enum):
    SHOES = "shoes"
    BAGS = "bags"
    WATCHES = "watches"


class Gender(str, enum.Enum):
    MEN = "men"
    WOMEN = "women"


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


ACTIVE_ORDER_STATUSES = (OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED)


def pg_enum(enum_cls: type[enum.Enum], name: str) -> SAEnum:
    return SAEnum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])


CATEGORY_ENUM = pg_enum(Category, "product_category")

TWO_PLACES = Decimal("0.01")


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(30))
    role: Mapped[UserRole] = mapped_column(pg_enum(UserRole, "user_role"), default=UserRole.CUSTOMER, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Which manager created this staff account (null for self-registered customers)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    orders: Mapped[list[Order]] = relationship(back_populates="customer", foreign_keys="Order.customer_id")


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_product_price_positive"),
        CheckConstraint("stock >= 0", name="ck_product_stock_positive"),
        CheckConstraint("discount_percent >= 0 AND discount_percent <= 90", name="ck_product_discount_range"),
        Index("ix_products_active_created", "is_active", "created_at"),
        Index("ix_products_category_gender", "category", "gender"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[Category] = mapped_column(CATEGORY_ENUM)
    gender: Mapped[Gender] = mapped_column(pg_enum(Gender, "product_gender"))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    stock: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    media: Mapped[list[ProductMedia]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductMedia.sort_order",
    )

    @property
    def has_discount(self) -> bool:
        return (self.discount_percent or 0) > 0

    @property
    def final_price(self) -> Decimal:
        if not self.has_discount:
            return Decimal(self.price).quantize(TWO_PLACES)
        factor = Decimal(100 - self.discount_percent) / Decimal(100)
        return (Decimal(self.price) * factor).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

    @property
    def in_stock(self) -> bool:
        return self.stock > 0


class ProductMedia(Base):
    __tablename__ = "product_media"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    media_type: Mapped[MediaType] = mapped_column(pg_enum(MediaType, "media_type"), default=MediaType.IMAGE)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped[Product] = relationship(back_populates="media")


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (Index("ix_orders_status_created", "status", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    status: Mapped[OrderStatus] = mapped_column(pg_enum(OrderStatus, "order_status"), default=OrderStatus.PENDING)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))        # before discounts
    discount_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))  # saved by customer
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))           # amount paid

    # Shipping snapshot – the ONLY customer data visible to admins
    shipping_name: Mapped[str] = mapped_column(String(150))
    shipping_phone: Mapped[str] = mapped_column(String(30))
    shipping_city: Mapped[str] = mapped_column(String(100))
    shipping_address: Mapped[str] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[User | None] = relationship(back_populates="orders", foreign_keys=[customer_id])
    items: Mapped[list[OrderItem]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_order_item_qty_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), index=True)

    # Snapshots so history survives product edits / deletion
    product_name: Mapped[str] = mapped_column(String(200))
    product_category: Mapped[Category] = mapped_column(CATEGORY_ENUM)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0)
    final_unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int] = mapped_column(Integer)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product | None] = relationship()
