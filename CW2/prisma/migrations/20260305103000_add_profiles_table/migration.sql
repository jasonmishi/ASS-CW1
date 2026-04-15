CREATE TABLE "profiles" (
  "profile_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "biography" TEXT,
  "linkedin_url" TEXT,
  "profile_image_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "profiles_pkey" PRIMARY KEY ("profile_id")
);

CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
