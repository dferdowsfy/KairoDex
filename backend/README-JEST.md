# Jest Notes

- Tests are in `tests/unit` and run with `npm test`.
- The auth test uses the in-memory Express app without starting the HTTP server.
- Ensure DATABASE_URL points to a reachable Postgres and migrations are applied before running tests that hit DB.
