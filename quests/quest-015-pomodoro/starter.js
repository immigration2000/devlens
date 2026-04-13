// ========================================
// Quest: 포모도로 타이머 만들기
// 아래 코드를 완성하세요!
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const timerDisplay = document.getElementById("timer-display");
  const modeDisplay = document.getElementById("mode-display");
  const startPauseBtn = document.getElementById("start-pause-btn");
  const resetBtn = document.getElementById("reset-btn");
  const pomodoroCount = document.getElementById("pomodoro-count");
  const timerCircle = document.getElementById("timer-circle");

  const WORK_TIME = 25 * 60; // 25 minutes in seconds
  const BREAK_TIME = 5 * 60; // 5 minutes in seconds

  let timeRemaining = WORK_TIME;
  let isRunning = false;
  let isWorkMode = true;
  let completedPomodoros = 0;
  let interval = null;

  // TODO: 타이머 표시 업데이트
  function updateDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    // MM:SS 형식으로 표시
    // timerDisplay.textContent = ...
  }

  // TODO: 시작/일시정지 토글
  startPauseBtn.addEventListener("click", () => {
    if (isRunning) {
      // 일시정지: interval 해제
      // 버튼 텍스트 변경
    } else {
      // 시작: interval 설정 (1초마다 카운트다운)
      // 버튼 텍스트 변경
    }
    isRunning = !isRunning;
  });

  // TODO: 타이머 틱 함수
  function tick() {
    timeRemaining--;
    updateDisplay();

    if (timeRemaining <= 0) {
      // 타이머 완료 처리
      // 작업 모드면 → 휴식 모드로 전환, 포모도로 카운트 증가
      // 휴식 모드면 → 작업 모드로 전환
      // 모드에 따라 배경색 변경
    }
  }

  // TODO: 모드 전환
  function switchMode() {
    isWorkMode = !isWorkMode;
    timeRemaining = isWorkMode ? WORK_TIME : BREAK_TIME;
    // modeDisplay 텍스트 업데이트
    // 배경색 변경 (timerCircle의 클래스)
    updateDisplay();
  }

  // TODO: 리셋
  resetBtn.addEventListener("click", () => {
    clearInterval(interval);
    isRunning = false;
    isWorkMode = true;
    timeRemaining = WORK_TIME;
    // 모든 표시 초기화
    updateDisplay();
  });

  // 초기 표시
  updateDisplay();
});
