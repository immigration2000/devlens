/**
 * Todo List App - Starter Code
 *
 * 요구사항:
 * 1. addTodo() - 입력 필드의 값으로 새 할일 추가
 * 2. removeTodo(id) - 주어진 id의 할일 제거
 * 3. toggleComplete(id) - 주어진 id의 할일 완료 상태 토글
 * 4. renderTodos() - 현재 할일 목록을 DOM에 렌더링
 * 5. 입력 필드가 비어있으면 추가 버튼 비활성화
 */

class TodoApp {
  constructor() {
    this.todos = [
      { id: 1, text: "HTML 학습하기", completed: false },
      { id: 2, text: "CSS 학습하기", completed: false },
      { id: 3, text: "JavaScript 학습하기", completed: false }
    ];
    this.nextId = 4;

    this.inputElement = document.getElementById("todoInput");
    this.addButton = document.getElementById("addButton");
    this.todoList = document.getElementById("todoList");

    // 초기 렌더링
    this.renderTodos();

    // 이벤트 리스너
    this.addButton.addEventListener("click", () => this.addTodo());
    this.inputElement.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addTodo();
    });
    this.inputElement.addEventListener("input", () => this.updateButtonState());
  }

  /**
   * 새로운 할일 추가
   */
  addTodo() {
    const text = this.inputElement.value.trim();
    if (!text) return;

    this.todos.push({
      id: this.nextId++,
      text: text,
      completed: false
    });

    this.inputElement.value = "";
    this.renderTodos();
    this.updateButtonState();
  }

  /**
   * 할일 제거
   */
  removeTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
    this.renderTodos();
  }

  /**
   * 할일 완료 상태 토글
   */
  toggleComplete(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.renderTodos();
    }
  }

  /**
   * DOM에 할일 목록 렌더링
   */
  renderTodos() {
    this.todoList.innerHTML = "";

    this.todos.forEach(todo => {
      const li = document.createElement("li");
      li.className = "todo-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.completed;
      checkbox.addEventListener("change", () => this.toggleComplete(todo.id));

      const span = document.createElement("span");
      span.textContent = todo.text;
      span.className = todo.completed ? "completed" : "";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "삭제";
      deleteBtn.className = "delete-btn";
      deleteBtn.addEventListener("click", () => this.removeTodo(todo.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      this.todoList.appendChild(li);
    });
  }

  /**
   * 입력 필드 상태에 따라 추가 버튼 활성화/비활성화
   */
  updateButtonState() {
    const hasText = this.inputElement.value.trim().length > 0;
    this.addButton.disabled = !hasText;
  }
}

// 앱 초기화
document.addEventListener("DOMContentLoaded", () => {
  new TodoApp();
});
