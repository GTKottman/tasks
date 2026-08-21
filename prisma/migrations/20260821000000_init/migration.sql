CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Routine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "RoutineVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "routineId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "weekdays" INTEGER[] NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoutineVersion_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE
);
CREATE INDEX "RoutineVersion_routineId_effectiveFrom_effectiveTo_idx" ON "RoutineVersion"("routineId", "effectiveFrom", "effectiveTo");

CREATE TABLE "Section" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "routineVersionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "Section_routineVersionId_fkey" FOREIGN KEY ("routineVersionId") REFERENCES "RoutineVersion"("id") ON DELETE CASCADE
);
CREATE INDEX "Section_routineVersionId_sortOrder_idx" ON "Section"("routineVersionId", "sortOrder");

CREATE TABLE "Item" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sectionId" TEXT NOT NULL,
  "parentId" TEXT,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "Item_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE,
  CONSTRAINT "Item_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Item"("id") ON DELETE CASCADE
);
CREATE INDEX "Item_sectionId_sortOrder_idx" ON "Item"("sectionId", "sortOrder");
CREATE INDEX "Item_parentId_idx" ON "Item"("parentId");

CREATE TABLE "DailyRoutine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "date" DATE NOT NULL,
  "routineVersionId" TEXT NOT NULL,
  "routineName" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyRoutine_routineVersionId_fkey" FOREIGN KEY ("routineVersionId") REFERENCES "RoutineVersion"("id")
);
CREATE UNIQUE INDEX "DailyRoutine_date_routineVersionId_key" ON "DailyRoutine"("date", "routineVersionId");
CREATE INDEX "DailyRoutine_date_idx" ON "DailyRoutine"("date");

CREATE TABLE "DailyItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dailyRoutineId" TEXT NOT NULL,
  "sourceItemId" TEXT,
  "sectionTitle" TEXT NOT NULL,
  "sectionOrder" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "itemOrder" INTEGER NOT NULL,
  "parentSourceId" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DailyItem_dailyRoutineId_fkey" FOREIGN KEY ("dailyRoutineId") REFERENCES "DailyRoutine"("id") ON DELETE CASCADE
);
CREATE INDEX "DailyItem_dailyRoutineId_sectionOrder_itemOrder_idx" ON "DailyItem"("dailyRoutineId", "sectionOrder", "itemOrder");
