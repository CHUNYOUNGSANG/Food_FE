/**
 * 게시글 상세 페이지 로직 (대댓글 기능 추가)
 */

import { getPost } from '../../services/post-service.js';
import {
  getCommentsByPost,
  createComment,
  deleteComment,
} from '../../services/comment-service.js';
import {
  addPostLike,
  removePostLike,
  getPostLikeCount,
  getLikesByPost,
} from '../../services/post-like-service.js';
import {
  addCommentLike,
  removeCommentLike,
  getCommentLikeCount,
} from '../../services/comment-like-service.js';
import { getMemberId } from '../../utils/storage.js';
import { formatDate } from '../../utils/date-formatter.js';
import { resolveImageCandidates, resolveImageUrl } from '../../utils/image-url.js';
import { hydrateAvatars } from '../../utils/avatar-loader.js';

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

const normalizeCategory = (category) => {
  if (!category) return '';
  const text = String(category).trim();
  if (!text) return '';
  const parts = text.split('>').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || text;
};

// DOM 요소
const loading = document.getElementById('loading');
const postDetail = document.getElementById('postDetail');
const postTitle = document.getElementById('postTitle');
const categoryBadge = document.getElementById('categoryBadge');
const ratingBadge = document.getElementById('ratingBadge');
const restaurantName = document.getElementById('restaurantName');
const restaurantAddress = document.getElementById('restaurantAddress');
const postTags = document.getElementById('postTags');
const authorAvatar = document.getElementById('authorAvatar');
const authorName = document.getElementById('authorName');
const postDate = document.getElementById('postDate');
const viewCount = document.getElementById('viewCount');
const postImageContainer = document.getElementById('postImageContainer');
const postImage = document.getElementById('postImage');
const postContent = document.getElementById('postContent');
const postMap = document.getElementById('postMap');
const postMapSection = postMap ? postMap.closest('.post-map-section') : null;
const authorActions = document.getElementById('authorActions');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const likeBtn = document.getElementById('likeBtn');
const likeIcon = document.getElementById('likeIcon');
const likeCount = document.getElementById('likeCount');
const shareBtn = document.getElementById('shareBtn');
const commentFormContainer = document.getElementById('commentFormContainer');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentList = document.getElementById('commentList');
const commentCount = document.getElementById('commentCount');
const noComments = document.getElementById('noComments');

// 상태
let postId = null;
let memberId = null;
let post = null;
let comments = [];
let isLiked = false;
let currentCommentPage = 1;
const COMMENTS_PER_PAGE = 5;

// 라이트박스
let lightboxUrls = [];
let lightboxIndex = 0;

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxCurrent = document.getElementById('lightboxCurrent');
const lightboxTotal = document.getElementById('lightboxTotal');
const lightboxClose = document.getElementById('lightboxClose');

const openLightbox = (urls, index) => {
  lightboxUrls = urls;
  lightboxIndex = index;
  lightboxTotal.textContent = urls.length;
  updateLightbox();
  lightbox.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
  lightbox.style.display = 'none';
  document.body.style.overflow = '';
};

const updateLightbox = () => {
  lightboxImg.src = resolveImageUrl(lightboxUrls[lightboxIndex]);
  lightboxCurrent.textContent = lightboxIndex + 1;
  lightboxPrev.disabled = lightboxIndex === 0;
  lightboxNext.disabled = lightboxIndex === lightboxUrls.length - 1;
};

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.querySelector('.pd-lightbox-backdrop')?.addEventListener('click', closeLightbox);
lightboxPrev?.addEventListener('click', () => { if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); } });
lightboxNext?.addEventListener('click', () => { if (lightboxIndex < lightboxUrls.length - 1) { lightboxIndex++; updateLightbox(); } });

document.addEventListener('keydown', (e) => {
  if (lightbox?.style.display === 'none') return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; updateLightbox(); }
  if (e.key === 'ArrowRight' && lightboxIndex < lightboxUrls.length - 1) { lightboxIndex++; updateLightbox(); }
});

// 카카오맵
let kakaoMap = null;
let kakaoMarker = null;
let kakaoGeocoder = null;

