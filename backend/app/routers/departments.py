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
    """Staff only: Create a new department with optional cover image upload to Cloudinary."""
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "يجب إدخال اسم الفئة")

    existing = db.scalar(select(Department).where(func.lower(Department.name) == clean_name.lower()))
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "توجد فئة أخرى بنفس هذا الاسم بالفعل")

    img_path = image_url.strip() if image_url else None
    if file and file.filename:
        img_path = save_department_upload(file)

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
    """Staff only: Update an existing department's name and/or cover image on Cloudinary."""
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
        if dept.image_url:
            delete_media_file(dept.image_url)
        dept.image_url = new_img
    elif image_url is not None:
        clean_img = image_url.strip()
        dept.image_url = clean_img if clean_img else None

    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{department_id}", status_code=status.HTTP_200_OK)
def delete_department(department_id: int, db: DB, _: StaffUser):
    """Staff only: Delete a department and clean up its cover image."""
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الفئة غير موجودة")

    if dept.image_url:
        delete_media_file(dept.image_url)

    db.delete(dept)
    db.commit()
    return {"ok": True, "message": "تم حذف الفئة بنجاح"}
