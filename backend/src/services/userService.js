const { listUsers } = require('../models/userModel');

// Simple in-memory cache for paginated lists by key
const cache = new Map();
const TTL = 10_000; // 10 seconds

function cacheKey(page, pageSize) {
  return `users:${page}:${pageSize}`;
}

async function getUsers({ page = 1, pageSize = 10 }) {
  page = Number(page) || 1;
  pageSize = Math.min(100, Number(pageSize) || 10);
  const skip = (page - 1) * pageSize;

  const key = cacheKey(page, pageSize);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.time < TTL) return cached.value;

  const { items, total } = await listUsers({ skip, take: pageSize });
  const value = { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  cache.set(key, { value, time: now });
  return value;
}

module.exports = { getUsers };
