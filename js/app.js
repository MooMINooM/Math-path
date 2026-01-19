import { login, logout, getCurrentUser } from './auth.js';
import { supabase } from './config.js';
import { saveTestResult, getTestHistory } from './db.js';
import { MathGame } from './game.js';
import { switchTab, drawSpiderChart } from './ui.js';

// ==========================================
// 📚 ข้อมูลหลักสูตร (Curriculum Data)
// ==========================================
const curriculumData = {
    "P.1": { "1": ["จำนวนนับ 1-10", "การบวก (ไม่เกิน 20)", "การลบ (ไม่เกิน 20)"], "2": ["การบวก/ลบ (ไม่เกิน 100)", "รูปเรขาคณิต", "การวัด"] },
    "P.2": { "1": ["จำนวนนับไม่เกิน 1,000", "การบวก/ลบ", "การคูณ"], "2": ["การหาร", "เวลา", "ปริมาตร"] },
    "P.3": { "1": ["จำนวนนับไม่เกิน 100,000", "การบวก/ลบ", "เศษส่วน"], "2": ["การหาร", "เงิน", "การวัด"] },
    "P.4": { "1": ["จำนวนนับ > 100,000", "การคูณ/หาร"], "2": ["เศษส่วน", "ทศนิยม", "รูปสี่เหลี่ยม"] },
    "P.5": { "1": ["เศษส่วน", "ทศนิยม", "บัญญัติไตรยางศ์"], "2": ["ร้อยละ", "เส้นขนาน", "รูปสี่เหลี่ยม"] },
    "P.6": { "1": ["ห.ร.ม./ค.ร.น.", "เศษส่วน", "ทศนิยม"], "2": ["รูปสามเหลี่ยม", "รูปหลายเหลี่ยม", "วงกลม"] },
    "M.1": { "1": ["จำนวนเต็ม", "การสร้างทางเรขาคณิต", "เลขยกกำลัง", "ทศนิยมและเศษส่วน", "รูปเรขาคณิต 2 มิติและ 3 มิติ"], "2": ["สมการเชิงเส้นตัวแปรเดียว", "อัตราส่วนและร้อยละ", "กราฟและความสัมพันธ์", "สถิติ"] },
    "M.2": { "1": ["ทฤษฎีบทพีทาโกรัส", "จำนวนจริง", "พหุนาม"], "2": ["สถิติ", "การเท่ากันทุกประการ", "เส้นขนาน"] },
    "M.3": { "1": ["อสมการ", "แยกตัวประกอบ", "สมการกำลังสอง"], "2": ["ระบบสมการ", "วงกลม", "ความน่าจะเป็น"] }
};

// ==========================================
// ⚙️ สถานะระบบ
// ==========================================
const game = new MathGame();
let timerInterval = null;
let currentUser = null;
let userRealGrade = 'M.1'; 
let currentSem = '1'; 

// --- ฟังก์ชัน UI ---
window.startAdaptiveTest = async () => { await runGame('adaptive'); };
window.startSpecificTest = async (competency) => { await runGame('specific', competency); };
window.startChapterTest = async (chapterName) => { await runGame('chapter', null, chapterName); };

window.setSemester = (sem) => { 
    currentSem = sem; 
    updateSemesterUI(); 
    renderLessonLibrary(); 
    loadHistoryData(); 
};

window.closeResultModal = () => { 
    document.getElementById('result-modal').classList.add('hidden'); 
    switchTab('select'); 
    loadHistoryData(); 
};

// ==========================================
// 🚀 ระบบควบคุมเกม
// ==========================================
async function runGame(mode, competency = null, chapterName = null) {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนครับ");
    const targetGrade = userRealGrade || 'M.1';
    await game.start(mode, targetGrade, competency, currentSem, chapterName);
    if (!game.questions || game.questions.length === 0) {
        alert(`ไม่พบข้อสอบสำหรับชั้น ${formatGrade(targetGrade)} เทอม ${currentSem}`);
        return;
    }
    switchTab('test');
    updateTestHeader(mode, competency, chapterName, targetGrade);
    updateQuestionUI();
    startTimer();
}

function updateTestHeader(mode, competency, chapterName, grade) {
    const titleEl = document.getElementById('test-level-title');
    const thaiGrade = formatGrade(grade);
    if (mode === 'chapter') titleEl.textContent = `บทเรียน: ${chapterName} (${thaiGrade})`;
    else if (mode === 'adaptive') titleEl.textContent = `ภารกิจอัจฉริยะ (${thaiGrade})`;
    else titleEl.textContent = `ฝึกทักษะ: ${competency} (${thaiGrade})`;
}

