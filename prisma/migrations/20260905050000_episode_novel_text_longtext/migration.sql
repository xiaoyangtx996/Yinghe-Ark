-- Expand episode body/title capacity for long novel chapters (TEXT 64KB → LONGTEXT)
ALTER TABLE `novel_promotion_episodes`
  MODIFY COLUMN `name` VARCHAR(512) NOT NULL,
  MODIFY COLUMN `novelText` LONGTEXT NULL;
