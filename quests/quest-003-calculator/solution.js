/**
 * Simple Calculator - Complete Solution
 */

class Calculator {
  constructor() {
    this.display = document.getElementById("display");
    this.currentValue = "0";
    this.previousValue = null;
    this.operation = null;
    this.shouldResetDisplay = false;

    this.setupButtonListeners();
  }

  setupButtonListeners() {
    // 숫자 버튼
    document.querySelectorAll(".number-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        this.handleNumberClick(e.target.textContent);
      });
    });

    // 연산자 버튼
    document.querySelectorAll(".operator-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        this.handleOperatorClick(e.target.textContent);
      });
    });

    // 특수 버튼
    document.getElementById("equals").addEventListener("click", () => this.handleEquals());
    document.getElementById("clear").addEventListener("click", () => this.handleClear());

    this.updateDisplay();
  }

  handleNumberClick(num) {
    if (this.shouldResetDisplay) {
      this.currentValue = num;
      this.shouldResetDisplay = false;
    } else {
      this.currentValue = this.currentValue === "0" ? num : this.currentValue + num;
    }
    this.updateDisplay();
  }

  handleOperatorClick(op) {
    if (this.operation !== null) {
      this.handleEquals();
    }
    this.previousValue = parseFloat(this.currentValue);
    this.operation = op;
    this.shouldResetDisplay = true;
  }

  handleEquals() {
    if (this.operation === null || this.previousValue === null) return;

    const current = parseFloat(this.currentValue);
    let result;

    switch (this.operation) {
      case "+":
        result = this.previousValue + current;
        break;
      case "-":
        result = this.previousValue - current;
        break;
      case "*":
        result = this.previousValue * current;
        break;
      case "/":
        if (current === 0) {
          this.currentValue = "에러: 0으로 나눌 수 없음";
          this.operation = null;
          this.previousValue = null;
          this.updateDisplay();
          return;
        }
        result = this.previousValue / current;
        break;
      default:
        return;
    }

    this.currentValue = String(Math.round(result * 100000000) / 100000000);
    this.operation = null;
    this.previousValue = null;
    this.shouldResetDisplay = true;
    this.updateDisplay();
  }

  handleClear() {
    this.currentValue = "0";
    this.previousValue = null;
    this.operation = null;
    this.shouldResetDisplay = false;
    this.updateDisplay();
  }

  updateDisplay() {
    this.display.textContent = this.currentValue;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.calculator = new Calculator();
});
