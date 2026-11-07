-- CreateTable
CREATE TABLE `CloudUser` (
    `id` VARCHAR(20) NOT NULL,
    `secretHash` CHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CloudEntry` (
    `userId` VARCHAR(20) NOT NULL,
    -- binary collation: keys are case-sensitive (dataStore/Foo != dataStore/foo)
    `key` VARCHAR(256) COLLATE utf8mb4_bin NOT NULL,
    `value` LONGBLOB NOT NULL,
    `version` INTEGER NOT NULL,
    `checksum` CHAR(16) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`, `key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CloudEntry` ADD CONSTRAINT `CloudEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `CloudUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
