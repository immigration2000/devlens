/**
 * Kanban Board - Starter Code
 *
 * 요구사항:
 * 1. 카드 추가/삭제
 * 2. 드래그 앤 드롭으로 컬럼 간 이동
 * 3. 컬럼별 카드 수 업데이트
 */

document.addEventListener("DOMContentLoaded", () => {
  const columns = document.querySelectorAll(".kanban-column");
  const addCardBtn = document.getElementById("add-card-btn");
  const newCardInput = document.getElementById("new-card-input");

  let cardId = 0;

  const initialCards = [
    { title: "프로젝트 기획서 작성", column: "todo" },
    { title: "UI 디자인 시안", column: "in-progress" },
    { title: "환경 설정 완료", column: "done" },
  ];

  // TODO: 카드 생성 함수
  function createCard(title) {
    cardId++;
    const card = document.createElement("div");
    card.className = "kanban-card";
    card.draggable = true;
    card.id = `card-${cardId}`;

    // TODO: 카드 내용 구성 (제목 + 시간 + 삭제 버튼)
    // TODO: 드래그 이벤트 설정 (dragstart, dragend)

    return card;
  }

  // TODO: 카드를 컬럼에 추가
  function addCardToColumn(title, columnId) {
    const column = document.getElementById(columnId);
    const cardList = column.querySelector(".card-list");
    const card = createCard(title);
    cardList.appendChild(card);
    updateCounts();
  }

  // TODO: 컬럼별 카드 수 업데이트
  function updateCounts() {
    columns.forEach((col) => {
      const count = col.querySelectorAll(".kanban-card").length;
      col.querySelector(".count").textContent = count;
    });
  }

  // TODO: 드래그 앤 드롭 설정
  columns.forEach((column) => {
    const cardList = column.querySelector(".card-list");

    // dragover: 드롭 허용
    cardList.addEventListener("dragover", (e) => {
      e.preventDefault();
      // 드래그 오버 시각적 피드백
    });

    // dragleave: 피드백 제거
    cardList.addEventListener("dragleave", () => {
      // 시각적 피드백 제거
    });

    // drop: 카드 이동
    cardList.addEventListener("drop", (e) => {
      e.preventDefault();
      // 드래그된 카드를 이 컬럼으로 이동
      // 카드 수 업데이트
    });
  });

  // TODO: 새 카드 추가 버튼
  addCardBtn.addEventListener("click", () => {
    const title = newCardInput.value.trim();
    if (!title) return;
    addCardToColumn(title, "todo");
    newCardInput.value = "";
  });

  newCardInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addCardBtn.click();
  });

  // 초기 카드 추가
  initialCards.forEach((c) => addCardToColumn(c.title, c.column));
});
