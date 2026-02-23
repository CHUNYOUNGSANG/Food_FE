/**
 * 홈 페이지
 * 최근 게시글 표시
 */

import { getAllPosts } from '../services/post-service.js';
import {
  normalizeRestaurantListResponse,
  searchRestaurants,
} from '../services/restaurant-service.js';

/**
 * 페이지 초기화
 */
const init = async () => {
  await loadHomeData();
};

/**
 * 홈 데이터 로드 (최근 게시글 + Top 10)
 */
const loadHomeData = async () => {
  const postsGrid = document.getElementById('recentPostsGrid');
  const top10Carousel = document.getElementById('top10Carousel');

  try {
    const posts = await getAllPosts();
    renderRecentPosts(posts);
    renderTop10Posts(posts);
    renderCategoryBar();
    loadRecommendedRestaurants();
    initTop10Carousel();
  } catch (error) {
    console.error('홈 데이터 로드 실패:', error);
    if (postsGrid) {
      postsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-600);">
          게시글을 불러오는데 실패했습니다.
        </div>
      `;
    }
    if (top10Carousel) {
      top10Carousel.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--gray-600);">
          Top 10 게시글을 불러오지 못했습니다.
        </div>
      `;
    }
  }
};

/**
 * 최근 게시글 로드
 */
