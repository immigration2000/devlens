/**
 * Image Gallery - Starter Code
 *
 * 실제 이미지 대신 CSS 그래디언트 색상 박스를 사용합니다.
 */

document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const closeBtn = document.getElementById("close-btn");
  const playBtn = document.getElementById("play-btn");

  // 색상 그래디언트 데이터 (이미지 대체)
  const images = [
    { gradient: "linear-gradient(135deg, #667eea, #764ba2)", title: "Purple Dream" },
    { gradient: "linear-gradient(135deg, #f093fb, #f5576c)", title: "Pink Sunset" },
    { gradient: "linear-gradient(135deg, #4facfe, #00f2fe)", title: "Ocean Blue" },
    { gradient: "linear-gradient(135deg, #43e97b, #38f9d7)", title: "Fresh Green" },
    { gradient: "linear-gradient(135deg, #fa709a, #fee140)", title: "Warm Glow" },
    { gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)", title: "Lavender" },
    { gradient: "linear-gradient(135deg, #ffecd2, #fcb69f)", title: "Peach" },
    { gradient: "linear-gradient(135deg, #89f7fe, #66a6ff)", title: "Sky" },
    { gradient: "linear-gradient(135deg, #fddb92, #d1fdff)", title: "Sunrise" },
    { gradient: "linear-gradient(135deg, #c471f5, #fa71cd)", title: "Neon" },
  ];

  let currentIndex = 0;
  let slideshowInterval = null;
  let isPlaying = false;

  // TODO: 갤러리 그리드 생성
  function renderGallery() {
    gallery.innerHTML = "";
    images.forEach((img, index) => {
      const thumb = document.createElement("div");
      thumb.className = "thumbnail";
      thumb.style.background = img.gradient;
      thumb.dataset.index = index;
      // TODO: 클릭 이벤트 → 라이트박스 열기
      gallery.appendChild(thumb);
    });
  }

  // TODO: 라이트박스 열기
  function openLightbox(index) {
    currentIndex = index;
    // lightbox 표시
    // 현재 이미지 표시
    // 카운터 업데이트
  }

  // TODO: 라이트박스 닫기
  function closeLightbox() {
    // lightbox 숨기기
    // 슬라이드쇼 정지
  }

  // TODO: 이전/다음 이미지
  function showPrev() {
    // 순환: 첫 번째 → 마지막
  }

  function showNext() {
    // 순환: 마지막 → 첫 번째
  }

  // TODO: 현재 이미지 업데이트
  function updateLightboxDisplay() {
    // lightboxImage 배경 그래디언트 설정
    // 카운터 텍스트 업데이트 (currentIndex + 1) / total
  }

  // TODO: 슬라이드쇼 토글
  function toggleSlideshow() {
    if (isPlaying) {
      clearInterval(slideshowInterval);
      isPlaying = false;
    } else {
      slideshowInterval = setInterval(showNext, 3000);
      isPlaying = true;
    }
    // 버튼 텍스트 업데이트
  }

  // TODO: 이벤트 리스너
  prevBtn.addEventListener("click", showPrev);
  nextBtn.addEventListener("click", showNext);
  closeBtn.addEventListener("click", closeLightbox);
  playBtn.addEventListener("click", toggleSlideshow);

  // TODO: 키보드 이벤트 (ArrowLeft, ArrowRight, Escape)
  document.addEventListener("keydown", (e) => {
    if (lightbox.style.display !== "flex") return;
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
    if (e.key === "Escape") closeLightbox();
  });

  // 초기 렌더링
  renderGallery();
});
