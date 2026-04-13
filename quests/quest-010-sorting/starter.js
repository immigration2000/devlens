/**
 * Sorting Visualizer - Starter
 *
 * TODO: 이 파일을 완성하세요.
 * Canvas를 사용해서 배열을 막대 그래프로 표시하고 애니메이션합니다.
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
 * TODO: 랜덤 배열 생성 함수
 * 1부터 100 사이의 랜덤한 값으로 ARRAY_SIZE개의 배열 생성
 */
function generateRandomArray() {
  // TODO: 구현해주세요
  // sortState.array = [...];
  // sortState.comparing = [-1, -1];
  // sortState.sorted = [];
  // draw() 호출해서 화면 업데이트
}

/**
 * Canvas에 배열을 막대 그래프로 그리는 함수 (이미 제공됨)
 * @param {number[]} array - 배열
 * @param {number[]} comparing - 비교 중인 인덱스 [i, j]
 * @param {number[]} sorted - 정렬 완료된 인덱스
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
 * TODO: 그리기 함수
 */
function draw() {
  // TODO: 구현해주세요
  // drawBars(sortState.array, sortState.comparing, sortState.sorted) 호출
}

/**
 * TODO: 배열의 두 요소를 교환하는 함수 (애니메이션)
 * @param {number} i - 첫 번째 인덱스
 * @param {number} j - 두 번째 인덱스
 */
async function swapWithAnimation(i, j) {
  // TODO: 구현해주세요
  // - sortState.comparing을 [i, j]로 설정
  // - draw() 호출
  // - 속도 슬라이더에 따른 지연 (await sleep())
  // - 실제 교환: [sortState.array[i], sortState.array[j]] = [sortState.array[j], sortState.array[i]]
  // - draw() 호출
}

/**
 * TODO: sleep 헬퍼 함수 (async 지연용)
 * @param {number} ms - 밀리초
 */
function sleep(ms) {
  // TODO: 구현해주세요
  // return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TODO: 지연 시간을 속도 슬라이더에서 가져오는 함수
 * 슬라이더 값이 작을수록 빨라야 함
 * @returns {number} 밀리초 단위 지연
 */
function getDelay() {
  // TODO: 구현해주세요
  // speedSlider.value는 1~100 사이의 값
  // 역산해서 반환: 100 - speedSlider.value 또는 비슷한 로직
  // 예: 범위는 10ms ~ 200ms 정도
}

/**
 * TODO: 버블소트 알고리즘 (async)
 */
async function bubbleSort() {
  // TODO: 구현해주세요
  // sortState.isAnimating = true;
  // 중첩 for 루프로 버블소트 구현:
  //   for (let i = 0; i < array.length; i++) {
  //     sortState.sorted.push(array.length - 1 - i); // 완료된 요소
  //     for (let j = 0; j < array.length - i - 1; j++) {
  //       if (array[j] > array[j + 1]) {
  //         await swapWithAnimation(j, j + 1);
  //       } else {
  //         sortState.comparing = [j, j + 1];
  //         draw();
  //         await sleep(getDelay());
  //       }
  //       sortState.comparing = [-1, -1];
  //     }
  //   }
  // sortState.isAnimating = false;
  // draw(); // 최종 상태
}

/**
 * TODO: 정렬 버튼 핸들러
 */
function handleSort() {
  // TODO: 구현해주세요
  // isAnimating이 false이면 bubbleSort() 호출
  // 정렬 중에는 다시 클릭할 수 없도록 함
}

/**
 * TODO: 초기화 함수
 */
function initializeVisualizer() {
  // TODO: 구현해주세요
  // generateBtn에 click 이벤트 리스너 추가
  // sortBtn에 click 이벤트 리스너 추가
  // 초기 배열 생성 (generateRandomArray())
}

// 시작
document.addEventListener('DOMContentLoaded', initializeVisualizer);
