-- Database-level invariant: no write path can persist a negative stock balance.
ALTER TABLE "Product"
ADD CONSTRAINT "Product_currentStock_nonnegative"
CHECK ("currentStock" >= 0);
