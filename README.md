# MT4 Trade Logger

Cloud middleware that receives closed trades from a MetaTrader 4 Expert Advisor and stores them permanently in **Supabase** (PostgreSQL).

---

## Features

- Receives trades via simple HTTP POST
- Saves every closed trade into Supabase
- Prevents duplicate tickets automatically
- Ready for future email notifications
- Simple health check and recent trades endpoints

---

## Quick Start

### 1. Create the table in Supabase

Go to **Supabase → SQL Editor** and run:

```sql
CREATE TABLE public.mt4_trades (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account       text NOT NULL,
  ticket        bigint NOT NULL,
  symbol        text NOT NULL,
  type          text NOT NULL,
  lots          numeric(12, 2) NOT NULL,
  open_price    numeric(18, 8) NOT NULL,
  close_price   numeric(18, 8),
  open_time     timestamptz NOT NULL,
  close_time    timestamptz,
  stop_loss     numeric(18, 8),
  take_profit   numeric(18, 8),
  commission    numeric(12, 4) DEFAULT 0,
  swap          numeric(12, 4) DEFAULT 0,
  profit        numeric(14, 4) DEFAULT 0,
  comment       text,
  created_at    timestamptz DEFAULT now(),
  
  CONSTRAINT mt4_trades_ticket_unique UNIQUE (ticket)
);

CREATE INDEX idx_mt4_trades_account ON public.mt4_trades (account);
CREATE INDEX idx_mt4_trades_close_time ON public.mt4_trades (close_time DESC);
```

### 2. Clone and setup

```bash
git clone https://github.com/k123456789brian-cmd/mt4-trade-logger.git
cd mt4-trade-logger
npm install
cp .env.example .env
```

### 3. Edit the `.env` file

Open `.env` and paste your **Supabase Transaction connection string** (port 6543).

You can find it here:  
**Supabase Dashboard → Project Settings → Database → Connection string → Transaction**

### 4. Run the server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

You should see:

```
✅ Connected to Supabase successfully
🚀 MT4 Trade Logger running on http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint       | Description                     |
|--------|----------------|---------------------------------|
| GET    | `/`            | Health check                    |
| POST   | `/api/trades`  | Receive a closed trade from EA  |
| GET    | `/api/trades`  | Get recent trades (for testing) |

### Example POST body (from MT4 EA)

```json
{
  "account": "12345678",
  "ticket": 987654321,
  "symbol": "EURUSD",
  "type": "buy",
  "lots": 0.10,
  "openPrice": 1.08500,
  "closePrice": 1.08750,
  "openTime": "2026-11-08T10:30:00Z",
  "closeTime": "2026-11-08T11:15:00Z",
  "stopLoss": 1.08200,
  "takeProfit": 1.09000,
  "commission": -0.70,
  "swap": 0,
  "profit": 25.00,
  "comment": "Scalp"
}
```

---

## Next Steps

1. Deploy this server (Railway, Render, or VPS)
2. Point your MT4 EA to the deployed URL + `/api/trades`
3. Add automatic email reports

---

**Repo:** https://github.com/k123456789brian-cmd/mt4-trade-logger
