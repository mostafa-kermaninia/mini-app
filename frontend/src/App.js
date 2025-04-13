import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [gameState, setGameState] = useState({
    gameActive: false,
    timeLeft: 40,
    score: 0,
    problem: '',
    feedback: null,
    gameOver: false
  });

  const startGame = async () => {
    try {
      const response = await fetch('http://localhost:5000/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setGameState({
        ...gameState,
        gameActive: true,
        timeLeft: data.time_left,
        score: data.score,
        problem: data.problem,
        gameOver: false,
        feedback: null
      });
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const handleAnswer = async (userAnswer) => {
    if (!gameState.gameActive) return;
    
    try {
      const response = await fetch('http://localhost:5000/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: userAnswer }),
      });
      const data = await response.json();
      
      if (data.status === 'game_over') {
        setGameState({
          ...gameState,
          gameActive: false,
          gameOver: true,
          score: data.final_score
        });
      } else {
        setGameState({
          ...gameState,
          timeLeft: data.time_left,
          score: data.score,
          problem: data.problem,
          feedback: data.feedback
        });
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  // برای به‌روزرسانی زمان در صورت تغییر از سمت سرور
  useEffect(() => {
    if (!gameState.gameActive || gameState.gameOver) return;
    
    const timer = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:5000/status');
        const data = await response.json();
        
        if (!data.game_active && gameState.gameActive) {
          setGameState({
            ...gameState,
            gameActive: false,
            gameOver: true
          });
        } else {
          setGameState(prev => ({
            ...prev,
            timeLeft: data.time_left
          }));
        }
      } catch (error) {
        console.error('Error checking game status:', error);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.gameActive, gameState.gameOver]);

  return (
    <div className="app">
      <h1>بازی ریاضی با تایمر</h1>
      
      {!gameState.gameActive && !gameState.gameOver && (
        <button className="start-button" onClick={startGame}>
          شروع بازی
        </button>
      )}
      
      {gameState.gameOver && (
        <div className="game-over">
          <h2>بازی پایان یافت!</h2>
          <p>امتیاز نهایی: {gameState.score}</p>
          <button className="start-button" onClick={startGame}>
            بازی مجدد
          </button>
        </div>
      )}
      
      {gameState.gameActive && (
        <>
          <div className="problem-container">
            <h2>آیا این تساوی درست است؟</h2>
            <div className="problem">{gameState.problem}</div>
            {gameState.feedback && (
              <div className={`feedback ${gameState.feedback}`}>
                {gameState.feedback === 'correct' ? '✅ پاسخ صحیح!' : '❌ پاسخ نادرست!'}
              </div>
            )}
          </div>
          
          <div className="controls">
            <button 
              className="answer-button true" 
              onClick={() => handleAnswer(true)}
            >
              بله (درست)
            </button>
            <button 
              className="answer-button false" 
              onClick={() => handleAnswer(false)}
            >
              خیر (نادرست)
            </button>
          </div>
          
          <div className="stats">
            <div className="time-bar-container">
              <div 
                className="time-bar" 
                style={{ width: `${(gameState.timeLeft / 40) * 100}%` }}
              ></div>
            </div>
            <div className="info">
              <span>زمان باقیمانده: {gameState.timeLeft} ثانیه</span>
              <span>امتیاز: {gameState.score}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;