/**
 * 게시글 목록 페이지 로직
 */

import { getAllPosts } from '../../services/post-service.js';
import { createPostCard } from '../../components/post-card.js';
import { hydrateAvatars } from '../../utils/avatar-loader.js';

// DOM 요소
const loading = document.getElementById('loading');
const postsGrid = document.getElementById('postsGrid');
const emptyState = document.getElementById('emptyState');
const noResults = document.getElementById('noResults');
const infiniteStatus = document.getElementById('postInfiniteStatus');
const infiniteTrigger = document.getElementById('postInfiniteTrigger');
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
let renderedCount = 0;
let isAppending = false;

const POSTS_BATCH_SIZE = 6;
let infiniteObserver = null;

const normalizeCategory = (category) => {
  if (!category) return '';
  const text = String(category);
  const parts = text.split('>').map((part) => part.trim());
  const last = parts[parts.length - 1] || text;
  const candidates = ['한식', '중식', '일식', '양식', '카페'];
  return candidates.find((item) => last.includes(item)) || '';
};

/**
 * 초기화
 */
const init = async () => {
  await loadPosts();
  attachEventListeners();
  await applySearchFromQuery();
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
    await renderPosts(filteredPosts);
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
const updateInfiniteState = () => {
  if (!infiniteStatus || !infiniteTrigger) return;

  if (postsGrid?.style.display === 'none' || filteredPosts.length === 0) {
    infiniteStatus.textContent = '';
    infiniteTrigger.style.display = 'none';
    return;
  }

  if (isAppending) {
    infiniteStatus.textContent = '게시글을 더 불러오는 중입니다...';
    infiniteTrigger.style.display = 'block';
    return;
  }

  if (renderedCount >= filteredPosts.length) {
    infiniteStatus.textContent = '마지막 게시글까지 모두 확인했습니다.';
    infiniteTrigger.style.display = 'none';
    return;
  }

  infiniteStatus.textContent = '스크롤을 내리면 게시글을 더 보여줍니다.';
  infiniteTrigger.style.display = 'block';
};

const resetRenderedPosts = () => {
  renderedCount = 0;
  isAppending = false;
  if (postsGrid) {
    postsGrid.innerHTML = '';
  }
  updateInfiniteState();
};

const renderNextBatch = async () => {
  if (!postsGrid || isAppending || renderedCount >= filteredPosts.length) {
    updateInfiniteState();
    return;
  }

  isAppending = true;
  updateInfiniteState();

  const nextPosts = filteredPosts.slice(
    renderedCount,
    renderedCount + POSTS_BATCH_SIZE,
  );
  const wrapper = document.createElement('div');
  wrapper.innerHTML = nextPosts
    .map((post, index) => createPostRow(post, renderedCount + index))
    .join('');
  const nextRows = Array.from(wrapper.children);
  nextRows.forEach((row) => postsGrid.appendChild(row));
  renderedCount += nextPosts.length;

  await Promise.all(nextRows.map((row) => hydrateAvatars(row)));
  initInlineMaps(nextRows);

  isAppending = false;
  updateInfiniteState();
};

const renderPosts = async (posts) => {
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
    updateInfiniteState();
    return;
  }

  if (postsGrid) {
    postsGrid.style.display = 'flex';
  }

  resetRenderedPosts();
  await renderNextBatch();
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
    filteredPosts = allPosts.filter((post) => {
      const normalized = normalizeCategory(post?.restaurant?.category);
      return normalized === category;
    });
  }

    // 검색어가 있으면 추가 필터링
    const keyword = searchInput ? searchInput.value.trim() : '';
    if (keyword) {
      const lower = keyword.replace(/^#/, '').toLowerCase();
      filteredPosts = filteredPosts.filter((post) => {
        const title = post.title || '';
        const name = post.restaurant?.name || '';
        const tags = (post.tags || []).map((t) => String(t).toLowerCase());
        return (
          title.toLowerCase().includes(lower) ||
          name.toLowerCase().includes(lower) ||
          tags.some((t) => t.includes(lower))
        );
      });
    }

    await renderPosts(filteredPosts);
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
    await filterByCategory(currentCategory);
    return;
  }

  showLoading();

  const lower = keyword.replace(/^#/, '').toLowerCase();
  filteredPosts = allPosts.filter((post) => {
    const title = post.title || '';
    const name = post.restaurant?.name || '';
    const address = post.restaurant?.address || '';
    const tags = (post.tags || []).map((t) => String(t).toLowerCase());
    return (
      title.toLowerCase().includes(lower) ||
      name.toLowerCase().includes(lower) ||
      address.toLowerCase().includes(lower) ||
      tags.some((t) => t.includes(lower))
    );
  });

  if (currentCategory !== 'all') {
    filteredPosts = filteredPosts.filter((post) => {
      const normalized = normalizeCategory(post?.restaurant?.category);
      return normalized === currentCategory;
    });
  }

  await renderPosts(filteredPosts);
  hideLoading();
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

const applySearchFromQuery = async () => {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search');
  if (searchInput && search) {
    searchInput.value = search;
    await handleSearch();
  }
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

  if (postsGrid) {
    postsGrid.addEventListener('mouseover', (event) => {
      const card = event.target.closest('.post-card');
      if (!card) return;
    });
  }
};

const initInfiniteScroll = () => {
  if (!infiniteTrigger || infiniteObserver) return;

  infiniteObserver = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting || isAppending || renderedCount >= filteredPosts.length) {
        return;
      }
      renderNextBatch();
    },
    {
      rootMargin: '240px 0px',
    },
  );

  infiniteObserver.observe(infiniteTrigger);
};

