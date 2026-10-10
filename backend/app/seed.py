"""Create tables, the first Manager/Admin accounts, and demo products with variants.

    python -m app.seed            # idempotent
    python -m app.seed --no-demo  # only tables + staff accounts
"""
import sys
from decimal import Decimal

from sqlalchemy import func, select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Category, Gender, MediaType, Product, ProductColor, ProductMedia, ProductSize, User, UserRole
from .security import hash_password

IMG = "/images/products"

DEMO_PRODUCTS = [
    # name, description, category, gender, price, discount, stock, image
    ("حذاء رياضي عصري", "حذاء رياضي خفيف بنعل مريح ومثالي للاستخدام اليومي والرياضة", Category.SHOES, Gender.MEN, 420, 0, 45, "sneaker.jpg"),
    ("خفية كتد أنيقة", "خفية مريحة بتصميم عصري وألوان جذابة", Category.SHOES, Gender.MEN, 750, 0, 35, "sneaker.jpg"),
    ("خفية جلد أنيقة", "خفية من الجلد الطبيعي الفاخر مبطنة بالكامل لراحة فائقة", Category.SHOES, Gender.WOMEN, 750, 20, 40, "handbag.jpg"),
    ("محفظة جلد طبيعية", "محفظة جلدية متعددة الجيوب للبطاقات والعملات النقدية", Category.BAGS, Gender.MEN, 290, 0, 30, "black-bag.jpg"),
    ("حقيبة يد جلد أنيقة", "حقيبة يد نسائية من الجلد الفاخر مع حزام كتف قابل للتعديل", Category.BAGS, Gender.WOMEN, 750, 20, 25, "handbag.jpg"),
    ("حقيبة سوداء فاخرة", "حقيبة كلاسيكية راقية باللون الأسود الملكي بمقبض علوي", Category.BAGS, Gender.WOMEN, 1200, 10, 20, "black-bag.jpg"),
    ("ساعة ستانلس كلاسيك", "ساعة يد بسوار ستانلس ستيل مقاوم للصدأ ومقاومة للماء", Category.WATCHES, Gender.MEN, 1450, 0, 10, "steel-watch.jpg"),
    ("ساعة جلد بني", "ساعة أنيقة بحزام من الجلد البني الطبيعي وميناء أبيض كلاسيكي", Category.WATCHES, Gender.MEN, 990, 25, 15, "leather-watch.jpg"),
    ("ساعة نسائية ناعمة", "ساعة يد أنثوية رقيقة بإطار رفيع ولمسة ذهبية أنيقة", Category.WATCHES, Gender.WOMEN, 870, 0, 20, "leather-watch.jpg"),
    ("ساعة كرونوغراف رياضية", "ساعة كرونوغراف عالية الدقة بتصميم رياضي متين", Category.WATCHES, Gender.MEN, 2100, 30, 8, "steel-watch.jpg"),
    ("حذاء كلاسيك جلد أسود", "حذاء رسمي فخم للبدلات والمناسبات الرسمية", Category.SHOES, Gender.MEN, 890, 15, 30, "sneaker.jpg"),
    ("كعب عالي بيج أنيق", "حذاء كعب عالي بلون بيج ناعم يكمل إطلالتك الساحرة", Category.SHOES, Gender.WOMEN, 650, 20, 25, "heels.jpg"),
    ("حذاء سهرة نسائي لامع", "تصميم راقٍ ببريق لافت للحفلات والسهرات الخاصة", Category.SHOES, Gender.WOMEN, 980, 0, 20, "heels.jpg"),
    ("حقيبة كتف يومية راقية", "حقيبة كروس بدي واسعة وعملية للمشاوير اليومية", Category.BAGS, Gender.WOMEN, 540, 0, 22, "handbag.jpg"),
    ("حقيبة لابتوب جلدية رجالية", "حقيبة عمل أنيقة تتسع للابتوب 15 بوصة والمستندات", Category.BAGS, Gender.MEN, 1350, 0, 15, "black-bag.jpg"),
    ("ساعة يد ذهبية فاخرة", "ساعة كوارتز بميناء ماسي وسوار مطلي بالذهب عيار 18", Category.WATCHES, Gender.WOMEN, 1680, 15, 9, "steel-watch.jpg"),
    ("حذاء لوفر إيطالي كلاسيك", "حذاء لوفر بدون أربطة مصنوع يدوياً من الجلد المدبوغ", Category.SHOES, Gender.MEN, 820, 10, 32, "sneaker.jpg"),
    ("حقيبة يد صغيرة للمناسبات", "كلتش مسائي أنيق مناسب للسهرات والحفلات", Category.BAGS, Gender.WOMEN, 490, 0, 25, "handbag.jpg"),
    ("ساعة يد كاجوال كلاسيك", "ساعة عصرية خفيفة الوزن تناسب الإطلالات اليومية والعمل", Category.WATCHES, Gender.MEN, 780, 0, 14, "leather-watch.jpg"),
    ("محفظة كروت جلدية مضغوطة", "محفظة بطاقات صغيرة نحيفة مزودة بحماية RFID", Category.BAGS, Gender.MEN, 190, 0, 40, "black-bag.jpg"),
]


