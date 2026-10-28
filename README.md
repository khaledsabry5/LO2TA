# YSN Store — متجر YSN

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

---

## 🚀 Automated VPS Deployment (`ysn-store.cloud`)

To deploy on a fresh Ubuntu 22.04 or 24.04 VPS:

### 1. Point Domain DNS
Add **A Records** in your domain registrar (e.g., Namecheap, Cloudflare, GoDaddy):
- `ysn-store.cloud` -> `<YOUR_VPS_IP>`
- `www.ysn-store.cloud` -> `<YOUR_VPS_IP>`

### 2. Connect to VPS & Run Setup
```bash
# Clone the repository
git clone https://github.com/khaledsabry5/LO2TA.git
cd LO2TA

# Prepare your production environment variables
cp .env.example .env
nano .env   # (Add your Brevo, Cloudinary, and custom manager credentials)

# Run the automated deployment script
chmod +x setup.sh deploy.sh get-ssl.sh
sudo ./setup.sh
```

The script automatically:
1. Installs Docker, Docker Compose, Git, and UFW firewall.
2. Opens ports `22` (SSH), `80` (HTTP), and `443` (HTTPS).
3. Generates secure secrets and builds production Docker containers (PostgreSQL, FastAPI backend, React frontend, Nginx reverse proxy).
4. Issues official Let's Encrypt SSL certificates for `ysn-store.cloud`.

### 3. Continuous Updates
For subsequent code updates, simply run:
```bash
sudo ./deploy.sh
```

