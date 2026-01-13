// js/app.js
import { login, logout, signup, getCurrentUser } from './auth.js';
import { saveTestResult, getTestHistory } from './db.js';
import { MathGame } from './game.js';
import { switchTab, drawSpiderChart } from './ui.js';
// import { supabase } from './config.js'; // ไม่ได้ใช้โดยตรงในไฟล์นี้แล้ว

const game = new MathGame();
let timerInterval = null;
let currentUser = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    setupEventListeners();
});

// --- Auth Handling ---
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
    loadHistoryData();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Auth Forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-signup').addEventListener('click', handleSignup);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.getAttribute('data-tab');
            switchTab(tab);
            if(tab === 'progress' || tab === 'grade') loadHistoryData();
        });
    });

    // Level Selection
    document.querySelectorAll('.level-card').forEach(card => {
        // แก้ไขให้รองรับ async startTest
        card.addEventListener('click', async () => {
             const btn = card.querySelector('button');
             const originalText = btn.textContent;
             btn.textContent = 'กำลังโหลด...'; // Feedback ให้ผู้ใช้รู้ว่ากำลังโหลด
             await startTest(card.getAttribute('data-level'));
             btn.textContent = originalText;
        });
    });

    // Quit Test
    document.getElementById('btn-quit-test').addEventListener('click', quitTest);
}

// --- Auth Actions ---
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    errorDiv.classList.add('hidden');
    
    const { error } = await login(email, password);
    if (error) {
        errorDiv.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง: " + error.message;
        errorDiv.classList.remove('hidden');
    } else {
        checkAuth();
    }
}

async function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!email || !password) return alert('กรุณากรอกอีเมลและรหัสผ่าน');

    const { error } = await signup(email, password);
    if(error) {
        alert("สมัครไม่สำเร็จ: " + error.message);
    } else {
        alert("สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน หรือลองล็อกอิน");
    }
}

async function handleLogout() {
    await logout();
    currentUser = null;
    showLogin();
}

// --- Game Logic ---
// 1. เปลี่ยนเป็น Async Function
async function startTest(level) {
    // เพิ่มการรอ (await) เพราะ game.start ตอนนี้ต้องไปดึงข้อมูลจาก Supabase
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

// 2. ปรับปรุงการแสดงผลโจทย์ (รองรับ Text และ Image)
function updateQuestionUI() {
    const q = game.getCurrentQuestion();
    document.getElementById('current-question-num').textContent = game.currentIndex + 1;
    
    // จัดการส่วนแสดงโจทย์
    const displayDiv = document.getElementById('question-display');
    displayDiv.innerHTML = ''; // เคลียร์ของเก่า

    // กรณีมีรูปภาพ
    if (q.imageUrl) {
        const img = document.createElement('img');
        img.src = q.imageUrl;
        img.className = 'mx-auto max-h-48 object-contain mb-4 rounded-lg shadow-sm';
        displayDiv.appendChild(img);
    }

    // กรณีมีข้อความโจทย์ (ใช้ q.questionText ตามโครงสร้างใหม่)
    const textP = document.createElement('div');
    textP.textContent = q.questionText;
    // ถ้ามีสมการคณิตศาสตร์ (Math Expression)
    if (q.mathExpression) {
        // ถ้าอนาคตใส่ KaTeX ก็ render ตรงนี้
        textP.textContent += ` ${q.mathExpression}`; 
    }
    
    // ปรับขนาดตัวอักษรตามเนื้อหา
    if (q.questionText.length > 20 || q.imageUrl) {
        textP.className = 'text-2xl font-bold text-gray-800 mb-6';
    } else {
        textP.className = 'text-6xl font-bold text-purple-600 mb-8';
    }
    displayDiv.appendChild(textP);
    
    // Progress Bar
    const progress = (game.currentIndex / 10) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    // Options
    const container = document.getElementById('answer-options');
    container.innerHTML = '';
    
    // Loop สร้างปุ่มตัวเลือก
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'number-card bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white text-2xl md:text-4xl font-bold py-6 rounded-2xl shadow-lg transition-all break-words'; // ปรับ Text size ให้ยืดหยุ่น
        btn.textContent = opt;
        // 3. ส่งทั้ง index และ value ไปตรวจสอบ
        btn.onclick = () => handleAnswer(index, opt, btn);
        container.appendChild(btn);
    });
}

