/**
 * 회원가입 페이지 로직
 * 실시간 검증 + 중복 확인 + API 연동
 */

import {
  validateEmailInput,
  validatePasswordInput,
  validateNameInput,
  validateNicknameInput,
  validateForm,
} from '../../utils/form-validator.js';
import * as validator from '../../utils/validator.js';
import httpClient from '../../utils/http-client.js';
import API_CONFIG from '../../config/api-config.js';
import { setMemberId, setMemberNickname } from '../../utils/storage.js';

// DOM 요소
const signupForm = document.getElementById('signupForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('passwordConfirm');
const nameInput = document.getElementById('name');
const nicknameInput = document.getElementById('nickname');
const profileImageInput = document.getElementById('profileImage');
const checkEmailBtn = document.getElementById('checkEmailBtn');
const checkNicknameBtn = document.getElementById('checkNicknameBtn');
const signupBtn = document.getElementById('signupBtn');

// 중복 확인 상태
let emailChecked = false;
let nicknameChecked = false;

/**
 * 초기화
 */
const init = () => {
  // 실시간 검증 설정
  setupRealtimeValidation();

  // 이벤트 리스너
  checkEmailBtn.addEventListener('click', handleCheckEmail);
  checkNicknameBtn.addEventListener('click', handleCheckNickname);
  signupForm.addEventListener('submit', handleSubmit);

  // 입력값 변경 시 중복 확인 상태 초기화
  emailInput.addEventListener('input', () => {
    emailChecked = false;
    updateSubmitButton();
  });

  nicknameInput.addEventListener('input', () => {
    nicknameChecked = false;
    updateSubmitButton();
  });

  // 모든 입력 필드 변경 시 버튼 상태 업데이트
  signupForm.querySelectorAll('.form-input').forEach((input) => {
    input.addEventListener('input', updateSubmitButton);
  });
};

/**
 * 실시간 검증 설정
 */
const setupRealtimeValidation = () => {
  // 이메일 실시간 검증
  validateEmailInput(emailInput, {
    showSuccess: false,
  });

  // 비밀번호 실시간 검증 (상세 버전)
  validatePasswordInput(passwordInput, {
    showDetailedValidation: true,
  });

  // 비밀번호 확인 검증
  passwordConfirmInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    if (passwordConfirm === '') {
      clearValidationMessage(passwordConfirmInput);
      return;
    }

    if (password === passwordConfirm) {
      showValidationMessage(
        passwordConfirmInput,
        '비밀번호가 일치합니다',
        'success',
      );
    } else {
      showValidationMessage(
        passwordConfirmInput,
        '비밀번호가 일치하지 않습니다',
        'error',
      );
    }
  });

  // 이름 실시간 검증
  validateNameInput(nameInput, {
    showSuccess: false,
  });

  // 닉네임 실시간 검증 (trim 제거)
  validateNicknameInput(nicknameInput, {
    showSuccess: false,
  });
};

/**
 * 이메일 중복 확인
 */
const handleCheckEmail = async () => {
  const email = emailInput.value.trim();

  // 유효성 검증
  if (!validator.validateEmail(email)) {
    alert('올바른 이메일을 입력하세요');
    emailInput.focus();
    return;
  }

  try {
    checkEmailBtn.disabled = true;
    checkEmailBtn.textContent = '확인중...';

    // API 호출
    const isDuplicate = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.CHECK_EMAIL}?email=${encodeURIComponent(email)}`,
    );

    if (isDuplicate) {
      showValidationMessage(emailInput, '이미 사용 중인 이메일입니다', 'error');
      emailChecked = false;
    } else {
      showValidationMessage(emailInput, '사용 가능한 이메일입니다', 'success');
      emailChecked = true;
    }
  } catch (error) {
    console.error('이메일 중복 확인 실패:', error);
    alert('이메일 중복 확인에 실패했습니다. 다시 시도해주세요.');
  } finally {
    checkEmailBtn.disabled = false;
    checkEmailBtn.textContent = '중복확인';
    updateSubmitButton();
  }
};

/**
 * 닉네임 중복 확인
 */
const handleCheckNickname = async () => {
  const nickname = nicknameInput.value.trim();

  // 유효성 검증
  if (!validator.validateNickname(nickname)) {
    alert('닉네임은 2-50자 사이여야 합니다');
    nicknameInput.focus();
    return;
  }

  try {
    checkNicknameBtn.disabled = true;
    checkNicknameBtn.textContent = '확인중...';

    // API 호출
    const isDuplicate = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.CHECK_NICKNAME}?nickname=${encodeURIComponent(nickname)}`,
    );

    if (isDuplicate) {
      showValidationMessage(
        nicknameInput,
        '이미 사용 중인 닉네임입니다',
        'error',
      );
      nicknameChecked = false;
    } else {
      showValidationMessage(
        nicknameInput,
        '사용 가능한 닉네임입니다',
        'success',
      );
      nicknameChecked = true;
    }
  } catch (error) {
    console.error('닉네임 중복 확인 실패:', error);
    alert('닉네임 중복 확인에 실패했습니다. 다시 시도해주세요.');
  } finally {
    checkNicknameBtn.disabled = false;
    checkNicknameBtn.textContent = '중복확인';
    updateSubmitButton();
  }
};

