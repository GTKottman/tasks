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
  if (!target.parentSourceId) {
    setDescendants(target, completed, new Set());
  } else {
    completedById.set(target.id, completed);

    let parent = itemBySourceId.get(target.parentSourceId);
    const visitedParents = new Set<string>();
    while (parent?.parentSourceId && !visitedParents.has(parent.id)) {
      visitedParents.add(parent.id);
      parent = itemBySourceId.get(parent.parentSourceId);
    }

    if (parent?.sourceItemId) {
      const descendants: T[] = [];
      const collectDescendants = (sourceId: string, visited: Set<string>) => {
        if (visited.has(sourceId)) return;
        visited.add(sourceId);
        for (const child of childrenByParentSourceId.get(sourceId) ?? []) {
          descendants.push(child);
          if (child.sourceItemId) collectDescendants(child.sourceItemId, visited);
        }
      };
      collectDescendants(parent.sourceItemId, new Set());
      completedById.set(parent.id, descendants.length > 0 && descendants.every((item) => completedById.get(item.id)));
    }
  }

  return new Map(
    items.flatMap((item) => {
      const next = completedById.get(item.id) ?? item.completed;
      return next === item.completed ? [] : [[item.id, next] as const];
    }),
  );
}
