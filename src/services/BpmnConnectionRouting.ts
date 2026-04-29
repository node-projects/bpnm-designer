import type { IDesignItem, InstanceServiceContainer } from '@node-projects/web-component-designer';
import { edgeTags } from './bpmnRegistry.js';
import { encodeWaypoints, routeBetweenBounds } from './bpmnGeometry.js';

function getBpmnId(designItem: IDesignItem) {
  return designItem.element.getAttribute('bpmn-id');
}

function isEdgeItem(designItem: IDesignItem) {
  return edgeTags.has(designItem.element.localName);
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

function rerouteEdgesForNodeIds(instanceServiceContainer: InstanceServiceContainer, changedNodeIds: Set<string>, operationFinished: boolean) {
  const designerCanvas = instanceServiceContainer.designerCanvas;
  const rootItems = collectCanvasDesignItems(designerCanvas.rootDesignItem);
  const nodeItemsById = new Map(
    rootItems
      .filter(item => !isEdgeItem(item))
      .map(item => [getBpmnId(item), item] as const)
      .filter((entry): entry is [string, IDesignItem] => !!entry[0])
  );

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
      designerCanvas.getNormalizedElementCoordinates(sourceItem.element),
      designerCanvas.getNormalizedElementCoordinates(targetItem.element)
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

export function rerouteConnectedBpmnEdges(instanceServiceContainer: InstanceServiceContainer, changedItems: IDesignItem[], operationFinished: boolean) {
  const changedNodeIds = getChangedNodeIds(changedItems);

  if (!changedNodeIds.size) {
    return;
  }

  if (operationFinished) {
    queueMicrotask(() => rerouteEdgesForNodeIds(instanceServiceContainer, changedNodeIds, true));
    return;
  }

  rerouteEdgesForNodeIds(instanceServiceContainer, changedNodeIds, false);
}