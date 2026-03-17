/**
 * 회원가입 페이지 로직
 * 실시간 검증 + 중복 확인 + API 연동
 */

import * as validator from '../../utils/validator.js';
import httpClient from '../../utils/http-client.js';
import API_CONFIG from '../../config/api-config.js';

// DOM 요소
const signupForm = document.getElementById('signupForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('passwordConfirm');
const nameInput = document.getElementById('name');
const nicknameInput = document.getElementById('nickname');
const profileImageInput = document.getElementById('profileImage');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewImg = document.getElementById('imagePreviewImg');
const removeImageBtn = document.getElementById('removeImageBtn');
const emailValidationMsg = document.getElementById('emailValidationMsg');
const passwordValidationMsg = document.getElementById('passwordValidationMsg');
const passwordConfirmValidationMsg = document.getElementById('passwordConfirmValidationMsg');
const nameValidationMsg = document.getElementById('nameValidationMsg');
const nicknameValidationMsg = document.getElementById('nicknameValidationMsg');
const checkEmailBtn = document.getElementById('checkEmailBtn');
const checkNicknameBtn = document.getElementById('checkNicknameBtn');
const signupBtn = document.getElementById('signupBtn');
const signupBtnText = document.getElementById('signupBtnText');
const signupBtnIcon = document.getElementById('signupBtnIcon');

// 중복 확인 상태
let emailChecked = false;
let nicknameChecked = false;

/**
 * 초기화
 */
const init = () => {
  setupRealtimeValidation();
  initPasswordToggles();

  checkEmailBtn.addEventListener('click', handleCheckEmail);
  checkNicknameBtn.addEventListener('click', handleCheckNickname);
  signupForm.addEventListener('submit', handleSubmit);

  profileImageInput.addEventListener('change', handleImagePreview);
  removeImageBtn.addEventListener('click', handleRemoveImage);

  emailInput.addEventListener('input', () => {
    emailChecked = false;
    updateSubmitButton();
  });

  nicknameInput.addEventListener('input', () => {
    nicknameChecked = false;
    updateSubmitButton();
  });

  // auth-input 클래스도 포함해서 이벤트 등록
  signupForm.querySelectorAll('.form-input').forEach((input) => {
    input.addEventListener('input', updateSubmitButton);
  });
};

/**
 * 비밀번호 토글 초기화 (두 개 필드)
 */
const initPasswordToggles = () => {
  const pairs = [
    { btnId: 'pwToggleBtn1', iconId: 'pwToggleIcon1', input: passwordInput },
    { btnId: 'pwToggleBtn2', iconId: 'pwToggleIcon2', input: passwordConfirmInput },
  ];

  pairs.forEach(({ btnId, iconId, input }) => {
    const btn = document.getElementById(btnId);
    const icon = document.getElementById(iconId);
    if (!btn || !icon || !input) return;

    btn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
    });
  });
};

/**
 * 파일 업로드 레이블 텍스트 업데이트
 */
const updateUploadLabel = (fileName) => {
  const labelText = document.getElementById('uploadLabelText');
  if (labelText) {
    labelText.textContent = fileName || '이미지를 선택하세요';
  }
};

/**
 * 실시간 검증 설정
 */
const setupRealtimeValidation = () => {
  emailInput.addEventListener('input', () => {
    const value = emailInput.value.trim();
    if (value === '') {
      showLabelMessage(emailValidationMsg, '', '');
      emailInput.classList.remove('valid', 'invalid');
      return;
    }
    if (validator.validateEmail(value)) {
      showLabelMessage(emailValidationMsg, '', '');
      emailInput.classList.remove('invalid');
    } else {
      showLabelMessage(emailValidationMsg, '올바른 이메일 형식이 아닙니다', 'error');
      emailInput.classList.remove('valid');
      emailInput.classList.add('invalid');
    }
  });

  passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;
    if (value === '') {
      showLabelMessage(passwordValidationMsg, '', '');
      passwordInput.classList.remove('valid', 'invalid');
      return;
    }
    if (validator.validatePassword(value)) {
      showLabelMessage(passwordValidationMsg, '안전한 비밀번호입니다', 'success');
      passwordInput.classList.remove('invalid');
      passwordInput.classList.add('valid');
    } else {
      showLabelMessage(passwordValidationMsg, '8자 이상, 영문과 숫자를 포함해야 합니다', 'error');
      passwordInput.classList.remove('valid');
      passwordInput.classList.add('invalid');
    }
  });

  passwordConfirmInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    if (passwordConfirm === '') {
      showLabelMessage(passwordConfirmValidationMsg, '', '');
      passwordConfirmInput.classList.remove('valid', 'invalid');
      return;
    }
    if (password === passwordConfirm) {
      showLabelMessage(passwordConfirmValidationMsg, '비밀번호가 일치합니다', 'success');
      passwordConfirmInput.classList.remove('invalid');
      passwordConfirmInput.classList.add('valid');
    } else {
      showLabelMessage(passwordConfirmValidationMsg, '비밀번호가 일치하지 않습니다', 'error');
      passwordConfirmInput.classList.remove('valid');
      passwordConfirmInput.classList.add('invalid');
    }
  });

  nameInput.addEventListener('input', () => {
    const value = nameInput.value.trim();
    if (value === '') {
      showLabelMessage(nameValidationMsg, '', '');
      nameInput.classList.remove('valid', 'invalid');
      return;
    }
    if (validator.validateName(value)) {
      showLabelMessage(nameValidationMsg, '', '');
      nameInput.classList.remove('invalid');
    } else {
      showLabelMessage(nameValidationMsg, '이름은 2-50자 사이여야 합니다', 'error');
      nameInput.classList.remove('valid');
      nameInput.classList.add('invalid');
    }
  });

  nicknameInput.addEventListener('input', () => {
    const value = nicknameInput.value;
    if (value === '') {
      showLabelMessage(nicknameValidationMsg, '', '');
      nicknameInput.classList.remove('valid', 'invalid');
      return;
    }
    if (value.length < 2) {
      showLabelMessage(nicknameValidationMsg, '2자 이상 입력하세요', 'error');
      nicknameInput.classList.remove('valid');
      nicknameInput.classList.add('invalid');
    } else if (value.length > 50) {
      showLabelMessage(nicknameValidationMsg, '50자 이하여야 합니다', 'error');
      nicknameInput.classList.remove('valid');
      nicknameInput.classList.add('invalid');
    } else {
      showLabelMessage(nicknameValidationMsg, '', '');
      nicknameInput.classList.remove('invalid');
    }
  });
};

