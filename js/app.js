import { login, logout, getCurrentUser } from './auth.js';
import { supabase } from './config.js';
import { saveTestResult, getTestHistory } from './db.js';
import { MathGame } from './game.js';
import { switchTab, drawSpiderChart } from './ui.js';

const curriculumData = {
    "P.1": { "1": ["จำนวนนับ 1-10", "การบวก (ไม่เกิน 20)", "การลบ (ไม่เกิน 20)"], "2": ["การบวก/ลบ (ไม่เกิน 100)", "รูปเรขาคณิต", "การวัด"] },
    "P.2": { "1": ["จำนวนนับไม่เกิน 1,000", "การบวก/ลบ", "การคูณ"], "2": ["การหาร", "เวลา", "ปริมาตร"] },
    "P.3": { "1": ["จำนวนนับไม่เกิน 100,000", "การบวก/ลบ", "เศษส่วน"], "2": ["การหาร", "เงิน", "การวัด"] },
    "P.4": { "1": ["จำนวนนับ > 100,000", "การคูณ/หาร"], "2": ["เศษส่วน", "ทศนิยม", "รูปสี่เหลี่ยม"] },
    "P.5": { "1": ["เศษส่วน", "ทศนิยม", "บัญญัติไตรยางศ์"], "2": ["ร้อยละ", "เส้นขนาน", "รูปสี่เหลี่ยม"] },
    "P.6": { "1": ["ห.ร.ม./ค.ร.น.", "เศษส่วน", "ทศนิยม"], "2": ["รูปสามเหลี่ยม", "รูปหลายเหลี่ยม", "วงกลม"] },
    "M.1": { "1": ["จำนวนเต็ม", "การสร้างทางเรขาคณิต", "เลขยกกำลัง", "ทศนิยมและเศษส่วน", "รูปเรขาคณิต 2 มิติและ 3 มิติ"], "2": ["สมการเชิงเส้นตัวแปรเดียว", "อัตราส่วนและร้อยละ", "กราฟและความสัมพันธ์", "สถิติ"] },
    "M.2": { "1": ["ทฤษฎีบทพีทาโกรัส", "จำนวนจริง", "พพหุนาม"], "2": ["สถิติ", "การเท่ากันทุกประการ", "เส้นขนาน"] },
    "M.3": { "1": ["อสมการ", "แยกตัวประกอบ", "สมการกำลังสอง"], "2": ["ระบบสมการ", "วงกลม", "ความน่าจะเป็น"] }
};

const game = new MathGame();
let timerInterval = null;
let currentUser = null;
let userRealGrade = 'M.1'; 
let currentSem = '1';
let userAvatarFromDB = null; 

const ALL_COMPETENCIES = ['numerical', 'algebraic', 'visual', 'data', 'logical', 'applied'];

// --- Window Functions ---
window.startAdaptiveTest = async () => { await runGame('adaptive'); };
window.startSpecificTest = async (competency) => { await runGame('specific', competency); };
window.startChapterTest = async (chapterName) => { await runGame('chapter', null, chapterName); };

window.setSemester = (sem) => { 
    currentSem = sem; 
    updateSemesterUI(); 
    loadHistoryData(); 
};

window.closeResultModal = () => { 
    document.getElementById('result-modal').classList.add('hidden'); 
    document.getElementById('content-test').classList.add('hidden'); 
    switchTab('select'); 
    loadHistoryData(); 
};

// --- Core Logic ---

async function runGame(mode, competency = null, chapterName = null) {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนครับ");

    let targetLevel = "1";
    let targetCompetency = competency;

    if (mode === 'chapter' && chapterName) {
        targetCompetency = getWeakestCompetency();
        const lvEl = document.getElementById(`lv-${targetCompetency}`);
        targetLevel = lvEl ? lvEl.textContent : "1";
    } 
    else if (mode === 'specific' && competency) {
        const lvEl = document.getElementById(`lv-${competency}`);
        targetLevel = lvEl ? lvEl.textContent : "1";
    } 
    else if (mode === 'adaptive') {
        targetCompetency = getWeakestCompetency();
        targetLevel = "1"; 
    }

    const targetGrade = userRealGrade || 'M.1';
    await game.start(mode, targetGrade, targetCompetency, currentSem, chapterName, targetLevel);
    
    if (!game.questions || game.questions.length === 0) {
        alert(`ไม่พบข้อสอบระดับ ${targetLevel} ในขณะนี้`);
        return;
    }
    
    switchTab('test');
    updateTestHeader(mode, targetCompetency, chapterName, targetGrade, targetLevel);
    updateQuestionUI();
    startTimer();
}

