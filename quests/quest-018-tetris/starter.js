/**
 * Tetris Game - Starter Code
 *
 * 요구사항:
 * 1. 10x20 보드, 7종 테트로미노
 * 2. 이동, 회전, 줄 제거
 * 3. 점수, 레벨, 다음 블록 미리보기
 */

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const nextCanvas = document.getElementById("next-canvas");
  const nextCtx = nextCanvas.getContext("2d");
  const scoreDisplay = document.getElementById("score");
  const levelDisplay = document.getElementById("level");
  const linesDisplay = document.getElementById("lines");
  const startBtn = document.getElementById("start-btn");

  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 24;
  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;
  nextCanvas.width = 4 * BLOCK_SIZE;
  nextCanvas.height = 4 * BLOCK_SIZE;

  // 7 Tetromino shapes (각 회전 상태)
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
  };

  const COLORS = {
    I: "#00f0f0", O: "#f0f000", T: "#a000f0",
    S: "#00f000", Z: "#f00000", J: "#0000f0", L: "#f0a000",
  };

  let board = [];
  let currentPiece = null;
  let nextPiece = null;
  let score = 0;
  let level = 1;
  let lines = 0;
  let gameLoop = null;
  let isGameOver = false;

  // TODO: 보드 초기화
  function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  // TODO: 랜덤 테트로미노 생성
  function randomPiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      shape: SHAPES[type].map(row => [...row]),
      type,
      x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
      y: 0,
    };
  }

  // TODO: 충돌 감지
  function isCollision(piece, offsetX = 0, offsetY = 0) {
    // piece의 각 블록 위치가 보드 범위 안이고 비어있는지 확인
    return false;
  }

  // TODO: 블록을 보드에 고정
  function lockPiece() {
    // 현재 블록의 위치를 보드에 기록
    // 완성된 줄 제거
    // 새 블록 생성
    // 게임 오버 체크
  }

  // TODO: 완성된 줄 제거
  function clearLines() {
    let cleared = 0;
    // 꽉 찬 줄 찾기 → 제거 → 위 줄 내리기
    // 점수 계산: 1줄=100, 2줄=300, 3줄=500, 4줄=800
    return cleared;
  }

  // TODO: 블록 회전
  function rotatePiece() {
    // 시계 방향 90도 회전 (행렬 전치 + 좌우 반전)
    // 벽 충돌 시 회전 취소
  }

  // TODO: 보드 그리기
  function drawBoard() {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 보드에 고정된 블록 그리기
    // 현재 이동 중인 블록 그리기
    // 그리드 라인 그리기
  }

  // TODO: 다음 블록 미리보기
  function drawNextPiece() {
    nextCtx.fillStyle = "#1e293b";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    // nextPiece 그리기
  }

  // TODO: 게임 루프
  function gameStep() {
    if (isGameOver) return;
    // 블록을 한 칸 아래로 이동
    // 충돌 시 고정
    drawBoard();
    drawNextPiece();
  }

  // TODO: 키보드 입력
  document.addEventListener("keydown", (e) => {
    if (isGameOver) return;
    switch (e.key) {
      case "ArrowLeft":  /* 왼쪽 이동 */ break;
      case "ArrowRight": /* 오른쪽 이동 */ break;
      case "ArrowDown":  /* 아래로 빠르게 */ break;
      case "ArrowUp":    /* 회전 */ break;
    }
    e.preventDefault();
    drawBoard();
  });

  // 게임 시작
  startBtn.addEventListener("click", () => {
    initBoard();
    score = 0; level = 1; lines = 0; isGameOver = false;
    scoreDisplay.textContent = "0";
    levelDisplay.textContent = "1";
    linesDisplay.textContent = "0";
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, 1000 / level);
    drawBoard();
    drawNextPiece();
  });
});
