/**
 * Sorting Visualizer - Solution
 */

// 정렬 상태
const sortState = {
  array: [],
  isAnimating: false,
  comparing: [-1, -1],  // 비교 중인 인덱스
  sorted: []            // 정렬 완료된 인덱스
};

// Canvas 설정
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const ARRAY_SIZE = 20;
const BAR_WIDTH = canvas.width / ARRAY_SIZE;

// DOM 요소
const speedSlider = document.getElementById('speed-slider');
const sortBtn = document.getElementById('sort-btn');
const generateBtn = document.getElementById('generate-btn');

/**
 * 랜덤 배열 생성
 */
function generateRandomArray() {
  sortState.array = Array.from({ length: ARRAY_SIZE }, () =>
    Math.floor(Math.random() * 100) + 1
  );
  sortState.comparing = [-1, -1];
  sortState.sorted = [];
  draw();
}

/**
 * Canvas에 배열을 막대 그래프로 그리기
 */
function drawBars(array, comparing, sorted) {
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  array.forEach((value, index) => {
    const height = (value / 100) * canvas.height;
    const x = index * BAR_WIDTH;
    const y = canvas.height - height;

    // 색상 결정
    if (comparing.includes(index)) {
      ctx.fillStyle = '#ff4444'; // 비교 중: 빨강
    } else if (sorted.includes(index)) {
      ctx.fillStyle = '#44ff44'; // 정렬 완료: 초록
    } else {
      ctx.fillStyle = '#4444ff'; // 기본: 파랑
    }

    ctx.fillRect(x, y, BAR_WIDTH - 1, height);
  });
}

/**
 * 그리기 함수
 */
function draw() {
  drawBars(sortState.array, sortState.comparing, sortState.sorted);
}

/**
 * 배열의 두 요소를 교환 (애니메이션)
 */
async function swapWithAnimation(i, j) {
  sortState.comparing = [i, j];
  draw();

  await sleep(getDelay());

  // 실제 교환
  [sortState.array[i], sortState.array[j]] = [sortState.array[j], sortState.array[i]];
  draw();
}

/**
 * Sleep 헬퍼 함수
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 속도 슬라이더에 따른 지연 시간
 */
function getDelay() {
  const speed = parseInt(speedSlider.value);
  // speed: 1~100 -> delay: 200ms~10ms (빠를수록 작음)
  return (101 - speed) * 2;
}

/**
 * 버블소트 알고리즘
 */
async function bubbleSort() {
  sortState.isAnimating = true;
  const arr = sortState.array;
  const n = arr.length;

  for (let i = 0; i < n; i++) {
    // i번째 반복에서 마지막 i개 요소는 이미 정렬됨
    sortState.sorted.push(n - 1 - i);

    for (let j = 0; j < n - i - 1; j++) {
      sortState.comparing = [j, j + 1];
      draw();
      await sleep(getDelay());

      if (arr[j] > arr[j + 1]) {
        await swapWithAnimation(j, j + 1);
      }

      sortState.comparing = [-1, -1];
    }
  }

  // 모든 요소를 정렬 완료로 표시
  sortState.sorted = Array.from({ length: n }, (_, i) => i);
  sortState.isAnimating = false;
  draw();
}

/**
 * 정렬 버튼 핸들러
 */
function handleSort() {
  if (!sortState.isAnimating) {
    bubbleSort();
  }
}

/**
 * 생성 버튼 핸들러
 */
function handleGenerate() {
  if (!sortState.isAnimating) {
    generateRandomArray();
  }
}

/**
 * 초기화 함수
 */
function initializeVisualizer() {
  generateBtn.addEventListener('click', handleGenerate);
  sortBtn.addEventListener('click', handleSort);
  generateRandomArray();
}

// 시작
document.addEventListener('DOMContentLoaded', initializeVisualizer);
