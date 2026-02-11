CREATE TABLE `family_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactName` varchar(100) NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(20),
	`relationship` varchar(50),
	`notifyOnLowStock` boolean NOT NULL DEFAULT true,
	`notifyOnMissedDose` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medication_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`medicationId` int NOT NULL,
	`takenAt` bigint NOT NULL,
	`scheduledTime` varchar(10) NOT NULL,
	`status` enum('taken','skipped','late') NOT NULL DEFAULT 'taken',
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medication_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medications` (
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int,
	`medicationId` int,
	`type` enum('low_stock','out_of_stock','missed_dose','reminder') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`sentAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
