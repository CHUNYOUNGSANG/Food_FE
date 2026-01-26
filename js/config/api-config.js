/**
 * API 기본 설정
 */
const API_CONFIG = {
  // 백엔드 서버 URL
  BASE_URL: 'http://localhost:8080/api',

  // 타임아웃 설정 (10초)
  TIMEOUT: 10000,

  // 기본 헤더
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  // API 엔드포인트
  ENDPOINTS: {
    // 회원 관련
    MEMBERS: '/members',
    MEMBER_SIGNUP: '/members',
    MEMBER_LOGIN: '/members/login',
    MEMBER_DETAIL: (id) => `/members/${id}`,
    MEMBER_UPDATE: (id) => `/members/${id}`,
    MEMBER_DELETE: (id) => `/members/${id}`,
    CHECK_EMAIL: '/members/check-email',
    CHECK_NICKNAME: '/members/check-nickname',

    // 게시글 관련
    POSTS: '/posts',
    POST_CREATE: '/posts',
    POST_DETAIL: (id) => `/posts/${id}`,
    POST_UPDATE: (id) => `/posts/${id}`,
    POST_DELETE: (id) => `/posts/${id}`,
    POSTS_BY_MEMBER: (memberId) => `/posts/member/${memberId}`,
    POSTS_BY_CATEGORY: (category) => `/posts/category/${category}`,
    POSTS_SEARCH: '/posts/search',

    // 댓글 관련
    COMMENTS: (postId) => `/posts/${postId}/comments`,
    COMMENT_CREATE: (postId) => `/posts/${postId}/comments`,
    COMMENT_DETAIL: (postId, commentId) =>
      `/posts/${postId}/comments/${commentId}`,
    COMMENT_UPDATE: (postId, commentId) =>
      `/posts/${postId}/comments/${commentId}`,
    COMMENT_DELETE: (postId, commentId) =>
      `/posts/${postId}/comments/${commentId}`,
    COMMENTS_BY_MEMBER: (memberId) => `/members/${memberId}/comments`,

    // 게시글 좋아요 관련
    POST_LIKE_ADD: (postId) => `/posts/${postId}/likes`,
    POST_LIKE_REMOVE: (postId) => `/posts/${postId}/likes`,
    POST_LIKE_TOGGLE: (postId) => `/posts/${postId}/likes/toggle`,
    POST_LIKE_COUNT: (postId) => `/posts/${postId}/likes/count`,
    POST_LIKES_BY_MEMBER: (memberId) => `/posts/likes/member/${memberId}`,
    POST_LIKES_BY_POST: (postId) => `/posts/${postId}/likes`,

    // 댓글 좋아요 관련
    COMMENT_LIKE_ADD: (commentId) => `/comments/${commentId}/likes`,
    COMMENT_LIKE_REMOVE: (commentId) => `/comments/${commentId}/likes`,
    COMMENT_LIKE_TOGGLE: (commentId) => `/comments/${commentId}/likes/toggle`,
    COMMENT_LIKE_COUNT: (commentId) => `/comments/${commentId}/likes/count`,
    COMMENT_LIKES_BY_MEMBER: (memberId) => `/comments/likes/member/${memberId}`,
    COMMENT_LIKES_BY_COMMENT: (commentId) => `/comments/${commentId}/likes`,
  },
};

export default API_CONFIG;
