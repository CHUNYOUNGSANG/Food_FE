/**
 * 로그인 페이지 로직
 */

import { login } from '../../services/auth-service.js';
import { validateEmail } from '../../utils/validator.js';

// DOM 요소
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');

/**
 * 초기화
 */
const init = () => {
  attachEventListeners();
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  loginForm.addEventListener('submit', handleLogin);

  // 입력 시 에러 메시지 숨김
  emailInput.addEventListener('input', hideError);
  passwordInput.addEventListener('input', hideError);
};

/**
 * 로그인 처리
 */
const handleLogin = async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // 유효성 검사
  if (!email || !password) {
    showError('이메일과 비밀번호를 모두 입력해주세요.');
    return;
  }

  if (!validateEmail(email)) {
    showError('올바른 이메일 형식이 아닙니다.');
    return;
  }

  try {
    // 버튼 비활성화
    loginBtn.disabled = true;
    loginBtn.textContent = '로그인 중...';

    // 🔥 실제 로그인 API 호출
    const userData = await login({
      email,
      password,
    });

    console.log('로그인 성공:', userData);

    // 성공 메시지
    alert(`환영합니다, ${userData.nickname}님!`);

    // 메인 페이지로 이동
    window.location.href = '/index.html';
  } catch (error) {
    console.error('로그인 실패:', error);

    // 에러 메시지 표시
    if (error.message) {
      showError(error.message);
    } else if (error.response?.message) {
      showError(error.response.message);
    } else {
      showError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    }
  } finally {
    // 버튼 활성화
    loginBtn.disabled = false;
    loginBtn.textContent = '로그인';
  }
};

/**
 * 에러 메시지 표시
 */
const showError = (message) => {
  errorMessage.textContent = message;
  errorMessage.style.display = 'flex';
};

/**
 * 에러 메시지 숨김
 */
const hideError = () => {
  errorMessage.style.display = 'none';
};

// 초기화 실행
init();
