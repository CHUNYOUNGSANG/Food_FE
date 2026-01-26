/**
 * 마이페이지 로직
 */

import { getPostsByMember } from '../../services/post-service.js';
import { getMember, updateMember } from '../../services/member-service.js';
import { getMemberId, getUser, setUser } from '../../utils/storage.js';
import { createPostCard } from '../../components/post-card.js';

// DOM 요소
const profileAvatar = document.getElementById('profileAvatar');
const profileNickname = document.getElementById('profileNickname');
const profileEmail = document.getElementById('profileEmail');
const postCount = document.getElementById('postCount');
const postsTab = document.getElementById('postsTab');
const profileTab = document.getElementById('profileTab');
const postsContent = document.getElementById('postsContent');
const profileContent = document.getElementById('profileContent');
const loading = document.getElementById('loading');
const postsGrid = document.getElementById('postsGrid');
const emptyState = document.getElementById('emptyState');
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
    showLoading();

    myPosts = await getPostsByMember(currentMemberId);

    // 게시글 개수 표시
    postCount.textContent = myPosts.length;

    // 게시글 렌더링
    renderPosts(myPosts);
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
const renderPosts = (posts) => {
  if (posts.length === 0) {
    showEmptyState();
    return;
  }

  postsGrid.innerHTML = posts.map((post) => createPostCard(post)).join('');
  postsGrid.style.display = 'grid';
  emptyState.style.display = 'none';
};

/**
 * 빈 상태 표시
 */
const showEmptyState = () => {
  postsGrid.style.display = 'none';
  emptyState.style.display = 'block';
};

/**
 * 이벤트 리스너 등록
 */
const attachEventListeners = () => {
  // 탭 전환
  postsTab.addEventListener('click', () => switchTab('posts'));
  profileTab.addEventListener('click', () => switchTab('profile'));

  // 프로필 수정
  profileForm.addEventListener('submit', handleProfileUpdate);
};

/**
 * 탭 전환
 */
const switchTab = (tab) => {
  if (tab === 'posts') {
    postsTab.classList.add('active');
    profileTab.classList.remove('active');
    postsContent.style.display = 'block';
    profileContent.style.display = 'none';
  } else {
    postsTab.classList.remove('active');
    profileTab.classList.add('active');
    postsContent.style.display = 'none';
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
 * 프로필 에러 표시
 */
const showProfileError = (message) => {
  profileError.textContent = message;
  profileError.style.display = 'flex';
};

/**
 * 로딩 표시
 */
const showLoading = () => {
  loading.style.display = 'block';
  postsGrid.style.display = 'none';
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
