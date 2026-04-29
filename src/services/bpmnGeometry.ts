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

export function getAnchor(bounds: BpmnBounds, toward: BpmnPoint): BpmnPoint {
  const center = getBoundsCenter(bounds);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { x: bounds.x + bounds.width, y: center.y } : { x: bounds.x, y: center.y };
  }
  return dy >= 0 ? { x: center.x, y: bounds.y + bounds.height } : { x: center.x, y: bounds.y };
}

export function routeBetweenPoints(start: BpmnPoint, end: BpmnPoint) {
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
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
  return routeBetweenPoints(start, end);
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