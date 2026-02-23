/**
 * 맛집 상세 페이지 로직
 */

import {
  getRestaurantDetail,
  getRestaurantPosts,
} from '../../services/restaurant-service.js';
import { getPost } from '../../services/post-service.js';
import { formatDate } from '../../utils/date-formatter.js';
import { resolveImageCandidates } from '../../utils/image-url.js';
import { getMemberId, getToken } from '../../utils/storage.js';

const loading = document.getElementById('loading');
const restaurantHeader = document.getElementById('restaurantHeader');
const restaurantName = document.getElementById('restaurantName');
const restaurantAddress = document.getElementById('restaurantAddress');
const restaurantCategory = document.getElementById('restaurantCategory');
const restaurantPlaceLink = document.getElementById('restaurantPlaceLink');
const restaurantReviewLink = document.getElementById('restaurantReviewLink');
const restaurantEmptyReviewLink = document.getElementById(
  'restaurantEmptyReviewLink',
);
const restaurantMap = document.getElementById('restaurantMap');
const reviewList = document.getElementById('reviewList');
const reviewEmpty = document.getElementById('reviewEmpty');
const reviewCount = document.getElementById('reviewCount');
const avgRatingEl = document.getElementById('restaurantAvgRating');
const totalReviewEl = document.getElementById('restaurantReviewCount');
const gallerySection = document.getElementById('restaurantGallery');
const galleryGrid = document.getElementById('galleryGrid');
const reviewSort = document.getElementById('reviewSort');
const reviewPrev = document.getElementById('reviewPrev');
const reviewNext = document.getElementById('reviewNext');
const reviewPageInfo = document.getElementById('reviewPageInfo');
const reviewPagination = document.getElementById('reviewPagination');
const modal = document.getElementById('galleryModal');
const modalImage = document.getElementById('galleryModalImage');
const modalClose = document.getElementById('galleryModalClose');
const modalBackdrop = document.querySelector('.gallery-modal-backdrop');

let map = null;
let marker = null;
let currentRestaurantId = null;
let currentPage = 0;
let totalPages = 0;
const pageSize = 6;

const init = async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = '/index.html';
    return;
  }
  currentRestaurantId = id;

  try {
    showLoading(true);
    const detail = await getRestaurantDetail(id);
    renderDetail(detail);
    await loadReviews(id);
    attachEvents();
  } catch (error) {
    console.error('맛집 상세 로드 실패:', error);
  } finally {
    showLoading(false);
  }
};

const showLoading = (state) => {
  if (!loading) return;
  loading.style.display = state ? 'block' : 'none';
};

const renderDetail = (detail) => {
  if (!detail) return;
  if (restaurantHeader) restaurantHeader.style.display = 'grid';

  restaurantName.textContent = detail.name || '맛집명 없음';
  restaurantAddress.textContent = detail.address || '주소 정보 없음';
  restaurantCategory.textContent = normalizeCategory(detail.category) || '기타';

  if (detail.placeUrl) {
    restaurantPlaceLink.href = detail.placeUrl;
    restaurantPlaceLink.style.display = 'inline-flex';
  } else {
    restaurantPlaceLink.style.display = 'none';
  }

  if (restaurantReviewLink) {
    restaurantReviewLink.href = `/pages/posts/post-create.html?restaurantId=${detail.id}`;
  }
  if (restaurantEmptyReviewLink) {
    restaurantEmptyReviewLink.href = `/pages/posts/post-create.html?restaurantId=${detail.id}`;
  }

  renderMap(detail.latitude, detail.longitude, detail.address);
};

const renderMap = (latitude, longitude, address) => {
  if (!restaurantMap) return;
  if (!window.kakao || !window.kakao.maps) return;

  const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.9780);
  map = new window.kakao.maps.Map(restaurantMap, {
    center: defaultCenter,
    level: 4,
  });
  marker = new window.kakao.maps.Marker({ position: defaultCenter });
  marker.setMap(map);

  if (
    latitude !== null &&
    longitude !== null &&
    latitude !== undefined &&
    longitude !== undefined
  ) {
    const position = new window.kakao.maps.LatLng(latitude, longitude);
    map.setCenter(position);
    marker.setPosition(position);
    return;
  }

  if (address) {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK) return;
      const { x, y } = result[0];
      const position = new window.kakao.maps.LatLng(y, x);
      map.setCenter(position);
      marker.setPosition(position);
    });
  }
};

