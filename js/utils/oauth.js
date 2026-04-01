const KAKAO_CLIENT_ID = '18686f68323ab353a00a701cf159ed1b';

const getRedirectUri = () => `${window.location.origin}/`;

export const getOAuthStartUrl = (provider) => {
  if (provider === 'kakao') {
    const params = new URLSearchParams({
      client_id: KAKAO_CLIENT_ID,
      redirect_uri: getRedirectUri(),
      response_type: 'code',
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  throw new Error('아직 지원하지 않는 OAuth 제공자입니다.');
};
