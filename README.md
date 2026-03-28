# GreenStake — Golf Charity Subscription Platform

A full-stack web application where golf enthusiasts enter their Stableford scores for monthly prize draws while supporting charities.

## Tech Stack

- **Frontend:** React 19 + Vite, Plain CSS, React Router, Axios
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Payments:** Razorpay
- **Auth:** JWT

## Project Structure

```
proj/
├── server/                 # Express backend
│   ├── config/             # DB, Razorpay config, SQL schema
│   ├── middleware/          # Auth, validation
│   ├── routes/             # REST API routes
│   ├── services/           # Business logic
│   ├── server.js           # Entry point
│   └── .env
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Navbar, Footer, ProtectedRoute
│   │   ├── pages/          # Home, Login, Register, Dashboard, etc.
│   │   ├── context/        # AuthContext
│   │   ├── services/       # API client
│   │   └── App.jsx
│   └── .env
└── README.md
```

## Setup Instructions

### 1. Database Setup (Supabase)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `server/config/schema.sql`
3. Copy your project URL and **service role key** (not anon key)

### 2. Backend Setup

```bash
cd server
```

Edit `.env` with your credentials:
```env
PORT=5001
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
RAZORPAY_KEY_ID=rzp_test_SPVkmqExKlRob0
RAZORPAY_KEY_SECRET=QLArPL4aulCf04K1kI5YztkT
CLIENT_URL=http://localhost:5173
```

Install and run:
```bash
npm install
npm run dev
```

Backend runs on **http://localhost:5001**

### 3. Frontend Setup

```bash
cd client
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5001/api
VITE_RAZORPAY_KEY_ID=rzp_test_SPVkmqExKlRob0
```

Install and run:
```bash
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

### 4. Create Admin User

Register normally, then run this in the Supabase SQL Editor:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Testing Flow

1. **Register** → Create account, pick a charity
2. **Subscribe** → Choose monthly/yearly plan, pay via Razorpay (test mode)
3. **Add Scores** → Enter 5 Stableford scores (1–45)
4. **Admin: Simulate Draw** → Go to admin panel → Draws → Simulate
5. **Admin: Publish Draw** → Click "Publish" on a simulated draw
6. **Check Winnings** → If matched, view in Winnings page
7. **Upload Proof** → Upload a screenshot as verification
8. **Admin: Verify & Pay** → Approve proof, mark as paid

## Razorpay Test Cards

| Card | Number |
|------|--------|
| Success | 4111 1111 1111 1111 |
| Decline | 5267 3181 8797 5449 |

Use any future expiry date and any CVV.

## Features

- ✅ JWT-based authentication (user + admin roles)
- ✅ Razorpay subscription payments
- ✅ Rolling 5-score management
- ✅ Monthly draw system with simulation & publish
- ✅ 5/4/3-number match tiers with prize pool distribution
- ✅ Jackpot rollover for unclaimed 5-match
- ✅ Charity selection with minimum 10% contribution
- ✅ Winner verification with proof upload
- ✅ User dashboard (subscription, scores, charities, draws, winnings)
- ✅ Admin dashboard (analytics, users, draws, winners, charities)
- ✅ Responsive mobile-first design
- ✅ Modern dark theme with glassmorphism and animations
- ✅ Email-notification-ready structure
