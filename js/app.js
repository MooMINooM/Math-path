// js/app.js
import { login, logout, getCurrentUser } from './auth.js';
import { supabase } from './config.js'; // [สำคัญ] ต้อง import supabase มาเช็คข้อมูล
import { saveTestResult, getTestHistory } from './db.js';
import { MathGame } from './game.js';
import { switchTab, drawSpiderChart } from './ui.js';

const game = new MathGame();
let timerInterval = null;
let currentUser = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAuth();
        setupEventListeners();
    } catch (err) {
        console.error("Critical Error during init:", err);
    }
});

// --- Auth Handling ---
async function checkAuth() {
    currentUser = await getCurrentUser();
    if (currentUser) {
        // [UPDATED] เช็คว่าเป็นนักเรียนหรือครู?
        await checkRoleAndRedirect();
    } else {
        showLogin();
    }
}

// [ฟังก์ชันใหม่] ตรวจสอบสิทธิ์และพาไปหน้าทีถูกต้อง
async function checkRoleAndRedirect() {
    const email = currentUser.email;
    
    // 1. ดึง ID จากอีเมล (ตัดส่วนหลัง @ ออก) หรือเช็คจาก email เต็มก็ได้
    // แต่ในตาราง students เราเก็บ student_id ไว้
    // ลองเช็คดูว่า User นี้มีข้อมูลในตาราง students หรือไม่?
    
    // แปลง email กลับเป็น student_id (สมมติว่าเป็นนักเรียน)
    const possibleStudentId = email.split('@')[0];

    // Query ดูในตาราง students
    const { data: studentRecord, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', possibleStudentId)
        .single();

    // กรณีที่ 1: พบข้อมูลในตาราง students -> เป็นนักเรียน
    if (studentRecord) {
        // บันทึกชื่อจริงลง Metadata ถ้ายังไม่มี (เผื่อไว้)
        if (!currentUser.user_metadata?.name) {
             await supabase.auth.updateUser({
                data: { name: studentRecord.full_name, grade: studentRecord.grade }
             });
             // อัปเดตตัวแปร local
             currentUser.user_metadata = { 
                 ...currentUser.user_metadata, 
                 name: studentRecord.full_name, 
                 grade: studentRecord.grade 
             };
        }
        showApp(); // เข้าสู่หน้าเกมปกติ
    } 
    // กรณีที่ 2: ไม่พบข้อมูล -> สันนิษฐานว่าเป็น "ครู" (Admin)
    else {
        // พาไปหน้า Admin
        alert("ยินดีต้อนรับคุณครู! กำลังเข้าสู่ระบบจัดการ...");
        window.location.href = 'admin.html';
    }
}

function showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    if(loginScreen) loginScreen.classList.remove('hidden');
    if(mainApp) mainApp.classList.add('hidden');
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // แสดงผลชื่อนักเรียน
    updateUserDisplay();
    switchTab('select');
    loadHistoryData();
}

function updateUserDisplay() {
    const display = document.getElementById('current-user-display');
    if (display && currentUser) {
        const name = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
        const grade = currentUser.user_metadata?.grade || 'General';
        display.textContent = `น้อง ${name} (${grade})`;
    }
}

// ... (ส่วนที่เหลือ setupEventListeners, handleLogin ฯลฯ เหมือนเดิม) ...
// ให้ก๊อปปี้ส่วน EventListeners และ Game Logic เดิมมาใส่ต่อท้ายได้เลยครับ
// หรือถ้าต้องการไฟล์เต็มบอกได้ครับ แต่หลักๆ คือแก้แค่ checkAuth และเพิ่ม checkRoleAndRedirect ครับ

function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', async () => {
             const btn = card.querySelector('button');
             const originalText = btn.textContent;
             btn.textContent = 'กำลังโหลด...'; 
             await startTest(card.getAttribute('data-level'));
             btn.textContent = originalText;
        });
    });

    const quitBtn = document.getElementById('btn-quit-test');
    if (quitBtn) quitBtn.addEventListener('click', quitTest);

    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.getAttribute('data-tab');
            switchTab(tab);
            if(tab === 'progress' || tab === 'grade') loadHistoryData();
        });
    });
}

async function handleLogin(e) {
    e.preventDefault(); 
    const studentIdInput = document.getElementById('student-id');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    
    if(!studentIdInput || !passwordInput) return;

    const inputVal = studentIdInput.value;
    const password = passwordInput.value;
    
    errorDiv.classList.add('hidden');
    
    // auth.js รองรับทั้ง ID และ Email อยู่แล้ว
    const { error } = await login(inputVal, password);
    
    if (error) {
        errorDiv.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
        errorDiv.classList.remove('hidden');
    } else {
        checkAuth(); // เรียกเช็คสิทธิ์เพื่อ Redirect
    }
}

async function handleLogout() {
    await logout();
    currentUser = null;
    showLogin();
}