/**
 * 초기화
 */
const init = async () => {
  // URL에서 postId 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  postId = urlParams.get('id');

  if (!postId) {
    alert('잘못된 접근입니다.');
    window.location.href = '/index.html';
    return;
  }

  // 로그인 확인
  memberId = getMemberId();

  // 게시글 로드
  await loadPost();

  // 댓글 로드
  await loadComments();

  // 좋아요 상태 로드
  await loadLikeStatus();

  // 이벤트 리스너 등록
  attachEventListeners();
};

/**
 * 게시글 로드
 */
const loadPost = async () => {
  try {
    showLoading();

    post = await getPost(postId);

    // 게시글 렌더링
    renderPost(post);
  } catch (error) {
    console.error('게시글 로드 실패:', error);
    alert('게시글을 불러오는데 실패했습니다.');
    window.location.href = '/index.html';
  } finally {
    hideLoading();
  }
};

/**
 * 게시글 렌더링
 */
const renderPost = (post) => {
  // 제목
  postTitle.textContent = post.title;

  // 카테고리
  if (post.restaurant?.category) {
    const normalized =
      normalizeCategory(post.restaurant.category) ||
      String(post.restaurant.category).trim();
    const categoryClass =
      {
        한식: 'korean',
        중식: 'chinese',
        일식: 'japanese',
        양식: 'western',
        카페: 'cafe',
      }[normalized] || '';
    categoryBadge.textContent = normalized || post.restaurant.category;
    categoryBadge.className = `category-badge ${categoryClass}`;
  }

  // 평점
  if (post.rating) {
    const stars = '⭐'.repeat(Math.round(post.rating));
    ratingBadge.innerHTML = `<span class="pd-stars">${stars}</span><span class="pd-score">${post.rating}점</span>`;
    ratingBadge.className = 'pd-rating-display';
  }

  // 맛집 정보
  restaurantName.textContent = post.restaurant?.name || '';
  restaurantAddress.textContent = post.restaurant?.address || '주소 정보 없음';
  renderPostMap(post);

  // 태그
  if (postTags) {
    const tags = post.tags || [];
    if (tags.length > 0) {
      postTags.innerHTML = tags
        .map((tag) => `<span class="post-tag">#${tag}</span>`)
        .join('');
      postTags.style.display = 'flex';
    } else {
      postTags.style.display = 'none';
    }
  }

  // 작성자 정보 (이미지 있으면 이미지, 없으면 이니셜)
  const authorImage = getProfileImageFrom(post);
  if (authorImage) {
    authorAvatar.textContent = '';
    authorAvatar.style.backgroundImage = `url("${resolveImageUrl(authorImage)}")`;
    authorAvatar.classList.add('has-image');
  } else {
    authorAvatar.style.backgroundImage = '';
    authorAvatar.classList.remove('has-image');
    authorAvatar.textContent = post.memberNickname.charAt(0).toUpperCase();
  }
  const authorMemberId =
    post.memberId ||
    post.member?.id ||
    post.authorId ||
    post.author?.id ||
    post.writerId ||
    post.writer?.id ||
    '';
  if (authorMemberId) authorAvatar.dataset.memberId = authorMemberId;
  authorName.textContent = post.memberNickname;
  postDate.textContent = formatDate(post.createdAt);
  viewCount.textContent = `👁️ ${post.viewCount}`;

  // 이미지 (images 배열 우선, 없으면 imageUrl 사용)
  const postImageUrls = extractPostImageUrls(post);
  if (postImageUrls.length > 0) {
    const INITIAL_COUNT = 4;
    const remaining = postImageUrls.length - INITIAL_COUNT;
    const onError =
      "if(this.dataset.fallback){this.src=this.dataset.fallback;this.removeAttribute('data-fallback');}else{this.parentElement.style.display='none';}";

    const renderThumb = (url, index) => {
      const [primary, fallback] = resolveImageCandidates(url);
      const fallbackAttr = fallback ? `data-fallback="${fallback}"` : '';
      const isMoreSlot = index === INITIAL_COUNT - 1 && remaining > 0;
      const moreOverlay = isMoreSlot
        ? `<div class="pd-img-more-overlay"><span>+${remaining}장 더보기</span></div>`
        : '';
      return `<div class="pd-img-thumb">${moreOverlay}<img src="${primary}" ${fallbackAttr} onerror="${onError}" alt="${post.title}"></div>`;
    };

    const initialHTML = postImageUrls
      .slice(0, INITIAL_COUNT)
      .map((url, i) => renderThumb(url, i))
      .join('');

    const extraHTML = remaining > 0
      ? `<div class="pd-img-extra" style="display:none;">${postImageUrls.slice(INITIAL_COUNT).map((url) => renderThumb(url, INITIAL_COUNT)).join('')}</div>`
      : '';

    postImageContainer.innerHTML = `<div class="pd-img-grid">${initialHTML}${extraHTML}</div>`;
    postImageContainer.style.display = 'block';

    if (remaining > 0) {
      const grid = postImageContainer.querySelector('.pd-img-grid');
      const moreOverlay = postImageContainer.querySelector('.pd-img-more-overlay');
      const extraWrap = postImageContainer.querySelector('.pd-img-extra');

      moreOverlay.addEventListener('click', () => {
        moreOverlay.remove();
        extraWrap.style.display = 'contents';

        // 접기 버튼 추가
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'pd-img-collapse-btn';
        collapseBtn.innerHTML = '<i class="ri-arrow-up-s-line"></i>접기';
        grid.after(collapseBtn);

        collapseBtn.addEventListener('click', () => {
          extraWrap.style.display = 'none';
          collapseBtn.remove();

          // 더보기 오버레이 복원
          const lastThumb = grid.querySelectorAll('.pd-img-thumb')[INITIAL_COUNT - 1];
          const overlay = document.createElement('div');
          overlay.className = 'pd-img-more-overlay';
          overlay.innerHTML = `<span>+${remaining}장 더보기</span>`;
          lastThumb.appendChild(overlay);

          overlay.addEventListener('click', () => {
            overlay.remove();
            extraWrap.style.display = 'contents';
            grid.after(collapseBtn);
          });
        });
      });
    }

    // 이미지 클릭 → 라이트박스
    postImageContainer.querySelectorAll('.pd-img-thumb').forEach((thumb, i) => {
      thumb.addEventListener('click', (e) => {
        if (e.target.closest('.pd-img-more-overlay')) return;
        openLightbox(postImageUrls, i);
      });
    });
  } else {
    postImageContainer.innerHTML = '';
    postImageContainer.style.display = 'none';
  }

  // 내용
  postContent.textContent = post.content;

  // 작성자 버튼 (본인만 보임)
  if (memberId && parseInt(memberId) === post.memberId) {
    authorActions.style.display = 'flex';
  }

  postDetail.style.display = 'block';
  hydrateAvatars(postDetail);
};

