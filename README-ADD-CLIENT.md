# Add Client API

- POST /api/clients/create { name?, email?, phone?, stage? }
- Requires authenticated user. Sets agent_owner_user_id from the session user’s email.
- Inserts into Supabase table AgentHub_DB with name_first/name_last split from name.

Returned shape: { id, row }

UI: AddClientModal is wired in the dashboard via ClientSelector Add button.
