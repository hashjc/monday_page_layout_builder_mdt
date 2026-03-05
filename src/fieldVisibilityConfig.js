/**
 * fieldVisibilityConfig.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable configuration for field-level visibility rules in the Page Layout.
 *
 * This module is intentionally dependency-free so it can be imported by:
 *   • Page Layout Builder (App.jsx) — to drive the rule editor UI
 *   • Super Form / Viewer app       — to evaluate rules at runtime
 *
 * JSON shape stored per field:
 *   {
 *     "visibilityRules": {
 *       "conditions": [
 *         {
 *           "id":       "vis_1",
 *           "source":   "field",          // always "field" for now
 *           "fieldId":  "boolean_mm0qxfp5",
 *           "operator": "equals",
 *           "value":    true
 *         }
 *       ],
 *       "criteria": "ALL"  // "ALL" = AND,  "ANY" = OR
 *     }
 *   }
 *
 * A field is HIDDEN when its visibilityRules evaluate to TRUE.
 * (i.e. "hide when condition is met")
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Type groups ──────────────────────────────────────────────────────────────

/** Column types that behave like numbers for comparison purposes */
export const NUMERIC_TYPES = new Set([
    "numbers", "rating", "date", "timeline",
]);

/** Column types that behave like free text / labels */
export const STRING_TYPES = new Set([
    "text", "long_text", "name", "email", "phone", "link",
    "status", "dropdown", "tags",
]);

/** Column types where only boolean equality makes sense */
export const BOOLEAN_TYPES = new Set([
    "checkbox",
]);

/** Column types where only empty/contains checks make sense */
export const RELATION_TYPES = new Set([
    "people", "board_relation", "files", "dependency",
]);

/** Everything else (formula, mirror, doc, …) — only empty checks */
export const OTHER_TYPES = new Set([
    "formula", "mirror", "doc", "files", "dependency",
]);

// ─── Operator definitions ─────────────────────────────────────────────────────

/** All available operators with human-readable labels */
export const ALL_OPERATORS = [
    { id: "is_empty",     label: "is empty",     needsValue: false },
    { id: "is_not_empty", label: "is not empty", needsValue: false },
    { id: "equals",       label: "equals",       needsValue: true  },
    { id: "not_equals",   label: "not equals",   needsValue: true  },
    { id: "contains",     label: "contains",     needsValue: true  },
    { id: "not_contains", label: "not contains", needsValue: true  },
    { id: "starts_with",  label: "starts with",  needsValue: true  },
    { id: "ends_with",    label: "ends with",    needsValue: true  },
    { id: ">",            label: ">",            needsValue: true  },
    { id: ">=",           label: ">=",           needsValue: true  },
    { id: "<",            label: "<",            needsValue: true  },
    { id: "<=",           label: "<=",           needsValue: true  },
];

const OP = (ids) => ALL_OPERATORS.filter((o) => ids.includes(o.id));

/**
 * Returns the list of applicable operators for a given column type.
 * @param {string} colType  e.g. "numbers", "status", "checkbox"
 * @returns {Array<{id, label, needsValue}>}
 */
export function getOperatorsForType(colType) {
    if (NUMERIC_TYPES.has(colType)) {
        return OP(["is_empty", "is_not_empty", "equals", "not_equals", ">", ">=", "<", "<="]);
    }
    if (STRING_TYPES.has(colType)) {
        return OP(["is_empty", "is_not_empty", "equals", "not_equals",
                   "contains", "not_contains", "starts_with", "ends_with"]);
    }
    if (BOOLEAN_TYPES.has(colType)) {
        return OP(["is_empty", "is_not_empty", "equals"]);
    }
    if (RELATION_TYPES.has(colType)) {
        return OP(["is_empty", "is_not_empty", "contains", "not_contains"]);
    }
    // Fallback: only empty checks
    return OP(["is_empty", "is_not_empty"]);
}

/**
 * Returns true if the given operator requires a value input.
 * @param {string} operatorId
 */
export function operatorNeedsValue(operatorId) {
    const op = ALL_OPERATORS.find((o) => o.id === operatorId);
    return op?.needsValue ?? true;
}

/**
 * Returns the appropriate HTML input type for the value field
 * given the source column's type.
 * @param {string} colType
 * @returns {"text"|"number"|"date"|"checkbox"}
 */
export function getValueInputType(colType) {
    if (NUMERIC_TYPES.has(colType) && colType !== "date") return "number";
    if (colType === "date") return "date";
    if (BOOLEAN_TYPES.has(colType)) return "checkbox";
    return "text";
}

// ─── Runtime evaluator (for viewer / Super Form) ──────────────────────────────

/**
 * Evaluate a single visibility condition against live field values.
 *
 * @param {Object} condition  - { operator, fieldId, value }
 * @param {Object} fieldValues - { [columnId]: rawValue }  (live form state)
 * @param {Object} columnsMap  - { [columnId]: { type, ... } }
 * @returns {boolean}  true if this condition is MET (i.e. contributes to hiding)
 */
export function evaluateCondition(condition, fieldValues, columnsMap) {
    const { operator, fieldId, value } = condition;
    const rawValue = fieldValues[fieldId];
    const colType  = columnsMap[fieldId]?.type || "text";

    // Empty / not-empty checks
    const isEmpty = rawValue === null || rawValue === undefined || rawValue === "";
    if (operator === "is_empty")     return isEmpty;
    if (operator === "is_not_empty") return !isEmpty;
    if (isEmpty) return false; // can't compare against empty for other ops

    // Numeric comparisons
    if (NUMERIC_TYPES.has(colType)) {
        const num  = parseFloat(rawValue);
        const comp = parseFloat(value);
        if (isNaN(num) || isNaN(comp)) return false;
        switch (operator) {
            case "equals":     return num === comp;
            case "not_equals": return num !== comp;
            case ">":          return num >   comp;
            case ">=":         return num >=  comp;
            case "<":          return num <   comp;
            case "<=":         return num <=  comp;
        }
    }

    // Boolean comparison
    if (BOOLEAN_TYPES.has(colType)) {
        const boolVal  = rawValue === true  || rawValue === "true"  || rawValue === 1;
        const boolComp = value    === true  || value    === "true"  || value    === "true";
        if (operator === "equals")     return boolVal === boolComp;
        if (operator === "not_equals") return boolVal !== boolComp;
    }

    // String comparisons
    const str  = String(rawValue).toLowerCase();
    const comp = String(value).toLowerCase();
    switch (operator) {
        case "equals":       return str === comp;
        case "not_equals":   return str !== comp;
        case "contains":     return str.includes(comp);
        case "not_contains": return !str.includes(comp);
        case "starts_with":  return str.startsWith(comp);
        case "ends_with":    return str.endsWith(comp);
    }

    return false;
}

/**
 * Evaluate all visibility rules for a field.
 * Returns true if the field should be HIDDEN.
 *
 * @param {{ conditions, criteria }} visibilityRules
 * @param {Object} fieldValues   - { [columnId]: rawValue }
 * @param {Object} columnsMap    - { [columnId]: { type, ... } }
 * @returns {boolean}  true = hide the field
 */
export function shouldHideField(visibilityRules, fieldValues, columnsMap) {
    if (!visibilityRules) return false;
    const { conditions = [], criteria = "ALL" } = visibilityRules;
    if (conditions.length === 0) return false;

    const results = conditions.map((c) => evaluateCondition(c, fieldValues, columnsMap));

    return criteria === "ALL"
        ? results.every(Boolean)
        : results.some(Boolean);
}