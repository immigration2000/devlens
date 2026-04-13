/**
 * Stopwatch - Starter
 *
 * TODO: 이 파일을 완성하세요.
 * 아래 주석에 표시된 부분들을 구현해야 합니다.
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
 * TODO: 시간을 MM:SS.ms 형식의 문자열로 변환하는 함수
 * @param {number} milliseconds - 밀리초 단위 시간
 * @returns {string} 포맷된 시간 문자열 (예: "01:23.45")
 */
function formatTime(milliseconds) {
  // TODO: 구현해주세요
  // 분 = 밀리초 / 60000
  // 초 = (밀리초 % 60000) / 1000
  // 밀리초 = 밀리초 % 1000 / 10
  // 0으로 패딩해서 반환 (예: "01:23.45")
}

/**
 * TODO: 디스플레이 업데이트 함수
 */
function updateDisplay() {
  // TODO: 구현해주세요
  // timeDisplay.textContent에 현재 시간을 포맷된 형식으로 설정
}

/**
 * TODO: 스톱워치 시작 함수
 */
function startStopwatch() {
  // TODO: 구현해주세요
  // setInterval을 사용해서 10ms마다 elapsedTime 증가
  // intervalId에 저장
  // isRunning을 true로 설정
  // startStopBtn의 텍스트를 "Stop"으로 변경
}

/**
 * TODO: 스톱워치 정지 함수
 */
function stopStopwatch() {
  // TODO: 구현해주세요
  // clearInterval로 타이머 중지
  // isRunning을 false로 설정
  // startStopBtn의 텍스트를 "Start"로 변경
}

/**
 * TODO: 시작/정지 토글 버튼 핸들러
 */
function handleStartStop() {
  // TODO: 구현해주세요
  // isRunning이 false면 startStopwatch() 호출
  // isRunning이 true면 stopStopwatch() 호출
}

/**
 * TODO: 랩타임 기록 함수
 */
function recordLap() {
  // TODO: 구현해주세요
  // 현재 elapsedTime을 laps 배열에 추가
  // lapsList에 새로운 랩 항목 추가 (순서대로 표시)
  // 예: "Lap 1: 01:23.45"
}

/**
 * TODO: 랩 목록 업데이트 함수
 */
function updateLapsList() {
  // TODO: 구현해주세요
  // lapsList.innerHTML 초기화
  // laps 배열의 각 항목에 대해
  // "Lap N: MM:SS.ms" 형식으로 li 요소 생성
}

/**
 * TODO: 리셋 함수
 */
function resetStopwatch() {
  // TODO: 구현해주세요
  // stopStopwatch() 호출해서 타이머 중지
  // elapsedTime을 0으로 설정
  // laps 배열 비우기
  // lapsList 초기화
  // updateDisplay() 호출
  // startStopBtn의 텍스트를 "Start"로 설정
}

/**
 * TODO: 랩 버튼 활성화/비활성화 함수
 * 스톱워치가 실행 중일 때만 랩 버튼이 활성화되어야 함
 */
function updateLapButtonState() {
  // TODO: 구현해주세요
  // isRunning이 true면 lapBtn.disabled = false
  // isRunning이 false면 lapBtn.disabled = true
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
