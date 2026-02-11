CREATE TABLE `email_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`smtpHost` varchar(200) NOT NULL,
	`smtpPort` int NOT NULL DEFAULT 465,
	`smtpUser` varchar(320) NOT NULL,
	`smtpPass` varchar(500) NOT NULL,
	`smtpFrom` varchar(320),
	`smtpSecure` boolean NOT NULL DEFAULT true,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_settings_userId_unique` UNIQUE(`userId`)
);
