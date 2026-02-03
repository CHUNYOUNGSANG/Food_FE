/**
 * 로그인 페이지 로직
 */

import { login } from '../../services/auth-service.js';
import { validateEmail, validatePassword } from '../../utils/validator.js';

// DOM 요소
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
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
  // 폼 제출
  loginForm.addEventListener('submit', handleSubmit);

  // 입력 시 에러 메시지 숨김
  emailInput.addEventListener('input', hideError);
  passwordInput.addEventListener('input', hideError);
};

/**
 * 폼 제출 처리
 */
const handleSubmit = async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // 유효성 검사
  if (!validateEmail(email)) {
    showError('올바른 이메일 형식이 아닙니다.');
    emailInput.focus();
    return;
  }

  if (!validatePassword(password)) {
    showError('비밀번호는 8자 이상이어야 합니다.');
    passwordInput.focus();
    return;
  }

  try {
    // 버튼 비활성화
    loginBtn.disabled = true;
    loginBtn.textContent = '로그인 중...';

    // 로그인 API 호출 (auth-service.js에서 자동으로 localStorage 저장)
    const response = await login({ email, password });

    console.log('로그인 성공:', response);

    // 로그인 성공 메시지
    alert(`${response.nickname}님, 환영합니다! 🎉`);

    // 메인 페이지로 이동
    window.location.href = '/index.html';
  } catch (error) {
    console.error('로그인 실패:', error);
    showError(error.message || '이메일 또는 비밀번호가 일치하지 않습니다.');
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
