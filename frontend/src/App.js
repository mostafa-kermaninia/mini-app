import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import ProblemCard from "./components/ProblemCard";
import AnswerButtons from "./components/AnswerButtons";
import TimerCircle from "./components/TimerCircle";
import Leaderboard from "./components/Leaderboard";

// ثابت‌ها
const ROUND_TIME = 40;
const POLL_MS = 5000;
const API_BASE = window.location.origin + '/api'; // استفاده از origin فعلی

function App() {
  // State
  const [playerId, setPlayerId] = useState(
    localStorage.getItem("playerId") || ""
  );
  const [gameData, setGameData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("game");
  const [finalScore, setFinalScore] = useState(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState(null); // حالت برای نمایش خطاها

  // Refs
  const timerId = useRef(null);

  // پاک‌سازی تایمر
  const clearLocalTimer = () => {
    if (timerId.current) {
      clearInterval(timerId.current);
      timerId.current = null;
    }
  };

  // شروع تایمر محلی
  const startLocalTimer = useCallback((initial) => {
    clearLocalTimer();
    setTimeLeft(initial);

    timerId.current = setInterval(() => {
      setTimeLeft((left) => {
        if (left <= 1) {
          clearLocalTimer();
          handleTimeout();
          return 0;
        }
        return left - 1;
      });
    }, 1000);
  }, []);

  // مدیریت زمان تمام شده
  const handleTimeout = useCallback(() => {
    if (gameData) submitAnswer(false);
  }, [gameData]);

  // شروع بازی
  const startGame = async () => {
    setLoading(true);
    setError(null);
    setView("game");

    try {
      const response = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ player_id: playerId || "" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start game");
      }

      const data = await response.json();
      
      setGameData({ problem: data.problem });
      setPlayerId(data.player_id);
      localStorage.setItem("playerId", data.player_id);
      startLocalTimer(data.time_left || ROUND_TIME);
      setScore(data.score || 0);
    } catch (err) {
      console.error("Game start error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ارسال پاسخ
  const submitAnswer = async (answer) => {
    if (!gameData || !playerId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/answer`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          player_id: playerId, 
          answer: Boolean(answer)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit answer");
      }

      const data = await response.json();

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
    } catch (err) {
      console.error("Answer submission error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // بررسی وضعیت بازی
  const fetchStatus = useCallback(async () => {
    if (!playerId) return;
    
    try {
      const response = await fetch(`${API_BASE}/status?player_id=${playerId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.problem) setGameData({ problem: data.problem });
      if (data.time_left !== undefined) {
        startLocalTimer(data.time_left);
      }
    } catch (err) {
      console.error("Status check error:", err);
    }
  }, [playerId, startLocalTimer]);

  // Effects
  useEffect(() => {
    if (playerId) {
      const intervalId = setInterval(fetchStatus, POLL_MS);
      return () => clearInterval(intervalId);
    }
  }, [playerId, fetchStatus]);

  useEffect(() => {
    return () => clearLocalTimer();
  }, []);

  // نمایش خطا
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      {/* نمایش خطا */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {error}
        </div>
      )}

      {view === "game" ? (
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
            className="px-8 py-4 bg-white text-indigo-600 rounded-2xl text-2xl font-bold shadow-xl hover:scale-105 transition disabled:opacity-50"
          >
            {loading ? "Loading..." : "Start Game"}
          </button>
        )
      ) : (
        <Leaderboard
          API_BASE={API_BASE}
          onReplay={startGame}
          finalScore={finalScore}
        />
      )}

      {/* لوگوی تیم */}
      <img
        src={process.env.PUBLIC_URL + "/teamlogo.png"}
        alt="Team Logo"
        className="absolute bottom-4 right-4 w-24 opacity-70 pointer-events-none select-none"
      />
    </div>
  );
}

export default App;