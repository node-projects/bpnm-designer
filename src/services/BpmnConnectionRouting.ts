import type { IDesignItem, InstanceServiceContainer } from '@node-projects/web-component-designer';
import { edgeTags } from './bpmnRegistry.js';
import { encodeWaypoints, getElementConnectionBounds, routeBetweenBounds } from './bpmnGeometry.js';

const annotationOffsetXAttribute = 'data-linked-annotation-offset-x';
const annotationOffsetYAttribute = 'data-linked-annotation-offset-y';

type LinkedAnnotationRecord = {
  associationItem: IDesignItem;
  sourceItem: IDesignItem;
  annotationItem: IDesignItem;
  sourceId: string;
  annotationId: string;
};

const annotationPreviewPositions = new Map<string, { left: string; top: string }>();

function getBpmnId(designItem: IDesignItem) {
  return designItem.element.getAttribute('bpmn-id');
}

function isEdgeItem(designItem: IDesignItem) {
  return edgeTags.has(designItem.element.localName);
}

function isTextAnnotationItem(designItem: IDesignItem) {
  return designItem.element.localName === 'bpmn-text-annotation';
}

function getChangedNodeIds(changedItems: IDesignItem[]) {
  return new Set(
    changedItems
      .filter(item => !isEdgeItem(item))
      .map(item => getBpmnId(item))
      .filter((id): id is string => !!id)
  );
}

function collectCanvasDesignItems(rootDesignItem: IDesignItem) {
  const allItems: IDesignItem[] = [];
  const stack = Array.from(rootDesignItem.children());

  while (stack.length) {
    const item = stack.pop()!;
    allItems.push(item);
    stack.push(...item.children());
  }

  return allItems;
}

function createNodeItemsById(rootItems: IDesignItem[]) {
  return new Map(
    rootItems
      .filter(item => !isEdgeItem(item))
      .map(item => [getBpmnId(item), item] as const)
      .filter((entry): entry is [string, IDesignItem] => !!entry[0])
  );
}

function getLinkedAnnotationRecord(associationItem: IDesignItem, nodeItemsById: Map<string, IDesignItem>) {
  if (associationItem.element.localName !== 'bpmn-association') {
    return null;
  }

  const sourceRef = associationItem.element.getAttribute('source-ref');
  const targetRef = associationItem.element.getAttribute('target-ref');
  if (!sourceRef || !targetRef) {
    return null;
  }

  const sourceItem = nodeItemsById.get(sourceRef);
  const targetItem = nodeItemsById.get(targetRef);
  if (!sourceItem || !targetItem || isTextAnnotationItem(sourceItem) === isTextAnnotationItem(targetItem)) {
    return null;
  }

  return isTextAnnotationItem(sourceItem)
    ? {
        associationItem,
        sourceItem: targetItem,
        annotationItem: sourceItem,
        sourceId: targetRef,
        annotationId: sourceRef
      }
    : {
        associationItem,
        sourceItem,
        annotationItem: targetItem,
        sourceId: sourceRef,
        annotationId: targetRef
      } satisfies LinkedAnnotationRecord;
}

function readLinkedAnnotationOffset(associationItem: IDesignItem) {
  const dx = Number.parseFloat(associationItem.element.getAttribute(annotationOffsetXAttribute) ?? '');
  const dy = Number.parseFloat(associationItem.element.getAttribute(annotationOffsetYAttribute) ?? '');
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    return null;
  }
  return { x: dx, y: dy };
}

function writeLinkedAnnotationOffset(instanceServiceContainer: InstanceServiceContainer, record: LinkedAnnotationRecord) {
  const designerCanvas = instanceServiceContainer.designerCanvas;
  const sourceBounds = designerCanvas.getNormalizedElementCoordinates(record.sourceItem.element);
  const annotationBounds = designerCanvas.getNormalizedElementCoordinates(record.annotationItem.element);
  record.associationItem.element.setAttribute(annotationOffsetXAttribute, `${Math.round(annotationBounds.x - sourceBounds.x)}`);
  record.associationItem.element.setAttribute(annotationOffsetYAttribute, `${Math.round(annotationBounds.y - sourceBounds.y)}`);
}

