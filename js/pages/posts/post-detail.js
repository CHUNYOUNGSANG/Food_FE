/**
 * 게시글 상세 페이지 로직
 */

import { getPost, deletePost } from '../../services/post-service.js';
import {
  getCommentsByPost,
  createComment,
  deleteComment,
} from '../../services/comment-service.js';
import {
  togglePostLike,
  getPostLikeCount,
} from '../../services/post-like-service.js';
import { getMemberId } from '../../utils/storage.js';
import { formatDateTime, getRelativeTime } from '../../utils/date-formatter.js';

// DOM 요소
const loading = document.getElementById('loading');
const postDetail = document.getElementById('postDetail');
const postTitle = document.getElementById('postTitle');
const categoryBadge = document.getElementById('categoryBadge');
const ratingBadge = document.getElementById('ratingBadge');
const restaurantName = document.getElementById('restaurantName');
const restaurantAddress = document.getElementById('restaurantAddress');
const authorAvatar = document.getElementById('authorAvatar');
const authorName = document.getElementById('authorName');
const postDate = document.getElementById('postDate');
const viewCount = document.getElementById('viewCount');
const authorActions = document.getElementById('authorActions');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const postImageContainer = document.getElementById('postImageContainer');
const postImage = document.getElementById('postImage');
const postContent = document.getElementById('postContent');
const likeBtn = document.getElementById('likeBtn');
const likeIcon = document.getElementById('likeIcon');
const likeCount = document.getElementById('likeCount');
const shareBtn = document.getElementById('shareBtn');
const commentCount = document.getElementById('commentCount');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentList = document.getElementById('commentList');
const noComments = document.getElementById('noComments');

// 상태
let currentPostId = null;
let currentPost = null;
let currentMemberId = null;
let isLiked = false;

/**
 * 초기화
 */
const init = async () => {
  // URL에서 게시글 ID 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  currentPostId = urlParams.get('id');

  if (!currentPostId) {
    alert('게시글을 찾을 수 없습니다.');
    window.location.href = '/index.html';
    return;
  }

  // 현재 로그인 사용자 ID
  currentMemberId = getMemberId();

  // 데이터 로드
  await loadPost();
  await loadComments();
  await loadLikeInfo();

  // 이벤트 리스너
  attachEventListeners();
};

/**
 * 게시글 로드
 */
