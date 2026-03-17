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
import { isAdmin } from '../../utils/storage.js';


// DOM 요소
const loading = document.getElementById('loading');
const restaurantHeader = document.getElementById('restaurantHeader');
const restaurantName = document.getElementById('restaurantName');
const restaurantAddress = document.getElementById('restaurantAddress');
const restaurantCategory = document.getElementById('restaurantCategory');
const restaurantPlaceLink = document.getElementById('restaurantPlaceLink');
const restaurantReviewLink = document.getElementById('restaurantReviewLink');
const restaurantEmptyReviewLink = document.getElementById('restaurantEmptyReviewLink');
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

// 신규 UI 요소
const restaurantPhone = document.getElementById('restaurantPhone');
const restaurantAddressInfo = document.getElementById('restaurantAddressInfo');
const restaurantCallBtn = document.getElementById('restaurantCallBtn');
const restaurantNaviLink = document.getElementById('restaurantNaviLink');
const restaurantHeroBg = document.getElementById('restaurantHeroBg');
const ratingBars = document.getElementById('ratingBars');
const avgRatingBigEl = document.getElementById('restaurantAvgRatingBig');
const ratingStarsDisplay = document.getElementById('ratingStarsDisplay');
const reviewCountSummary = document.getElementById('reviewCountSummary');
const photoCountBadge = document.getElementById('photoCountBadge');
const copyAddressBtn = document.getElementById('copyAddressBtn');
const menuKakaoLink = document.getElementById('menuKakaoLink');

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
    if (isAdmin()) {
      const reviewLink = document.getElementById('restaurantReviewLink');
      const emptyReviewLink = document.getElementById('restaurantEmptyReviewLink');
      if (reviewLink) reviewLink.style.display = 'none';
      if (emptyReviewLink) emptyReviewLink.style.display = 'none';
    }
  } catch (error) {
    console.error('맛집 상세 로드 실패:', error);
  } finally {
    showLoading(false);
  }
};

const showLoading = (state) => {
  if (!loading) return;
  loading.style.display = state ? 'flex' : 'none';
};

const renderDetail = (detail) => {
  if (!detail) return;
  if (restaurantHeader) restaurantHeader.style.display = 'block';

  restaurantName.textContent = detail.name || '맛집명 없음';
  restaurantAddress.textContent = detail.address || '주소 정보 없음';
  restaurantCategory.textContent = normalizeCategory(detail.category) || '기타';

  // 주소 정보 섹션
  if (restaurantAddressInfo) {
    restaurantAddressInfo.textContent = detail.address || '주소 정보 없음';
  }

  // 카카오맵 링크
  if (detail.placeUrl) {
    if (restaurantPlaceLink) {
      restaurantPlaceLink.href = detail.placeUrl;
      restaurantPlaceLink.style.display = 'flex';
    }
    // 메뉴 카카오 링크
    if (menuKakaoLink) {
      menuKakaoLink.href = detail.placeUrl;
      menuKakaoLink.style.display = 'inline';
    }
    // 길찾기 링크
    if (restaurantNaviLink && detail.name) {
      const naviQuery = encodeURIComponent(detail.name + ' ' + (detail.address || ''));
      restaurantNaviLink.href = `https://map.kakao.com/?q=${naviQuery}`;
    }
  } else {
    if (restaurantNaviLink && detail.address) {
      restaurantNaviLink.href = `https://map.kakao.com/?q=${encodeURIComponent(detail.address)}`;
    }
  }

  // 리뷰 작성 링크
  if (restaurantReviewLink) {
    restaurantReviewLink.href = `/pages/posts/post-create.html?restaurantId=${detail.id}`;
  }
  if (restaurantEmptyReviewLink) {
    restaurantEmptyReviewLink.href = `/pages/posts/post-create.html?restaurantId=${detail.id}`;
  }

  // 전화 버튼 (Kakao Places 검색 전 기본값)
  if (restaurantCallBtn) {
    restaurantCallBtn.href = 'tel:';
  }

  // 지도 초기화
  renderMap(detail.latitude, detail.longitude, detail.address);

  // Kakao Places에서 전화번호 등 추가 정보 조회
  if (detail.name) {
    loadKakaoPlaceInfo(detail.name, detail.address);
  }
};

/**
 * Kakao Places 검색으로 전화번호 가져오기
 */
