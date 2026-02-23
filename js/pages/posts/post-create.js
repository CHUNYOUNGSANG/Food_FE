/**
 * 게시글 작성 페이지 로직
 */

import httpClient from '../../utils/http-client.js';
import API_CONFIG from '../../config/api-config.js';
import {
  validatePostTitle,
  validatePostContent,
} from '../../utils/validator.js';
import { getMemberId, getToken } from '../../utils/storage.js';
import {
  searchRestaurants,
  getRestaurantDetail,
  normalizeRestaurantListResponse,
} from '../../services/restaurant-service.js';

// DOM 요소
const postCreateForm = document.getElementById('postCreateForm');
const titleInput = document.getElementById('title');
const restaurantNameInput = document.getElementById('restaurantName');
const restaurantAddressInput = document.getElementById('restaurantAddress');
const restaurantIdInput = document.getElementById('restaurantId');
const foodCategorySelect = document.getElementById('foodCategory');
const ratingInput = document.getElementById('rating');
const ratingStars = document.getElementById('ratingStars');
const imageFilesInput = document.getElementById('imageFiles');
const imagePreview = document.getElementById('imagePreview');
const contentTextarea = document.getElementById('content');
const contentCount = document.getElementById('contentCount');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');
const tagInput = document.getElementById('tagInput');
const tagList = document.getElementById('tagList');
const tagSuggestions = document.getElementById('tagSuggestions');

// 이미지 파일 관리
let selectedFiles = [];
const MAX_IMAGES = 10;

// 카카오맵
let kakaoMap = null;
let kakaoMarker = null;
let kakaoGeocoder = null;
let addressDebounceId = null;
const placeResults = document.getElementById('placeResults');

// 태그
const MAX_TAGS = 10;
let selectedTags = [];
let tagDebounceId = null;
let isComposingTag = false;
const categoryOptions = new Set();
let lastPlaceResults = [];
let selectedPlaceMeta = null;

/**
 * 초기화
 */
const init = () => {
  checkAuth();
  initKakaoMap();
  loadCategoryOptions();
  attachEventListeners();
  applyRestaurantFromQuery();
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
  contentTextarea.removeEventListener?.('blur', syncTagsFromContent);

  // 평점 별 업데이트
  if (ratingInput) {
    ratingInput.addEventListener('input', updateRatingStars);
  }

  // 주소 입력 시 지도 업데이트
  restaurantAddressInput.addEventListener('input', handleAddressInput);
  restaurantAddressInput.addEventListener('keydown', handleAddressKeydown);

  // 태그 입력 (태그 입력칸이 있을 때만)
  if (tagInput) {
    tagInput.addEventListener('keydown', handleTagKeydown);
    tagInput.addEventListener('input', handleTagSearch);
    tagInput.addEventListener('compositionstart', () => {
      isComposingTag = true;
    });
    tagInput.addEventListener('compositionend', () => {
      isComposingTag = false;
    });
  }

  // 입력 시 에러 메시지 숨김
  titleInput.addEventListener('input', hideError);
  contentTextarea.addEventListener('input', hideError);
};