/**
 * 게시글 지도 렌더링
 */
const renderPostMap = (post) => {
  if (!postMap || !postMapSection) return;
  const address = post?.restaurant?.address;
  const latitude = post?.restaurant?.latitude;
  const longitude = post?.restaurant?.longitude;
  if (!address && (latitude === null || longitude === null || latitude === undefined || longitude === undefined)) {
    postMapSection.style.display = 'none';
    return;
  }

  const initKakaoMap = () => {
    window.kakao.maps.load(() => {
      if (!kakaoMap) {
        const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.9780);
        kakaoMap = new window.kakao.maps.Map(postMap, {
          center: defaultCenter,
          level: 4,
        });
        kakaoMarker = new window.kakao.maps.Marker({ position: defaultCenter });
        kakaoMarker.setMap(kakaoMap);
        kakaoGeocoder = new window.kakao.maps.services.Geocoder();
      }

      if (latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined) {
        const position = new window.kakao.maps.LatLng(latitude, longitude);
        kakaoMap.setCenter(position);
        kakaoMarker.setPosition(position);
        return;
      }

      if (address) {
        kakaoGeocoder.addressSearch(address, (result, status) => {
          if (status !== window.kakao.maps.services.Status.OK) return;
          const { x, y } = result[0];
          const position = new window.kakao.maps.LatLng(y, x);
          kakaoMap.setCenter(position);
          kakaoMarker.setPosition(position);
        });
      }
    });
  };

  if (window.kakao && window.kakao.maps) {
    initKakaoMap();
  } else {
    const timer = setInterval(() => {
      if (window.kakao && window.kakao.maps) {
        clearInterval(timer);
        initKakaoMap();
      }
    }, 100);
    setTimeout(() => clearInterval(timer), 10000);
  }
};