function handleAnswer(index, value, btnElement) {
    // เรียก checkAnswer แบบใหม่ที่รองรับทั้ง index และ value
    const isCorrect = game.checkAnswer(index, value);
    
    // UI Feedback
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
    const result = game.getScore();
    
    // Show Modal
    document.getElementById('result-score').textContent = `${result.correct}/${result.total}`;
    document.getElementById('result-percent').textContent = `${Math.round(result.score)}%`;
    const emoji = result.score >= 80 ? '🎉' : result.score >= 60 ? '😊' : '💪';
    document.getElementById('result-emoji').textContent = emoji;
    document.getElementById('result-modal').classList.remove('hidden');

    // Save to Supabase
    if (currentUser) {
        await saveTestResult({
            user_id: currentUser.id,
            test_level: result.level,
            score: result.score,
            total_questions: result.total,
            correct_answers: result.correct,
            time_spent: result.timeSpent
        });
        loadHistoryData(); // Refresh data
    }
}

function quitTest() {
    clearInterval(timerInterval);
    switchTab('select');
}

// Global for close button
window.closeResultModal = () => {
    document.getElementById('result-modal').classList.add('hidden');
    switchTab('select');
};

// --- Data Loading & Stats ---
async function loadHistoryData() {
    if(!currentUser) return;
    
    const { data: history } = await getTestHistory(currentUser.id);
    if (!history) return;

    // 1. Mini History (Select Tab)
    const miniContainer = document.getElementById('mini-history');
    if (history.length === 0) {
        miniContainer.innerHTML = '<p class="text-gray-500 text-center py-4">ยังไม่มีประวัติ</p>';
    } else {
        miniContainer.innerHTML = history.slice(0, 3).map(h => `
            <div class="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                <span class="font-bold text-gray-700">${h.test_level}</span>
                <span class="font-bold ${h.score >= 60 ? 'text-green-600' : 'text-red-600'}">${h.score}%</span>
            </div>
        `).join('');
    }

    // 2. Spider Chart (Progress Tab)
    const levelScores = { easy: [], medium: [], hard: [] };
    history.forEach(h => {
        if(levelScores[h.test_level]) levelScores[h.test_level].push(h.score);
    });
    
    const avgScores = {
        easy: avg(levelScores.easy),
        medium: avg(levelScores.medium),
        hard: avg(levelScores.hard)
    };
    drawSpiderChart(avgScores);

    // 3. Overall Stats
    const totalTests = history.length;
    const allScores = history.map(h => h.score);
    const overallAvg = avg(allScores);
    
    document.getElementById('overall-stats').innerHTML = `
        <div class="flex justify-between p-3 bg-green-50 rounded-xl"><span class="text-gray-700">จำนวนครั้ง:</span> <b>${totalTests}</b></div>
        <div class="flex justify-between p-3 bg-blue-50 rounded-xl"><span class="text-gray-700">คะแนนเฉลี่ย:</span> <b>${overallAvg}%</b></div>
    `;

    // 4. Grade Tab
    const grade = calculateGrade(overallAvg);
    document.getElementById('current-grade').textContent = grade;
    document.getElementById('grade-avg-score').textContent = overallAvg;
    
    // Table
    const tableBody = document.querySelector('#history-table tbody');
    if(tableBody) {
        tableBody.innerHTML = history.map(h => `
            <tr class="bg-white border-b hover:bg-purple-50">
                <td class="px-4 py-3">${h.test_level}</td>
                <td class="px-4 py-3 font-bold ${h.score >= 60 ? 'text-green-600' : 'text-red-600'}">${h.score}%</td>
                <td class="px-4 py-3 text-sm text-gray-500">${new Date(h.created_at).toLocaleDateString('th-TH')}</td>
            </tr>
        `).join('');
    }
}

function avg(arr) {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function calculateGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}