/**
 * 이메일 중복 확인
 */
const handleCheckEmail = async () => {
  const email = emailInput.value.trim();
  if (!validator.validateEmail(email)) {
    alert('올바른 이메일을 입력하세요');
    emailInput.focus();
    return;
  }
  try {
    checkEmailBtn.disabled = true;
    checkEmailBtn.textContent = '확인중...';
    const isDuplicate = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.CHECK_EMAIL}?email=${encodeURIComponent(email)}`,
    );
    if (isDuplicate) {
      showLabelMessage(emailValidationMsg, '이미 사용 중인 이메일입니다', 'error');
      emailInput.classList.add('invalid');
      emailInput.classList.remove('valid');
      emailChecked = false;
    } else {
      showLabelMessage(emailValidationMsg, '사용 가능한 이메일입니다', 'success');
      emailInput.classList.add('valid');
      emailInput.classList.remove('invalid');
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
  if (!validator.validateNickname(nickname)) {
    alert('닉네임은 2-50자 사이여야 합니다');
    nicknameInput.focus();
    return;
  }
  try {
    checkNicknameBtn.disabled = true;
    checkNicknameBtn.textContent = '확인중...';
    const isDuplicate = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.CHECK_NICKNAME}?nickname=${encodeURIComponent(nickname)}`,
    );
    if (isDuplicate) {
      showLabelMessage(nicknameValidationMsg, '이미 사용 중인 닉네임입니다', 'error');
      nicknameInput.classList.add('invalid');
      nicknameInput.classList.remove('valid');
      nicknameChecked = false;
    } else {
      showLabelMessage(nicknameValidationMsg, '사용 가능한 닉네임입니다', 'success');
      nicknameInput.classList.add('valid');
      nicknameInput.classList.remove('invalid');
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
 * 프로필 이미지 미리보기
 */
const handleImagePreview = () => {
  const file = profileImageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreviewImg.src = e.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    updateUploadLabel(file.name);
  } else {
    imagePreview.style.display = 'none';
    imagePreviewImg.src = '';
    updateUploadLabel('');
  }
};

/**
 * 프로필 이미지 제거
 */
const handleRemoveImage = () => {
  profileImageInput.value = '';
  imagePreview.style.display = 'none';
  imagePreviewImg.src = '';
  updateUploadLabel('');
};

/**
 * 회원가입 제출
 */
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateAllInputs()) return;
  if (!emailChecked) {
    alert('이메일 중복 확인을 해주세요');
    return;
  }
  if (!nicknameChecked) {
    alert('닉네임 중복 확인을 해주세요');
    return;
  }

  const profileFile = profileImageInput.files[0];
  const formData = new FormData();
  formData.append('email', emailInput.value.trim());
  formData.append('password', passwordInput.value);
  formData.append('name', nameInput.value.trim());
  formData.append('nickname', nicknameInput.value.trim());
  if (profileFile) {
    formData.append('profileImage', profileFile);
  }

  try {
    signupBtn.disabled = true;
    if (signupBtnText) signupBtnText.textContent = '가입 중...';
    if (signupBtnIcon) signupBtnIcon.style.display = 'none';

    const response = await httpClient.postFormData(
      API_CONFIG.ENDPOINTS.MEMBER_SIGNUP,
      formData,
    );

    console.log('회원가입 성공:', response);
    alert('회원가입이 완료되었습니다! 로그인 해주세요. 🎉');
    window.location.href = '/pages/auth/login.html';
  } catch (error) {
    console.error('회원가입 실패:', error);
    alert(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
  } finally {
    signupBtn.disabled = false;
    if (signupBtnText) signupBtnText.textContent = '가입하기';
    if (signupBtnIcon) signupBtnIcon.style.display = '';
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

  if (!validator.validateEmail(email)) {
    alert('올바른 이메일을 입력하세요');
    emailInput.focus();
    return false;
  }
  if (!validator.validatePassword(password)) {
    alert('비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다');
    passwordInput.focus();
    return false;
  }
  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다');
    passwordConfirmInput.focus();
    return false;
  }
  if (!validator.validateName(name)) {
    alert('이름은 2-50자 사이여야 합니다');
    nameInput.focus();
    return false;
  }
  if (!validator.validateNickname(nickname)) {
    alert('닉네임은 2-50자 사이여야 합니다');
    nicknameInput.focus();
    return false;
  }
  return true;
};

/**
 * 가입 버튼 활성화/비활성화
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
 * 라벨 옆 검증 메시지 표시
 */
const showLabelMessage = (spanEl, message, type) => {
  spanEl.textContent = message;
  spanEl.className = 'label-help-text';
  if (type === 'error') {
    spanEl.classList.add('label-validation-error');
  } else if (type === 'success') {
    spanEl.classList.add('label-validation-success');
  }
};

init();
