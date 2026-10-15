"""Create tables, default categories, Manager/Admin accounts, and demo products with clean slate (no images)."""
import sys
from decimal import Decimal

from sqlalchemy import func, or_, select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Category, Department, Gender, MediaType, Product, ProductColor, ProductMedia, ProductSize, User, UserRole
from .security import hash_password

DEFAULT_DEPARTMENTS = [
    ("رجالي", None),
    ("نسائي", None),
]

DEFAULT_CATEGORIES = [
    ("الأحذية", None),
    ("الشنط", None),
    ("الساعات", None),
    ("النظارات والإكسسوارات", None),
]


def ensure_default_departments(db) -> list[Department]:
    """Ensures default departments exist in database with null image_url (clean slate)."""
    results = []
    for name, _ in DEFAULT_DEPARTMENTS:
        dept = db.scalar(select(Department).where(Department.name == name))
        if not dept:
            dept = Department(name=name, image_url=None)
            db.add(dept)
            db.flush()
        results.append(dept)

    db.commit()
    return results


DEMO_PRODUCTS = [
    # name, description, category_name, gender, price, discount, stock
    ("حذاء رياضي عصري", "حذاء رياضي خفيف بنعل مريح ومثالي للاستخدام اليومي والرياضة", "الأحذية", Gender.MEN, 420, 0, 45),
    ("خفية كتد أنيقة", "خفية مريحة بتصميم عصري وألوان جذابة", "الأحذية", Gender.MEN, 750, 0, 35),
    ("خفية جلد أنيقة", "خفية من الجلد الطبيعي الفاخر مبطنة بالكامل لراحة فائقة", "الأحذية", Gender.WOMEN, 750, 20, 40),
    ("محفظة جلد طبيعية", "محفظة جلدية متعددة الجيوب للبطاقات والعملات النقدية", "الشنط", Gender.MEN, 290, 0, 30),
    ("حقيبة يد جلد أنيقة", "حقيبة يد نسائية من الجلد الفاخر مع حزام كتف قابل للتعديل", "الشنط", Gender.WOMEN, 750, 20, 25),
    ("حقيبة سوداء فاخرة", "حقيبة كلاسيكية راقية باللون الأسود الملكي بمقبض علوي", "الشنط", Gender.WOMEN, 1200, 10, 20),
    ("ساعة ستانلس كلاسيك", "ساعة يد بسوار ستانلس ستيل مقاوم للصدأ ومقاومة للماء", "الساعات", Gender.MEN, 1450, 0, 10),
    ("ساعة جلد بني", "ساعة أنيقة بحزام من الجلد البني الطبيعي وميناء أبيض كلاسيكي", "الساعات", Gender.MEN, 990, 25, 15),
    ("ساعة نسائية ناعمة", "ساعة يد أنثوية رقيقة بإطار رفيع ولمسة ذهبية أنيقة", "الساعات", Gender.WOMEN, 870, 0, 20),
    ("ساعة كرونوغراف رياضية", "ساعة كرونوغراف عالية الدقة بتصميم رياضي متين", "الساعات", Gender.MEN, 2100, 30, 8),
    ("حذاء كلاسيك جلد أسود", "حذاء رسمي فخم للبدلات والمناسبات الرسمية", "الأحذية", Gender.MEN, 890, 15, 30),
    ("كعب عالي بيج أنيق", "حذاء كعب عالي بلون بيج ناعم يكمل إطلالتك الساحرة", "الأحذية", Gender.WOMEN, 650, 20, 25),
    ("حذاء سهرة نسائي لامع", "تصميم راقٍ ببريق لافت للحفلات والسهرات الخاصة", "الأحذية", Gender.WOMEN, 980, 0, 20),
    ("حقيبة كتف يومية راقية", "حقيبة كروس بدي واسعة وعملية للمشاوير اليومية", "الشنط", Gender.WOMEN, 540, 0, 22),
    ("حقيبة لابتوب جلدية رجالية", "حقيبة عمل أنيقة تتسع للابتوب 15 بوصة والمستندات", "الشنط", Gender.MEN, 1350, 0, 15),
    ("ساعة يد ذهبية فاخرة", "ساعة كوارتز بميناء ماسي وسوار مطلي بالذهب عيار 18", "الساعات", Gender.WOMEN, 1680, 15, 9),
    ("حذاء لوفر إيطالي كلاسيك", "حذاء لوفر بدون أربطة مصنوع يدوياً من الجلد المدبوغ", "الأحذية", Gender.MEN, 820, 10, 32),
    ("حقيبة يد صغيرة للمناسبات", "كلتش مسائي أنيق مناسب للسهرات والحفلات", "الشنط", Gender.WOMEN, 490, 0, 25),
    ("ساعة يد كاجوال كلاسيك", "ساعة عصرية خفيفة الوزن تناسب الإطلالات اليومية والعمل", "الساعات", Gender.MEN, 780, 0, 14),
    ("محفظة كروت جلدية مضغوطة", "محفظة بطاقات صغيرة نحيفة مزودة بحماية RFID", "الشنط", Gender.MEN, 190, 0, 40),
    ("نظارة شمسية كلاسيك بولارايزد", "نظارة شمسية فاخرة بإطار أنيق وعدسات مستقطبة لحماية كاملة من أشعة الشمس", "النظارات والإكسسوارات", Gender.MEN, 650, 15, 25),
    ("نظارة شمسية نسائية عصرية", "تصميم عصري جذاب بلمسات ذهبية راقية تناسب مختلف الإطلالات اليومية والمناسبات", "النظارات والإكسسوارات", Gender.WOMEN, 720, 20, 20),
]


