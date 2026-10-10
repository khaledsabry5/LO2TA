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
    ("حذاء رياضي عصري", "حذاء رياضي خفيف بنعل مريح ومثالي للاستخدام اليومي والرياضة", Category.SHOES, Gender.MEN, 420, 0, 25, "sneaker.jpg"),
    ("خفية كتد أنيقة", "خفية مريحة بتصميم عصري وألوان جذابة", Category.SHOES, Gender.MEN, 750, 0, 18, "sneaker.jpg"),
    ("خفية جلد أنيقة", "خفية من الجلد الطبيعي الفاخر مبطنة بالكامل لراحة فائقة", Category.SHOES, Gender.WOMEN, 750, 20, 15, "handbag.jpg"),
    ("محفظة جلد طبيعية", "محفظة جلدية متعددة الجيوب للبطاقات والعملات النقدية", Category.BAGS, Gender.MEN, 290, 0, 30, "black-bag.jpg"),
    ("حقيبة يد جلد أنيقة", "حقيبة يد نسائية من الجلد الفاخر مع حزام كتف قابل للتعديل", Category.BAGS, Gender.WOMEN, 750, 20, 14, "handbag.jpg"),
    ("حقيبة سوداء فاخرة", "حقيبة كلاسيكية راقية باللون الأسود الملكي بمقبض علوي", Category.BAGS, Gender.WOMEN, 1200, 10, 9, "black-bag.jpg"),
    ("ساعة ستانلس كلاسيك", "ساعة يد بسوار ستانلس ستيل مقاوم للصدأ ومقاومة للماء", Category.WATCHES, Gender.MEN, 1450, 0, 10, "steel-watch.jpg"),
    ("ساعة جلد بني", "ساعة أنيقة بحزام من الجلد البني الطبيعي وميناء أبيض كلاسيكي", Category.WATCHES, Gender.MEN, 990, 25, 15, "leather-watch.jpg"),
    ("ساعة نسائية ناعمة", "ساعة يد أنثوية رقيقة بإطار رفيع ولمسة ذهبية أنيقة", Category.WATCHES, Gender.WOMEN, 870, 0, 20, "leather-watch.jpg"),
    ("ساعة كرونوغراف رياضية", "ساعة كرونوغراف عالية الدقة بتصميم رياضي متين", Category.WATCHES, Gender.MEN, 2100, 30, 8, "steel-watch.jpg"),
    ("حذاء كلاسيك جلد أسود", "حذاء رسمي فخم للبدلات والمناسبات الرسمية", Category.SHOES, Gender.MEN, 890, 15, 12, "sneaker.jpg"),
    ("كعب عالي بيج أنيق", "حذاء كعب عالي بلون بيج ناعم يكمل إطلالتك الساحرة", Category.SHOES, Gender.WOMEN, 650, 20, 18, "heels.jpg"),
    ("حذاء سهرة نسائي لامع", "تصميم راقٍ ببريق لافت للحفلات والسهرات الخاصة", Category.SHOES, Gender.WOMEN, 980, 0, 7, "heels.jpg"),
    ("حقيبة كتف يومية راقية", "حقيبة كروس بدي واسعة وعملية للمشاوير اليومية", Category.BAGS, Gender.WOMEN, 540, 0, 22, "handbag.jpg"),
    ("حقيبة لابتوب جلدية رجالية", "حقيبة عمل أنيقة تتسع للابتوب 15 بوصة والمستندات", Category.BAGS, Gender.MEN, 1350, 0, 11, "black-bag.jpg"),
    ("ساعة يد ذهبية فاخرة", "ساعة كوارتز بميناء ماسي وسوار مطلي بالذهب عيار 18", Category.WATCHES, Gender.WOMEN, 1680, 15, 9, "steel-watch.jpg"),
    ("حذاء لوفر إيطالي كلاسيك", "حذاء لوفر بدون أربطة مصنوع يدوياً من الجلد المدبوغ", Category.SHOES, Gender.MEN, 820, 10, 16, "sneaker.jpg"),
    ("حقيبة يد صغيرة للمناسبات", "كلتش مسائي أنيق مناسب للسهرات والحفلات", Category.BAGS, Gender.WOMEN, 490, 0, 25, "handbag.jpg"),
    ("ساعة يد كاجوال كلاسيك", "ساعة عصرية خفيفة الوزن تناسب الإطلالات اليومية والعمل", Category.WATCHES, Gender.MEN, 780, 0, 14, "leather-watch.jpg"),
    ("محفظة كروت جلدية مضغوطة", "محفظة بطاقات صغيرة نحيفة مزودة بحماية RFID", Category.BAGS, Gender.MEN, 190, 0, 40, "black-bag.jpg"),
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


def ensure_first_admin(db) -> User:
    admin = db.scalar(select(User).where(User.role == UserRole.ADMIN))
    if admin:
        return admin
    admin = User(
        email="admin@lo2ta.com",
        hashed_password=hash_password("ChangeMe123!"),
        full_name="مشرف المتجر",
        role=UserRole.ADMIN,
    )
    db.add(admin)
    db.commit()
    print(f"[OK] Created first admin: {admin.email}")
    return admin


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
        ensure_first_admin(db)
        if "--no-demo" not in sys.argv:
            seed_products(db, manager)


if __name__ == "__main__":
    main()
