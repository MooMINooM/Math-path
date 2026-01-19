import { supabase } from './config.js';

export class MathGame {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.mode = 'standard'; 
        this.startTime = null;
        this.isLoading = false;
        this.currentSemester = '1';
        this.skippedCount = 0;
        this.activeChapterName = null; // [NEW] ตัวแปรเก็บชื่อบทปัจจุบัน
        this.activeCompetency = null;  // [NEW] ตัวแปรเก็บชื่อทักษะปัจจุบัน
    }

    async start(mode, userGrade, specificCompetency = null, semester = '1', chapterName = null) {
        this.isLoading = true;
        this.mode = mode;
        this.currentSemester = semester;
        
        // [FIX] บันทึกชื่อบทและทักษะไว้ใช้ตอนจบเกม
        this.activeChapterName = chapterName;
        this.activeCompetency = specificCompetency;

        this.currentIndex = 0;
        this.correctCount = 0;
        this.skippedCount = 0;
        this.questions = [];
        this.startTime = Date.now();

        try {
            console.log(`Starting Game -> Mode: ${mode}, Grade: ${userGrade}, Sem: ${semester}, Chapter: ${chapterName || 'All'}`);
            
            let query = supabase
                .from('advanced_questions')
                .select('*')
                .eq('grade', userGrade)
                .eq('semester', semester);

            if (mode === 'chapter' && chapterName) {
                query = query.eq('chapter', chapterName);
            } 
            else if (mode === 'specific' && specificCompetency) {
                query = query.eq('competency', specificCompetency);
            } 

            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) {
                console.warn("No questions found.");
                this.questions = [];
                this.isLoading = false;
                return;
            }

            const formattedQuestions = data.map(q => ({
                id: q.id,
                questionText: q.question_text,
                mathExpression: q.math_expression,
                imageUrl: q.question_image_url,
                options: q.options,
                correctIndex: q.correct_option_index,
                competency: q.competency,
                chapter: q.chapter,
                level: q.level,
                userResult: null,
                userSkipped: false
            }));

            this.questions = this.shuffleArray(formattedQuestions).slice(0, 10);
            
        } catch (error) {
            console.error("Game Load Error:", error);
            alert("Error: " + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    checkAnswer(selectedIndex) {
        if (!this.questions[this.currentIndex]) return false;
        const currentQ = this.questions[this.currentIndex];
        const isCorrect = (selectedIndex === currentQ.correctIndex);
        currentQ.userResult = isCorrect;
        if (isCorrect) this.correctCount++;
        return isCorrect;
    }

    skipQuestion() {
         if (this.questions[this.currentIndex]) {
             this.questions[this.currentIndex].userSkipped = true;
             this.questions[this.currentIndex].userResult = false;
             this.skippedCount++;
         }
         return this.nextQuestion();
    }

    nextQuestion() {
        this.currentIndex++;
        return this.currentIndex < this.questions.length;
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    // [FIX] แก้ไขฟังก์ชันนี้ให้ส่งชื่อบทกลับไปบันทึก
    getScore() {
        const total = this.questions.length;
        const scorePercent = total === 0 ? 0 : (this.correctCount / total) * 100;
        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);

        // กำหนดชื่อที่จะบันทึกลง Database (test_level)
        let levelName = this.mode;
        
        if (this.mode === 'chapter' && this.activeChapterName) {
            // ถ้าเล่นโหมดบทเรียน ให้บันทึกชื่อบท (เช่น "จำนวนเต็ม")
            levelName = this.activeChapterName;
        } else if (this.mode === 'specific' && this.activeCompetency) {
            // ถ้าเล่นโหมดทักษะ ให้บันทึกชื่อทักษะ (เช่น "numerical")
            levelName = this.activeCompetency; 
        } 
        // ถ้าเป็น adaptive ก็ใช้ชื่อ 'adaptive' เหมือนเดิม

        const breakdown = { numerical: 0, algebraic: 0, visual: 0, data: 0, logical: 0, applied: 0 };
        this.questions.forEach(q => {
            if (q.userResult === true && breakdown.hasOwnProperty(q.competency)) {
                breakdown[q.competency]++; 
            }
        });

        return {
            score: scorePercent,
            correct: this.correctCount,
            total: total,
            skipped: this.skippedCount,
            timeSpent: timeSpent,
            level: levelName, // <--- ส่งค่าชื่อบทที่ถูกต้องกลับไป
            competencyStats: breakdown
        };
    }
}