// js/app.js
import { MathGame } from './game.js';
import { saveTestResult, getTestHistory } from './db.js';
import { drawSpiderChart, switchTab } from './ui.js';
import { getCurrentUser, logout, login, signup } from './auth.js';

const game = new MathGame();
let timerInterval = null;
let currentUser = null;

// --- เริ่มต้นระบบ ---
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    setupEventListeners();
});

// --- จัดการการยืนยันตัวตน (Auth) ---
async function checkAuth() {
    currentUser = await getCurrentUser();
    if (currentUser) {
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('current-user-display').textContent = currentUser.email.split('@')[0];
    switchTab('select');
    loadHistoryData(); // โหลดข้อมูลพัฒนาการทันทีที่เข้าแอป
}

// --- การตั้งค่า Event Listeners ---
function setupEventListeners() {
    // ฟอร์มเข้าสู่ระบบ/สมัครสมาชิก
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-signup').addEventListener('click', handleSignup);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // เมนูนำทาง (Tabs)
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.getAttribute('data-tab');
            switchTab(tab);
            if (tab === 'progress' || tab === 'grade') loadHistoryData();
        });
    });

    // การเลือกเลเวลเพื่อเริ่มทำข้อสอบ
    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', async () => {
            const btn = card.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'กำลังโหลด...';
            await startTest(card.getAttribute('data-level'));
            btn.textContent = originalText;
        });
    });

    document.getElementById('btn-quit-test').addEventListener('click', quitTest);
}

// --- การทำงานของระบบข้อสอบ ---
async function startTest(level) {
    await game.start(level);
    switchTab('test');
    
    const titles = { easy: 'แบบฝึกหัดง่าย 😊', medium: 'แบบฝึกหัดปานกลาง 🤔', hard: 'แบบฝึกหัดยาก 🤓' };
    document.getElementById('test-level-title').textContent = titles[level] || 'แบบฝึกหัด';
    
    updateQuestionUI();
    startTimer();
}

function startTimer() {
    let seconds = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        document.getElementById('timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function updateQuestionUI() {
    const q = game.getCurrentQuestion();
    document.getElementById('current-question-num').textContent = game.currentIndex + 1;
    
    const displayDiv = document.getElementById('question-display');
    displayDiv.innerHTML = '';

    if (q.imageUrl) {
        const img = document.createElement('img');
        img.src = q.imageUrl;
        img.className = 'mx-auto max-h-48 object-contain mb-4 rounded-lg shadow-sm';
        displayDiv.appendChild(img);
    }

    const textP = document.createElement('div');
    textP.textContent = q.questionText + (q.mathExpression ? ` ${q.mathExpression}` : '');
    textP.className = q.questionText.length > 20 || q.imageUrl ? 'text-2xl font-bold text-gray-800 mb-6' : 'text-6xl font-bold text-purple-600 mb-8';
    displayDiv.appendChild(textP);
    
    const progress = (game.currentIndex / 10) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    const container = document.getElementById('answer-options');
    container.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'number-card bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white text-2xl md:text-4xl font-bold py-6 rounded-2xl shadow-lg transition-all break-words';
        btn.textContent = opt;
        btn.onclick = () => handleAnswer(index, btn);
        container.appendChild(btn);
    });
}

async function handleAnswer(selectedIndex, btnElement) {
    const isCorrect = game.checkAnswer(selectedIndex);
    
    const buttons = document.querySelectorAll('#answer-options button');
    buttons.forEach(b => b.disabled = true);
    
    if (isCorrect) {
        btnElement.classList.add('correct-answer');
    } else {
        btnElement.classList.add('wrong-answer');
    }

    setTimeout(async () => {
        if (game.nextQuestion()) {
            updateQuestionUI();
        } else {
            await finishTest();
        }
    }, 1000);
}

