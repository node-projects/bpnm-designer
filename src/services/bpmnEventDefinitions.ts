const eventGlyphs: Record<string, string> = {
  message: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"></rect><path d="M5.5 8l6.5 5 6.5-5"></path></svg>`,
  timer: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"></circle><path d="M12 8v4.2l2.6 2.6"></path></svg>`,
  signal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5 18 17H6z"></path></svg>`,
  error: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.5 8.5 13h3.7l-1.2 6.5L16 11h-3.5z"></path></svg>`,
  conditional: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5.5" width="11" height="13" rx="1.2"></rect><path d="M9 9.5h6M9 12.5h6M9 15.5h4"></path></svg>`,
  escalation: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5 18 17H6z"></path><path d="M12 9v5"></path></svg>`,
  link: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12h8"></path><path d="M11.5 8 16 12l-4.5 4"></path></svg>`,
  terminate: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"></circle></svg>`,
  compensation: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12l5-4v8z" fill="currentColor" stroke="none"></path><path d="M13 12l5-4v8z" fill="currentColor" stroke="none"></path></svg>`
};

const eventDefinitionElementNames: Record<string, string> = {
  message: 'messageEventDefinition',
  timer: 'timerEventDefinition',
  signal: 'signalEventDefinition',
  error: 'errorEventDefinition',
  conditional: 'conditionalEventDefinition',
  escalation: 'escalationEventDefinition',
  link: 'linkEventDefinition',
  terminate: 'terminateEventDefinition',
  compensation: 'compensateEventDefinition'
};

function toKebabCase(value: string) {
  return value
    .replace(/EventDefinition$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function normalizeEventDefinition(value: string | null | undefined) {
  return value ? toKebabCase(value.trim()) : '';
}

export function getEventDefinitionGlyph(definition: string | null | undefined, fallback = '') {
  const normalized = normalizeEventDefinition(definition);
  return eventGlyphs[normalized] ?? fallback;
}

export function getEventDefinitionElementLocalName(definition: string | null | undefined) {
  const normalized = normalizeEventDefinition(definition);
  return eventDefinitionElementNames[normalized] ?? null;
}