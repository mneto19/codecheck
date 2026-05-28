-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "paste_count" INTEGER DEFAULT 0,
ADD COLUMN     "pasted_chars" INTEGER DEFAULT 0;
