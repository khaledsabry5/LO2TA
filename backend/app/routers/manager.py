"""Manager-only endpoints: customers, staff accounts, sales & analytics."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import selectinload

from ..deps import DB, ManagerUser, StaffUser
from ..models import Order, OrderItem, OrderStatus, Product, User, UserRole
from ..schemas import (
    CustomerDetail,
    CustomerSummary,
    OrderManagerOut,
    StaffCreate,
    StaffUpdate,
    UserOut,
)
from ..security import hash_password
from .orders import _restock

router = APIRouter(prefix="/manager", tags=["manager"])

REVENUE_STATUSES = (OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.DELIVERED)


# ------------------------------- Customers --------------------------------- #
@router.get("/customers", response_model=list[CustomerSummary])
def list_customers(
    db: DB,
    _: ManagerUser,
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    orders_count = func.count(Order.id).filter(Order.status.in_(REVENUE_STATUSES))
    total_spent = func.coalesce(func.sum(Order.total).filter(Order.status.in_(REVENUE_STATUSES)), 0)
    stmt = (
        select(User, orders_count, total_spent)
        .outerjoin(Order, Order.customer_id == User.id)
        .where(User.role == UserRole.CUSTOMER)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.full_name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
    rows = db.execute(stmt.limit(limit).offset(offset)).all()
    return [
        CustomerSummary.model_validate(u).model_copy(update={"orders_count": c, "total_spent": Decimal(s)})
        for u, c, s in rows
    ]


@router.get("/customers/{user_id}", response_model=CustomerDetail)
def customer_detail(user_id: int, db: DB, _: ManagerUser):
    user = db.scalar(
        select(User)
        .where(User.id == user_id, User.role == UserRole.CUSTOMER)
        .options(selectinload(User.orders).selectinload(Order.items))
    )
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "العميل غير موجود")
    user.orders.sort(key=lambda o: o.created_at, reverse=True)
    return user


# --------------------------------- Staff ----------------------------------- #
@router.get("/staff", response_model=list[UserOut])
def list_staff(db: DB, _: StaffUser):
    return db.scalars(
        select(User).where(User.role.in_((UserRole.MANAGER, UserRole.ADMIN))).order_by(User.created_at)
    ).all()


@router.delete("/staff/{user_id}", status_code=status.HTTP_200_OK)
def delete_staff(user_id: int, db: DB, current_user: StaffUser):
    """Delete a staff account (alias for /api/users/{user_id})."""
    from .users import delete_user
    return delete_user(user_id=user_id, db=db, current_user=current_user)


@router.post("/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff(data: StaffCreate, db: DB, manager: ManagerUser):
    """EXCLUSIVE to managers: create a new Manager or Admin account."""
    email = data.email.lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "البريد الإلكتروني مسجل بالفعل")
    user = User(
        email=email,
        hashed_password=hash_password(data.password) if data.password else None,
        full_name=data.full_name.strip(),
        phone=data.phone,
        role=UserRole(data.role),
        created_by_id=manager.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/staff/{user_id}", response_model=UserOut)
def update_staff(user_id: int, data: StaffUpdate, db: DB, manager: ManagerUser):
    user = db.get(User, user_id)
    if not user or user.role not in (UserRole.MANAGER, UserRole.ADMIN):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الحساب غير موجود")
    if user.id == manager.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "لا يمكنك تعديل حسابك الخاص من هنا")
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None:
        user.role = UserRole(data.role)
    if data.password is not None:
        user.hashed_password = hash_password(data.password) if data.password else None
    db.commit()
    db.refresh(user)
    return user


# ------------------------------ Sales data --------------------------------- #
@router.get("/sales", response_model=list[OrderManagerOut])
def all_sales(
    db: DB,
    _: ManagerUser,
    status_filter: OrderStatus | None = Query(default=OrderStatus.DELIVERED, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Sales archive: returns completed sales (orders with DELIVERED status)."""
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.customer),
    )
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    return db.scalars(stmt.order_by(Order.created_at.desc()).limit(limit).offset(offset)).all()


