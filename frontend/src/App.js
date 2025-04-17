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
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const API_BASE_URL = 'https://mini-app-xqvp.onrender.com/api';

  // Start the timer
  const startTimer = () => {
    clearInterval(timer);
    
    const newTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(newTimer);
          checkGameStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(newTimer);
  };

  // Stop the timer
  const stopTimer = () => {
    clearInterval(timer);
    setTimer(null);
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard`);
      const data = await response.json();
      if (data.status === 'success') {
        setLeaderboard(data.players);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
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
      startTimer();
    } catch (err) {
      setError('Error starting game: ' + err.message);
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
      setTimeLeft(data.time_left);
      
      if (data.status === 'game_over') {
        stopTimer();
        fetchLeaderboard(); // Update leaderboard when game ends
      } else {
        stopTimer();
        startTimer();
      }
    } catch (err) {
      setError('Error submitting answer: ' + err.message);
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
    
    return () => {
      stopTimer();
    };
  }, [playerId]);

  const handleAnswer = (userAnswer) => {
    setAnswer(userAnswer);
    submitAnswer(userAnswer);
  };

  const timePercent = (timeLeft / 40) * 100;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Math Game</h1>
        
        {error && <div className="error">{error}</div>}
        
        {loading ? (
          <div className="loading">Loading...</div>
        ) : gameData?.status === 'game_over' ? (
          <div className="game-over">
            <h2>Game Over!</h2>
            <p>Your final score: {gameData.final_score}</p>
            
            <div className="game-over-buttons">
              <button onClick={startGame}>Play Again</button>
              <button 
                className="leaderboard-btn"
                onClick={() => {
                  fetchLeaderboard();
                  setShowLeaderboard(!showLeaderboard);
                }}
              >
                {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
              </button>
            </div>
            
            {showLeaderboard && (
              <div className="leaderboard">
                <h3>Top Players</h3>
                {leaderboard.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((player, index) => (
                        <tr key={player.player_id} className={player.player_id === playerId ? 'current-player' : ''}>
                          <td>{index + 1}</td>
                          <td>
                            {player.player_id === playerId 
                              ? 'You' 
                              : `Player ${player.player_id.substring(0, 4)}`}
                          </td>
                          <td>{player.score}</td>
                          <td>
                            {player.active 
                              ? <span className="active-status">🟢 Playing</span> 
                              : <span className="inactive-status">🔴 Finished</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No players found</p>
                )}
              </div>
            )}
          </div>
        ) : gameData?.problem ? (
          <div className="game-container">
            <h2>Problem:</h2>
            <p className="problem">{gameData.problem}</p>
            
            <div className="time-container">
              <div className="time-bar" style={{ width: `${timePercent}%` }}></div>
            </div>
            <p className="time-text">Time left: {timeLeft} seconds</p>
            
            <div className="buttons">
              <button 
                className={`answer-button ${answer === true ? 'selected' : ''}`}
                onClick={() => handleAnswer(true)}
              >
                Correct
              </button>
              <button 
                className={`answer-button ${answer === false ? 'selected' : ''}`}
                onClick={() => handleAnswer(false)}
              >
                Wrong
              </button>
            </div>
            
            <div className="score">Score: {gameData.score}</div>
            
            <button 
              className="leaderboard-btn"
              onClick={() => {
                fetchLeaderboard();
                setShowLeaderboard(!showLeaderboard);
              }}
            >
              {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </button>
            
            {showLeaderboard && (
              <div className="leaderboard">
                <h3>Top Players</h3>
                {leaderboard.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((player, index) => (
                        <tr key={player.player_id} className={player.player_id === playerId ? 'current-player' : ''}>
                          <td>{index + 1}</td>
                          <td>
                            {player.player_id === playerId 
                              ? 'You' 
                              : `Player ${player.player_id.substring(0, 4)}`}
                          </td>
                          <td>{player.score}</td>
                          <td>
                            {player.active 
                              ? <span className="active-status">🟢 Playing</span> 
                              : <span className="inactive-status">🔴 Finished</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No players found</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <button className="start-button" onClick={startGame}>
              {playerId ? 'Continue Game' : 'Start New Game'}
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;