function restorePreviewStyle(designItem: IDesignItem, name: 'left' | 'top', value: string) {
  if (value) {
    designItem._withoutUndoSetStyle(name, value);
  } else {
    designItem._withoutUndoRemoveStyle(name);
  }
}

function applyLinkedAnnotationPosition(annotationItem: IDesignItem, x: number, y: number, operationFinished: boolean) {
  const annotationId = getBpmnId(annotationItem);
  if (!annotationId) {
    return false;
  }

  const element = annotationItem.element as HTMLElement;
  const left = `${Math.round(x)}px`;
  const top = `${Math.round(y)}px`;
  if (!operationFinished) {
    if (element.style.left === left && element.style.top === top) {
      return false;
    }

    if (!annotationPreviewPositions.has(annotationId)) {
      annotationPreviewPositions.set(annotationId, { left: element.style.left, top: element.style.top });
    }
    element.style.left = left;
    element.style.top = top;
    return true;
  }

  const previewState = annotationPreviewPositions.get(annotationId);
  const changed = previewState
    ? previewState.left !== left || previewState.top !== top
    : element.style.left !== left || element.style.top !== top;

  if (previewState) {
    restorePreviewStyle(annotationItem, 'left', previewState.left);
    restorePreviewStyle(annotationItem, 'top', previewState.top);
    annotationPreviewPositions.delete(annotationId);
  }

  if (!changed) {
    return false;
  }

  annotationItem.setStyle('left', left);
  annotationItem.setStyle('top', top);
  return true;
}

function syncLinkedAnnotationOffsets(instanceServiceContainer: InstanceServiceContainer, rootItems: IDesignItem[], nodeItemsById: Map<string, IDesignItem>, touchedNodeIds?: Set<string>) {
  for (const item of rootItems) {
    const record = getLinkedAnnotationRecord(item, nodeItemsById);
    if (!record) {
      continue;
    }

    if (touchedNodeIds && !touchedNodeIds.has(record.sourceId) && !touchedNodeIds.has(record.annotationId)) {
      continue;
    }

    writeLinkedAnnotationOffset(instanceServiceContainer, record);
  }
}

function moveLinkedAnnotations(instanceServiceContainer: InstanceServiceContainer, rootItems: IDesignItem[], nodeItemsById: Map<string, IDesignItem>, changedNodeIds: Set<string>, operationFinished: boolean) {
  const movedAnnotationIds = new Set<string>();
  const undoGroup = operationFinished ? instanceServiceContainer.undoService.openGroup('move BPMN annotations') : null;
  let changed = false;

  for (const item of rootItems) {
    const record = getLinkedAnnotationRecord(item, nodeItemsById);
    if (!record || !changedNodeIds.has(record.sourceId) || changedNodeIds.has(record.annotationId)) {
      continue;
    }

    const offset = readLinkedAnnotationOffset(record.associationItem) ?? (() => {
      const designerCanvas = instanceServiceContainer.designerCanvas;
      const sourceBounds = designerCanvas.getNormalizedElementCoordinates(record.sourceItem.element);
      const annotationBounds = designerCanvas.getNormalizedElementCoordinates(record.annotationItem.element);
      return {
        x: annotationBounds.x - sourceBounds.x,
        y: annotationBounds.y - sourceBounds.y
      };
    })();

    const sourceBounds = instanceServiceContainer.designerCanvas.getNormalizedElementCoordinates(record.sourceItem.element);
    if (applyLinkedAnnotationPosition(record.annotationItem, sourceBounds.x + offset.x, sourceBounds.y + offset.y, operationFinished)) {
      changed = true;
      movedAnnotationIds.add(record.annotationId);
    }
  }

  if (undoGroup && changed) {
    undoGroup.commit();
  } else if (undoGroup) {
    undoGroup.abort();
  }

  return movedAnnotationIds;
}