def ensure_first_manager(db) -> User:
    manager = db.scalar(select(User).where(User.role == UserRole.MANAGER))
    if manager:
        # Keep password updated to 4-char policy default
        manager.hashed_password = hash_password("1234")
        db.commit()
        return manager
    manager = User(
        email=settings.FIRST_MANAGER_EMAIL.lower(),
        hashed_password=hash_password("1234"),
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
        # Keep password updated to 4-char policy default
        admin.hashed_password = hash_password("1234")
        db.commit()
        return admin
    admin = User(
        email="admin@lo2ta.com",
        hashed_password=hash_password("1234"),
        full_name="مشرف المتجر",
        role=UserRole.ADMIN,
    )
    db.add(admin)
    db.commit()
    print(f"[OK] Created first admin: {admin.email}")
    return admin


def seed_products(db, manager: User) -> None:
    # Check if products already exist
    existing = db.scalars(select(Product)).all()
    if existing:
        # Populate variants for existing products if missing
        for p in existing:
            if p.category == Category.SHOES and not p.sizes:
                for sz, st in [(39, 5), (40, 8), (41, 10), (42, 12), (43, 8), (44, 5)]:
                    p.sizes.append(ProductSize(size=sz, stock=st))
            if p.category in (Category.SHOES, Category.BAGS) and not p.colors:
                p.colors.append(ProductColor(name="أسود", code="#111827"))
                p.colors.append(ProductColor(name="بني", code="#78350f"))
                p.colors.append(ProductColor(name="بيج", code="#fef3c7"))
        db.commit()
        print("[INFO] Variants verified for existing products")
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

        # Seed sizes for shoes (30 to 50)
        if cat == Category.SHOES:
            for sz, st in [(39, 6), (40, 8), (41, 10), (42, 12), (43, 8), (44, 6)]:
                p.sizes.append(ProductSize(size=sz, stock=st))
            p.stock = sum(s.stock for s in p.sizes)

        # Seed colors for shoes and bags
        if cat in (Category.SHOES, Category.BAGS):
            p.colors.append(ProductColor(name="أسود", code="#111827"))
            p.colors.append(ProductColor(name="بني", code="#78350f"))
            p.colors.append(ProductColor(name="بيج", code="#fef3c7"))

        db.add(p)
    db.commit()
    print(f"[OK] Seeded {len(DEMO_PRODUCTS)} demo products with variants")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        manager = ensure_first_manager(db)
        ensure_first_admin(db)
        if "--no-demo" not in sys.argv:
            seed_products(db, manager)


if __name__ == "__main__":
    main()
