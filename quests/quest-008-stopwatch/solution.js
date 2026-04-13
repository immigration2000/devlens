/**
 * Stopwatch - Solution
 */

// 스톱워치 상태
const stopwatch = {
  isRunning: false,
  elapsedTime: 0,      // 밀리초 단위
  intervalId: null,
  laps: []
};

// DOM 요소
const timeDisplay = document.getElementById('time-display');
const startStopBtn = document.getElementById('start-stop-btn');
const lapBtn = document.getElementById('lap-btn');
const resetBtn = document.getElementById('reset-btn');
const lapsList = document.getElementById('laps-list');

/**
 * 시간을 MM:SS.ms 형식의 문자열로 변환
 */
function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10);

  const padZero = (num) => String(num).padStart(2, '0');
  return `${padZero(minutes)}:${padZero(seconds)}.${padZero(ms)}`;
}

/**
 * 디스플레이 업데이트
 */
function updateDisplay() {
  timeDisplay.textContent = formatTime(stopwatch.elapsedTime);
}

/**
 * 스톱워치 시작
 */
function startStopwatch() {
  stopwatch.isRunning = true;
  stopwatch.intervalId = setInterval(() => {
    stopwatch.elapsedTime += 10;
    updateDisplay();
  }, 10);
  startStopBtn.textContent = 'Stop';
  updateLapButtonState();
}

/**
 * 스톱워치 정지
 */
function stopStopwatch() {
  stopwatch.isRunning = false;
  clearInterval(stopwatch.intervalId);
  startStopBtn.textContent = 'Start';
  updateLapButtonState();
}

/**
 * 시작/정지 토글 버튼 핸들러
 */
function handleStartStop() {
  if (stopwatch.isRunning) {
    stopStopwatch();
  } else {
    startStopwatch();
  }
}

/**
 * 랩타임 기록
 */
function recordLap() {
  stopwatch.laps.push(stopwatch.elapsedTime);
  updateLapsList();
}

/**
 * 랩 목록 업데이트
 */
function updateLapsList() {
  lapsList.innerHTML = '';
  stopwatch.laps.forEach((lapTime, index) => {
    const li = document.createElement('li');
    li.textContent = `Lap ${index + 1}: ${formatTime(lapTime)}`;
    lapsList.appendChild(li);
  });
}

/**
 * 리셋
 */
function resetStopwatch() {
  stopStopwatch();
  stopwatch.elapsedTime = 0;
  stopwatch.laps = [];
  lapsList.innerHTML = '';
  updateDisplay();
  startStopBtn.textContent = 'Start';
}

/**
 * 랩 버튼 활성화/비활성화
 */
function updateLapButtonState() {
  lapBtn.disabled = !stopwatch.isRunning;
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
  startStopBtn.addEventListener('click', handleStartStop);
  lapBtn.addEventListener('click', recordLap);
  resetBtn.addEventListener('click', resetStopwatch);

  // 초기 상태 설정
  lapBtn.disabled = true;
  updateDisplay();
});
