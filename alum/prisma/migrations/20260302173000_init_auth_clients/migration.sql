-- CreateTable
CREATE TABLE "roles" (
  "role_id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
  "user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role_id" INTEGER NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email_verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
  "token_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
  "reset_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("reset_id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
  "session_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expired_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),

  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "revoked_jwt_tokens" (
  "revoked_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,

  CONSTRAINT "revoked_jwt_tokens_pkey" PRIMARY KEY ("revoked_id")
);

-- CreateTable
CREATE TABLE "api_clients" (
  "client_id" TEXT NOT NULL,
  "client_name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "contact_email" TEXT NOT NULL,
  "is_revoked" BOOLEAN NOT NULL DEFAULT false,
  "created_by_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "api_clients_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "api_client_tokens" (
  "token_id" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expired_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),

  CONSTRAINT "api_client_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "api_client_endpoint_usage" (
  "usage_id" TEXT NOT NULL,
  "token_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "http_method" TEXT NOT NULL,
  "usage_data" JSONB,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "api_client_endpoint_usage_pkey" PRIMARY KEY ("usage_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- Seed roles
INSERT INTO "roles" ("name") VALUES ('alumni') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name") VALUES ('developer') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name") VALUES ('admin') ON CONFLICT ("name") DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX "auth_sessions_expired_at_idx" ON "auth_sessions"("expired_at");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_jwt_tokens_token_hash_key" ON "revoked_jwt_tokens"("token_hash");
CREATE INDEX "revoked_jwt_tokens_user_id_idx" ON "revoked_jwt_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_clients_client_name_key" ON "api_clients"("client_name");
CREATE INDEX "api_clients_created_by_user_id_idx" ON "api_clients"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_client_tokens_token_hash_key" ON "api_client_tokens"("token_hash");
CREATE INDEX "api_client_tokens_client_id_idx" ON "api_client_tokens"("client_id");
CREATE INDEX "api_client_tokens_revoked_at_idx" ON "api_client_tokens"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "token_endpoint_http_unique" ON "api_client_endpoint_usage"("token_id", "endpoint", "http_method");
CREATE INDEX "api_client_endpoint_usage_token_id_idx" ON "api_client_endpoint_usage"("token_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revoked_jwt_tokens" ADD CONSTRAINT "revoked_jwt_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_clients" ADD CONSTRAINT "api_clients_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_client_tokens" ADD CONSTRAINT "api_client_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "api_clients"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_client_endpoint_usage" ADD CONSTRAINT "api_client_endpoint_usage_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "api_client_tokens"("token_id") ON DELETE RESTRICT ON UPDATE CASCADE;
