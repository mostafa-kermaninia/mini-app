const OPS = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "×": (a, b) => a * b,
    "÷": (a, b) => Math.floor(a / b), // تقسیم صحیح
};

function _pickNumbers(op) {
    let a, b;
    if (op === "×" || op === "÷") {
        a = Math.floor(Math.random() * 11) + 2; // 2-12
        b = Math.floor(Math.random() * 11) + 2; // 2-12
        if (op === "÷") { // تضمین بخش‌پذیری
            a = a * b;
        }
    } else {
        a = Math.floor(Math.random() * 101) + 20; // 20-120
        b = Math.floor(Math.random() * 120) + 1; // 1-120
    }
    if (op === "-" && b > a) { // جلوگیری از منفی
        [a, b] = [b, a];
    }
    return [a, b];
}

function generate() {
    const ops = Object.keys(OPS);
    const op = ops[Math.floor(Math.random() * ops.length)];
    const [a, b] = _pickNumbers(op);
    const correct = OPS[op](a, b);

    // تصمیم بگیریم سؤال درست یا غلط باشد
    let result, is_correct;
    if (Math.random() < 0.6) { // 60% سؤال درست
        result = correct;
        is_correct = true;
    } else { // 40% سؤال غلط با خطای کوچک
        const delta = Math.floor(Math.random() * Math.max(3, Math.abs(correct) / 4)) + 1;
        result = correct + (Math.random() < 0.5 ? -delta : delta);
        if (op === "÷" && result === 0) { // دوری از صفر
            result += 1;
        }
        is_correct = false;
    }

    // صورت سؤال را همیشه «نتیجه = عبارت» برگردانیم
    const problem = `${result} = ${a} ${op} ${b}`;
    return { problem, is_correct };
}

module.exports = {
    generate
};
