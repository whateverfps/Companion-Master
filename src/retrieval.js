const STOP = new Set(
  [
    'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for',
    'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'this', 'that', 'these', 'those', 'it', 'its', 'as', 'at', 'into',
    'about', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'can',
    'could', 'should', 'would', 'may', 'might', 'do', 'does', 'did'
  ]
);

const SYNONYMS = {
  definition: [
    'means',
    'defined',
    'definition',
    'refers',
    'interpretation'
  ],

  responsibility: [
    'responsible',
    'responsibility',
    'duties',
    'duty',
    'shall',
    'must',
    'obligation'
  ],

  requirement: [
    'required',
    'requirement',
    'shall',
    'must',
    'minimum',
    'mandatory'
  ],

  submit: [
    'submittal',
    'submit',
    'submission',
    'provide',
    'deliver'
  ],

  approve: [
    'approval',
    'approved',
    'acceptance',
    'accepted',
    'authorize',
    'authorized'
  ],

  inspect: [
    'inspection',
    'inspect',
    'verify',
    'verification',
    'review',
    'examine'
  ],

  schedule: [
    'scheduled',
    'scheduling',
    'timeline',
    'duration',
    'milestone',
    'completion'
  ],

  payment: [
    'pay',
    'paid',
    'compensation',
    'invoice',
    'billing',
    'reimbursement'
  ],

  contractor: [
    'vendor',
    'builder',
    'construction contractor',
    'prime contractor',
    'general contractor'
  ],

  owner: [
    'government',
    'va',
    'agency',
    'owner representative',
    'contracting officer',
    'cor'
  ],

  conflict: [
    'exception',
    'unless',
    'however',
    'notwithstanding',
    'supersede',
    'precedence',
    'discrepancy'
  ],

  closeout: [
    'turnover',
    'completion',
    'final acceptance',
    'punch list',
    'warranty',
    'record documents'
  ],

  safety: [
    'hazard',
    'protection',
    'unsafe',
    'incident',
    'osha',
    'life safety'
  ]
};

const NEGATION =
  /\b(no|not|never|shall not|must not|may not|prohibited|except|unless|without|neither)\b/i;

const REQUIREMENT =
  /\b(shall|must|required|prohibited|may not|is responsible for|will provide|will perform)\b/i;

const EXCEPTION =
  /\b(exception|except|unless|however|notwithstanding|subject to|provided that)\b/i;

const DEFINITION =
  /\b(means|defined as|definition|refers to|shall mean)\b/i;

const RESPONSIBILITY =
  /\b(responsible for|responsibility|duties include|shall provide|shall perform|must provide|must perform)\b/i;

const CROSS_REFERENCE_PATTERNS = [
  /\b(?:section|article|chapter|appendix|specification|paragraph|part)\s+[a-z0-9][a-z0-9 ._-]*/gi,
  /\b\d{2}\s+\d{2}\s+\d{2}(?:\.\d+)*\b/g,
  /\b\d+(?:\.\d+){1,5}\b/g
];

const tokens = value =>
  (
    String(value || '')
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9._/-]*/g) ||
    []
  ).filter(token =>
    token.length > 1 &&
    !STOP.has(token)
  );

const stem = token =>
  String(token || '')
    .toLowerCase()
    .replace(
      /(ingly|edly|ments|ment|ness|ations|ation|ions|ion|ities|ity|ies|ied|ing|ers|er|ed|es|s)$/,
      ''
    );

const uniq = values =>
  [...new Set(values.filter(Boolean))];

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

