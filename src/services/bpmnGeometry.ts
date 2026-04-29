export type BpmnPoint = {
  x: number;
  y: number;
};

export type BpmnBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BpmnAnchorSide = 'left' | 'right' | 'top' | 'bottom';

export type BpmnAnchorPoint = BpmnPoint & {
  side: BpmnAnchorSide;
};

type ConnectionBoundsProvider = HTMLElement & {
  getConnectionBounds?: () => Partial<BpmnBounds> | null | undefined;
};

type NormalizedBoundsProvider = {
  getNormalizedElementCoordinates: (element: Element) => BpmnBounds;
};

export function formatNumber(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toString();
}

export function normalizeWaypoints(waypoints: BpmnPoint[]) {
  return waypoints.filter((point, index) => {
    const previous = waypoints[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
}

export function encodeWaypoints(waypoints: BpmnPoint[]) {
  return normalizeWaypoints(waypoints).map(point => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(' ');
}

export function decodeWaypoints(value: string | null | undefined) {
  if (!value) {
    return [] as BpmnPoint[];
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(segment => {
      const [x, y] = segment.split(',').map(part => Number.parseFloat(part));
      return { x, y };
    })
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
}

export function getBoundsCenter(bounds: BpmnBounds): BpmnPoint {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHorizontalSide(side: BpmnAnchorSide) {
  return side === 'left' || side === 'right';
}

function getLocalConnectionBounds(element?: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const providedBounds = (element as ConnectionBoundsProvider).getConnectionBounds?.();
  if (!providedBounds) {
    return null;
  }

  const x = Number.isFinite(providedBounds.x) ? providedBounds.x! : 0;
  const y = Number.isFinite(providedBounds.y) ? providedBounds.y! : 0;
  const width = Number.isFinite(providedBounds.width) ? providedBounds.width! : element.offsetWidth;
  const height = Number.isFinite(providedBounds.height) ? providedBounds.height! : element.offsetHeight;
  return { x, y, width, height };
}

export function getElementConnectionBoundsFromHostBounds(hostBounds: BpmnBounds, element?: Element | null): BpmnBounds {
  const localBounds = getLocalConnectionBounds(element);
  if (!localBounds) {
    return hostBounds;
  }

  const x = clamp(localBounds.x, 0, hostBounds.width);
  const y = clamp(localBounds.y, 0, hostBounds.height);
  const width = clamp(localBounds.width, 1, Math.max(1, hostBounds.width - x));
  const height = clamp(localBounds.height, 1, Math.max(1, hostBounds.height - y));
  return {
    x: hostBounds.x + x,
    y: hostBounds.y + y,
    width,
    height
  };
}

export function getElementConnectionBounds(designerCanvas: NormalizedBoundsProvider, element: Element): BpmnBounds {
  return getElementConnectionBoundsFromHostBounds(designerCanvas.getNormalizedElementCoordinates(element), element);
}

export function getAnchor(bounds: BpmnBounds, toward: BpmnPoint): BpmnAnchorPoint {
  const center = getBoundsCenter(bounds);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { x: bounds.x + bounds.width, y: center.y, side: 'right' }
      : { x: bounds.x, y: center.y, side: 'left' };
  }
  return dy >= 0
    ? { x: center.x, y: bounds.y + bounds.height, side: 'bottom' }
    : { x: center.x, y: bounds.y, side: 'top' };
}

export function routeBetweenPoints(start: BpmnPoint, end: BpmnPoint, preferredOrientation?: 'horizontal' | 'vertical') {
  const horizontal = preferredOrientation
    ? preferredOrientation === 'horizontal'
    : Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  if (horizontal) {
    const midX = (start.x + end.x) / 2;
    return normalizeWaypoints([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]);
  }
  const midY = (start.y + end.y) / 2;
  return normalizeWaypoints([start, { x: start.x, y: midY }, { x: end.x, y: midY }, end]);
}

export function routeBetweenBounds(sourceBounds: BpmnBounds, targetBounds: BpmnBounds) {
  const sourceCenter = getBoundsCenter(sourceBounds);
  const targetCenter = getBoundsCenter(targetBounds);
  const start = getAnchor(sourceBounds, targetCenter);
  const end = getAnchor(targetBounds, sourceCenter);
  const preferredOrientation = isHorizontalSide(start.side) && isHorizontalSide(end.side)
    ? 'horizontal'
    : !isHorizontalSide(start.side) && !isHorizontalSide(end.side)
      ? 'vertical'
      : isHorizontalSide(end.side)
        ? 'horizontal'
        : 'vertical';
  return routeBetweenPoints(start, end, preferredOrientation);
}

export function pathDataFromWaypoints(waypoints: BpmnPoint[]) {
  return normalizeWaypoints(waypoints).map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function boundsFromWaypoints(waypoints: BpmnPoint[]): BpmnBounds {
  const minX = Math.min(...waypoints.map(point => point.x));
  const minY = Math.min(...waypoints.map(point => point.y));
  const maxX = Math.max(...waypoints.map(point => point.x));
  const maxY = Math.max(...waypoints.map(point => point.y));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

export function isPointInsideBounds(point: BpmnPoint, bounds: BpmnBounds, padding = 0) {
  return point.x >= bounds.x - padding && point.x <= bounds.x + bounds.width + padding && point.y >= bounds.y - padding && point.y <= bounds.y + bounds.height + padding;
}