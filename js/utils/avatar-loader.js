/**
 * 프로필 아바타 이미지 로더
 * data-member-id가 있는 요소에 프로필 이미지를 채움
 */

import { getMember } from '../services/member-service.js';
import { getToken } from './storage.js';
import { resolveImageUrl } from './image-url.js';

const cache = new Map();
const inflight = new Map();

const fetchProfileImage = async (memberId) => {
  if (!memberId) return null;
  if (!getToken()) return null;
  if (cache.has(memberId)) return cache.get(memberId);
  if (inflight.has(memberId)) return inflight.get(memberId);

  const promise = (async () => {
    try {
      const member = await getMember(memberId);
      const image =
        member?.profileImage ||
        member?.profileImageUrl ||
        member?.memberProfileImage ||
        member?.memberProfileImageUrl ||
        null;
      if (image) cache.set(memberId, image);
      return image;
    } catch {
      return null;
    } finally {
      inflight.delete(memberId);
    }
  })();

  inflight.set(memberId, promise);
  return promise;
};

export const hydrateAvatars = async (root = document) => {
  const nodes = Array.from(root.querySelectorAll('[data-member-id]')).filter(
    (node) =>
      !node.classList.contains('has-image') &&
      !node.dataset.avatarLoaded &&
      node.dataset.memberId &&
      node.dataset.memberId !== 'null' &&
      node.dataset.memberId !== 'undefined',
  );

  if (nodes.length === 0) return;

  const memberIds = [
    ...new Set(nodes.map((node) => node.dataset.memberId).filter(Boolean)),
  ];

  await Promise.all(memberIds.map((id) => fetchProfileImage(id)));

  nodes.forEach((node) => {
    const memberId = node.dataset.memberId;
    const image = cache.get(memberId);
    if (!image) {
      node.dataset.avatarLoaded = '1';
      return;
    }
    node.textContent = '';
    node.style.backgroundImage = `url("${resolveImageUrl(image)}")`;
    node.classList.add('has-image');
    node.dataset.avatarLoaded = '1';
  });
};
