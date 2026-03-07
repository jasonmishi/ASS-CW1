-- CreateTable
CREATE TABLE "BIDS" (
    "bid_id" TEXT NOT NULL,
    "alumni_user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL,
    "bid_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BIDS_pkey" PRIMARY KEY ("bid_id")
);

-- CreateTable
CREATE TABLE "FEATURED_WINNERS" (
    "winner_id" TEXT NOT NULL,
    "featured_date" DATE NOT NULL,
    "alumni_user_id" TEXT NOT NULL,
    "winning_bid_id" TEXT NOT NULL,
    "winning_bid_ammount" DECIMAL(12,2) NOT NULL,
    "selected_by_user_id" TEXT NOT NULL,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FEATURED_WINNERS_pkey" PRIMARY KEY ("winner_id")
);

-- CreateTable
CREATE TABLE "EVENT_ATTENDANCES" (
    "attendance_id" TEXT NOT NULL,
    "alumni_user_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "recorded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EVENT_ATTENDANCES_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateIndex
CREATE INDEX "BIDS_alumni_user_id_idx" ON "BIDS"("alumni_user_id");

-- CreateIndex
CREATE INDEX "BIDS_bid_date_idx" ON "BIDS"("bid_date");

-- CreateIndex
CREATE INDEX "BIDS_alumni_user_id_bid_date_idx" ON "BIDS"("alumni_user_id", "bid_date");

-- CreateIndex
CREATE UNIQUE INDEX "FEATURED_WINNERS_featured_date_key" ON "FEATURED_WINNERS"("featured_date");

-- CreateIndex
CREATE UNIQUE INDEX "FEATURED_WINNERS_winning_bid_id_key" ON "FEATURED_WINNERS"("winning_bid_id");

-- CreateIndex
CREATE INDEX "FEATURED_WINNERS_featured_date_idx" ON "FEATURED_WINNERS"("featured_date");

-- CreateIndex
CREATE INDEX "FEATURED_WINNERS_alumni_user_id_idx" ON "FEATURED_WINNERS"("alumni_user_id");

-- CreateIndex
CREATE INDEX "FEATURED_WINNERS_selected_by_user_id_idx" ON "FEATURED_WINNERS"("selected_by_user_id");

-- CreateIndex
CREATE INDEX "EVENT_ATTENDANCES_alumni_user_id_idx" ON "EVENT_ATTENDANCES"("alumni_user_id");

-- CreateIndex
CREATE INDEX "EVENT_ATTENDANCES_event_date_idx" ON "EVENT_ATTENDANCES"("event_date");

-- CreateIndex
CREATE INDEX "EVENT_ATTENDANCES_recorded_by_user_id_idx" ON "EVENT_ATTENDANCES"("recorded_by_user_id");

-- AddForeignKey
ALTER TABLE "SPONSORSHIP_PAYOUTS" ADD CONSTRAINT "SPONSORSHIP_PAYOUTS_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "FEATURED_WINNERS"("winner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BIDS" ADD CONSTRAINT "BIDS_alumni_user_id_fkey" FOREIGN KEY ("alumni_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FEATURED_WINNERS" ADD CONSTRAINT "FEATURED_WINNERS_alumni_user_id_fkey" FOREIGN KEY ("alumni_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FEATURED_WINNERS" ADD CONSTRAINT "FEATURED_WINNERS_winning_bid_id_fkey" FOREIGN KEY ("winning_bid_id") REFERENCES "BIDS"("bid_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FEATURED_WINNERS" ADD CONSTRAINT "FEATURED_WINNERS_selected_by_user_id_fkey" FOREIGN KEY ("selected_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EVENT_ATTENDANCES" ADD CONSTRAINT "EVENT_ATTENDANCES_alumni_user_id_fkey" FOREIGN KEY ("alumni_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EVENT_ATTENDANCES" ADD CONSTRAINT "EVENT_ATTENDANCES_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
