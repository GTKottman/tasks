import crypto from "node:crypto";
import path from "node:path";
import argon2 from "argon2";
import connectPgSimple from "connect-pg-simple";
import express, { type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import { Pool } from "pg";
import { z } from "zod";
import { prisma } from "./db";
import { datesInYear, isScheduled, parseISODate, statusForCounts, toISODate } from "../shared/date";

declare module "express-session" {
  interface SessionData {
    userId: string;
    csrfToken: string;
  }
}

const itemInput = z.object({
  label: z.string().trim().min(1).max(300),
  parentIndex: z.number().int().min(0).nullable().optional(),
});
const routineInput = z.object({
  name: z.string().trim().min(1).max(120),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/),
  endTime: z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/),
  sortOrder: z.number().int().min(0).default(0),
  confirmReplace: z.boolean().optional(),
  sections: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    items: z.array(itemInput).min(1),
  })).min(1),
});

function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => void handler(req, res).catch(next);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: "Authentication required" });
  next();
}

function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin");
  if (origin) {
    const expected = `${req.protocol}://${req.get("host")}`;
    if (origin !== expected) return res.status(403).json({ error: "Cross-origin request denied" });
  }
  if (!req.session.csrfToken || req.get("x-csrf-token") !== req.session.csrfToken) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  next();
}

function routeId(req: Request): string {
  const value = req.params.id;
  if (Array.isArray(value)) throw new Error("Invalid route id");
  return value;
}

