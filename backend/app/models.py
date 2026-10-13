"""SQLAlchemy 2.0 ORM models for YSN Accessories Store (PostgreSQL)."""
from __future__ import annotations

import enum
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from .database import Base


# --------------------------------------------------------------------------- #
# Enums (stored as native PostgreSQL ENUM types using lowercase values)
# --------------------------------------------------------------------------- #
class UserRole(str, enum.Enum):
    MANAGER = "manager"
    ADMIN = "admin"
    CUSTOMER = "customer"


class Gender(str, enum.Enum):
    MEN = "men"
    WOMEN = "women"
    UNISEX = "unisex"


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    DELIVERED = "DELIVERED"
    NOT_RECEIVED = "NOT_RECEIVED"


ACTIVE_ORDER_STATUSES = (OrderStatus.PENDING, OrderStatus.PROCESSING)


def pg_enum(enum_cls: type[enum.Enum], name: str) -> SAEnum:
    return SAEnum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])


TWO_PLACES = Decimal("0.01")


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), default="passwordless", nullable=True)
    full_name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(pg_enum(UserRole, "user_role"), default=UserRole.CUSTOMER, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def phone_number(self) -> str | None:
        return self.phone

    @phone_number.setter
    def phone_number(self, value: str | None) -> None:
        self.phone = value

    # Which manager created this staff account (null for self-registered customers)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    orders: Mapped[list[Order]] = relationship(back_populates="customer", foreign_keys="Order.customer_id")


# --------------------------------------------------------------------------- #
# Association Tables (Many-to-Many Links)
# --------------------------------------------------------------------------- #
product_category_link = Table(
    "product_category_link",
    Base.metadata,
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)

product_department_link = Table(
    "product_department_link",
    Base.metadata,
    Column("product_id", Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
)


# --------------------------------------------------------------------------- #
# Departments (الفئات - e.g., Men, Women)
# --------------------------------------------------------------------------- #
class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    image_url: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    products: Mapped[list[Product]] = relationship(
        secondary=product_department_link,
        back_populates="departments",
    )

    @validates("image_url")
    def validate_department_image(self, key, value):
        if value and self.name:
            if any(w in self.name for w in ("نسا", "نساء", "نسائي", "نسائ", "women")):
                if "photo-1507679799987" in value or value.endswith("men.jpg") or value.endswith("men_category.jpg"):
                    return "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"
            elif any(w in self.name for w in ("رجال", "رجالي", "men")):
                if "photo-1508214751196" in value or value.endswith("women.jpg") or value.endswith("women_category.jpg"):
                    return "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"
        return value


# --------------------------------------------------------------------------- #
# Categories (Dynamic Table)
# --------------------------------------------------------------------------- #
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    image_url: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    products: Mapped[list[Product]] = relationship(
        secondary=product_category_link,
        back_populates="categories",
    )

    @validates("image_url")
    def validate_category_image(self, key, value):
        if value and self.name:
            if any(w in self.name for w in ("نسا", "نساء", "نسائي", "نسائ", "women")):
                if "photo-1507679799987" in value or value.endswith("men.jpg") or value.endswith("men_category.jpg"):
                    return "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"
            elif any(w in self.name for w in ("رجال", "رجالي", "men")):
                if "photo-1508214751196" in value or value.endswith("women.jpg") or value.endswith("women_category.jpg"):
                    return "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"
        return value


# --------------------------------------------------------------------------- #
# Products & Variants
# --------------------------------------------------------------------------- #
class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_product_price_positive"),
        CheckConstraint("stock >= 0", name="ck_product_stock_positive"),
        CheckConstraint("discount_percent >= 0 AND discount_percent <= 90", name="ck_product_discount_range"),
        Index("ix_products_active_created", "is_active", "created_at"),
        Index("ix_products_category_gender", "category_id", "gender"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    gender: Mapped[Gender] = mapped_column(pg_enum(Gender, "product_gender"), default=Gender.UNISEX)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    stock: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Category | None] = relationship(foreign_keys=[category_id])
    department: Mapped[Department | None] = relationship(foreign_keys=[department_id])

    categories: Mapped[list[Category]] = relationship(
        secondary=product_category_link,
        back_populates="products",
    )
    departments: Mapped[list[Department]] = relationship(
        secondary=product_department_link,
        back_populates="products",
    )

    @property
    def category_ids(self) -> list[int]:
        ids = [c.id for c in self.categories] if self.categories else []
        if self.category_id and self.category_id not in ids:
            ids.insert(0, self.category_id)
        return ids

    @property
    def department_ids(self) -> list[int]:
        ids = [d.id for d in self.departments] if self.departments else []
        if self.department_id and self.department_id not in ids:
            ids.insert(0, self.department_id)
        return ids

    media: Mapped[list[ProductMedia]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductMedia.sort_order",
    )
    sizes: Mapped[list[ProductSize]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductSize.size",
    )
    colors: Mapped[list[ProductColor]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductColor.id",
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
        if self.category and ("حذاء" in self.category.name or "أحذية" in self.category.name or "shoes" in self.category.name.lower()) and self.sizes:
            return any(s.stock > 0 for s in self.sizes)
        return self.stock > 0


class ProductSize(Base):
    """Specific inventory tracking per shoe size (restricted to range 30-50)."""
    __tablename__ = "product_sizes"
    __table_args__ = (
        CheckConstraint("size >= 30 AND size <= 50", name="ck_product_size_range"),
        CheckConstraint("stock >= 0", name="ck_product_size_stock_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    size: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    product: Mapped[Product] = relationship(back_populates="sizes")


class ProductColor(Base):
    """Available colors (names or hex codes) for shoes and bags."""
    __tablename__ = "product_colors"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(50))
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    product: Mapped[Product] = relationship(back_populates="colors")


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
    product_category: Mapped[str] = mapped_column(String(100))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0)
    final_unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int] = mapped_column(Integer)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    selected_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    selected_color: Mapped[str | None] = mapped_column(String(50), nullable=True)

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product | None] = relationship()


# --------------------------------------------------------------------------- #
# Email OTP (One-Time Password)
# --------------------------------------------------------------------------- #
class EmailOTP(Base):
    __tablename__ = "email_otps"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    otp_code: Mapped[str] = mapped_column(String(10), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
