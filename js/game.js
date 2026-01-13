// js/game.js
export class MathGame {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.level = 'easy';
        this.startTime = null;
    }

    start(level) {
        this.level = level;
        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.startTime = Date.now();
        
        for (let i = 0; i < 10; i++) {
            this.questions.push(this.generateQuestion(level));
        }
    }

    generateQuestion(level) {
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
        
        return { num1, num2, answer, options };
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
        return [correct, ...wrong].sort(() => Math.random() - 0.5);
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    checkAnswer(selectedAnswer) {
        const currentQ = this.questions[this.currentIndex];
        const isCorrect = selectedAnswer === currentQ.answer;
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
            score: (this.correctCount / this.questions.length) * 100,
            correct: this.correctCount,
            total: this.questions.length,
            timeSpent: timeSpent,
            level: this.level
        };
    }
}