/**
 * 관리자 페이지 로직
 */

import { getAllPosts, deletePost } from '../../services/post-service.js';
import { getAllMembers, getMember, deleteMember } from '../../services/member-service.js';
import { getCommentsByPost, deleteComment } from '../../services/comment-service.js';
import {
  getMemberId,
  clearStorage,
  isAdmin,
} from '../../utils/storage.js';
import { resolveImageUrl } from '../../utils/image-url.js';
import { hydrateAvatars } from '../../utils/avatar-loader.js';

// DOM 요소
const profileAvatar = document.getElementById('profileAvatar');
const profileNickname = document.getElementById('profileNickname');
const profileEmail = document.getElementById('profileEmail');

// 탭 버튼
const dashboardTab = document.getElementById('dashboardTab');
const postsTab = document.getElementById('postsTab');
const membersTab = document.getElementById('membersTab');
const commentsTab = document.getElementById('commentsTab');

// 탭 컨텐츠
const dashboardContent = document.getElementById('dashboardContent');
const postsContent = document.getElementById('postsContent');
const membersContent = document.getElementById('membersContent');
const commentsContent = document.getElementById('commentsContent');

// 게시글 관리
const postsLoading = document.getElementById('postsLoading');
const postsGrid = document.getElementById('postsGrid');
const postsEmptyState = document.getElementById('postsEmptyState');
const postCountBadge = document.getElementById('postCountBadge');

// 회원 관리
const membersLoading = document.getElementById('membersLoading');
const membersGrid = document.getElementById('membersGrid');
const membersEmptyState = document.getElementById('membersEmptyState');
const memberCountBadge = document.getElementById('memberCountBadge');

// 댓글 관리
const commentsLoading = document.getElementById('commentsLoading');
const commentsPostList = document.getElementById('commentsPostList');
const commentsEmptyState = document.getElementById('commentsEmptyState');
const commentCountBadge = document.getElementById('commentCountBadge');

// 상태
let currentMemberId = null;
let allPosts = [];
let allMembers = [];

/**
 * 초기화
 */
