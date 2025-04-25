import { useEffect, useState } from "react";

export default function Leaderboard({ API_BASE, onReplay, finalScore }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/leaderboard`);
        const data = await res.json();
        setRows(data.players || []);     // بک‑اِند «players» برمی‌گرداند
      } catch (e) {
        console.error(e);
      }
    })();
  }, [API_BASE]);

  const banner = finalScore !== null && (
    <div className="mb-4 text-center text-2xl font-bold text-red-600">
      Game&nbsp;Over! - Achieved Score: {finalScore}
    </div>
  );
  
  return (
    
    <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur p-6 rounded-3xl shadow-xl">
      {banner}
      <h2 className="text-2xl font-bold text-center text-indigo-700 mb-4">
        Leaderboard
      </h2>
      
      <ul>
        {/* ---------- Header row ---------- */}
        <li className="flex justify-between py-2 px-3 font-semibold text-slate-600 mb-1">
          <span>Rank</span>
          <span className="flex-1 text-center">Player&nbsp;Name</span>
          <span>Max Score</span>
        </li>

        {/* ---------- Data rows ---------- */}
        {rows.map((r, i) => (
          <li
            key={r.player_id}
            className="flex justify-between py-2 px-3 odd:bg-indigo-50 rounded-xl"
          >
            <span>{i + 1}</span>
            <span className="flex-1 text-center truncate">{r.player_id}</span>
            <span className="font-bold text-indigo-600">{r.score}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onReplay}
        className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition"
      >
        Play Again
      </button>
    </div>
  );
}
