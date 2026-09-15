-- CreateTable
CREATE TABLE "TicketCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketCounter_pkey" PRIMARY KEY ("year")
);
