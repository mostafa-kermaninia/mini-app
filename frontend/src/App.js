import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import ProblemCard   from "./components/ProblemCard";
import AnswerButtons from "./components/AnswerButtons";
import TimerCircle   from "./components/TimerCircle";
import Leaderboard   from "./components/Leaderboard";

/* ثابت‌ها */
const ROUND_TIME = 40;                                 // طول هر دور
const POLL_MS    = 5000;                               // بازهٔ استعلام از سرور
// در فایل App.js
const API_BASE = 'https://your-vercel-app-name.vercel.app/api';

function App() {
  /* ---------- State ---------- */
  const [playerId, setPlayerId] = useState(
    localStorage.getItem("playerId") || ""
  );
  const [gameData, setGameData] = useState(null);      // { problem }
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [loading,  setLoading]  = useState(false);
  const [view, setView] = useState("game"); // "game" | "board"
  const [finalScore, setFinalScore] = useState(null);   // NEW
  const [score, setScore] = useState(0);
  /* ---------- refs ---------- */
  const timerId = useRef(null);                        // شناسهٔ setInterval

  /* ---------- Helpers ---------- */
  const clearLocalTimer = () => clearInterval(timerId.current);

  /** شمارش معکوس را از مقدار داده‌شده شروع یا ری‌استارت می‌کند. */
  const startLocalTimer = useCallback(
    (initial) => {
      clearLocalTimer();
      setTimeLeft(initial);

      timerId.current = setInterval(() => {
        setTimeLeft((left) => {
          if (left <= 1) {
            clearLocalTimer();
            handleTimeout();                           // زمان تمام شد
            return 0;
          }
          return left - 1;
        });
      }, 1000);
    },
    []                                                 // handleTimeout بعداً تعریف می‌شود اما اینجا لازم نیست
  );

  /** وقتی زمان صفر شود، پاسخ «نادرست» می‌فرستیم. */
  const handleTimeout = useCallback(() => {
    if (gameData) submitAnswer(false);
  }, [gameData]);

  /* -------- API: شروع بازی -------- */
  const startGame = async () => {
    setLoading(true);
    setView("game");

    try {
      const res = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId || "" }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to start game");
      }

      setGameData({ problem: data.problem });
      setPlayerId(data.player_id);
      localStorage.setItem("playerId", data.player_id);
      startLocalTimer(data.time_left || ROUND_TIME);
      setScore(data.score || 0);
    } catch (e) {
      console.error("Error starting game:", e);
      alert("Error starting game: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answer) => {
    if (!gameData) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          player_id: playerId, 
          answer: Boolean(answer) // تبدیل به boolean برای تطابق با سرور
        }),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit answer");
      }

      if (data.status === "continue") {
        setGameData({ problem: data.problem });
        setScore(data.score);
        startLocalTimer(data.time_left || ROUND_TIME);
      } else if (data.status === "game_over") {
        clearLocalTimer();
        setGameData(null);
        setFinalScore(data.final_score);
        setView("board");
      }
    } catch (e) {
      alert("Error submitting answer: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  /* -------- API: وضعیت دوره‌ای -------- */
  const fetchStatus = useCallback(async () => {
    if (!playerId) return;
    try {
      const res  = await fetch(
        `${API_BASE}/status?player_id=${playerId}`
      );
      const data = await res.json();
      if (data.problem) setGameData({ problem: data.problem });
      if (data.time_left !== undefined)
        startLocalTimer(data.time_left);
    } catch {
      /* سکوت خطا */
    }
  }, [playerId, startLocalTimer]);

  /* ---------- Effects ---------- */

  /* استعلام دوره‌ای سرور */
  useEffect(() => {
    if (!playerId) return;
    const id = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(id);
  }, [playerId, fetchStatus]);

  /* پاک‌سازی تایمر روی Unmount */
  useEffect(() => () => clearLocalTimer(), []);

  /* ---------- JSX ---------- */
  return (
<div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
 
        {view === "game" ? (                 /* نمای بازی */
        gameData ? (
          <>
          <p className="text-xl font-semibold mb-2">Score: {score}</p>
            <ProblemCard text={gameData.problem} />
            <TimerCircle total={ROUND_TIME} left={timeLeft} />
            <AnswerButtons
              onAnswer={submitAnswer}
              disabled={loading}
            />
          </>
        ) : (
          <button
            onClick={startGame}
            disabled={loading}
            className="px-8 py-4 bg-white text-indigo-600 rounded-2xl text-2xl font-bold shadow-xl hover:scale-105 transition"
          >
            {loading ? "Please Wait..." : "Start Game"}
          </button>
        )
      ) : (                               /* نمای لیدربُرد */
        <Leaderboard
          API_BASE={API_BASE}
          onReplay={startGame}            /* دکمهٔ «شروع مجدد» */
          finalScore={finalScore}
        />
      )}
          {/* --- لوگوی تیم --- */}
    <img
      src={process.env.PUBLIC_URL + "/teamlogo.png"}
      alt="Team Logo"
      className="absolute bottom-4 right-4 w-24 opacity-70 pointer-events-none select-none"
    />
    
    </div>
  );

}


export default App;
