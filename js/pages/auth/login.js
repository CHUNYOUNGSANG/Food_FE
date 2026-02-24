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
const loginBtnText = document.getElementById('loginBtnText');
const loginBtnIcon = document.getElementById('loginBtnIcon');
const errorMessage = document.getElementById('errorMessage');

/**
 * 초기화
 */
const init = () => {
  attachEventListeners();
  initPasswordToggle();
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  loginForm.addEventListener('submit', handleSubmit);
  emailInput.addEventListener('input', hideError);
  passwordInput.addEventListener('input', hideError);
};

/**
 * 비밀번호 표시/숨김 토글
 */
const initPasswordToggle = () => {
  const toggleBtn = document.getElementById('pwToggleBtn');
  const toggleIcon = document.getElementById('pwToggleIcon');
  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleIcon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
  });
};

/**
 * 폼 제출 처리
 */
const handleSubmit = async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

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
    loginBtn.disabled = true;
    if (loginBtnText) loginBtnText.textContent = '로그인 중...';
    if (loginBtnIcon) loginBtnIcon.style.display = 'none';

    const response = await login({ email, password });

    alert(`${response.member.nickname}님, 환영합니다!`);
    window.location.href = '/index.html';
  } catch (error) {
    console.error('로그인 실패:', error);
    showError(error.message || '이메일 또는 비밀번호가 일치하지 않습니다.');
  } finally {
    loginBtn.disabled = false;
    if (loginBtnText) loginBtnText.textContent = '로그인';
    if (loginBtnIcon) loginBtnIcon.style.display = '';
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

init();