const createPostRow = (post, index) => {
  const mapId = `postMap-${post.id || index}`;
  const name = escapeHtml(
    post.restaurant?.name || post.title || '맛집명 없음',
  );
  const address = escapeHtml(post.restaurant?.address || '');
  const latitude = post.restaurant?.latitude;
  const longitude = post.restaurant?.longitude;
  const dataAttrs = [
    address ? `data-address="${address}"` : '',
    name ? `data-name="${name}"` : '',
    latitude !== undefined && latitude !== null ? `data-lat="${latitude}"` : '',
    longitude !== undefined && longitude !== null
      ? `data-lng="${longitude}"`
      : '',
    `data-map-id="${mapId}"`,
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="post-row" ${dataAttrs}>
      <div class="post-row-main">
        ${createPostCard(post)}
      </div>
      <div class="post-row-map">
        <div class="map-card">
          <div id="${mapId}" class="post-row-map-canvas"></div>
          <div class="map-card-address">${address || '주소 정보 없음'}</div>
        </div>
      </div>
    </div>
  `;
};

const initInlineMaps = (rows = document.querySelectorAll('.post-row')) => {
  if (!window.kakao || !window.kakao.maps) return;
  const geocoder = new window.kakao.maps.services.Geocoder();
  const targets = Array.from(rows);
  targets.forEach((row) => {
    const mapId = row.dataset.mapId;
    const mapEl = mapId ? document.getElementById(mapId) : null;
    if (!mapEl) return;
    const latitude = row.dataset.lat ? Number(row.dataset.lat) : null;
    const longitude = row.dataset.lng ? Number(row.dataset.lng) : null;
    const address = row.dataset.address || '';
    const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.9780);
    const map = new window.kakao.maps.Map(mapEl, {
      center: defaultCenter,
      level: 4,
      draggable: false,
      scrollwheel: false,
    });
    const marker = new window.kakao.maps.Marker({ position: defaultCenter });
    marker.setMap(map);

    if (latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined) {
      const position = new window.kakao.maps.LatLng(latitude, longitude);
      map.setCenter(position);
      marker.setPosition(position);
      return;
    }

    if (address) {
      geocoder.addressSearch(address, (result, status) => {
        if (status !== window.kakao.maps.services.Status.OK) return;
        const { x, y } = result[0];
        const position = new window.kakao.maps.LatLng(y, x);
        map.setCenter(position);
        marker.setPosition(position);
      });
    }
  });
};

const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  if (loading) loading.style.display = 'block';
  if (postsGrid) postsGrid.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (noResults) noResults.style.display = 'none';
  updateInfiniteState();
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
  updateInfiniteState();
};

/**
 * 검색 결과 없음 표시
 */
const showNoResults = () => {
  if (postsGrid) postsGrid.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (noResults) noResults.style.display = 'block';
  updateInfiniteState();
};

// 초기화 실행
initInfiniteScroll();
init();
