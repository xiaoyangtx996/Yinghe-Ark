-- AlterTable
ALTER TABLE `global_asset_folders` ADD COLUMN `kind` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `global_asset_folders_userId_kind_idx` ON `global_asset_folders`(`userId`, `kind`);