// ... (Game Logic: startTest, updateQuestionUI, ฯลฯ เหมือนเดิมเป๊ะ) ...
async function startTest(level) {
    const userGrade = currentUser?.user_metadata?.grade || 'P.1'; // Default P.1 ถ้าครูเข้ามาเทสเล่น
    await game.start(level, userGrade);
    
    if (!game.questions || game.questions.length === 0) {
        alert(`ไม่พบข้อสอบสำหรับชั้น "${userGrade}" ระดับ "${level}"`);
        return; 
    }
    switchTab('test');
    const titles = { easy: 'แบบฝึกหัดง่าย 😊', medium: 'แบบฝึกหัดปานกลาง 🤔', hard: 'แบบฝึกหัดยาก 🤓' };
    const titleEl = document.getElementById('test-level-title');
    if(titleEl) titleEl.textContent = `${titles[level]} (${userGrade})`;
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
        const timerEl = document.getElementById('timer');
        if(timerEl) timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function updateQuestionUI() {
    const q = game.getCurrentQuestion();
    if (!q) { switchTab('select'); return; }

    const numEl = document.getElementById('current-question-num');
    if(numEl) numEl.textContent = game.currentIndex + 1;
    
    const displayDiv = document.getElementById('question-display');
    if(displayDiv) {
        displayDiv.innerHTML = ''; 
        if (q.imageUrl) {
            const img = document.createElement('img');
            img.src = q.imageUrl;
            img.className = 'mx-auto max-h-48 object-contain mb-4 rounded-lg shadow-sm';
            displayDiv.appendChild(img);
        }
        const textP = document.createElement('div');
        textP.textContent = q.questionText || ''; 
        if (q.mathExpression) textP.textContent += ` ${q.mathExpression}`; 
        
        if ((q.questionText && q.questionText.length > 20) || q.imageUrl) {
            textP.className = 'text-2xl font-bold text-gray-800 mb-6';
        } else {
            textP.className = 'text-6xl font-bold text-purple-600 mb-8';
        }
        displayDiv.appendChild(textP);
    }
    
    const progressBar = document.getElementById('progress-bar');
    if(progressBar) {
        const progress = (game.currentIndex / 10) * 100;
        progressBar.style.width = `${progress}%`;
    }

    const container = document.getElementById('answer-options');
    if(container) {
        container.innerHTML = '';
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, index) => {
                const btn = document.createElement('button');
                btn.className = 'number-card bg-gradient-to-br from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white text-2xl md:text-4xl font-bold py-6 rounded-2xl shadow-lg transition-all break-words';
                btn.textContent = opt;
                btn.onclick = () => handleAnswer(index, opt, btn);
                container.appendChild(btn);
            });
        }
    }
}

function handleAnswer(index, value, btnElement) {
    const isCorrect = game.checkAnswer(index, value);
    const buttons = document.querySelectorAll('#answer-options button');
    buttons.forEach(b => b.disabled = true);
    
    if (isCorrect) btnElement.classList.add('correct-answer');
    else btnElement.classList.add('wrong-answer');

    setTimeout(async () => {
        if (game.nextQuestion()) updateQuestionUI();
        else await finishTest();
    }, 1000);
}

async function finishTest() {
    clearInterval(timerInterval);
    const result = game.getScore();
    const resultModal = document.getElementById('result-modal');
    if(resultModal) {
        document.getElementById('result-score').textContent = `${result.correct}/${result.total}`;
        document.getElementById('result-percent').textContent = `${Math.round(result.score)}%`;
        const emoji = result.score >= 80 ? '🎉' : result.score >= 60 ? '😊' : '💪';
        document.getElementById('result-emoji').textContent = emoji;
        resultModal.classList.remove('hidden');
    }
    if (currentUser) {
        await saveTestResult({
            user_id: currentUser.id,
            test_level: result.level,
            score: result.score,
            total_questions: result.total,
            correct_answers: result.correct,
            time_spent: result.timeSpent
        });
        loadHistoryData(); 
    }
}

function quitTest() {
    clearInterval(timerInterval);
    switchTab('select');
}

window.closeResultModal = () => {
    const m = document.getElementById('result-modal');
    if(m) m.classList.add('hidden');
    switchTab('select');
};

async function loadHistoryData() {
    if(!currentUser) return;
    const { data: history } = await getTestHistory(currentUser.id);
    if (!history) return;

    const miniContainer = document.getElementById('mini-history');
    if (miniContainer) {
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
    }
    
    const levelScores = { easy: [], medium: [], hard: [] };
    history.forEach(h => { if(levelScores[h.test_level]) levelScores[h.test_level].push(h.score); });
    const avgScores = { easy: avg(levelScores.easy), medium: avg(levelScores.medium), hard: avg(levelScores.hard) };
    drawSpiderChart(avgScores);

    const overallStats = document.getElementById('overall-stats');
    if(overallStats) {
        const totalTests = history.length;
        const allScores = history.map(h => h.score);
        const overallAvg = avg(allScores);
        overallStats.innerHTML = `
            <div class="flex justify-between p-3 bg-green-50 rounded-xl"><span class="text-gray-700">จำนวนครั้ง:</span> <b>${totalTests}</b></div>
            <div class="flex justify-between p-3 bg-blue-50 rounded-xl"><span class="text-gray-700">คะแนนเฉลี่ย:</span> <b>${overallAvg}%</b></div>
        `;
        const gradeDisplay = document.getElementById('current-grade');
        if(gradeDisplay) gradeDisplay.textContent = calculateGrade(overallAvg);
        const gradeAvg = document.getElementById('grade-avg-score');
        if(gradeAvg) gradeAvg.textContent = overallAvg;
    }

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