/**
 * 실시간 폼 검증 헬퍼
 * 입력 필드에 실시간 검증을 쉽게 적용할 수 있는 유틸리티
 */

import * as validator from './validator.js';

/**
 * 검증 메시지를 표시하는 요소를 생성하거나 업데이트
 * @param {HTMLElement} input - 입력 필드
 * @param {string} message - 메시지 내용
 * @param {string} type - 'success' 또는 'error'
 */
const showValidationMessage = (input, message, type) => {
  // 기존 메시지 제거
  const existingMessage = input.parentElement.querySelector(
    '.validation-message',
  );
  if (existingMessage) {
    existingMessage.remove();
  }

  if (!message) return;

  // 새 메시지 생성
  const messageEl = document.createElement('div');
  messageEl.className = `validation-message ${type}`;
  messageEl.textContent = message;

  // 입력 필드 다음에 삽입
  input.parentElement.appendChild(messageEl);

  // 입력 필드 스타일 업데이트
  input.classList.remove('valid', 'invalid');
  input.classList.add(type === 'success' ? 'valid' : 'invalid');
};

/**
 * 검증 메시지 제거
 * @param {HTMLElement} input - 입력 필드
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

/**
 * 이메일 실시간 검증
 * @param {HTMLInputElement} input - 이메일 입력 필드
 * @param {Object} options - 옵션
 */
export const validateEmailInput = (input, options = {}) => {
  const {
    showSuccess = true,
    emptyMessage = '이메일을 입력해주세요',
    invalidMessage = '올바른 이메일 형식이 아닙니다',
    successMessage = '사용 가능한 이메일 형식입니다',
  } = options;

  input.addEventListener('input', () => {
    const value = input.value.trim();

    // 빈 값
    if (value === '') {
      if (options.allowEmpty) {
        clearValidationMessage(input);
      } else {
        showValidationMessage(input, emptyMessage, 'error');
      }
      return;
    }

    // 이메일 검증
    if (validator.validateEmail(value)) {
      if (showSuccess) {
        showValidationMessage(input, successMessage, 'success');
      } else {
        clearValidationMessage(input);
      }
    } else {
      showValidationMessage(input, invalidMessage, 'error');
    }
  });

  // blur 이벤트에서도 검증
  input.addEventListener('blur', () => {
    if (input.value.trim() === '' && !options.allowEmpty) {
      showValidationMessage(input, emptyMessage, 'error');
    }
  });
};

/**
 * 비밀번호 실시간 검증 (상세 버전)
 * @param {HTMLInputElement} input - 비밀번호 입력 필드
 * @param {Object} options - 옵션
 */
export const validatePasswordInput = (input, options = {}) => {
  const { showDetailedValidation = true } = options;

  // 상세 검증 UI 생성
  if (showDetailedValidation) {
    const validationContainer = document.createElement('div');
    validationContainer.className = 'password-validation';
    validationContainer.innerHTML = `
            <div class="password-validation-title">비밀번호 조건</div>
            <ul class="password-validation-list">
                <li class="password-validation-item" data-rule="length">8자 이상</li>
                <li class="password-validation-item" data-rule="letter">영문 포함</li>
                <li class="password-validation-item" data-rule="number">숫자 포함</li>
            </ul>
        `;
    input.parentElement.appendChild(validationContainer);

    // 실시간 업데이트
    input.addEventListener('input', () => {
      const value = input.value;
      const validation = validator.validatePasswordDetailed(value);

      // 각 조건 업데이트
      const lengthItem = validationContainer.querySelector(
        '[data-rule="length"]',
      );
      const letterItem = validationContainer.querySelector(
        '[data-rule="letter"]',
      );
      const numberItem = validationContainer.querySelector(
        '[data-rule="number"]',
      );

      lengthItem.classList.toggle('valid', validation.length);
      lengthItem.classList.toggle(
        'invalid',
        !validation.length && value.length > 0,
      );

      letterItem.classList.toggle('valid', validation.hasLetter);
      letterItem.classList.toggle(
        'invalid',
        !validation.hasLetter && value.length > 0,
      );

      numberItem.classList.toggle('valid', validation.hasNumber);
      numberItem.classList.toggle(
        'invalid',
        !validation.hasNumber && value.length > 0,
      );

      // 입력 필드 스타일
      if (value.length === 0) {
        input.classList.remove('valid', 'invalid');
      } else if (validation.isValid) {
        input.classList.add('valid');
        input.classList.remove('invalid');
      } else {
        input.classList.add('invalid');
        input.classList.remove('valid');
      }
    });
  } else {
    // 간단한 검증
    input.addEventListener('input', () => {
      const value = input.value.trim();

      if (value === '') {
        clearValidationMessage(input);
        return;
      }

      if (validator.validatePassword(value)) {
        showValidationMessage(input, '안전한 비밀번호입니다', 'success');
      } else {
        showValidationMessage(
          input,
          '비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다',
          'error',
        );
      }
    });
  }
};

/**
 * 닉네임 실시간 검증
 * @param {HTMLInputElement} input - 닉네임 입력 필드
 * @param {Object} options - 옵션
 */
