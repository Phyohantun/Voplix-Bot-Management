# BotManager - Telegram Bot Management SaaS

A multi-tenant Telegram bot management platform where customers can connect their Telegram bot tokens and manage digital product sales, manual payments with slip verification, and broadcast messaging.

## Features

- **Authentication**: Email/password and Google OAuth via Supabase Auth
- **Bot Management**: Connect, validate, and manage multiple Telegram bots
- **Menu Builder**: Create products with digital delivery, manual delivery, or message-only types
- **Stock Management**: Queue-based stock system for digital products
- **Order Management**: Pending orders dashboard with slip verification and approval workflow
- **Broadcast**: Send messages to all users or paid customers only
- **Webhook Handler**: Receive and process Telegram bot updates
- **Real-time**: Supabase Realtime for live order notifications

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Storage + Auth)
- **Queue**: BullMQ + Redis (Upstash)
- **Security**: AES-256 encryption, RLS policies, CSRF protection

## Getting Started

### 1. Clone and Install

```bash
cd my-app
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `ENCRYPTION_KEY` - 32-byte hex encoded key for AES-256
- `UPSTASH_REDIS_URL` - Upstash Redis URL
- `UPSTASH_REDIS_TOKEN` - Upstash Redis token
- `NEXT_PUBLIC_APP_URL` - Your app URL (e.g., https://app.ismecy.com)

Generate encryption key:
```bash
openssl rand -hex 32
```

### 3. Database Setup

Run the SQL migration in Supabase SQL Editor:
- Open `supabase/migrations/001_initial_schema.sql`
- Copy and execute in Supabase Dashboard > SQL Editor

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Copy the bot token
3. Use the onboarding flow or `/onboarding` page to connect your bot

## Project Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Auth routes (login, signup)
│   │   ├── (dashboard)/       # Dashboard routes
│   │   ├── api/               # API routes
│   │   │   ├── bots/          # Bot management APIs
│   │   │   ├── menu-items/    # Menu item APIs
│   │   │   ├── orders/        # Order management APIs
│   │   │   ├── broadcast/     # Broadcast APIs
│   │   │   └── webhook/       # Telegram webhook handler
│   │   ├── onboarding/        # Bot connection flow
│   │   └── layout.tsx         # Root layout with toast
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── bots/              # Bot components
│   │   ├── menu/              # Menu builder components
│   │   └── orders/            # Orders components
│   ├── lib/
│   │   ├── supabase/          # Supabase clients
│   │   ├── encryption.ts      # AES-256 encryption
│   │   ├── telegram.ts        # Telegram API helpers
│   │   ├── redis.ts           # Redis connection
│   │   └── subscription.ts    # Plan management
│   └── middleware.ts          # Auth middleware
├── supabase/
│   └── migrations/            # Database migrations
└── .env.example               # Environment template
```

## Security

- All bot tokens encrypted at rest using AES-256-GCM
- Row Level Security (RLS) enabled on all tables
- Service role key used server-side only
- Webhook endpoints validate Telegram tokens by hash
- CSRF protection enabled

## Order Flow

1. User sends `/start` to bot → Menu displayed
2. User selects item → Order created (PENDING_PAYMENT)
3. User confirms → State changes to WAITING_FOR_SLIP
4. User uploads payment slip → Status: SLIP_SUBMITTED
5. Admin reviews slip in dashboard → Approves or Rejects
6. On approval → Digital product delivered or manual data sent
7. Order status: COMPLETED

## License

MIT