const loadKakaoPlaceInfo = (name, address) => {
  if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
    return;
  }

  const ps = new window.kakao.maps.services.Places();
  const keyword = address ? `${name} ${address}` : name;

  ps.keywordSearch(
    keyword,
    (data, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !data || !data.length) {
        return;
      }

      const place = data[0];

      // 전화번호
      if (place.phone && restaurantPhone) {
        restaurantPhone.textContent = place.phone;
        if (restaurantCallBtn) {
          restaurantCallBtn.href = `tel:${place.phone.replace(/[^0-9]/g, '')}`;
        }
      }

      // 카카오맵 링크 (placeUrl이 없었을 경우 보완)
      if (place.place_url) {
        if (restaurantPlaceLink && restaurantPlaceLink.href === '#') {
          restaurantPlaceLink.href = place.place_url;
          restaurantPlaceLink.style.display = 'flex';
        }
        if (menuKakaoLink && menuKakaoLink.href === '#') {
          menuKakaoLink.href = place.place_url;
          menuKakaoLink.style.display = 'inline';
        }
      }

      // 길찾기 링크 보완
      if (restaurantNaviLink && place.y && place.x) {
        restaurantNaviLink.href =
          `https://map.kakao.com/link/to/${encodeURIComponent(place.place_name || name)},${place.y},${place.x}`;
      }
    },
    { size: 1 },
  );
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
  if (reviewCountSummary) reviewCountSummary.textContent = `${total}`;

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
  if (avgRatingBigEl) avgRatingBigEl.textContent = avg.toFixed(1);

  renderRatingStars(avg);
  renderRatingBars(sortedItems);

  if (!sortedItems.length) {
    reviewList.innerHTML = '';
    reviewEmpty.style.display = 'flex';
    return;
  }

  reviewEmpty.style.display = 'none';
  loadGalleryFromReviews(sortedItems);
  reviewList.innerHTML = sortedItems.map((review) => renderCommentCard(review)).join('');
};

/**
 * 별점 HTML 렌더링 (히어로 요약용)
 */
const renderRatingStars = (avg) => {
  if (!ratingStarsDisplay) return;
  const clamped = Math.max(0, Math.min(5, avg));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.3;
  let html = '';
  for (let i = 0; i < 5; i += 1) {
    if (i < full) {
      html += '<i class="ri-star-fill"></i>';
    } else if (i === full && hasHalf) {
      html += '<i class="ri-star-half-fill"></i>';
    } else {
      html += '<i class="ri-star-line" style="color:#e5e7eb;"></i>';
    }
  }
  ratingStarsDisplay.innerHTML = html;
};

/**
 * 평점 분포 바 렌더링
 */
const renderRatingBars = (items) => {
  if (!ratingBars) return;
  const counts = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: items.filter((item) => Math.round(Number(item.rating) || 0) === n).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);
  ratingBars.innerHTML = counts
    .map(
      ({ n, count }) => `
      <div class="rd-bar-row">
        <span class="rd-bar-label">${n}</span>
        <i class="ri-star-fill rd-bar-star"></i>
        <div class="rd-bar-track">
          <div class="rd-bar-fill" style="width:${Math.round((count / max) * 100)}%"></div>
        </div>
        <span class="rd-bar-count">${count}</span>
      </div>
    `,
    )
    .join('');
};

/**
 * 댓글 카드 HTML 렌더링
 */
const renderCommentCard = (review) => {
  const name = review.memberName || review.memberNickname || '익명';
  const rating = Number(review.rating || 0);
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < Math.round(rating)
      ? '<i class="ri-star-fill"></i>'
      : '<i class="ri-star-line" style="color:#e5e7eb;"></i>',
  ).join('');

  return `
    <div class="rd-comment-card">
      <div class="rd-comment-top">
        <div class="rd-comment-author">
          <div class="rd-comment-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
          <div>
            <p class="rd-comment-name">${escapeHtml(name)}</p>
            <p class="rd-comment-date">${formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div class="rd-comment-stars">
          ${stars}
          <span class="rd-comment-rating-num">${rating.toFixed(1)}</span>
        </div>
      </div>
      <a class="rd-comment-title" href="/pages/posts/post-detail.html?id=${review.postId}">
        ${escapeHtml(review.title || '제목 없음')}
      </a>
    </div>
  `;
};

const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
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
    .slice(0, 9);

  if (!images.length) {
    gallerySection.style.display = 'none';
    return;
  }

  gallerySection.style.display = 'block';
  if (photoCountBadge) photoCountBadge.textContent = `${images.length}장`;

  // 첫 번째 이미지를 히어로 배경으로
  if (restaurantHeroBg) {
    const [primaryHero] = resolveImageCandidates(images[0]);
    restaurantHeroBg.style.backgroundImage = `url('${primaryHero}')`;
  }

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
  return candidates.find((item) => last.includes(item)) || last;
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

  // 주소 복사
  if (copyAddressBtn) {
    copyAddressBtn.addEventListener('click', () => {
      const addr = restaurantAddressInfo?.textContent?.trim() || '';
      if (!addr || addr === '-') return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(addr).then(() => {
          copyAddressBtn.textContent = '복사됨!';
          setTimeout(() => {
            copyAddressBtn.innerHTML = '<i class="ri-file-copy-line"></i>복사';
          }, 1500);
        });
      }
    });
  }
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
