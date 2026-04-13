/**
 * Chat UI - Starter Code
 *
 * 요구사항:
 * 1. 메시지 전송/표시
 * 2. 봇 자동 응답
 * 3. 타이핑 인디케이터
 */

document.addEventListener("DOMContentLoaded", () => {
  const messageList = document.getElementById("message-list");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const typingIndicator = document.getElementById("typing-indicator");

  const botResponses = [
    "재미있는 이야기네요!",
    "정말요? 더 자세히 알려주세요.",
    "좋은 생각이에요!",
    "그렇군요, 흥미로워요.",
    "알겠습니다! 다른 질문 있으신가요?",
    "네, 동의합니다.",
    "재미있는 관점이네요!",
    "음... 생각해볼게요.",
  ];

  // TODO: 현재 시간 문자열 (HH:MM)
  function getTimeString() {
    const now = new Date();
    // 시:분 형식 반환
  }

  // TODO: 메시지 요소 생성
  function createMessageElement(text, isMine, time) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isMine ? "mine" : "theirs"}`;

    // TODO: 메시지 버블 + 시간 표시 구성
    // isMine이면 오른쪽 정렬, 아니면 왼쪽 정렬

    return msgDiv;
  }

  // TODO: 메시지 전송
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // 내 메시지 추가
    // 입력 필드 초기화
    // 스크롤 최하단으로
    // 봇 응답 예약
  }

  // TODO: 봇 응답
  function botReply() {
    // 타이핑 인디케이터 표시
    // 1초 후 랜덤 응답 메시지 추가
    // 타이핑 인디케이터 숨기기
    // 스크롤
  }

  // TODO: 자동 스크롤
  function scrollToBottom() {
    messageList.scrollTop = messageList.scrollHeight;
  }

  // TODO: 이벤트 리스너
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // 초기 환영 메시지
  const welcomeMsg = createMessageElement(
    "안녕하세요! 무엇이든 물어보세요 😊",
    false,
    getTimeString()
  );
  messageList.appendChild(welcomeMsg);
});