const init = async () => {
  currentMemberId = getMemberId();

  if (!currentMemberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  if (!isAdmin()) {
    alert('관리자 권한이 필요합니다.');
    window.location.href = '/index.html';
    return;
  }

  await loadProfile();
  await loadDashboard();
  attachEventListeners();
};

/**
 * 프로필 로드 (사이드바용)
 */
const loadProfile = async () => {
  try {
    const member = await getMember(currentMemberId);
    if (member.profileImage) {
      profileAvatar.textContent = '';
      profileAvatar.style.backgroundImage = `url("${resolveImageUrl(member.profileImage)}")`;
      profileAvatar.classList.add('has-image');
    } else {
      profileAvatar.style.backgroundImage = '';
      profileAvatar.classList.remove('has-image');
      profileAvatar.textContent = member.nickname.charAt(0).toUpperCase();
    }
    profileNickname.textContent = member.nickname;
    profileEmail.textContent = member.email;
  } catch (error) {
    console.error('프로필 로드 실패:', error);
  }
};

/**
 * 대시보드 로드
 */
const loadDashboard = async () => {
  try {
    const [posts, members] = await Promise.all([
      getAllPosts().catch(() => []),
      getAllMembers().catch(() => []),
    ]);

    allPosts = posts;
    allMembers = members;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = posts.filter((p) => {
      const d = new Date(p.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

    // 사이드바 통계
    const statTotalPosts = document.getElementById('statTotalPosts');
    const statTotalMembers = document.getElementById('statTotalMembers');
    const statTodayPosts = document.getElementById('statTodayPosts');
    if (statTotalPosts) statTotalPosts.textContent = posts.length.toLocaleString();
    if (statTotalMembers && members.length > 0) statTotalMembers.textContent = members.length.toLocaleString();
    if (statTodayPosts) statTodayPosts.textContent = todayCount.toLocaleString();

    // 대시보드 카드
    const dashTotalPosts = document.getElementById('dashTotalPosts');
    const dashTotalMembers = document.getElementById('dashTotalMembers');
    const dashTodayPosts = document.getElementById('dashTodayPosts');
    if (dashTotalPosts) dashTotalPosts.textContent = posts.length.toLocaleString();
    if (dashTotalMembers) dashTotalMembers.textContent = members.length > 0 ? members.length.toLocaleString() : '-';
    if (dashTodayPosts) dashTodayPosts.textContent = todayCount.toLocaleString();

    // 최근 게시글 5개
    const recentPostsList = document.getElementById('recentPostsList');
    if (recentPostsList) {
      const recent = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      if (recent.length === 0) {
        recentPostsList.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:24px;">게시글이 없습니다.</p>';
      } else {
        recentPostsList.innerHTML = recent.map((p) => createAdminPostRow(p)).join('');
        attachPostDeleteListeners(recentPostsList);
      }
    }
  } catch (error) {
    console.error('대시보드 로드 실패:', error);
  }
};

/**
 * 전체 게시글 로드
 */
const loadAllPosts = async () => {
  postsLoading.style.display = 'block';
  postsGrid.style.display = 'none';
  postsEmptyState.style.display = 'none';

  try {
    if (allPosts.length === 0) {
      allPosts = await getAllPosts();
    }

    if (postCountBadge) postCountBadge.textContent = `${allPosts.length}개`;

    if (allPosts.length === 0) {
      postsEmptyState.style.display = 'block';
      return;
    }

    const sorted = [...allPosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    postsGrid.innerHTML = sorted.map((p) => createAdminPostRow(p)).join('');
    postsGrid.style.display = 'block';
    hydrateAvatars(postsGrid);
    attachPostDeleteListeners(postsGrid);
  } catch (error) {
    console.error('게시글 로드 실패:', error);
    postsEmptyState.style.display = 'block';
  } finally {
    postsLoading.style.display = 'none';
  }
};

/**
 * 전체 회원 로드 (탈퇴 버튼 포함)
 */
const loadAllMembers = async () => {
  membersLoading.style.display = 'block';
  membersGrid.style.display = 'none';
  membersEmptyState.style.display = 'none';

  try {
    if (allMembers.length === 0) {
      allMembers = await getAllMembers();
    }

    if (memberCountBadge) memberCountBadge.textContent = `${allMembers.length}명`;

    if (allMembers.length === 0) {
      membersEmptyState.style.display = 'block';
      return;
    }

    renderMembersTable();
    membersGrid.style.display = 'block';
  } catch (error) {
    console.error('회원 로드 실패:', error);
    membersEmptyState.style.display = 'block';
  } finally {
    membersLoading.style.display = 'none';
  }
};

/**
 * 회원 테이블 렌더링
 */
const renderMembersTable = () => {
  membersGrid.innerHTML = `
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <thead>
        <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
          <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">ID</th>
          <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">닉네임</th>
          <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">이메일</th>
          <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">권한</th>
          <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">가입일</th>
          <th style="padding:12px 16px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">관리</th>
        </tr>
      </thead>
      <tbody>
        ${allMembers.map((m) => `
          <tr data-member-id="${m.id}" style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:12px 16px;font-size:13px;color:#374151;">${m.id}</td>
            <td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:500;">${escapeHtml(m.nickname || '-')}</td>
            <td style="padding:12px 16px;font-size:13px;color:#6b7280;">${escapeHtml(m.email || '-')}</td>
            <td style="padding:12px 16px;">
              <span style="padding:2px 8px;border-radius:20px;font-size:12px;font-weight:600;${m.role === 'ADMIN' ? 'background:#fef3c7;color:#d97706;' : 'background:#f0fdf4;color:#16a34a;'}">
                ${m.role || 'USER'}
              </span>
            </td>
            <td style="padding:12px 16px;font-size:13px;color:#6b7280;">${m.createdAt ? new Date(m.createdAt).toLocaleDateString('ko-KR') : '-'}</td>
            <td style="padding:12px 16px;">
              ${m.role === 'ADMIN' ? '<span style="font-size:12px;color:#d1d5db;">-</span>' : `
                <button class="admin-delete-member-btn" data-member-id="${m.id}" data-member-nickname="${escapeHtml(m.nickname || '')}"
                  style="padding:5px 10px;background:#fee2e2;color:#ef4444;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
                  탈퇴
                </button>
              `}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  membersGrid.querySelectorAll('.admin-delete-member-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const memberId = btn.dataset.memberId;
      const nickname = btn.dataset.memberNickname;
      if (!confirm(`"${nickname}" 회원을 탈퇴시키겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
      try {
        await deleteMember(memberId);
        allMembers = allMembers.filter((m) => String(m.id) !== String(memberId));
        btn.closest('tr[data-member-id]').remove();
        if (memberCountBadge) memberCountBadge.textContent = `${allMembers.length}명`;
        const statTotalMembers = document.getElementById('statTotalMembers');
        if (statTotalMembers && allMembers.length > 0) statTotalMembers.textContent = allMembers.length.toLocaleString();
      } catch (error) {
        alert(error.message || '회원 탈퇴 처리에 실패했습니다.');
      }
    });
  });
};

/**
 * 댓글 관리 로드 (게시글별 펼침)
 */
const loadAllComments = async () => {
  commentsLoading.style.display = 'block';
  commentsPostList.style.display = 'none';
  commentsEmptyState.style.display = 'none';

  try {
    if (allPosts.length === 0) {
      allPosts = await getAllPosts();
    }

    if (allPosts.length === 0) {
      commentsEmptyState.style.display = 'block';
      return;
    }

    const sorted = [...allPosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    commentsPostList.innerHTML = sorted.map((p) => createCommentPostItem(p)).join('');
    commentsPostList.style.display = 'block';

    // 토글 이벤트 연결
    commentsPostList.querySelectorAll('.comment-post-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const postId = btn.dataset.postId;
        const commentsBox = document.getElementById(`comments-box-${postId}`);
        const icon = btn.querySelector('.toggle-icon');

        if (commentsBox.style.display === 'none') {
          commentsBox.style.display = 'block';
          icon.style.transform = 'rotate(180deg)';
          if (!commentsBox.dataset.loaded) {
            commentsBox.innerHTML = '<p style="color:#9ca3af;padding:12px 0;font-size:13px;">로딩중...</p>';
            try {
              const comments = await getCommentsByPost(postId);
              commentsBox.dataset.loaded = 'true';
              renderComments(commentsBox, postId, comments);
              updateCommentBadge();
            } catch {
              commentsBox.innerHTML = '<p style="color:#ef4444;padding:12px 0;font-size:13px;">댓글을 불러오지 못했습니다.</p>';
            }
          }
        } else {
          commentsBox.style.display = 'none';
          icon.style.transform = 'rotate(0deg)';
        }
      });
    });
  } catch (error) {
    console.error('댓글 관리 로드 실패:', error);
    commentsEmptyState.style.display = 'block';
  } finally {
    commentsLoading.style.display = 'none';
  }
};

/**
 * 댓글 관리용 게시글 아이템 생성
 */
const createCommentPostItem = (post) => {
  const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR') : '-';
  return `
    <div style="background:#fff;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:8px;overflow:hidden;">
      <button class="comment-post-toggle" data-post-id="${post.id}"
        style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:none;border:none;cursor:pointer;text-align:left;gap:12px;">
        <div style="flex:1;min-width:0;">
          <span style="font-size:14px;font-weight:600;color:#111827;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(post.title || '제목 없음')}</span>
          <span style="font-size:12px;color:#9ca3af;">${escapeHtml(post.memberNickname || '')} · ${date}</span>
        </div>
        <span class="toggle-icon" style="color:#9ca3af;font-size:18px;transition:transform 0.2s;">▾</span>
      </button>
      <div id="comments-box-${post.id}" style="display:none;padding:0 16px 12px;border-top:1px solid #f3f4f6;"></div>
    </div>
  `;
};

/**
 * 댓글 목록 렌더링
 */
const renderComments = (container, postId, comments) => {
  if (!comments || comments.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af;padding:12px 0;font-size:13px;">댓글이 없습니다.</p>';
    return;
  }

  container.innerHTML = comments.map((c) => `
    <div data-comment-id="${c.id}" style="display:flex;align-items:flex-start;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f9fafb;gap:12px;">
      <div style="flex:1;min-width:0;">
        <span style="font-size:12px;font-weight:600;color:#374151;">${escapeHtml(c.memberNickname || c.nickname || '알수없음')}</span>
        <p style="font-size:13px;color:#4b5563;margin:4px 0 0;line-height:1.5;">${escapeHtml(c.content || '')}</p>
        <span style="font-size:11px;color:#d1d5db;">${c.createdAt ? new Date(c.createdAt).toLocaleDateString('ko-KR') : ''}</span>
      </div>
      <button class="admin-delete-comment-btn" data-post-id="${postId}" data-comment-id="${c.id}"
        style="flex-shrink:0;padding:4px 10px;background:#fee2e2;color:#ef4444;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
        삭제
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.admin-delete-comment-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cPostId = btn.dataset.postId;
      const commentId = btn.dataset.commentId;
      if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
      try {
        await deleteComment(cPostId, commentId);
        btn.closest('[data-comment-id]').remove();
        updateCommentBadge();
      } catch (error) {
        alert(error.message || '댓글 삭제에 실패했습니다.');
      }
    });
  });
};

/**
 * 댓글 뱃지 카운트 업데이트
 */
const updateCommentBadge = () => {
  if (!commentCountBadge) return;
  const total = commentsPostList.querySelectorAll('[data-comment-id]').length;
  commentCountBadge.textContent = `${total}개`;
};

/**
 * 관리자용 게시글 행 생성
 */
const createAdminPostRow = (post) => {
  const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR') : '-';
  return `
    <div data-post-id="${post.id}" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:8px;gap:12px;">
      <div style="flex:1;min-width:0;">
        <a href="/pages/posts/post-detail.html?id=${post.id}" style="font-size:14px;font-weight:600;color:#111827;text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(post.title || '제목 없음')}</a>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
          <span style="font-size:12px;color:#9ca3af;">${escapeHtml(post.memberNickname || '알수없음')}</span>
          <span style="font-size:12px;color:#d1d5db;">·</span>
          <span style="font-size:12px;color:#9ca3af;">${date}</span>
          ${post.restaurant?.name ? `<span style="font-size:12px;color:#d1d5db;">·</span><span style="font-size:12px;color:#f97316;">${escapeHtml(post.restaurant.name)}</span>` : ''}
        </div>
      </div>
      <button class="admin-delete-post-btn" data-post-id="${post.id}" style="flex-shrink:0;padding:6px 12px;background:#fee2e2;color:#ef4444;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">삭제</button>
    </div>
  `;
};

/**
 * 게시글 삭제 버튼 이벤트 연결
 */
const attachPostDeleteListeners = (container) => {
  container.querySelectorAll('.admin-delete-post-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
      try {
        await deletePost(postId);
        allPosts = allPosts.filter((p) => String(p.id) !== String(postId));
        btn.closest('[data-post-id]').remove();
        if (postCountBadge) postCountBadge.textContent = `${allPosts.length}개`;
        const statTotalPosts = document.getElementById('statTotalPosts');
        if (statTotalPosts) statTotalPosts.textContent = allPosts.length.toLocaleString();
        const dashTotalPosts = document.getElementById('dashTotalPosts');
        if (dashTotalPosts) dashTotalPosts.textContent = allPosts.length.toLocaleString();
      } catch (error) {
        alert(error.message || '게시글 삭제에 실패했습니다.');
      }
    });
  });
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
 * 탭 전환
 */
const switchTab = async (tab) => {
  [dashboardTab, postsTab, membersTab, commentsTab].forEach((t) => t && t.classList.remove('active'));
  [dashboardContent, postsContent, membersContent, commentsContent].forEach((c) => c && (c.style.display = 'none'));

  if (tab === 'dashboard') {
    dashboardTab.classList.add('active');
    dashboardContent.style.display = 'block';
  } else if (tab === 'posts') {
    postsTab.classList.add('active');
    postsContent.style.display = 'block';
    await loadAllPosts();
  } else if (tab === 'members') {
    membersTab.classList.add('active');
    membersContent.style.display = 'block';
    await loadAllMembers();
  } else if (tab === 'comments') {
    commentsTab.classList.add('active');
    commentsContent.style.display = 'block';
    await loadAllComments();
  }
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  dashboardTab.addEventListener('click', () => switchTab('dashboard'));
  postsTab.addEventListener('click', () => switchTab('posts'));
  membersTab.addEventListener('click', () => switchTab('members'));
  commentsTab.addEventListener('click', () => switchTab('comments'));

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearStorage();
      window.location.href = '/index.html';
    });
  }

  // 모바일 탭
  const mobileDashboardTab = document.getElementById('mobileDashboardTab');
  const mobilePostsTab = document.getElementById('mobilePostsTab');
  const mobileMembersTab = document.getElementById('mobileMembersTab');
  const mobileCommentsTab = document.getElementById('mobileCommentsTab');
  const mobileTabs = [mobileDashboardTab, mobilePostsTab, mobileMembersTab, mobileCommentsTab];

  const setMobileActive = (btn) => {
    mobileTabs.forEach((b) => b && b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  };

  if (mobileDashboardTab) mobileDashboardTab.addEventListener('click', () => { setMobileActive(mobileDashboardTab); switchTab('dashboard'); });
  if (mobilePostsTab) mobilePostsTab.addEventListener('click', () => { setMobileActive(mobilePostsTab); switchTab('posts'); });
  if (mobileMembersTab) mobileMembersTab.addEventListener('click', () => { setMobileActive(mobileMembersTab); switchTab('members'); });
  if (mobileCommentsTab) mobileCommentsTab.addEventListener('click', () => { setMobileActive(mobileCommentsTab); switchTab('comments'); });
};

// 초기화
init();
