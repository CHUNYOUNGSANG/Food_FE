/**
 * 게시글 작성 페이지 로직
 */

import { createPost } from '../../services/post-service.js';
import {
  validatePostTitle,
  validatePostContent,
} from '../../utils/validator.js';
import { getMemberId } from '../../utils/storage.js';

// DOM 요소
const postCreateForm = document.getElementById('postCreateForm');
const titleInput = document.getElementById('title');
const restaurantNameInput = document.getElementById('restaurantName');
const restaurantAddressInput = document.getElementById('restaurantAddress');
const foodCategorySelect = document.getElementById('foodCategory');
const ratingInput = document.getElementById('rating');
const ratingStars = document.getElementById('ratingStars');
const imageUrlInput = document.getElementById('imageUrl');
const contentTextarea = document.getElementById('content');
const contentCount = document.getElementById('contentCount');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');

/**
 * 초기화
 */
const init = () => {
  checkAuth();
  attachEventListeners();
};

/**
 * 로그인 확인
 */
const checkAuth = () => {
  const memberId = getMemberId();
  if (!memberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
  }
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 폼 제출
  postCreateForm.addEventListener('submit', handleSubmit);

  // 취소 버튼
  cancelBtn.addEventListener('click', handleCancel);

  // 평점 입력 시 별 표시
  ratingInput.addEventListener('input', updateRatingStars);

  // 내용 글자 수 카운트
  contentTextarea.addEventListener('input', updateContentCount);

  // 입력 시 에러 메시지 숨김
  titleInput.addEventListener('input', hideError);
  contentTextarea.addEventListener('input', hideError);
};

/**
 * 폼 제출 처리
 */
const handleSubmit = async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const restaurantName = restaurantNameInput.value.trim();
  const restaurantAddress = restaurantAddressInput.value.trim();
  const foodCategory = foodCategorySelect.value;
  const rating = ratingInput.value ? parseFloat(ratingInput.value) : null;
  const imageUrl = imageUrlInput.value.trim();
  const content = contentTextarea.value.trim();

  // 유효성 검사
  if (!validatePostTitle(title)) {
    showError('제목은 1-200자 사이여야 합니다.');
    titleInput.focus();
    return;
  }

  if (!restaurantName) {
    showError('맛집 이름을 입력해주세요.');
    restaurantNameInput.focus();
    return;
  }

  if (!validatePostContent(content)) {
    showError('리뷰 내용을 입력해주세요.');
    contentTextarea.focus();
    return;
  }

  if (rating !== null && (rating < 0 || rating > 5)) {
    showError('평점은 0.0 ~ 5.0 사이여야 합니다.');
    ratingInput.focus();
    return;
  }

  try {
    // 버튼 비활성화
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    // 게시글 데이터 준비
    const postData = {
      title,
      restaurantName,
      restaurantAddress: restaurantAddress || null,
      foodCategory: foodCategory || null,
      rating,
      imageUrl: imageUrl || null,
      content,
    };

    // 게시글 작성 API 호출
    const result = await createPost(postData);

    console.log('게시글 작성 성공:', result);

    // 성공 메시지
    alert('맛집이 등록되었습니다! 🎉');

    // 상세 페이지로 이동
    window.location.href = `/pages/posts/post-detail.html?id=${result.id}`;
  } catch (error) {
    console.error('게시글 작성 실패:', error);
    showError(error.message || '게시글 등록에 실패했습니다.');
  } finally {
    // 버튼 활성화
    submitBtn.disabled = false;
    submitBtn.textContent = '등록하기';
  }
};

/**
 * 취소 처리
 */
const handleCancel = () => {
  if (confirm('작성을 취소하시겠습니까?')) {
    window.location.href = '/index.html';
  }
};

/**
 * 평점 별 표시 업데이트
 */
const updateRatingStars = () => {
  const rating = parseFloat(ratingInput.value) || 0;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) stars += '⭐';
  stars += '☆'.repeat(emptyStars);

  ratingStars.textContent = stars;
};

/**
 * 내용 글자 수 업데이트
 */
const updateContentCount = () => {
  const count = contentTextarea.value.length;
  contentCount.textContent = `${count}자`;

  if (count > 5000) {
    contentCount.style.color = 'var(--error-color)';
  } else {
    contentCount.style.color = 'var(--gray-500)';
  }
};

/**
 * 에러 메시지 표시
 */
const showError = (message) => {
  errorMessage.textContent = message;
  errorMessage.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * 에러 메시지 숨김
 */
const hideError = () => {
  errorMessage.style.display = 'none';
};

// 초기화 실행
init();
