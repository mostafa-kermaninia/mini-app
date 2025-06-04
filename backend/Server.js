require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const mathEngine = require("./math_engine.js");
const validateTelegramData = require("./telegramAuth").default;
const jwt = require("jsonwebtoken");

// تنظیمات پایه
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const allowedOrigins = [
    "https://my-frontend.loca.lt",
    "https://math-backend.loca.lt",
    "https://web.telegram.org",
];

// Middleware برای CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", allowedOrigins);
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    credentials: true,
    optionsSuccessStatus: 200,
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// بهبود سیستم لاگینگ
const logger = {
    info: (message) =>
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
    error: (message) =>
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
};

class Player {
    constructor(playerId, jwtPayload) {
        this.id = playerId;
        this.jwtPayload = jwtPayload; // اطلاعات کاربر از توکن JWT
        this.score = 0;
        this.top_score = 0;
        this.time_left = 40;
        this.game_active = false;
        this.current_problem = "";
        this.current_answer = null;
        this.timer = null;
        this.should_stop = false;
        this.last_activity = new Date();
        logger.info(`New player created: ${jwtPayload?.userId}`);
    }
}

class MathGame {
    constructor() {
        this.players = {}; // playerId -> Player
        this.userToPlayerMap = {}; // userId -> playerId
        this.total_time = 40;
        this.cleanup_interval = 600000;
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
        Object.keys(this.players).forEach((pid) => {
            try {
                if (
                    now - this.players[pid].last_activity >
                    this.cleanup_interval
                ) {
                    const player = this.players[pid];
                    
                    // حذف از نگاشت کاربر به بازیکن
                    if (player.jwtPayload?.userId) {
                        delete this.userToPlayerMap[player.jwtPayload.userId];
                    }
                    
                    if (player.timer) {
                        player.should_stop = true;
                        clearTimeout(player.timer);
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

    startGame(jwtPayload) {
        try {
            const userId = jwtPayload?.userId;
            if (!userId) {
                throw new Error("User ID is missing in JWT payload");
            }

            // یافتن بازیکن موجود بر اساس userId
            let playerId = this.userToPlayerMap[userId];
            let isNewPlayer = false;

            if (playerId && this.players[playerId]) {
                const player = this.players[playerId];
                
                // به روزرسانی اطلاعات کاربر
                player.jwtPayload = jwtPayload;

                if (player.timer) {
                    clearTimeout(player.timer);
                }
            } else {
                // ایجاد بازیکن جدید
                playerId = uuidv4();
                this.players[playerId] = new Player(playerId, jwtPayload);
                this.userToPlayerMap[userId] = playerId;
                isNewPlayer = true;
            }

            const player = this.players[playerId];

            // تنظیمات اولیه بازی
            player.game_active = true;
            player.time_left = this.total_time;
            player.score = 0;

            if (isNewPlayer) {
                player.top_score = 0;
            }

            player.should_stop = false;
            player.last_activity = new Date();

            // تولید مسئله جدید
            const { problem, is_correct } = mathEngine.generate();
            player.current_problem = problem;
            player.current_answer = is_correct;

            // شروع تایمر
            this.runTimer(playerId);

            logger.info(`Game started for user ${userId}`, {
                playerId,
                isNewPlayer
            });

            return {
                status: "success",
                player_id: playerId,
                problem: problem,
                time_left: player.time_left,
                score: player.score,
                game_active: true,
                is_new_player: isNewPlayer,
                user: {
                    userId: jwtPayload.userId,
                    firstName: jwtPayload.firstName,
                    lastName: jwtPayload.lastName,
                    username: jwtPayload.username,
                    userImage: jwtPayload.userImage,
                }
            };
        } catch (e) {
            logger.error(`Start game error: ${e.message}`, {
                stack: e.stack,
            });
            return {
                status: "error",
                message: "Failed to start game",
                details:
                    process.env.NODE_ENV === "development" ? e.message : null,
            };
        }
    }

    checkAnswer(userId, userAnswer) {
        try {
            const playerId = this.userToPlayerMap[userId];
            if (!playerId || !this.players[playerId]) {
                return {
                    status: "error",
                    message: "Player not found. Start a new game.",
                };
            }

            const player = this.players[playerId];
            player.last_activity = new Date();

            if (!player.game_active) {
                return {
                    status: "game_over",
                    final_score: player.score,
                };
            }

            const is_correct = userAnswer === player.current_answer;

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
                    final_score: player.score,
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
                game_active: true,
            };
        } catch (e) {
            logger.error(`Check answer error: ${e.message}`);
            return {
                status: "error",
                message: e.message,
            };
        }
    }
}

const gameInstance = new MathGame();

// Middleware احراز هویت با JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Authentication token required" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            logger.error(`JWT verification failed: ${err.message}`);
            return res.status(403).json({ error: "Invalid or expired token" });
        }

        req.user = decoded; // ذخیره اطلاعات کاربر در درخواست
        next();
    });
};

// Route برای سرویس دهی فایل‌های استاتیک
app.use(express.static(path.join(__dirname, "../frontend/build")));

// API Routes

// اعتبارسنجی داده‌های تلگرام و تولید JWT
app.post("/api/telegram-auth", (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            logger.error("[Telegram Auth] No initData provided");
            return res.status(400).json({
                valid: false,
                message: "initData is required",
            });
        }

        // اعتبارسنجی داده‌های تلگرام
        const userData = validateTelegramData(initData, process.env.BOT_TOKEN);

        // ساخت JWT
        const token = jwt.sign(
            {
                userId: userData.id,
                firstName: userData.first_name,
                lastName: userData.last_name,
                username: userData.username,
                userImage: userData.photo_url,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" } // انقضا توکن
        );

        // لاگ موفقیت آمیز (بدون اطلاعات حساس)
        logger.info(
            `Telegram authentication successful for user: ${userData.id}`
        );

        return res.json({
            valid: true,
            user: {
                id: userData.id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                username: userData.username,
                language_code: userData.language_code,
                allows_write_to_pm: userData.allows_write_to_pm,
                photo_url: userData.photo_url,
            },
            token: token,
        });
    } catch (error) {
        logger.error("Telegram auth error:", {
            error: error.message,
            stack: error.stack,
        });

        return res.status(401).json({
            valid: false,
            message: "Authentication failed",
        });
    }
});
// mostafa
// شروع بازی با احراز هویت JWT
app.post("/api/start", authenticateToken, async (req, res) => {
    try {
        const user = req.user; // اطلاعات کاربر از توکن

        logger.info(`Start game request for user: ${user.userId}`);

        const result = await gameInstance.startGame({
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            userImage: user.userImage,
        });

        res.json(result);
    } catch (e) {
        logger.error(`API start error: ${e.message}`, {
            stack: e.stack,
        });

        res.status(500).json({
            status: "error",
            message: "Internal server error",
            ...(process.env.NODE_ENV === "development" && {
                details: e.message,
            }),
        });
    }
});

