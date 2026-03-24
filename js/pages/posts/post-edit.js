/**
 * 게시글 수정 페이지 로직
 */

import { getPost } from '../../services/post-service.js';
import {
  validatePostTitle,
  validatePostContent,
} from '../../utils/validator.js';
import { getMemberId, getToken } from '../../utils/storage.js';
import httpClient from '../../utils/http-client.js';
import API_CONFIG from '../../config/api-config.js';
import {
  normalizeRestaurantListResponse,
  searchRestaurants,
} from '../../services/restaurant-service.js';
import { resolveImageUrl } from '../../utils/image-url.js';

// DOM 요소
const loading = document.getElementById('loading');
const editContent = document.getElementById('editContent');
const postEditForm = document.getElementById('postEditForm');
const titleInput = document.getElementById('title');
const restaurantNameInput = document.getElementById('restaurantName');
const restaurantAddressInput = document.getElementById('restaurantAddress');
const restaurantIdInput = document.getElementById('restaurantId');
const foodCategorySelect = document.getElementById('foodCategory');
const placeResults = document.getElementById('placeResults');
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
const tagInput = document.getElementById('tagInput');
const tagList = document.getElementById('tagList');
const tagSuggestions = document.getElementById('tagSuggestions');
const categoryOptions = new Set();
let lastPlaceResults = [];
const ratingStars = document.getElementById('ratingStars');
let selectedPlaceMeta = null;

// 카카오맵
let kakaoMap = null;
let kakaoMarker = null;
let kakaoGeocoder = null;

// 상태
let currentPostId = null;
let currentPost = null;
let selectedFiles = [];
let deleteImageIds = [];
const MAX_IMAGES = 10;
const MAX_TAGS = 10;
let selectedTags = [];
let tagDebounceId = null;
let isComposingTag = false;
let addressDebounceId = null;

const normalizeCategory = (category) => {
  if (!category) return '';
  return String(category).trim();
};

const ensureCategoryOption = (category) => {
  if (!foodCategorySelect) return;
  const normalized = normalizeCategory(category);
  if (!normalized || categoryOptions.has(normalized)) return;
  const option = document.createElement('option');
  option.value = normalized;
  option.textContent = normalized;
  foodCategorySelect.appendChild(option);
  categoryOptions.add(normalized);
};

const setCategoryOptions = (categories) => {
  if (!foodCategorySelect) return;
  const currentValue = foodCategorySelect.value;
  foodCategorySelect.innerHTML = '<option value="">카테고리 선택</option>';
  categoryOptions.clear();

  categories
    .filter(Boolean)
    .map((item) => normalizeCategory(item))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .forEach((category) => {
      ensureCategoryOption(category);
    });

  if (currentValue) {
    ensureCategoryOption(currentValue);
    foodCategorySelect.value = currentValue;
  }
};

const loadCategoryOptions = async () => {
  try {
    let result = await searchRestaurants('', 0, 50);
    let items = normalizeRestaurantListResponse(result).content || [];
    if (!items.length) {
      result = await searchRestaurants('강남', 0, 50);
      items = normalizeRestaurantListResponse(result).content || [];
    }
    const categories = items.map((item) => item.category || item.category_name);
    setCategoryOptions(categories);
  } catch (error) {
    console.error('카테고리 로드 실패:', error);
  }
};

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

  await loadCategoryOptions();
  initKakaoMap();

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
  const restaurant = post.restaurant || {};
  restaurantNameInput.value = restaurant.name || '';
  restaurantAddressInput.value = restaurant.address || '';
  if (restaurantIdInput) {
    const resolvedId = restaurant.id || post.restaurantId || '';
    restaurantIdInput.value = resolvedId;
    restaurantIdInput.dataset.originalId = resolvedId;
  }
  if (foodCategorySelect) {
    const normalized = normalizeCategory(restaurant.category);
    if (normalized) {
      ensureCategoryOption(normalized);
      foodCategorySelect.value = normalized;
    }
  }
  ratingInput.value = post.rating || '';
  contentTextarea.value = post.content || '';
  updateRatingStars();

  const latitude = restaurant.latitude ?? restaurant.lat ?? null;
  const longitude = restaurant.longitude ?? restaurant.lng ?? null;
  if (latitude && longitude) {
    updateMapByCoords(Number(latitude), Number(longitude));
  } else if (restaurant.address) {
    updateMapByAddress(restaurant.address);
  }

  // 기존 이미지 표시
  renderExistingImages(post.images || []);

  // 글자 수 업데이트
  updateContentCount();

  // 태그 렌더링
  selectedTags = post.tags || [];
  renderTags();
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
      <img src="${resolveImageUrl(img.fileUrl)}" alt="${img.originalFileName}">
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
  contentTextarea.addEventListener('blur', syncTagsFromContent);

  // 태그 입력
  tagInput.addEventListener('keydown', handleTagKeydown);
  tagInput.addEventListener('input', handleTagSearch);
  tagInput.addEventListener('compositionstart', () => {
    isComposingTag = true;
  });
  tagInput.addEventListener('compositionend', () => {
    isComposingTag = false;
  });

  if (restaurantAddressInput) {
    restaurantAddressInput.addEventListener('input', handleAddressInput);
    restaurantAddressInput.addEventListener('keydown', handleAddressKeydown);
  }

  if (ratingInput) {
    ratingInput.addEventListener('input', updateRatingStars);
  }

  // 입력 시 에러 메시지 숨김
  titleInput.addEventListener('input', hideError);
  contentTextarea.addEventListener('input', hideError);
};

