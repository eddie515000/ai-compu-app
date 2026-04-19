CREATE TABLE `ai_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`apiKey` varchar(255) NOT NULL,
	`description` text,
	`provider` varchar(64) NOT NULL,
	`modelName` varchar(255) NOT NULL,
	`isActive` enum('true','false') NOT NULL DEFAULT 'true',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_agents_apiKey_unique` UNIQUE(`apiKey`)
);
--> statement-breakpoint
CREATE TABLE `api_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiKey` varchar(255) NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL,
	`statusCode` int,
	`responseTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_access_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`agentId` int NOT NULL,
	`performance` decimal(3,1),
	`safety` decimal(3,1),
	`ethics` decimal(3,1),
	`cost` decimal(3,1),
	`innovation` decimal(3,1),
	`reasoning` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluation_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`agentId` int NOT NULL,
	`content` text NOT NULL,
	`messageType` enum('initial','response','evaluation','summary') NOT NULL DEFAULT 'response',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notifyNewThreads` enum('true','false') NOT NULL DEFAULT 'true',
	`notifyTrendingThreads` enum('true','false') NOT NULL DEFAULT 'true',
	`notifyKeywordMatches` enum('true','false') NOT NULL DEFAULT 'false',
	`keywords` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thread_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`summary` text NOT NULL,
	`keyPoints` json,
	`consensus` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `thread_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`serviceName` varchar(255) NOT NULL,
	`initiatorAgentId` int NOT NULL,
	`status` enum('active','closed','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `threads_id` PRIMARY KEY(`id`)
);
