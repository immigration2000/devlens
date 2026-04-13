/**
 * Snake Game - Starter Code
 *
 * 요구사항:
 * 1. gameLoop() - 매 100ms마다 게임 상태 업데이트
 * 2. update() - 뱀 위치 업데이트, 충돌 감지
 * 3. checkCollisions() - 벽, 자신과의 충돌 확인
 * 4. eatFood() - 음식 섭취 처리
 * 5. draw() - 게임 상태를 캔버스에 그리기
 */

class SnakeGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.gridSize = 20;
    this.cellSize = this.canvas.width / this.gridSize;
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.food = this.generateFood();
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.gameOver = false;
    this.isPaused = false;

    this.setupControls();
    this.startGame();
  }

  setupControls() {
    document.addEventListener("keydown", (e) => {
      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
          if (this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
          break;
        case "arrowdown":
        case "s":
          if (this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
          break;
        case "arrowleft":
        case "a":
          if (this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
          break;
        case "arrowright":
        case "d":
          if (this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
          break;
        case " ":
          this.isPaused = !this.isPaused;
          break;
      }
    });
  }

  startGame() {
    this.gameLoop();
  }

  gameLoop() {
    if (!this.isPaused && !this.gameOver) {
      this.update();
    }
    this.draw();
    setTimeout(() => this.gameLoop(), 100);
  }

  update() {
    this.direction = this.nextDirection;

    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };

    this.snake.unshift(newHead);

    if (!this.eatFood()) {
      this.snake.pop();
    }

    this.checkCollisions();
  }

  checkCollisions() {
    const head = this.snake[0];

    // 벽과 충돌
    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      this.gameOver = true;
      return;
    }

    // 자신과 충돌
    for (let i = 1; i < this.snake.length; i++) {
      if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
        this.gameOver = true;
        return;
      }
    }
  }

  eatFood() {
    const head = this.snake[0];
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.food = this.generateFood();
      return true;
    }
    return false;
  }

  generateFood() {
    let food;
    do {
      food = {
        x: Math.floor(Math.random() * this.gridSize),
        y: Math.floor(Math.random() * this.gridSize)
      };
    } while (this.snake.some(seg => seg.x === food.x && seg.y === food.y));
    return food;
  }

  draw() {
    // 배경
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 격자
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i <= this.gridSize; i++) {
      const pos = i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, this.canvas.height);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(this.canvas.width, pos);
      this.ctx.stroke();
    }

    // 뱀 그리기
    this.ctx.fillStyle = "#00ff00";
    this.snake.forEach((seg, index) => {
      const x = seg.x * this.cellSize;
      const y = seg.y * this.cellSize;
      this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
    });

    // 음식 그리기
    this.ctx.fillStyle = "#ff0000";
    const fx = this.food.x * this.cellSize;
    const fy = this.food.y * this.cellSize;
    this.ctx.fillRect(fx + 1, fy + 1, this.cellSize - 2, this.cellSize - 2);

    // 점수 표시
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`Score: ${this.score}`, 10, 30);

    if (this.gameOver) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = "#ff0000";
      this.ctx.font = "bold 40px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
    }

    if (this.isPaused && !this.gameOver) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = "#ffff00";
      this.ctx.font = "bold 40px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new SnakeGame("gameCanvas");
});