const handleAddressInput = () => {
  const value = restaurantAddressInput.value.trim();
  if (addressDebounceId) window.clearTimeout(addressDebounceId);
  addressDebounceId = window.setTimeout(() => {
    if (!value) {
      if (restaurantIdInput) restaurantIdInput.value = '';
      clearPlaceResults();
      return;
    }
    searchPlacesByKeyword(value);
  }, 400);
};

const searchPlacesByKeyword = async (keyword) => {
  try {
    if (restaurantIdInput) restaurantIdInput.value = '';
    if (restaurantIdInput) {
      delete restaurantIdInput.dataset.placeId;
      delete restaurantIdInput.dataset.placeName;
      delete restaurantIdInput.dataset.placeAddress;
      delete restaurantIdInput.dataset.placeCategory;
      delete restaurantIdInput.dataset.placeLat;
      delete restaurantIdInput.dataset.placeLng;
      delete restaurantIdInput.dataset.placeUrl;
    }
    const result = await searchRestaurants(keyword, 0, 5);
    const places = normalizeRestaurantListResponse(result).content || [];
    if (places.length) {
      renderPlaceResults(places);
      return;
    }

    const kakaoPlaces = await searchKakaoPlaces(keyword);
    if (kakaoPlaces.length) {
      renderPlaceResults(kakaoPlaces);
      return;
    }

    renderPlaceResults([]);
  } catch (error) {
    console.error('장소 검색 실패:', error);
    renderPlaceResults([]);
  }
};

const searchKakaoPlaces = (keyword) => {
  return new Promise((resolve) => {
    httpClient
      .get(
        `${API_CONFIG.ENDPOINTS.POSTS_SEARCH_RESTAURANT}?keyword=${encodeURIComponent(keyword)}&page=1`,
      )
      .then((response) => {
        const docs =
          response?.documents ||
          response?.data?.documents ||
          response?.result?.documents ||
          [];
        const normalized = docs.map((doc) => ({
          id: null,
          placeId: doc.id || doc.placeId,
          name: doc.placeName || doc.place_name,
          address:
            doc.roadAddressName ||
            doc.road_address_name ||
            doc.addressName ||
            doc.address_name ||
            '',
          category: doc.categoryName || doc.category_name || '',
          lat: doc.y ? Number(doc.y) : doc.placeLatitude ?? null,
          lng: doc.x ? Number(doc.x) : doc.placeLongitude ?? null,
          placeUrl: doc.placeUrl || doc.place_url || '',
          source: 'kakao',
        }));
        resolve(normalized);
      })
      .catch(() => resolve([]));
  });
};

const handleAddressKeydown = (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (lastPlaceResults.length > 0) {
    const [first] = lastPlaceResults;
    selectPlace(first);
  }
};

