/**
 * 게시글 수정 페이지 로직
 */

import { getPost } from '../../services/post-service.js';
import {
  validatePostTitle,
  validatePostContent,
} from '../../utils/validator.js';
import { getMemberId, getToken } from '../../utils/storage.js';

// DOM 요소
const loading = document.getElementById('loading');
const editContent = document.getElementById('editContent');
const postEditForm = document.getElementById('postEditForm');
const titleInput = document.getElementById('title');
const restaurantNameInput = document.getElementById('restaurantName');
const restaurantAddressInput = document.getElementById('restaurantAddress');
const foodCategorySelect = document.getElementById('foodCategory');
const ratingInput = document.getElementById('rating');
const imageFilesInput = document.getElementById('imageFiles');
const imagePreview = document.getElementById('imagePreview');
const existingImages = document.getElementById('existingImages');
const existingImageGrid = document.getElementById('existingImageGrid');
const contentTextarea = document.getElementById('content');
const contentCount = document.getElementById('contentCount');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');

// 상태
let currentPostId = null;
let currentPost = null;
let selectedFiles = [];
let deleteImageIds = [];
const MAX_IMAGES = 10;

/**
 * 초기화
 */
const init = async () => {
  // URL에서 게시글 ID 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  currentPostId = urlParams.get('id');

  if (!currentPostId) {
    alert('게시글을 찾을 수 없습니다.');
    window.location.href = '/index.html';
    return;
  }

  // 로그인 확인
  const memberId = getMemberId();
  if (!memberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  // 게시글 로드
  await loadPost();

  // 이벤트 리스너
  attachEventListeners();
};

/**
 * 게시글 로드
 */
const loadPost = async () => {
  try {
    showLoading();

    const post = await getPost(currentPostId);
    currentPost = post;

    // 권한 확인 (본인 게시글인지)
    const memberId = getMemberId();
    if (parseInt(memberId) !== post.memberId) {
      alert('수정 권한이 없습니다.');
      window.location.href = `/pages/posts/post-detail.html?id=${currentPostId}`;
      return;
    }

    // 폼에 데이터 채우기
    fillForm(post);

    hideLoading();
  } catch (error) {
    console.error('게시글 로드 실패:', error);
    alert('게시글을 불러오는데 실패했습니다.');
    window.location.href = '/index.html';
  }
};

/**
 * 폼에 데이터 채우기
 */
const fillForm = (post) => {
  titleInput.value = post.title || '';
  restaurantNameInput.value = post.restaurantName || '';
  restaurantAddressInput.value = post.restaurantAddress || '';
  foodCategorySelect.value = post.foodCategory || '';
  ratingInput.value = post.rating || '';
  contentTextarea.value = post.content || '';

  // 기존 이미지 표시
  renderExistingImages(post.images || []);

  // 글자 수 업데이트
  updateContentCount();
};

/**
 * 기존 이미지 렌더링
 */
const renderExistingImages = (images) => {
  if (!images || images.length === 0) {
    existingImages.style.display = 'none';
    return;
  }

  existingImages.style.display = 'block';
  existingImageGrid.innerHTML = images
    .map(
      (img) => `
    <div class="image-preview-item" data-image-id="${img.id}" ${deleteImageIds.includes(img.id) ? 'style="opacity: 0.3;"' : ''}>
      <img src="http://localhost:8080${img.fileUrl}" alt="${img.originalFileName}">
      <button type="button" class="image-preview-remove existing-image-delete" data-image-id="${img.id}">
        ${deleteImageIds.includes(img.id) ? '↩' : '×'}
      </button>
    </div>
  `,
    )
    .join('');

  // 삭제/복원 버튼 이벤트
  existingImageGrid
    .querySelectorAll('.existing-image-delete')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const imageId = parseInt(e.target.dataset.imageId);
        toggleDeleteImage(imageId);
      });
    });
};

/**
 * 기존 이미지 삭제/복원 토글
 */
