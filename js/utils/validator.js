/**
 * 입력값 검증 유틸리티
 * 백엔드 검증 규칙과 동일하게 구현
 */

/**
 * 이메일 형식 검증
 * @param {string} email - 검증할 이메일
 * @returns {boolean} 유효성 여부
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return false;
  }

  // 이메일 정규식 (RFC 5322 기반 간소화)
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * 비밀번호 검증
 * 규칙: 8자 이상, 영문 + 숫자 포함
 * @param {string} password - 검증할 비밀번호
 * @returns {boolean} 유효성 여부
 */
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return false;
  }

  // 백엔드와 동일한 정규식
  // ^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * 비밀번호 상세 검증 (조건별)
 * @param {string} password - 검증할 비밀번호
 * @returns {Object} 각 조건의 통과 여부
 */
export const validatePasswordDetailed = (password) => {
  return {
    length: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*#?&]/.test(password),
    isValid: validatePassword(password),
  };
};

/**
 * 닉네임 검증
 * 규칙: 2-50자
 * @param {string} nickname - 검증할 닉네임
 * @returns {boolean} 유효성 여부
 */
export const validateNickname = (nickname) => {
  if (!nickname || nickname.trim() === '') {
    return false;
  }

  const trimmed = nickname.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

/**
 * 이름 검증
 * 규칙: 2-50자
 * @param {string} name - 검증할 이름
 * @returns {boolean} 유효성 여부
 */
export const validateName = (name) => {
  if (!name || name.trim() === '') {
    return false;
  }

  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50;
};

/**
 * 게시글 제목 검증
 * 규칙: 1-200자
 * @param {string} title - 검증할 제목
 * @returns {boolean} 유효성 여부
 */
export const validatePostTitle = (title) => {
  if (!title || title.trim() === '') {
    return false;
  }

  const trimmed = title.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
};

/**
 * 게시글 내용 검증
 * 규칙: 1자 이상
 * @param {string} content - 검증할 내용
 * @returns {boolean} 유효성 여부
 */
export const validatePostContent = (content) => {
  if (!content || content.trim() === '') {
    return false;
  }

  return content.trim().length >= 1;
};

/**
 * 댓글 내용 검증
 * 규칙: 1-500자
 * @param {string} content - 검증할 댓글
 * @returns {boolean} 유효성 여부
 */
export const validateCommentContent = (content) => {
  if (!content || content.trim() === '') {
    return false;
  }

  const trimmed = content.trim();
  return trimmed.length >= 1 && trimmed.length <= 500;
};

/**
 * 평점 검증
 * 규칙: 0.0 ~ 5.0
 * @param {number} rating - 검증할 평점
 * @returns {boolean} 유효성 여부
 */
export const validateRating = (rating) => {
  const num = parseFloat(rating);
  return !isNaN(num) && num >= 0 && num <= 5;
};

/**
 * URL 검증
 * @param {string} url - 검증할 URL
 * @returns {boolean} 유효성 여부
 */
export const validateUrl = (url) => {
  if (!url || url.trim() === '') {
    return true; // URL은 선택사항이므로 빈 값 허용
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 빈 값 검증
 * @param {any} value - 검증할 값
 * @returns {boolean} 비어있지 않으면 true
 */
export const isNotEmpty = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
};

/**
 * 에러 메시지 생성
 * @param {string} field - 필드명
 * @param {string} type - 검증 타입
 * @returns {string} 에러 메시지
 */
export const getErrorMessage = (field, type) => {
  const messages = {
    email: {
      empty: '이메일을 입력해주세요',
      invalid: '올바른 이메일 형식이 아닙니다',
    },
    password: {
      empty: '비밀번호를 입력해주세요',
      invalid: '비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다',
    },
    nickname: {
      empty: '닉네임을 입력해주세요',
      invalid: '닉네임은 2-50자 사이여야 합니다',
    },
    name: {
      empty: '이름을 입력해주세요',
      invalid: '이름은 2-50자 사이여야 합니다',
    },
    title: {
      empty: '제목을 입력해주세요',
      invalid: '제목은 1-200자 사이여야 합니다',
    },
    content: {
      empty: '내용을 입력해주세요',
      invalid: '내용을 입력해주세요',
    },
    comment: {
      empty: '댓글을 입력해주세요',
      invalid: '댓글은 1-500자 사이여야 합니다',
    },
  };

  return messages[field]?.[type] || '입력값이 올바르지 않습니다';
};