function formatGrade(gradeCode) {
    if (!gradeCode) return '';
    return gradeCode.replace('P.', 'ป.').replace('M.', 'ม.');
}

// ==========================================
// 🎮 ระบบแสดงโจทย์และตัวเลือก
// ==========================================

// ... (ส่วน Import และ Curriculum คงเดิม) ...

function updateQuestionUI() { 
    const q = game.getCurrentQuestion(); 
    if (!q) { finishTest(); return; }
    
    document.getElementById('current-question-num').textContent = game.currentIndex + 1;
    document.getElementById('total-questions').textContent = game.questions.length;
    
    // แสดงโจทย์
    const displayDiv = document.getElementById('question-display');
    displayDiv.innerHTML = q.questionText; 
    
    document.getElementById('progress-bar').style.width = `${(game.currentIndex / game.questions.length) * 100}%`;
    
    const container = document.getElementById('answer-options');
    container.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'bg-white border-2 border-slate-200 hover:border-slate-800 text-slate-700 text-xl font-bold py-4 px-6 rounded transition-all shadow-sm flex items-center gap-3';
        
        // ปรับปรุง: ใช้ class "math-content" หรือปล่อยให้ MutationObserver ตรวจเจอเอง
        btn.innerHTML = `
            <span class="bg-slate-100 text-slate-500 text-sm px-2 py-1 rounded min-w-[30px] text-center">${['A','B','C','D'][idx]}</span> 
            <span class="math-target">${opt}</span>
        `;
        
        btn.onclick = () => {
            const isCorrect = game.checkAnswer(idx);
            btn.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50', isCorrect ? 'border-green-500' : 'border-red-500');
            const buttons = container.querySelectorAll('button');
            buttons.forEach(b => b.disabled = true);
            setTimeout(() => { if (game.nextQuestion()) updateQuestionUI(); else finishTest(); }, 800);
        };
        container.appendChild(btn);
    });

    // เพิ่มความมั่นใจ: เรียก Render ทันทีหนึ่งครั้งหลังสร้างปุ่มเสร็จ
    renderMath();
}

