import "dotenv/config";
import argon2 from "argon2";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/server/db";

type SeedItem = { label: string; parentIndex?: number };
type SeedSection = { title: string; items: SeedItem[] };

function text(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
}

function parseLegacy(html: string) {
  return [...html.matchAll(/<div class="routine" data-days="([^"]+)" data-start="([^"]+)" data-end="([^"]+)">([\s\S]*?)(?=<div class="routine" data-days=|<script)/g)]
    .map((match) => {
      const body = match[4];
      const name = text(body.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? "");
      const sections: SeedSection[] = [...body.matchAll(/<div class="routine-column">([\s\S]*?)(?=<div class="routine-column">|<\/div>\s*<\/div>\s*<\/div>)/g)]
        .map((sectionMatch) => {
          const sectionBody = sectionMatch[1];
          const title = text(sectionBody.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? "");
          let parentIndex: number | undefined;
          const items = [...sectionBody.matchAll(/<label class="([^"]*(?:item|subitem)[^"]*)"[^>]*>[\s\S]*?<span class="label">([\s\S]*?)<\/span><\/label>/g)]
            .map((itemMatch, index) => {
              const nested = itemMatch[1].includes("subitem");
              const item = { label: text(itemMatch[2]), ...(nested && parentIndex !== undefined ? { parentIndex } : {}) };
              if (!nested) parentIndex = index;
              return item;
            });
          return { title, items };
        })
        .filter((section) => section.title && section.items.length);
      return {
        name,
        weekdays: match[1].split(",").map(Number),
        startTime: match[2],
        endTime: match[3],
        sections,
      };
    });
}

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("OWNER_EMAIL and OWNER_PASSWORD (at least 12 characters) are required");
  }
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await argon2.hash(password) },
  });

  const html = await readFile(resolve("backup/legacy-static/index.html"), "utf8");
  const routines = parseLegacy(html);
  if (routines.length !== 4) throw new Error(`Expected 4 legacy routines, found ${routines.length}`);
  const effectiveFrom = new Date(Date.UTC(2020, 0, 1));
  for (const [routineOrder, source] of routines.entries()) {
    if (await prisma.routine.findFirst({ where: { name: source.name } })) continue;
    const created = await prisma.routine.create({
      data: {
        name: source.name,
        sortOrder: routineOrder,
        versions: {
          create: {
            name: source.name,
            effectiveFrom,
            weekdays: source.weekdays,
            startTime: source.startTime,
            endTime: source.endTime,
            sections: {
              create: source.sections.map((section, sectionOrder) => ({
                title: section.title,
                sortOrder: sectionOrder,
                items: {
                  create: section.items.map((item, itemOrder) => ({
                    label: item.label,
                    sortOrder: itemOrder,
                  })),
                },
              })),
            },
          },
        },
      },
    });
    const version = await prisma.routineVersion.findFirst({
      where: { routineId: created.id },
      include: { sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } } },
    });
    if (version) {
      await Promise.all(version.sections.flatMap((section, sectionIndex) =>
        section.items.flatMap((item, itemIndex) => {
          const parentIndex = source.sections[sectionIndex]?.items[itemIndex]?.parentIndex;
          const parent = parentIndex === undefined ? undefined : section.items[parentIndex];
          return parent ? [prisma.item.update({ where: { id: item.id }, data: { parentId: parent.id } })] : [];
        }),
      ));
    }
  }
}

main().finally(() => prisma.$disconnect());