const updateRatingStars = () => {
  if (!ratingStars) return;
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
  foodCategorySelect.innerHTML = '<option value="">카테고리</option>';
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
 * 카카오맵 초기화
 */
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

/**
 * 주소 입력 디바운스 처리
 */
const handleAddressInput = () => {
  const value = restaurantAddressInput.value.trim();

  if (addressDebounceId) {
    window.clearTimeout(addressDebounceId);
  }

  addressDebounceId = window.setTimeout(() => {
    if (!value) {
      if (restaurantIdInput) restaurantIdInput.value = '';
      clearPlaceResults();
      return;
    }
    searchPlacesByKeyword(value);
  }, 400);
};

/**
 * 장소 키워드 검색
 */
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
    updateMapByAddress(keyword);
  } catch (error) {
    console.error('장소 검색 실패:', error);
    renderPlaceResults([]);
    updateMapByAddress(keyword);
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
          address: doc.roadAddressName || doc.road_address_name || doc.addressName || doc.address_name || '',
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

/**
 * 검색 결과 렌더링
 */
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

  const html = normalized
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

  placeResults.innerHTML = html;
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

/**
 * 검색 결과 초기화
 */
const clearPlaceResults = () => {
  if (!placeResults) return;
  placeResults.innerHTML = '';
  placeResults.style.display = 'none';
  lastPlaceResults = [];
};

/**
 * 장소 선택 처리
 */
const selectPlace = ({ id, placeId, placeUrl, name, address, category, lat, lng }) => {
  if (address) {
    restaurantAddressInput.value = address;
  }

  if (restaurantNameInput && name) {
    restaurantNameInput.value = name;
  }

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

  if (foodCategorySelect && category) {
    const normalized = normalizeCategory(category);
    if (normalized) {
      ensureCategoryOption(normalized);
      foodCategorySelect.value = normalized;
    }
  }

  if (!kakaoMap || !kakaoMarker) {
    initKakaoMap();
  }

  if (lat && lng) {
    updateMapByCoords(lat, lng);
  } else if (id) {
    updateMapByRestaurant(id, address);
  } else if (address) {
    updateMapByAddress(address);
  }

  clearPlaceResults();
};

/**
 * 태그 입력 키 처리
 */
const handleTagKeydown = (e) => {
  if (!tagInput) return;
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
  if (!tagInput) return;
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
  if (!tagInput) return;
  const raw = tagInput.value.trim();
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
const syncTagsFromContent = () => {};

const updateMapByRestaurant = async (restaurantId, fallbackAddress = '') => {
  if (!kakaoMap || !kakaoMarker) return;
  try {
    const detail = await getRestaurantDetail(restaurantId);
    const latitude = detail?.latitude;
    const longitude = detail?.longitude;
    if (
      latitude !== null &&
      longitude !== null &&
      latitude !== undefined &&
      longitude !== undefined
    ) {
      const position = new window.kakao.maps.LatLng(latitude, longitude);
      kakaoMap.setCenter(position);
      kakaoMarker.setPosition(position);
      return;
    }
    const address = detail?.address || fallbackAddress;
    if (address) updateMapByAddress(address);
  } catch (error) {
    if (fallbackAddress) updateMapByAddress(fallbackAddress);
  }
};

/**
 * 주소로 지도 업데이트
 */
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

const applyRestaurantFromQuery = async () => {
  const params = new URLSearchParams(window.location.search);
  const restaurantId = params.get('restaurantId');
  if (!restaurantId) return;
  try {
    if (restaurantIdInput) restaurantIdInput.value = restaurantId;
    const detail = await getRestaurantDetail(restaurantId);
    if (!detail) return;
    if (restaurantNameInput) restaurantNameInput.value = detail.name || '';
    if (restaurantAddressInput)
      restaurantAddressInput.value = detail.address || '';
    if (foodCategorySelect) {
      const normalized = normalizeCategory(detail.category);
      if (normalized) {
        ensureCategoryOption(normalized);
        foodCategorySelect.value = normalized;
      }
    }
    updateMapByRestaurant(restaurantId, detail.address);
  } catch (error) {
    console.error('맛집 정보 로드 실패:', error);
  }
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
  const restaurantName = restaurantNameInput ? restaurantNameInput.value.trim() : '';
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

  if (restaurantNameInput && !restaurantName) {
    showError('맛집 이름을 입력해주세요.');
    restaurantNameInput.focus();
    return;
  }

  if (!validatePostContent(content)) {
    showError('리뷰 내용을 입력해주세요.');
    contentTextarea.focus();
    return;
  }

  if (!restaurantId && !placeId) {
    showError('맛집을 검색해서 선택해주세요.');
    restaurantAddressInput.focus();
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
  if (restaurantId) {
    formData.append('restaurantId', restaurantId);
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
  formData.append('content', content);

    // 이미지 파일들 추가
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    // 태그 추가 (중복 제거)
    const uniqueTags = Array.from(
      new Set((selectedTags || []).map((tag) => String(tag).trim()).filter(Boolean)),
    );
    uniqueTags.forEach((tag) => {
      formData.append('tagNames', tag);
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
