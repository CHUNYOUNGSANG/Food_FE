/**
 * 좋아요한 댓글 페이지 로직
 */

import {
  getLikedCommentsByMember,
  removeCommentLike,
} from '../../services/comment-like-service.js';
import { getMemberId } from '../../utils/auth.js';
import { formatDate } from '../../utils/date-formatter.js';

// DOM 요소
const loading = document.getElementById('loading');
const likedCommentsList = document.getElementById('likedCommentsList');
const emptyState = document.getElementById('emptyState');
const totalLikesSpan = document.getElementById('totalLikes');
const todayLikesSpan = document.getElementById('todayLikes');

// 상태
let likedComments = [];
let memberId = null;

/**
 * 초기화
 */
const init = async () => {
  // 로그인 확인
  memberId = getMemberId();
  if (!memberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  await loadLikedComments();
};

/**
 * 좋아요한 댓글 로드
 */
const loadLikedComments = async () => {
  try {
    showLoading();

    likedComments = await getLikedCommentsByMember(memberId);

    // 통계 업데이트
    updateStats();

    // 댓글 렌더링
    renderComments();
  } catch (error) {
    console.error('좋아요한 댓글 로드 실패:', error);
    showEmptyState();
  } finally {
    hideLoading();
  }
};

/**
 * 통계 업데이트
 */
const updateStats = () => {
  // 전체 좋아요 수
  totalLikesSpan.textContent = likedComments.length;

  // 오늘 좋아요 누른 개수
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLikes = likedComments.filter((like) => {
    const likeDate = new Date(like.createdAt);
    likeDate.setHours(0, 0, 0, 0);
    return likeDate.getTime() === today.getTime();
  });

  todayLikesSpan.textContent = todayLikes.length;
};

/**
 * 댓글 렌더링
 */
const renderComments = () => {
  if (likedComments.length === 0) {
    showEmptyState();
    return;
  }

  likedCommentsList.style.display = 'block';
  emptyState.style.display = 'none';

  likedCommentsList.innerHTML = likedComments
    .map((like) => createLikedCommentCard(like))
    .join('');

  // 이벤트 리스너 등록
  attachEventListeners();
};

/**
 * 좋아요한 댓글 카드 생성
 */
const createLikedCommentCard = (like) => {
  // like 객체: { id, memberId, nickname, commentId, content, postId, title, createdAt }

  return `
        <div class="comment-card" data-like-id="${like.id}">
            <div class="comment-card-header">
                <div class="comment-info">
                    <div class="comment-author">
                        👤 ${like.nickname || '익명'}
                    </div>
                    <div class="comment-post-link" data-post-id="${like.postId}">
                        📝 ${like.title || '제목 없음'}
                    </div>
                </div>
                <div class="like-info">
                    <div class="like-date">
                        ❤️ ${formatDate(like.createdAt)}
                    </div>
                </div>
            </div>
            
            <div class="comment-content-box">
                <p class="comment-text">
                    ${like.content || '내용 없음'}
                </p>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: var(--spacing-sm);">
                <button class="btn btn-secondary btn-small view-post-btn" data-post-id="${like.postId}">
                    게시글 보기
                </button>
                <button class="btn btn-outline btn-small unlike-btn" data-comment-id="${like.commentId}">
                    좋아요 취소
                </button>
            </div>
        </div>
    `;
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 게시글로 이동
  document
    .querySelectorAll('.comment-post-link, .view-post-btn')
    .forEach((element) => {
      element.addEventListener('click', () => {
        const postId = element.dataset.postId;
        window.location.href = `/pages/posts/post-detail.html?id=${postId}`;
      });
    });

  // 좋아요 취소
  document.querySelectorAll('.unlike-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const commentId = btn.dataset.commentId;
      await handleUnlike(commentId);
    });
  });
};

/**
 * 좋아요 취소
 */
const handleUnlike = async (commentId) => {
  if (!confirm('댓글 좋아요를 취소하시겠습니까?')) {
    return;
  }

  try {
    await removeCommentLike(memberId, commentId);

    alert('좋아요가 취소되었습니다.');

    // 목록 새로고침
    await loadLikedComments();
  } catch (error) {
    console.error('좋아요 취소 실패:', error);
    alert(error.message || '좋아요 취소에 실패했습니다.');
  }
};

/**
 * 빈 상태 표시
 */
const showEmptyState = () => {
  likedCommentsList.style.display = 'none';
  emptyState.style.display = 'block';
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  loading.style.display = 'block';
  likedCommentsList.style.display = 'none';
  emptyState.style.display = 'none';
};

/**
 * 로딩 숨김
 */
const hideLoading = () => {
  loading.style.display = 'none';
};

// 초기화 실행
init();