const renderPlaceResults = (places) => {
  if (!placeResults) return;
  if (!places || places.length === 0) {
    clearPlaceResults();
    return;
  }

  const normalized = places
    .map((place) => ({
      id: place.id || null,
      placeId: place.placeId || place.id || null,
      name: place.name || place.place_name || place.placeName,
      address:
        place.address ||
        place.address_name ||
        place.road_address_name ||
        '',
      category:
        place.category ||
        place.category_name ||
        place.categoryName ||
        '',
      lat: place.lat ?? place.y ?? null,
      lng: place.lng ?? place.x ?? null,
      placeUrl: place.placeUrl || place.place_url || '',
      source: place.source || (place.id ? 'db' : 'kakao'),
    }))
    .filter((place) => place.name || place.address);

  if (!normalized.length) {
    clearPlaceResults();
    return;
  }

  lastPlaceResults = normalized;

  if (normalized.length === 1) {
    selectPlace(normalized[0]);
    return;
  }

  placeResults.innerHTML = normalized
    .slice(0, 5)
    .map(
      (place) => `
        <div class="place-result-item" data-id="${place.id || ''}" data-place-id="${place.placeId || ''}" data-place-url="${place.placeUrl || ''}" data-name="${place.name || ''}" data-address="${place.address}" data-category="${place.category || ''}" data-lat="${place.lat ?? ''}" data-lng="${place.lng ?? ''}">
          <div class="place-result-name">${place.name || '이름 없음'}</div>
          <div class="place-result-address">${place.address || '주소 정보 없음'}</div>
          <div class="place-result-meta">${place.category || '카테고리 정보 없음'}</div>
        </div>
      `,
    )
    .join('');

  placeResults.style.display = 'block';
  placeResults.onclick = (e) => {
    const item = e.target.closest('.place-result-item');
    if (!item) return;
    const id = item.dataset.id;
    const placeId = item.dataset.placeId;
    const placeUrl = item.dataset.placeUrl;
    const name = item.dataset.name;
    const address = item.dataset.address;
    const category = item.dataset.category;
    const lat = item.dataset.lat ? Number(item.dataset.lat) : null;
    const lng = item.dataset.lng ? Number(item.dataset.lng) : null;
    selectPlace({ id, placeId, placeUrl, name, address, category, lat, lng });
  };
};

const clearPlaceResults = () => {
  if (!placeResults) return;
  placeResults.innerHTML = '';
  placeResults.style.display = 'none';
  lastPlaceResults = [];
};

const selectPlace = ({ id, placeId, placeUrl, name, address, category, lat, lng }) => {
  if (restaurantNameInput && name) restaurantNameInput.value = name;
  if (restaurantAddressInput && address) restaurantAddressInput.value = address;
  if (restaurantIdInput) {
    restaurantIdInput.value = id || '';
    if (!id && placeId) {
      restaurantIdInput.dataset.placeId = placeId;
      restaurantIdInput.dataset.placeName = name || '';
      restaurantIdInput.dataset.placeAddress = address || '';
      restaurantIdInput.dataset.placeCategory = category || '';
      restaurantIdInput.dataset.placeLat = lat ?? '';
      restaurantIdInput.dataset.placeLng = lng ?? '';
      restaurantIdInput.dataset.placeUrl = placeUrl || '';
    } else {
      delete restaurantIdInput.dataset.placeId;
    }
  }
  if (foodCategorySelect && category) {
    const normalized = normalizeCategory(category);
    if (normalized) {
      ensureCategoryOption(normalized);
      foodCategorySelect.value = normalized;
    }
  }

  selectedPlaceMeta = {
    restaurantId: id || '',
    placeId: placeId || '',
    placeName: name || '',
    placeAddress: address || '',
    placeCategory: category || '',
    placeLatitude: lat ?? null,
    placeLongitude: lng ?? null,
    placeUrl: placeUrl || '',
  };

  if (lat && lng) {
    updateMapByCoords(lat, lng);
  }
  clearPlaceResults();
};

const handleTagKeydown = (e) => {
  if (isComposingTag) return;
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addTagFromInput();
  }
  if (e.key === 'Backspace' && !tagInput.value && selectedTags.length > 0) {
    removeTag(selectedTags[selectedTags.length - 1]);
  }
};

