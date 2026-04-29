import type { IDesignItem, InstanceServiceContainer } from '@node-projects/web-component-designer';
import { edgeTags, tagToEntry } from './bpmnRegistry.js';

const referenceAttributes = ['source-ref', 'target-ref', 'attached-to-ref', 'lane-ref', 'participant-ref'] as const;
const reconcileWindowMs = 4000;

type PendingPair = {
  oldId: string;
  newId: string;
};

type PendingNormalization = {
  createdAt: number;
  pairs: PendingPair[];
};

const pendingByInstance = new WeakMap<InstanceServiceContainer, PendingNormalization[]>();

function getBpmnId(item: IDesignItem) {
  return item.element.getAttribute('bpmn-id');
}

function setBpmnId(item: IDesignItem, id: string) {
  item._withoutUndoSetAttribute('bpmn-id', id);
}

function collectItems(rootItems: IDesignItem[]) {
  const all: IDesignItem[] = [];
  const stack = [...rootItems];
  while (stack.length) {
    const item = stack.pop()!;
    all.push(item);
    stack.push(...item.children());
  }
  return all;
}

function collectCanvasItems(instanceServiceContainer: InstanceServiceContainer) {
  return collectItems(Array.from(instanceServiceContainer.designerCanvas.rootDesignItem.children())).filter(item => item.element.localName.startsWith('bpmn-'));
}

function rewireReferences(items: IDesignItem[], swapMap: Map<string, string>) {
  if (!swapMap.size) {
    return;
  }

  for (const item of items) {
    for (const attributeName of referenceAttributes) {
      const value = item.element.getAttribute(attributeName);
      if (!value) {
        continue;
      }

      const mapped = swapMap.get(value);
      if (mapped) {
        item._withoutUndoSetAttribute(attributeName, mapped);
      }
    }
  }
}

function pushPending(instanceServiceContainer: InstanceServiceContainer, pairs: PendingPair[]) {
  if (!pairs.length) {
    return;
  }

  const current = pendingByInstance.get(instanceServiceContainer) ?? [];
  const now = Date.now();
  const cleaned = current.filter(entry => now - entry.createdAt <= reconcileWindowMs);
  cleaned.push({ createdAt: now, pairs });
  pendingByInstance.set(instanceServiceContainer, cleaned);
}

function consumePending(instanceServiceContainer: InstanceServiceContainer) {
  const current = pendingByInstance.get(instanceServiceContainer) ?? [];
  const now = Date.now();
  const active = current.filter(entry => now - entry.createdAt <= reconcileWindowMs);
  pendingByInstance.delete(instanceServiceContainer);
  return active;
}

function createUniqueId(basePrefix: string, usedIds: Set<string>) {
  let index = 1;
  let candidate = `${basePrefix}_${index}`;
  while (usedIds.has(candidate)) {
    index += 1;
    candidate = `${basePrefix}_${index}`;
  }
  usedIds.add(candidate);
  return candidate;
}

function getDefaultPrefix(item: IDesignItem) {
  const entry = tagToEntry.get(item.element.localName);
  if (entry) {
    return entry.defaultIdPrefix;
  }
  return edgeTags.has(item.element.localName) ? 'Flow' : 'Element';
}

export function normalizeBpmnIdsForAddedItems(instanceServiceContainer: InstanceServiceContainer, addedRoots: IDesignItem[]) {
  if (!addedRoots.length) {
    return;
  }

  const addedItems = collectItems(addedRoots).filter(item => item.element.localName.startsWith('bpmn-'));
  if (!addedItems.length) {
    return;
  }

  const addedSet = new Set(addedItems);
  const allItems = collectCanvasItems(instanceServiceContainer);

  const usedIds = new Set(
    allItems
      .filter(item => !addedSet.has(item))
      .map(item => getBpmnId(item))
      .filter((id): id is string => !!id)
  );

  const idMap = new Map<string, string>();
  const pendingPairs: PendingPair[] = [];

  // Re-assign every added element ID to avoid collisions on paste/duplicate actions.
  for (const item of addedItems) {
    const oldId = getBpmnId(item);
    const newId = createUniqueId(getDefaultPrefix(item), usedIds);

    if (oldId) {
      idMap.set(oldId, newId);
      pendingPairs.push({ oldId, newId });
    }

    setBpmnId(item, newId);
  }

  // Re-wire references inside the newly added set to the remapped IDs.
  for (const item of addedItems) {
    for (const attributeName of referenceAttributes) {
      const previous = item.element.getAttribute(attributeName);
      if (!previous) {
        continue;
      }

      const mapped = idMap.get(previous);
      if (mapped) {
        item._withoutUndoSetAttribute(attributeName, mapped);
      }
    }
  }

  pushPending(instanceServiceContainer, pendingPairs);
}

export function reconcileCtrlDragIdAssignment(instanceServiceContainer: InstanceServiceContainer, movedRoots: IDesignItem[]) {
  const pendingEntries = consumePending(instanceServiceContainer);
  if (!pendingEntries.length) {
    return;
  }

  const movedItems = collectItems(movedRoots).filter(item => item.element.localName.startsWith('bpmn-'));
  if (!movedItems.length) {
    return;
  }

  const movedIds = new Set(movedItems.map(item => getBpmnId(item)).filter((id): id is string => !!id));
  if (!movedIds.size) {
    return;
  }

  const allItems = collectCanvasItems(instanceServiceContainer);
  const byId = new Map(allItems.map(item => [getBpmnId(item), item] as const).filter((entry): entry is [string, IDesignItem] => !!entry[0]));

  const swapMap = new Map<string, string>();

  for (const entry of pendingEntries) {
    for (const pair of entry.pairs) {
      // Ctrl+drag: the moved element keeps oldId, the fresh clone stays at old place with newId.
      // We swap them so the moved element receives newId and the stationary clone keeps oldId.
      if (!movedIds.has(pair.oldId)) {
        continue;
      }

      const movedItem = byId.get(pair.oldId);
      const cloneItem = byId.get(pair.newId);
      if (!movedItem || !cloneItem) {
        continue;
      }

      setBpmnId(movedItem, pair.newId);
      setBpmnId(cloneItem, pair.oldId);
      swapMap.set(pair.oldId, pair.newId);
      swapMap.set(pair.newId, pair.oldId);

      byId.set(pair.newId, movedItem);
      byId.set(pair.oldId, cloneItem);
    }
  }

  if (swapMap.size) {
    rewireReferences(allItems, swapMap);
  }
}
