/**
 * Weather App - Starter
 *
 * TODO: 이 파일을 완성하세요.
 * Mock API가 제공됩니다. fetchWeather()를 사용해서 데이터를 가져오세요.
 */

// Mock API 데이터
const weatherDatabase = {
  'Seoul': { temp: 15, status: 'Partly Cloudy', humidity: 65 },
  'Tokyo': { temp: 18, status: 'Sunny', humidity: 55 },
  'London': { temp: 10, status: 'Rainy', humidity: 80 },
  'Paris': { temp: 14, status: 'Cloudy', humidity: 70 },
  'NewYork': { temp: 12, status: 'Sunny', humidity: 60 }
};

// 앱 상태
const appState = {
  searchHistory: [],
  isLoading: false
};

// DOM 요소
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherInfo = document.getElementById('weather-info');
const errorMessage = document.getElementById('error-message');
const loadingSpinner = document.getElementById('loading-spinner');
const historyList = document.getElementById('history-list');

/**
 * Mock Fetch API
 * 도시 이름을 받아서 날씨 데이터를 반환합니다.
 * @param {string} city - 도시 이름
 * @returns {Promise<Object>} 날씨 데이터 또는 에러
 */
function fetchWeather(city) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const weather = weatherDatabase[city];
      if (weather) {
        resolve({ success: true, data: weather });
      } else {
        reject(new Error(`City "${city}" not found`));
      }
    }, 500); // 실제 네트워크 지연 시뮬레이션
  });
}

/**
 * TODO: 에러 메시지 표시 함수
 * @param {string} message - 에러 메시지
 */
function showError(message) {
  // TODO: 구현해주세요
  // errorMessage.textContent를 설정하고 표시
  // weatherInfo는 숨기기
}

/**
 * TODO: 에러 메시지 숨기는 함수
 */
function hideError() {
  // TODO: 구현해주세요
  // errorMessage를 숨기기
}

/**
 * TODO: 로딩 상태 표시 함수
 */
function showLoading() {
  // TODO: 구현해주세요
  // loadingSpinner를 표시
  // weatherInfo와 errorMessage는 숨기기
}

/**
 * TODO: 로딩 상태 숨기는 함수
 */
function hideLoading() {
  // TODO: 구현해주세요
  // loadingSpinner를 숨기기
}

/**
 * TODO: 날씨 정보 표시 함수
 * @param {string} city - 도시 이름
 * @param {Object} weather - 날씨 데이터 { temp, status, humidity }
 */
function displayWeather(city, weather) {
  // TODO: 구현해주세요
  // weatherInfo를 표시하고
  // 온도, 날씨 상태, 습도를 DOM에 업데이트
  // 예: "Seoul - 15°C, Partly Cloudy, Humidity: 65%"
  // hideError() 호출
}

/**
 * TODO: 검색 기록 추가 함수
 * @param {string} city - 도시 이름
 */
function addToHistory(city) {
  // TODO: 구현해주세요
  // 이미 기록에 있으면 제거 (중복 방지)
  // 앞에 추가
  // 최대 5개만 유지
  // updateHistoryList() 호출
}

/**
 * TODO: 검색 기록 목록 업데이트 함수
 */
function updateHistoryList() {
  // TODO: 구현해주세요
  // historyList.innerHTML 초기화
  // appState.searchHistory의 각 도시에 대해 li 요소 생성
  // 각 li에 click 이벤트 추가 (클릭하면 검색)
}

/**
 * TODO: 검색 함수 (async)
 * @param {string} city - 도시 이름
 */
async function searchWeather(city) {
  // TODO: 구현해주세요
  // 입력값 검증 (빈 문자열 체크)
  // showLoading() 호출
  // try-catch를 사용해서:
  //   - fetchWeather(city) 호출
  //   - displayWeather() 호출
  //   - addToHistory(city) 호출
  // catch에서:
  //   - showError() 호출
  // finally에서:
  //   - hideLoading() 호출
}

/**
 * TODO: 검색 버튼 클릭 핸들러
 */
function handleSearch() {
  // TODO: 구현해주세요
  // cityInput.value를 가져와서 searchWeather() 호출
  // 검색 후 입력 필드 초기화
}

/**
 * TODO: 엔터 키 입력 핸들러
 * 입력 필드에서 엔터를 눌렀을 때 검색
 */
function handleKeyPress(event) {
  // TODO: 구현해주세요
  // event.key === 'Enter'이면 handleSearch() 호출
}

/**
 * TODO: 초기화 함수
 */
function initializeApp() {
  // TODO: 구현해주세요
  // searchBtn에 click 이벤트 리스너 추가 (handleSearch)
  // cityInput에 keypress 이벤트 리스너 추가 (handleKeyPress)
  // updateHistoryList() 호출
}

// 앱 시작
document.addEventListener('DOMContentLoaded', initializeApp);