const loadReviews = async (restaurantId) => {
  const result = await getRestaurantPosts(restaurantId, currentPage, pageSize);
  const items = result?.content || [];
  const total = result?.totalElements ?? items.length;
  totalPages = result?.totalPages ?? 1;
  if (reviewCount) reviewCount.textContent = `${total}개`;
  if (totalReviewEl) totalReviewEl.textContent = `${total}`;

  if (reviewPagination) {
    reviewPagination.style.display = totalPages > 1 ? 'flex' : 'none';
  }
  if (reviewPageInfo) {
    reviewPageInfo.textContent = `${currentPage + 1} / ${Math.max(totalPages, 1)}`;
  }

  const sortedItems = sortReviews(items, reviewSort?.value || 'latest');
  const avg =
    sortedItems.length > 0
      ? sortedItems.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) /
        sortedItems.length
      : 0;
  if (avgRatingEl) avgRatingEl.textContent = avg.toFixed(1);

  if (!sortedItems.length) {
    reviewList.innerHTML = '';
    reviewEmpty.style.display = 'flex';
    return;
  }

  reviewEmpty.style.display = 'none';
  loadGalleryFromReviews(sortedItems);
  reviewList.innerHTML = sortedItems
    .map(
      (review) => `
      <a class="review-card" href="/pages/posts/post-detail.html?id=${review.postId}">
        <div class="review-title">${review.title || '제목 없음'}</div>
        <div class="review-meta">
          <span class="review-rating">⭐ ${Number(review.rating || 0).toFixed(1)}</span>
          <span>${review.memberName || '익명'}</span>
          <span>👁️ ${review.viewCount || 0}</span>
          <span>${formatDate(review.createdAt)}</span>
        </div>
      </a>
    `,
    )
    .join('');
};

const sortReviews = (items, sortKey) => {
  const list = [...items];
  switch (sortKey) {
    case 'rating':
      return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'views':
      return list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    default:
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};

const loadGalleryFromReviews = async (reviews) => {
  if (!gallerySection || !galleryGrid) return;
  const ids = reviews.map((review) => review.postId).slice(0, 6);
  const posts = await Promise.all(ids.map((id) => getPost(id).catch(() => null)));
  const images = posts
    .flatMap((post) => extractPostImageUrls(post))
    .filter(Boolean)
    .slice(0, 8);

  if (!images.length) {
    gallerySection.style.display = 'none';
    return;
  }

  gallerySection.style.display = 'block';
  galleryGrid.innerHTML = images
    .map((url) => {
      const [primary] = resolveImageCandidates(url);
      return `
        <div class="gallery-item">
          <img src="${primary}" alt="맛집 사진" loading="lazy" data-full="${primary}" />
        </div>
      `;
    })
    .join('');

  galleryGrid.querySelectorAll('img').forEach((img) => {
    img.addEventListener('click', () => openModal(img.dataset.full || img.src));
  });
};

const extractPostImageUrls = (postData) => {
  if (!postData) return [];
  const urls = [];
  const list =
    postData.images ||
    postData.imageUrls ||
    postData.imageList ||
    postData.files ||
    postData.postImages ||
    null;

  if (Array.isArray(list)) {
    list.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string') {
        urls.push(item);
        return;
      }
      const candidate =
        item.fileUrl ||
        item.imageUrl ||
        item.url ||
        item.path ||
        item.filePath ||
        item.storedFileName ||
        item.storedPath ||
        '';
      if (candidate) urls.push(candidate);
    });
  }

  if (postData.imageUrl) urls.push(postData.imageUrl);
  if (postData.thumbnailUrl) urls.push(postData.thumbnailUrl);

  return [...new Set(urls.filter(Boolean))];
};

const normalizeCategory = (category) => {
  if (!category) return '';
  const text = String(category);
  const parts = text.split('>').map((part) => part.trim());
  const last = parts[parts.length - 1] || text;
  const candidates = ['한식', '중식', '일식', '양식', '카페'];
  return candidates.find((item) => last.includes(item)) || '';
};

const attachEvents = () => {
  if (reviewSort) {
    reviewSort.addEventListener('change', () => loadReviews(currentRestaurantId));
  }
  if (reviewPrev) {
    reviewPrev.addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage -= 1;
        loadReviews(currentRestaurantId);
      }
    });
  }
  if (reviewNext) {
    reviewNext.addEventListener('click', () => {
      if (currentPage < totalPages - 1) {
        currentPage += 1;
        loadReviews(currentRestaurantId);
      }
    });
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
};

const openModal = (src) => {
  if (!modal || !modalImage) return;
  modalImage.src = src;
  modal.style.display = 'block';
};

const closeModal = () => {
  if (!modal || !modalImage) return;
  modal.style.display = 'none';
  modalImage.src = '';
};

init();