async function materialize(date: Date) {
  const versions = await prisma.routineVersion.findMany({
    where: {
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    include: {
      routine: true,
      sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  for (const version of versions.filter((entry) => isScheduled(entry.weekdays, date))) {
    await prisma.dailyRoutine.upsert({
      where: { date_routineVersionId: { date, routineVersionId: version.id } },
      update: {},
      create: {
        date,
        routineVersionId: version.id,
        routineName: version.name,
        startTime: version.startTime,
        endTime: version.endTime,
        items: {
          create: version.sections.flatMap((section) =>
            section.items.map((item) => ({
              sourceItemId: item.id,
              sectionTitle: section.title,
              sectionOrder: section.sortOrder,
              label: item.label,
              itemOrder: item.sortOrder,
              parentSourceId: item.parentId,
            })),
          ),
        },
      },
    });
  }
}

function versionData(input: z.infer<typeof routineInput>, effectiveFrom: Date) {
  return {
    name: input.name,
    effectiveFrom,
    weekdays: [...new Set(input.weekdays)].sort(),
    startTime: input.startTime,
    endTime: input.endTime,
    sections: {
      create: input.sections.map((section, sectionOrder) => ({
        title: section.title,
        sortOrder: sectionOrder,
        items: { create: section.items.map((item, itemOrder) => ({ label: item.label, sortOrder: itemOrder })) },
      })),
    },
  };
}

async function applyParentLinks(routineId: string, input: z.infer<typeof routineInput>) {
  const version = await prisma.routineVersion.findFirst({
    where: { routineId, effectiveTo: null },
    orderBy: { createdAt: "desc" },
    include: { sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!version) return;
  const updates = version.sections.flatMap((section, sectionIndex) =>
    section.items.flatMap((item, itemIndex) => {
      const parentIndex = input.sections[sectionIndex]?.items[itemIndex]?.parentIndex;
      if (parentIndex == null || parentIndex >= itemIndex) return [];
      const parent = section.items[parentIndex];
      return parent ? [prisma.item.update({ where: { id: item.id }, data: { parentId: parent.id } })] : [];
    }),
  );
  await Promise.all(updates);
}

async function syncTodaySnapshot(date: Date, routineId: string, previousVersionId: string) {
  const [version, dailyRoutine] = await Promise.all([
    prisma.routineVersion.findFirst({
      where: { routineId, effectiveTo: null },
      orderBy: { createdAt: "desc" },
      include: {
        sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
      },
    }),
    prisma.dailyRoutine.findUnique({
      where: { date_routineVersionId: { date, routineVersionId: previousVersionId } },
      include: { items: { orderBy: [{ sectionOrder: "asc" }, { itemOrder: "asc" }] } },
    }),
  ]);
  if (!version || !dailyRoutine) return;

  const completionByLabel = new Map<string, Array<{ completed: boolean; completedAt: Date | null }>>();
  for (const item of dailyRoutine.items) {
    const completions = completionByLabel.get(item.label) ?? [];
    completions.push({ completed: item.completed, completedAt: item.completedAt });
    completionByLabel.set(item.label, completions);
  }

  const items = version.sections.flatMap((section) =>
    section.items.map((item) => {
      const completion = completionByLabel.get(item.label)?.shift();
      return {
        dailyRoutineId: dailyRoutine.id,
        sourceItemId: item.id,
        sectionTitle: section.title,
        sectionOrder: section.sortOrder,
        label: item.label,
        itemOrder: item.sortOrder,
        parentSourceId: item.parentId,
        completed: completion?.completed ?? false,
        completedAt: completion?.completedAt ?? null,
      };
    }),
  );

  await prisma.$transaction([
    prisma.dailyItem.deleteMany({ where: { dailyRoutineId: dailyRoutine.id } }),
    prisma.dailyRoutine.update({
      where: { id: dailyRoutine.id },
      data: { routineName: version.name, startTime: version.startTime, endTime: version.endTime },
    }),
    prisma.dailyItem.createMany({ data: items }),
  ]);
}

export function createApp() {
  const app = express();
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production");
  }
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  const PgStore = connectPgSimple(session);
  app.use(session({
    store: new PgStore({ pool: new Pool({ connectionString: process.env.DATABASE_URL }), createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? "development-only-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 14 },
  }));

  app.get("/api/auth/status", (req, res) => {
    if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString("base64url");
    res.json({ authenticated: Boolean(req.session.userId), csrfToken: req.session.csrfToken });
  });
  app.post("/api/auth/login", rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: true, legacyHeaders: false }), asyncRoute(async (req, res) => {
    const data = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (!user || !(await argon2.verify(user.passwordHash, data.password))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.userId = user.id;
    req.session.csrfToken = crypto.randomBytes(24).toString("base64url");
    res.json({ authenticated: true, csrfToken: req.session.csrfToken });
  }));
  app.post("/api/auth/logout", requireAuth, requireCsrf, (req, res, next) =>
    req.session.destroy((error) => error ? next(error) : res.status(204).end()));

  app.use("/api", requireAuth);
  app.get("/api/dashboard", asyncRoute(async (req, res) => {
    const date = parseISODate(z.string().optional().default(toISODate(new Date())).parse(req.query.date));
    const year = z.coerce.number().int().min(2000).max(2200).optional().default(date.getUTCFullYear()).parse(req.query.year);
    await materialize(date);
    const [daily, yearInstances, versions] = await Promise.all([
      prisma.dailyRoutine.findMany({ where: { date }, include: { items: { orderBy: [{ sectionOrder: "asc" }, { itemOrder: "asc" }] } }, orderBy: { startTime: "asc" } }),
      prisma.dailyRoutine.findMany({ where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) } }, include: { items: true } }),
      prisma.routineVersion.findMany({ where: { effectiveFrom: { lte: new Date(Date.UTC(year, 11, 31)) }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(Date.UTC(year, 0, 1)) } }] } }),
    ]);
    const existing = new Map<string, { completed: number; total: number }>();
    for (const instance of yearInstances) {
      const key = toISODate(instance.date);
      const counts = existing.get(key) ?? { completed: 0, total: 0 };
      counts.total += instance.items.length;
      counts.completed += instance.items.filter((item) => item.completed).length;
      existing.set(key, counts);
    }
    const yearStatus = datesInYear(year).map((iso) => {
      const day = parseISODate(iso);
      const counts = existing.get(iso);
      const scheduled = versions.some((v) => v.effectiveFrom <= day && (!v.effectiveTo || v.effectiveTo >= day) && isScheduled(v.weekdays, day));
      return { date: iso, status: counts ? statusForCounts(counts.completed, counts.total) : scheduled ? "low" : "none", completed: counts?.completed ?? 0, total: counts?.total ?? 0 };
    });
    res.json({ date: toISODate(date), year, routines: daily, yearStatus });
  }));
  app.patch("/api/items/:id", requireCsrf, asyncRoute(async (req, res) => {
    const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
    const item = await prisma.dailyItem.update({ where: { id: routeId(req) }, data: { completed, completedAt: completed ? new Date() : null } });
    res.json(item);
  }));

  app.get("/api/routines", asyncRoute(async (_req, res) => {
    const routines = await prisma.routine.findMany({
      include: {
        versions: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          include: { sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    res.json(routines);
  }));
  app.post("/api/routines", requireCsrf, asyncRoute(async (req, res) => {
    const input = routineInput.parse(req.body);
    const routine = await prisma.routine.create({ data: { name: input.name, sortOrder: input.sortOrder, versions: { create: versionData(input, parseISODate(toISODate(new Date()))) } } });
    await applyParentLinks(routine.id, input);
    res.status(201).json(routine);
  }));
  app.put("/api/routines/:id", requireCsrf, asyncRoute(async (req, res) => {
    const input = routineInput.parse(req.body);
    if (!input.confirmReplace) {
      res.status(409).json({ error: "Set confirmReplace to replace the current version" });
      return;
    }
    const routineId = routeId(req);
    const today = parseISODate(toISODate(new Date()));
    const yesterday = new Date(today.getTime() - 86_400_000);
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const snapshotVersionId = await prisma.$transaction(async (tx) => {
      const current = await tx.routineVersion.findFirst({
        where: { routineId },
        orderBy: { effectiveFrom: "desc" },
      });
      if (!current) throw new Error("Routine has no active version");

      const [hasSnapshot, todaySnapshot] = await Promise.all([
        tx.dailyRoutine.count({ where: { routineVersionId: current.id, date: today } }),
        tx.dailyRoutine.findFirst({
          where: { date: today, routineVersion: { routineId } },
          select: { routineVersionId: true },
        }),
      ]);
      const isUnmaterializedCurrentOrFuture = current.effectiveFrom >= today && hasSnapshot === 0;
      const effectiveFrom = hasSnapshot > 0 ? tomorrow : current.effectiveFrom > today ? current.effectiveFrom : today;

      if (isUnmaterializedCurrentOrFuture) {
        await tx.routineVersion.delete({ where: { id: current.id } });
      } else {
        await tx.routineVersion.update({
          where: { id: current.id },
          data: { effectiveTo: hasSnapshot > 0 ? today : yesterday },
        });
      }
      await tx.routine.update({
        where: { id: routineId },
        data: {
          name: input.name,
          sortOrder: input.sortOrder,
          archivedAt: null,
          versions: { create: versionData(input, effectiveFrom) },
        },
      });
      return todaySnapshot?.routineVersionId ?? null;
    });
    await applyParentLinks(routineId, input);
    if (snapshotVersionId) await syncTodaySnapshot(today, routineId, snapshotVersionId);
    res.status(204).end();
  }));
  app.delete("/api/routines/:id", requireCsrf, asyncRoute(async (req, res) => {
    z.object({ confirm: z.literal(true) }).parse(req.body);
    const today = parseISODate(toISODate(new Date()));
    const yesterday = new Date(today.getTime() - 86_400_000);
    await prisma.$transaction([
      prisma.routine.update({ where: { id: routeId(req) }, data: { archivedAt: new Date() } }),
      prisma.routineVersion.updateMany({ where: { routineId: routeId(req), effectiveTo: null }, data: { effectiveTo: yesterday } }),
    ]);
    res.status(204).end();
  }));

  if (process.env.NODE_ENV === "production") {
    const client = path.resolve("dist/client");
    app.use(express.static(client));
    app.get("*splat", (_req, res) => res.sendFile(path.join(client, "index.html")));
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid request", details: error.issues });
    console.error(error);
    res.status(500).json({ error: "Unexpected server error" });
  });
  return app;
}
