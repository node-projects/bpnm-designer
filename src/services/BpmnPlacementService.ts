import { DefaultPlacementService, IDesignItem, IDesignerCanvas } from '@node-projects/web-component-designer';
import type { IPoint } from '@node-projects/web-component-designer';
import { edgeTags } from './bpmnRegistry.js';

function isEdgeItem(item: IDesignItem | undefined | null) {
  return !!item && edgeTags.has(item.element.localName);
}

function getMovableItems(items: IDesignItem[]) {
  return items.filter(item => !isEdgeItem(item));
}

export class BpmnPlacementService extends DefaultPlacementService {
  serviceForContainer(container: IDesignItem, containerStyle: CSSStyleDeclaration, item?: IDesignItem): boolean {
    if (isEdgeItem(item)) {
      return false;
    }
    return super.serviceForContainer(container, containerStyle, item);
  }

  startPlacementAllowed(_event: MouseEvent, _designerCanvas: IDesignerCanvas, _container: IDesignItem, items: IDesignItem[]): boolean {
    const movableItems = getMovableItems(items);
    return movableItems.length > 0;
  }

  canEnter(container: IDesignItem, items: IDesignItem[]): boolean {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return false;
    }
    return super.canEnter(container, movableItems);
  }

  canLeave(container: IDesignItem, items: IDesignItem[]): boolean {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return false;
    }
    return super.canLeave(container, movableItems);
  }

  placePoint(event: MouseEvent, designerCanvas: IDesignerCanvas, container: IDesignItem, startPoint: IPoint, offsetInControl: IPoint, newPoint: IPoint, items: IDesignItem[]): IPoint {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return newPoint;
    }
    return super.placePoint(event, designerCanvas, container, startPoint, offsetInControl, newPoint, movableItems);
  }

  startPlace(event: MouseEvent, designerCanvas: IDesignerCanvas, container: IDesignItem, startPoint: IPoint, offsetInControl: IPoint, newPoint: IPoint, items: IDesignItem[]): void {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return;
    }
    super.startPlace(event, designerCanvas, container, startPoint, offsetInControl, newPoint, movableItems);
  }

  place(event: MouseEvent, designerCanvas: IDesignerCanvas, container: IDesignItem, startPoint: IPoint, offsetInControl: IPoint, newPoint: IPoint, items: IDesignItem[]): void {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return;
    }
    super.place(event, designerCanvas, container, startPoint, offsetInControl, newPoint, movableItems);
  }

  moveElements(designItems: IDesignItem[], position: IPoint, absolute: boolean): void {
    const movableItems = getMovableItems(designItems);
    if (!movableItems.length) {
      return;
    }
    super.moveElements(movableItems, position, absolute);
  }

  enterContainer(container: IDesignItem, items: IDesignItem[], mode: 'normal' | 'drop'): void {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return;
    }
    super.enterContainer(container, movableItems, mode);
  }

  leaveContainer(container: IDesignItem, items: IDesignItem[]): void {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return;
    }
    super.leaveContainer(container, movableItems);
  }

  finishPlace(event: MouseEvent, designerCanvas: IDesignerCanvas, container: IDesignItem, startPoint: IPoint, offsetInControl: IPoint, newPoint: IPoint, items: IDesignItem[]): void {
    const movableItems = getMovableItems(items);
    if (!movableItems.length) {
      return;
    }
    super.finishPlace(event, designerCanvas, container, startPoint, offsetInControl, newPoint, movableItems);
  }
}
