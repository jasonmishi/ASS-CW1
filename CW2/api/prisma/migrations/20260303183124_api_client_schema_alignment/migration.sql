/*
  Warnings:

  - You are about to drop the column `usage_data` on the `api_client_endpoint_usage` table. All the data in the column will be lost.
  - You are about to drop the column `expired_at` on the `api_client_tokens` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."token_endpoint_http_unique";

-- AlterTable
ALTER TABLE "api_client_endpoint_usage" DROP COLUMN "usage_data",
ADD COLUMN     "usage_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "api_client_tokens" DROP COLUMN "expired_at",
ADD COLUMN     "expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "api_client_endpoint_usage_token_id_usage_date_idx" ON "api_client_endpoint_usage"("token_id", "usage_date");