@router.post("/sales/{order_id}/refund")
@router.delete("/sales/{order_id}")
def refund_and_restock_sales_record(order_id: int, db: DB, _: StaffUser):
    """
    Process refund and return of a completed sales record:
    - Atomically restocks all items and variant sizes back into active inventory
    - Deletes the sales transaction from history
    - Ensures atomicity via database transaction rollback on any failure
    """
    try:
        stmt = (
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.items))
        )
        if "sqlite" not in db.bind.dialect.name:
            stmt = stmt.with_for_update()

        order = db.scalar(stmt)
        if not order:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "سجل المعاملة غير موجود")

        # 1. Restock items and variant sizes back into active inventory
        _restock(db, order)

        # 2. Delete the sales transaction (cascade deletes items)
        db.delete(order)
        db.commit()

        return {
            "message": f"تم استرجاع الطلب #{order_id} وإعادة جميع المنتجات والقطع إلى المخزون بنجاح",
            "id": order_id,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"حدث خطأ أثناء معالجة استرجاع الطلب وإعادة المنتجات للمخزون: {str(exc)}",
        )


@router.get("/inventory-cost")
def get_total_inventory_cost(db: DB, _: StaffUser):
    """
    Returns the sum of (cost_price * stock_quantity) for all products currently
    uploaded to the website (the entire inventory base), taking into account
    all variant/size quantities.
    """
    products = db.scalars(select(Product).options(selectinload(Product.sizes))).all()
    total_cost = sum((p.total_inventory_cost for p in products), Decimal("0.00"))
    total_pieces = sum((p.total_inventory_quantity for p in products), 0)
    return {
        "total_cost": float(total_cost),
        "total_pieces": total_pieces,
    }


@router.get("/analytics")
def analytics(db: DB, _: ManagerUser, months: int = Query(6, ge=1, le=24)):
    revenue_filter = Order.status.in_(REVENUE_STATUSES)

    revenue = db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(revenue_filter)) or 0
    orders_count = db.scalar(select(func.count(Order.id)).where(revenue_filter)) or 0
    customers_count = db.scalar(select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)) or 0
    products_count = db.scalar(select(func.count(Product.id))) or 0
    pending_count = db.scalar(select(func.count(Order.id)).where(Order.status == OrderStatus.PENDING)) or 0
    discount_given = db.scalar(select(func.coalesce(func.sum(Order.discount_total), 0)).where(revenue_filter)) or 0

    since = datetime.now(timezone.utc) - timedelta(days=31 * months)
    month = func.date_trunc("month", Order.created_at).label("month")
    by_month = db.execute(
        select(month, func.sum(Order.total), func.count(Order.id))
        .where(revenue_filter, Order.created_at >= since)
        .group_by(month)
        .order_by(month)
    ).all()

    by_category = db.execute(
        select(OrderItem.product_category, func.sum(OrderItem.line_total), func.sum(OrderItem.quantity))
        .join(Order, Order.id == OrderItem.order_id)
        .where(revenue_filter)
        .group_by(OrderItem.product_category)
    ).all()

    top_products = db.execute(
        select(OrderItem.product_name, func.sum(OrderItem.quantity).label("qty"), func.sum(OrderItem.line_total))
        .join(Order, Order.id == OrderItem.order_id)
        .where(revenue_filter)
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    ).all()

    low_stock = db.execute(
        select(Product.id, Product.name, Product.stock).where(Product.stock <= 5).order_by(Product.stock).limit(10)
    ).all()

    by_status = db.execute(select(Order.status, func.count(Order.id)).group_by(Order.status)).all()

    return {
        "revenue": float(revenue),
        "orders_count": orders_count,
        "avg_order_value": float(revenue) / orders_count if orders_count else 0.0,
        "customers_count": customers_count,
        "products_count": products_count,
        "pending_orders": pending_count,
        "discount_given": float(discount_given),
        "total_inventory_cost": float(sum((p.total_inventory_cost for p in db.scalars(select(Product).options(selectinload(Product.sizes))).all()), Decimal("0.00"))),
        "revenue_by_month": [
            {"month": m.strftime("%Y-%m"), "revenue": float(r or 0), "orders": c} for m, r, c in by_month
        ],
        "sales_by_category": [
            {"category": cat.value, "revenue": float(r or 0), "units": int(u or 0)} for cat, r, u in by_category
        ],
        "top_products": [{"name": n, "units": int(q or 0), "revenue": float(r or 0)} for n, q, r in top_products],
        "low_stock": [{"id": i, "name": n, "stock": s} for i, n, s in low_stock],
        "orders_by_status": {s.value: c for s, c in by_status},
    }
