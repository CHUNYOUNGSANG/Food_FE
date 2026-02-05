/**
 * 이미지 URL 정규화 유틸
 * 상대 경로/절대 경로 모두 안전하게 처리
 */

import API_CONFIG from '../config/api-config.js';

const API_BASE = API_CONFIG.BASE_URL.replace(/\/$/, '');
const ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const isAbsoluteUrl = (url) =>
  /^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:');

const BASE64_SIGNATURES = [
  { prefix: 'iVBOR', mime: 'image/png' },
  { prefix: '/9j/', mime: 'image/jpeg' },
  { prefix: 'R0lGOD', mime: 'image/gif' },
  { prefix: 'UklGR', mime: 'image/webp' },
];

const looksLikeBase64 = (value) =>
  value.length > 100 && /^[A-Za-z0-9+/=]+$/.test(value);

const normalizeMaybeBase64 = (value) => {
  if (!value || value.startsWith('data:')) return value;
  if (!looksLikeBase64(value)) return value;

  const signature = BASE64_SIGNATURES.find((sig) => value.startsWith(sig.prefix));
  const mime = signature ? signature.mime : 'image/png';
  return `data:${mime};base64,${value}`;
};

/**
 * 이미지 후보 URL 목록 생성 (primary -> fallback)
 * @param {string} url
 * @returns {string[]}
 */
export const resolveImageCandidates = (url) => {
  if (!url) return [];
  const normalizedUrl = normalizeMaybeBase64(url);
  if (isAbsoluteUrl(normalizedUrl)) return [normalizedUrl];

  const normalized = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
  const isBareFileName = /^\/[^/]+$/.test(normalized);
  const candidates = [];

  candidates.push(`${ORIGIN}${normalized}`);

  if (!normalized.startsWith('/api/')) {
    candidates.push(`${API_BASE}${normalized}`);
  }

  // 업로드 파일명이 경로 없이 넘어오는 경우 보정
  if (isBareFileName && !normalized.startsWith('/uploads/')) {
    const fileName = normalized.replace(/^\//, '');
    candidates.push(`${ORIGIN}/uploads/post/${fileName}`);
  }

  return [...new Set(candidates)];
};

/**
 * 단일 이미지 URL (primary)
 * @param {string} url
 * @returns {string}
 */
export const resolveImageUrl = (url) => resolveImageCandidates(url)[0] || '';
