-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_counters_expires_at_idx" ON "rate_limit_counters"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_counters_key_window_start_key" ON "rate_limit_counters"("key", "window_start");
