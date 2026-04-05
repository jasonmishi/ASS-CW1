-- CreateTable
CREATE TABLE "credentials" (
    "credential_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "credential_url" TEXT NOT NULL,
    "completion_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("credential_id")
);

-- CreateIndex
CREATE INDEX "credentials_user_id_idx" ON "credentials"("user_id");

-- CreateIndex
CREATE INDEX "credentials_user_id_credential_type_idx" ON "credentials"("user_id", "credential_type");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
