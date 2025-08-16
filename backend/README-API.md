# API Reference

Base URL: http://localhost:3000

## Auth

POST /auth/register
- body: { email, password, role? }
- 201 { user }

POST /auth/login
- body: { email, password }
- 200 { token }

## Users

GET /users
- headers: Authorization: Bearer <token> (admin)
- query: page, pageSize
- 200 { items, total, page, pageSize, totalPages }

## Projects

POST /projects
- headers: Authorization
- body: { name, description?, metadata? }

GET /projects
- headers: Authorization
- query: page, pageSize

GET /projects/:id
- headers: Authorization

PATCH /projects/:id
- headers: Authorization
- body: Partial<Project>

DELETE /projects/:id
- headers: Authorization
