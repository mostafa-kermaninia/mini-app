import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [playerId, setPlayerId] = useState(localStorage.getItem('playerId') || '');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState(null);

  const API_BASE_URL = 'https://mini-app-xqvp.onrender.com/api';

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
      localStorage.setItem('playerId', data.player_id);
    } catch (err) {
      setError('Failed to start game: ' + err.message);
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
    } catch (err) {
      setError('Failed to submit answer: ' + err.message);
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
    } catch (err) {
      console.error('Error checking game status:', err);
    }
  };

  useEffect(() => {
    if (playerId) {
      checkGameStatus();
    }
  }, [playerId]);

  const handleAnswer = (userAnswer) => {
    setAnswer(userAnswer);
    submitAnswer(userAnswer);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Math Game</h1>
        
        {error && <div className="error">{error}</div>}
        
        {loading ? (
          <div>Loading...</div>
        ) : gameData?.status === 'game_over' ? (
          <div>
            <h2>Game Over!</h2>
            <p>Your final score: {gameData.final_score}</p>
            <button onClick={startGame}>Play Again</button>
          </div>
        ) : gameData?.problem ? (
          <div>
            <h2>Solve this:</h2>
            <p className="problem">{gameData.problem}</p>
            <div className="buttons">
              <button 
                className={answer === true ? 'selected' : ''}
                onClick={() => handleAnswer(true)}
              >
                Correct
              </button>
              <button 
                className={answer === false ? 'selected' : ''}
                onClick={() => handleAnswer(false)}
              >
                Wrong
              </button>
            </div>
            <div className="game-info">
              <p>Time left: {gameData.time_left}s</p>
              <p>Score: {gameData.score}</p>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={startGame}>
              {playerId ? 'Continue Game' : 'Start New Game'}
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;