function getWeakestCompetency() {
    let weakest = ALL_COMPETENCIES[0];
    let minLv = 999;
    ALL_COMPETENCIES.forEach(comp => {
        const lv = parseInt(document.getElementById(`lv-${comp}`)?.textContent || "1");
        if (lv < minLv) { minLv = lv; weakest = comp; }
    });
    return weakest;
}

function updateTestHeader(mode, competency, chapterName, grade, level) {
    const titleEl = document.getElementById('test-level-title');
    let displayText = "";
    if (mode === 'chapter') displayText = `Mission: ${chapterName}`;
    else if (mode === 'adaptive') displayText = `Adaptive Mission`;
    else displayText = `Training: ${competency.toUpperCase()}`;
    titleEl.innerHTML = displayText;
}

function formatGrade(gradeCode) {
    if (!gradeCode) return '';
    return gradeCode.replace('P.', 'ป.').replace('M.', 'ม.');
}

/**
 * [อัปเดต] หน้าแสดงโจทย์แบบ Focus Mode (มี A, B, C, D)
 */
function updateQuestionUI() { 
    const q = game.getCurrentQuestion(); 
    if (!q) { finishTest(); return; }

    document.getElementById('current-question-num').textContent = game.currentIndex + 1;
    document.getElementById('total-questions').textContent = game.questions.length;
    
    const displayDiv = document.getElementById('question-display');
    displayDiv.innerHTML = q.questionText; 
    
    document.getElementById('progress-bar').style.width = `${(game.currentIndex / game.questions.length) * 100}%`;
    
    const container = document.getElementById('answer-options');
    container.innerHTML = '';

    const prefixes = ['A', 'B', 'C', 'D'];
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'answer-option-btn';
        btn.innerHTML = `
            <span class="option-prefix">${prefixes[idx]}</span>
            <div class="flex-1 text-left">${opt}</div>
        `;
        
        btn.onclick = () => {
            const isCorrect = game.checkAnswer(idx);
            
            // แสดง Feedback สีสัน
            btn.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50');
            btn.style.borderColor = isCorrect ? '#10b981' : '#f43f5e';
            
            const allBtns = container.querySelectorAll('button');
            allBtns.forEach(b => b.disabled = true);

            setTimeout(() => { 
                if (game.nextQuestion()) updateQuestionUI(); 
                else finishTest(); 
            }, 800);
        };
        container.appendChild(btn);
    });
}

function calculateDailyDecay(history) {
    if (!history || history.length === 0) return 0;
    const lastTestDate = new Date(history[0].created_at);
    const today = new Date();
    lastTestDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today - lastTestDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) * 50;
}

async function loadHistoryData() {
    if(!currentUser) return;
    const { data: history, error } = await getTestHistory(currentUser.id);
    
    updateMasteryLibrary(history || []);

    if (error || !history || history.length === 0) {
        drawSpiderChart({ numerical: 0, algebraic: 0, visual: 0, data: 0, logical: 0, applied: 0 });
        return;
    }

    const currentXPs = { numerical: 0, algebraic: 0, visual: 0, data: 0, logical: 0, applied: 0 };
    const sortedHistory = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    sortedHistory.forEach(h => {
        const stats = h.competency_stats || {};
        ALL_COMPETENCIES.forEach(k => {
            if (stats[k]) {
                // ดึงจำนวนข้อที่ถูกและผิดจาก stats ของทักษะนั้นๆ
                const correct = typeof stats[k] === 'object' ? (stats[k].correct || 0) : (parseInt(stats[k]) || 0);
                // คำนวณข้อที่ผิด (สมมติว่า 1 รอบมี 10 ข้อ หรือใช้โครงสร้างข้อมูลที่คุณเก็บไว้)
                const totalInSession = typeof stats[k] === 'object' ? (stats[k].total || 10) : 10;
                const wrong = totalInSession - correct;

                // [สูตรใหม่] ถูก +5, ผิด -5
                const sessionXP = (correct * 5) - (wrong * 5);
                
                // รวม XP โดยล็อกค่าไว้ไม่ให้ต่ำกว่า 0 และไม่เกิน 400 (Max Level 5)
                currentXPs[k] = Math.max(0, Math.min(400, (currentXPs[k] || 0) + sessionXP));
            }
        });
    });
    const dailyPenalty = calculateDailyDecay(history);
    const radarScores = {};
    ALL_COMPETENCIES.forEach(k => {
        const finalXP = Math.max(0, currentXPs[k] - dailyPenalty);
        radarScores[k] = (finalXP / 400) * 100; 
        let level = Math.min(Math.floor(finalXP / 100) + 1, 5); 
        if(document.getElementById(`lv-${k}`)) document.getElementById(`lv-${k}`).textContent = level;
        if(document.getElementById(`bar-${k}`)) document.getElementById(`bar-${k}`).style.width = `${(level === 5) ? 100 : (finalXP % 100)}%`;
    });

    drawSpiderChart(radarScores);
    
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const totalQuestions = history.reduce((sum, h) => sum + (h.correct_answers || 0), 0);
    document.getElementById('stat-total-mission').textContent = history.length;
    document.getElementById('stat-accuracy').textContent = `${avg(history.map(h => h.score))}%`;
    document.getElementById('stat-questions').textContent = totalQuestions;
}

