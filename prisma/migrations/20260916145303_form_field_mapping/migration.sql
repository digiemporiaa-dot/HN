-- CreateEnum
CREATE TYPE "FormFieldMapping" AS ENUM ('NONE', 'NAME', 'EMAIL', 'PHONE', 'ORGANISATION', 'CITY', 'MESSAGE');

-- AlterTable
ALTER TABLE "FormField" ADD COLUMN     "mapsTo" "FormFieldMapping" NOT NULL DEFAULT 'NONE';