async function finishTest() {
    clearInterval(timerInterval);
    const result = game.getScore(); // ดึงข้อมูลคะแนนรวมและคะแนนแยก 6 แกนทักษะ
    
    document.getElementById('result-score').textContent = `${result.correct}/${result.total}`;
    document.getElementById('result-percent').textContent = `${Math.round(result.score)}%`;
    document.getElementById('result-modal').classList.remove('hidden');

    if (currentUser) {
        await saveTestResult({
            user_id: currentUser.id,
            test_level: result.level,
            score: result.score,
            total_questions: result.total,
            correct_answers: result.correct,
            time_spent: result.timeSpent,
            // ส่งข้อมูล 6 แกนทักษะไปบันทึก
            numerical: result.numerical,
            algebraic: result.algebraic,
            spatial: result.spatial,
            data: result.data,
            logical: result.logical,
            applied: result.applied
        });
        loadHistoryData();
    }
}

// --- การจัดการข้อมูลและสถิติ (6 แกนทักษะ) ---
async function loadHistoryData() {
    if(!currentUser) return;
    
    const { data: history } = await getTestHistory(currentUser.id);
    if (!history || history.length === 0) {
        drawSpiderChart({ numerical: 0, algebraic: 0, spatial: 0, data: 0, logical: 0, applied: 0 });
        return;
    }

    // คำนวณค่าเฉลี่ยสะสมของแต่ละแกนทักษะจากประวัติทั้งหมด
    const skillSums = { numerical: 0, algebraic: 0, spatial: 0, data: 0, logical: 0, applied: 0 };
    const skillCounts = { numerical: 0, algebraic: 0, spatial: 0, data: 0, logical: 0, applied: 0 };

    history.forEach(h => {
        Object.keys(skillSums).forEach(key => {
            if (h[key] !== undefined && h[key] !== null) {
                skillSums[key] += h[key];
                skillCounts[key]++;
            }
        });
    });

    const avgScores = {};
    Object.keys(skillSums).forEach(key => {
        avgScores[key] = skillCounts[key] > 0 ? Math.round(skillSums[key] / skillCounts[key]) : 0;
    });

    // วาดกราฟใยแมงมุม 6 แกนทักษะ
    drawSpiderChart(avgScores);

    // แสดงประวัติในหน้าเลือกแบบฝึกหัด
    const miniContainer = document.getElementById('mini-history');
    miniContainer.innerHTML = history.slice(0, 3).map(h => `
        <div class="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-200">
            <span class="font-bold text-gray-700">${h.test_level}</span>
            <span class="font-bold ${h.score >= 60 ? 'text-green-600' : 'text-red-600'}">${Math.round(h.score)}%</span>
        </div>
    `).join('');

    // สรุปสถิติโดยรวม
    const overallAvg = Math.round(history.reduce((a, b) => a + b.score, 0) / history.length);
    document.getElementById('overall-stats').innerHTML = `
        <div class="flex justify-between p-3 bg-green-50 rounded-xl"><span class="text-gray-700">จำนวนครั้ง:</span> <b>${history.length}</b></div>
        <div class="flex justify-between p-3 bg-blue-50 rounded-xl"><span class="text-gray-700">คะแนนเฉลี่ย:</span> <b>${overallAvg}%</b></div>
    `;

    // แสดงเกรด
    document.getElementById('current-grade').textContent = calculateGrade(overallAvg);
    document.getElementById('grade-avg-score').textContent = overallAvg;
}

// ฟังก์ชันช่วยเหลือ (Helpers)
function calculateGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

function quitTest() {
    clearInterval(timerInterval);
    switchTab('select');
}

async function handleLogin(e) {
    e.preventDefault();
    const { error } = await login(document.getElementById('email').value, document.getElementById('password').value);
    if (error) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        errorDiv.classList.remove('hidden');
    } else {
        checkAuth();
    }
}

async function handleSignup() {
    const { error } = await signup(document.getElementById('email').value, document.getElementById('password').value);
    if(error) alert("สมัครไม่สำเร็จ: " + error.message);
    else alert("สมัครสมาชิกสำเร็จ! กรุณาลองล็อกอิน");
}

async function handleLogout() {
    await logout();
    currentUser = null;
    showLogin();
}

window.closeResultModal = () => {
    document.getElementById('result-modal').classList.add('hidden');
    switchTab('select');
};
