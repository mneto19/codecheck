-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "test_cases" JSONB,
ADD COLUMN     "function_name" TEXT;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "tests_passed" INTEGER,
ADD COLUMN     "tests_total" INTEGER;
