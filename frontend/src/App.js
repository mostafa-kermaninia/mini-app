import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ProblemCard from "./components/ProblemCard";
import AnswerButtons from "./components/AnswerButtons";
import TimerCircle from "./components/TimerCircle";
import Leaderboard from "./components/Leaderboard";

// ثابت‌های برنامه
const ROUND_TIME = 40;
const POLL_INTERVAL = 5000;
const API_BASE = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://math-game-momis.onrender.com/api' 
    : 'http://localhost:5000/api');

function App() {
  // State مدیریت
  const [playerId, setPlayerId] = useState(() => localStorage.getItem("playerId") || "");
  const [problem, setProblem] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("game");
  const [finalScore, setFinalScore] = useState(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState(null);
  const [leaderboardKey, setLeaderboardKey] = useState(Date.now());

  // Refs برای تایمرها
  const timerId = useRef(null);
  const statusIntervalId = useRef(null);
  const abortControllerRef = useRef(null);

  // پاک‌سازی تایمرها و درخواست‌ها
  const clearResources = useCallback(() => {
    if (timerId.current) clearInterval(timerId.current);
    if (statusIntervalId.current) clearInterval(statusIntervalId.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    timerId.current = null;
    statusIntervalId.current = null;
    abortControllerRef.current = null;
  }, []);

  // مدیریت پایان بازی
  const handleGameOver = useCallback((finalScore) => {
    clearResources();
    setProblem(null);
    setFinalScore(finalScore);
    setView("board");
    setLeaderboardKey(Date.now());
  }, [clearResources]);

  // ارسال پاسخ به سرور
  const submitAnswer = useCallback(async (answer) => {
    if (!problem || !playerId || loading) return;
    
    try {
      setLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          player_id: playerId, 
          answer: Boolean(answer) 
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit answer");
      }

      const data = await response.json();

      if (data.status === "continue") {
        setProblem(data.problem);
        setScore(data.score);
        startLocalTimer(data.time_left);
      } else {
        handleGameOver(data.final_score);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Answer error:", err);
        setError(err.message || "Failed to submit answer");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [problem, playerId, loading, API_BASE, handleGameOver]);

  // مدیریت زمان تمام شده
  const handleTimeout = useCallback(async () => {
    await submitAnswer(false);
  }, [submitAnswer]);

  // شروع تایمر محلی
  const startLocalTimer = useCallback((initialTime) => {
    clearResources();
    setTimeLeft(initialTime);

    timerId.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearResources, handleTimeout]);

  // شروع بازی جدید
  const startGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setView("game");
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId || "" }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start game");
      }

      const data = await response.json();
      
      setProblem(data.problem);
      const newPlayerId = data.player_id;
      setPlayerId(newPlayerId);
      localStorage.setItem("playerId", newPlayerId);
      startLocalTimer(data.time_left || ROUND_TIME);
      setScore(data.score || 0);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Game start error:", err);
        setError(err.message);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [playerId, API_BASE, startLocalTimer]);

  // Effects مدیریت
  useEffect(() => {
    return () => clearResources();
  }, [clearResources]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // محاسبات مشتق شده
  const gameContent = useMemo(() => {
    if (view !== "game") return null;

    return problem ? (
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <p className="text-2xl font-bold">Score: {score}</p>
        <ProblemCard text={problem} />
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
        aria-label={loading ? "Loading game" : "Start game"}
      >
        {loading ? "Loading..." : "Start Game"}
      </button>
    );
  }, [view, problem, score, timeLeft, loading, submitAnswer, startGame]);

  const leaderboardContent = useMemo(() => (
    view === "board" && (
      <Leaderboard
        key={leaderboardKey}
        API_BASE={API_BASE}
        onReplay={startGame}
        finalScore={finalScore}
      />
    )
  ), [view, leaderboardKey, API_BASE, startGame, finalScore]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4">
      {/* نمایش خطا */}
      {error && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg z-50 max-w-md text-center animate-fade-in"
          role="alert"
        >
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-white hover:text-gray-200"
            aria-label="Close error message"
          >
            &times;
          </button>
        </div>
      )}

      {gameContent}
      {leaderboardContent}

      {/* لوگوی تیم */}
      <img
        src={`${process.env.PUBLIC_URL}/teamlogo.png`}
        alt="Team Logo"
        className="absolute bottom-4 right-4 w-24 opacity-70 pointer-events-none select-none"
        loading="lazy"
      />
    </div>
  );
}

export default React.memo(App);