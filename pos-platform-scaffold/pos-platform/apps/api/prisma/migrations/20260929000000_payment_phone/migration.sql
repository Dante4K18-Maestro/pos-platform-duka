-- Add the MPESA STK-push destination phone to payments
ALTER TABLE "payments" ADD COLUMN "phoneNumber" TEXT;
