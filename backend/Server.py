from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import random
import operator
import time
from threading import Thread, Lock
import os

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app, resources={r"/*": {"origins": "*"}})  # تنظیم CORS برای تمام روت‌ها

class MathGame:
    def __init__(self):
        self.total_time = 40
        self.time_left = self.total_time
        self.game_active = False
        self.score = 0
        self.current_problem = ""
        self.current_answer = None
        self.lock = Lock()
        self.timer_thread = None

    def generate_math_problem(self):
        # عملگرهای ممکن
        operations = {
            '+': operator.add,
            '-': operator.sub,
            '*': operator.mul,
            '/': operator.truediv
        }
        
        # انتخاب تصادفی عملگر
        op_symbol = random.choice(list(operations.keys()))
        op_func = operations[op_symbol]
        
        # تولید اعداد تصادفی
        if op_symbol == '*' or op_symbol == '/':
            num1 = random.randint(1, 10)
            num2 = random.randint(1, 50)
        else:
            num1 = random.randint(1, 200)
            num2 = random.randint(1, 200)
        
        # برای تفریق مطمئن می‌شویم جواب منفی نباشد
        if op_symbol == '-' and num2 > num1:
            num1, num2 = num2, num1
        
        if op_symbol == '/' and num1 % num2 != 0:
            num1 -= num1 % num2
        
        
        # محاسبه جواب صحیح
        correct_answer = op_func(num1, num2)
        
        # تصمیم‌گیری برای نمایش درست یا نادرست
        if random.random() < 0.6:  # 60% احتمال نمایش تساوی درست
            display_answer = correct_answer
            is_correct = True
        else:
            if op_func == '/':
            # تولید جواب نادرست (با اختلاف 1 یا 2)
                display_answer = correct_answer + random.randint(1, 7)
            elif correct_answer > 20 and random.random() < 0.5: 
                display_answer = correct_answer - random.randint(1, 20)
            else:
                display_answer = correct_answer + random.randint(1, 20)
            is_correct = False
        
        # تولید مسئله به صورت رشته
        problem = f"{num1} {op_symbol} {num2} = {display_answer}"
        
        return problem, is_correct
    
    
    def start_game(self):
        with self.lock:
            self.game_active = True
            self.time_left = self.total_time
            self.score = 0
            problem, answer = self.generate_math_problem()
            self.current_problem = problem
            self.current_answer = answer
            
            if self.timer_thread and self.timer_thread.is_alive():
                self.timer_thread.join()
                
            self.timer_thread = Thread(target=self.run_timer)
            self.timer_thread.start()
            
        return {
            "problem": problem,
            "time_left": self.time_left,
            "score": self.score
        }

    def run_timer(self):
        while self.time_left > 0 and self.game_active:
            time.sleep(1)
            with self.lock:
                self.time_left -= 1
                
        with self.lock:
            if self.time_left <= 0:
                self.game_active = False

    def check_answer(self, user_answer):
        with self.lock:
            if not self.game_active:
                return {
                    "status": "game_over",
                    "final_score": self.score
                }
            
            is_correct = (user_answer == self.current_answer)
            
            if is_correct:
                self.time_left += 5
                self.score += 1
            else:
                self.time_left = max(0, self.time_left - 15)
            
            if self.time_left <= 0:
                self.game_active = False
                return {
                    "status": "game_over",
                    "final_score": self.score
                }
            
            problem, answer = self.generate_math_problem()
            self.current_problem = problem
            self.current_answer = answer
            
            return {
                "status": "continue",
                "problem": problem,
                "time_left": self.time_left,
                "score": self.score,
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
    return jsonify(game_instance.start_game())

@app.route('/answer', methods=['POST'])
def answer():
    data = request.get_json()
    user_answer = data.get('answer')
    return jsonify(game_instance.check_answer(user_answer))

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "game_active": game_instance.game_active,
        "time_left": game_instance.time_left,
        "score": game_instance.score
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))  # پورت Render