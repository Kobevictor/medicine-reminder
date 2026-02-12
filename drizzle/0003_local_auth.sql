-- Migration: Convert from OAuth to local authentication
-- Drop openId column and add username/password columns

ALTER TABLE `users` 
  DROP COLUMN `openId`,
  DROP COLUMN `loginMethod`,
  ADD COLUMN `username` VARCHAR(64) NOT NULL UNIQUE AFTER `id`,
  ADD COLUMN `password` VARCHAR(255) NOT NULL AFTER `username`;