/**
 * 댓글 로드
 */
const loadComments = async () => {
  try {
    comments = await getCommentsByPost(postId);

    // 댓글 개수 업데이트
    commentCount.textContent = comments.length;

    // 댓글 렌더링
    renderComments(comments);
  } catch (error) {
    console.error('댓글 로드 실패:', error);
  }
};

/**
 * 댓글 렌더링 (최신순, 페이지네이션)
 */
const renderComments = (allComments) => {
  const pagination = document.getElementById('commentPagination');

  if (allComments.length === 0) {
    commentList.style.display = 'none';
    noComments.style.display = 'block';
    if (pagination) pagination.innerHTML = '';
    return;
  }

  commentList.style.display = 'block';
  noComments.style.display = 'none';

  // 최신순 정렬
  const sorted = [...allComments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // 부모 댓글 / 대댓글 분류
  const parentComments = sorted.filter((c) => !c.parentCommentId);
  const repliesMap = {};
  sorted.forEach((comment) => {
    if (comment.parentCommentId) {
      if (!repliesMap[comment.parentCommentId]) repliesMap[comment.parentCommentId] = [];
      repliesMap[comment.parentCommentId].push(comment);
    }
  });

  // 페이지네이션
  const totalPages = Math.ceil(parentComments.length / COMMENTS_PER_PAGE);
  if (currentCommentPage > totalPages) currentCommentPage = totalPages;
  const start = (currentCommentPage - 1) * COMMENTS_PER_PAGE;
  const pageParents = parentComments.slice(start, start + COMMENTS_PER_PAGE);

  // HTML 생성
  let html = '';
  pageParents.forEach((comment) => {
    html += createCommentHTML(comment, false);
    const replies = repliesMap[comment.id] || [];
    if (replies.length > 0) {
      html += `
        <button class="pd-replies-toggle" data-target="replies-${comment.id}">
          <i class="ri-chat-1-line"></i>답글 ${replies.length}개
          <i class="pd-replies-toggle-icon ri-arrow-down-s-line"></i>
        </button>
        <div class="pd-replies-wrap" id="replies-${comment.id}" style="display:none;">
      `;
      replies.forEach((reply) => { html += createCommentHTML(reply, true); });
      html += `</div>`;
    }
  });

  commentList.innerHTML = html;
  attachCommentEventListeners();
  hydrateAvatars(commentList);

  // 답글 접기/펼치기
  commentList.querySelectorAll('.pd-replies-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector('.pd-replies-toggle-icon');
      const isVisible = wrap.style.display !== 'none';
      wrap.style.display = isVisible ? 'none' : 'block';
      icon.className = `pd-replies-toggle-icon ${isVisible ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'}`;
      btn.classList.toggle('expanded', !isVisible);
    });
  });

  // 페이지네이션 렌더링
  renderCommentPagination(parentComments.length, totalPages);
};

/**
 * 댓글 페이지네이션 렌더링
 */
