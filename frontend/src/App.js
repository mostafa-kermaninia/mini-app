import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ProblemCard from "./components/ProblemCard";
import AnswerButtons from "./components/AnswerButtons";
import TimerCircle from "./components/TimerCircle";
import Leaderboard from "./components/Leaderboard";
import { v4 as uuidv4 } from 'uuid';

// ثابت‌های برنامه  
const ROUND_TIME = 40;
const API_BASE =  'https://math-backend.loca.lt/api'; //backkkkkkkkk

function App() {
  // State مدیریت
  const [playerId, setPlayerId] = useState(() => localStorage.getItem("playerId") || "");
  const [problem, setProblem] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("auth");
  const [finalScore, setFinalScore] = useState(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState(null);
  const [leaderboardKey, setLeaderboardKey] = useState(Date.now());
  const [telegramUser, setTelegramUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

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

  // تابع احراز هویت کاربر
  const authenticateUser = useCallback(async () => {
    try {
      setAuthLoading(true);
      setError(null);

      // در محیط توسعه، احراز هویت را رد می‌کنیم
      if (!window.Telegram?.WebApp) {
        console.log("Running in non-Telegram environment, skipping authentication");
        setIsAuthenticated(true);
        setView("home");
        return true;
      }

      const initData = window.Telegram.WebApp.initData || '';
      if (!initData) {
        throw new Error('Telegram authentication data not found');
      }


    // ارسال درخواست به سرور
    const response = await fetch(`${API_BASE}/telegram-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ initData }) // ارسال به صورت صحیح
    });

      if (!response.ok) {
        console.log(response.json())
        console.log("test")
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      // if (!data.valid) {
      //   throw new Error('Invalid Telegram user');
      // }

      if (!data?.valid) {
        throw new Error(data?.message || 'Invalid Telegram user');
      } 


      // ذخیره اطلاعات کاربر و اجازه دسترسی
      setTelegramUser(data.user);
      setIsAuthenticated(true);
      setView("home");
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message);
      setIsAuthenticated(false);
      setView("auth");
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

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
  }, [problem, playerId, loading, handleGameOver]);

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
    if (!isAuthenticated) {
      setError('Please authenticate first');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setView("game");
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const requestBody = {
        player_id: playerId || "",
        ...(telegramUser ? { telegram_user: telegramUser } : {})
      };

      const response = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Request-ID": uuidv4()
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      
      if (!data || data.status !== "success") {
        throw new Error(data?.message || "Invalid server response");
      }

      setProblem(data.problem);
      setPlayerId(data.player_id);
      localStorage.setItem("playerId", data.player_id);
      startLocalTimer(data.time_left ?? ROUND_TIME);
      setScore(data.score ?? 0);

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Request was aborted");
        return;
      }

      console.error("Game start error:", err);
      setError(
        err.message.includes("Failed to fetch") 
          ? "Could not connect to server. Please check your connection."
          : err.message
      );
      setView("home");
      
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [playerId, startLocalTimer, isAuthenticated, telegramUser]);

  // Effects مدیریت
  useEffect(() => {
    const initAuth = async () => {
      await authenticateUser();
    };

    initAuth();
    return () => clearResources();
  }, [authenticateUser, clearResources]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // محتوای صفحه احراز هویت
  const authContent = useMemo(() => {
    if (view !== "auth") return null;

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <h2 className="text-2xl font-bold">Welcome to Math Game</h2>
        <p className="text-center">
          {window.Telegram?.WebApp 
            ? "Please authenticate with Telegram to play the game."
            : "This game is designed to run inside Telegram. Please open it in Telegram to play."}
        </p>
        {error && <p className="text-red-300">{error}</p>}
        {window.Telegram?.WebApp && (
          <button
            onClick={authenticateUser}
            disabled={authLoading}
            className={`px-6 py-3 bg-white text-indigo-600 rounded-xl text-xl font-bold ${
              authLoading ? "opacity-50" : "hover:bg-gray-100"
            }`}
          >
            {authLoading ? "Authenticating..." : "Authenticate with Telegram"}
          </button>
        )}
      </div>
    );
  }, [view, authLoading, error, authenticateUser]);

  // محتوای صفحه اصلی
  const homeContent = useMemo(() => {
    if (view !== "home") return null;

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <h1 className="text-3xl font-bold">Math Challenge</h1>
        <p className="text-center">
          Test your math skills in this exciting timed challenge!
        </p>
        <button
          onClick={startGame}
          disabled={loading}
          className={`px-8 py-4 bg-white text-indigo-600 rounded-2xl text-2xl font-bold shadow-xl transition-transform ${
            loading ? "opacity-50" : "hover:scale-105"
          }`}
        >
          {loading ? "Loading..." : "Start Game"}
        </button>
      </div>
    );
  }, [view, loading, startGame]);

  // محتوای بازی
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
  ), [view, leaderboardKey, startGame, finalScore]);

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

      {authContent}
      {homeContent}
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