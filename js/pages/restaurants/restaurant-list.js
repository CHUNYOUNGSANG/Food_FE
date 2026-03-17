import {
  normalizeRestaurantListResponse,
  searchRestaurants,
} from '../../services/restaurant-service.js';
import { getAllPosts } from '../../services/post-service.js';

// 리뷰 게시글에서 식당 ID별 첫 번째 이미지 맵 (restaurantId -> imageUrl)
const postImageMap = {};

const buildPostImageMap = async () => {
  try {
    const posts = await getAllPosts();
    posts.forEach((post) => {
      const rid = String(post.restaurant?.id ?? post.restaurantId ?? '');
      if (!rid || postImageMap[rid]) return;
      const img = post.images?.[0];
      const src = typeof img === 'string' ? img : img?.fileUrl;
      if (!src) return;
      postImageMap[rid] =
        src.startsWith('http') || src.startsWith('data:')
          ? src
          : `http://localhost:8080${src}`;
    });
  } catch (e) {
    console.warn('리뷰 이미지 로드 실패:', e.message);
  }
};

const grid = document.getElementById('restaurantGrid');
const emptyState = document.getElementById('restaurantEmpty');
const loadMoreButton = document.getElementById('restaurantLoadMore');
const searchForm = document.getElementById('restaurantSearchForm');
const searchInput = document.getElementById('restaurantSearchInput');

const state = {
  query: '',
  page: 0,
  size: 12,
  isLoading: false,
  isLast: false,
};

const normalizeList = (data) => {
  const normalized = normalizeRestaurantListResponse(data);
  const page = normalized.number != null ? normalized.number : 0;
  const totalPages = normalized.totalPages;
  const last =
    normalized.last != null
      ? normalized.last
      : totalPages === 0 || (totalPages && page + 1 >= totalPages);
  return {
    items: normalized.content || [],
    page,
    last,
  };
};

const renderEmptyState = (show) => {
  if (!emptyState) return;
  emptyState.style.display = show ? 'block' : 'none';
};

const renderLoadMore = () => {
  if (!loadMoreButton) return;
  loadMoreButton.style.display = state.isLast ? 'none' : 'inline-flex';
  loadMoreButton.disabled = state.isLoading;
};

const createCard = (restaurant) => {
  const id = restaurant?.id ?? '';
  const imageCandidates = [
    postImageMap[String(id)],
    restaurant?.imageUrl,
    restaurant?.thumbnailUrl,
    restaurant?.photoUrl,
    restaurant?.mainImageUrl,
    restaurant?.image,
  ].filter(Boolean);
  const imageUrl =
    imageCandidates[0] ||
    'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#f1f5f9'/><stop offset='100%' stop-color='#e2e8f0'/></linearGradient></defs><rect width='300' height='200' fill='url(#g)'/><circle cx='92' cy='98' r='28' fill='#cbd5f5'/><rect x='130' y='72' width='110' height='56' rx='10' fill='#dbeafe'/><text x='150' y='155' font-size='14' fill='#94a3b8' font-family='sans-serif'>No Image</text></svg>",
      );
  const name = restaurant?.name || '이름 미등록';
  const address = restaurant?.address || '주소 정보 없음';
  const category = restaurant?.category || '기타';
  const source = restaurant?.placeUrl || restaurant?.place_url ? '카카오맵' : '등록됨';

  const card = document.createElement('a');
  card.className = 'restaurant-card';
  card.href = `/pages/restaurants/restaurant-detail.html?id=${id}`;
  card.innerHTML = `
    <div class="restaurant-card-media">
      <img src="${imageUrl}" alt="${name}" loading="lazy" />
    </div>
    <div class="restaurant-card-body">
      <div class="restaurant-name">${name}</div>
      <div class="restaurant-address">${address}</div>
      <div class="restaurant-meta">
        <span class="restaurant-category">${category}</span>
        <span class="restaurant-source">${source}</span>
      </div>
    </div>
  `;
  return card;
};

const loadRestaurants = async ({ reset = false } = {}) => {
  if (!grid || state.isLoading) return;

  state.isLoading = true;
  renderLoadMore();

  if (reset) {
    state.page = 0;
    state.isLast = false;
    grid.innerHTML = '';
  }

  try {
    let data = await searchRestaurants(state.query, state.page, state.size);
    let normalized = normalizeList(data);
    let items = normalized.items || [];

    if (reset && state.page === 0 && !state.query && items.length === 0) {
      data = await searchRestaurants('강남', 0, state.size);
      normalized = normalizeList(data);
      items = normalized.items || [];
    }

    if (reset && items.length === 0) {
      renderEmptyState(true);
    } else {
      renderEmptyState(false);
    }

    items.forEach((restaurant) => {
      grid.appendChild(createCard(restaurant));
    });

    state.page = normalized.page + 1;
    state.isLast = normalized.last || items.length === 0;
  } catch (error) {
    console.error('맛집 목록 로드 실패:', error);
    if (reset) {
      renderEmptyState(true);
    }
  } finally {
    state.isLoading = false;
    renderLoadMore();
  }
};

if (loadMoreButton) {
  loadMoreButton.addEventListener('click', () => {
    if (!state.isLast) {
      loadRestaurants();
    }
  });
}

if (searchForm) {
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.query = (searchInput?.value || '').trim();
    loadRestaurants({ reset: true });
  });
}

buildPostImageMap().then(() => {
  loadRestaurants({ reset: true });
});
