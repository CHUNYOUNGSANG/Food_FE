/**
 * 마이페이지 로직
 */

import { getPostsByMember } from '../../services/post-service.js';
import { getLikedPostsByMember } from '../../services/post-like-service.js';
import {
  getMember,
  updateMember,
  deleteMember,
} from '../../services/member-service.js';
import { getMemberId, getUser, setUser } from '../../utils/storage.js';
import { createPostCard } from '../../components/post-card.js';

// DOM 요소
const profileAvatar = document.getElementById('profileAvatar');
const profileNickname = document.getElementById('profileNickname');
const profileEmail = document.getElementById('profileEmail');
const postCount = document.getElementById('postCount');
const likedCount = document.getElementById('likedCount');
const commentsTab = document.getElementById('commentsTab');
const likedCommentsTab = document.getElementById('likedCommentsTab');
const passwordForm = document.getElementById('passwordForm');
const oldPassword = document.getElementById('oldPassword');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const passwordError = document.getElementById('passwordError');
const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');

// 탭 버튼
const postsTab = document.getElementById('postsTab');
const likedPostsTab = document.getElementById('likedPostsTab');
const profileTab = document.getElementById('profileTab');

// 탭 컨텐츠
const postsContent = document.getElementById('postsContent');
const likedPostsContent = document.getElementById('likedPostsContent');
const profileContent = document.getElementById('profileContent');

// 내 게시글 탭
const postsLoading = document.getElementById('postsLoading');
const postsGrid = document.getElementById('postsGrid');
const postsEmptyState = document.getElementById('postsEmptyState');

// 좋아요한 게시글 탭
const likedPostsLoading = document.getElementById('likedPostsLoading');
const likedPostsGrid = document.getElementById('likedPostsGrid');
const likedPostsEmptyState = document.getElementById('likedPostsEmptyState');

// 프로필 수정
const profileForm = document.getElementById('profileForm');
const nameInput = document.getElementById('name');
const nicknameInput = document.getElementById('nickname');
const profileImageInput = document.getElementById('profileImage');
const profileSubmitBtn = document.getElementById('profileSubmitBtn');
const profileError = document.getElementById('profileError');

// 상태
let currentMemberId = null;
let currentUser = null;
let myPosts = [];
let myLikedPosts = [];

/**
 * 초기화
 */
const init = async () => {
  // 로그인 확인
  currentMemberId = getMemberId();
  if (!currentMemberId) {
    alert('로그인이 필요합니다.');
    window.location.href = '/pages/auth/login.html';
    return;
  }

  currentUser = getUser();

  // 프로필 로드
  await loadProfile();

  // 게시글 로드
  await loadMyPosts();

  // 이벤트 리스너
  attachEventListeners();
};

/**
 * 프로필 로드
 */
const loadProfile = async () => {
  try {
    const member = await getMember(currentMemberId);

    // 프로필 표시
    profileAvatar.textContent = member.nickname.charAt(0).toUpperCase();
    profileNickname.textContent = member.nickname;
    profileEmail.textContent = member.email;

    // 프로필 폼 채우기
    nameInput.value = member.name;
    nicknameInput.value = member.nickname;
    profileImageInput.value = member.profileImage || '';
  } catch (error) {
    console.error('프로필 로드 실패:', error);
  }
};

/**
 * 내 게시글 로드
 */
const loadMyPosts = async () => {
  try {
    showPostsLoading();

    myPosts = await getPostsByMember(currentMemberId);

    // 게시글 개수 표시
    postCount.textContent = myPosts.length;

    // 게시글 렌더링
    renderMyPosts(myPosts);
  } catch (error) {
    console.error('게시글 로드 실패:', error);
    showPostsEmptyState();
  } finally {
    hidePostsLoading();
  }
};

/**
 * 좋아요한 게시글 로드
 */
const loadLikedPosts = async () => {
  try {
    showLikedPostsLoading();

    const likedData = await getLikedPostsByMember(currentMemberId);

    // 좋아요 데이터에서 게시글 정보 추출
    myLikedPosts = likedData.map((like) => ({
      id: like.postId,
      title: like.title,
      memberId: like.memberId,
      memberNickname: like.nickname,
      // 추가 정보가 필요하면 별도 API 호출 필요
      // 하지만 백엔드에서 이미 필요한 정보를 다 주고 있음
    }));

    // 좋아요 개수 표시
    likedCount.textContent = myLikedPosts.length;

    // 게시글 렌더링
    renderLikedPosts(likedData);
  } catch (error) {
    console.error('좋아요한 게시글 로드 실패:', error);
    showLikedPostsEmptyState();
  } finally {
    hideLikedPostsLoading();
  }
};

/**
 * 내 게시글 렌더링
 */
