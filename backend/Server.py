from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import random
import operator
import time
from threading import Thread, Lock
import os
import uuid

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app, resources={r"/*": {"origins": "*"}})

class Player:
    def __init__(self, player_id):
        self.id = player_id
        self.score = 0
        self.time_left = 40
        self.game_active = False
        self.current_problem = ""
        self.current_answer = None
        self.timer_thread = None

class MathGame:
    def __init__(self):
        self.players = {}  # Dictionary to store all players
        self.lock = Lock()
        self.total_time = 40
    
    def generate_math_problem(self):
        operations = {
            '+': operator.add,
            '-': operator.sub,
            '*': operator.mul,
            '/': operator.truediv
        }
        
        op_symbol = random.choice(list(operations.keys()))
        op_func = operations[op_symbol]
        
        if op_symbol == '*' or op_symbol == '/':
            num1 = random.randint(1, 10)
            num2 = random.randint(1, 50)
        else:
            num1 = random.randint(1, 200)
            num2 = random.randint(1, 200)
        
        if op_symbol == '-' and num2 > num1:
            num1, num2 = num2, num1
        
        if op_symbol == '/' and num1 % num2 != 0:
            num1 -= num1 % num2
        
        correct_answer = op_func(num1, num2)
        
        if random.random() < 0.6:
            display_answer = correct_answer
            is_correct = True
        else:
            if op_func == '/':
                display_answer = correct_answer + random.randint(1, 7)
            elif correct_answer > 20 and random.random() < 0.5: 
                display_answer = correct_answer - random.randint(1, 20)
            else:
                display_answer = correct_answer + random.randint(1, 20)
            is_correct = False
        
        problem = f"{num1} {op_symbol} {num2} = {display_answer}"
        
        return problem, is_correct
    
    def run_timer(self, player_id):
        player = self.players[player_id]
        while player.time_left > 0 and player.game_active:
            time.sleep(1)
            with self.lock:
                player.time_left -= 1
                
        with self.lock:
            if player.time_left <= 0:
                player.game_active = False
    
    def start_game(self, player_id):
        with self.lock:
            if player_id not in self.players:
                self.players[player_id] = Player(player_id)
            
            player = self.players[player_id]
            player.game_active = True
            player.time_left = self.total_time
            player.score = 0
            problem, answer = self.generate_math_problem()
            player.current_problem = problem
            player.current_answer = answer
            
            if player.timer_thread and player.timer_thread.is_alive():
                player.timer_thread.join()
                
            player.timer_thread = Thread(target=self.run_timer, args=(player_id,))
            player.timer_thread.start()
            
        return {
            "problem": problem,
            "time_left": player.time_left,
            "score": player.score,
            "player_id": player_id
        }

    def check_answer(self, player_id, user_answer):
        with self.lock:
            if player_id not in self.players:
                return {"status": "error", "message": "Player not found"}
            
            player = self.players[player_id]
            
            if not player.game_active:
                return {
                    "status": "game_over",
                    "final_score": player.score
                }
            
            is_correct = (user_answer == player.current_answer)
            
            if is_correct:
                player.time_left += 5
                player.score += 1
            else:
                player.time_left = max(0, player.time_left - 15)
            
            if player.time_left <= 0:
                player.game_active = False
                return {
                    "status": "game_over",
                    "final_score": player.score
                }
            
            problem, answer = self.generate_math_problem()
            player.current_problem = problem
            player.current_answer = answer
            
            return {
                "status": "continue",
                "problem": problem,
                "time_left": player.time_left,
                "score": player.score,
                "feedback": "correct" if is_correct else "wrong"
            }

game_instance = MathGame()

# API Routes
@app.route('/')
def serve():
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')

@app.route('/start', methods=['POST'])
def start():
    # Generate a unique player ID
    player_id = str(uuid.uuid4())
    return jsonify(game_instance.start_game(player_id))

@app.route('/answer', methods=['POST'])
def answer():
    data = request.get_json()
    user_answer = data.get('answer')
    player_id = data.get('player_id')
    return jsonify(game_instance.check_answer(player_id, user_answer))

@app.route('/status', methods=['GET'])
def status():
    player_id = request.args.get('player_id')
    if player_id in game_instance.players:
        player = game_instance.players[player_id]
        return jsonify({
            "game_active": player.game_active,
            "time_left": player.time_left,
            "score": player.score
        })
    return jsonify({"error": "Player not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))