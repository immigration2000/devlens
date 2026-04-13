// ========================================
// Quest: 색상 피커 만들기
// 아래 코드를 완성하세요!
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("color-preview");
  const hexDisplay = document.getElementById("hex-value");
  const rgbDisplay = document.getElementById("rgb-value");
  const copyBtn = document.getElementById("copy-btn");
  const historyContainer = document.getElementById("color-history");

  const rSlider = document.getElementById("r-slider");
  const gSlider = document.getElementById("g-slider");
  const bSlider = document.getElementById("b-slider");
  const rValue = document.getElementById("r-value");
  const gValue = document.getElementById("g-value");
  const bValue = document.getElementById("b-value");

  let colorHistory = [];

  // TODO: RGB 값을 HEX 문자열로 변환
  function rgbToHex(r, g, b) {
    // 각 값을 16진수로 변환하고 2자리로 패딩
    // 예: rgbToHex(255, 0, 128) => "#FF0080"
  }

  // TODO: 색상 미리보기 업데이트
  function updateColor() {
    const r = parseInt(rSlider.value);
    const g = parseInt(gSlider.value);
    const b = parseInt(bSlider.value);

    // 슬라이더 옆 숫자 값 업데이트
    // 미리보기 영역 배경색 변경
    // HEX, RGB 텍스트 업데이트
  }

  // TODO: 히스토리에 현재 색상 추가 (최대 5개)
  function addToHistory() {
    const hex = hexDisplay.textContent;
    // 중복 방지
    // 최대 5개 유지
    // 히스토리 UI 렌더링
  }

  // TODO: 히스토리 UI 렌더링
  function renderHistory() {
    historyContainer.innerHTML = "";
    // 각 색상을 클릭 가능한 원형 요소로 표시
    // 클릭 시 해당 색상으로 슬라이더 복원
  }

  // TODO: 복사 기능
  copyBtn.addEventListener("click", () => {
    // HEX 값을 클립보드에 복사
  });

  // TODO: 슬라이더 이벤트 리스너
  rSlider.addEventListener("input", updateColor);
  gSlider.addEventListener("input", updateColor);
  bSlider.addEventListener("input", updateColor);

  // 슬라이더에서 손을 뗄 때 히스토리에 추가
  rSlider.addEventListener("change", addToHistory);
  gSlider.addEventListener("change", addToHistory);
  bSlider.addEventListener("change", addToHistory);

  // 초기 색상 설정
  updateColor();
});
