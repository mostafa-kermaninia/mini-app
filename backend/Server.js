const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { Pool } = require('pg'); // اضافه کردن pg برای PostgreSQL
const mathEngine = require('./math_engine');

// // تنظیمات اتصال به دیتابیس
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL, // از متغیر محیطی Render استفاده می‌کند
//   ssl: {
//     rejectUnauthorized: false // برای اتصال به دیتابیس Render
//   }
// });

// // تست اتصال به دیتابیس
// pool.query('SELECT NOW()', (err, res) => {
//   if (err) {
//     console.error('اتصال به دیتابیس ناموفق:', err);
//   } else {
//     console.log('اتصال به دیتابیس موفق در:', res.rows[0].now);
//   }
// });

const app = express();

// تنظیمات CORS برای Render
const allowedOrigins = [
  'https://math-game-frontend.onrender.com', // آدرس فرانت‌اند در Render
  'http://localhost:3000'
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// تغییر کلاس Player برای ذخیره در دیتابیس
class Player {
  constructor(playerId) {
    this.id = playerId;
    this.score = 0;
    this.top_score = 0;
    this.time_left = 40;
    this.game_active = false;
    this.current_problem = "";
    this.current_answer = null;
    this.last_activity = new Date();
  }

  async save() {
    await pool.query(
      `INSERT INTO players (id, score, top_score, time_left, game_active, current_problem, current_answer, last_activity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE
       SET score = $2, top_score = $3, time_left = $4, game_active = $5, current_problem = $6, current_answer = $7, last_activity = $8`,
      [this.id, this.score, this.top_score, this.time_left, this.game_active, this.current_problem, this.current_answer, this.last_activity]
    );
  }

  static async find(playerId) {
    const res = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
    return res.rows[0];
  }
}

// تغییر کلاس MathGame برای کار با دیتابیس
class MathGame {
  constructor() {
    this.cleanup_interval = 600000;
    this.startCleanup();
  }

  async startGame(playerId = null) {
    try {
      playerId = playerId || uuidv4();
      let player = await Player.find(playerId);

      if (!player) {
        player = new Player(playerId);
      } else {
        // بازیابی وضعیت قبلی از دیتابیس
        player = Object.assign(new Player(playerId), player);
      }

      // منطق شروع بازی
      player.game_active = true;
      player.time_left = 40;
      player.top_score = Math.max(player.top_score, player.score);
      player.score = 0;
      player.last_activity = new Date();

      const { problem, is_correct } = mathEngine.generate();
      player.current_problem = problem;
      player.current_answer = is_correct;

      await player.save();

      return {
        status: "success",
        player_id: playerId,
        problem: problem,
        time_left: player.time_left,
        score: player.score,
        game_active: true
      };
    } catch (e) {
      console.error('خطا در شروع بازی:', e);
      return { status: "error", message: e.message };
    }
  }
}

const gameInstance = new MathGame();

// مسیرهای API
app.post('/api/start', async (req, res) => {
  try {
    const result = await gameInstance.startGame(req.body?.player_id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// سایر مسیرهای API با تغییرات مشابه...

// سرویس دهی فایل‌های فرانت‌اند
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// پورت از متغیر محیطی Render استفاده می‌کند
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`سرور در حال اجرا روی پورت ${PORT}`);
});