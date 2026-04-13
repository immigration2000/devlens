// ========================================
// Quest: 카운터 앱 — 정답 코드 (RAG 참조용)
// ========================================

const display = document.getElementById("counter-display");
const increaseBtn = document.getElementById("btn-increase");
const decreaseBtn = document.getElementById("btn-decrease");
const resetBtn = document.getElementById("btn-reset");

let count = 0;

function updateDisplay() {
  display.textContent = count;
  display.style.color = count < 0 ? "#EF4444" : "#000000";
}

increaseBtn.addEventListener("click", () => {
  count++;
  updateDisplay();
});

decreaseBtn.addEventListener("click", () => {
  count--;
  updateDisplay();
});

resetBtn.addEventListener("click", () => {
  count = 0;
  updateDisplay();
});

updateDisplay();
