-- CreateTable
CREATE TABLE `Admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Domain` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domain` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `group` VARCHAR(191) NOT NULL DEFAULT 'Default',
    `targetMarket` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `paused` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Domain_domain_key`(`domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DomainAlertState` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domainId` INTEGER NOT NULL,
    `lastStatus` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DomainAlertState_domainId_key`(`domainId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `emailEnabled` BOOLEAN NOT NULL DEFAULT true,
    `email` VARCHAR(191) NOT NULL DEFAULT 'ops@mi-hawk.io',
    `webhookEnabled` BOOLEAN NOT NULL DEFAULT true,
    `webhookUrl` TEXT NOT NULL,
    `smsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `smsNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `thresholdIndia` INTEGER NOT NULL DEFAULT 70,
    `thresholdIndonesia` INTEGER NOT NULL DEFAULT 70,
    `thresholdGlobal` INTEGER NOT NULL DEFAULT 50,
    `escalation` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BulkImportLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `market` VARCHAR(191) NOT NULL,
    `added` INTEGER NOT NULL,
    `skipped` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `checkInterval` VARCHAR(191) NOT NULL DEFAULT '1 hour',
    `requestTimeout` VARCHAR(191) NOT NULL DEFAULT '10 seconds',
    `retries` INTEGER NOT NULL DEFAULT 2,
    `checkerApiKey` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckResult` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domainId` INTEGER NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `nodeName` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `statusCode` INTEGER NULL,
    `responseTimeMs` INTEGER NULL,
    `errorMessage` TEXT NULL,
    `checkedAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CheckResult_region_location_idx`(`region`, `location`),
    UNIQUE INDEX `CheckResult_domainId_region_location_key`(`domainId`, `region`, `location`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domainId` INTEGER NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `nodeName` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `statusCode` INTEGER NULL,
    `responseTimeMs` INTEGER NULL,
    `errorMessage` TEXT NULL,
    `checkedAt` DATETIME(3) NOT NULL,

    INDEX `CheckLog_domainId_checkedAt_idx`(`domainId`, `checkedAt`),
    INDEX `CheckLog_checkedAt_idx`(`checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DomainAlertState` ADD CONSTRAINT `DomainAlertState_domainId_fkey` FOREIGN KEY (`domainId`) REFERENCES `Domain`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckResult` ADD CONSTRAINT `CheckResult_domainId_fkey` FOREIGN KEY (`domainId`) REFERENCES `Domain`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckLog` ADD CONSTRAINT `CheckLog_domainId_fkey` FOREIGN KEY (`domainId`) REFERENCES `Domain`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
