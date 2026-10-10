from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..deps import DB, CustomerUser, StaffUser
from ..models import ACTIVE_ORDER_STATUSES, Category, Order, OrderItem, OrderStatus, Product, UserRole
from ..schemas import OrderCreate, OrderFulfillmentOut, OrderOut, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["orders"])

ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED, OrderStatus.CANCELLED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


def _load_order(db, order_id: int) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    return order


def _restock(db, order: Order) -> None:
    ids = [i.product_id for i in order.items if i.product_id]
    if not ids:
        return
    products = {
        p.id: p
        for p in db.scalars(
            select(Product)
            .where(Product.id.in_(ids))
            .options(selectinload(Product.sizes))
            .with_for_update()
        )
    }
    for item in order.items:
        if item.product_id in products:
            prod = products[item.product_id]
            prod.stock += item.quantity
            if item.selected_size and prod.sizes:
                size_obj = next((s for s in prod.sizes if s.size == item.selected_size), None)
                if size_obj:
                    size_obj.stock += item.quantity


# ============================== CUSTOMER ==================================== #
@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def checkout(data: OrderCreate, db: DB, user: CustomerUser):
    """Place an order. Prices are computed server-side; stock is locked & decremented atomically."""
    product_ids = list({item.product_id for item in data.items})
    products = {
        p.id: p
        for p in db.scalars(
            select(Product)
            .where(Product.id.in_(product_ids))
            .options(selectinload(Product.sizes))
            .order_by(Product.id)
            .with_for_update()
        )
    }

    order = Order(
        customer_id=user.id,
        status=OrderStatus.PENDING,
        shipping_name=data.shipping_name.strip(),
        shipping_phone=data.shipping_phone.strip(),
        shipping_city=data.shipping_city.strip(),
        shipping_address=data.shipping_address.strip(),
        notes=data.notes,
    )

    subtotal = Decimal("0")
    total = Decimal("0")

    for item in data.items:
        product = products.get(item.product_id)
        if not product or not product.is_active:
            db.rollback()
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"المنتج رقم {item.product_id} غير متاح")

        # Size inventory check for shoes
        if product.category == Category.SHOES and product.sizes:
            if not item.selected_size:
                db.rollback()
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"يرجى تحديد المقاس للمنتج «{product.name}»")
            size_obj = next((s for s in product.sizes if s.size == item.selected_size), None)
            if not size_obj or size_obj.stock < item.quantity:
                db.rollback()
                available = size_obj.stock if size_obj else 0
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"الكمية المتاحة من المقاس {item.selected_size} لمنتج «{product.name}» هي {available} فقط",
                )
            size_obj.stock -= item.quantity

        if product.stock < item.quantity:
            db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, f"الكمية المتاحة من «{product.name}» هي {product.stock} فقط")

        product.stock -= item.quantity
        unit = Decimal(product.price)
        final_unit = product.final_price
        line = final_unit * item.quantity
        subtotal += unit * item.quantity
        total += line
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_category=product.category,
                unit_price=unit,
                discount_percent=product.discount_percent,
                final_unit_price=final_unit,
                quantity=item.quantity,
                line_total=line,
                selected_size=item.selected_size,
                selected_color=item.selected_color,
            )
        )

    order.subtotal = subtotal
    order.total = total
    order.discount_total = subtotal - total
    db.add(order)
    db.commit()
    return _load_order(db, order.id)


@router.get("/me", response_model=list[OrderOut])
def my_orders(db: DB, user: CustomerUser):
    return db.scalars(
        select(Order).where(Order.customer_id == user.id).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    ).all()


@router.get("/me/{order_id}", response_model=OrderOut)
def my_order(order_id: int, db: DB, user: CustomerUser):
    order = _load_order(db, order_id)
    if order.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    return order


@router.post("/me/{order_id}/cancel", response_model=OrderOut)
def cancel_my_order(order_id: int, db: DB, user: CustomerUser):
    order = _load_order(db, order_id)
    if order.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "لا يمكن إلغاء الطلب بعد تأكيده")
    order.status = OrderStatus.CANCELLED
    _restock(db, order)
    db.commit()
    return _load_order(db, order_id)


# ======================= FULFILLMENT (Admin + Manager) ====================== #
@router.get("", response_model=list[OrderFulfillmentOut])
def fulfillment_queue(
    db: DB,
    user: StaffUser,
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Orders to fulfil.

    * Admins only ever see ACTIVE orders (pending / confirmed / shipped) and only
      the shipping snapshot – never the customer's account or overall sales.
    * Managers may also see delivered / cancelled orders here (full sales data
      lives under /api/manager/sales).
    """
    stmt = select(Order).options(selectinload(Order.items))
    if user.role == UserRole.ADMIN:
        stmt = stmt.where(Order.status.in_(ACTIVE_ORDER_STATUSES))
    if status_filter:
        if user.role == UserRole.ADMIN and status_filter not in ACTIVE_ORDER_STATUSES:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "ليس لديك صلاحية لعرض الطلبات المغلقة")
        stmt = stmt.where(Order.status == status_filter)
    return db.scalars(stmt.order_by(Order.created_at.asc()).limit(limit).offset(offset)).all()


@router.get("/{order_id}", response_model=OrderFulfillmentOut)
def fulfillment_order(order_id: int, db: DB, user: StaffUser):
    order = _load_order(db, order_id)
    if user.role == UserRole.ADMIN and order.status not in ACTIVE_ORDER_STATUSES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "هذا الطلب مغلق")
    return order


@router.patch("/{order_id}/status", response_model=OrderFulfillmentOut)
def update_status(order_id: int, data: OrderStatusUpdate, db: DB, user: StaffUser):
    order = _load_order(db, order_id)
    if user.role == UserRole.ADMIN and order.status not in ACTIVE_ORDER_STATUSES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "هذا الطلب مغلق")
    if data.status not in ALLOWED_TRANSITIONS[order.status]:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"لا يمكن تغيير الحالة من {order.status.value} إلى {data.status.value}"
        )
    if data.status == OrderStatus.CANCELLED:
        _restock(db, order)
    order.status = data.status
    db.commit()
    return _load_order(db, order_id)