function rerouteEdgesForNodeIds(instanceServiceContainer: InstanceServiceContainer, changedNodeIds: Set<string>, operationFinished: boolean) {
  const designerCanvas = instanceServiceContainer.designerCanvas;
  const rootItems = collectCanvasDesignItems(designerCanvas.rootDesignItem);
  const nodeItemsById = createNodeItemsById(rootItems);

  const affectedEdges = rootItems.filter(item => {
    if (!isEdgeItem(item)) {
      return false;
    }
    const sourceRef = item.element.getAttribute('source-ref');
    const targetRef = item.element.getAttribute('target-ref');
    return !!sourceRef && !!targetRef && (changedNodeIds.has(sourceRef) || changedNodeIds.has(targetRef));
  });

  if (!affectedEdges.length) {
    return;
  }

  let changeGroupOpened = false;
  const undoGroup = operationFinished ? instanceServiceContainer.undoService.openGroup('reroute BPMN edges') : null;
  const previewCleanup: Array<() => void> = [];

  for (const edgeItem of affectedEdges) {
    const sourceRef = edgeItem.element.getAttribute('source-ref')!;
    const targetRef = edgeItem.element.getAttribute('target-ref')!;
    const sourceItem = nodeItemsById.get(sourceRef);
    const targetItem = nodeItemsById.get(targetRef);
    if (!sourceItem || !targetItem) {
      continue;
    }

    const waypoints = routeBetweenBounds(
      getElementConnectionBounds(designerCanvas, sourceItem.element),
      getElementConnectionBounds(designerCanvas, targetItem.element)
    );
    const encoded = encodeWaypoints(waypoints);
    const edgeElement = edgeItem.element as HTMLElement & { setPreviewWaypoints?: (waypoints: string | null) => void };

    if (operationFinished) {
      edgeElement.setPreviewWaypoints?.(encoded);
      if (edgeItem.getAttribute('waypoints') !== encoded) {
        changeGroupOpened = true;
        edgeItem.setAttribute('waypoints', encoded);
      }
      previewCleanup.push(() => edgeElement.setPreviewWaypoints?.(null));
    } else {
      edgeElement.setPreviewWaypoints?.(encoded);
    }
  }

  if (undoGroup && changeGroupOpened) {
    undoGroup.commit();
  } else if (undoGroup) {
    undoGroup.abort();
  }

  if (operationFinished && previewCleanup.length) {
    queueMicrotask(() => {
      for (const clearPreview of previewCleanup) {
        clearPreview();
      }
    });
  }
}

export function primeBpmnConnectionRouting(instanceServiceContainer: InstanceServiceContainer) {
  annotationPreviewPositions.clear();
  const rootItems = collectCanvasDesignItems(instanceServiceContainer.designerCanvas.rootDesignItem);
  syncLinkedAnnotationOffsets(instanceServiceContainer, rootItems, createNodeItemsById(rootItems));
}

export function rerouteConnectedBpmnEdges(instanceServiceContainer: InstanceServiceContainer, changedItems: IDesignItem[], operationFinished: boolean) {
  const changedNodeIds = getChangedNodeIds(changedItems);

  if (!changedNodeIds.size) {
    return;
  }

  const rootItems = collectCanvasDesignItems(instanceServiceContainer.designerCanvas.rootDesignItem);
  const nodeItemsById = createNodeItemsById(rootItems);
  const movedAnnotationIds = moveLinkedAnnotations(instanceServiceContainer, rootItems, nodeItemsById, changedNodeIds, operationFinished);
  const affectedNodeIds = new Set([...changedNodeIds, ...movedAnnotationIds]);

  if (operationFinished) {
    syncLinkedAnnotationOffsets(instanceServiceContainer, rootItems, nodeItemsById, affectedNodeIds);
    queueMicrotask(() => rerouteEdgesForNodeIds(instanceServiceContainer, affectedNodeIds, true));
    return;
  }

  rerouteEdgesForNodeIds(instanceServiceContainer, affectedNodeIds, false);
}