const loadRecentPosts = async () => {
  const postsGrid = document.getElementById('recentPostsGrid');
  if (!postsGrid) return;

  try {
    // 모든 게시글 가져오기
    const posts = await getAllPosts();

    // 최근 8개만 표시
    const recentPosts = posts.slice(0, 8);

    // 게시글 렌더링
    postsGrid.innerHTML = recentPosts.map((post) => createPostCard(post)).join('');
  } catch (error) {
    console.error('최근 게시글 로드 실패:', error);
    postsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-600);">
        게시글을 불러오는데 실패했습니다.
      </div>
    `;
  }
};

/**
 * 최근 게시글 렌더링
 */
const renderRecentPosts = (posts) => {
  const postsGrid = document.getElementById('recentPostsGrid');
  if (!postsGrid) return;
  const recentPosts = posts.slice(0, 8);
  postsGrid.innerHTML = recentPosts.map((post) => createPostCard(post)).join('');
};

const getMiddleCategory = (category) => {
  if (!category) return '';
  const parts = String(category)
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return parts[0] || '';
};

const getCategoryEmoji = (category) =>
  ({
    전체: '🍽️',
    한식: '🌶️',
    중식: '🥟',
    일식: '🍱',
    양식: '🍝',
    카페: '☕',
  }[category] || '🍽️');

const renderCategoryBar = async () => {
  const categoryList = document.getElementById('categoryList');
  if (!categoryList) return;

  try {
    let result = await searchRestaurants('', 0, 100);
    let items = normalizeRestaurantListResponse(result).content || [];
    if (!items.length) {
      result = await searchRestaurants('강남', 0, 100);
      items = normalizeRestaurantListResponse(result).content || [];
    }

    const allowedCategories = new Set(['한식', '중식', '일식', '양식', '카페']);
    const categories = Array.from(
      new Set(
        items
          .map((item) => getMiddleCategory(item.category))
          .filter((category) => category && allowedCategories.has(category)),
      ),
    );

    const allCategoryItem = `
      <a href="/pages/posts/post-list.html" class="category-item">
        <span class="category-emoji">${getCategoryEmoji('전체')}</span>
        <span class="category-name">전체</span>
      </a>
    `;

    categoryList.innerHTML =
      allCategoryItem +
      categories
        .map(
          (category) => `
          <a href="/pages/category.html?category=${encodeURIComponent(category)}" class="category-item">
            <span class="category-emoji">${getCategoryEmoji(category)}</span>
            <span class="category-name">${category}</span>
          </a>
        `,
        )
        .join('');
  } catch (error) {
    console.error('카테고리 바 로드 실패:', error);
  }
};
/**
 * 추천 맛집 로드
 */
const loadRecommendedRestaurants = async () => {
  const recommendGrid = document.getElementById('recommendGrid');
  if (!recommendGrid) return;

  try {
    let result = await searchRestaurants('', 0, 6);
    let items = normalizeRestaurantListResponse(result).content || [];
    if (!items.length) {
      result = await searchRestaurants('강남', 0, 6);
      items = normalizeRestaurantListResponse(result).content || [];
    }
    if (!items.length) {
      recommendGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-600);">
          추천 맛집이 없습니다.
        </div>
      `;
      return;
    }
    recommendGrid.innerHTML = items
      .map((item) => createRestaurantCard(item))
      .join('');
  } catch (error) {
    console.error('추천 맛집 로드 실패:', error);
    recommendGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-600);">
        추천 맛집을 불러오지 못했습니다.
      </div>
    `;
  }
};

/**
 * Top 10 게시글 렌더링 (좋아요 수 기준)
 */
const renderTop10Posts = (posts) => {
  const top10Carousel = document.getElementById('top10Carousel');
  if (!top10Carousel) return;

  const sorted = [...posts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  const top10 = sorted.slice(0, 10);

  if (top10.length === 0) {
    top10Carousel.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--gray-600);">
        아직 Top 10 게시글이 없습니다.
      </div>
    `;
    return;
  }

  const createTop10Card = (post, rank) => {
    const category =
      normalizeCategory(post.restaurant?.category) ||
      (post.restaurant?.category ? String(post.restaurant.category).trim() : '미분류');
    const categoryEmoji =
      {
        한식: '🌶️',
        중식: '🥟',
        일식: '🍱',
        양식: '🍝',
        카페: '☕',
      }[category] || '🍽️';
    const rating = Number(post.rating || 0);
    const viewCount = post.viewCount || 0;
    const place =
      post.restaurant?.name ||
      post.restaurant?.address ||
      post.address ||
      '맛집 정보 없음';

    return `
      <a href="/pages/posts/post-detail.html?id=${post.id}" class="top10-card">
        <div class="top10-media">
          <img src="${getPostImageUrl(post)}" alt="${post.title || '게시글 이미지'}" onerror="this.onerror=null;" />
          <div class="top10-rank">${rank}</div>
          <div class="top10-badge">${categoryEmoji} ${category}</div>
          <div class="top10-views">👁️ ${viewCount.toLocaleString()}</div>
        </div>
        <div class="top10-content">
          <div class="top10-title">${post.title || '제목 없음'}</div>
          <div class="top10-desc">${place}</div>
          <div class="top10-meta">
            <span class="top10-rating">⭐ ${rating.toFixed(1)}</span>
            <span class="top10-divider"></span>
            <span class="top10-sub">인기글</span>
          </div>
        </div>
      </a>
    `;
  };

  const chunkSize = 2;
  const slidesHtml = [];

  for (let i = 0; i < top10.length; i += chunkSize) {
    const slice = top10.slice(i, i + chunkSize);
    const cards = slice
      .map((post, idx) => createTop10Card(post, i + idx + 1))
      .join('');
    slidesHtml.push(
      `<div class="top10-slide${i === 0 ? ' active' : ''}">${cards}</div>`,
    );
  }

  top10Carousel.innerHTML = slidesHtml.join('');
};

/**
 * 게시글 이미지 URL 추출 (Top10용)
 */
const getPostImageUrl = (post) => {
  let imageUrl =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%23f0f0f0" width="300" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%23999"%3E이미지 없음%3C/text%3E%3C/svg%3E';

  if (post.images && post.images.length > 0) {
    const firstImage = post.images[0];
    const imgSrc = typeof firstImage === 'string' ? firstImage : firstImage.fileUrl;
    if (imgSrc) {
      imageUrl = imgSrc.startsWith('http') || imgSrc.startsWith('data:')
        ? imgSrc
        : `http://localhost:8080${imgSrc}`;
    }
  } else if (post.imageUrl) {
    imageUrl = post.imageUrl.startsWith('http') || post.imageUrl.startsWith('data:')
      ? post.imageUrl
      : `http://localhost:8080${post.imageUrl}`;
  }

  return imageUrl;
};

