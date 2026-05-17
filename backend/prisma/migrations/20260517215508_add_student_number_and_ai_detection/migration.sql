-- AlterTable
ALTER TABLE "students" ADD COLUMN     "student_number" TEXT;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "ai_certainty_degree" INTEGER,
ADD COLUMN     "ai_generated_by_ai" BOOLEAN,
ADD COLUMN     "ai_reason" TEXT;
