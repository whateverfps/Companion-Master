/**
 * ============================================================================
 * Mission Companion
 * Conflict Engine
 *
 * File:
 *     ConflictGraph.js
 *
 * Build:
 *     Commit 3
 *
 * Purpose:
 *     Directed weighted graph used by the reasoning engine.
 *
 * Commit 2 adds:
 *     - Breadth-first traversal
 *     - Depth-first traversal
 *     - Reachability checks
 *     - Ancestor and descendant lookup
 *     - Shortest-path search
 *     - Directed-cycle detection
 *     - Topological sorting
 *     - Weakly connected components
 *     - Subgraph extraction
 *     - Serialization and deserialization
 *
 * Commit 3 adds:
 *     - Advanced node and edge queries
 *     - Weighted shortest-path search
 *     - Simple-path enumeration
 *     - Strongly connected components
 *     - Condensation graph generation
 *     - Influence scoring
 *     - Critical-path analysis for acyclic graphs
 *     - Graph cloning and merging
 *     - Structural integrity validation
 * ============================================================================
 */

export const NodeType = Object.freeze({
    REQUIREMENT: "requirement",
    DOCUMENT: "document",
    SECTION: "section",
    PERSON: "person",
    ROLE: "role",
    SPECIFICATION: "specification",
    DRAWING: "drawing",
    DELIVERABLE: "deliverable",
    RISK: "risk",
    QUESTION: "question",
    DECISION: "decision",
    CONFLICT: "conflict"
});

export const EdgeType = Object.freeze({
    REFERENCES: "references",
    REQUIRES: "requires",
    DEPENDS_ON: "depends_on",
    SATISFIES: "satisfies",
    CONTRADICTS: "contradicts",
    DEFINES: "defines",
    IMPLEMENTS: "implements",
    RESPONSIBLE_FOR: "responsible_for",
    PRECEDES: "precedes",
    SUPPORTS: "supports"
});

function uuid(prefix = "ID") {
    return (
        `${prefix}-` +
        Math.random().toString(36).substring(2, 12) +
        "-" +
        Date.now().toString(36)
    );
}

function assertNonEmptyString(value, name) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${name} must be a non-empty string.`);
    }
}

function clonePlainObject(value) {
    return value == null
        ? {}
        : JSON.parse(JSON.stringify(value));
}

export class ConflictNode {
    constructor(data = {}) {
        this.id = data.id || uuid("N");
        this.type = data.type || NodeType.REQUIREMENT;
        this.title = data.title || "";
        this.text = data.text || "";
        this.source = data.source || "";
        this.document = data.document || "";
        this.section = data.section || "";
        this.metadata = clonePlainObject(data.metadata);
        this.evidence = Array.isArray(data.evidence)
            ? data.evidence.map(clonePlainObject)
            : [];
    }

    addEvidence(evidence) {
        if (evidence == null || typeof evidence !== "object") {
            throw new TypeError("Evidence must be an object.");
        }

        this.evidence.push(clonePlainObject(evidence));
        return this;
    }


    findEdges(options = {}) {
        const {
            from = null,
            to = null,
            types = null,
            minimumWeight = null,
            maximumWeight = null,
            minimumConfidence = null,
            maximumConfidence = null,
            predicate = null
        } = options;

        const allowedTypes = types
            ? new Set(Array.isArray(types) ? types : [types])
            : null;

        return [...this.edges.values()].filter(edge => {
            if (from !== null && edge.from !== from) {
                return false;
            }

            if (to !== null && edge.to !== to) {
                return false;
            }

            if (allowedTypes && !allowedTypes.has(edge.type)) {
                return false;
            }

            if (
                minimumWeight !== null &&
                edge.weight < minimumWeight
            ) {
                return false;
            }

            if (
                maximumWeight !== null &&
                edge.weight > maximumWeight
            ) {
                return false;
            }

            if (
                minimumConfidence !== null &&
                edge.confidence < minimumConfidence
            ) {
                return false;
            }

            if (
                maximumConfidence !== null &&
                edge.confidence > maximumConfidence
            ) {
                return false;
            }

            if (
                typeof predicate === "function" &&
                !predicate(edge)
            ) {
                return false;
            }

            return true;
        });
    }

    findNodes(options = {}) {
        const {
            types = null,
            source = null,
            document = null,
            section = null,
            text = null,
            predicate = null
        } = options;

        const allowedTypes = types
            ? new Set(Array.isArray(types) ? types : [types])
            : null;

        const normalizedText =
            typeof text === "string"
                ? text.toLowerCase()
                : null;

        return [...this.nodes.values()].filter(node => {
            if (allowedTypes && !allowedTypes.has(node.type)) {
                return false;
            }

            if (source !== null && node.source !== source) {
                return false;
            }

            if (document !== null && node.document !== document) {
                return false;
            }

            if (section !== null && node.section !== section) {
                return false;
            }

            if (normalizedText !== null) {
                const haystack = [
                    node.title,
                    node.text,
                    node.source,
                    node.document,
                    node.section
                ]
                    .join(" ")
                    .toLowerCase();

                if (!haystack.includes(normalizedText)) {
                    return false;
                }
            }

            if (
                typeof predicate === "function" &&
                !predicate(node)
            ) {
                return false;
            }

            return true;
        });
    }

    degree(nodeId, options = {}) {
        const {
            direction = "both",
            edgeTypes = null,
            weighted = false,
            confidenceAdjusted = false
        } = options;

        if (!this.nodes.has(nodeId)) {
            return 0;
        }

        let edges;

        if (direction === "outgoing") {
            edges = this.getOutgoing(nodeId, { edgeTypes });
        } else if (direction === "incoming") {
            edges = this.getIncoming(nodeId, { edgeTypes });
        } else if (direction === "both") {
            const ids = new Set();
            edges = [];

            for (const edge of [
                ...this.getOutgoing(nodeId, { edgeTypes }),
                ...this.getIncoming(nodeId, { edgeTypes })
            ]) {
                if (!ids.has(edge.id)) {
                    ids.add(edge.id);
                    edges.push(edge);
                }
            }
        } else {
            throw new Error(`Unsupported direction: ${direction}`);
        }

        if (!weighted) {
            return edges.length;
        }

        return edges.reduce((sum, edge) => {
            const adjustment =
                confidenceAdjusted
                    ? edge.confidence
                    : 1;

            return sum + edge.weight * adjustment;
        }, 0);
    }
