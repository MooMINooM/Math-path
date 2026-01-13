import { supabase } from './config.js';

export class MathGame {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.level = 'easy';
        this.startTime = null;
        this.isLoading = false;
    }

    // เปลี่ยนเป็น Async เพื่อรอโหลดข้อมูล
    async start(level) {
        this.isLoading = true;
        this.level = level;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.startTime = Date.now();
        this.questions = [];

        try {
            // 1. พยายามดึงโจทย์จาก Supabase ก่อน
            const dbQuestions = await this.fetchQuestionsFromDB(level);
            
            if (dbQuestions && dbQuestions.length > 0) {
                // ถ้ามีข้อมูลใน DB ให้ใช้ข้อมูลนั้น
                this.questions = this.shuffleArray(dbQuestions).slice(0, 10);
            } else {
                // 2. ถ้าไม่มีข้อมูลใน DB ให้ใช้ระบบสุ่มเลขแบบเดิม (Fallback)
                console.log("Using fallback generator");
                this.questions = this.generateFallbackQuestions(level);
            }
        } catch (error) {
            console.error("Error starting game:", error);
            this.questions = this.generateFallbackQuestions(level);
        } finally {
            this.isLoading = false;
        }
    }

    // ฟังก์ชันดึงข้อมูลจาก Supabase
    async fetchQuestionsFromDB(level) {
        // สมมติว่าตารางชื่อ 'advanced_questions' ตามที่คุยกัน
        const { data, error } = await supabase
            .from('advanced_questions')
            .select('*')
            .eq('level', level)
            .eq('is_active', true);

        if (error) {
            console.warn("Could not fetch from DB, using fallback:", error.message);
            return [];
        }

        // แปลงข้อมูลจาก DB ให้เข้ากับ Format ที่แอปใช้
        return data.map(q => ({
            id: q.id,
            type: 'db', // ระบุว่าเป็นโจทย์จาก DB
            questionText: q.question_text, // "จงหาค่าของ..."
            mathExpression: q.math_expression, // "x^2 + 2x + 1 = 0" (ถ้ามี)
            imageUrl: q.question_image_url, // รูปประกอบ (ถ้ามี)
            options: q.options, // Array ["x=1", "x=-1", ...]
            correctIndex: q.correct_option_index, // 0, 1, 2...
            explanation: q.explanation // คำอธิบายเฉลย
        }));
    }

    // ระบบสุ่มเลขเดิม (เก็บไว้เป็นอะไหล่สำรอง)
    generateFallbackQuestions(level) {
        const questions = [];
        for (let i = 0; i < 10; i++) {
            let num1, num2;
            if (level === 'easy') {
                num1 = Math.floor(Math.random() * 9) + 1;
                num2 = Math.floor(Math.random() * 9) + 1;
            } else if (level === 'medium') {
                num1 = Math.floor(Math.random() * 10) + 10;
                num2 = Math.floor(Math.random() * 10) + 1;
            } else {
                num1 = Math.floor(Math.random() * 30) + 20;
                num2 = Math.floor(Math.random() * 30) + 1;
            }

            const answer = num1 + num2;
            const options = this.generateOptions(answer);
            const correctIndex = options.indexOf(answer);

            questions.push({
                type: 'generated',
                questionText: `${num1} + ${num2} = ?`,
                mathExpression: null, // โจทย์เลขธรรมดาไม่ต้องใช้ LaTeX
                options: options,
                correctIndex: correctIndex,
                answerValue: answer // เก็บค่าจริงไว้เทียบ (เฉพาะโหมด generated)
            });
        }
        return questions;
    }

    generateOptions(correct) {
        const wrong = [];
        while (wrong.length < 3) {
            const offset = Math.floor(Math.random() * 6) - 3;
            const val = correct + offset;
            if (val !== correct && val > 0 && !wrong.includes(val)) {
                wrong.push(val);
            }
        }
        const options = [correct, ...wrong];
        return this.shuffleArray(options);
    }

    shuffleArray(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    // ตรวจคำตอบ (รับเป็น Index ของตัวเลือกที่ user กด)
    checkAnswer(selectedIndex, selectedValue) {
        const currentQ = this.questions[this.currentIndex];
        
        let isCorrect = false;

        if (currentQ.type === 'db') {
            // ถ้าเป็นโจทย์ DB เทียบจาก Index เฉลย
            isCorrect = (selectedIndex === currentQ.correctIndex);
        } else {
            // ถ้าเป็นโจทย์ Gen เทียบจากค่าตัวเลข
            // (หรือจะใช้ Logic เดียวกันก็ได้ถ้า Gen ส่ง index มาถูก)
            isCorrect = (parseInt(selectedValue) === currentQ.answerValue);
        }

        if (isCorrect) this.correctCount++;
        return isCorrect;
    }

    nextQuestion() {
        this.currentIndex++;
        return this.currentIndex < this.questions.length;
    }

    getScore() {
        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        return {
            score: this.questions.length > 0 ? (this.correctCount / this.questions.length) * 100 : 0,
            correct: this.correctCount,
            total: this.questions.length,
            timeSpent: timeSpent,
            level: this.level
        };
    }
}
