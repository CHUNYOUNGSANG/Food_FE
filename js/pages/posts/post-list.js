/**
 * 게시글 목록 페이지 로직
 */

import httpClient from '../../utils/http-client.js';
import API_CONFIG from '../../config/api-config.js';
import { createPostCards } from '../../components/post-card.js';

// DOM 요소
const postContainer = document.getElementById('postContainer');
const emptyState = document.getElementById('emptyState');
const loading = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryBtns = document.querySelectorAll('.category-btn');

// 상태
let allPosts = [];
let currentCategory = 'all';

/**
 * 초기화
 */
const init = async () => {
  await loadPosts();
  attachEventListeners();
};

/**
 * 게시글 목록 로드
 */
const loadPosts = async () => {
  try {
    showLoading();

    const posts = await httpClient.get(API_CONFIG.ENDPOINTS.POSTS);
    allPosts = posts;

    renderPosts(posts);
  } catch (error) {
    console.error('게시글 로드 실패:', error);
    showError('게시글을 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
};

/**
 * 게시글 렌더링
 */
const renderPosts = (posts) => {
  if (!posts || posts.length === 0) {
    showEmptyState();
    return;
  }

  hideEmptyState();
  postContainer.innerHTML = createPostCards(posts);
};

/**
 * 카테고리 필터링
 */
const filterByCategory = (category) => {
  currentCategory = category;

  // 버튼 활성화 상태 변경
  categoryBtns.forEach((btn) => {
    if (btn.dataset.category === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 필터링
  if (category === 'all') {
    renderPosts(allPosts);
  } else {
    const filtered = allPosts.filter((post) => post.foodCategory === category);
    renderPosts(filtered);
  }
};

/**
 * 검색
 */
const handleSearch = async () => {
  const keyword = searchInput.value.trim();

  if (!keyword) {
    renderPosts(allPosts);
    return;
  }

  try {
    showLoading();

    const results = await httpClient.get(
      `${API_CONFIG.ENDPOINTS.POSTS_SEARCH}?keyword=${encodeURIComponent(keyword)}`,
    );

    renderPosts(results);
  } catch (error) {
    console.error('검색 실패:', error);
    showError('검색에 실패했습니다.');
  } finally {
    hideLoading();
  }
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 검색 버튼
  searchBtn.addEventListener('click', handleSearch);

  // 검색 입력 (Enter 키)
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  // 카테고리 버튼
  categoryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      filterByCategory(category);
    });
  });
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  loading.style.display = 'block';
  postContainer.style.display = 'none';
  emptyState.style.display = 'none';
};

/**
 * 로딩 숨김
 */
const hideLoading = () => {
  loading.style.display = 'none';
  postContainer.style.display = 'grid';
};

/**
 * 빈 상태 표시
 */
const showEmptyState = () => {
  postContainer.style.display = 'none';
  emptyState.style.display = 'block';
};

/**
 * 빈 상태 숨김
 */
const hideEmptyState = () => {
  emptyState.style.display = 'none';
};

/**
 * 에러 메시지 표시
 */
const showError = (message) => {
  alert(message);
};

// 초기화 실행
init();
