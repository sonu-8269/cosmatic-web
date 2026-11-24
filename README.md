# 💄 Cosmetics Web Platform (Cosmatic-Web)

A modern, scalable, production-ready full-stack cosmetics e-commerce ecosystem consisting of a high-performance customer storefront, dedicated super-admin portal, RBAC team management portal, and a robust Node.js/Express/MongoDB API.

---

## 🏗️ Architecture Overview

```
cosmetics-project/
├── backend/               # Node.js + Express + MongoDB REST API
│   ├── src/
│   │   ├── config/        # Database, Cloudinary, SMS (MSG91), Nodemailer, Razorpay
│   │   ├── models/        # User, Admin, TeamMember, Product, Category, Order, Cart, Coupon, Banner, ActivityLog, etc.
│   │   ├── controllers/   # customer/, admin/, team/
│   │   ├── routes/        # customer.routes.js, admin.routes.js, team.routes.js
│   │   ├── middlewares/   # Auth, Role, Permission (RBAC), RateLimit, Upload, ErrorHandler
│   │   ├── services/      # OTP, SMS, Email, Payment, Media, Invoice
│   │   ├── validators/    # Zod request validation schemas
│   │   └── utils/         # Tokens, API response helpers, Logger, Slugify
│   ├── .env.example
│   └── package.json
│
├── storefront/            # Customer Portal (Next.js 14/15 + Tailwind CSS + Zustand)
│   ├── Hero video (loop, muted), dynamic banner slider, category grid, best sellers
│   ├── Shop with faceted filters (category, skin/hair type, price, brand)
│   ├── Product detail page with image gallery, ingredients, variants, reviews
│   ├── Cart drawer & seamless checkout (Razorpay + COD)
│   └── Mobile OTP / Email authentication & Order tracking
│
├── admin-portal/          # Super Admin Portal (React + Vite + Tailwind CSS)
│   ├── Comprehensive analytics dashboard (revenue, orders, low stock alerts)
│   ├── Product management (with buying price hidden from public, variants, multi-image upload)
│   ├── Orders status pipeline & Invoice generation
│   ├── Granular Team permissions & activity audit logs
│   └── Coupons, Banners, Categories & System settings
│
└── team-portal/           # Staff / Operational Portal (React + Vite + Tailwind CSS)
    └── Dynamic permission-based navigation and action control
```

---

## 🔐 Security & Permission System (RBAC)

1. **Role Hierarchy**:
   - `super_admin`: Full system control, creates team accounts, assigns permissions, configures system fees & taxes.
   - `team_member`: Granular action-level permissions (`products.view`, `products.create`, `orders.update_status`, etc.).
   - `customer`: SMS OTP login / Email-password, cart, checkout, profile & order history.
2. **Buying Price Confidentiality**:
   - `buyingPrice` is strictly isolated to Admin responses and stripped in serialization for all customer-facing endpoints.
3. **Session Management**:
   - Short-lived JWT Access Tokens (15 min) + secure HTTP-only Refresh Tokens with token rotation.

---

## 🚀 Getting Started & Roadmap

1. **Step 1: Backend Foundation & Authentication** (MongoDB, JWT, RBAC, Customer OTP & Admin Auth)
2. **Step 2: Granular Permissions & Audit Logging**
3. **Step 3: Categories & Products Management** (Multi-image Cloudinary upload, variants, search & filters)
4. **Step 4: Coupons, Banners & Order Workflow** (Razorpay, COD, automated invoice PDF)
5. **Step 5: Super Admin Portal**
6. **Step 6: Team Operations Portal**
7. **Step 7: Next.js Customer Storefront**
