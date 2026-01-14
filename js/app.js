// js/app.js
import { login, logout, signup, getCurrentUser } from './auth.js';
import { saveTestResult, getTestHistory } from './db.js';
import { MathGame } from './game.js';
import { switchTab, drawSpiderChart } from './ui.js';

const game = new MathGame();
let timerInterval = null;
let currentUser = null;

// --- เริ่มต้นระบบ ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 App Initializing...");
    await checkAuth();
    setupEventListeners();
});

// --- ตรวจสอบการเข้าสู่ระบบ ---
async function checkAuth() {
    try {
        currentUser = await getCurrentUser();
        if (currentUser) {
            console.log("✅ User authenticated:", currentUser.email);
            showApp();
        } else {
            console.log("👋 No active session, showing login.");
            showLogin();
        }
    } catch (error) {
        console.error("❌ Auth Check Error:", error);
        showLogin();
    }
}

function showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
}

function showApp() {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    const userDisplay = document.getElementById('current-user-display');
    if (userDisplay && currentUser) {
        userDisplay.textContent = currentUser.email.split('@')[0];
    }
    switchTab('select');
    loadHistoryData();
}

// --- ตั้งค่าปุ่มต่างๆ (ป้องกัน Error null) ---
function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const btnSignup = document.getElementById('btn-signup');
    if (btnSignup) btnSignup.addEventListener('click', handleSignup);

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    // Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            switchTab(tab);
            if (tab === 'progress' || tab === 'grade') loadHistoryData();
        });
    });

    // Level Cards
    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', async () => {
            const level = card.getAttribute('data-level');
            const btn = card.querySelector('button');
            if (btn) btn.textContent = 'กำลังโหลด...';
            await startTest(level);
            if (btn) btn.textContent = 'เริ่มเลย 🚀';
        });
    });

    const btnQuit = document.getElementById('btn-quit-test');
    if (btnQuit) btnQuit.addEventListener('click', quitTest);
}

// --- การล็อกอินด้วย ID ---
async function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('student-id')?.value.trim();
    const password = document.getElementById('password')?.value;
    const errorDiv = document.getElementById('login-error');

    if (!id || !password) return;
    if (errorDiv) errorDiv.classList.add('hidden');

    const fakeEmail = `${id}@mathpath.com`;
    console.log("🔐 Attempting login for:", fakeEmail);

    const { data, error } = await login(fakeEmail, password);
    if (error) {
        console.error("❌ Login failed:", error.message);
        if (errorDiv) {
            errorDiv.textContent = "รหัส ID หรือรหัสผ่านไม่ถูกต้อง";
            errorDiv.classList.remove('hidden');
        }
    } else {
        console.log("✅ Login success!");
        await checkAuth();
    }
}

// --- การสมัครสมาชิกด้วย ID ---
async function handleSignup() {
    const id = document.getElementById('student-id')?.value.trim();
    const password = document.getElementById('password')?.value;
    
    if (!id || !password) return alert('กรุณากรอกรหัส ID และรหัสผ่าน');
    if (password.length < 6) return alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');

    const fakeEmail = `${id}@mathpath.com`;
    console.log("📝 Attempting signup for:", fakeEmail);

    const { data, error } = await signup(fakeEmail, password);
    if (error) {
        console.error("❌ Signup failed:", error.message);
        alert("สมัครไม่สำเร็จ: " + error.message);
    } else {
        console.log("✅ Signup success!");
        alert("สมัครสมาชิกสำเร็จ! คุณสามารถใช้ ID นี้ล็อกอินได้ทันที 🚀");
    }
}

async function handleLogout() {
    await logout();
    currentUser = null;
    window.location.reload(); // รีโหลดเพื่อล้างข้อมูลค้างทั้งหมด
}

// --- ตรรกะอื่นๆ ของเกม (ใช้ของเดิมที่มี 6 แกน) ---
async function startTest(level) {
    await game.start(level);
    switchTab('test');
    updateQuestionUI();
    startTimer();
}

function startTimer() {
    let seconds = 0;
    const timerEl = document.getElementById('timer');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (timerEl) timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function updateQuestionUI() {
    const q = game.getCurrentQuestion();
    if (!q) return;
    const displayDiv = document.getElementById('question-display');
    if (displayDiv) {
        displayDiv.innerHTML = `<div class="text-2xl font-bold text-gray-800 mb-6">${q.questionText}</div>`;
        if (q.imageUrl) {
            displayDiv.innerHTML += `<img src="${q.imageUrl}" class="mx-auto max-h-48 mb-4">`;
        }
    }
    const container = document.getElementById('answer-options');
    if (container) {
        container.innerHTML = '';
        q.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'number-card bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold py-4 rounded-xl shadow-lg';
            btn.textContent = opt;
            btn.onclick = () => handleAnswer(index, btn);
            container.appendChild(btn);
        });
    }
}

async function handleAnswer(index, btn) {
    const isCorrect = game.checkAnswer(index);
    btn.classList.add(isCorrect ? 'correct-answer' : 'wrong-answer');
    setTimeout(async () => {
        if (game.nextQuestion()) updateQuestionUI();
        else await finishTest();
    }, 1000);
}

async function finishTest() {
    clearInterval(timerInterval);
    const result = game.getScore();
    document.getElementById('result-score').textContent = `${result.correct}/${result.total}`;
    document.getElementById('result-modal').classList.remove('hidden');
    if (currentUser) {
        await saveTestResult({
            user_id: currentUser.id,
            test_level: result.level,
            score: result.score,
            total_questions: result.total,
            correct_answers: result.correct,
            time_spent: result.timeSpent,
            numerical: result.numerical || 0,
            algebraic: result.algebraic || 0,
            spatial: result.spatial || 0,
            data: result.data || 0,
            logical: result.logical || 0,
            applied: result.applied || 0
        });
        loadHistoryData();
    }
}

async function loadHistoryData() {
    if(!currentUser) return;
    const { data: history } = await getTestHistory(currentUser.id);
    if (!history) return;
    const skillSums = { numerical: 0, algebraic: 0, spatial: 0, data: 0, logical: 0, applied: 0 };
    history.forEach(h => {
        Object.keys(skillSums).forEach(key => { if (h[key]) skillSums[key] += h[key]; });
    });
    const avgScores = {};
    Object.keys(skillSums).forEach(key => { avgScores[key] = history.length > 0 ? Math.round(skillSums[key] / history.length) : 0; });
    drawSpiderChart(avgScores);
}

function quitTest() { clearInterval(timerInterval); switchTab('select'); }
window.closeResultModal = () => { document.getElementById('result-modal').classList.add('hidden'); switchTab('select'); };
