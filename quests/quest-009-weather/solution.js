/**
 * Weather App - Solution
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
    }, 500);
  });
}

/**
 * 에러 메시지 표시
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  weatherInfo.style.display = 'none';
}

/**
 * 에러 메시지 숨기기
 */
function hideError() {
  errorMessage.style.display = 'none';
}

/**
 * 로딩 상태 표시
 */
function showLoading() {
  appState.isLoading = true;
  loadingSpinner.style.display = 'block';
  weatherInfo.style.display = 'none';
  errorMessage.style.display = 'none';
}

/**
 * 로딩 상태 숨기기
 */
function hideLoading() {
  appState.isLoading = false;
  loadingSpinner.style.display = 'none';
}

/**
 * 날씨 정보 표시
 */
function displayWeather(city, weather) {
  const { temp, status, humidity } = weather;
  weatherInfo.innerHTML = `
    <div class="weather-card">
      <h2>${city}</h2>
      <p class="temp">${temp}°C</p>
      <p class="status">${status}</p>
      <p class="humidity">Humidity: ${humidity}%</p>
    </div>
  `;
  weatherInfo.style.display = 'block';
  hideError();
}

/**
 * 검색 기록 추가
 */
function addToHistory(city) {
  // 이미 있으면 제거 (중복 방지)
  const index = appState.searchHistory.indexOf(city);
  if (index > -1) {
    appState.searchHistory.splice(index, 1);
  }

  // 앞에 추가
  appState.searchHistory.unshift(city);

  // 최대 5개만 유지
  if (appState.searchHistory.length > 5) {
    appState.searchHistory.pop();
  }

  updateHistoryList();
}

/**
 * 검색 기록 목록 업데이트
 */
function updateHistoryList() {
  historyList.innerHTML = '';
  appState.searchHistory.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => searchWeather(city));
    historyList.appendChild(li);
  });
}

/**
 * 검색 함수
 */
async function searchWeather(city) {
  // 입력값 검증
  const cityName = city.trim() || cityInput.value.trim();
  if (!cityName) {
    showError('Please enter a city name');
    return;
  }

  showLoading();

  try {
    const response = await fetchWeather(cityName);
    displayWeather(cityName, response.data);
    addToHistory(cityName);
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}

/**
 * 검색 버튼 클릭 핸들러
 */
function handleSearch() {
  searchWeather();
  cityInput.value = '';
}

/**
 * 엔터 키 입력 핸들러
 */
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    handleSearch();
  }
}

/**
 * 초기화 함수
 */
function initializeApp() {
  searchBtn.addEventListener('click', handleSearch);
  cityInput.addEventListener('keypress', handleKeyPress);
  updateHistoryList();
}

// 앱 시작
document.addEventListener('DOMContentLoaded', initializeApp);
