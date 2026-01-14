// js/app.js
import { login, logout, signup, getCurrentUser } from './auth.js';
import { saveTestResult, getTestHistory } from './db.js';
import { MathGame } from './game.js';
import { switchTab, drawSpiderChart } from './ui.js';

const game = new MathGame();
let timerInterval = null;
let currentUser = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 ระบบกำลังเริ่มต้น...");
    await checkAuth();
    setupEventListeners();
});

// --- Auth Handling (ปรับปรุงเพื่อใช้ข้อมูลจากตาราง student) ---
async function checkAuth() {
    try {
        // ดึงข้อมูลจาก LocalStorage ผ่าน auth.js
        currentUser = await getCurrentUser();
        if (currentUser) {
            console.log("✅ ยินดีต้อนรับ:", currentUser.student_id);
            showApp();
        } else {
            console.log("👋 ยังไม่ได้เข้าสู่ระบบ");
            showLogin();
        }
    } catch (error) {
        console.error("❌ ตรวจสอบสิทธิ์ผิดพลาด:", error);
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
    const userDisplay = document.getElementById('current-user-display');

    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    if (userDisplay && currentUser) {
        // แสดงชื่อ หรือ รหัส ID จากตาราง student
        userDisplay.textContent = currentUser.name || currentUser.student_id;
    }
    switchTab('select');
    loadHistoryData();
}

// --- Event Listeners (ป้องกัน Error null) ---
function setupEventListeners() {
    // ฟอร์มล็อกอิน
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // ปุ่มสมัครสมาชิก
    const btnSignup = document.getElementById('btn-signup');
    if (btnSignup) btnSignup.addEventListener('click', handleSignup);

    // ปุ่มออกจากระบบ
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

    // Level Selection
    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', async () => {
            const level = card.getAttribute('data-level');
            const btn = card.querySelector('button');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'กำลังโหลด...';
                await startTest(level);
                btn.textContent = originalText;
            }
        });
    });

    const btnQuit = document.getElementById('btn-quit-test');
    if (btnQuit) btnQuit.addEventListener('click', quitTest);
}

// --- Auth Actions (เชื่อมต่อกับตาราง student) ---
async function handleLogin(e) {
    e.preventDefault();
    const idEl = document.getElementById('student-id');
    const passwordEl = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');

    if (!idEl || !passwordEl) return;

    const studentId = idEl.value.trim();
    const password = passwordEl.value;
    
    if (errorDiv) errorDiv.classList.add('hidden');
    
    // เรียกใช้ฟังก์ชัน login ที่เช็คข้อมูลจากตาราง student
    const { data, error } = await login(studentId, password);
    
    if (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    } else {
        await checkAuth();
    }
}

async function handleSignup() {
    const idEl = document.getElementById('student-id');
    const passwordEl = document.getElementById('password');
    
    if (!idEl || !passwordEl) return;
    
    const studentId = idEl.value.trim();
    const password = passwordEl.value;
    
    if(!studentId || !password) return alert('กรุณากรอกรหัส ID และรหัสผ่าน');

    const { error } = await signup(studentId, password);
    if(error) {
        alert("สมัครไม่สำเร็จ: " + error.message);
    } else {
        alert("สมัครสมาชิกสำเร็จ! ตอนนี้คุณสามารถใช้ ID นี้เข้าสู่ระบบได้เลย");
    }
}

async function handleLogout() {
    await logout();
    currentUser = null;
    showLogin();
    window.location.reload(); 
}

// --- Game Logic ---
async function startTest(level) {
    await game.start(level);
    switchTab('test');
    
    const titles = { easy: 'แบบฝึกหัดง่าย 😊', medium: 'แบบฝึกหัดปานกลาง 🤔', hard: 'แบบฝึกหัดยาก 🤓' };
    const titleEl = document.getElementById('test-level-title');
    if (titleEl) titleEl.textContent = titles[level] || 'แบบฝึกหัด';
    
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

    const numEl = document.getElementById('current-question-num');
    if (numEl) numEl.textContent = game.currentIndex + 1;
    
    const displayDiv = document.getElementById('question-display');
    if (displayDiv) {
        displayDiv.innerHTML = '';
        if (q.imageUrl) {
            const img = document.createElement('img');
            img.src = q.imageUrl;
            img.className = 'mx-auto max-h-48 object-contain mb-4 rounded-lg shadow-sm';
            displayDiv.appendChild(img);
        }

        const textP = document.createElement('div');
        textP.textContent = q.questionText + (q.mathExpression ? ` ${q.mathExpression}` : '');
        textP.className = 'text-2xl font-bold text-gray-800 mb-6';
        displayDiv.appendChild(textP);
    }
    
    const progressEl = document.getElementById('progress-bar');
    if (progressEl) {
        const progress = (game.currentIndex / 10) * 100;
        progressEl.style.width = `${progress}%`;
    }

    const container = document.getElementById('answer-options');
    if (container) {
        container.innerHTML = '';
        q.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'number-card bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white text-xl md:text-2xl font-bold py-4 px-6 rounded-2xl shadow-lg transition-all';
            btn.textContent = opt;
            btn.onclick = () => handleAnswer(index, btn);
            container.appendChild(btn);
        });
    }
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
    const result = game.getScore();
    
    const scoreEl = document.getElementById('result-score');
    const modal = document.getElementById('result-modal');

    if (scoreEl) scoreEl.textContent = `${result.correct}/${result.total}`;
    if (modal) modal.classList.remove('hidden');

    if (currentUser) {
        // บันทึกผลสอบโดยใช้ student_id เป็นผู้อ้างอิง
        await saveTestResult({
            user_id: currentUser.student_id, 
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
        await loadHistoryData();
    }
}

async function loadHistoryData() {
    if(!currentUser) return;
    
    // ดึงข้อมูลประวัติโดยใช้ student_id
    const { data: history } = await getTestHistory(currentUser.student_id);
    if (!history) return;

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

    drawSpiderChart(avgScores);

    // แสดงสถิติและเกรด
    const overallAvg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;
    const gradeEl = document.getElementById('current-grade');
    if (gradeEl) gradeEl.textContent = calculateGrade(overallAvg);
}

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

window.closeResultModal = () => {
    const modal = document.getElementById('result-modal');
    if (modal) modal.classList.add('hidden');
    switchTab('select');
};
