# ResQTag — QR-Based Emergency Information System

ResQTag is a modern, responsive, and privacy-focused emergency information web application. It allows users to store vital medical data and emergency contacts, selectively choose which fields are publicly visible, and generate a dynamic QR code that can be attached to a keychain, backpack, or wallet card.

When scanned, responders instantly see approved medical alerts (e.g., blood type, allergies) and can directly call emergency contacts with a single tap.

---

## 🌟 Key Features

1. **Strict Server-Side Privacy Whitelist**:
   - Private fields are filtered at the database level and never transmitted to the browser on public emergency scans.
   - Field-by-field privacy matrix (Full Name, Phone, Address, Blood Type, Allergies, Conditions, Medications, Emergency Notes).
2. **Dynamic Unguessable QR Tokens**:
   - The physical QR code links to a secure random token (e.g., `https://resqtag.com/emergency/a8f42c91d7e34b62`).
   - If your medical details change, simply update your dashboard without reprinting.
   - If your tag is lost, click **Regenerate QR** to invalidate the old tag immediately.
3. **One-Touch Emergency Dialing**:
   - Direct `tel:` mobile buttons for public emergency contacts (`[ 📞 CALL GUARDIAN (0917-123-4567) ]`).
4. **Instant Tag Deactivation**:
   - Toggle QR status between **Active** and **Inactive** anytime from your dashboard.
5. **Printable Keychain & Wallet Templates**:
   - Built-in print-ready templates designed for physical keychains and wallet cards.
6. **Administrator Oversight**:
   - Manage user statuses and view system analytics without exposing private medical data.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, `qrcode.react`, Axios, React Router v6
- **Backend**: Node.js, Express.js, REST API, `mysql2/promise`, `bcryptjs`, `jsonwebtoken`
- **Database**: MySQL 8.0+ / Aiven Managed MySQL (SSL enabled)
- **Deployment**: Render (Backend Web Service) + Vercel / Netlify / Render (Frontend)

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MySQL / Aiven database credentials
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ Deployment Guide (Render + Aiven)

### 1. Aiven Managed MySQL
1. Create a MySQL service in [Aiven](https://aiven.io).
2. Copy the **Service URI** (e.g. `mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED`).
3. ResQTag automatically runs migrations on startup, creating all tables and the initial admin account.

### 2. Render Backend Web Service
1. Create a **New Web Service** on Render connected to your repository.
2. Set **Root Directory**: `server`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add Environment Variables:
   - `DATABASE_URL`: Your Aiven MySQL Service URI
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: Your deployed frontend URL (e.g. `https://resqtag.vercel.app`)
   - `JWT_SECRET`: A secure random secret string

### 3. Frontend Deployment (Vercel / Render / Netlify)
1. Deploy `client/` directory with Build Command `npm run build` and Output Directory `dist`.
2. Add Environment Variable:
   - `VITE_API_URL`: Your Render backend URL (e.g. `https://resqtag-api.onrender.com/api`)

---

## 👤 Default Administrator Account
Upon the first database migration, the following default admin is seeded:
- **Email**: `admin@resqtag.com`
- **Password**: `Admin@123456`

*(Remember to change this password after your first login via Account Settings)*