const normalizeCategory = (category) => {
  if (!category) return '';
  const text = String(category).trim();
  if (!text) return '';
  const parts = text.split('>').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || text;
};

const createRestaurantCard = (restaurant) => {
  const name = restaurant?.name || '맛집명 없음';
  const address = restaurant?.address || '주소 정보 없음';
  const category =
    normalizeCategory(restaurant?.category) ||
    (restaurant?.category ? String(restaurant.category).trim() : '미분류');

  return `
    <a href="/pages/restaurants/restaurant-detail.html?id=${restaurant?.id}" class="recommend-card">
      <div class="recommend-card-body">
        <div class="recommend-title">${name}</div>
        <div class="recommend-address">${address}</div>
        <div class="recommend-chip">${category}</div>
      </div>
    </a>
  `;
};

/**
 * 게시글 카드 생성
 */
const createPostCard = (post) => {
  // 이미지 URL 처리 - 백엔드는 images[].fileUrl 사용
  let imageUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%23999"%3E이미지 없음%3C/text%3E%3C/svg%3E';

  if (post.images && post.images.length > 0) {
    // images가 객체 배열: [{fileUrl: '...'}]
    const firstImage = post.images[0];
    const imgSrc = typeof firstImage === 'string' ? firstImage : firstImage.fileUrl;

    if (imgSrc) {
      imageUrl = imgSrc.startsWith('http') || imgSrc.startsWith('data:')
        ? imgSrc
        : `http://localhost:8080${imgSrc}`;
    }
  } else if (post.imageUrl) {
    // 단일 imageUrl 필드가 있는 경우
    imageUrl = post.imageUrl.startsWith('http') || post.imageUrl.startsWith('data:')
      ? post.imageUrl
      : `http://localhost:8080${post.imageUrl}`;
  }

  const rating = post.rating || 0;
  const stars = '⭐'.repeat(Math.round(rating));
  const category =
    normalizeCategory(post.restaurant?.category) ||
    (post.restaurant?.category ? String(post.restaurant.category).trim() : '미분류');
  const address =
    post.restaurant?.address || post.address || '주소 정보 없음';

  return `
    <a href="/pages/posts/post-detail.html?id=${post.id}" class="post-card">
      <div class="post-card-image">
        <img src="${imageUrl}" alt="${post.title}" onerror="this.onerror=null;" />
        <div class="post-card-badge">${category}</div>
      </div>
      <div class="post-card-content">
        <h3 class="post-card-title">${post.title}</h3>
        <p class="post-card-address">${address}</p>
        <div class="post-card-rating">
          <span class="stars">${stars}</span>
          <span class="rating-value">${rating.toFixed(1)}</span>
        </div>
        <div class="post-card-meta">
          <span class="meta-item">
            ❤️ ${post.likeCount || 0}
          </span>
          <span class="meta-item">
            💬 ${post.commentCount || 0}
          </span>
        </div>
      </div>
    </a>
  `;
};

/**
 * Top 10 캐러셀 (5초마다 전환, 2개씩 표시)
 */
const initTop10Carousel = () => {
  const carousel = document.getElementById('top10Carousel');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('.top10-slide'));
  if (slides.length <= 1 || slides.some((slide) => slide.children.length === 0)) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) {
    slides.forEach((slide, idx) => slide.classList.toggle('active', idx === 0));
    return;
  }

  let currentIndex = 0;
  let timerId = null;

  const showSlide = (index) => {
    slides.forEach((slide, idx) => slide.classList.toggle('active', idx === index));
  };

  const start = () => {
    if (timerId) return;
    timerId = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }, 5000);
  };

  const stop = () => {
    if (!timerId) return;
    window.clearInterval(timerId);
    timerId = null;
  };

  showSlide(currentIndex);
  start();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
