ALTER TABLE "RoutineVersion"
ADD COLUMN "timeSensitive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "DailyRoutine"
ADD COLUMN "timeSensitive" BOOLEAN NOT NULL DEFAULT true;
