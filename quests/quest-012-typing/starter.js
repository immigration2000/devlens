/**
 * Typing Game - Starter Code
 *
 * 요구사항:
 * 1. 랜덤 문장 표시
 * 2. 실시간 타이핑 검증 (맞으면 초록, 틀리면 빨강)
 * 3. WPM 및 정확도 계산
 * 4. 타이머 자동 시작/정지
 */

document.addEventListener("DOMContentLoaded", () => {
  const sentenceDisplay = document.getElementById("sentence-display");
  const inputField = document.getElementById("input-field");
  const timerDisplay = document.getElementById("timer");
  const wpmDisplay = document.getElementById("wpm");
  const accuracyDisplay = document.getElementById("accuracy");
  const restartBtn = document.getElementById("restart-btn");
  const resultPanel = document.getElementById("result-panel");

  const sentences = [
    "The quick brown fox jumps over the lazy dog",
    "JavaScript is a versatile programming language",
    "Practice makes perfect when learning to code",
    "Web development combines creativity and logic",
    "Every expert was once a beginner at coding",
    "Clean code is simple and direct",
    "First solve the problem then write the code",
    "Code is like humor if you have to explain it",
  ];

  let currentSentence = "";
  let startTime = null;
  let timerInterval = null;
  let isFinished = false;

  // TODO: 랜덤 문장 선택 및 표시
  function initGame() {
    // sentences 배열에서 랜덤 선택
    // sentenceDisplay에 글자별로 <span> 태그로 표시
    // 입력 필드 초기화
    // 타이머 초기화
    // 결과 패널 숨기기
  }

  // TODO: 타이핑 입력 처리
  inputField.addEventListener("input", () => {
    if (!startTime) {
      // 첫 타이핑 시 타이머 시작
    }

    const typed = inputField.value;
    const spans = sentenceDisplay.querySelectorAll("span");

    // 각 글자별로 맞음/틀림 비교하여 클래스 적용
    // 모든 글자를 올바르게 입력하면 게임 종료
  });

  // TODO: 타이머 업데이트
  function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timerDisplay.textContent = elapsed + "s";
    }, 1000);
  }

  // TODO: 게임 종료 및 결과 계산
  function finishGame() {
    clearInterval(timerInterval);
    isFinished = true;
    inputField.disabled = true;

    // WPM 계산: (글자수 / 5) / (시간(분))
    // 정확도 계산: (맞은 글자 수 / 전체 글자 수) * 100
    // 결과 패널에 표시
  }

  // TODO: 다시 시작
  restartBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    startTime = null;
    isFinished = false;
    inputField.disabled = false;
    initGame();
  });

  // 초기화
  initGame();
});
