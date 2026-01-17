// js/game.js
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

    async start(level, userGrade) {
        this.isLoading = true;
        this.level = level;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.questions = [];
        this.startTime = Date.now();

        try {
            console.log(`กำลังโหลดข้อสอบ Level: ${level}, Grade: ${userGrade}...`);
            
            if (!supabase) {
                throw new Error("ไม่พบการตั้งค่า Supabase กรุณาตรวจสอบไฟล์ config.js");
            }

            // [UPDATED] ดึงข้อมูล competency มาด้วย
            const { data, error } = await supabase
                .from('advanced_questions')
                .select('*, competency') 
                .eq('level', level)
                .eq('grade', userGrade);

            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                const formattedQuestions = data.map(q => ({
                    id: q.id,
                    questionText: q.question_text,
                    mathExpression: q.math_expression,
                    imageUrl: q.question_image_url,
                    options: q.options,
                    correctIndex: q.correct_option_index,
                    explanation: q.explanation,
                    competency: q.competency || 'numerical', // Default เป็น numerical ถ้าไม่มีข้อมูล
                    userResult: false // เตรียมตัวแปรไว้เก็บผลการตอบถูก/ผิดรายข้อ
                }));

                this.questions = this.shuffleArray(formattedQuestions).slice(0, 10);
                console.log(`โหลดข้อสอบสำเร็จ: ${this.questions.length} ข้อ`);
            } else {
                console.warn(`ไม่พบข้อสอบ Grade: ${userGrade}, Level: ${level}`);
            }

        } catch (error) {
            console.error("Critical Error:", error);
            alert("เกิดข้อผิดพลาดในการโหลดข้อสอบ:\n" + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    shuffleArray(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    checkAnswer(selectedIndex) {
        if (!this.questions[this.currentIndex]) return false;

        const currentQ = this.questions[this.currentIndex];
        const isCorrect = (selectedIndex === currentQ.correctIndex);

        // [UPDATED] บันทึกว่าข้อนี้ตอบถูกหรือผิดลงไปใน Object คำถามเลย
        currentQ.userResult = isCorrect;

        if (isCorrect) this.correctCount++;
        return isCorrect;
    }

    nextQuestion() {
        this.currentIndex++;
        return this.currentIndex < this.questions.length;
    }

    getScore() {
        // กรณีไม่มีข้อสอบ หรือเกิด Error
        if (this.questions.length === 0) {
            return { 
                score: 0, correct: 0, total: 0, timeSpent: 0, level: this.level, 
                competencyStats: { numerical: 0, algebraic: 0, visual: 0, data: 0, logical: 0, applied: 0 } 
            };
        }

        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        
        // [UPDATED] ส่วนคำนวณคะแนนแยกรายด้าน (6 Competencies)
        const breakdown = {
            numerical: { total: 0, correct: 0 },
            algebraic: { total: 0, correct: 0 },
            visual: { total: 0, correct: 0 },
            data: { total: 0, correct: 0 },
            logical: { total: 0, correct: 0 },
            applied: { total: 0, correct: 0 }
        };

        // วนลูปเช็คทุกข้อที่ระบบสุ่มมาให้ (10 ข้อ)
        this.questions.forEach(q => {
            // เช็ค key competency ถ้าไม่มี หรือสะกดผิด ให้ลง numerical ไว้ก่อนกัน Error
            const comp = (q.competency && breakdown[q.competency]) ? q.competency : 'numerical';
            
            breakdown[comp].total++;
            if (q.userResult) { // ถ้าตอบถูก
                breakdown[comp].correct++;
            }
        });

        // แปลงผลดิบเป็นเปอร์เซ็นต์ (0-100)
        const finalStats = {};
        for (const [key, val] of Object.entries(breakdown)) {
            finalStats[key] = val.total === 0 ? 0 : Math.round((val.correct / val.total) * 100);
        }

        return {
            score: (this.correctCount / this.questions.length) * 100,
            correct: this.correctCount,
            total: this.questions.length,
            timeSpent: timeSpent,
            level: this.level,
            competencyStats: finalStats // [IMPORTANT] ส่งค่านี้ออกไปให้ app.js บันทึก
        };
    }
}
