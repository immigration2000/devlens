/**
 * 2048 Game - Starter Code
 *
 * 요구사항:
 * 1. 4x4 보드 초기화 (2개 타일)
 * 2. 화살표 키로 이동 + 합치기
 * 3. 점수 계산
 * 4. 게임 오버 / 승리 감지
 */

document.addEventListener("DOMContentLoaded", () => {
  const boardElement = document.getElementById("game-board");
  const scoreDisplay = document.getElementById("score");
  const newGameBtn = document.getElementById("new-game-btn");
  const messageOverlay = document.getElementById("message-overlay");
  const messageText = document.getElementById("message-text");

  const SIZE = 4;
  let board = [];
  let score = 0;

  // TODO: 보드 초기화
  function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    scoreDisplay.textContent = "0";
    // 초기 타일 2개 추가
    addRandomTile();
    addRandomTile();
    renderBoard();
    messageOverlay.style.display = "none";
  }

  // TODO: 빈 칸에 랜덤 타일 추가 (90% 확률 2, 10% 확률 4)
  function addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return;

    // TODO: 랜덤 빈 칸 선택, 2 또는 4 배치
  }

  // TODO: 보드 렌더링
  function renderBoard() {
    boardElement.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        const value = board[r][c];
        if (value > 0) {
          cell.textContent = value;
          cell.dataset.value = value;
        }
        boardElement.appendChild(cell);
      }
    }
  }

  // TODO: 한 줄을 왼쪽으로 슬라이드 + 합치기
  function slideRow(row) {
    // 0이 아닌 값만 필터링
    // 같은 숫자가 인접하면 합치기 (점수 추가)
    // 나머지를 0으로 채우기
    // 변경 여부 반환
    return { newRow: row, changed: false };
  }

  // TODO: 방향에 따라 보드 이동
  function move(direction) {
    let moved = false;

    // direction: "left", "right", "up", "down"
    // 각 방향에 맞게 행/열을 slideRow로 처리
    // "right"은 행을 뒤집어서 slide 후 다시 뒤집기
    // "up"/"down"은 열을 추출해서 slide 후 다시 넣기

    if (moved) {
      addRandomTile();
      renderBoard();
      scoreDisplay.textContent = String(score);

      // 승리/게임오버 체크
      if (checkWin()) showMessage("You Win! 🎉");
      else if (checkGameOver()) showMessage("Game Over");
    }
  }

  // TODO: 승리 체크 (2048 타일 존재 여부)
  function checkWin() {
    return board.some(row => row.some(cell => cell >= 2048));
  }

  // TODO: 게임 오버 체크 (이동 불가)
  function checkGameOver() {
    // 빈 칸이 있으면 false
    // 인접한 같은 숫자가 있으면 false
    return false;
  }

  function showMessage(text) {
    messageText.textContent = text;
    messageOverlay.style.display = "flex";
  }

  // 키보드 이벤트
  document.addEventListener("keydown", (e) => {
    const keyMap = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    if (keyMap[e.key]) {
      e.preventDefault();
      move(keyMap[e.key]);
    }
  });

  newGameBtn.addEventListener("click", initBoard);

  // 게임 시작
  initBoard();
});
