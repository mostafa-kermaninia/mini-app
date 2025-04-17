import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [playerId, setPlayerId] = useState(localStorage.getItem('playerId') || '');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(40);
  const [timer, setTimer] = useState(null);

  const API_BASE_URL = 'https://mini-app-xqvp.onrender.com/api';

  // تایمر را شروع کن
  const startTimer = () => {
    clearInterval(timer); // تایمر قبلی را پاک کن
    
    const newTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(newTimer);
          checkGameStatus(); // وضعیت بازی را چک کن
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(newTimer);
  };

  // تایمر را متوقف کن
  const stopTimer = () => {
    clearInterval(timer);
    setTimer(null);
  };

  const startGame = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerId ? { player_id: playerId } : {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGameData(data);
      setPlayerId(data.player_id);
      setTimeLeft(data.time_left);
      localStorage.setItem('playerId', data.player_id);
      startTimer(); // تایمر جدید را شروع کن
    } catch (err) {
      setError('خطا در شروع بازی: ' + err.message);
      console.error('Error starting game:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (userAnswer) => {
    if (!playerId) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: playerId,
          answer: userAnswer
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGameData(data);
      setTimeLeft(data.time_left); // زمان جدید را تنظیم کن
      
      // اگر بازی تمام شده، تایمر را متوقف کن
      if (data.status === 'game_over') {
        stopTimer();
      } else {
        // اگر بازی ادامه دارد، تایمر را ریست کن
        stopTimer();
        startTimer();
      }
    } catch (err) {
      setError('خطا در ارسال پاسخ: ' + err.message);
      console.error('Error submitting answer:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkGameStatus = async () => {
    if (!playerId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/status?player_id=${playerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGameData(data);
      setTimeLeft(data.time_left);
    } catch (err) {
      console.error('Error checking game status:', err);
    }
  };

  useEffect(() => {
    if (playerId) {
      checkGameStatus();
    }
    
    // هنگام حذف کامپوننت، تایمر را پاک کن
    return () => {
      stopTimer();
    };
  }, [playerId]);

  const handleAnswer = (userAnswer) => {
    setAnswer(userAnswer);
    submitAnswer(userAnswer);
  };

  // محاسبه درصد زمان باقیمانده برای نوار پیشرفت
  const timePercent = (timeLeft / 40) * 100;

  return (
    <div className="App">
      <header className="App-header">
        <h1>بازی ریاضی</h1>
        
        {error && <div className="error">{error}</div>}
        
        {loading ? (
          <div className="loading">درحال بارگذاری...</div>
        ) : gameData?.status === 'game_over' ? (
          <div className="game-over">
            <h2>بازی تمام شد!</h2>
            <p>امتیاز نهایی شما: {gameData.final_score}</p>
            <button onClick={startGame}>بازی مجدد</button>
          </div>
        ) : gameData?.problem ? (
          <div className="game-container">
            <h2>مسئله:</h2>
            <p className="problem">{gameData.problem}</p>
            
            {/* نوار پیشرفت زمان */}
            <div className="time-container">
              <div className="time-bar" style={{ width: `${timePercent}%` }}></div>
            </div>
            <p className="time-text">زمان باقیمانده: {timeLeft} ثانیه</p>
            
            <div className="buttons">
              <button 
                className={`answer-button ${answer === true ? 'selected' : ''}`}
                onClick={() => handleAnswer(true)}
              >
                صحیح
              </button>
              <button 
                className={`answer-button ${answer === false ? 'selected' : ''}`}
                onClick={() => handleAnswer(false)}
              >
                غلط
              </button>
            </div>
            
            <div className="score">امتیاز: {gameData.score}</div>
          </div>
        ) : (
          <div>
            <button className="start-button" onClick={startGame}>
              {playerId ? 'ادامه بازی' : 'شروع بازی جدید'}
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;