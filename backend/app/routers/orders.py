from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, select, text
from sqlalchemy.orm import selectinload

from ..deps import DB, CustomerUser, ManagerUser, StaffUser
from ..models import ACTIVE_ORDER_STATUSES, Order, OrderItem, OrderStatus, Product, UserRole
from ..schemas import OrderCreate, OrderFulfillmentOut, OrderOut, OrderStatusUpdate

router = APIRouter(prefix="/orders", tags=["orders"])


def _load_order(db, order_id: int) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    return order


def _restock(db, order: Order) -> None:
    """Safely restore item quantities back to respective products and size inventories.
    Handles potentially deleted products gracefully without crashing.
    """
    ids = [i.product_id for i in order.items if i.product_id is not None]
    if not ids:
        return
    stmt = (
        select(Product)
        .where(Product.id.in_(ids))
        .options(selectinload(Product.sizes))
    )
    if "sqlite" not in db.bind.dialect.name:
        stmt = stmt.with_for_update()

    products = {p.id: p for p in db.scalars(stmt).all()}

    for item in order.items:
        if not item.product_id or item.product_id not in products:
            # Gracefully handle cases where product was deleted from DB before restock
            continue
        prod = products[item.product_id]
        if prod is not None:
            qty = int(item.quantity or 0)
            prod.stock = (prod.stock or 0) + qty
            if item.selected_size and prod.sizes:
                size_obj = next((s for s in prod.sizes if s.size == item.selected_size), None)
                if size_obj is not None:
                    size_obj.stock = (size_obj.stock or 0) + qty


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
        is_shoe = bool(product.category and ("حذاء" in product.category.name or "أحذية" in product.category.name or "shoes" in product.category.name.lower()))
        if is_shoe and product.sizes:
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
        cat_name = product.category.name if product.category else "عام"
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_category=cat_name,
                cost_price=product.cost_price or Decimal("0.00"),
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
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "لا يمكن إلغاء الطلب بعد البدء في معالجته")
    order.status = OrderStatus.NOT_RECEIVED
    _restock(db, order)
    db.commit()
    return _load_order(db, order_id)


# ======================= FULFILLMENT (Admin + Manager) ====================== #
@router.get("", response_model=list[OrderFulfillmentOut])
def fulfillment_queue(
    db: DB,
    user: StaffUser,
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    active_only: bool = Query(default=False),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Orders to fulfil for Admins and Managers.
    Can filter by status or fetch active/pending orders only.
    """
    stmt = select(Order).options(selectinload(Order.items))
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    elif active_only:
        stmt = stmt.where(Order.status.in_(ACTIVE_ORDER_STATUSES))
    return db.scalars(stmt.order_by(Order.created_at.desc()).limit(limit).offset(offset)).all()


@router.get("/{order_id}", response_model=OrderFulfillmentOut)
def fulfillment_order(order_id: int, db: DB, user: StaffUser):
    return _load_order(db, order_id)


@router.put("/{order_id}/status", response_model=OrderFulfillmentOut)
@router.patch("/{order_id}/status", response_model=OrderFulfillmentOut)
def update_status(order_id: int, data: OrderStatusUpdate, db: DB, user: StaffUser):
    """Update order status. Protected endpoint for Admins/Managers.
    - If status is 'لم يتم الاستلام' (NOT_RECEIVED): restocks items safely and idempotently.
    - If status is 'تم التوصيل' (DELIVERED): simply marks the order as a completed sale.
    - Transaction commits only if all updates succeed; rolls back otherwise.
    """
    order = _load_order(db, order_id)
    previous_status = order.status
    target_status = data.status

    try:
        # Idempotency check:
        # Return quantities to respective Product and size inventory ONLY if:
        # 1) Target status is NOT_RECEIVED ("لم يتم الاستلام")
        # 2) Previous status was NOT ALREADY NOT_RECEIVED (prevents inventory duplication)
        if target_status == OrderStatus.NOT_RECEIVED and previous_status != OrderStatus.NOT_RECEIVED:
            _restock(db, order)

        # Status DELIVERED ("تم التوصيل"): Simply updates status, marking order as completed sale.
        order.status = target_status

        # Commit only if all operations succeed
        db.commit()
        db.refresh(order)
        return _load_order(db, order_id)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"حدث خطأ أثناء تحديث حالة الطلب والمخزون: {str(exc)}",
        )


@router.delete("/{order_id}")
def delete_order(order_id: int, db: DB, user: StaffUser):
    """Delete an individual order. Protected endpoint for Admins/Managers."""
    order = db.scalar(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    if order.status in (OrderStatus.PENDING, OrderStatus.PROCESSING):
        _restock(db, order)
    db.delete(order)
    db.commit()
    return {"message": f"تم حذف الطلب #{order_id} بنجاح", "id": order_id}


@router.delete("")
def clear_all_orders(db: DB, user: ManagerUser):
    """Manager-only: clear all orders and sales transactions from database."""
    active_orders = db.scalars(
        select(Order).where(Order.status.in_((OrderStatus.PENDING, OrderStatus.PROCESSING))).options(selectinload(Order.items))
    ).all()
    for o in active_orders:
        _restock(db, o)
    db.execute(delete(OrderItem))
    db.execute(delete(Order))
    db.commit()

    # Reset primary key sequence/counter so the very next transaction starts counting from 1
    # SQLite
    try:
        db.execute(text("DELETE FROM sqlite_sequence WHERE name IN ('orders', 'order_items')"))
        db.commit()
    except Exception:
        pass

    # PostgreSQL
    try:
        db.execute(text("ALTER SEQUENCE orders_id_seq RESTART WITH 1"))
        db.execute(text("ALTER SEQUENCE order_items_id_seq RESTART WITH 1"))
        db.commit()
    except Exception:
        pass

    return {"message": "تم مسح جميع الطلبات وسجل المبيعات وإعادة ترقيم المعاملات بنجاح"}

