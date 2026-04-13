// ========================================
// Quest: 비밀번호 생성기 만들기
// 아래 코드를 완성하세요!
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const passwordDisplay = document.getElementById("password-display");
  const generateBtn = document.getElementById("generate-btn");
  const copyBtn = document.getElementById("copy-btn");
  const lengthSlider = document.getElementById("length-slider");
  const lengthValue = document.getElementById("length-value");
  const strengthBar = document.getElementById("strength-bar");
  const strengthText = document.getElementById("strength-text");

  const uppercaseCheck = document.getElementById("uppercase");
  const lowercaseCheck = document.getElementById("lowercase");
  const numbersCheck = document.getElementById("numbers");
  const symbolsCheck = document.getElementById("symbols");

  const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
  const NUMBERS = "0123456789";
  const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // TODO: 슬라이더 변경 시 길이 표시 업데이트
  lengthSlider.addEventListener("input", () => {
    // lengthValue에 현재 슬라이더 값 표시
  });

  // TODO: generatePassword 함수 구현
  function generatePassword() {
    const length = parseInt(lengthSlider.value);
    let chars = "";

    // 선택된 옵션에 따라 문자 풀 구성
    // 최소 하나의 옵션은 선택되어야 함

    // 랜덤 비밀번호 생성

    // passwordDisplay에 비밀번호 표시

    // 강도 계산 및 표시
  }

  // TODO: 강도 계산 함수
  function calculateStrength(password) {
    // 길이, 문자 종류에 따라 "약함", "보통", "강함" 반환
    // strengthBar 너비와 색상 업데이트
    // strengthText에 텍스트 표시
  }

  // TODO: 복사 기능
  copyBtn.addEventListener("click", () => {
    // 클립보드에 비밀번호 복사
    // 복사 완료 피드백
  });

  // TODO: 생성 버튼 클릭 이벤트
  generateBtn.addEventListener("click", generatePassword);

  // 초기 비밀번호 생성
  generatePassword();
});