def ensure_default_categories(db) -> dict[str, Category]:
    """Ensures default categories exist in database with null image_url (clean slate)."""
    category_map = {}
    for name, _ in DEFAULT_CATEGORIES:
        cat = db.scalar(select(Category).where(Category.name == name))
        if not cat:
            cat = Category(name=name, image_url=None)
            db.add(cat)
            db.flush()
        category_map[name] = cat
    db.commit()
    return category_map


def ensure_first_manager(db) -> User:
    target_email = settings.FIRST_MANAGER_EMAIL.lower()
    manager = db.scalar(select(User).where(func.lower(User.email) == target_email))
    if manager:
        manager.role = UserRole.MANAGER
        manager.is_active = True
        db.commit()
        return manager
    manager = User(
        email=target_email,
        hashed_password="passwordless",
        full_name=settings.FIRST_MANAGER_NAME,
        role=UserRole.MANAGER,
        is_active=True,
    )
    db.add(manager)
    db.commit()
    print(f"[OK] Created initial manager: {manager.email}")
    return manager


def ensure_first_admin(db) -> User | None:
    return None


def seed_products(db, manager: User) -> None:
    cat_map = ensure_default_categories(db)
    existing = db.scalars(select(Product)).all()
    if existing:
        return

    for name, desc, cat_key, gender, price, disc, stock in DEMO_PRODUCTS:
        cat_obj = cat_map.get(cat_key, cat_map["الأحذية"])
        p = Product(
            name=name,
            description=desc,
            category_id=cat_obj.id,
            gender=gender,
            price=Decimal(price),
            discount_percent=disc,
            stock=stock,
            created_by_id=manager.id,
        )

        if "حذاء" in cat_obj.name or "أحذية" in cat_obj.name:
            for sz, st in [(39, 6), (40, 8), (41, 10), (42, 12), (43, 8), (44, 6)]:
                p.sizes.append(ProductSize(size=sz, stock=st))
            p.stock = sum(s.stock for s in p.sizes)

        p.colors.append(ProductColor(name="أسود", code="#111827"))
        p.colors.append(ProductColor(name="بني", code="#78350f"))
        db.add(p)
    db.commit()
    print(f"[OK] Seeded {len(DEMO_PRODUCTS)} demo products with dynamic categories (clean slate, no images)")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        manager = ensure_first_manager(db)
        ensure_default_departments(db)
        ensure_default_categories(db)
        seed_products(db, manager)


if __name__ == "__main__":
    main()
