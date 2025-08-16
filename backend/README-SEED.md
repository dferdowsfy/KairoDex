# Seeding

Run prisma and the seed script to create default users:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

Environment variables to customize:
- SEED_ADMIN_EMAIL (default: admin@example.com)
- SEED_USER_EMAIL (default: seed@example.com)
- SEED_PASSWORD (default: Password123!)
