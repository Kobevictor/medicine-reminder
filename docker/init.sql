-- ============================================================
-- Medicine Reminder - Docker Database Initialization Script
-- This script creates all tables with the local auth schema
-- ============================================================

-- Users table (local auth: username + password)
CREATE TABLE IF NOT EXISTS `users` (
    `id` int AUTO_INCREMENT NOT NULL,
    `username` varchar(64) NOT NULL,
    `password` varchar(255) NOT NULL,
    `name` text,
    `email` varchar(320),
    `role` enum('user','admin') NOT NULL DEFAULT 'user',
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `users_id` PRIMARY KEY(`id`),
    CONSTRAINT `users_username_unique` UNIQUE(`username`)
);

-- Medications table
CREATE TABLE IF NOT EXISTS `medications` (
    `id` int AUTO_INCREMENT NOT NULL,
    `userId` int NOT NULL,
    `name` varchar(200) NOT NULL,
    `dosage` varchar(100) NOT NULL,
    `frequency` varchar(100) NOT NULL,
    `timesPerDay` int NOT NULL DEFAULT 1,
    `reminderTimes` text NOT NULL,
    `totalQuantity` int NOT NULL,
    `remainingQuantity` int NOT NULL,
    `dosagePerTime` int NOT NULL DEFAULT 1,
    `startDate` bigint NOT NULL,
    `notes` text,
    `isActive` boolean NOT NULL DEFAULT true,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `medications_id` PRIMARY KEY(`id`)
);

-- Medication logs table
CREATE TABLE IF NOT EXISTS `medication_logs` (
    `id` int AUTO_INCREMENT NOT NULL,
    `userId` int NOT NULL,
    `medicationId` int NOT NULL,
    `takenAt` bigint NOT NULL,
    `scheduledTime` varchar(10) NOT NULL,
    `status` enum('taken','skipped','late') NOT NULL DEFAULT 'taken',
    `quantity` int NOT NULL DEFAULT 1,
    `notes` text,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `medication_logs_id` PRIMARY KEY(`id`)
);

-- Family contacts table
CREATE TABLE IF NOT EXISTS `family_contacts` (
    `id` int AUTO_INCREMENT NOT NULL,
    `userId` int NOT NULL,
    `contactName` varchar(100) NOT NULL,
    `contactEmail` varchar(320) NOT NULL,
    `contactPhone` varchar(20),
    `relationship` varchar(50),
    `notifyOnLowStock` boolean NOT NULL DEFAULT true,
    `notifyOnMissedDose` boolean NOT NULL DEFAULT false,
    `isActive` boolean NOT NULL DEFAULT true,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `family_contacts_id` PRIMARY KEY(`id`)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` int AUTO_INCREMENT NOT NULL,
    `userId` int NOT NULL,
    `contactId` int,
    `medicationId` int,
    `type` enum('low_stock','out_of_stock','missed_dose','reminder') NOT NULL,
    `title` varchar(200) NOT NULL,
    `content` text NOT NULL,
    `isRead` boolean NOT NULL DEFAULT false,
    `sentAt` bigint NOT NULL,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);

-- Email settings table
CREATE TABLE IF NOT EXISTS `email_settings` (
    `id` int AUTO_INCREMENT NOT NULL,
    `userId` int NOT NULL,
    `smtpHost` varchar(200) NOT NULL,
    `smtpPort` int NOT NULL DEFAULT 465,
    `smtpUser` varchar(320) NOT NULL,
    `smtpPass` varchar(500) NOT NULL,
    `smtpFrom` varchar(320),
    `smtpSecure` boolean NOT NULL DEFAULT true,
    `isEnabled` boolean NOT NULL DEFAULT true,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `email_settings_id` PRIMARY KEY(`id`),
    CONSTRAINT `email_settings_userId_unique` UNIQUE(`userId`)
);
