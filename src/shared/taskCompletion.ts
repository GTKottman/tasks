export type CompletableItem = {
  id: string;
  sourceItemId: string | null;
  parentSourceId: string | null;
  completed: boolean;
};

export function completionUpdates<T extends CompletableItem>(
  items: T[],
  targetId: string,
  completed: boolean,
): Map<string, boolean> {
  const target = items.find((item) => item.id === targetId);
  if (!target) return new Map();

  const completedById = new Map(items.map((item) => [item.id, item.completed]));
  const itemBySourceId = new Map(
    items.flatMap((item) => item.sourceItemId ? [[item.sourceItemId, item] as const] : []),
  );
  const childrenByParentSourceId = new Map<string, T[]>();
  for (const item of items) {
    if (!item.parentSourceId) continue;
    const children = childrenByParentSourceId.get(item.parentSourceId) ?? [];
    children.push(item);
    childrenByParentSourceId.set(item.parentSourceId, children);
  }

  const setDescendants = (item: T, value: boolean, visited: Set<string>) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    completedById.set(item.id, value);
    if (!item.sourceItemId) return;
    for (const child of childrenByParentSourceId.get(item.sourceItemId) ?? []) {
      setDescendants(child, value, visited);
    }
  };
  setDescendants(target, completed, new Set());

  let parentSourceId = target.parentSourceId;
  const visitedParents = new Set<string>();
  while (parentSourceId && !visitedParents.has(parentSourceId)) {
    visitedParents.add(parentSourceId);
    const parent = itemBySourceId.get(parentSourceId);
    if (!parent) break;
    const children = childrenByParentSourceId.get(parentSourceId) ?? [];
    completedById.set(parent.id, children.length > 0 && children.every((child) => completedById.get(child.id)));
    parentSourceId = parent.parentSourceId;
  }

  return new Map(
    items.flatMap((item) => {
      const next = completedById.get(item.id) ?? item.completed;
      return next === item.completed ? [] : [[item.id, next] as const];
    }),
  );
}
