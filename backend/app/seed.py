"""Create tables, default categories, Manager/Admin accounts, and demo products with variants."""
import sys
from decimal import Decimal

from sqlalchemy import func, or_, select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Category, Department, Gender, MediaType, Product, ProductColor, ProductMedia, ProductSize, User, UserRole
from .security import hash_password

IMG = "/images/products"

# Option A: Stable, host-agnostic permanent CDN URLs for Men & Women departments
MEN_DEPARTMENT_IMAGE = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"
WOMEN_DEPARTMENT_IMAGE = "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80"

DEFAULT_DEPARTMENTS = [
    ("رجالي", MEN_DEPARTMENT_IMAGE),
    ("نسائي", WOMEN_DEPARTMENT_IMAGE),
]

DEFAULT_CATEGORIES = [
    ("الأحذية", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80"),
    ("الشنط", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"),
    ("الساعات", "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80"),
    ("النظارات والإكسسوارات", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80"),
]


def ensure_default_departments(db) -> list[Department]:
    """Ensures default departments exist in database with dedicated, distinct CDN images."""
    assert MEN_DEPARTMENT_IMAGE != WOMEN_DEPARTMENT_IMAGE, "Men and Women department images must be distinct!"

    results = []
    for name, default_img in DEFAULT_DEPARTMENTS:
        dept = db.scalar(select(Department).where(Department.name == name))
        if not dept:
            dept = Department(name=name, image_url=default_img)
            db.add(dept)
            db.flush()
        else:
            is_women_dept = any(w in name for w in ("نسا", "نساء", "نسائي", "نسائ", "women"))
            is_men_dept = any(w in name for w in ("رجال", "رجالي", "men"))

            # Always ensure permanent, non-ephemeral, non-broken images on Railway
            if not dept.image_url or dept.image_url.startswith("/uploads/") or dept.image_url.startswith("/images/"):
                dept.image_url = default_img
            elif is_women_dept and (
                "photo-1507679799987" in dept.image_url
                or "men" in dept.image_url.lower()
                or dept.image_url == MEN_DEPARTMENT_IMAGE
            ):
                dept.image_url = WOMEN_DEPARTMENT_IMAGE
            elif is_men_dept and (
                "photo-1508214751196" in dept.image_url
                or "women" in dept.image_url.lower()
                or dept.image_url == WOMEN_DEPARTMENT_IMAGE
            ):
                dept.image_url = MEN_DEPARTMENT_IMAGE

        results.append(dept)

    # Double-check database integrity: Women and Men departments must never share the same image
    dept_men = db.scalar(select(Department).where(Department.name.ilike("%رجال%")))
    dept_women = db.scalar(select(Department).where(or_(Department.name.ilike("%نسا%"), Department.name.ilike("%women%"))))
    if dept_men and dept_women:
        if dept_men.image_url == dept_women.image_url:
            dept_women.image_url = WOMEN_DEPARTMENT_IMAGE
            dept_men.image_url = MEN_DEPARTMENT_IMAGE

    db.commit()
    return results

DEMO_PRODUCTS = [
    # name, description, category_name, gender, price, discount, stock, image
    ("حذاء رياضي عصري", "حذاء رياضي خفيف بنعل مريح ومثالي للاستخدام اليومي والرياضة", "الأحذية", Gender.MEN, 420, 0, 45, "sneaker.jpg"),
    ("خفية كتد أنيقة", "خفية مريحة بتصميم عصري وألوان جذابة", "الأحذية", Gender.MEN, 750, 0, 35, "sneaker.jpg"),
    ("خفية جلد أنيقة", "خفية من الجلد الطبيعي الفاخر مبطنة بالكامل لراحة فائقة", "الأحذية", Gender.WOMEN, 750, 20, 40, "handbag.jpg"),
    ("محفظة جلد طبيعية", "محفظة جلدية متعددة الجيوب للبطاقات والعملات النقدية", "الشنط", Gender.MEN, 290, 0, 30, "black-bag.jpg"),
    ("حقيبة يد جلد أنيقة", "حقيبة يد نسائية من الجلد الفاخر مع حزام كتف قابل للتعديل", "الشنط", Gender.WOMEN, 750, 20, 25, "handbag.jpg"),
    ("حقيبة سوداء فاخرة", "حقيبة كلاسيكية راقية باللون الأسود الملكي بمقبض علوي", "الشنط", Gender.WOMEN, 1200, 10, 20, "black-bag.jpg"),
    ("ساعة ستانلس كلاسيك", "ساعة يد بسوار ستانلس ستيل مقاوم للصدأ ومقاومة للماء", "الساعات", Gender.MEN, 1450, 0, 10, "steel-watch.jpg"),
    ("ساعة جلد بني", "ساعة أنيقة بحزام من الجلد البني الطبيعي وميناء أبيض كلاسيكي", "الساعات", Gender.MEN, 990, 25, 15, "leather-watch.jpg"),
    ("ساعة نسائية ناعمة", "ساعة يد أنثوية رقيقة بإطار رفيع ولمسة ذهبية أنيقة", "الساعات", Gender.WOMEN, 870, 0, 20, "leather-watch.jpg"),
    ("ساعة كرونوغراف رياضية", "ساعة كرونوغراف عالية الدقة بتصميم رياضي متين", "الساعات", Gender.MEN, 2100, 30, 8, "steel-watch.jpg"),
    ("حذاء كلاسيك جلد أسود", "حذاء رسمي فخم للبدلات والمناسبات الرسمية", "الأحذية", Gender.MEN, 890, 15, 30, "sneaker.jpg"),
    ("كعب عالي بيج أنيق", "حذاء كعب عالي بلون بيج ناعم يكمل إطلالتك الساحرة", "الأحذية", Gender.WOMEN, 650, 20, 25, "heels.jpg"),
    ("حذاء سهرة نسائي لامع", "تصميم راقٍ ببريق لافت للحفلات والسهرات الخاصة", "الأحذية", Gender.WOMEN, 980, 0, 20, "heels.jpg"),
    ("حقيبة كتف يومية راقية", "حقيبة كروس بدي واسعة وعملية للمشاوير اليومية", "الشنط", Gender.WOMEN, 540, 0, 22, "handbag.jpg"),
    ("حقيبة لابتوب جلدية رجالية", "حقيبة عمل أنيقة تتسع للابتوب 15 بوصة والمستندات", "الشنط", Gender.MEN, 1350, 0, 15, "black-bag.jpg"),
    ("ساعة يد ذهبية فاخرة", "ساعة كوارتز بميناء ماسي وسوار مطلي بالذهب عيار 18", "الساعات", Gender.WOMEN, 1680, 15, 9, "steel-watch.jpg"),
    ("حذاء لوفر إيطالي كلاسيك", "حذاء لوفر بدون أربطة مصنوع يدوياً من الجلد المدبوغ", "الأحذية", Gender.MEN, 820, 10, 32, "sneaker.jpg"),
    ("حقيبة يد صغيرة للمناسبات", "كلتش مسائي أنيق مناسب للسهرات والحفلات", "الشنط", Gender.WOMEN, 490, 0, 25, "handbag.jpg"),
    ("ساعة يد كاجوال كلاسيك", "ساعة عصرية خفيفة الوزن تناسب الإطلالات اليومية والعمل", "الساعات", Gender.MEN, 780, 0, 14, "leather-watch.jpg"),
    ("محفظة كروت جلدية مضغوطة", "محفظة بطاقات صغيرة نحيفة مزودة بحماية RFID", "الشنط", Gender.MEN, 190, 0, 40, "black-bag.jpg"),
    ("نظارة شمسية كلاسيك بولارايزد", "نظارة شمسية فاخرة بإطار أنيق وعدسات مستقطبة لحماية كاملة من أشعة الشمس", "النظارات والإكسسوارات", Gender.MEN, 650, 15, 25, "sunglasses.jpg"),
    ("نظارة شمسية نسائية عصرية", "تصميم عصري جذاب بلمسات ذهبية راقية تناسب مختلف الإطلالات اليومية والمناسبات", "النظارات والإكسسوارات", Gender.WOMEN, 720, 20, 20, "sunglasses.jpg"),
]


def ensure_default_categories(db) -> dict[str, Category]:
    """Ensures the 4 default categories exist in database with permanent CDN images."""
    category_map = {}
    for name, default_img in DEFAULT_CATEGORIES:
        cat = db.scalar(select(Category).where(Category.name == name))
        if not cat:
            cat = Category(name=name, image_url=default_img)
            db.add(cat)
            db.flush()
        else:
            # Overwrite if image is missing or points to ephemeral local uploads/images on Railway
            if not cat.image_url or cat.image_url.startswith("/uploads/") or cat.image_url.startswith("/images/"):
                cat.image_url = default_img
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
    # Under unified OTP architecture, only the primary manager account is created by default
    return None


def seed_products(db, manager: User) -> None:
    cat_map = ensure_default_categories(db)
    existing = db.scalars(select(Product)).all()
    if existing:
        # Populate variants and link category_id if missing
        for p in existing:
            if not p.category_id:
                if any(w in p.name for w in ("حذاء", "خفية", "كعب", "لوفر")):
                    p.category_id = cat_map["الأحذية"].id
                elif any(w in p.name for w in ("حقيبة", "محفظة")):
                    p.category_id = cat_map["الشنط"].id
                elif "ساعة" in p.name:
                    p.category_id = cat_map["الساعات"].id
                else:
                    p.category_id = cat_map["الأحذية"].id

            is_shoes = p.category and ("حذاء" in p.category.name or "أحذية" in p.category.name)
            if is_shoes and not p.sizes:
                for sz, st in [(39, 5), (40, 8), (41, 10), (42, 12), (43, 8), (44, 5)]:
                    p.sizes.append(ProductSize(size=sz, stock=st))
            if not p.colors:
                p.colors.append(ProductColor(name="أسود", code="#111827"))
                p.colors.append(ProductColor(name="بني", code="#78350f"))

        # Check if glasses demo products exist, if not add them
        has_glasses = any(p.category_id == cat_map["النظارات والإكسسوارات"].id for p in existing)
        if not has_glasses:
            for name, desc, cat_key, gender, price, disc, stock, img in DEMO_PRODUCTS:
                if cat_key == "النظارات والإكسسوارات":
                    prod = Product(
                        name=name,
                        description=desc,
                        category_id=cat_map[cat_key].id,
                        gender=gender,
                        price=Decimal(price),
                        discount_percent=disc,
                        stock=stock,
                        created_by_id=manager.id,
                    )
                    prod.media.append(ProductMedia(url=f"{IMG}/{img}", media_type=MediaType.IMAGE, sort_order=0))
                    prod.colors.append(ProductColor(name="أسود", code="#111827"))
                    prod.colors.append(ProductColor(name="بني", code="#78350f"))
                    db.add(prod)

        db.commit()
        print("[INFO] Categories, products, and variants verified")
        return

    for name, desc, cat_key, gender, price, disc, stock, img in DEMO_PRODUCTS:
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
        p.media.append(ProductMedia(url=f"{IMG}/{img}", media_type=MediaType.IMAGE, sort_order=0))

        if "حذاء" in cat_obj.name or "أحذية" in cat_obj.name:
            for sz, st in [(39, 6), (40, 8), (41, 10), (42, 12), (43, 8), (44, 6)]:
                p.sizes.append(ProductSize(size=sz, stock=st))
            p.stock = sum(s.stock for s in p.sizes)

        p.colors.append(ProductColor(name="أسود", code="#111827"))
        p.colors.append(ProductColor(name="بني", code="#78350f"))
        db.add(p)
    db.commit()
    print(f"[OK] Seeded {len(DEMO_PRODUCTS)} demo products with dynamic categories")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        manager = ensure_first_manager(db)
        ensure_first_admin(db)
        if "--no-demo" not in sys.argv:
            seed_products(db, manager)


if __name__ == "__main__":
    main()