const renderMyPosts = (posts) => {
  if (posts.length === 0) {
    showPostsEmptyState();
    return;
  }

  postsGrid.innerHTML = posts.map((post) => createPostCard(post)).join('');
  postsGrid.style.display = 'grid';
  postsEmptyState.style.display = 'none';
};

/**
 * 좋아요한 게시글 렌더링
 */
const renderLikedPosts = (likedData) => {
  if (likedData.length === 0) {
    showLikedPostsEmptyState();
    return;
  }

  // 좋아요 데이터를 게시글 카드 형식으로 변환
  likedPostsGrid.innerHTML = likedData
    .map((like) => {
      // PostLikeResponseDto 구조를 Post 구조로 변환
      const postData = {
        id: like.postId,
        title: like.title,
        memberId: like.memberId,
        memberNickname: like.nickname,
        createdAt: like.createdAt,
        // 좋아요 데이터에는 일부 정보만 있으므로 간단한 카드로 표시
      };
      return createLikedPostCard(postData);
    })
    .join('');

  likedPostsGrid.style.display = 'grid';
  likedPostsEmptyState.style.display = 'none';
};

/**
 * 좋아요한 게시글 카드 생성 (간소화 버전)
 */
const createLikedPostCard = (post) => {
  return `
        <a href="/pages/posts/post-detail.html?id=${post.id}" class="post-card" style="text-decoration: none; color: inherit; display: block; background: var(--white); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--gray-200); transition: all 0.3s; box-shadow: var(--shadow-md);">
            <div style="padding: var(--spacing-xl);">
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
                    <span style="background: var(--error-light); color: var(--error-color); padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-md); font-size: var(--font-xs); font-weight: var(--font-semibold);">
                        ❤️ 좋아요
                    </span>
                </div>
                
                <h3 style="font-size: var(--font-lg); font-weight: var(--font-bold); color: var(--gray-900); margin-bottom: var(--spacing-md); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${escapeHtml(post.title)}
                </h3>
                
                <div style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--spacing-md); border-top: 1px solid var(--gray-200);">
                    <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: var(--font-bold); font-size: var(--font-sm);">
                            ${post.memberNickname ? post.memberNickname.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style="font-size: var(--font-sm); color: var(--gray-600); font-weight: var(--font-medium);">
                            ${escapeHtml(post.memberNickname || '익명')}
                        </span>
                    </div>
                    
                    <span style="color: var(--primary-color); font-size: var(--font-sm); font-weight: var(--font-semibold);">
                        자세히 보기 →
                    </span>
                </div>
            </div>
        </a>
    `;
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
 * 빈 상태 표시 (내 게시글)
 */
const showPostsEmptyState = () => {
  postsGrid.style.display = 'none';
  postsEmptyState.style.display = 'block';
};

/**
 * 빈 상태 표시 (좋아요한 게시글)
 */
const showLikedPostsEmptyState = () => {
  likedPostsGrid.style.display = 'none';
  likedPostsEmptyState.style.display = 'block';
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 탭 전환
  postsTab.addEventListener('click', () => switchTab('posts'));
  likedPostsTab.addEventListener('click', () => switchTab('liked'));
  profileTab.addEventListener('click', () => switchTab('profile'));

  // 프로필 수정
  profileForm.addEventListener('submit', handleProfileUpdate);

  // 내 댓글 탭
  commentsTab.addEventListener('click', () => {
    window.location.href = '/pages/my-page/my-comments.html';
  });

  // 좋아요한 댓글 탭
  likedCommentsTab.addEventListener('click', () => {
    window.location.href = '/pages/my-page/liked-comments.html';
  });

  // 비밀번호 변경 폼
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // 회원 탈퇴
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', handleDeleteAccount);
  }
};

/**
 * 탭 전환
 */
const switchTab = async (tab) => {
  // 탭 버튼 활성화
  postsTab.classList.remove('active');
  likedPostsTab.classList.remove('active');
  profileTab.classList.remove('active');

  // 탭 컨텐츠 표시/숨김
  postsContent.style.display = 'none';
  likedPostsContent.style.display = 'none';
  profileContent.style.display = 'none';

  if (tab === 'posts') {
    postsTab.classList.add('active');
    postsContent.style.display = 'block';
  } else if (tab === 'liked') {
    likedPostsTab.classList.add('active');
    likedPostsContent.style.display = 'block';

    // 좋아요한 게시글이 아직 로드되지 않았으면 로드
    if (myLikedPosts.length === 0 && likedPostsGrid.innerHTML === '') {
      await loadLikedPosts();
    }
  } else if (tab === 'profile') {
    profileTab.classList.add('active');
    profileContent.style.display = 'block';
  }
};

/**
 * 프로필 수정 처리
 */