const loadPost = async () => {
  try {
    showLoading();

    const post = await getPost(currentPostId);
    currentPost = post;

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
  if (post.foodCategory) {
    const categoryEmoji =
      {
        한식: '🌶️',
        중식: '🥟',
        일식: '🍱',
        양식: '🍝',
        카페: '☕',
      }[post.foodCategory] || '🍽️';

    const categoryClass =
      {
        한식: 'korean',
        중식: 'chinese',
        일식: 'japanese',
        양식: 'western',
        카페: 'cafe',
      }[post.foodCategory] || '';

    categoryBadge.textContent = `${categoryEmoji} ${post.foodCategory}`;
    categoryBadge.className = `category-badge ${categoryClass}`;
    categoryBadge.style.display = 'inline-flex';
  } else {
    categoryBadge.style.display = 'none';
  }

  // 평점
  if (post.rating) {
    ratingBadge.textContent = `⭐ ${post.rating}`;
    ratingBadge.style.display = 'inline-flex';
  } else {
    ratingBadge.style.display = 'none';
  }

  // 맛집 정보
  restaurantName.textContent = `📍 ${post.restaurantName}`;
  if (post.restaurantAddress) {
    restaurantAddress.textContent = post.restaurantAddress;
    restaurantAddress.style.display = 'block';
  } else {
    restaurantAddress.style.display = 'none';
  }

  // 작성자 정보
  authorAvatar.textContent = post.memberNickname.charAt(0).toUpperCase();
  authorName.textContent = post.memberNickname;
  postDate.textContent = `${formatDateTime(post.createdAt)} (${getRelativeTime(post.createdAt)})`;

  // 조회수
  viewCount.textContent = `👁️ ${post.viewCount || 0}`;

  // 작성자 버튼 (본인만 표시)
  if (currentMemberId && currentMemberId === post.memberId.toString()) {
    authorActions.style.display = 'flex';
  }

  // 이미지
  if (post.imageUrl) {
    postImage.src = post.imageUrl;
    postImage.alt = post.title;
    postImageContainer.style.display = 'block';
  } else {
    postImageContainer.style.display = 'none';
  }

  // 내용
  postContent.textContent = post.content;

  // 표시
  postDetail.style.display = 'block';
};

/**
 * 댓글 로드
 */
const loadComments = async () => {
  try {
    const comments = await getCommentsByPost(currentPostId);
    renderComments(comments);
  } catch (error) {
    console.error('댓글 로드 실패:', error);
  }
};

/**
 * 댓글 렌더링
 */
const renderComments = (comments) => {
  commentCount.textContent = comments.length;

  if (comments.length === 0) {
    commentList.innerHTML = '';
    noComments.style.display = 'block';
    return;
  }

  noComments.style.display = 'none';

  commentList.innerHTML = comments
    .map(
      (comment) => `
        <div class="comment-item" style="padding: var(--spacing-lg); border-bottom: 1px solid var(--gray-200); ${comment.deleted ? 'opacity: 0.6;' : ''}">
            <div style="display: flex; align-items: start; gap: var(--spacing-md);">
                <div class="author-avatar" style="width: 40px; height: 40px; flex-shrink: 0;">
                    ${comment.memberNickname ? comment.memberNickname.charAt(0).toUpperCase() : '?'}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                        <div>
                            <span style="font-weight: var(--font-semibold); color: var(--gray-900); font-size: var(--font-sm);">
                                ${comment.memberNickname || '익명'}
                            </span>
                            <span style="color: var(--gray-500); font-size: var(--font-xs); margin-left: var(--spacing-sm);">
                                ${getRelativeTime(comment.createdAt)}
                            </span>
                        </div>
                        ${
                          currentMemberId &&
                          currentMemberId === comment.memberId.toString() &&
                          !comment.deleted
                            ? `
                            <button class="btn btn-ghost btn-small comment-delete-btn" data-comment-id="${comment.id}" style="padding: var(--spacing-xs) var(--spacing-sm); color: var(--error-color);">
                                삭제
                            </button>
                        `
                            : ''
                        }
                    </div>
                    <p style="color: var(--gray-700); font-size: var(--font-sm); line-height: 1.6; white-space: pre-wrap; word-break: break-word;">
                        ${escapeHtml(comment.content)}
                    </p>
                </div>
            </div>
        </div>
    `,
    )
    .join('');

  // 댓글 삭제 버튼 이벤트
  document.querySelectorAll('.comment-delete-btn').forEach((btn) => {
    btn.addEventListener('click', handleCommentDelete);
  });
};

/**
 * 좋아요 정보 로드
 */
const loadLikeInfo = async () => {
  try {
    const likeInfo = await getPostLikeCount(currentPostId, currentMemberId);

    likeCount.textContent = likeInfo.likeCount;
    isLiked = likeInfo.isLiked;

    updateLikeButton();
  } catch (error) {
    console.error('좋아요 정보 로드 실패:', error);
  }
};

/**
 * 좋아요 버튼 업데이트
 */
const updateLikeButton = () => {
  if (isLiked) {
    likeIcon.textContent = '❤️';
    likeBtn.style.borderColor = 'var(--error-color)';
    likeBtn.style.color = 'var(--error-color)';
  } else {
    likeIcon.textContent = '🤍';
    likeBtn.style.borderColor = 'var(--gray-300)';
    likeBtn.style.color = 'var(--gray-700)';
  }
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 수정 버튼
  if (editBtn) {
    editBtn.addEventListener('click', handleEdit);
  }

  // 삭제 버튼
  if (deleteBtn) {
    deleteBtn.addEventListener('click', handleDelete);
  }

  // 좋아요 버튼
  likeBtn.addEventListener('click', handleLike);

  // 공유 버튼
  shareBtn.addEventListener('click', handleShare);

  // 댓글 작성
  commentForm.addEventListener('submit', handleCommentSubmit);
};

/**
 * 게시글 수정
 */
const handleEdit = () => {
  window.location.href = `/pages/posts/post-edit.html?id=${currentPostId}`;
};

/**
 * 게시글 삭제
 */
const handleDelete = async () => {
  if (!confirm('정말 삭제하시겠습니까?')) {
    return;
  }

  try {
    await deletePost(currentPostId);
    alert('게시글이 삭제되었습니다.');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    alert('게시글 삭제에 실패했습니다.');
  }
};

/**
 * 좋아요 토글
 */
const handleLike = async () => {
  if (!currentMemberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  try {
    const result = await togglePostLike(currentPostId);
    isLiked = result;

    // 좋아요 수 다시 로드
    await loadLikeInfo();
  } catch (error) {
    console.error('좋아요 실패:', error);
    alert('좋아요 처리에 실패했습니다.');
  }
};

/**
 * 공유하기
 */
const handleShare = async () => {
  const url = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({
        title: currentPost.title,
        text: `${currentPost.restaurantName} - ${currentPost.title}`,
        url: url,
      });
    } catch (error) {
      console.log('공유 취소:', error);
    }
  } else {
    // 클립보드 복사
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('링크 복사에 실패했습니다.');
    }
  }
};

/**
 * 댓글 작성
 */
const handleCommentSubmit = async (e) => {
  e.preventDefault();

  if (!currentMemberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  const content = commentInput.value.trim();

  if (!content) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  if (content.length > 500) {
    alert('댓글은 500자 이하로 입력해주세요.');
    return;
  }

  try {
    await createComment(currentPostId, { content });

    // 댓글 입력창 초기화
    commentInput.value = '';

    // 댓글 목록 다시 로드
    await loadComments();
  } catch (error) {
    console.error('댓글 작성 실패:', error);
    alert('댓글 작성에 실패했습니다.');
  }
};

/**
 * 댓글 삭제
 */
const handleCommentDelete = async (e) => {
  const commentId = e.target.dataset.commentId;

  if (!confirm('댓글을 삭제하시겠습니까?')) {
    return;
  }

  try {
    await deleteComment(currentPostId, commentId);

    // 댓글 목록 다시 로드
    await loadComments();
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    alert('댓글 삭제에 실패했습니다.');
  }
};

/**
 * HTML 이스케이프
 */
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
  loading.style.display = 'block';
  postDetail.style.display = 'none';
};

/**
 * 로딩 숨김
 */
const hideLoading = () => {
  loading.style.display = 'none';
  postDetail.style.display = 'block';
};

// 초기화 실행
init();
