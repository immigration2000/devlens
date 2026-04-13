/**
 * Quiz App - Starter Code
 *
 * 요구사항:
 * 1. loadQuestion() - 현재 문제 로드 및 표시
 * 2. selectAnswer(answer) - 사용자의 답변 처리
 * 3. nextQuestion() - 다음 문제로 진행
 * 4. startTimer() - 30초 타이머 시작
 * 5. endQuiz() - 퀴즈 종료, 최종 점수 표시
 */

class QuizApp {
  constructor() {
    this.questions = [
      {
        question: "HTML의 의미는?",
        options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup", "Highly Technical Meta Language"],
        correct: 0
      },
      {
        question: "CSS는 무엇을 담당하는가?",
        options: ["구조", "스타일", "상호작용", "데이터"],
        correct: 1
      },
      {
        question: "JavaScript의 주요 용도는?",
        options: ["웹 디자인", "웹 상호작용", "데이터 저장", "네트워크 통신"],
        correct: 1
      },
      {
        question: "DOM은 무엇인가?",
        options: ["Data Object Model", "Document Object Model", "Digital Online Module", "Dynamic Operating Memory"],
        correct: 1
      },
      {
        question: "fetch API는 무엇인가?",
        options: ["파일 가져오기", "HTTP 요청", "데이터 처리", "배열 메서드"],
        correct: 1
      }
    ];

    this.currentQuestionIndex = 0;
    this.score = 0;
    this.timeLeft = 30;
    this.timerInterval = null;
    this.answered = false;

    this.questionElement = document.getElementById("question");
    this.optionsContainer = document.getElementById("options");
    this.progressElement = document.getElementById("progress");
    this.timerElement = document.getElementById("timer");
    this.resultContainer = document.getElementById("result");
    this.quizContainer = document.getElementById("quiz");
    this.restartButton = document.getElementById("restart");

    this.restartButton.addEventListener("click", () => this.restart());
    this.loadQuestion();
  }

  loadQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.endQuiz();
      return;
    }

    const question = this.questions[this.currentQuestionIndex];
    this.answered = false;
    this.timeLeft = 30;

    // 문제 표시
    this.questionElement.textContent = question.question;

    // 선택지 표시
    this.optionsContainer.innerHTML = "";
    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.textContent = option;
      button.className = "option-btn";
      button.addEventListener("click", () => this.selectAnswer(index));
      this.optionsContainer.appendChild(button);
    });

    // 진행 상황 표시
    this.progressElement.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;

    // 타이머 시작
    this.startTimer();
  }

  selectAnswer(selectedIndex) {
    if (this.answered) return;

    this.answered = true;
    clearInterval(this.timerInterval);

    const question = this.questions[this.currentQuestionIndex];
    const buttons = this.optionsContainer.querySelectorAll("button");

    if (selectedIndex === question.correct) {
      this.score++;
      buttons[selectedIndex].classList.add("correct");
    } else {
      buttons[selectedIndex].classList.add("incorrect");
      buttons[question.correct].classList.add("correct");
    }

    // 다음 문제로 2초 후 자동 진행
    setTimeout(() => this.nextQuestion(), 2000);
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.loadQuestion();
  }

  startTimer() {
    this.timerElement.textContent = this.timeLeft;

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.timerElement.textContent = this.timeLeft;

      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        if (!this.answered) {
          this.answered = true;
          const buttons = this.optionsContainer.querySelectorAll("button");
          const question = this.questions[this.currentQuestionIndex];
          buttons[question.correct].classList.add("correct");
          setTimeout(() => this.nextQuestion(), 2000);
        }
      }
    }, 1000);
  }

  endQuiz() {
    this.quizContainer.style.display = "none";
    this.resultContainer.style.display = "block";

    const percentage = Math.round((this.score / this.questions.length) * 100);
    document.getElementById("finalScore").textContent = `${this.score}/${this.questions.length}`;
    document.getElementById("percentage").textContent = `${percentage}%`;
  }

  restart() {
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.timeLeft = 30;
    this.answered = false;
    this.quizContainer.style.display = "block";
    this.resultContainer.style.display = "none";
    this.loadQuestion();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new QuizApp();
});
