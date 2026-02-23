/**
 * 맛집(음식점) 관련 API 서비스
 */

import httpClient from '../utils/http-client.js';
import API_CONFIG from '../config/api-config.js';

export const unwrapRestaurantResponse = (response) => {
  if (!response) return response;
  if (response.data) return response.data;
  if (response.result) return response.result;
  if (response.payload) return response.payload;
  return response;
};

export const normalizeRestaurantListResponse = (response) => {
  const data = unwrapRestaurantResponse(response);
  if (!data) return { content: [] };
  if (Array.isArray(data)) {
    return { content: data, number: 0, last: true };
  }
  if (Array.isArray(data.content)) {
    return data;
  }
  return { content: [] };
};

export const searchRestaurants = async (query = '', page = 0, size = 10) => {
  const q = encodeURIComponent(query || '');
  const response = await httpClient.get(
    `${API_CONFIG.ENDPOINTS.RESTAURANTS}?q=${q}&page=${page}&size=${size}`,
  );
  return unwrapRestaurantResponse(response);
};

export const getRestaurantDetail = async (restaurantId) => {
  if (!restaurantId) return null;
  const response = await httpClient.get(
    API_CONFIG.ENDPOINTS.RESTAURANT_DETAIL(restaurantId),
  );
  return unwrapRestaurantResponse(response);
};

export const getRestaurantPosts = async (
  restaurantId,
  page = 0,
  size = 10,
) => {
  if (!restaurantId) return null;
  const response = await httpClient.get(
    `${API_CONFIG.ENDPOINTS.RESTAURANT_POSTS(restaurantId)}?page=${page}&size=${size}`,
  );
  return unwrapRestaurantResponse(response);
};
