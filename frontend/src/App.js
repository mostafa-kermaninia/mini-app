import React, { useState, useEffect, useCallback, useRef } from "react";
import ProblemCard from "./components/ProblemCard";
import AnswerButtons from "./components/AnswerButtons";
import TimerCircle from "./components/TimerCircle";
import Leaderboard from "./components/Leaderboard";

const ROUND_TIME = 40;
const POLL_INTERVAL = 5000;
const API_BASE = process.env.REACT_APP_API_URL || 'https://math-game-momis.onrender.com/api';

function App() {
  // State
  const [playerId, setPlayerId] = useState(localStorage.getItem("playerId") || "");
  const [gameData, setGameData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("game");
  const [finalScore, setFinalScore] = useState(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState(null);
  const [leaderboardKey, setLeaderboardKey] = useState(Date.now()); // برای رفرش لیست

  // Refs
  const timerId = useRef(null);
  const statusIntervalId = useRef(null);

  // پاک‌سازی تایمرها
  const clearTimers = useCallback(() => {
    if (timerId.current) clearInterval(timerId.current);
    if (statusIntervalId.current) clearInterval(statusIntervalId.current);
    timerId.current = null;
    statusIntervalId.current = null;
  }, []);

  // شروع تایمر محلی
  const startLocalTimer = useCallback((initialTime) => {
    clearTimers();
    setTimeLeft(initialTime);

    timerId.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimers();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimers, handleTimeout]);

  // مدیریت زمان تمام شده
  const handleTimeout = useCallback(async () => {
    if (gameData) await submitAnswer(false);
  }, [gameData]);

  // شروع بازی
  const startGame = async () => {
    try {
      setLoading(true);
      setError(null);
      setView("game");

      const response = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        clearTimers();
        setGameData(null);
        setFinalScore(data.final_score);
        setView("board");
        setLeaderboardKey(Date.now()); // فورس رفرش لیست
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
      if (data.time_left !== undefined) startLocalTimer(data.time_left);
    } catch (err) {
      console.error("Status check error:", err);
    }
  }, [playerId, startLocalTimer]);

  // Effects
  useEffect(() => {
    if (playerId) {
      statusIntervalId.current = setInterval(fetchStatus, POLL_INTERVAL);
      return () => clearInterval(statusIntervalId.current);
    }
  }, [playerId, fetchStatus]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // نمایش خطا
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4">
      {/* نمایش خطا */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg z-50 max-w-md text-center">
          {error}
        </div>
      )}

      {view === "game" ? (
        gameData ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <p className="text-2xl font-bold">Score: {score}</p>
            <ProblemCard text={gameData.problem} />
            <TimerCircle total={ROUND_TIME} left={timeLeft} />
            <AnswerButtons 
              onAnswer={submitAnswer} 
              disabled={loading}
            />
          </div>
        ) : (
          <button
            onClick={startGame}
            disabled={loading}
            className={`px-8 py-4 bg-white text-indigo-600 rounded-2xl text-2xl font-bold shadow-xl transition-transform ${
              loading ? "opacity-50" : "hover:scale-105"
            }`}
          >
            {loading ? "Loading..." : "Start Game"}
          </button>
        )
      ) : (
        <Leaderboard
          key={leaderboardKey}
          API_BASE={API_BASE}
          onReplay={startGame}
          finalScore={finalScore}
        />
      )}

      {/* لوگوی تیم */}
      <img
        src={`${process.env.PUBLIC_URL}/teamlogo.png`}
        alt="Team Logo"
        className="absolute bottom-4 right-4 w-24 opacity-70 pointer-events-none select-none"
      />
    </div>
  );
}

export default App;