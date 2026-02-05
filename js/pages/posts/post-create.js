/**
 * 게시글 작성 페이지 로직
 */

import { createPost } from '../../services/post-service.js';
import {
  validatePostTitle,
  validatePostContent,
} from '../../utils/validator.js';
import { getMemberId, getToken } from '../../utils/storage.js';

// DOM 요소
const postCreateForm = document.getElementById('postCreateForm');
const titleInput = document.getElementById('title');
const restaurantNameInput = document.getElementById('restaurantName');
const restaurantAddressInput = document.getElementById('restaurantAddress');
const foodCategorySelect = document.getElementById('foodCategory');
const ratingInput = document.getElementById('rating');
const imageFilesInput = document.getElementById('imageFiles');
const imagePreview = document.getElementById('imagePreview');
const contentTextarea = document.getElementById('content');
const contentCount = document.getElementById('contentCount');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');

// 이미지 파일 관리
let selectedFiles = [];
const MAX_IMAGES = 10;

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

  // 이미지 파일 선택
  imageFilesInput.addEventListener('change', handleImageSelect);

  // 내용 글자 수 카운트
  contentTextarea.addEventListener('input', updateContentCount);

  // 입력 시 에러 메시지 숨김
  titleInput.addEventListener('input', hideError);
  contentTextarea.addEventListener('input', hideError);
};

/**
 * 이미지 파일 선택 처리
 */
const handleImageSelect = (e) => {
  const files = Array.from(e.target.files);

  // 최대 10장 체크
  if (selectedFiles.length + files.length > MAX_IMAGES) {
    alert(`이미지는 최대 ${MAX_IMAGES}장까지만 업로드 가능합니다.`);
    return;
  }

  // 이미지 파일만 필터링
  const imageFiles = files.filter((file) => file.type.startsWith('image/'));

  if (imageFiles.length !== files.length) {
    alert('이미지 파일만 업로드 가능합니다.');
  }

  // 선택된 파일 추가
  selectedFiles = [...selectedFiles, ...imageFiles];

  // 미리보기 렌더링
  renderImagePreviews();

  // input 초기화 (같은 파일 재선택 가능하도록)
  e.target.value = '';
};

/**
 * 이미지 미리보기 렌더링
 */
const renderImagePreviews = () => {
  if (selectedFiles.length === 0) {
    imagePreview.style.display = 'none';
    return;
  }

  imagePreview.style.display = 'block';
  imagePreview.innerHTML = `
    <div class="image-preview-grid">
      ${selectedFiles
        .map(
          (file, index) => `
        <div class="image-preview-item">
          <img src="${URL.createObjectURL(file)}" alt="미리보기 ${index + 1}">
          <button type="button" class="image-preview-remove" data-index="${index}">
            ×
          </button>
        </div>
      `,
        )
        .join('')}
    </div>
  `;

  // 삭제 버튼 이벤트 리스너
  imagePreview.querySelectorAll('.image-preview-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeImage(index);
    });
  });
};

/**
 * 이미지 삭제
 */
const removeImage = (index) => {
  // 메모리 누수 방지 - URL 해제
  URL.revokeObjectURL(URL.createObjectURL(selectedFiles[index]));

  // 파일 배열에서 제거
  selectedFiles.splice(index, 1);

  // 미리보기 재렌더링
  renderImagePreviews();
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

  // 이미지 개수 체크
  if (selectedFiles.length > MAX_IMAGES) {
    showError(`이미지는 최대 ${MAX_IMAGES}장까지만 업로드 가능합니다.`);
    return;
  }

  try {
    // 버튼 비활성화
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    // FormData 생성 (이미지 파일 포함)
    const formData = new FormData();

    // 게시글 데이터 추가
    formData.append('title', title);
    formData.append('restaurantName', restaurantName);
    formData.append('restaurantAddress', restaurantAddress || '');
    formData.append('foodCategory', foodCategory || '');
    formData.append('rating', rating || '');
    formData.append('content', content);

    // 이미지 파일들 추가
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    // 게시글 작성 API 호출
    const result = await createPostWithImages(formData);

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
 * 이미지 포함 게시글 작성 API
 */
const createPostWithImages = async (formData) => {
  const memberId = getMemberId();
  const token = getToken();

  const headers = {};
  if (memberId) headers['Member-Id'] = memberId;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('http://localhost:8080/api/posts', {
    method: 'POST',
    headers,
    body: formData, // FormData는 Content-Type 자동 설정
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '게시글 작성에 실패했습니다.');
  }

  return await response.json();
};

/**
 * 취소 처리
 */
const handleCancel = () => {
  if (confirm('작성을 취소하시겠습니까?')) {
    // 메모리 누수 방지 - 모든 URL 해제
    selectedFiles.forEach((file) => {
      URL.revokeObjectURL(URL.createObjectURL(file));
    });

    window.location.href = '/index.html';
  }
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