const handleTagSearch = () => {
  const keyword = tagInput.value.trim();
  if (tagDebounceId) window.clearTimeout(tagDebounceId);
  tagDebounceId = window.setTimeout(async () => {
    if (!keyword) {
      hideTagSuggestions();
      return;
    }
    try {
      const result = await httpClient.get(
        `${API_CONFIG.ENDPOINTS.TAGS_SEARCH}?keyword=${encodeURIComponent(keyword)}`,
      );
      renderTagSuggestions(result || []);
    } catch (error) {
      console.error('태그 검색 실패:', error);
      hideTagSuggestions();
    }
  }, 300);
};

const addTagFromInput = () => {
  const raw = tagInput.value.trim().replace(/^#/, '');
  if (!raw) return;
  const tokens = raw
    .split(/[#\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  if (tokens.length === 0) {
    tagInput.value = '';
    return;
  }
  tokens.forEach((token) => addTag(token));
  tagInput.value = '';
  hideTagSuggestions();
};

const addTag = (tag) => {
  if (!tag) return;
  if (selectedTags.includes(tag)) return;
  if (selectedTags.length >= MAX_TAGS) {
    alert(`태그는 최대 ${MAX_TAGS}개까지 추가할 수 있습니다.`);
    return;
  }
  selectedTags.push(tag);
  renderTags();
};

const removeTag = (tag) => {
  selectedTags = selectedTags.filter((t) => t !== tag);
  renderTags();
};

const renderTags = () => {
  if (!tagList) return;
  tagList.innerHTML = selectedTags
    .map(
      (tag) => `
      <span class="tag-chip">
        #${tag}
        <button type="button" class="tag-remove" data-tag="${tag}">×</button>
      </span>
    `,
    )
    .join('');

  tagList.querySelectorAll('.tag-remove').forEach((btn) => {
    btn.addEventListener('click', () => removeTag(btn.dataset.tag));
  });
};

const renderTagSuggestions = (tags) => {
  if (!tagSuggestions) return;
  if (!tags.length) {
    hideTagSuggestions();
    return;
  }

  tagSuggestions.innerHTML = tags
    .slice(0, 6)
    .map(
      (tag) => `
      <div class="tag-suggestion-item" data-tag="${tag.name}">
        #${tag.name}
      </div>
    `,
    )
    .join('');
  tagSuggestions.style.display = 'block';

  tagSuggestions.querySelectorAll('.tag-suggestion-item').forEach((item) => {
    item.addEventListener('click', () => {
      addTag(item.dataset.tag);
      tagInput.value = '';
      hideTagSuggestions();
    });
  });
};

const hideTagSuggestions = () => {
  if (!tagSuggestions) return;
  tagSuggestions.style.display = 'none';
  tagSuggestions.innerHTML = '';
};

/**
 * 본문에서 #태그 추출
 */
const syncTagsFromContent = () => {
  const content = contentTextarea.value || '';
  const matches = content.match(/#[^\s#]+/g) || [];
  if (matches.length === 0) return;

  matches
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean)
    .forEach((tag) => addTag(tag));
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
  const foodCategory = foodCategorySelect ? foodCategorySelect.value : '';
  const restaurantId = restaurantIdInput ? restaurantIdInput.value.trim() : '';
  const placeId = restaurantIdInput?.dataset?.placeId || selectedPlaceMeta?.placeId || '';
  const rating = ratingInput.value ? parseFloat(ratingInput.value) : null;
  const content = contentTextarea.value.trim();

  // 유효성 검사
  if (!validatePostTitle(title)) {
    showError('제목은 1-100자 사이여야 합니다.');
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

  const originalRestaurantId =
    restaurantIdInput?.dataset?.originalId ||
    currentPost?.restaurant?.id ||
    currentPost?.restaurantId ||
    '';
  if (!restaurantId && !originalRestaurantId && !placeId) {
    showError('맛집을 검색해서 선택해주세요.');
    restaurantAddressInput.focus();
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
    if (restaurantId || originalRestaurantId) {
      formData.append('restaurantId', restaurantId || originalRestaurantId);
    } else if (placeId) {
      formData.append('placeId', placeId);
      formData.append(
        'placeName',
        restaurantIdInput?.dataset?.placeName || selectedPlaceMeta?.placeName || restaurantName || '',
      );
      formData.append(
        'placeAddress',
        restaurantIdInput?.dataset?.placeAddress || selectedPlaceMeta?.placeAddress || restaurantAddress || '',
      );
      formData.append(
        'placeCategory',
        restaurantIdInput?.dataset?.placeCategory || selectedPlaceMeta?.placeCategory || foodCategory || '',
      );
      if (restaurantIdInput?.dataset?.placeLat || selectedPlaceMeta?.placeLatitude) {
        formData.append(
          'placeLatitude',
          restaurantIdInput?.dataset?.placeLat || selectedPlaceMeta?.placeLatitude,
        );
      }
      if (restaurantIdInput?.dataset?.placeLng || selectedPlaceMeta?.placeLongitude) {
        formData.append(
          'placeLongitude',
          restaurantIdInput?.dataset?.placeLng || selectedPlaceMeta?.placeLongitude,
        );
      }
      if (restaurantIdInput?.dataset?.placeUrl || selectedPlaceMeta?.placeUrl) {
        formData.append(
          'placeUrl',
          restaurantIdInput?.dataset?.placeUrl || selectedPlaceMeta?.placeUrl,
        );
      }
    }
    if (rating !== null) formData.append('rating', rating);

    // 태그 목록 (전체 교체, 중복 제거)
    const uniqueTags = Array.from(
      new Set((selectedTags || []).map((tag) => String(tag).trim()).filter(Boolean)),
    );
    uniqueTags.forEach((tag) => {
      formData.append('tagNames', tag);
    });

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
    `${API_CONFIG.BASE_URL}/posts/${currentPostId}`,
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

const updateRatingStars = () => {
  if (!ratingStars || !ratingInput) return;
  const stars = ratingStars.querySelectorAll('.star');
  const value = parseFloat(ratingInput.value);

  stars.forEach((star) => {
    star.classList.remove('full', 'half', 'empty');
    star.classList.add('empty');
  });

  if (Number.isNaN(value) || value <= 0) {
    return;
  }

  const clamped = Math.max(0, Math.min(5, value));
  let fullCount = Math.floor(clamped);
  let hasHalf = false;

  if (clamped >= 5) {
    fullCount = 5;
  } else {
    const fractional = clamped - fullCount;
    if (fractional > 0) {
      hasHalf = true;
    }
  }

  for (let i = 0; i < fullCount && i < stars.length; i += 1) {
    stars[i].classList.remove('empty');
    stars[i].classList.add('full');
  }

  if (hasHalf && fullCount < stars.length) {
    const target = stars[fullCount];
    target.classList.remove('empty');
    target.classList.add('half');
  }
};

const initKakaoMap = () => {
  const mapContainer = document.getElementById('kakaoMap');
  if (!mapContainer) return;

  if (!window.kakao || !window.kakao.maps) {
    console.warn('카카오맵 SDK가 로드되지 않았습니다.');
    mapContainer.innerHTML =
      '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--gray-500);font-size:var(--font-sm);">지도 로딩에 실패했습니다. 도메인/키 설정을 확인해주세요.</div>';
    return;
  }

  const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.9780);
  kakaoMap = new window.kakao.maps.Map(mapContainer, {
    center: defaultCenter,
    level: 4,
  });

  kakaoMarker = new window.kakao.maps.Marker({
    position: defaultCenter,
  });
  kakaoMarker.setMap(kakaoMap);

  kakaoGeocoder = new window.kakao.maps.services.Geocoder();
};

const updateMapByAddress = (address) => {
  if (!kakaoGeocoder || !kakaoMap || !kakaoMarker) return;

  kakaoGeocoder.addressSearch(address, (result, status) => {
    if (status !== window.kakao.maps.services.Status.OK) return;
    const { x, y } = result[0];
    const position = new window.kakao.maps.LatLng(y, x);
    kakaoMap.setCenter(position);
    kakaoMarker.setPosition(position);
  });
};

const updateMapByCoords = (lat, lng) => {
  if (!kakaoMap || !kakaoMarker) return;
  const position = new window.kakao.maps.LatLng(lat, lng);
  kakaoMap.setCenter(position);
  kakaoMarker.setPosition(position);
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
