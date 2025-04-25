from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import random
import operator
import time
from threading import Thread, Lock
import os
import uuid
import logging
from datetime import datetime
from math_engine import generate as generate_problem

# تنظیمات پایه
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# تنظیمات لاگینگ
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('game_server.log'),
        logging.StreamHandler()
    ]
)

class Player:
    def __init__(self, player_id):
        self.id = player_id
        self.score = 0
        self.top_score = 0
        self.time_left = 40
        self.game_active = False
        self.current_problem = ""
        self.current_answer = None
        self.timer_thread = None
        self.should_stop = False
        self.last_activity = datetime.now()
        logging.info(f"New player created: {player_id}")

class MathGame:
    def __init__(self):
        self.players = {}
        self.lock = Lock()
        self.total_time = 40
        self.cleanup_interval = 600  # 10 minutes
        self.cleanup_thread = Thread(target=self.cleanup_inactive_players, daemon=True)
        self.cleanup_thread.start()
        logging.info("MathGame initialized")


    def cleanup_inactive_players(self):
        while True:
            time.sleep(self.cleanup_interval)
            with self.lock:
                now = datetime.now()
                inactive_players = [
                    pid for pid, player in self.players.items()
                    if (now - player.last_activity).total_seconds() > self.cleanup_interval
                ]
                for pid in inactive_players:
                    if self.players[pid].timer_thread:
                        self.players[pid].should_stop = True
                        self.players[pid].timer_thread.join(timeout=1)
                    del self.players[pid]
                    logging.info(f"Cleaned up inactive player: {pid}")

    def run_timer(self, player_id):
        try:
            player = self.players[player_id]
            player.should_stop = False
            
            while player.time_left > 0 and not player.should_stop:
                time.sleep(1)
                with self.lock:
                    player.time_left -= 1
                    player.last_activity = datetime.now()
                
            with self.lock:
                if player.time_left <= 0:
                    player.game_active = False
                    logging.info(f"Player {player_id} game over - time expired")
                
        except Exception as e:
            logging.error(f"Timer error for {player_id}: {str(e)}")

    def start_game(self, player_id=None):
        with self.lock:
            try:
                if not player_id:
                    player_id = str(uuid.uuid4())
                
                if player_id in self.players:
                    player = self.players[player_id]
                    if player.timer_thread and player.timer_thread.is_alive():
                        player.should_stop = True
                        player.timer_thread.join(timeout=1)
                else:
                    player = Player(player_id)
                    self.players[player_id] = player
                
                player.game_active = True
                player.time_left = self.total_time
                player.top_score = max(player.top_score, player.score)
                player.score = 0
                player.should_stop = False
                player.last_activity = datetime.now()
                
                problem, answer = generate_problem()
                player.current_problem = problem
                player.current_answer = answer
                
                player.timer_thread = Thread(target=self.run_timer, args=(player_id,))
                player.timer_thread.start()
                
                logging.info(f"Game started for {player_id}")
                
                return {
                    "status": "success",
                    "player_id": player_id,
                    "problem": problem,
                    "time_left": player.time_left,
                    "score": player.score,
                    "game_active": True
                }
                
            except Exception as e:
                logging.error(f"Start game error: {str(e)}")
                return {
                    "status": "error",
                    "message": str(e)
                }

    def check_answer(self, player_id, user_answer):
        with self.lock:
            try:
                if player_id not in self.players:
                    return {
                        "status": "error",
                        "message": "Player not found. Start a new game."
                    }
                
                player = self.players[player_id]
                player.last_activity = datetime.now()
                
                if not player.game_active:
                    return {
                        "status": "game_over",
                        "final_score": player.score
                    }
                
                is_correct = (user_answer == player.current_answer)
                
                if is_correct:
                    player.time_left = min(40, player.time_left + 5)
                    player.score += 1
                    player.top_score = max(player.top_score, player.score)
                else:
                    player.time_left = max(0, player.time_left - 10)
                
                if player.time_left <= 0:
                    player.game_active = False
                    return {
                        "status": "game_over",
                        "final_score": player.score
                    }
                
                problem, answer = generate_problem()
                player.current_problem = problem
                player.current_answer = answer
                
                return {
                    "status": "continue",
                    "problem": problem,
                    "time_left": player.time_left,
                    "score": player.score,
                    "feedback": "correct" if is_correct else "wrong",
                    "game_active": True
                }
                
            except Exception as e:
                logging.error(f"Check answer error: {str(e)}")
                return {
                    "status": "error",
                    "message": str(e)
                }

game_instance = MathGame()

# Route برای سرویس دهی فایل‌های استاتیک
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# API Routes
# @app.route('/api/start', methods=['POST'])
# def start():
#     player_id = request.json.get('player_id') if request.json else None
#     return jsonify(game_instance.start_game(player_id))

@app.route('/api/start', methods=['POST'])
def start():
    try:
        player_id = request.json.get('player_id') if request.json else str(uuid.uuid4())  # تغییر اینجا
        return jsonify(game_instance.start_game(player_id))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/answer', methods=['POST'])
def answer():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    
    player_id = data.get('player_id')
    user_answer = data.get('answer')
    
    if not player_id or user_answer is None:
        return jsonify({"status": "error", "message": "player_id and answer are required"}), 400
    
    return jsonify(game_instance.check_answer(player_id, user_answer))

@app.route('/api/status', methods=['GET'])
def status():
    player_id = request.args.get('player_id')
    if not player_id:
        return jsonify({"status": "error", "message": "player_id is required"}), 400
    
    if player_id in game_instance.players:
        player = game_instance.players[player_id]
        return jsonify({
            "status": "success",
            "game_active": player.game_active,
            "time_left": player.time_left,
            "score": player.score,
            "current_problem": player.current_problem if player.game_active else None,
            "last_activity": player.last_activity.isoformat()
        })
    
    return jsonify({"status": "error", "message": "Player not found"}), 404

@app.route('/api/debug', methods=['GET'])
def debug():
    return jsonify({
        "timestamp": datetime.now().isoformat(),
        "active_players": len([p for p in game_instance.players.values() if p.game_active]),
        "total_players": len(game_instance.players),
        "players": [
            {
                "id": p.id,
                "active": p.game_active,
                "time_left": p.time_left,
                "score": p.score,
                "last_activity": p.last_activity.isoformat()
            }
            for p in game_instance.players.values()
        ]
    })
    
    
@app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    with game_instance.lock:
        players = sorted(
            game_instance.players.values(),
            key=lambda x: x.top_score,
            reverse=True
        )
        return jsonify({
            "status": "success",
            "players": [
                {
                    "player_id": p.id,
                    "score": p.top_score,
                    "time_left": p.time_left,
                    "active": p.game_active
                }
                for p in players
            ]
        })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, threaded=True)