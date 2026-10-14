"""Departments (الفئات) CRUD router for YSN Store."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select

from ..deps import DB, StaffUser
from ..models import Department
from ..schemas import DepartmentOut
from ..storage import delete_media_file, save_department_upload

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(db: DB):
    """Public endpoint to list all top-level departments (e.g., Men, Women)."""
    return db.scalars(select(Department).order_by(Department.id.asc())).all()


@router.get("/{department_id}", response_model=DepartmentOut)
def get_department(department_id: int, db: DB):
    """Public endpoint to get a single department by ID."""
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الفئة غير موجودة")
    return dept


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    db: DB,
    _: StaffUser,
    name: str = Form(...),
    file: UploadFile | None = File(None),
    image_url: str | None = Form(None),
):
    """Staff only: Create a new department with name and cover image upload."""
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "يجب إدخال اسم الفئة")

    existing = db.scalar(select(Department).where(func.lower(Department.name) == clean_name.lower()))
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "توجد فئة أخرى بنفس هذا الاسم بالفعل")

    img_path = image_url.strip() if image_url else None
    if file and file.filename:
        img_path = save_department_upload(file)

    if not img_path:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "يجب رفع صورة للفئة أو توفير رابط الصورة")

    # Enforce women/men image isolation: Prevent women's department from using male image
    if any(w in clean_name.lower() for w in ("نسا", "نساء", "نسائي", "نسائ", "women")):
        if "photo-1507679799987" in img_path or img_path.endswith("men.jpg") or img_path.endswith("men_category.jpg"):
            img_path = "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"
    elif any(w in clean_name.lower() for w in ("رجال", "رجالي", "men")):
        if "photo-1508214751196" in img_path or img_path.endswith("women.jpg") or img_path.endswith("women_category.jpg"):
            img_path = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"

    department = Department(name=clean_name, image_url=img_path)
    db.add(department)
    db.commit()
    db.refresh(department)

    return department


@router.put("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: int,
    db: DB,
    _: StaffUser,
    name: str | None = Form(None),
    file: UploadFile | None = File(None),
    image_url: str | None = Form(None),
):
    """Staff only: Update an existing department's name and/or cover image."""
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الفئة غير موجودة")

    if name:
        clean_name = name.strip()
        existing = db.scalar(
            select(Department).where(
                func.lower(Department.name) == clean_name.lower(),
                Department.id != department_id,
            )
        )
        if existing:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "توجد فئة أخرى بنفس هذا الاسم بالفعل")
        dept.name = clean_name

    if file and file.filename:
        new_img = save_department_upload(file)
        if dept.image_url and dept.image_url.startswith("/uploads/"):
            delete_media_file(dept.image_url)
        dept.image_url = new_img
    elif image_url and image_url.strip():
        dept.image_url = image_url.strip()

    # Enforce women/men image isolation on update
    target_name = (dept.name or "").lower()
    if any(w in target_name for w in ("نسا", "نساء", "نسائي", "نسائ", "women")):
        if not dept.image_url or "photo-1507679799987" in dept.image_url or dept.image_url.endswith("men.jpg") or dept.image_url.endswith("men_category.jpg"):
            dept.image_url = "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"
    elif any(w in target_name for w in ("رجال", "رجالي", "men")):
        if not dept.image_url or "photo-1508214751196" in dept.image_url or dept.image_url.endswith("women.jpg") or dept.image_url.endswith("women_category.jpg"):
            dept.image_url = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"

    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{department_id}", status_code=status.HTTP_200_OK)
def delete_department(department_id: int, db: DB, _: StaffUser):
    """Staff only: Delete a department and clean up its cover image."""
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الفئة غير موجودة")

    if dept.image_url and dept.image_url.startswith("/uploads/"):
        delete_media_file(dept.image_url)

    db.delete(dept)
    db.commit()
    return {"ok": True, "message": "تم حذف الفئة بنجاح"}
