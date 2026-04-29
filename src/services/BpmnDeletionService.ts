import { DeletionService, IDesignItem } from '@node-projects/web-component-designer';
import { edgeTags } from './bpmnRegistry.js';

function collectItems(roots: IDesignItem[]) {
  const all: IDesignItem[] = [];
  const stack = [...roots];
  while (stack.length) {
    const item = stack.pop()!;
    all.push(item);
    stack.push(...item.children());
  }
  return all;
}

function getBpmnId(item: IDesignItem) {
  return item.element.getAttribute('bpmn-id');
}

export class BpmnDeletionService extends DeletionService {
  override removeItems(items: IDesignItem[]) {
    if (!items.length) {
      return;
    }

    const selectedAndDescendants = collectItems(items);
    const deletedIds = new Set(
      selectedAndDescendants
        .map(item => getBpmnId(item))
        .filter((id): id is string => !!id)
    );

    const rootItems = Array.from(items[0].instanceServiceContainer.designerCanvas.rootDesignItem.children());
    const allCanvasItems = collectItems(rootItems);

    const connectedEdges = allCanvasItems.filter(item => {
      if (!edgeTags.has(item.element.localName)) {
        return false;
      }

      const sourceRef = item.element.getAttribute('source-ref');
      const targetRef = item.element.getAttribute('target-ref');
      return !!sourceRef && !!targetRef && (deletedIds.has(sourceRef) || deletedIds.has(targetRef));
    });

    const finalItems = Array.from(new Set([...selectedAndDescendants, ...connectedEdges]));
    super.removeItems(finalItems);
  }
}
