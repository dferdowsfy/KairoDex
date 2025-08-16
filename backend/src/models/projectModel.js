const { getPrisma } = require('../config/db');

function prisma() {
  return getPrisma();
}

async function createProject({ ownerId, name, description, metadata }) {
  return prisma().project.create({ data: { ownerId, name, description, metadata } });
}

async function getProjectById(id) {
  return prisma().project.findUnique({ where: { id: Number(id) } });
}

async function updateProject(id, data) {
  return prisma().project.update({ where: { id: Number(id) }, data });
}

async function deleteProject(id) {
  return prisma().project.delete({ where: { id: Number(id) } });
}

async function listProjectsByOwner({ ownerId, skip, take }) {
  const [items, total] = await Promise.all([
    prisma().project.findMany({ where: { ownerId }, skip, take, orderBy: { id: 'asc' } }),
    prisma().project.count({ where: { ownerId } }),
  ]);
  return { items, total };
}

module.exports = {
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  listProjectsByOwner,
};