/**
 * 회원가입 제출
 */
const handleSubmit = async (e) => {
  e.preventDefault();

  // 최종 검증
  if (!validateAllInputs()) {
    return;
  }

  // 중복 확인 여부 체크
  if (!emailChecked) {
    alert('이메일 중복 확인을 해주세요');
    return;
  }

  if (!nicknameChecked) {
    alert('닉네임 중복 확인을 해주세요');
    return;
  }

  // 요청 데이터 생성
  const requestData = {
    email: emailInput.value.trim(),
    password: passwordInput.value,
    name: nameInput.value.trim(),
    nickname: nicknameInput.value.trim(),
    profileImage: profileImageInput.value.trim() || null,
  };

  try {
    signupBtn.disabled = true;
    signupBtn.textContent = '회원가입 중...';

    // API 호출
    const response = await httpClient.post(
      API_CONFIG.ENDPOINTS.MEMBER_SIGNUP,
      requestData,
    );

    console.log('회원가입 성공:', response);

    // 성공 알림 및 로그인 페이지로 이동
    alert('회원가입이 완료되었습니다! 로그인 해주세요. 🎉');
    window.location.href = '/pages/auth/login.html';
  } catch (error) {
    console.error('회원가입 실패:', error);
    alert(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = '회원가입';
  }
};

/**
 * 모든 입력값 검증
 */
const validateAllInputs = () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;
  const name = nameInput.value.trim();
  const nickname = nicknameInput.value.trim();

  // 이메일 검증
  if (!validator.validateEmail(email)) {
    alert('올바른 이메일을 입력하세요');
    emailInput.focus();
    return false;
  }

  // 비밀번호 검증
  if (!validator.validatePassword(password)) {
    alert('비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다');
    passwordInput.focus();
    return false;
  }

  // 비밀번호 확인
  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다');
    passwordConfirmInput.focus();
    return false;
  }

  // 이름 검증
  if (!validator.validateName(name)) {
    alert('이름은 2-50자 사이여야 합니다');
    nameInput.focus();
    return false;
  }

  // 닉네임 검증
  if (!validator.validateNickname(nickname)) {
    alert('닉네임은 2-50자 사이여야 합니다');
    nicknameInput.focus();
    return false;
  }

  return true;
};

/**
 * 회원가입 버튼 활성화/비활성화
 */
const updateSubmitButton = () => {
  const isFormValid =
    emailInput.value.trim() !== '' &&
    passwordInput.value !== '' &&
    passwordConfirmInput.value !== '' &&
    nameInput.value.trim() !== '' &&
    nicknameInput.value.trim() !== '' &&
    emailChecked &&
    nicknameChecked &&
    !emailInput.classList.contains('invalid') &&
    !passwordInput.classList.contains('invalid') &&
    !passwordConfirmInput.classList.contains('invalid') &&
    !nameInput.classList.contains('invalid') &&
    !nicknameInput.classList.contains('invalid');

  signupBtn.disabled = !isFormValid;
};

/**
 * 검증 메시지 표시 (헬퍼 함수)
 */
const showValidationMessage = (input, message, type) => {
  const existingMessage = input.parentElement.querySelector(
    '.validation-message',
  );
  if (existingMessage) {
    existingMessage.remove();
  }

  const messageEl = document.createElement('div');
  messageEl.className = `validation-message ${type}`;
  messageEl.textContent = message;
  input.parentElement.appendChild(messageEl);

  input.classList.remove('valid', 'invalid');
  input.classList.add(type === 'success' ? 'valid' : 'invalid');
};

/**
 * 검증 메시지 제거 (헬퍼 함수)
 */
const clearValidationMessage = (input) => {
  const existingMessage = input.parentElement.querySelector(
    '.validation-message',
  );
  if (existingMessage) {
    existingMessage.remove();
  }
  input.classList.remove('valid', 'invalid');
};

// 초기화 실행
init();
