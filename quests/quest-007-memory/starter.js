/**
 * Memory Card Game - Starter
 *
 * TODO: 이 파일을 완성하세요.
 * 아래 주석에 표시된 부분들을 구현해야 합니다.
 */

// 게임 상태 관리
const gameState = {
  cards: [],
  flipped: [],
  matched: [],
  moves: 0,
  isChecking: false
};

// 카드 데이터 (이모지로 8쌍 표현)
const cardEmojis = ['🎮', '🎮', '🎯', '🎯', '🎨', '🎨', '🎭', '🎭',
                    '🎪', '🎪', '🎬', '🎬', '🎸', '🎸', '🎺', '🎺'];

// DOM 요소
const gameBoard = document.getElementById('game-board');
const movesDisplay = document.getElementById('moves');
const matchesDisplay = document.getElementById('matches');
const resetButton = document.getElementById('reset-btn');

/**
 * TODO: cardEmojis 배열을 섞어서 gameState.cards에 저장하는 함수
 * Fisher-Yates shuffle 알고리즘 사용 권장
 */
function shuffleCards() {
  // TODO: 구현해주세요
}

/**
 * TODO: HTML에 카드 그리드를 렌더링하는 함수
 * - gameBoard 내에 16개의 카드 요소 생성
 * - 각 카드에 data-index 속성 추가
 * - 각 카드에 click 이벤트 리스너 추가
 */
function renderCards() {
  // TODO: 구현해주세요
}

/**
 * TODO: 두 카드가 일치하는지 확인하는 함수
 * @param {number} index1 - 첫 번째 카드 인덱스
 * @param {number} index2 - 두 번째 카드 인덱스
 * @returns {boolean} 일치 여부
 */
function cardsMatch(index1, index2) {
  // TODO: 구현해주세요
}

/**
 * TODO: 카드를 뒤집으면서 애니메이션을 보여주는 함수
 * @param {HTMLElement} card - 카드 DOM 요소
 * @param {number} index - 카드 인덱스
 */
function flipCard(card, index) {
  // TODO: 구현해주세요
  // - 카드 뒤집기 애니메이션 (CSS 클래스 추가)
  // - 카드에 이모지 표시
  // - gameState.flipped에 인덱스 추가
  // - 두 장이 뒤집혀있으면 checkMatch() 호출
}

/**
 * TODO: 두 카드를 비교하고 결과에 따라 처리하는 함수
 */
function checkMatch() {
  // TODO: 구현해주세요
  // - gameState.isChecking을 true로 설정
  // - 1초 대기
  // - cardsMatch() 호출해서 일치 확인
  // - 일치하면: matched 배열에 추가, 카드 비활성화
  // - 불일치하면: 카드 다시 뒤집기
  // - moves 증가
  // - 모든 카드가 matched되면 게임 종료 메시지
}

/**
 * TODO: UI 상태 업데이트 함수
 */
function updateUI() {
  // TODO: 구현해주세요
  // - movesDisplay에 gameState.moves 표시
  // - matchesDisplay에 gameState.matched.length + '/8' 표시
}

/**
 * TODO: 게임 초기화 함수
 */
function resetGame() {
  // TODO: 구현해주세요
  // - gameState 초기화
  // - shuffleCards() 호출
  // - renderCards() 호출
  // - updateUI() 호출
}

/**
 * TODO: 게임 완료 메시지 표시 함수
 */
function showGameComplete() {
  // TODO: 구현해주세요
  // alert나 모달 등으로 "완료!" 메시지 표시
  // 예: "축하합니다! 9번 시도에 모든 카드를 맞췄습니다."
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
  resetButton.addEventListener('click', resetGame);
  resetGame();
});
