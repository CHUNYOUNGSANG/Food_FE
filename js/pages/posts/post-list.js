/**
 * 게시글 목록 페이지 로직
 */

import {
  getAllPosts,
  getPostsByCategory,
  searchPosts,
} from '../../services/post-service.js';
import { createPostCard } from '../../components/post-card.js';

// DOM 요소
const loading = document.getElementById('loading');
const postsGrid = document.getElementById('postsGrid');
const emptyState = document.getElementById('emptyState');
const noResults = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resetSearchBtn = document.getElementById('resetSearch');
const categoryBtns = document.querySelectorAll('.category-btn');
const totalPostsSpan = document.getElementById('totalPosts');
const todayPostsSpan = document.getElementById('todayPosts');

// 상태
let allPosts = [];
let filteredPosts = [];
let currentCategory = 'all';

/**
 * 초기화
 */
const init = async () => {
  await loadPosts();
  attachEventListeners();
};

/**
 * 게시글 로드
 */
const loadPosts = async () => {
  try {
    showLoading();

    allPosts = await getAllPosts();
    filteredPosts = allPosts;

    // 통계 업데이트
    updateStats();

    // 게시글 렌더링
    renderPosts(filteredPosts);
  } catch (error) {
    console.error('게시글 로드 실패:', error);
    showEmptyState();
  } finally {
    hideLoading();
  }
};

/**
 * 게시글 렌더링
 */
const renderPosts = (posts) => {
  // 검색/필터 결과 숨김
  if (noResults) noResults.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';

  if (posts.length === 0) {
    // 전체 게시글이 없는 경우
    if (allPosts.length === 0) {
      showEmptyState();
    } else {
      // 검색/필터 결과가 없는 경우
      showNoResults();
    }
    if (postsGrid) postsGrid.style.display = 'none';
    return;
  }

  if (postsGrid) {
    postsGrid.style.display = 'grid';
    postsGrid.innerHTML = posts.map((post) => createPostCard(post)).join('');
  }
};

/**
 * 통계 업데이트
 */
const updateStats = () => {
  // 전체 게시글 수
  if (totalPostsSpan) {
    totalPostsSpan.textContent = allPosts.length;
  }

  // 오늘 작성된 게시글 수
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPosts = allPosts.filter((post) => {
    const postDate = new Date(post.createdAt);
    postDate.setHours(0, 0, 0, 0);
    return postDate.getTime() === today.getTime();
  });

  if (todayPostsSpan) {
    todayPostsSpan.textContent = todayPosts.length;
  }
};

/**
 * 카테고리 필터링
 */
const filterByCategory = async (category) => {
  try {
    showLoading();

    currentCategory = category;

    if (category === 'all') {
      filteredPosts = allPosts;
    } else {
      filteredPosts = await getPostsByCategory(category);
    }

    // 검색어가 있으면 추가 필터링
    const keyword = searchInput ? searchInput.value.trim() : '';
    if (keyword) {
      filteredPosts = filteredPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(keyword.toLowerCase()) ||
          post.restaurantName.toLowerCase().includes(keyword.toLowerCase()),
      );
    }

    renderPosts(filteredPosts);
  } catch (error) {
    console.error('카테고리 필터링 실패:', error);
  } finally {
    hideLoading();
  }
};

/**
 * 검색
 */
const handleSearch = async () => {
  if (!searchInput) return;

  const keyword = searchInput.value.trim();

  if (!keyword) {
    // 검색어가 없으면 현재 카테고리로 필터링
    filterByCategory(currentCategory);
    return;
  }

  try {
    showLoading();

    // 백엔드 검색 API 사용
    const searchResults = await searchPosts(keyword);

    // 현재 카테고리 필터 적용
    if (currentCategory !== 'all') {
      filteredPosts = searchResults.filter(
        (post) => post.foodCategory === currentCategory,
      );
    } else {
      filteredPosts = searchResults;
    }

    renderPosts(filteredPosts);
  } catch (error) {
    console.error('검색 실패:', error);
    showNoResults();
  } finally {
    hideLoading();
  }
};

/**
 * 검색 초기화
 */
const resetSearch = () => {
  if (searchInput) {
    searchInput.value = '';
  }

  currentCategory = 'all';

  // 카테고리 버튼 초기화
  categoryBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === 'all');
  });

  // 전체 게시글 표시
  filteredPosts = allPosts;
  renderPosts(filteredPosts);
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 검색 버튼
  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }

  // 검색 입력 (Enter 키)
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }

  // 카테고리 버튼
  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // 활성화 상태 변경
      categoryBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // 필터링
      const category = btn.dataset.category;
      filterByCategory(category);
    });
  });

  // 검색 초기화 버튼
  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', resetSearch);
  }
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  if (loading) loading.style.display = 'block';
  if (postsGrid) postsGrid.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (noResults) noResults.style.display = 'none';
};

/**
 * 로딩 숨김
 */
const hideLoading = () => {
  if (loading) loading.style.display = 'none';
};

/**
 * 빈 상태 표시
 */
const showEmptyState = () => {
  if (postsGrid) postsGrid.style.display = 'none';
  if (emptyState) emptyState.style.display = 'flex';
  if (noResults) noResults.style.display = 'none';
};

/**
 * 검색 결과 없음 표시
 */
const showNoResults = () => {
  if (postsGrid) postsGrid.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (noResults) noResults.style.display = 'block';
};

// 초기화 실행
init();