// ระบบ AUTO-RENDER (ถูกต้องแล้ว)
function renderMath() {
  const el = document.getElementById('question-display');
  if (el && window.renderMathInElement) {
    renderMathInElement(el, {
      delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}

// ... (ส่วนที่เหลือของโค้ดคุณถูกต้องสมบูรณ์แล้ว) ...

function initMathObserver() {
    const target = document.getElementById('content-test');
    if (!target) return;

    // ระบบตรวจจับการเปลี่ยนแปลงข้อความ ถ้ามีการเปลี่ยนโจทย์จะสั่ง Render ใหม่ทันที
    const observer = new MutationObserver(() => {
        renderMath();
    });

    observer.observe(target, { childList: true, subtree: true, characterData: true });
}

// ==========================================
// ⚙️ เริ่มต้นแอป
// ==========================================

document.addEventListener('DOMContentLoaded', async () => { 
    initMathObserver(); // เปิดระบบตรวจจับการเปลี่ยนโจทย์
    await checkAuth(); 
    setupEventListeners(); 
});

// ==========================================
// 📊 การจัดการผู้ใช้และสถิติ
// ==========================================

async function checkAuth() { 
    currentUser = await getCurrentUser(); 
    if (currentUser) { 
        await checkRoleAndRedirect(); 
        await fetchRealUserGrade(); 
        showApp(); 
    } else { 
        showLogin(); 
    } 
}

async function fetchRealUserGrade() {
    if (!currentUser) return;
    const studentIdFromEmail = currentUser.email.split('@')[0];
    const { data } = await supabase.from('students').select('grade').eq('student_id', studentIdFromEmail).single();
    if (data && data.grade) userRealGrade = data.grade;
}

async function checkRoleAndRedirect() { 
    const { data: admins } = await supabase.from('app_admins').select('email').eq('email', currentUser.email); 
    if (admins && admins.length > 0) { window.location.href = 'admin.html'; } 
}

function showLogin() { document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('main-app').classList.add('hidden'); }

function showApp() { 
    document.getElementById('login-screen').classList.add('hidden'); 
    document.getElementById('main-app').classList.remove('hidden'); 
    updateUserDisplay(); 
    renderLessonLibrary(); 
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
        const errDiv = document.getElementById('login-error');
        errDiv.textContent = "ID หรือรหัสผ่านไม่ถูกต้อง"; errDiv.classList.remove('hidden'); 
    } else { checkAuth(); } 
}

async function handleLogout() { await logout(); currentUser = null; showLogin(); }

function startTimer() { let s = 0; clearInterval(timerInterval); timerInterval = setInterval(() => { s++; const m = Math.floor(s/60); const sec = s%60; const el = document.getElementById('timer'); if(el) el.textContent = `${m}:${sec.toString().padStart(2, '0')}`; }, 1000); }

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

function renderLessonLibrary() {
    const container = document.getElementById('chapter-list');
    if (!container || !currentUser) return;
    const chapters = curriculumData[userRealGrade]?.[currentSem] || [];
    container.innerHTML = ''; 
    chapters.forEach(chap => {
        const btn = document.createElement('div');
        btn.className = "w-full min-h-[64px] bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-800 rounded-xl px-4 py-2 cursor-pointer flex items-center justify-between group transition-all relative overflow-hidden mb-2";
        btn.onclick = () => window.startChapterTest(chap);
        btn.innerHTML = `<div class="flex-1 min-w-0 pr-3 relative z-10"><h4 class="font-bold text-slate-700 text-sm md:text-base truncate">${chap}</h4></div>`;
        container.appendChild(btn);
    });
}

function updateSemesterUI() {
    const activeClass = "rounded-md text-sm font-bold bg-slate-800 text-white shadow py-2 transition-all";
    const inactiveClass = "rounded-md text-sm font-bold text-slate-500 hover:bg-white/50 py-2 transition-all";
    const btn1 = document.getElementById('sem-btn-1');
    const btn2 = document.getElementById('sem-btn-2');
    if(btn1) btn1.className = currentSem === '1' ? activeClass : inactiveClass;
    if(btn2) btn2.className = currentSem === '2' ? activeClass : inactiveClass;
}

function updateUserDisplay() {
    const nameEl = document.getElementById('display-name');
    const gradeEl = document.getElementById('display-grade');
    const avatarEl = document.getElementById('user-avatar');
    if (currentUser) {
        const fullName = currentUser.user_metadata?.name || 'Scholar';
        const grade = formatGrade(userRealGrade || 'M.1');
        if(nameEl) nameEl.textContent = fullName;
        if(gradeEl) gradeEl.textContent = grade;
        if(avatarEl) {
            const seed = currentUser.email.split('@')[0]; 
            avatarEl.src = `https://api.dicebear.com/9.x/icons/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc,b6f4d1&backgroundType=solid&radius=50`;
        }
    }
}

async function loadHistoryData() {
    if(!currentUser) return;
    const { data: history } = await getTestHistory(currentUser.id);
    if (!history) return;
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
    const compScores = { numerical: [], algebraic: [], visual: [], data: [], logical: [], applied: [] };
    history.forEach(h => {
        const stats = h.competency_stats || {};
        Object.keys(compScores).forEach(k => { if (stats[k] > 0) compScores[k].push(stats[k]); });
    });
    drawSpiderChart({ numerical: avg(compScores.numerical), algebraic: avg(compScores.algebraic), visual: avg(compScores.visual), data: avg(compScores.data), logical: avg(compScores.logical), applied: avg(compScores.applied) });
    Object.keys(compScores).forEach(k => {
        const score = avg(compScores[k]);
        const bar = document.getElementById(`bar-${k}`);
        if(bar) bar.style.width = `${score}%`;
    });
    updateCenterStats(history);
}

function updateCenterStats(history) {
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
    const totalQuestions = history.reduce((sum, h) => sum + (h.correct_answers || 0), 0);
    document.getElementById('stat-total-mission').textContent = history.length;
    document.getElementById('stat-accuracy').textContent = `${avg(history.map(h=>h.score))}%`;
    document.getElementById('stat-questions').textContent = totalQuestions;
    const container = document.getElementById('center-stats-list');
    if(!container) return;
    container.innerHTML = '';
    const allChapters = curriculumData[userRealGrade]?.[currentSem] || [];
    const historyMap = {};
    history.forEach(h => {
        if(!historyMap[h.test_level]) historyMap[h.test_level] = { scores: [], count: 0 };
        historyMap[h.test_level].scores.push(h.score);
        historyMap[h.test_level].count++;
    });
    allChapters.forEach(chap => {
        const isPlayed = !!historyMap[chap];
        const percent = isPlayed ? avg(historyMap[chap].scores) : 0;
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm mb-2";
        item.innerHTML = `<div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-lg ${isPlayed ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'} flex items-center justify-center text-lg font-bold">${chap.substring(0,1)}</div><div class="min-w-0"><div class="font-bold text-slate-700 text-sm truncate">${chap}</div></div></div><div class="font-bold text-base px-3 py-1 rounded-lg ${isPlayed ? 'text-emerald-700 bg-emerald-100' : 'text-slate-300 bg-slate-50'}">${isPlayed ? percent + '%' : '-'}</div>`;
        container.appendChild(item);
    });
}