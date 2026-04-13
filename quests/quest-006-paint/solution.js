/**
 * Drawing App - Complete Solution
 */

class DrawingApp {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.color = "#000000";
    this.brushSize = 5;
    this.strokes = [];

    this.colorPicker = document.getElementById("colorPicker");
    this.brushSizeInput = document.getElementById("brushSize");
    this.clearButton = document.getElementById("clearBtn");
    this.undoButton = document.getElementById("undoBtn");

    this.setupEventListeners();
    this.updateBrushSize();
  }

  setupEventListeners() {
    // 마우스 이벤트
    this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e));
    this.canvas.addEventListener("mousemove", (e) => this.draw(e));
    this.canvas.addEventListener("mouseup", () => this.stopDrawing());
    this.canvas.addEventListener("mouseout", () => this.stopDrawing());

    // 터치 이벤트 (모바일 지원)
    this.canvas.addEventListener("touchstart", (e) => this.handleTouchStart(e));
    this.canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e));
    this.canvas.addEventListener("touchend", () => this.stopDrawing());

    // 컨트롤 이벤트
    this.colorPicker.addEventListener("change", (e) => {
      this.color = e.target.value;
    });

    this.brushSizeInput.addEventListener("input", (e) => {
      this.brushSize = parseInt(e.target.value);
      this.updateBrushSize();
    });

    this.clearButton.addEventListener("click", () => this.clearCanvas());
    this.undoButton.addEventListener("click", () => this.undoDrawing());
  }

  startDrawing(e) {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;

    // 새로운 획 시작
    this.currentStroke = {
      color: this.color,
      size: this.brushSize,
      points: [{ x: this.lastX, y: this.lastY }]
    };
  }

  draw(e) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 현재 획에 점 추가
    if (this.currentStroke) {
      this.currentStroke.points.push({ x, y });
    }

    // 선 그리기
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.globalAlpha = 1.0;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  }

  stopDrawing() {
    if (this.isDrawing && this.currentStroke) {
      this.strokes.push(this.currentStroke);
    }
    this.isDrawing = false;
    this.currentStroke = null;
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.strokes = [];
  }

  undoDrawing() {
    if (this.strokes.length === 0) return;

    this.strokes.pop();

    // 캔버스 지우고 모든 획 다시 그리기
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.strokes.forEach(stroke => {
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.size;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";
      this.ctx.globalAlpha = 1.0;

      if (stroke.points.length > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
          this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        this.ctx.stroke();
      }
    });
  }

  updateBrushSize() {
    const sizeLabel = document.getElementById("brushSizeLabel");
    if (sizeLabel) {
      sizeLabel.textContent = `Brush Size: ${this.brushSize}px`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.drawingApp = new DrawingApp("canvas");
});
