/**
 * Memory Card Game - Solution
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
 * Fisher-Yates 셔플 알고리즘으로 카드 배열 섞기
 */
function shuffleCards() {
  gameState.cards = [...cardEmojis];
  for (let i = gameState.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameState.cards[i], gameState.cards[j]] = [gameState.cards[j], gameState.cards[i]];
  }
}

/**
 * HTML에 카드 그리드를 렌더링
 */
function renderCards() {
  gameBoard.innerHTML = '';
  gameState.cards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.index = index;
    cardElement.innerHTML = '<span class="card-face">?</span>';

    cardElement.addEventListener('click', () => handleCardClick(cardElement, index));
    gameBoard.appendChild(cardElement);
  });
}

/**
 * 두 카드가 일치하는지 확인
 */
function cardsMatch(index1, index2) {
  return gameState.cards[index1] === gameState.cards[index2];
}

/**
 * 카드를 뒤집음
 */
function flipCard(card, index) {
  card.classList.add('flipped');
  const face = card.querySelector('.card-face');
  face.textContent = gameState.cards[index];
  gameState.flipped.push(index);

  // 두 장이 뒤집혀있으면 비교 시작
  if (gameState.flipped.length === 2) {
    checkMatch();
  }
}

/**
 * 카드를 다시 뒤집음
 */
function unflipCard(index) {
  const card = document.querySelector(`[data-index="${index}"]`);
  card.classList.remove('flipped');
  card.querySelector('.card-face').textContent = '?';
}

/**
 * 두 카드를 비교하고 결과 처리
 */
function checkMatch() {
  gameState.isChecking = true;
  const [index1, index2] = gameState.flipped;

  setTimeout(() => {
    if (cardsMatch(index1, index2)) {
      // 일치: matched 배열에 추가, 카드 비활성화
      gameState.matched.push(index1, index2);
      const cards = document.querySelectorAll('.card');
      cards[index1].classList.add('matched');
      cards[index2].classList.add('matched');
    } else {
      // 불일치: 카드 다시 뒤집기
      unflipCard(index1);
      unflipCard(index2);
    }

    gameState.moves++;
    gameState.flipped = [];
    gameState.isChecking = false;
    updateUI();

    // 모든 카드가 맞춰졌으면 게임 종료
    if (gameState.matched.length === 16) {
      showGameComplete();
    }
  }, 1000);
}

/**
 * 카드 클릭 처리
 */
function handleCardClick(card, index) {
  // 이미 뒤집혀있거나 비교 중이면 무시
  if (card.classList.contains('flipped') ||
      card.classList.contains('matched') ||
      gameState.isChecking) {
    return;
  }

  flipCard(card, index);
}

/**
 * UI 상태 업데이트
 */
function updateUI() {
  movesDisplay.textContent = gameState.moves;
  matchesDisplay.textContent = `${gameState.matched.length / 2}/8`;
}

/**
 * 게임 초기화
 */
function resetGame() {
  gameState.cards = [];
  gameState.flipped = [];
  gameState.matched = [];
  gameState.moves = 0;
  gameState.isChecking = false;

  shuffleCards();
  renderCards();
  updateUI();
}

/**
 * 게임 완료 메시지 표시
 */
function showGameComplete() {
  alert(`축하합니다! ${gameState.moves}번 시도에 모든 카드를 맞췄습니다.`);
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
  resetButton.addEventListener('click', resetGame);
  resetGame();
});
