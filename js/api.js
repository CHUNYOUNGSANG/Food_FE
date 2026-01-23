/* ========================================
   API 호출 유틸리티
   Spring Boot 백엔드와 통신
   ======================================== */

const API_BASE_URL = 'http://localhost:8080/api';

// 로컬 스토리지에서 회원 ID 가져오기
const getMemberId = () => {
    return localStorage.getItem('memberId');
};

// 공통 fetch 함수
async function fetchAPI(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    // Member-Id 헤더 추가 (필요한 경우)
    const memberId = getMemberId();
    if (memberId && options.needsAuth !== false) {
        defaultHeaders['Member-Id'] = memberId;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, config);
        
        // 204 No Content는 body가 없음
        if (response.status === 204) {
            return { success: true };
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '요청 실패');
        }
        
        return data;
    } catch (error) {
        console.error('API 호출 오류:', error);
        throw error;
    }
}

/* ========================================
   게시글 API
   ======================================== */

// 전체 게시글 목록 조회
export async function getAllPosts() {
    return await fetchAPI('/posts', { needsAuth: false });
}

// 게시글 상세 조회
export async function getPost(postId) {
    return await fetchAPI(`/posts/${postId}`, { needsAuth: false });
}

// 카테고리별 게시글 조회
export async function getPostsByCategory(category) {
    return await fetchAPI(`/posts/category/${category}`, { needsAuth: false });
}

// 게시글 생성
export async function createPost(postData) {
    return await fetchAPI('/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
    });
}

// 게시글 수정
export async function updatePost(postId, postData) {
    return await fetchAPI(`/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(postData),
    });
}

// 게시글 삭제
export async function deletePost(postId) {
    return await fetchAPI(`/posts/${postId}`, {
        method: 'DELETE',
    });
}

/* ========================================
   댓글 API
   ======================================== */

// 게시글의 댓글 목록 조회
export async function getComments(postId) {
    return await fetchAPI(`/posts/${postId}/comments`, { needsAuth: false });
}

// 댓글 작성
export async function createComment(postId, commentData) {
    return await fetchAPI(`/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'X-Member-Id': getMemberId(),
        },
        body: JSON.stringify(commentData),
    });
}

// 댓글 수정
export async function updateComment(postId, commentId, commentData) {
    return await fetchAPI(`/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
            'X-Member-Id': getMemberId(),
        },
        body: JSON.stringify(commentData),
    });
}

// 댓글 삭제
export async function deleteComment(postId, commentId) {
    return await fetchAPI(`/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
            'X-Member-Id': getMemberId(),
        },
    });
}

// 회원의 댓글 목록 조회
export async function getMemberComments(memberId) {
    return await fetchAPI(`/members/${memberId}/comments`, { needsAuth: false });
}

/* ========================================
   좋아요 API
   ======================================== */

// 게시글 좋아요 토글
export async function togglePostLike(postId) {
    return await fetchAPI(`/posts/${postId}/likes/toggle`, {
        method: 'PUT',
    });
}

// 게시글 좋아요 수 조회
export async function getPostLikeCount(postId) {
    const memberId = getMemberId();
    const headers = memberId ? { 'Member-Id': memberId } : {};
    return await fetchAPI(`/posts/${postId}/likes/count`, {
        headers,
        needsAuth: false,
    });
}

// 댓글 좋아요 토글
export async function toggleCommentLike(commentId) {
    return await fetchAPI(`/comments/${commentId}/likes/toggle`, {
        method: 'PUT',
        headers: {
            'X-Member-Id': getMemberId(),
        },
    });
}

// 댓글 좋아요 수 조회
export async function getCommentLikeCount(commentId) {
    const memberId = getMemberId();
    const headers = memberId ? { 'X-Member-Id': memberId } : {};
    return await fetchAPI(`/comments/${commentId}/likes/count`, {
        headers,
        needsAuth: false,
    });
}

/* ========================================
   회원 API
   ======================================== */

// 회원 정보 조회
export async function getMember(memberId) {
    return await fetchAPI(`/members/${memberId}`, { needsAuth: false });
}

// 회원 정보 수정
export async function updateMember(memberId, memberData) {
    return await fetchAPI(`/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(memberData),
    });
}

// 회원 탈퇴
export async function deleteMember(memberId) {
    return await fetchAPI(`/members/${memberId}`, {
        method: 'DELETE',
    });
}

// 이메일 중복 확인
export async function checkEmailDuplicate(email) {
    return await fetchAPI(`/members/check-email?email=${encodeURIComponent(email)}`, {
        needsAuth: false,
    });
}

// 닉네임 중복 확인
export async function checkNicknameDuplicate(nickname) {
    return await fetchAPI(`/members/check-nickname?nickname=${encodeURIComponent(nickname)}`, {
        needsAuth: false,
    });
}

// 회원 가입
export async function registerMember(memberData) {
    return await fetchAPI('/members', {
        method: 'POST',
        body: JSON.stringify(memberData),
        needsAuth: false,
    });
}