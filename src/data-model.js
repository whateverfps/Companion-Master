export function textValue(value) {
  return value == null ? '' : String(value);
}

export function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizedText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizedKey(value) {
  return normalizedText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function firstText(...values) {
  return textValue(values.find(value =>
    value != null && textValue(value).trim() !== ''
  ));
}

export function normalizeSectionNumber(value) {
  const digits = textValue(value).replace(/\D/g, '');
  return digits.length === 6
    ? `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`
    : '';
}

export function sectionNumberKey(value) {
  return normalizeSectionNumber(value).replace(/\D/g, '');
}

export function sectionTextValue(section) {
  return firstText(
    section?.text,
    section?.content,
    section?.metadata?.text,
    section?.metadata?.content
  );
}

export function sectionHeadingValue(section, index = 0) {
  return firstText(
    section?.heading,
    section?.label,
    section?.title,
    section?.metadata?.heading,
    section?.metadata?.title,
    `Section ${Math.max(0, index) + 1}`
  );
}

export function sectionLocationValue(section) {
  return firstText(
    section?.location,
    section?.sectionLabel,
    section?.metadata?.location,
    section?.metadata?.sectionLabel
  );
}

export function sectionSourceLabelValue(section, index = 0) {
  return firstText(
    section?.sourceLabel,
    section?.source,
    section?.metadata?.sourceLabel,
    section?.metadata?.source,
    section?.heading,
    section?.label,
    section?.title,
    `Section ${Math.max(0, index) + 1}`
  );
}