function normalizeReference(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value) {
  return String(value || '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrences(text, term) {
  if (!text || !term) {
    return 0;
  }

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegex(term)}(?=$|[^a-z0-9])`,
    'gi'
  );

  return [...String(text).matchAll(pattern)].length;
}

function sectionText(section) {
  return [
    section.heading || '',
    ...(section.path || []),
    section.location || '',
    section.text || ''
  ].join(' ');
}

function classifyQueryIntent(rawQuery) {
  const query = String(rawQuery || '').toLowerCase();

  const intents = [];

  if (
    /\b(define|definition|meaning|what is|what does .* mean)\b/i.test(query)
  ) {
    intents.push('definition');
  }

  if (
    /\b(who|responsib|duty|duties|role|obligation)\b/i.test(query)
  ) {
    intents.push('responsibility');
  }

  if (
    /\b(require|required|requirement|shall|must|prohibit|mandatory)\b/i.test(query)
  ) {
    intents.push('requirement');
  }

  if (
    /\b(exception|unless|conflict|precedence|supersede|contradict)\b/i.test(query)
  ) {
    intents.push('conflict');
  }

  if (
    /\b(submit|submittal|provide for approval|submission)\b/i.test(query)
  ) {
    intents.push('submittal');
  }

  if (
    /\b(inspect|inspection|verify|verification|review)\b/i.test(query)
  ) {
    intents.push('inspection');
  }

  if (
    /\b(schedule|when|duration|timeline|milestone|completion date)\b/i.test(query)
  ) {
    intents.push('schedule');
  }

  if (
    /\b(payment|invoice|paid|compensation|billing)\b/i.test(query)
  ) {
    intents.push('payment');
  }

  if (
    /\b(closeout|turnover|final acceptance|warranty|punch list)\b/i.test(query)
  ) {
    intents.push('closeout');
  }

  return intents.length
    ? intents
    : ['general'];
}

function extractReferences(value) {
  const found = [];

  for (const pattern of CROSS_REFERENCE_PATTERNS) {
    const matches = String(value || '').match(pattern) || [];

    for (const match of matches) {
      const normalized = normalizeReference(match);

      if (normalized.length >= 3) {
        found.push(normalized);
      }
    }
  }

  return uniq(found);
}

export function expandQuery(query) {
  const raw = String(query || '');
  const base = tokens(raw);
  const expanded = [];

  for (const token of base) {
    expanded.push(token, stem(token));

    for (const [root, terms] of Object.entries(SYNONYMS)) {
      const synonymTokens = terms.flatMap(tokens);

      const matchesRoot =
        token === root ||
        stem(token) === stem(root);

      const matchesSynonym = synonymTokens.some(synonym =>
        synonym === token ||
        stem(synonym) === stem(token) ||
        synonym.includes(token) ||
        token.includes(synonym)
      );

      if (matchesRoot || matchesSynonym) {
        expanded.push(
          root,
          stem(root),
          ...synonymTokens,
          ...synonymTokens.map(stem)
        );
      }
    }
  }

  const quotedPhrases = [
    ...raw.matchAll(/"([^"]+)"/g)
  ].map(match =>
    match[1].toLowerCase().trim()
  );

  const naturalPhrases = [];

  const normalizedWords = raw
    .toLowerCase()
    .replace(/[^\w./-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  for (let size = 2; size <= 4; size += 1) {
    for (
      let index = 0;
      index <= normalizedWords.length - size;
      index += 1
    ) {
      const phrase = normalizedWords
        .slice(index, index + size)
        .join(' ');

      const meaningfulTerms = tokens(phrase);

      if (meaningfulTerms.length >= 2) {
        naturalPhrases.push(phrase);
      }
    }
  }

  return {
    raw,
    base: uniq(base),
    stems: uniq(base.map(stem)),
    expanded: uniq(expanded),
    phrases: uniq([
      ...quotedPhrases,
      ...naturalPhrases
    ]),
    references: extractReferences(raw),
    intents: classifyQueryIntent(raw)
  };
}

function buildCorpusStats(sections) {
  const documentFrequency = new Map();
  let totalLength = 0;

  for (const section of sections) {
    const terms = uniq(
      tokens(sectionText(section))
        .map(stem)
    );

    totalLength += tokens(section.text || '').length;

    for (const term of terms) {
      documentFrequency.set(
        term,
        (documentFrequency.get(term) || 0) + 1
      );
    }
  }

  return {
    sectionCount: Math.max(1, sections.length),
    averageLength:
      sections.length
        ? totalLength / sections.length
        : 1,
    documentFrequency
  };
}

function inverseDocumentFrequency(term, corpus) {
  const frequency =
    corpus.documentFrequency.get(stem(term)) ||
    0;

  return Math.log(
    1 +
    (
      corpus.sectionCount -
      frequency +
      0.5
    ) /
    (
      frequency +
      0.5
    )
  );
}

function bm25Score(text, queryTerms, corpus) {
  const words = tokens(text);
  const normalizedWords = words.map(stem);
  const frequency = new Map();

  for (const word of normalizedWords) {
    frequency.set(
      word,
      (frequency.get(word) || 0) + 1
    );
  }

  const sectionLength = Math.max(1, words.length);
  const k1 = 1.35;
  const b = 0.72;

  let score = 0;

  for (const queryTerm of uniq(queryTerms.map(stem))) {
    const termFrequency =
      frequency.get(queryTerm) ||
      0;

    if (!termFrequency) {
      continue;
    }

    const idf = inverseDocumentFrequency(
      queryTerm,
      corpus
    );

    const numerator =
      termFrequency *
      (k1 + 1);

    const denominator =
      termFrequency +
      k1 *
      (
        1 -
        b +
        b *
        (
          sectionLength /
          Math.max(1, corpus.averageLength)
        )
      );

    score += idf * numerator / denominator;
  }

  return score;
}

function calculateCoverage(query, matchedTerms) {
  if (!query.base.length) {
    return 0;
  }

  const matchedStems = new Set(
    matchedTerms
      .flatMap(tokens)
      .map(stem)
  );

  const covered = query.base.filter(term =>
    matchedStems.has(stem(term))
  ).length;

  return covered / query.base.length;
}

function intentScore(combinedText, query) {
  let score = 0;
  const matchedIntents = [];

  for (const intent of query.intents) {
    if (
      intent === 'definition' &&
      DEFINITION.test(combinedText)
    ) {
      score += 12;
      matchedIntents.push(intent);
    }

    if (
      intent === 'responsibility' &&
      RESPONSIBILITY.test(combinedText)
    ) {
      score += 12;
      matchedIntents.push(intent);
    }

    if (
      intent === 'requirement' &&
      REQUIREMENT.test(combinedText)
    ) {
      score += 10;
      matchedIntents.push(intent);
    }

    if (
      intent === 'conflict' &&
      EXCEPTION.test(combinedText)
    ) {
      score += 11;
      matchedIntents.push(intent);
    }

    if (
      intent === 'submittal' &&
      /\b(submit|submittal|submission|provide for approval)\b/i.test(
        combinedText
      )
    ) {
      score += 9;
      matchedIntents.push(intent);
    }

    if (
      intent === 'inspection' &&
      /\b(inspect|inspection|verify|verification|review)\b/i.test(
        combinedText
      )
    ) {
      score += 9;
      matchedIntents.push(intent);
    }

    if (
      intent === 'schedule' &&
      /\b(schedule|scheduled|duration|timeline|milestone|completion)\b/i.test(
        combinedText
      )
    ) {
      score += 8;
      matchedIntents.push(intent);
    }

    if (
      intent === 'payment' &&
      /\b(payment|invoice|billing|compensation|paid)\b/i.test(
        combinedText
      )
    ) {
      score += 8;
      matchedIntents.push(intent);
    }

    if (
      intent === 'closeout' &&
      /\b(closeout|turnover|final acceptance|warranty|punch list|record documents)\b/i.test(
        combinedText
      )
    ) {
      score += 8;
      matchedIntents.push(intent);
    }
  }

  return {
    score,
    matchedIntents: uniq(matchedIntents)
  };
}

function scoreSection(section, query, corpus) {
  const heading = String(section.heading || '').toLowerCase();
  const path = (section.path || []).join(' ').toLowerCase();
  const location = String(section.location || '').toLowerCase();
  const text = String(section.text || '').toLowerCase();

  const headingTokens = new Set(
    tokens(heading).map(stem)
  );

  const pathTokens = new Set(
    tokens(path).map(stem)
  );

  const textTokens = new Set(
    tokens(text).map(stem)
  );

  let lexical = 0;
  let headingScore = 0;
  let pathScore = 0;
  let phraseScore = 0;
  let referenceScore = 0;
  let exactTermScore = 0;

  const matchedTerms = [];
  const matchedReferences = [];
  const matchedPhrases = [];

  for (const term of query.expanded) {
    const normalizedTerm = term.toLowerCase();
    const termStem = stem(normalizedTerm);
    let matched = false;

    if (
      headingTokens.has(termStem) ||
      heading.includes(normalizedTerm)
    ) {
      headingScore += 15;
      matched = true;
    }

    if (
      pathTokens.has(termStem) ||
      path.includes(normalizedTerm)
    ) {
      pathScore += 9;
      matched = true;
    }

    if (
      textTokens.has(termStem)
    ) {
      const frequency = countOccurrences(
        text,
        normalizedTerm
      );

      lexical +=
        3.5 +
        Math.min(6, frequency * 1.25);

      matched = true;
    } else if (
      normalizedTerm.length >= 4 &&
      text.includes(normalizedTerm)
    ) {
      lexical += 1.5;
      matched = true;
    }

    if (
      query.base.includes(normalizedTerm) &&
      (
        heading.includes(normalizedTerm) ||
        path.includes(normalizedTerm) ||
        text.includes(normalizedTerm)
      )
    ) {
      exactTermScore += 2.5;
    }

    if (matched) {
      matchedTerms.push(normalizedTerm);
    }
  }

  for (const phrase of query.phrases) {
    if (phrase.length < 5) {
      continue;
    }

    if (heading.includes(phrase)) {
      phraseScore += 28;
      matchedPhrases.push(phrase);
      continue;
    }

    if (path.includes(phrase)) {
      phraseScore += 22;
      matchedPhrases.push(phrase);
      continue;
    }

    if (text.includes(phrase)) {
      phraseScore +=
        phrase.split(/\s+/).length >= 3
          ? 18
          : 11;

      matchedPhrases.push(phrase);
    }
  }

  for (const reference of query.references) {
    const normalizedReference =
      normalizeReference(reference);

    if (
      heading.includes(normalizedReference) ||
      path.includes(normalizedReference) ||
      location.includes(normalizedReference)
    ) {
      referenceScore += 40;
      matchedReferences.push(reference);
      continue;
    }

    if (text.includes(normalizedReference)) {
      referenceScore += 22;
      matchedReferences.push(reference);
    }
  }

  const coverage = calculateCoverage(
    query,
    matchedTerms
  );

  const combined = `${heading} ${path} ${text}`;

  const intent = intentScore(
    combined,
    query
  );

  const bm25 = bm25Score(
    `${heading} ${heading} ${path} ${text}`,
    [
      ...query.base,
      ...query.expanded
    ],
    corpus
  );

  const crossReferences = extractReferences(
    `${heading} ${text}`
  );

  const hierarchyBonus =
    section.level === 1
      ? 4
      : section.level === 2
        ? 3
        : section.level === 3
          ? 1.5
          : 0;

  const requirementBonus =
    REQUIREMENT.test(text)
      ? 3
      : 0;

  const exceptionBonus =
    EXCEPTION.test(text) &&
    query.intents.includes('conflict')
      ? 4
      : 0;

  const length = Math.max(
    1,
    text.length
  );

  const specificity = clamp(
    1 -
    Math.log10(
      Math.max(100, length)
    ) / 18,
    0.68,
    0.95
  );

  const coverageMultiplier =
    0.48 +
    coverage * 0.52;

  const rawScore =
    lexical +
    headingScore +
    pathScore +
    phraseScore +
    referenceScore +
    exactTermScore +
    intent.score +
    bm25 * 6 +
    hierarchyBonus +
    requirementBonus +
    exceptionBonus;

  const score =
    rawScore *
    coverageMultiplier *
    specificity;

  return {
    score,

    components: {
      lexical: roundScore(lexical),
      bm25: roundScore(bm25 * 6),
      heading: roundScore(headingScore),
      path: roundScore(pathScore),
      phrase: roundScore(phraseScore),
      reference: roundScore(referenceScore),
      exactTerm: roundScore(exactTermScore),
      intent: roundScore(intent.score),
      hierarchy: roundScore(hierarchyBonus),
      coverage: Math.round(coverage * 100)
    },

    matchedTerms: uniq(
      matchedTerms
    ).slice(0, 15),

    matchedPhrases: uniq(
      matchedPhrases
    ).slice(0, 8),

    matchedReferences: uniq(
      matchedReferences
    ).slice(0, 8),

    matchedIntents: intent.matchedIntents,

    crossReferences
  };
}

function roundScore(value) {
  return Math.round(
    Number(value || 0) * 10
  ) / 10;
}

function rerank(rows, topK) {
  const selected = [];
  const remaining = [...rows];

  const documentCounts = new Map();
  const headingCounts = new Map();

  while (
    remaining.length &&
    selected.length < topK
  ) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (
      let index = 0;
      index < remaining.length;
      index += 1
    ) {
      const row = remaining[index];

      const documentCount =
        documentCounts.get(row.documentId) ||
        0;

      const normalizedHeading = String(
        row.heading ||
        ''
      )
        .toLowerCase()
        .trim();

      const headingCount =
        headingCounts.get(normalizedHeading) ||
        0;

      let rerankScore = row.score;

      if (
        row.components.coverage >= 80
      ) {
        rerankScore += 10;
      } else if (
        row.components.coverage >= 60
      ) {
        rerankScore += 6;
      }

      if (
        row.matchedReferences?.length
      ) {
        rerankScore += 5;
      }

      if (
        row.matchedPhrases?.length
      ) {
        rerankScore += 4;
      }

      if (
        row.matchedIntents?.length
      ) {
        rerankScore += 3;
      }

      if (
        row.level <= 2
      ) {
        rerankScore += 2;
      }

      if (
        documentCount >= 2
      ) {
        rerankScore -=
          Math.min(
            16,
            documentCount * 4
          );
      }

      if (
        headingCount >= 1 &&
        normalizedHeading
      ) {
        rerankScore -=
          Math.min(
            10,
            headingCount * 4
          );
      }

      const sameDocumentNearDuplicate =
        selected.some(existing =>
          existing.documentId === row.documentId &&
          textSimilarity(
            existing.text,
            row.text
          ) > 0.78
        );

      if (sameDocumentNearDuplicate) {
        rerankScore -= 14;
      }

      if (rerankScore > bestScore) {
        bestScore = rerankScore;
        bestIndex = index;
      }
    }

    const chosen = remaining.splice(
      bestIndex,
      1
    )[0];

    selected.push({
      ...chosen,
      rerankScore: bestScore
    });

    documentCounts.set(
      chosen.documentId,
      (
        documentCounts.get(chosen.documentId) ||
        0
      ) + 1
    );

    const normalizedHeading = String(
      chosen.heading ||
      ''
    )
      .toLowerCase()
      .trim();

    headingCounts.set(
      normalizedHeading,
      (
        headingCounts.get(normalizedHeading) ||
        0
      ) + 1
    );
  }

  return selected.sort((a, b) =>
    b.rerankScore - a.rerankScore ||
    b.score - a.score
  );
}

function textSimilarity(first, second) {
  const firstTerms = new Set(
    tokens(first).map(stem)
  );

  const secondTerms = new Set(
    tokens(second).map(stem)
  );

  if (
    !firstTerms.size ||
    !secondTerms.size
  ) {
    return 0;
  }

  const intersection = [
    ...firstTerms
  ].filter(term =>
    secondTerms.has(term)
  ).length;

  const union = new Set([
    ...firstTerms,
    ...secondTerms
  ]).size;

  return intersection / Math.max(1, union);
}

function requirementPolarity(text) {
  const value = String(text || '');

  if (
    /\b(shall not|must not|may not|is prohibited|are prohibited|not permitted)\b/i.test(
      value
    )
  ) {
    return 'negative';
  }

  if (
    /\b(shall|must|required|is responsible for|will provide|will perform)\b/i.test(
      value
    )
  ) {
    return 'positive';
  }

  return 'neutral';
}

function sharedRequirementTerms(first, second) {
  const firstTerms = new Set(
    tokens(first)
      .map(stem)
      .filter(term =>
        term.length >= 4
      )
  );

  const secondTerms = new Set(
    tokens(second)
      .map(stem)
      .filter(term =>
        term.length >= 4
      )
  );

  return [
    ...firstTerms
  ].filter(term =>
    secondTerms.has(term)
  );
}

export function detectConflicts(hits) {
  const conflicts = [];

  for (
    let firstIndex = 0;
    firstIndex < hits.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < hits.length;
      secondIndex += 1
    ) {
      const first = hits[firstIndex];
      const second = hits[secondIndex];

      if (
        first.documentId === second.documentId
      ) {
        continue;
      }

      const firstCombined = `
        ${first.heading || ''}
        ${first.text || ''}
      `;

      const secondCombined = `
        ${second.heading || ''}
        ${second.text || ''}
      `;

      const firstPolarity =
        requirementPolarity(firstCombined);

      const secondPolarity =
        requirementPolarity(secondCombined);

      if (
        firstPolarity === 'neutral' ||
        secondPolarity === 'neutral'
      ) {
        continue;
      }

      const sharedTerms = sharedRequirementTerms(
        firstCombined,
        secondCombined
      );

      const similarity = textSimilarity(
        firstCombined,
        secondCombined
      );

      const opposingPolarity =
        firstPolarity !== secondPolarity;

      const exceptionDifference =
        EXCEPTION.test(firstCombined) !==
        EXCEPTION.test(secondCombined);

      const enoughSharedContext =
        sharedTerms.length >= 3 ||
        similarity >= 0.2;

      if (
        enoughSharedContext &&
        (
          opposingPolarity ||
          exceptionDifference
        )
      ) {
        const confidence = clamp(
          Math.round(
            45 +
            similarity * 100 +
            Math.min(
              20,
              sharedTerms.length * 3
            )
          ),
          50,
          95
        );

        conflicts.push({
          sourceA: first.sourceNumber,
          sourceB: second.sourceNumber,

          documents: [
            first.documentName,
            second.documentName
          ],

          reason: opposingPolarity
            ? 'Potentially opposing requirement language'
            : 'One source appears to contain an exception or qualification absent from the other',

          confidence,

          sharedTerms: sharedTerms.slice(0, 10)
        });
      }
    }
  }

  return conflicts
    .sort((a, b) =>
      b.confidence - a.confidence
    )
    .slice(0, 6);
}

function buildHierarchyNeighbors(
  selectedHits,
  allSections
) {
  const selectedIds = new Set(
    selectedHits.map(hit => hit.id)
  );

  const neighbors = [];

  for (const hit of selectedHits) {
    const sameDocument = allSections
      .filter(section =>
        section.documentId === hit.documentId
      )
      .sort((a, b) =>
        a.order - b.order
      );

    const index = sameDocument.findIndex(
      section =>
        section.id === hit.id
    );

    if (index === -1) {
      continue;
    }

    const candidates = [
      sameDocument[index - 1],
      sameDocument[index + 1]
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (
        selectedIds.has(candidate.id)
      ) {
        continue;
      }

      const hitPath = (
        hit.path ||
        []
      ).join(' > ');

      const candidatePath = (
        candidate.path ||
        []
      ).join(' > ');

      const sameHierarchy =
        hitPath &&
        candidatePath &&
        (
          hitPath.startsWith(candidatePath) ||
          candidatePath.startsWith(hitPath) ||
          hitPath
            .split(' > ')
            .slice(0, -1)
            .join(' > ') ===
          candidatePath
            .split(' > ')
            .slice(0, -1)
            .join(' > ')
        );

      if (sameHierarchy) {
        neighbors.push({
          ...candidate,
          hierarchyNeighborOf: hit.id
        });
      }
    }
  }

  return neighbors;
}

export function retrieve(
  query,
  sections,
  topK = 10
) {
  const safeSections = Array.isArray(sections)
    ? sections
    : [];

  const safeTopK = clamp(
    Number(topK) || 10,
    1,
    50
  );

  const expandedQuery = expandQuery(query);
  const corpus = buildCorpusStats(safeSections);

  const scored = safeSections
    .map(section => ({
      ...section,
      ...scoreSection(
        section,
        expandedQuery,
        corpus
      )
    }))
    .filter(section =>
      section.score > 0
    )
    .sort((first, second) =>
      second.score - first.score
    )
    .slice(
      0,
      Math.max(
        safeTopK * 8,
        50
      )
    );

  const ranked = rerank(
    scored,
    safeTopK
  );

  const hierarchyNeighbors =
    buildHierarchyNeighbors(
      ranked,
      safeSections
    );

  const finalized = ranked.map(
    (section, index) => ({
      ...section,
      score: roundScore(
        section.rerankScore
      ),
      sourceNumber: index + 1
    })
  );

  const conflicts = detectConflicts(
    finalized
  );

  return Object.assign(
    finalized,
    {
      meta: {
        queryExpansion: expandedQuery,
        conflicts,
        totalCandidates: scored.length,
        totalSectionsSearched: safeSections.length,
        hierarchyNeighbors,
        retrievalVersion: '2.0'
      }
    }
  );
}

export function buildContext(hits) {
  const safeHits = Array.isArray(hits)
    ? hits
    : [];

  const conflictNote =
    hits?.meta?.conflicts?.length
      ? `
POTENTIAL SOURCE CONFLICTS:
${hits.meta.conflicts
  .map(conflict =>
    `[S${conflict.sourceA}] may conflict with [S${conflict.sourceB}]: ${conflict.reason} (${conflict.confidence}% confidence)`
  )
  .join('\n')}
`
      : '';

  const sourceContext = safeHits
    .map(hit => {
      const crossReferences =
        hit.crossReferences?.length
          ? hit.crossReferences.join(', ')
          : 'None detected';

      const matched =
        [
          ...(hit.matchedTerms || []),
          ...(hit.matchedPhrases || []),
          ...(hit.matchedReferences || [])
        ].join(', ') ||
        'general relevance';

      return `[S${hit.sourceNumber}]
DOCUMENT: ${hit.documentName || 'Unknown document'}
SECTION: ${hit.heading || 'Unheaded section'}
PATH: ${(hit.path || []).join(' > ') || 'Not specified'}
LOCATION: ${hit.location || 'Not specified'}
LEVEL: ${hit.level || 1}
MATCHED INTENT: ${(hit.matchedIntents || []).join(', ') || 'general'}
RETRIEVAL TERMS: ${matched}
CROSS-REFERENCES: ${crossReferences}
RETRIEVAL SCORE: ${hit.score}
COVERAGE: ${hit.components?.coverage ?? 0}%

${hit.text || ''}`;
    })
    .join('\n\n---\n\n');

  return `${sourceContext}${conflictNote}`;
}

function splitMaterialClaims(answer) {
  return String(answer || '')
    .split(
      /(?<=[.!?])\s+|\n(?=[A-Z0-9#*-])/
    )
    .map(sentence =>
      sentence.trim()
    )
    .filter(sentence =>
      sentence.length > 20
    );
}

function isMaterialClaim(sentence) {
  const value = String(sentence || '');

  if (
    /^#{1,6}\s/.test(value) ||
    /^evidence gaps:?$/i.test(value) ||
    /^question:/i.test(value) ||
    /^document:/i.test(value) ||
    /^location:/i.test(value)
  ) {
    return false;
  }

  return (
    REQUIREMENT.test(value) ||
    DEFINITION.test(value) ||
    RESPONSIBILITY.test(value) ||
    /\b(is|are|was|were|means|defined|requires|requires that|indicates|states|provides|permits|allows)\b/i.test(
      value
    )
  );
}

export function verifyCitations(
  answer,
  hits
) {
  const safeHits = Array.isArray(hits)
    ? hits
    : [];

  const validSources = new Set(
    safeHits.map(hit =>
      hit.sourceNumber
    )
  );

  const cited = [
    ...String(answer || '')
      .matchAll(/\[S(\d+)\]/g)
  ].map(match =>
    Number(match[1])
  );

  const invalid = uniq(
    cited.filter(sourceNumber =>
      !validSources.has(sourceNumber)
    )
  );

  const used = uniq(
    cited.filter(sourceNumber =>
      validSources.has(sourceNumber)
    )
  );

  const sentences = splitMaterialClaims(
    answer
  );

  const materialClaims = sentences.filter(
    isMaterialClaim
  );

  const uncited = materialClaims.filter(
    sentence =>
      !/\[S\d+\]/.test(sentence)
  );

  const citationSupport = used.map(
    sourceNumber => {
      const hit = safeHits.find(
        source =>
          source.sourceNumber === sourceNumber
      );

      return {
        sourceNumber,
        documentName:
          hit?.documentName ||
          null,
        heading:
          hit?.heading ||
          null
      };
    }
  );

  const coverage =
    materialClaims.length
      ? Math.round(
          (
            materialClaims.length -
            uncited.length
          ) /
          materialClaims.length *
          100
        )
      : 100;

  return {
    used,
    invalid,
    uncited,
    materialClaims:
      materialClaims.length,
    coverage,
    citationSupport,
    passed:
      invalid.length === 0 &&
      uncited.length === 0
  };
}

export function scoreAnswer(
  answer,
  evaluation,
  hits
) {
  const lowerAnswer = String(
    answer ||
    ''
  ).toLowerCase();

  const requiredFacts = String(
    evaluation.requiredFacts ||
    ''
  )
    .split('\n')
    .map(value =>
      value.trim()
    )
    .filter(Boolean);

  const prohibited = String(
    evaluation.prohibited ||
    ''
  )
    .split('\n')
    .map(value =>
      value.trim()
    )
    .filter(Boolean);

  const factHits = requiredFacts.filter(
    fact =>
      lowerAnswer.includes(
        fact.toLowerCase()
      )
  );

  const prohibitedHits = prohibited.filter(
    phrase =>
      lowerAnswer.includes(
        phrase.toLowerCase()
      )
  );

  const verification = verifyCitations(
    answer,
    hits
  );

  const expectedSource = String(
    evaluation.expectedSource ||
    ''
  )
    .toLowerCase()
    .trim();

  const sourceMatch = expectedSource
    ? hits.some(hit =>
        `
          ${hit.documentName || ''}
          ${hit.heading || ''}
          ${(hit.path || []).join(' ')}
          ${hit.location || ''}
        `
          .toLowerCase()
          .includes(expectedSource)
      )
    : true;

  const factScore = requiredFacts.length
    ? factHits.length /
      requiredFacts.length *
      50
    : 50;

  const citationScore =
    Math.min(
      verification.used.length,
      3
    ) * 7;

  const sourceScore =
    sourceMatch
      ? 12
      : 0;

  const verificationScore =
    verification.passed
      ? 12
      : Math.max(
          0,
          12 -
          verification.uncited.length * 3 -
          verification.invalid.length * 5
        );

  const conflictAwareness =
    hits.meta?.conflicts?.length
      ? /\b(conflict|exception|inconsisten|contradict|review)\b/i.test(
          answer
        )
        ? 5
        : 0
      : 5;

  const penalties =
    prohibitedHits.length * 20 +
    verification.invalid.length * 10;

  const score = clamp(
    Math.round(
      factScore +
      citationScore +
      sourceScore +
      verificationScore +
      conflictAwareness -
      penalties
    ),
    0,
    100
  );

  return {
    score,
    factHits,
    missingFacts: requiredFacts.filter(
      fact =>
        !factHits.includes(fact)
    ),
    prohibitedHits,
    citations:
      verification.used.length,
    sourceMatch,
    answer,
    hits,
    citationVerification:
      verification,
    conflicts:
      hits.meta?.conflicts ||
      []
  };
}