const renderCommentPagination = (total, totalPages) => {
  const pagination = document.getElementById('commentPagination');
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = `<button class="pd-page-btn" data-page="${currentCommentPage - 1}" ${currentCommentPage === 1 ? 'disabled' : ''}><i class="ri-arrow-left-s-line"></i></button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="pd-page-btn ${i === currentCommentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  html += `<button class="pd-page-btn" data-page="${currentCommentPage + 1}" ${currentCommentPage === totalPages ? 'disabled' : ''}><i class="ri-arrow-right-s-line"></i></button>`;

  pagination.innerHTML = html;

  pagination.querySelectorAll('.pd-page-btn:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCommentPage = parseInt(btn.dataset.page);
      renderComments(comments);
      commentList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
};

/**
 * 댓글 HTML 생성 (좋아요 기능 포함)
 */
const createCommentHTML = (comment, isReply) => {
  const isDeleted = comment.content === '삭제된 댓글입니다.';
  const isMyComment = memberId && parseInt(memberId) === comment.memberId;
  const commentAvatarImage = getProfileImageFrom(comment);
  const commentAvatarClass = commentAvatarImage
    ? 'comment-avatar has-image'
    : 'comment-avatar';
  const commentAvatarStyle = commentAvatarImage
    ? `style="background-image:url('${resolveImageUrl(commentAvatarImage)}')"`
    : '';
  const commentMemberId =
    comment.memberId ||
    comment.member?.id ||
    comment.authorId ||
    comment.author?.id ||
    comment.writerId ||
    comment.writer?.id ||
    '';

  return `
        <div class="comment-item ${isReply ? 'reply' : ''} ${isDeleted ? 'comment-deleted' : ''}" 
             data-comment-id="${comment.id}">
            ${
              isReply
                ? `
                <div class="reply-indicator">
                    ↳ 답글
                </div>
            `
                : ''
            }
            
            <div class="comment-content-wrapper">
                <div class="${commentAvatarClass}" ${commentAvatarStyle} data-member-id="${commentMemberId}">
                    ${comment.memberNickname.charAt(0).toUpperCase()}
                </div>
                <div class="comment-main">
                    <div class="comment-meta">
                        <div>
                            <span class="comment-author">${comment.memberNickname}</span>
                            <span class="comment-date">${formatDate(comment.createdAt)}</span>
                        </div>
                    </div>
                    <div class="comment-content ${isDeleted ? 'comment-deleted' : ''}">
                        ${comment.content}
                    </div>
                    
                    ${
                      !isDeleted
                        ? `
                        <div class="comment-actions-row">
                            <button class="comment-like-btn" data-comment-id="${comment.id}">
                                <span class="like-icon">🤍</span>
                                <span class="comment-like-count">0</span>
                            </button>
                            <button class="reply-btn" data-comment-id="${comment.id}" data-author="${comment.memberNickname}">
                                💬 답글
                            </button>
                            ${
                              isMyComment
                                ? `
                                <button class="reply-btn delete-comment-btn" 
                                        data-comment-id="${comment.id}"
                                        style="color: var(--error-color);">
                                    🗑️ 삭제
                                </button>
                            `
                                : ''
                            }
                        </div>
                        
                        <!-- 답글 작성 폼 (숨김 상태) -->
                        <div class="reply-form" id="replyForm-${comment.id}" style="display: none;">
                            <div class="reply-form-header">
                                @${comment.memberNickname}님에게 답글 작성
                            </div>
                            <form class="reply-form-content" data-parent-id="${comment.id}">
                                <textarea 
                                    class="form-textarea" 
                                    placeholder="답글을 입력하세요..."
                                    rows="3"
                                    required></textarea>
                                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
                                    <button type="button" class="btn btn-secondary btn-small cancel-reply-btn">
                                        취소
                                    </button>
                                    <button type="submit" class="btn btn-primary btn-small">
                                        답글 작성
                                    </button>
                                </div>
                            </form>
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        </div>
    `;
};

/**
 * 댓글 이벤트 리스너
 */
const attachCommentEventListeners = () => {
  // 댓글 좋아요 버튼
  document.querySelectorAll('.comment-like-btn').forEach((btn) => {
    const commentId = btn.dataset.commentId;

    // 좋아요 상태 로드
    loadCommentLikeStatus(commentId, btn);

    // 좋아요 클릭 이벤트
    btn.addEventListener('click', async () => {
      await handleCommentLikeToggle(commentId, btn);
    });
  });

  // 답글 버튼
  document.querySelectorAll('.reply-btn').forEach((btn) => {
    if (!btn.classList.contains('delete-comment-btn')) {
      btn.addEventListener('click', () => {
        const commentId = btn.dataset.commentId;
        toggleReplyForm(commentId);
      });
    }
  });

  // 답글 취소 버튼
  document.querySelectorAll('.cancel-reply-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const form = e.target.closest('.reply-form');
      form.style.display = 'none';
      form.querySelector('textarea').value = '';
    });
  });

  // 답글 작성 폼 제출
  document.querySelectorAll('.reply-form-content').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const parentId = form.dataset.parentId;
      const content = form.querySelector('textarea').value.trim();
      await handleReplySubmit(parentId, content, form);
    });
  });

  // 댓글 삭제 버튼
  document.querySelectorAll('.delete-comment-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      await handleDeleteComment(commentId);
    });
  });
};

