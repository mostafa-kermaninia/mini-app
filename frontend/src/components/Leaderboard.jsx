// Leaderboard.js
import React, { useState, useEffect } from 'react';

const Leaderboard = ({ API_BASE, onReplay, finalScore }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(`${API_BASE}/leaderboard`);
                if (!response.ok) {
                    throw new Error('Failed to fetch leaderboard');
                }
                const data = await response.json();
                setLeaderboard(data.leaderboard || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [API_BASE]);

    if (loading) return <div className="text-white">Loading leaderboard...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-md bg-white/10 p-6 rounded-xl">
            <h2 className="text-3xl font-bold">Leaderboard</h2>
            
            {finalScore && (
                <div className="text-2xl mb-4">
                    Your Score: <span className="font-bold">{finalScore}</span>
                </div>
            )}

            <div className="w-full">
                {leaderboard.length > 0 ? (
                    <ul className="space-y-2 w-full">
                        {leaderboard.map((player, index) => (
                            <li key={player.player_id} className="flex justify-between items-center p-2 bg-white/10 rounded">
                                <span className="font-medium">
                                    {index + 1}. Player {player.player_id.slice(0, 6)}
                                </span>
                                <span className="font-bold">{player.score}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center">No scores yet. Be the first!</p>
                )}
            </div>

            <button
                onClick={onReplay}
                className="mt-6 px-6 py-3 bg-white text-indigo-600 rounded-xl text-xl font-bold shadow-lg hover:scale-105 transition-transform"
            >
                Play Again
            </button>
        </div>
    );
};

export default Leaderboard;