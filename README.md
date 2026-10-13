# YSN Accessories Store — متجر YSN للإكسسوارات

Full-stack e-commerce store (Arabic / RTL / Mobile-first).

| Layer    | Stack                                   |
|----------|-----------------------------------------|
| Frontend | Vite + React + Tailwind CSS (v3)        |
| Backend  | Python + FastAPI + SQLAlchemy 2         |
| Database | PostgreSQL                              |
| Auth     | JWT (OAuth2 password flow) + RBAC       |

## Roles

| Role       | Permissions |
|------------|-------------|
| `manager`  | Full access: all customers, all sales/analytics, products, orders. Exclusive right to create `manager`/`admin` accounts. |
| `admin`    | Product CRUD, media upload, discounts, inventory, order management. Sees customer data **only** inside an order (shipping info). No sales analytics, no customer list. |
| `customer` | Browse, cart, checkout, own orders. |

## Running locally

### 1. Database
```bash
docker compose up -d db
```
(or use any PostgreSQL 14+ instance and set `DATABASE_URL`)

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (source .venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
copy .env.example .env        # then edit values
python -m app.seed            # creates tables, first manager, demo products
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

Default seeded manager (change immediately): `manager@ysn.com` / `ChangeMe123!`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173