const handleProfileUpdate = async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const nickname = nicknameInput.value.trim();
  const profileImage = profileImageInput.value.trim();

  if (!name || !nickname) {
    showProfileError('이름과 닉네임을 입력해주세요.');
    return;
  }

  try {
    profileSubmitBtn.disabled = true;
    profileSubmitBtn.textContent = '저장 중...';

    const result = await updateMember(currentMemberId, {
      name,
      nickname,
      profileImage: profileImage || null,
    });

    // localStorage 업데이트
    const updatedUser = {
      ...currentUser,
      name: result.name,
      nickname: result.nickname,
      profileImage: result.profileImage,
    };
    setUser(updatedUser);

    // 프로필 다시 로드
    await loadProfile();

    alert('프로필이 수정되었습니다! ✅');

    // 게시글 탭으로 전환
    switchTab('posts');
  } catch (error) {
    console.error('프로필 수정 실패:', error);
    showProfileError(error.message || '프로필 수정에 실패했습니다.');
  } finally {
    profileSubmitBtn.disabled = false;
    profileSubmitBtn.textContent = '저장하기';
  }
};

/**
 * 비밀번호 변경
 */
const handlePasswordChange = async (e) => {
  e.preventDefault();

  const old = oldPassword.value.trim();
  const newPwd = newPassword.value.trim();
  const confirm = confirmPassword.value.trim();

  // 에러 메시지 초기화
  passwordError.style.display = 'none';

  // 유효성 검사
  if (newPwd !== confirm) {
    passwordError.textContent = '새 비밀번호가 일치하지 않습니다.';
    passwordError.style.display = 'block';
    return;
  }

  if (newPwd.length < 8) {
    passwordError.textContent = '비밀번호는 8자 이상이어야 합니다.';
    passwordError.style.display = 'block';
    return;
  }

  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordPattern.test(newPwd)) {
    passwordError.textContent = '비밀번호는 영문과 숫자를 포함해야 합니다.';
    passwordError.style.display = 'block';
    return;
  }

  try {
    passwordSubmitBtn.disabled = true;
    passwordSubmitBtn.textContent = '변경 중...';

    // 비밀번호 변경 API 호출
    const response = await fetch(
      `http://localhost:8080/api/members/${memberId}/password`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword: old,
          newPassword: newPwd,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '비밀번호 변경에 실패했습니다.');
    }

    alert('비밀번호가 변경되었습니다.');
    passwordForm.reset();
  } catch (error) {
    console.error('비밀번호 변경 실패:', error);
    passwordError.textContent =
      error.message || '비밀번호 변경에 실패했습니다.';
    passwordError.style.display = 'block';
  } finally {
    passwordSubmitBtn.disabled = false;
    passwordSubmitBtn.textContent = '비밀번호 변경';
  }
};

/**
 * 회원 탈퇴
 */
const handleDeleteAccount = async () => {
  const confirmed = confirm(
    '정말로 탈퇴하시겠습니까?\n\n' +
      '탈퇴 시 다음 정보가 모두 삭제됩니다:\n' +
      '- 내 게시글\n' +
      '- 내 댓글\n' +
      '- 좋아요 정보\n' +
      '- 프로필 정보\n\n' +
      '이 작업은 되돌릴 수 없습니다.',
  );

  if (!confirmed) {
    return;
  }

  const doubleCheck = prompt('탈퇴하시려면 "탈퇴"를 입력해주세요.');

  if (doubleCheck !== '탈퇴') {
    alert('탈퇴가 취소되었습니다.');
    return;
  }

  try {
    await deleteMember(memberId);

    alert('회원 탈퇴가 완료되었습니다.\n그동안 이용해주셔서 감사합니다.');

    // 로그아웃 처리
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberNickname');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('회원 탈퇴 실패:', error);
    alert(error.message || '회원 탈퇴에 실패했습니다.');
  }
};

/**
 * 프로필 에러 표시
 */
const showProfileError = (message) => {
  profileError.textContent = message;
  profileError.style.display = 'flex';
};

/**
 * 로딩 표시/숨김 (내 게시글)
 */
const showPostsLoading = () => {
  postsLoading.style.display = 'block';
  postsGrid.style.display = 'none';
  postsEmptyState.style.display = 'none';
};

const hidePostsLoading = () => {
  postsLoading.style.display = 'none';
};

/**
 * 로딩 표시/숨김 (좋아요한 게시글)
 */
const showLikedPostsLoading = () => {
  likedPostsLoading.style.display = 'block';
  likedPostsGrid.style.display = 'none';
  likedPostsEmptyState.style.display = 'none';
};

const hideLikedPostsLoading = () => {
  likedPostsLoading.style.display = 'none';
};

// 초기화 실행
init();
