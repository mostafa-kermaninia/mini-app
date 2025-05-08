const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const mathEngine = require('./math_engine.js');
const crypto = require('crypto');
const fetch = require('node-fetch');
import validateTelegramData from './telegramAuth.js';

// تنظیمات پایه
const app = express();

// تنظیمات CORS برای Render
const allowedOrigins = [
    'https://math-game-momis.onrender.com', // آدرس فرانت‌اند در Render
    'http://localhost:5000'
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

// بهبود سیستم لاگینگ
const logger = {
    info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
    error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`)
};

class Player {
    constructor(playerId, telegramUser) {
        this.id = playerId;
        this.telegramUser = telegramUser; // اطلاعات کاربر تلگرام
        this.score = 0;
        this.top_score = 0;
        this.time_left = 40;
        this.game_active = false;
        this.current_problem = "";
        this.current_answer = null;
        this.timer = null;
        this.should_stop = false;
        this.last_activity = new Date();
        logger.info(`New player created: ${telegramUser}`);
    }
}

class MathGame {
    constructor() {
        this.players = {};
        this.total_time = 40;
        this.cleanup_interval = 600000; // 10 minutes in milliseconds
        this.startCleanup();
        logger.info("MathGame initialized");
    }

    startCleanup() {
        setInterval(() => {
            try {
                this.cleanupInactivePlayers();
            } catch (e) {
                logger.error(`Cleanup error: ${e.message}`);
            }
        }, this.cleanup_interval);
    }

    cleanupInactivePlayers() {
        const now = new Date();
        Object.keys(this.players).forEach(pid => {
            try {
                if ((now - this.players[pid].last_activity) > this.cleanup_interval) {
                    if (this.players[pid].timer) {
                        this.players[pid].should_stop = true;
                        clearTimeout(this.players[pid].timer);
                    }
                    delete this.players[pid];
                    logger.info(`Cleaned up inactive player: ${pid}`);
                }
            } catch (e) {
                logger.error(`Error cleaning player ${pid}: ${e.message}`);
            }
        });
    }

    runTimer(playerId) {
        const player = this.players[playerId];
        if (!player) return;

        player.should_stop = false;

        const tick = () => {
            if (!player || player.should_stop || !player.game_active) return;

            player.time_left -= 1;
            player.last_activity = new Date();

            if (player.time_left <= 0) {
                player.game_active = false;
                logger.info(`Player ${playerId} game over - time expired`);
                return;
            }

            player.timer = setTimeout(tick, 1000);
        };

        player.timer = setTimeout(tick, 1000);
    }

    startGame(playerId = null, initData = null) {
        let telegramUser = null;
        try {
            let isNewPlayer = false;
    
            // اعتبارسنجی داده‌های تلگرام اگر وجود دارند
            if (initData) {
                try {
                    telegramUser = validateTelegramData(initData, process.env.BOT_TOKEN);
                    logger.info(`Telegram user validated: ${telegramUser?.id}`);
                } catch (error) {
                    logger.info(`Telegram validation failed: ${error.message}`);
                    // ادامه اجرا حتی اگر اعتبارسنجی شکست خورد
                }
            }
    
            // تولید شناسه بازیکن جدید اگر وجود نداشته باشد
            playerId = playerId || uuidv4();
    
            // مدیریت بازیکن موجود یا جدید
            if (this.players[playerId]) {
                const player = this.players[playerId];
                
                // به روزرسانی اطلاعات تلگرام اگر وجود دارد
                if (telegramUser) {
                    player.telegramUser = telegramUser;
                }
                
                // تایمر قبلی را متوقف کن
                if (player.timer) {
                    clearTimeout(player.timer);
                }
            } else {
                this.players[playerId] = new Player(playerId, telegramUser);
                isNewPlayer = true;
            }
    
            const player = this.players[playerId];
            
            // تنظیمات اولیه بازی
            player.game_active = true;
            player.time_left = this.total_time;
            
            // فقط برای بازیکنان جدید، امتیاز را ریست کن
            if (isNewPlayer) {
                player.top_score = 0;
                player.score = 0;
            }
            
            player.should_stop = false;
            player.last_activity = new Date();
    
            // تولید مسئله جدید
            const { problem, is_correct } = mathEngine.generate();
            player.current_problem = problem;
            player.current_answer = is_correct;
    
            // شروع تایمر
            this.runTimer(playerId);
    
            logger.info(`Game started for ${playerId}`, {
                isNewPlayer,
                telegramUser: !!telegramUser
            });
            logger.info(`Telegram user started the game: ${telegramUser}`);

            return {
                status: "success",
                player_id: playerId,
                problem: problem,
                time_left: player.time_left,
                score: player.score,
                game_active: true,
                is_new_player: isNewPlayer,
                telegramUser: telegramUser || null
            };
        } catch (e) {
            logger.error(`Start game error: ${e.message}`, {
                stack: e.stack
            });
            return {
                status: "error",
                message: "Failed to start game",
                details: process.env.NODE_ENV === 'development' ? e.message : null
            };
        }
    }

    checkAnswer(playerId, userAnswer) {
        try {
            if (!this.players[playerId]) {
                return {
                    status: "error",
                    message: "Player not found. Start a new game."
                };
            }

            const player = this.players[playerId];
            player.last_activity = new Date();

            if (!player.game_active) {
                return {
                    status: "game_over",
                    final_score: player.score
                };
            }

            const is_correct = (userAnswer === player.current_answer);

            if (is_correct) {
                player.time_left = Math.min(40, player.time_left + 5);
                player.score += 1;
                player.top_score = Math.max(player.top_score, player.score);
            } else {
                player.time_left = Math.max(0, player.time_left - 10);
            }

            if (player.time_left <= 0) {
                player.game_active = false;
                return {
                    status: "game_over",
                    final_score: player.score
                };
            }

            const { problem, is_correct: answer } = mathEngine.generate();
            player.current_problem = problem;
            player.current_answer = answer;

            return {
                status: "continue",
                problem: problem,
                time_left: player.time_left,
                score: player.score,
                feedback: is_correct ? "correct" : "wrong",
                game_active: true
            };
        } catch (e) {
            logger.error(`Check answer error: ${e.message}`);
            return {
                status: "error",
                message: e.message
            };
        }
    }
}

const gameInstance = new MathGame();

// Route برای سرویس دهی فایل‌های استاتیک
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API Routes

app.post('/api/telegram-auth', (req, res) => {
    try {
      const { initData } = req.body;
      
      if (!initData) {
        return res.status(400).json({ valid: false });
      }
  
      const user = validateTelegramData(initData, process.env.BOT_TOKEN);
      
      return res.json({
        valid: true,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username
        }
      });
  
    } catch (error) {
      console.error('Telegram auth error:', error);
      return res.status(401).json({ valid: false });
    }
  });


app.post('/api/start', async (req, res) => {
    try {
        // اعتبارسنجی اولیه بدنه درخواست
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                status: "error",
                message: "Invalid request body"
            });
        }

        const { player_id, initData } = req.body;

        // اعتبارسنجی اولیه پارامترها
        if (player_id && typeof player_id !== 'string') {
            return res.status(400).json({
                status: "error",
                message: "player_id must be a string if provided"
            });
        }

        if (initData && typeof initData !== 'string') {
            return res.status(400).json({
                status: "error",
                message: "initData must be a string if provided"
            });
        }

        // لاگ درخواست ورودی (با حذف داده‌های حساس برای لاگ)
        logger.info(`Start game request`, {
            player_id: player_id ? `${player_id.substring(0, 3)}...` : 'null',
            has_initData: !!initData
        });

        const result = await gameInstance.startGame(player_id, initData);

        // اعتبارسنجی پاسخ
        if (!result || typeof result !== 'object') {
            throw new Error("Invalid response from gameInstance.startGame");
        }

        // لاگ پاسخ خروجی (بدون اطلاعات حساس)
        logger.info(`Game started successfully`, {
            player_id: result.player_id ? `${result.player_id.substring(0, 3)}...` : 'null',
            status: result.status
        });

        res.json(result);

    } catch (e) {
        logger.error(`API start error: ${e.message}`, {
            stack: e.stack,
            request_body: process.env.NODE_ENV === 'development' ? req.body : 'hidden'
        });

        res.status(500).json({ 
            status: "error",
            message: "Internal server error",
            ...(process.env.NODE_ENV === 'development' && {
                details: e.message,
                stack: e.stack
            })
        });
    }
});

app.post('/api/answer', (req, res) => {
    try {
        const { player_id, answer } = req.body;
        
        if (!player_id || answer === undefined) {
            return res.status(400).json({ 
                status: "error", 
                message: "player_id and answer are required" 
            });
        }

        const result = gameInstance.checkAnswer(player_id, answer);
        res.json(result);
    } catch (e) {
        logger.error(`API answer error: ${e.message}`);
        res.status(500).json({ 
            status: "error", 
            message: "Internal server error" 
        });
    }
});

// اضافه کردن این Route قبل از خط app.get('*', ...)
app.get('/api/leaderboard', (req, res) => {
    try {
        // تبدیل players به آرایه و مرتب‌سازی بر اساس امتیاز
        const leaderboard = Object.values(gameInstance.players)
            .map(player => ({
                player_id: player.id,
                score: player.top_score,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // 10 رکورد برتر

        res.json({
            status: "success",
            leaderboard
        });
    } catch (e) {
        logger.error(`Leaderboard error: ${e.message}`);
        res.status(500).json({
            status: "error",
            message: "Internal server error"
        });
    }
});

// Route اصلی برای فرانت‌اند
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// پورت از متغیر محیطی Render استفاده می‌کند
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
