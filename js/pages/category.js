/**
 * 카테고리 페이지
 * 카테고리별 게시글 목록 표시
 */

import { getPostsByCategory } from '../services/post-service.js';

// 카테고리 설명 매핑
const CATEGORY_DESCRIPTIONS = {
  한식: '전통의 맛과 정성이 담긴 한식당을 만나보세요',
  중식: '중국의 다양한 요리를 맛볼 수 있는 곳',
  일식: '신선한 재료로 만든 일본 요리',
  양식: '서양의 맛을 느낄 수 있는 레스토랑',
  카페: '커피와 디저트를 즐길 수 있는 공간',
};

// 상태 관리
let currentCategory = '한식';
let currentSort = 'latest';
let allPosts = [];

/**
 * 페이지 초기화
 */
const init = async () => {
  // URL 파라미터에서 카테고리 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');

  if (categoryParam && CATEGORY_DESCRIPTIONS[categoryParam]) {
    currentCategory = categoryParam;
  }

  // 카테고리 탭 활성화
  updateCategoryTab();

  // 카테고리 헤더 업데이트
  updateCategoryHeader();

  // 이벤트 리스너 등록
  attachEventListeners();

  // 게시글 로드
  await loadPosts();
};

/**
 * 카테고리 탭 활성화
 */
const updateCategoryTab = () => {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach((tab) => {
    const category = tab.dataset.category;
    if (category === currentCategory) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
};

/**
 * 카테고리 헤더 업데이트
 */
const updateCategoryHeader = () => {
  const titleElement = document.getElementById('categoryTitle');
  const descriptionElement = document.getElementById('categoryDescription');

  if (titleElement) {
    titleElement.textContent = currentCategory;
  }

  if (descriptionElement) {
    descriptionElement.textContent = CATEGORY_DESCRIPTIONS[currentCategory] || '';
  }
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 카테고리 탭 클릭
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;
      if (category !== currentCategory) {
        currentCategory = category;
        updateCategoryTab();
        updateCategoryHeader();
        // URL 업데이트
        const url = new URL(window.location);
        url.searchParams.set('category', category);
        window.history.pushState({}, '', url);
        // 게시글 다시 로드
        loadPosts();
      }
    });
  });

  // 정렬 선택
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderPosts();
    });
  }
};

/**
 * 게시글 로드
 */
const loadPosts = async () => {
  const postsGrid = document.getElementById('postsGrid');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');

  try {
    // 로딩 표시
    if (loadingState) loadingState.style.display = 'flex';
    if (postsGrid) postsGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';

    // 카테고리별 게시글 가져오기
    allPosts = await getPostsByCategory(currentCategory);

    // 로딩 숨기기
    if (loadingState) loadingState.style.display = 'none';

    // 게시글 렌더링
    renderPosts();
  } catch (error) {
    console.error('게시글 로드 실패:', error);
    if (loadingState) loadingState.style.display = 'none';
    if (postsGrid) postsGrid.style.display = 'grid';
    alert('게시글을 불러오는데 실패했습니다.');
  }
};

/**
 * 게시글 렌더링
 */
const renderPosts = () => {
  const postsGrid = document.getElementById('postsGrid');
  const emptyState = document.getElementById('emptyState');
  const postsCount = document.getElementById('postsCount');

  if (!postsGrid) return;

  // 정렬
  const sortedPosts = sortPosts([...allPosts]);

  // 게시글 수 업데이트
  if (postsCount) {
    postsCount.textContent = sortedPosts.length;
  }

  // 게시글이 없으면 빈 상태 표시
  if (sortedPosts.length === 0) {
    postsGrid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  // 빈 상태 숨기기
  if (emptyState) emptyState.style.display = 'none';
  postsGrid.style.display = 'grid';

  // 게시글 카드 렌더링
  postsGrid.innerHTML = sortedPosts.map((post) => createPostCard(post)).join('');
};

/**
 * 게시글 정렬
 */
const sortPosts = (posts) => {
  switch (currentSort) {
    case 'latest':
      return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'popular':
      return posts.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    case 'rating':
      return posts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    default:
      return posts;
  }
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
  const category = post.foodCategory || post.category || '기타';
  const address = post.restaurantAddress || post.address || '주소 정보 없음';

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

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