const toggleDeleteImage = (imageId) => {
  const index = deleteImageIds.indexOf(imageId);
  if (index > -1) {
    deleteImageIds.splice(index, 1);
  } else {
    deleteImageIds.push(imageId);
  }
  renderExistingImages(currentPost.images || []);
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 폼 제출
  postEditForm.addEventListener('submit', handleSubmit);

  // 취소 버튼
  cancelBtn.addEventListener('click', handleCancel);

  // 이미지 파일 선택
  if (imageFilesInput) {
    imageFilesInput.addEventListener('change', handleImageSelect);
  }

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
  const existingCount =
    (currentPost.images || []).length - deleteImageIds.length;

  if (existingCount + selectedFiles.length + files.length > MAX_IMAGES) {
    alert(`이미지는 최대 ${MAX_IMAGES}장까지만 업로드 가능합니다.`);
    return;
  }

  const imageFiles = files.filter((file) => file.type.startsWith('image/'));
  if (imageFiles.length !== files.length) {
    alert('이미지 파일만 업로드 가능합니다.');
  }

  selectedFiles = [...selectedFiles, ...imageFiles];
  renderNewImagePreviews();
  e.target.value = '';
};

/**
 * 새 이미지 미리보기 렌더링
 */
const renderNewImagePreviews = () => {
  if (selectedFiles.length === 0) {
    imagePreview.style.display = 'none';
    return;
  }

  imagePreview.style.display = 'block';
  imagePreview.innerHTML = `
    <p style="font-size: var(--font-sm); color: var(--gray-600); margin-bottom: var(--spacing-sm);">
      새 이미지:
    </p>
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

  imagePreview.querySelectorAll('.image-preview-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      selectedFiles.splice(index, 1);
      renderNewImagePreviews();
    });
  });
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

  try {
    // 버튼 비활성화
    submitBtn.disabled = true;
    submitBtn.textContent = '수정 중...';

    // FormData로 multipart 전송
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('restaurantName', restaurantName);
    if (restaurantAddress)
      formData.append('restaurantAddress', restaurantAddress);
    if (foodCategory) formData.append('foodCategory', foodCategory);
    if (rating !== null) formData.append('rating', rating);

    // 삭제할 이미지 ID들
    deleteImageIds.forEach((id) => {
      formData.append('deleteImageIds', id);
    });

    // 새로 추가할 이미지들
    selectedFiles.forEach((file) => {
      formData.append('newImages', file);
    });

    // 게시글 수정 API 호출 (multipart/form-data)
    const result = await updatePostWithImages(formData);

    console.log('게시글 수정 성공:', result);

    alert('게시글이 수정되었습니다!');

    // 상세 페이지로 이동
    window.location.href = `/pages/posts/post-detail.html?id=${currentPostId}`;
  } catch (error) {
    console.error('게시글 수정 실패:', error);
    showError(error.message || '게시글 수정에 실패했습니다.');
  } finally {
    // 버튼 활성화
    submitBtn.disabled = false;
    submitBtn.textContent = '수정 완료';
  }
};

/**
 * 이미지 포함 게시글 수정 API
 */
const updatePostWithImages = async (formData) => {
  const memberId = getMemberId();
  const token = getToken();

  const headers = {};
  if (memberId) headers['Member-Id'] = memberId;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(
    `http://localhost:8080/api/posts/${currentPostId}`,
    {
      method: 'PUT',
      headers,
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '게시글 수정에 실패했습니다.');
  }

  return await response.json();
};

/**
 * 취소 처리
 */
const handleCancel = () => {
  if (confirm('수정을 취소하시겠습니까?')) {
    window.location.href = `/pages/posts/post-detail.html?id=${currentPostId}`;
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

/**
 * 로딩 표시
 */
const showLoading = () => {
  loading.style.display = 'block';
  editContent.style.display = 'none';
};

/**
 * 로딩 숨김
 */
const hideLoading = () => {
  loading.style.display = 'none';
  editContent.style.display = 'block';
};

// 초기화 실행
init();
