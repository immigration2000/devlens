/**
 * Markdown Viewer - Starter Code
 *
 * 요구사항:
 * 1. parseMarkdown(text) - 마크다운을 HTML로 변환
 * 2. 실시간 미리보기 업데이트
 * 3. 지원 문법: 제목, 굵게, 기울임, 코드, 목록, 인용, 구분선, 링크
 */

document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("md-editor");
  const preview = document.getElementById("md-preview");

  const defaultMarkdown = `# Hello Markdown!

This is a **markdown** viewer built with *JavaScript*.

## Features

- Real-time preview
- **Bold** and *italic* text
- \`Inline code\` support
- Links like [Google](https://google.com)

> This is a blockquote.
> It can span multiple lines.

---

### Code Example

Write your markdown on the left and see the preview on the right!`;

  // TODO: 마크다운 파서 구현
  function parseMarkdown(text) {
    let html = text;

    // TODO: ### h3 제목 변환
    // TODO: ## h2 제목 변환
    // TODO: # h1 제목 변환
    // TODO: **굵게** 변환
    // TODO: *기울임* 변환
    // TODO: `코드` 변환
    // TODO: --- 구분선 변환
    // TODO: > 인용 변환
    // TODO: - 목록 변환
    // TODO: [텍스트](url) 링크 변환
    // TODO: 줄바꿈 처리

    return html;
  }

  // TODO: 실시간 미리보기 업데이트
  function updatePreview() {
    const markdown = editor.value;
    const html = parseMarkdown(markdown);
    preview.innerHTML = html;
  }

  // TODO: 입력 이벤트 리스너
  editor.addEventListener("input", updatePreview);

  // 초기 텍스트 설정 및 미리보기
  editor.value = defaultMarkdown;
  updatePreview();
});