/**
 * [อัปเดต] ยุบรวม Library และบันทึกคะแนนเข้าด้วยกัน
 */
function updateMasteryLibrary(history) {
    const container = document.getElementById('chapter-list');
    if(!container) return;

    const historyMap = {};
    history.forEach(h => {
        if(!historyMap[h.test_level]) historyMap[h.test_level] = { scores: [] };
        historyMap[h.test_level].scores.push(h.score);
    });

    const allChapters = curriculumData[userRealGrade]?.[currentSem] || [];
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    container.innerHTML = allChapters.map(chap => {
        const isPlayed = !!historyMap[chap];
        const percent = isPlayed ? avg(historyMap[chap].scores) : 0;
        
        return `
            <div onclick="window.startChapterTest('${chap}')" class="mastery-item">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-10 h-10 rounded-xl flex-shrink-0 ${isPlayed ? 'bg-slate-800 text-white' : 'bg-white text-slate-300 border-2 border-dashed border-slate-200'} flex items-center justify-center font-black text-lg">
                        ${chap[0]}
                    </div>
                    <div class="font-bold text-slate-700 truncate">${chap}</div>
                </div>
                <div class="font-black text-xs px-4 py-2 rounded-full flex-shrink-0 ${isPlayed ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'}">
                    ${isPlayed ? percent + '%' : 'READY'}
                </div>
            </div>
        `;
    }).join('');
}

function renderSkillsGrid() {
    const container = document.getElementById('skills-grid');
    if (!container) return;
    
    const skillColors = {
        numerical: '#3b82f6', algebraic: '#eab308', visual: '#10b981',
        data: '#f43f5e', logical: '#6366f1', applied: '#f59e0b'
    };

    const skills = [
        { id: 'numerical', name: 'Numerical', icon: '🧮' },
        { id: 'algebraic', name: 'Algebraic', icon: '⚖️' },
        { id: 'visual', name: 'Visual', icon: '📐' },
        { id: 'data', name: 'Data', icon: '📊' },
        { id: 'logical', name: 'Logical', icon: '🧩' },
        { id: 'applied', name: 'Applied', icon: '🛠️' }
    ];

    container.innerHTML = skills.map(skill => `
        <div onclick="startSpecificTest('${skill.id}')" class="skill-mini-card group" style="border-left-color: ${skillColors[skill.id]}">
            <div class="flex justify-between items-center mb-3">
                <span class="text-xl">${skill.icon}</span>
                <span class="text-[9px] font-black text-slate-400 group-hover:text-slate-900 transition-all uppercase tracking-widest">${skill.name}</span>
            </div>
            <div class="text-center mb-2">
                <p class="text-2xl font-black text-slate-800">Lv.<span id="lv-${skill.id}">1</span></p>
            </div>
            <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div id="bar-${skill.id}" class="h-full w-0 transition-all duration-1000" style="background-color: ${skillColors[skill.id]}"></div>
            </div>
        </div>
    `).join('');
}

// --- Auth & User Management ---

