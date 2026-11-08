require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// ============================================
// Database Connection (Supabase)
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false   // Required for Supabase
  },
  max: 10
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Connected to Supabase successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('→ Check your DATABASE_URL in the .env file');
  });

// ============================================
// Routes
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MT4 Trade Logger is running',
    timestamp: new Date().toISOString()
  });
});

// Receive trades from MT4 EA
app.post('/api/trades', async (req, res) => {
  try {
    const {
      account,
      ticket,
      symbol,
      type,
      lots,
      openPrice,
      closePrice,
      openTime,
      closeTime,
      stopLoss,
      takeProfit,
      commission,
      swap,
      profit,
      comment
    } = req.body;

    // Basic validation
    if (!account || !ticket || !symbol || !type || !lots || !openPrice || !openTime) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: account, ticket, symbol, type, lots, openPrice, openTime'
      });
    }

    const query = `
      INSERT INTO mt4_trades (
        account, ticket, symbol, type, lots,
        open_price, close_price, open_time, close_time,
        stop_loss, take_profit, commission, swap, profit, comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (ticket) DO NOTHING
      RETURNING *;
    `;

    const values = [
      String(account),
      Number(ticket),
      String(symbol).toUpperCase(),
      String(type).toLowerCase(),
      Number(lots),
      Number(openPrice),
      closePrice ? Number(closePrice) : null,
      openTime,
      closeTime || null,
      stopLoss ? Number(stopLoss) : null,
      takeProfit ? Number(takeProfit) : null,
      commission ? Number(commission) : 0,
      swap ? Number(swap) : 0,
      profit ? Number(profit) : 0,
      comment || null
    ];

    const result = await pool.query(query, values);

    // Duplicate ticket
    if (result.rows.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Trade already exists (duplicate ticket ignored)'
      });
    }

    const savedTrade = result.rows[0];
    console.log(`✅ Trade #${savedTrade.ticket} | ${savedTrade.symbol} | ${savedTrade.type} | Profit: ${savedTrade.profit}`);

    // TODO: Add email notification here later
    // await sendTradeEmail(savedTrade);

    return res.status(201).json({
      status: 'success',
      data: savedTrade
    });

  } catch (error) {
    console.error('❌ Error saving trade:', error.message);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get recent trades (useful for testing)
app.get('/api/trades', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const result = await pool.query(
      `SELECT * FROM mt4_trades ORDER BY close_time DESC NULLS LAST, created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// Start Server
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MT4 Trade Logger running on http://localhost:${PORT}`);
  console.log(`   POST /api/trades  → Receive trades from EA`);
  console.log(`   GET  /api/trades  → View recent trades`);
});
