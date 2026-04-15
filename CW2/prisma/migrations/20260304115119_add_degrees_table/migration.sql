-- CreateTable
CREATE TABLE "degrees" (
    "degree_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "degree_url" TEXT NOT NULL,
    "completion_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "degrees_pkey" PRIMARY KEY ("degree_id")
);

-- CreateIndex
CREATE INDEX "degrees_user_id_idx" ON "degrees"("user_id");

-- AddForeignKey
ALTER TABLE "degrees" ADD CONSTRAINT "degrees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
