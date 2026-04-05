-- AlterTable
ALTER TABLE "api_client_tokens"
ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing tokens with current public-read scopes
UPDATE "api_client_tokens"
SET "scopes" = ARRAY[
  'public:featured:read',
  'public:history:read',
  'public:profile:read'
]
WHERE COALESCE(array_length("scopes", 1), 0) = 0;
