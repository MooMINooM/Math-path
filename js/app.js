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
    await checkAuth();
    setupEventListeners();
});

// --- Auth Handling ---
async function checkAuth() {
    try {
        currentUser = await getCurrentUser();
        if (currentUser) {
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error("Auth Check Error:", error);
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
        userDisplay.textContent = currentUser.email.split('@')[0];
    }
    switchTab('select');
    loadHistoryData();
}

// --- Event Listeners (เพิ่มการตรวจสอบ null) ---
function setupEventListeners() {
    // Auth Forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const btnSignup = document.getElementById('btn-signup');
    if (btnSignup) btnSignup.addEventListener('click', handleSignup);

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    // Navigation
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
            const btn = card.querySelector('button');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'กำลังโหลด...';
                await startTest(card.getAttribute('data-level'));
                btn.textContent = originalText;
            }
        });
    });

    const btnQuit = document.getElementById('btn-quit-test');
    if (btnQuit) btnQuit.addEventListener('click', quitTest);
}

// --- Auth Actions ---
async function handleLogin(e) {
    e.preventDefault();
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');

    if (!emailEl || !passwordEl) return;

    const email = emailEl.value;
    const password = passwordEl.value;
    
    if (errorDiv) errorDiv.classList.add('hidden');
    
    const { error } = await login(email, password);
    if (error) {
        if (errorDiv) {
            errorDiv.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง: " + error.message;
            errorDiv.classList.remove('hidden');
        }
    } else {
        await checkAuth();
    }
}

async function handleSignup() {
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    
    if (!emailEl || !passwordEl) return;
    
    const email = emailEl.value;
    const password = passwordEl.value;
    
    if(!email || !password) return alert('กรุณากรอกอีเมลและรหัสผ่าน');

    const { error } = await signup(email, password);
    if(error) {
        alert("สมัครไม่สำเร็จ: " + error.message);
    } else {
        alert("สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลหรือลองล็อกอิน");
    }
}

async function handleLogout() {
    await logout();
    currentUser = null;
    showLogin();
    window.location.reload(); // เคลียร์สถานะค้างในหน่วยความจำ
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
        textP.className = q.questionText.length > 20 || q.imageUrl ? 'text-2xl font-bold text-gray-800 mb-6' : 'text-6xl font-bold text-purple-600 mb-8';
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
            btn.className = 'number-card bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white text-2xl md:text-4xl font-bold py-6 rounded-2xl shadow-lg transition-all break-words';
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
    const percentEl = document.getElementById('result-percent');
    const emojiEl = document.getElementById('result-emoji');
    const modal = document.getElementById('result-modal');

    if (scoreEl) scoreEl.textContent = `${result.correct}/${result.total}`;
    if (percentEl) percentEl.textContent = `${Math.round(result.score)}%`;
    if (emojiEl) emojiEl.textContent = result.score >= 80 ? '🎉' : result.score >= 60 ? '😊' : '💪';
    if (modal) modal.classList.remove('hidden');

    if (currentUser) {
        await saveTestResult({
            user_id: currentUser.id,
            test_level: result.level,
            score: result.score,
            total_questions: result.total,
            correct_answers: result.correct,
            time_spent: result.timeSpent,
            numerical: result.numerical,
            algebraic: result.algebraic,
            spatial: result.spatial,
            data: result.data,
            logical: result.logical,
            applied: result.applied
        });
        await loadHistoryData();
    }
}

async function loadHistoryData() {
    if(!currentUser) return;
    
    const { data: history } = await getTestHistory(currentUser.id);
    if (!history) return;

    // Mini History
    const miniContainer = document.getElementById('mini-history');
    if (miniContainer) {
        if (history.length === 0) {
            miniContainer.innerHTML = '<p class="text-gray-500 text-center py-4">ยังไม่มีประวัติ</p>';
        } else {
            miniContainer.innerHTML = history.slice(0, 3).map(h => `
                <div class="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <span class="font-bold text-gray-700">${h.test_level}</span>
                    <span class="font-bold ${h.score >= 60 ? 'text-green-600' : 'text-red-600'}">${Math.round(h.score)}%</span>
                </div>
            `).join('');
        }
    }

    // Spider Chart Calculation
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

    // Stats & Grade
    const overallAvg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;
    const statsEl = document.getElementById('overall-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="flex justify-between p-3 bg-green-50 rounded-xl"><span class="text-gray-700">จำนวนครั้ง:</span> <b>${history.length}</b></div>
            <div class="flex justify-between p-3 bg-blue-50 rounded-xl"><span class="text-gray-700">คะแนนเฉลี่ย:</span> <b>${overallAvg}%</b></div>
        `;
    }

    const gradeEl = document.getElementById('current-grade');
    const gradeAvgEl = document.getElementById('grade-avg-score');
    if (gradeEl) gradeEl.textContent = calculateGrade(overallAvg);
    if (gradeAvgEl) gradeAvgEl.textContent = overallAvg;
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