/**
 * 댓글 좋아요 상태 로드
 */
const loadCommentLikeStatus = async (commentId, btn) => {
  try {
    const likeData = await getCommentLikeCount(commentId);

    const likeIcon = btn.querySelector('.like-icon');
    const likeCount = btn.querySelector('.comment-like-count');

    likeCount.textContent = likeData.likeCount;

    if (likeData.isLiked) {
      likeIcon.textContent = '❤️';
      btn.classList.add('liked');
    } else {
      likeIcon.textContent = '🤍';
      btn.classList.remove('liked');
    }
  } catch (error) {
    console.error('댓글 좋아요 상태 로드 실패:', error);
  }
};

/**
 * 댓글 좋아요 토글
 */
const handleCommentLikeToggle = async (commentId, btn) => {
  if (!memberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  try {
    const isLiked = btn.classList.contains('liked');

    if (isLiked) {
      await removeCommentLike(commentId);
    } else {
      await addCommentLike(commentId);
    }

    // 좋아요 상태 새로고침
    await loadCommentLikeStatus(commentId, btn);
  } catch (error) {
    console.error('댓글 좋아요 처리 실패:', error);
    alert(error.message || '좋아요 처리에 실패했습니다.');
  }
};

/**
 * 답글 폼 토글
 */
const toggleReplyForm = (commentId) => {
  if (!memberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  // 모든 답글 폼 숨기기
  document.querySelectorAll('.reply-form').forEach((form) => {
    form.style.display = 'none';
    form.querySelector('textarea').value = '';
  });

  // 해당 답글 폼 표시
  const replyForm = document.getElementById(`replyForm-${commentId}`);
  replyForm.style.display = 'block';
  replyForm.querySelector('textarea').focus();
};

/**
 * 답글 작성
 */
const handleReplySubmit = async (parentCommentId, content, form) => {
  if (!content) {
    alert('답글 내용을 입력해주세요.');
    return;
  }

  try {
    await createComment(postId, {
      content,
      parentCommentId: parseInt(parentCommentId),
    });

    // 폼 초기화 및 숨김
    form.querySelector('textarea').value = '';
    form.closest('.reply-form').style.display = 'none';

    // 댓글 목록 새로고침
    await loadComments();
  } catch (error) {
    console.error('답글 작성 실패:', error);
    alert(error.message || '답글 작성에 실패했습니다.');
  }
};

/**
 * 좋아요 상태 로드
 */
const loadLikeStatus = async () => {
  try {
    const likeData = await getPostLikeCount(postId);

    isLiked = likeData.isLiked;
    likeCount.textContent = likeData.likeCount;

    updateLikeButton();
    await updateLikesText(likeData.likeCount);
  } catch (error) {
    console.error('좋아요 상태 로드 실패:', error);
  }
};

/**
 * 좋아요 텍스트 업데이트 (첫 번째 좋아요한 회원 닉네임 포함)
 */
const updateLikesText = async (count) => {
  const likesTextEl = document.querySelector('.pd-likes-text');
  if (!likesTextEl) return;

  if (!count || count === 0) {
    likesTextEl.style.display = 'none';
    return;
  }

  likesTextEl.style.display = 'block';

  try {
    const likers = await getLikesByPost(postId);
    const firstLiker = Array.isArray(likers) && likers.length > 0
      ? (likers[0]?.memberNickname || likers[0]?.nickname || likers[0]?.member?.nickname || null)
      : null;

    if (firstLiker && count > 1) {
      likesTextEl.innerHTML = `<strong>${firstLiker}</strong>님 외 ${count - 1}명이 좋아합니다.`;
    } else if (firstLiker) {
      likesTextEl.innerHTML = `<strong>${firstLiker}</strong>님이 좋아합니다.`;
    } else {
      likesTextEl.innerHTML = `<span id="likeCount">${count}</span>명이 좋아합니다.`;
    }
  } catch {
    likesTextEl.innerHTML = `<span id="likeCount">${count}</span>명이 좋아합니다.`;
  }
};

/**
 * 좋아요 버튼 업데이트
 */
const updateLikeButton = () => {
  if (isLiked) {
    likeIcon.textContent = '❤️';
    likeBtn.classList.add('liked');
  } else {
    likeIcon.textContent = '🤍';
    likeBtn.classList.remove('liked');
  }
};

/**
 * 좋아요 토글
 */
const handleLikeToggle = async () => {
  if (!memberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  try {
    if (isLiked) {
      await removePostLike(postId);
    } else {
      await addPostLike(postId);
    }

    // 좋아요 상태 새로고침
    await loadLikeStatus();
  } catch (error) {
    console.error('좋아요 처리 실패:', error);
    alert(error.message || '좋아요 처리에 실패했습니다.');
  }
};


/**
 * 댓글 작성
 */
const handleCommentSubmit = async (e) => {
  e.preventDefault();

  if (!memberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  const content = commentInput.value.trim();

  if (!content) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  try {
    await createComment(postId, { content });

    // 입력 폼 초기화
    commentInput.value = '';

    // 댓글 목록 새로고침
    await loadComments();
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    alert(error.message || '댓글 작성에 실패했습니다.');
  }
};

/**
 * 댓글 삭제
 */
const handleDeleteComment = async (commentId) => {
  if (!confirm('댓글을 삭제하시겠습니까?')) {
    return;
  }

  try {
    await deleteComment(postId, commentId);

    // 댓글 목록 새로고침
    await loadComments();
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    alert(error.message || '댓글 삭제에 실패했습니다.');
  }
};

/**
 * 게시글 수정
 */
const handleEdit = () => {
  window.location.href = `/pages/posts/post-edit.html?id=${postId}`;
};

/**
 * 게시글 삭제
 */
const handleDelete = async () => {
  if (!confirm('게시글을 삭제하시겠습니까?')) {
    return;
  }

  try {
    const { deletePost } = await import('../../services/post-service.js');
    await deletePost(postId);

    alert('게시글이 삭제되었습니다.');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    alert(error.message || '게시글 삭제에 실패했습니다.');
  }
};

/**
 * 공유하기
 */
const handleShare = () => {
  const url = window.location.href;

  if (navigator.share) {
    navigator
      .share({
        title: post.title,
        text: `${post.restaurant?.name || ''} - ${post.title}`,
        url: url,
      })
      .catch((err) => console.log('공유 취소:', err));
  } else {
    // 클립보드에 복사
    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert('링크가 복사되었습니다!');
      })
      .catch((err) => {
        console.error('복사 실패:', err);
        alert('링크 복사에 실패했습니다.');
      });
  }
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 게시글 수정/삭제
  if (editBtn) editBtn.addEventListener('click', handleEdit);
  if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);

  // 좋아요
  likeBtn.addEventListener('click', handleLikeToggle);

  // 공유
  shareBtn.addEventListener('click', handleShare);

  // 댓글 작성
  commentForm.addEventListener('submit', handleCommentSubmit);

  // 댓글 접기/펼치기
  const commentToggleBtn = document.getElementById('commentToggleBtn');
  const commentToggleIcon = document.getElementById('commentToggleIcon');
  const commentBody = document.getElementById('commentBody');
  commentToggleBtn?.addEventListener('click', () => {
    const isVisible = commentBody.style.display !== 'none';
    commentBody.style.display = isVisible ? 'none' : 'block';
    commentToggleIcon.className = isVisible ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line';
  });
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  loading.style.display = 'block';
  postDetail.style.display = 'none';
};

/**
 * 로딩 숨김
 */
const hideLoading = () => {
  loading.style.display = 'none';
};

// 초기화 실행
init();
