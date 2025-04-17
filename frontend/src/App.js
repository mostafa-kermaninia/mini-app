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

  const API_BASE_URL = 'https://mini-app-xqvp.onrender.com';
  
  const startGame = async () => {
    try {
      console.log('Sending request to:', API_BASE_URL + '/start'); // For debugging
      const response = await fetch(`${API_BASE_URL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      console.log('Response:', data); // For debugging
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
      const response = await fetch(`${API_BASE_URL}/answer`, {
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

  // For updating time if changed from the server side
  useEffect(() => {
    if (!gameState.gameActive || gameState.gameOver) return;
    
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        
        if (!data.game_active && gameState.gameActive) {
          setGameState(prev => ({
            ...prev,
            gameActive: false,
            gameOver: true
          }));
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
  }, [gameState.gameActive, gameState.gameOver]); // Only essential dependencies

  return (
    <div className="app">
      <h1>Math Game with Timer</h1>
      
      {!gameState.gameActive && !gameState.gameOver && (
        <button className="start-button" onClick={startGame}>
          Start Game
        </button>
      )}
      
      {gameState.gameOver && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>Final Score: {gameState.score}</p>
          <button className="start-button" onClick={startGame}>
            Play Again
          </button>
        </div>
      )}
      
      {gameState.gameActive && (
        <>
          <div className="problem-container">
            <h2>Is this equation correct?</h2>
            <div className="problem">{gameState.problem}</div>
            {gameState.feedback && (
              <div className={`feedback ${gameState.feedback}`}>
                {gameState.feedback === 'correct' ? '✅ Correct!' : '❌ Incorrect!'}
              </div>
            )}
          </div>
          
          <div className="controls">
            <button 
              className="answer-button true" 
              onClick={() => handleAnswer(true)}
            >
              Yes (Correct)
            </button>
            <button 
              className="answer-button false" 
              onClick={() => handleAnswer(false)}
            >
              No (Incorrect)
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
              <span>Time Left: {gameState.timeLeft} seconds</span>
              <span>Score: {gameState.score}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;