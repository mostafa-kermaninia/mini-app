import random, operator

OPS = {
    "+": operator.add,
    "-": operator.sub,
    "×": operator.mul,
    "÷": operator.floordiv,      # تقسیم صحیح
}

def _pick_numbers(op):
    if op in ("×", "÷"):
        a, b = random.randint(2, 12), random.randint(2, 12)
        if op == "÷":            # تضمین بخش‌پذیری
            a = a * b
    else:
        a, b = random.randint(20, 120), random.randint(1, 120)
    if op == "-" and b > a:      # جلوگیری از منفی
        a, b = b, a
    return a, b

def generate():
    op = random.choice(list(OPS))
    a, b = _pick_numbers(op)
    correct = OPS[op](a, b)

    # تصمیم بگیریم سؤال درست یا غلط باشد
    if random.random() < 0.6:          # ٪۶۰ سؤال درست
        result, is_correct = correct, True
    else:                              # ٪۴۰ سؤال غلط با خطای کوچک
        delta = random.randint(1, max(3, abs(correct)//4))
        result = correct + random.choice([-delta, delta])
        if op == "÷" and result == 0:   # دوری از صفر
            result += 1
        is_correct = False

    # صورت سؤال را همیشه «نتیجه = عبارت» برگردانیم
    problem = f"{result} = {a} {op} {b}"
    return problem, is_correct
