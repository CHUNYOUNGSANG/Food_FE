/**
 * 게시글 카드 컴포넌트
 * 게시글 데이터를 카드 형태로 렌더링
 */

import { getRelativeTime } from '../utils/date-formatter.js';
import { resolveImageCandidates, resolveImageUrl } from '../utils/image-url.js';

const getProfileImageFrom = (data) =>
  data?.memberProfileImage ||
  data?.profileImage ||
  data?.memberProfileImageUrl ||
  data?.profileImageUrl ||
  data?.member?.profileImage ||
  data?.member?.profileImageUrl ||
  data?.author?.profileImage ||
  data?.author?.profileImageUrl ||
  '';

const extractPostImageUrls = (postData) => {
  const urls = [];

  const list =
    postData?.images ||
    postData?.imageUrls ||
    postData?.imageList ||
    postData?.files ||
    postData?.postImages ||
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

  if (postData?.imageUrl) urls.push(postData.imageUrl);
  if (postData?.thumbnailUrl) urls.push(postData.thumbnailUrl);

  return [...new Set(urls.filter(Boolean))];
};

/**
 * 게시글 카드 생성
 * @param {Object} post - 게시글 데이터
 * @returns {string} HTML 문자열
 */
export const createPostCard = (post) => {
  const {
    id,
    title,
    content,
    restaurant,
    rating,
    imageUrl,
    images,
    memberNickname,
    memberId,
    createdAt,
    viewCount = 0,
    likeCount = 0,
    commentCount = 0,
  } = post;

  // 카테고리 클래스 매핑
  const normalizedCategory =
    normalizeCategory(restaurant?.category) ||
    (restaurant?.category ? String(restaurant.category).trim() : '미분류');
  const categoryClass =
    {
      한식: 'korean',
      중식: 'chinese',
      일식: 'japanese',
      양식: 'western',
      카페: 'cafe',
    }[normalizedCategory] || '';

  // 카테고리 이모지
  const categoryEmoji =
    {
      한식: '🌶️',
      중식: '🥟',
      일식: '🍱',
      양식: '🍝',
      카페: '☕',
    }[normalizedCategory] || '🍽️';

  // 기본 이미지 처리 (여러 필드 대응)
  let cardImage = '';
  const postImageUrls = extractPostImageUrls({
    images,
    imageUrl,
    imageUrls: post.imageUrls,
    imageList: post.imageList,
    files: post.files,
    postImages: post.postImages,
    thumbnailUrl: post.thumbnailUrl,
  });
  const firstImage = postImageUrls[0];
  if (firstImage) {
    const [primary, fallback] = resolveImageCandidates(firstImage);
    const fallbackAttr = fallback ? `data-fallback="${fallback}"` : '';
    const onError =
      "if(this.dataset.fallback){this.src=this.dataset.fallback;this.removeAttribute('data-fallback');}else{this.style.display='none';}";
    cardImage = `<img src="${primary}" ${fallbackAttr} onerror="${onError}" alt="${escapeHtml(title)}">`;
  }

  const authorImage = getProfileImageFrom(post);
  const authorAvatarClass = authorImage ? 'author-avatar has-image' : 'author-avatar';
  const authorAvatarStyle = authorImage
    ? `style="background-image:url('${resolveImageUrl(authorImage)}')"`
    : '';
  const resolvedMemberId =
    memberId ||
    post.memberId ||
    post.member?.id ||
    post.authorId ||
    post.author?.id ||
    post.writerId ||
    post.writer?.id ||
    '';
  const authorAvatarData = resolvedMemberId
    ? `data-member-id="${resolvedMemberId}"`
    : '';

  const dataAttrs = [
    restaurant?.name ? `data-restaurant-name="${escapeHtml(restaurant.name)}"` : '',
    restaurant?.address
      ? `data-restaurant-address="${escapeHtml(restaurant.address)}"`
      : '',
    restaurant?.latitude !== undefined && restaurant?.latitude !== null
      ? `data-lat="${restaurant.latitude}"`
      : '',
    restaurant?.longitude !== undefined && restaurant?.longitude !== null
      ? `data-lng="${restaurant.longitude}"`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
        <div class="post-card" data-post-id="${id}" ${dataAttrs} onclick="location.href='/pages/posts/post-detail.html?id=${id}'">
            <div class="post-card-image">
                ${cardImage}
                ${
                  normalizedCategory
                    ? `
                    <span class="category-badge ${categoryClass}">
                        ${categoryEmoji} ${normalizedCategory}
                    </span>
                `
                    : ''
                }
                ${
                  rating
                    ? `
                    <span class="rating-badge">
                        ⭐ ${rating}
                    </span>
                `
                    : ''
                }
            </div>
            
            <div class="post-card-body">
                <h3 class="post-card-title">${escapeHtml(title)}</h3>
                
                ${
                  restaurant?.name
                    ? `
                    <div class="post-card-restaurant">
                        📍 ${escapeHtml(restaurant.name)}
                    </div>
                `
                    : ''
                }
                
                ${restaurant?.address ? `<p class="map-card-address">${escapeHtml(restaurant.address)}</p>` : ''}
                
                <div class="post-card-footer">
                    <div class="post-card-author">
                        <div class="${authorAvatarClass}" ${authorAvatarStyle} ${authorAvatarData}>
                            ${memberNickname ? memberNickname.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span class="author-name">${escapeHtml(memberNickname || '익명')}</span>
                    </div>
                    
                    <div class="post-card-meta">
                        <span class="meta-item post-card-like-count-wrap" title="좋아요">
                            ❤️ <span class="post-card-like-count">${likeCount}</span>
                        </span>
                        <span class="meta-item post-card-comment-count-wrap" title="댓글">
                            💬 <span class="post-card-comment-count">${commentCount}</span>
                        </span>
                        <span class="meta-item" title="조회수">
                            👁️ ${viewCount}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
};

/**
 * HTML 이스케이프 (XSS 방지)
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const normalizeCategory = (category) => {
  if (!category) return '';
  const text = String(category).trim();
  if (!text) return '';
  const parts = text.split('>').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || text;
};

/**
 * 여러 게시글 카드 생성
 * @param {Array} posts - 게시글 배열
 * @returns {string} HTML 문자열
 */
export const createPostCards = (posts) => {
  if (!posts || posts.length === 0) {
    return '';
  }

  return posts.map((post) => createPostCard(post)).join('');
};