export const validateNicknameInput = (input, options = {}) => {
  const { showSuccess = true } = options;

  input.addEventListener('input', (e) => {
    // ✅ trim 제거 - 입력 중에는 trim하지 않음
    const value = e.target.value;

    // 빈 값일 때는 검증 메시지 제거
    if (value === '') {
      clearValidationMessage(input);
      return;
    }

    // 1글자일 때 에러 표시
    if (value.length < 2) {
      showValidationMessage(input, '닉네임은 2자 이상이어야 합니다', 'error');
      return;
    }

    // 50자 초과 시 에러 표시
    if (value.length > 50) {
      showValidationMessage(input, '닉네임은 50자 이하여야 합니다', 'error');
      return;
    }

    // 유효성 검사 통과
    if (showSuccess) {
      showValidationMessage(input, '사용 가능한 형식입니다', 'success');
    } else {
      clearValidationMessage(input);
    }
  });
};

/**
 * 이름 실시간 검증
 * @param {HTMLInputElement} input - 이름 입력 필드
 * @param {Object} options - 옵션
 */
export const validateNameInput = (input, options = {}) => {
  const {
    showSuccess = false,
    emptyMessage = '이름을 입력해주세요',
    invalidMessage = '이름은 2-50자 사이여야 합니다',
  } = options;

  input.addEventListener('input', () => {
    const value = input.value.trim();

    if (value === '') {
      if (options.allowEmpty) {
        clearValidationMessage(input);
      } else {
        showValidationMessage(input, emptyMessage, 'error');
      }
      return;
    }

    if (validator.validateName(value)) {
      if (showSuccess) {
        showValidationMessage(input, '올바른 이름입니다', 'success');
      } else {
        clearValidationMessage(input);
      }
    } else {
      showValidationMessage(input, invalidMessage, 'error');
    }
  });
};

/**
 * 제목 실시간 검증 (게시글)
 * @param {HTMLInputElement} input - 제목 입력 필드
 * @param {Object} options - 옵션
 */
export const validateTitleInput = (input, options = {}) => {
  const { maxLength = 200, emptyMessage = '제목을 입력해주세요' } = options;

  // 글자 수 표시
  const counterEl = document.createElement('div');
  counterEl.className = 'form-help-text';
  input.parentElement.appendChild(counterEl);

  input.addEventListener('input', () => {
    const value = input.value.trim();
    const length = input.value.length;

    // 글자 수 업데이트
    counterEl.textContent = `${length}/${maxLength}자`;
    counterEl.style.color =
      length > maxLength ? 'var(--error-color)' : 'var(--gray-500)';

    // 검증
    if (value === '') {
      showValidationMessage(input, emptyMessage, 'error');
    } else if (length > maxLength) {
      showValidationMessage(
        input,
        `제목은 ${maxLength}자 이하여야 합니다`,
        'error',
      );
    } else {
      clearValidationMessage(input);
    }
  });
};

/**
 * 내용 실시간 검증 (게시글/댓글)
 * @param {HTMLTextAreaElement} textarea - 내용 입력 필드
 * @param {Object} options - 옵션
 */
export const validateContentInput = (textarea, options = {}) => {
  const { maxLength = null, emptyMessage = '내용을 입력해주세요' } = options;

  // 글자 수 표시
  if (maxLength) {
    const counterEl = document.createElement('div');
    counterEl.className = 'form-help-text';
    textarea.parentElement.appendChild(counterEl);

    textarea.addEventListener('input', () => {
      const length = textarea.value.length;
      counterEl.textContent = `${length}/${maxLength}자`;
      counterEl.style.color =
        length > maxLength ? 'var(--error-color)' : 'var(--gray-500)';

      if (length > maxLength) {
        showValidationMessage(
          textarea,
          `내용은 ${maxLength}자 이하여야 합니다`,
          'error',
        );
      } else if (textarea.value.trim() === '') {
        showValidationMessage(textarea, emptyMessage, 'error');
      } else {
        clearValidationMessage(textarea);
      }
    });
  } else {
    textarea.addEventListener('input', () => {
      if (textarea.value.trim() === '') {
        showValidationMessage(textarea, emptyMessage, 'error');
      } else {
        clearValidationMessage(textarea);
      }
    });
  }
};

/**
 * 폼 전체 검증
 * @param {HTMLFormElement} form - 폼 요소
 * @returns {boolean} 폼이 유효한지 여부
 */
export const validateForm = (form) => {
  const inputs = form.querySelectorAll('.form-input, .form-textarea');
  let isValid = true;

  inputs.forEach((input) => {
    if (
      input.classList.contains('invalid') ||
      (input.hasAttribute('required') && input.value.trim() === '')
    ) {
      isValid = false;
    }
  });

  return isValid;
};

/**
 * 검증 초기화
 * @param {HTMLElement} container - 초기화할 컨테이너
 */
export const clearAllValidations = (container) => {
  const messages = container.querySelectorAll('.validation-message');
  messages.forEach((msg) => msg.remove());

  const inputs = container.querySelectorAll('.form-input, .form-textarea');
  inputs.forEach((input) => {
    input.classList.remove('valid', 'invalid');
  });

  const passwordValidations = container.querySelectorAll(
    '.password-validation',
  );
  passwordValidations.forEach((pv) => pv.remove());
};
