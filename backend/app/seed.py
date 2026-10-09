"""Create tables, the first Manager account, and demo products.

    python -m app.seed            # idempotent
    python -m app.seed --no-demo  # only tables + first manager
"""
import sys
from decimal import Decimal

from sqlalchemy import func, select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Category, Gender, MediaType, Product, ProductMedia, User, UserRole
from .security import hash_password

# Seed images live in the frontend's /public/images/products folder.
IMG = "/images/products"

DEMO_PRODUCTS = [
    # name, description, category, gender, price, discount, stock, image
    ("حذاء رياضي عصري", "حذاء رياضي خفيف بنعل مريح للاستخدام اليومي", Category.SHOES, Gender.MEN, 420, 0, 25, "sneaker.jpg"),
    ("حذاء كلاسيك جلد", "حذاء رسمي من الجلد الطبيعي بلمسة أنيقة", Category.SHOES, Gender.MEN, 890, 15, 12, "sneaker.jpg"),
    ("كعب عالي بيج", "كعب أنيق بلون بيج ناعم يناسب المناسبات", Category.SHOES, Gender.WOMEN, 650, 20, 18, "heels.jpg"),
    ("حذاء سهرة لامع", "تصميم راقٍ للسهرات", Category.SHOES, Gender.WOMEN, 980, 0, 6, "heels.jpg"),
    ("حقيبة يد جلد أنيقة", "حقيبة يد من الجلد بتفاصيل ذهبية", Category.BAGS, Gender.WOMEN, 750, 20, 14, "handbag.jpg"),
    ("حقيبة سوداء فاخرة", "حقيبة كلاسيكية سوداء بمقبض علوي", Category.BAGS, Gender.WOMEN, 1200, 10, 9, "black-bag.jpg"),
    ("حقيبة كتف يومية", "حقيبة عملية واسعة للاستخدام اليومي", Category.BAGS, Gender.WOMEN, 540, 0, 30, "handbag.jpg"),
    ("حقيبة لابتوب جلد", "حقيبة رجالي لحمل اللابتوب والمستندات", Category.BAGS, Gender.MEN, 1350, 0, 7, "black-bag.jpg"),
    ("ساعة ستانلس كلاسيك", "ساعة رجالي بسوار ستانلس ستيل مقاومة للماء", Category.WATCHES, Gender.MEN, 1450, 0, 10, "steel-watch.jpg"),
    ("ساعة جلد بني", "ساعة بسوار جلد بني وميناء أبيض", Category.WATCHES, Gender.MEN, 990, 25, 15, "leather-watch.jpg"),
    ("ساعة نسائية ناعمة", "ساعة رقيقة بتصميم أنثوي راقٍ", Category.WATCHES, Gender.WOMEN, 870, 0, 20, "leather-watch.jpg"),
    ("ساعة كرونوغراف", "ساعة رياضية بخاصية الكرونوغراف", Category.WATCHES, Gender.MEN, 2100, 30, 5, "steel-watch.jpg"),
]


def ensure_first_manager(db) -> User:
    manager = db.scalar(select(User).where(User.role == UserRole.MANAGER))
    if manager:
        return manager
    manager = User(
        email=settings.FIRST_MANAGER_EMAIL.lower(),
        hashed_password=hash_password(settings.FIRST_MANAGER_PASSWORD),
        full_name=settings.FIRST_MANAGER_NAME,
        role=UserRole.MANAGER,
    )
    db.add(manager)
    db.commit()
    print(f"[OK] Created first manager: {manager.email}")
    return manager


def seed_products(db, manager: User) -> None:
    if db.scalar(select(func.count(Product.id))):
        print("[INFO] Products already exist - skipping demo data")
        return
    for name, desc, cat, gender, price, disc, stock, img in DEMO_PRODUCTS:
        p = Product(
            name=name,
            description=desc,
            category=cat,
            gender=gender,
            price=Decimal(price),
            discount_percent=disc,
            stock=stock,
            created_by_id=manager.id,
        )
        p.media.append(ProductMedia(url=f"{IMG}/{img}", media_type=MediaType.IMAGE, sort_order=0))
        db.add(p)
    db.commit()
    print(f"[OK] Seeded {len(DEMO_PRODUCTS)} demo products")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        manager = ensure_first_manager(db)
        if "--no-demo" not in sys.argv:
            seed_products(db, manager)


if __name__ == "__main__":
    main()
