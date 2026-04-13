/**
 * Todo List App - Complete Solution
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
    this.updateButtonState();

    // 이벤트 리스너
    this.addButton.addEventListener("click", () => this.addTodo());
    this.inputElement.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addTodo();
    });
    this.inputElement.addEventListener("input", () => this.updateButtonState());
  }

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

  removeTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
    this.renderTodos();
  }

  toggleComplete(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.renderTodos();
    }
  }

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

  updateButtonState() {
    const hasText = this.inputElement.value.trim().length > 0;
    this.addButton.disabled = !hasText;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.todoApp = new TodoApp();
});