async function checkAuth() { 
    currentUser = await getCurrentUser(); 
    if (currentUser) { 
        await checkRoleAndRedirect(); 
        await fetchRealUserGrade();
        showApp(); 
    } 
    else { showLogin(); } 
}

async function fetchRealUserGrade() {
    if (!currentUser) return;
    const studentIdFromEmail = currentUser.email.split('@')[0];
    const { data } = await supabase.from('students').select('grade, avatars').eq('student_id', studentIdFromEmail).single();
    if (data) {
        if (data.grade) userRealGrade = data.grade;
        if (data.avatars) userAvatarFromDB = data.avatars;
    }
}

async function checkRoleAndRedirect() { 
    const { data: admins } = await supabase.from('app_admins').select('email').eq('email', currentUser.email); 
    if (admins && admins.length > 0) { window.location.href = 'admin.html'; } 
}

function showLogin() { 
    document.getElementById('login-screen').classList.remove('hidden'); 
    document.getElementById('main-app').classList.add('hidden'); 
}

function showApp() { 
    document.getElementById('login-screen').classList.add('hidden'); 
    document.getElementById('main-app').classList.remove('hidden'); 
    renderSkillsGrid();
    updateUserDisplay(); 
    updateSemesterUI();
    switchTab('select'); 
    loadHistoryData(); 
}

function setupEventListeners() { 
    const loginForm = document.getElementById('login-form'); 
    if (loginForm) loginForm.addEventListener('submit', handleLogin); 
    const logoutBtn = document.getElementById('btn-logout'); 
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout); 
    const quitBtn = document.getElementById('btn-quit-test'); 
    if (quitBtn) quitBtn.addEventListener('click', () => { clearInterval(timerInterval); switchTab('select'); }); 
}

async function handleLogin(e) { 
    e.preventDefault(); 
    const idInput = document.getElementById('student-id'); 
    const passInput = document.getElementById('password'); 
    const { error } = await login(idInput.value, passInput.value); 
    if(error) { 
        document.getElementById('login-error').classList.remove('hidden'); 
    } else { checkAuth(); } 
}

async function handleLogout() { await logout(); currentUser = null; userAvatarFromDB = null; showLogin(); }

function startTimer() { 
    let s = 0; clearInterval(timerInterval); 
    timerInterval = setInterval(() => { s++; document.getElementById('timer').textContent = `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`; }, 1000); 
}

async function finishTest() { 
    clearInterval(timerInterval); 
    const res = game.getScore(); 
    document.getElementById('result-score').textContent = `${res.correct}/${res.total}`; 
    document.getElementById('result-percent').textContent = `${Math.round(res.score)}%`; 
    document.getElementById('result-modal').classList.remove('hidden'); 
    if (currentUser) { 
        await saveTestResult({ user_id: currentUser.id, test_level: res.level, score: res.score, total_questions: res.total, correct_answers: res.correct, competency_stats: res.competencyStats }); 
        loadHistoryData(); 
    } 
}

function updateSemesterUI() {
    const btn1 = document.getElementById('sem-btn-1');
    const btn2 = document.getElementById('sem-btn-2');
    if (!btn1 || !btn2) return;
    btn1.className = currentSem === '1' ? "sem-btn sem-active" : "sem-btn";
    btn2.className = currentSem === '2' ? "sem-btn sem-active" : "sem-btn";
}

function updateUserDisplay() {
    const nameEl = document.getElementById('display-name');
    const gradeEl = document.getElementById('display-grade');
    const avatarEl = document.getElementById('user-avatar');
    
    if (currentUser) {
        const fullName = currentUser.user_metadata?.name || 'Scholar';
        if(nameEl) nameEl.textContent = fullName;
        if(gradeEl) gradeEl.textContent = formatGrade(userRealGrade || 'M.1');
        
        if(avatarEl) {
            const savedAvatar = currentUser.user_metadata?.avatar_url;
            if (userAvatarFromDB) avatarEl.src = userAvatarFromDB;
            else if (savedAvatar) avatarEl.src = savedAvatar;
            else avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a252f&color=f4f1ea&bold=true`;

            avatarEl.onerror = () => { avatarEl.src = `https://ui-avatars.com/api/?name=User&background=1a252f&color=f4f1ea`; };
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => { 
    await checkAuth(); 
    setupEventListeners(); 
});

