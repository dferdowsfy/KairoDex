const {
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  listProjectsByOwner,
} = require('../models/projectModel');

function ensureOwnershipOrAdmin(user, project) {
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (user.role !== 'ADMIN' && project.ownerId !== user.id) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
}

// Simple in-memory cache for list endpoint
const cache = new Map();
const TTL = 10_000; // 10s
function listKey(ownerId, page, pageSize) {
  return `projects:${ownerId}:${page}:${pageSize}`;
}

async function createForUser(user, payload) {
  const data = { ownerId: user.id, name: payload.name, description: payload.description, metadata: payload.metadata };
  return createProject(data);
}

async function listForUser(user, { page = 1, pageSize = 10 }) {
  page = Number(page) || 1;
  pageSize = Math.min(100, Number(pageSize) || 10);
  const skip = (page - 1) * pageSize;
  const key = listKey(user.id, page, pageSize);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.time < TTL) return cached.value;

  const { items, total } = await listProjectsByOwner({ ownerId: user.id, skip, take: pageSize });
  const value = { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  cache.set(key, { value, time: now });
  return value;
}

async function getById(user, id) {
  const project = await getProjectById(id);
  ensureOwnershipOrAdmin(user, project);
  return project;
}

async function updateById(user, id, data) {
  const project = await getProjectById(id);
  ensureOwnershipOrAdmin(user, project);
  return updateProject(id, data);
}

async function removeById(user, id) {
  const project = await getProjectById(id);
  ensureOwnershipOrAdmin(user, project);
  await deleteProject(id);
  return { success: true };
}

module.exports = { createForUser, listForUser, getById, updateById, removeById };
