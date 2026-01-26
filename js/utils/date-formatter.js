/**
 * 날짜 포맷팅 유틸리티
 * 백엔드에서 받은 날짜 문자열을 다양한 형태로 변환
 */

/**
 * 날짜 문자열을 Date 객체로 변환
 * @param {string} dateString - "2024-01-25 14:30:00" 형태
 * @returns {Date} Date 객체
 */
const parseDate = (dateString) => {
  if (!dateString) return null;

  // "2024-01-25 14:30:00" → Date 객체
  return new Date(dateString.replace(' ', 'T'));
};

/**
 * 상대 시간 표시 (방금 전, 3시간 전, 2일 전 등)
 * @param {string} dateString - 백엔드에서 받은 날짜 문자열
 * @returns {string} 상대 시간 문자열
 */
export const getRelativeTime = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  // 1분 미만
  if (diffInSeconds < 60) {
    return '방금 전';
  }

  // 1시간 미만
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }

  // 24시간 미만
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  }

  // 7일 미만
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  }

  // 30일 미만
  if (diffInDays < 30) {
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}주 전`;
  }

  // 365일 미만
  if (diffInDays < 365) {
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}개월 전`;
  }

  // 1년 이상
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}년 전`;
};

/**
 * 기본 날짜 포맷 (YYYY.MM.DD)
 * @param {string} dateString - 백엔드에서 받은 날짜 문자열
 * @returns {string} "2024.01.25" 형태
 */
export const formatDate = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
};

/**
 * 날짜 + 시간 포맷 (YYYY.MM.DD HH:MM)
 * @param {string} dateString - 백엔드에서 받은 날짜 문자열
 * @returns {string} "2024.01.25 14:30" 형태
 */
export const formatDateTime = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} ${hours}:${minutes}`;
};

/**
 * 한글 날짜 포맷 (2024년 1월 25일)
 * @param {string} dateString - 백엔드에서 받은 날짜 문자열
 * @returns {string} "2024년 1월 25일" 형태
 */
export const formatDateKorean = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return '';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}년 ${month}월 ${day}일`;
};

/**
 * 오전/오후 시간 포맷 (오후 2:30)
 * @param {string} dateString - 백엔드에서 받은 날짜 문자열
 * @returns {string} "오후 2:30" 형태
 */
export const formatTime = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return '';

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;

  return `${period} ${displayHours}:${minutes}`;
};

/**
 * 풀 포맷 (2024년 1월 25일 오후 2:30)
 * @param {string} dateString - 백엔드에서 받은 날짜 문자열
 * @returns {string} "2024년 1월 25일 오후 2:30" 형태
 */
export const formatFullDateTime = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return '';

  const koreanDate = formatDateKorean(dateString);
  const time = formatTime(dateString);

  return `${koreanDate} ${time}`;
};

/**
 * 채팅 스타일 날짜 (오늘, 어제, 날짜)
 * @param {string} dateString - 백엔드에서 받은 날짜 문자열
 * @returns {string} "오늘", "어제", "2024.01.23" 형태
 */
export const formatChatDate = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (targetDate.getTime() === today.getTime()) {
    return '오늘';
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return '어제';
  } else {
    return formatDate(dateString);
  }
};
