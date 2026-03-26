/**
 * 내 댓글 페이지 로직 (수정 기능 추가)
 */

import {
  getCommentsByMember,
  deleteComment,
  updateComment,
} from '../../services/comment-service.js';
import { getMemberId } from '../../utils/storage.js';
import { formatDate } from '../../utils/date-formatter.js';

// DOM 요소
const loading = document.getElementById('loading');
const commentsList = document.getElementById('commentsList');
const emptyState = document.getElementById('emptyState');
const totalCommentsSpan = document.getElementById('totalComments');
const todayCommentsSpan = document.getElementById('todayComments');

// 모달 요소
const editModal = document.getElementById('editModal');
const editCommentForm = document.getElementById('editCommentForm');
const editContent = document.getElementById('editContent');
const editContentCount = document.getElementById('editContentCount');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// 상태
let myComments = [];
let memberId = null;
let currentEditingComment = null; // 현재 수정 중인 댓글

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

  await loadComments();
  attachModalEventListeners();
};

/**
 * 댓글 로드
 */
const loadComments = async () => {
  try {
    showLoading();

    myComments = await getCommentsByMember(memberId);

    // 통계 업데이트
    updateStats();

    // 댓글 렌더링
    renderComments();
  } catch (error) {
    console.error('댓글 로드 실패:', error);
    showEmptyState();
  } finally {
    hideLoading();
  }
};

/**
 * 통계 업데이트
 */
const updateStats = () => {
  // 전체 댓글 수
  totalCommentsSpan.textContent = myComments.length;

  // 오늘 작성된 댓글 수
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayComments = myComments.filter((comment) => {
    const commentDate = new Date(comment.createdAt);
    commentDate.setHours(0, 0, 0, 0);
    return commentDate.getTime() === today.getTime();
  });

  todayCommentsSpan.textContent = todayComments.length;
};

/**
 * 댓글 렌더링
 */
const renderComments = () => {
  if (myComments.length === 0) {
    showEmptyState();
    return;
  }

  commentsList.style.display = 'block';
  emptyState.style.display = 'none';

  commentsList.innerHTML = myComments
    .map((comment) => createCommentCard(comment))
    .join('');

  // 이벤트 리스너 등록
  attachCommentEventListeners();
};

/**
 * 댓글 카드 생성
 */
const createCommentCard = (comment) => {
  const isDeleted = comment.content === '삭제된 댓글입니다.';

  return `
        <div class="comment-card ${isDeleted ? 'comment-deleted' : ''}" data-comment-id="${comment.id}">
            <div class="comment-card-header">
                <div class="comment-post-info">
                    <div class="comment-post-title" data-post-id="${comment.postId}">
                        📝 리뷰로 이동
                    </div>
                    <div class="comment-date">
                        ${formatDate(comment.createdAt)}
                    </div>
                </div>
                ${
                  !isDeleted
                    ? `
                    <div class="comment-actions">
                        <button class="btn btn-secondary btn-small edit-comment-btn" 
                                data-comment-id="${comment.id}"
                                data-post-id="${comment.postId}"
                                data-content="${comment.content.replace(/"/g, '&quot;')}">
                            수정
                        </button>
                        <button class="btn btn-outline btn-small delete-comment-btn" 
                                data-comment-id="${comment.id}"
                                data-post-id="${comment.postId}">
                            삭제
                        </button>
                    </div>
                `
                    : ''
                }
            </div>
            
            <div class="comment-content-box">
                <p class="comment-text ${isDeleted ? 'comment-deleted-text' : ''}">
                    ${comment.content}
                </p>
            </div>

            ${
              comment.parentCommentId
                ? `
                <div style="font-size: var(--font-sm); color: var(--gray-500);">
                    💬 대댓글
                </div>
            `
                : ''
            }
        </div>
    `;
};

/**
 * 이벤트 리스너 등록
 */
const attachCommentEventListeners = () => {
  // 리뷰로 이동
  document.querySelectorAll('.comment-post-title').forEach((title) => {
    title.addEventListener('click', () => {
      const postId = title.dataset.postId;
      window.location.href = `/pages/posts/post-detail.html?id=${postId}`;
    });
  });

  // 댓글 수정
  document.querySelectorAll('.edit-comment-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const commentId = btn.dataset.commentId;
      const postId = btn.dataset.postId;
      const content = btn.dataset.content;
      openEditModal(commentId, postId, content);
    });
  });

  // 댓글 삭제
  document.querySelectorAll('.delete-comment-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const commentId = btn.dataset.commentId;
      const postId = btn.dataset.postId;
      await handleDeleteComment(postId, commentId);
    });
  });
};

/**
 * 모달 이벤트 리스너
 */
const attachModalEventListeners = () => {
  // 모달 닫기
  closeModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  // 모달 오버레이 클릭 시 닫기
  editModal
    .querySelector('.modal-overlay')
    .addEventListener('click', closeEditModal);

  // 댓글 수정 폼 제출
  editCommentForm.addEventListener('submit', handleEditSubmit);

  // 글자 수 카운트
  editContent.addEventListener('input', () => {
    const count = editContent.value.length;
    editContentCount.textContent = `${count} / 500자`;

    if (count > 500) {
      editContentCount.style.color = 'var(--error-color)';
    } else {
      editContentCount.style.color = 'var(--gray-500)';
    }
  });
};

/**
 * 수정 모달 열기
 */
const openEditModal = (commentId, postId, content) => {
  currentEditingComment = { commentId, postId };
  editContent.value = content;
  editContentCount.textContent = `${content.length} / 500자`;
  editModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
};

/**
 * 수정 모달 닫기
 */
const closeEditModal = () => {
  editModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  currentEditingComment = null;
  editCommentForm.reset();
};

/**
 * 댓글 수정 제출
 */
const handleEditSubmit = async (e) => {
  e.preventDefault();

  const content = editContent.value.trim();

  if (!content) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  if (content.length > 500) {
    alert('댓글은 500자 이하로 입력해주세요.');
    return;
  }

  try {
    await updateComment(
      currentEditingComment.postId,
      currentEditingComment.commentId,
      { content },
    );

    alert('댓글이 수정되었습니다.');
    closeEditModal();

    // 댓글 목록 새로고침
    await loadComments();
  } catch (error) {
    console.error('댓글 수정 실패:', error);
    alert(error.message || '댓글 수정에 실패했습니다.');
  }
};

/**
 * 댓글 삭제
 */
const handleDeleteComment = async (postId, commentId) => {
  if (!confirm('댓글을 삭제하시겠습니까?')) {
    return;
  }

  try {
    await deleteComment(postId, commentId);

    alert('댓글이 삭제되었습니다.');

    // 댓글 목록 새로고침
    await loadComments();
  } catch (error) {
    console.error('댓글 삭제 실패:', error);
    alert(error.message || '댓글 삭제에 실패했습니다.');
  }
};

/**
 * 빈 상태 표시
 */
const showEmptyState = () => {
  commentsList.style.display = 'none';
  emptyState.style.display = 'block';
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  loading.style.display = 'block';
  commentsList.style.display = 'none';
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
