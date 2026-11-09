from fastapi import APIRouter, status
from ..deps import DB, StaffUser
from ..schemas import ManualOrderCreate, OrderFulfillmentOut
from .orders import create_manual_order as _create_manual_order

router = APIRouter(prefix="/admin/orders", tags=["admin-orders"])


@router.post("/manual", response_model=OrderFulfillmentOut, status_code=status.HTTP_201_CREATED)
def admin_manual_order(data: ManualOrderCreate, db: DB, user: StaffUser):
    return _create_manual_order(data=data, db=db, _=user)
