-- AlterTable
ALTER TABLE "api_clients" ADD COLUMN     "allowed_scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "api_clients" AS client
SET "allowed_scopes" = token_scopes.allowed_scopes
FROM (
  SELECT token."client_id", ARRAY_AGG(DISTINCT scope.scope_value) AS allowed_scopes
  FROM "api_client_tokens" AS token,
       UNNEST(token."scopes") AS scope(scope_value)
  GROUP BY token."client_id"
) AS token_scopes
WHERE client."client_id" = token_scopes."client_id";

UPDATE "api_clients"
SET "allowed_scopes" = ARRAY[
  'public:featured:read',
  'public:history:read',
  'public:profile:read'
]
WHERE COALESCE(array_length("allowed_scopes", 1), 0) = 0;