// ارسال پاسخ با احراز هویت JWT
app.post("/api/answer", authenticateToken, (req, res) => {
    try {
        const { answer } = req.body;
        const user = req.user; // اطلاعات کاربر از توکن

        if (answer === undefined) {
            return res.status(400).json({
                status: "error",
                message: "Answer is required",
            });
        }

        const result = gameInstance.checkAnswer(user.userId, answer);

        res.json(result);
    } catch (e) {
        logger.error(`API answer error: ${e.message}`, {
            stack: e.stack,
        });

        res.status(500).json({
            status: "error",
            message: "Internal server error",
            ...(process.env.NODE_ENV === "development" && {
                details: e.message,
            }),
        });
    }
});

// لیست برترین‌ها
app.get("/api/leaderboard", (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // تبدیل بازیکنان به آرایه و مرتب‌سازی
        const allPlayers = Object.values(gameInstance.players)
            .filter(player => player.jwtPayload) // فقط بازیکنان احراز شده
            .map((player) => ({
                player_id: player.id,
                score: player.top_score,
                username: player.jwtPayload.username,
                first_name: player.jwtPayload.firstName,
                user_image: player.jwtPayload.userImage,
            }))
            .sort((a, b) => b.score - a.score);

        const leaderboard = allPlayers.slice(offset, offset + limit);
        const total = allPlayers.length;

        res.json({
            status: "success",
            leaderboard,
            meta: {
                total,
                limit,
                offset,
                has_more: offset + limit < total,
            },
        });
    } catch (e) {
        logger.error(`Leaderboard error: ${e.message}`, {
            stack: e.stack,
        });

        res.status(500).json({
            status: "error",
            message: "Internal server error",
            ...(process.env.NODE_ENV === "development" && {
                details: e.message,
            }),
        });
    }
});

// Route اصلی برای فرانت‌اند
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

// پورت از متغیر محیطی استفاده می‌کند
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
});