-- La régénération de la démo (≈ 20 s sur le plan gratuit) dépasse le délai
-- de 8 s hérité du rôle authenticator. Le rôle serveur, jamais exposé au
-- navigateur, reçoit un délai propre ; les rôles anon et authenticated
-- gardent leurs limites (3 s et 8 s).
alter role service_role set statement_timeout = '60s';
notify pgrst, 'reload config';
