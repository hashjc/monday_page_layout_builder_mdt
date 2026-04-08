/**
 * lookupFiltersConfig.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Operator helpers for board_relation lookup filters.
 * Deliberately reuses ALL_OPERATORS from fieldVisibilityConfig so the operator
 * set stays consistent across visibility rules, validation rules, and lookup filters.
 *
 * Lookup filter operators follow three buckets:
 *   numeric / date columns  →  == != > >= < <=
 *   text / status / etc.    →  == != contains not_contains
 *
 * JSON shape produced per field (embedded in field's lookup_filters key):
 *   {
 *     "conditions": [
 *       {
 *         "id":       "lf_...",
 *         "boardId":  "5024227503",
 *         "source":   "field",
 *         "fieldId":  "color_mm0e1nq2",
 *         "operator": "==",
 *         "value":    "Buyer"         // null if user left blank
 *       }
 *     ],
 *     "criteria": "ALL"               // or a free-form expression like "1 AND (2 OR 3)"
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ALL_OPERATORS } from "./fieldVisibilityConfig";

// ─── Type buckets for operator selection ──────────────────────────────────────

/** Column types that get numeric comparison operators */
const LF_NUMERIC_TYPES = new Set(["numbers", "rating"]);

/** Column types that get date comparison operators */
const LF_DATE_TYPES = new Set(["date", "timeline"]);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns available operators for a given monday column type
 * in the context of lookup filter conditions.
 *
 * @param {string} colType  e.g. "numbers", "status", "text"
 * @returns {Array<{id, label, needsValue}>}
 */
export function getLookupOperatorsForType(colType) {
    if (LF_NUMERIC_TYPES.has(colType) || LF_DATE_TYPES.has(colType)) {
        return ALL_OPERATORS.filter((o) =>
            ["==", "!=", ">", ">=", "<", "<="].includes(o.id)
        );
    }
    // Text, status, dropdown, name, email, phone, link, checkbox, etc.
    return ALL_OPERATORS.filter((o) =>
        ["==", "!=", "contains", "not_contains"].includes(o.id)
    );
}

/**
 * Returns true if the given operator requires a value input in the UI.
 * Delegates to the shared ALL_OPERATORS table — no duplication.
 *
 * @param {string} operatorId
 * @returns {boolean}
 */
export function lookupOperatorNeedsValue(operatorId) {
    const op = ALL_OPERATORS.find((o) => o.id === operatorId);
    return op?.needsValue ?? true;
}

/**
 * Generates a unique condition ID for a new lookup filter condition.
 * @returns {string}
 */
export function makeLookupCondId() {
    return `lf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Validates if a board's lookup configuration is still valid.
 * If a column is missing (checked against the provided columns list),
 * the entire config for that board is ignored (Requirement 3b).
 */
export function isBoardLookupConfigValid(conditions, boardColumns) {
    if (!conditions || conditions.length === 0) return true;
    if (!boardColumns) return false;

    const validColIds = new Set(boardColumns.map(c => c.id));
    // If any condition references a non-existent column, the whole board filter is invalid
    return conditions.every(cond => validColIds.has(cond.fieldId));
}

/**
 * Validate a criteria expression string for lookup filters.
 * Same rules as section visibility / field visibility expressions.
 *
 * @param {string} expr            e.g. "1 AND (2 OR 3)"
 * @param {number} conditionCount  total number of conditions
 * @returns {{ valid: boolean, error: string }}
 */
export function validateLookupCriteria(expr, conditionCount) {
    if (!expr || !expr.trim()) {
        return { valid: false, error: "Please enter a logic expression (e.g. 1 AND 2)." };
    }
    if (!/^[\d\sANDOR()]+$/i.test(expr)) {
        return {
            valid: false,
            error: "Use condition numbers, AND, OR, and parentheses only.",
        };
    }
    const nums = expr.match(/\d+/g) || [];
    for (const n of nums) {
        const idx = parseInt(n, 10);
        if (idx < 1 || idx > conditionCount) {
            return {
                valid: false,
                error: `Condition ${n} doesn't exist. Use numbers 1–${conditionCount}.`,
            };
        }
    }
    let depth = 0;
    for (const ch of expr) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (depth < 0) return { valid: false, error: "Unbalanced parentheses." };
    }
    if (depth !== 0) return { valid: false, error: "Unbalanced parentheses." };
    return { valid: true, error: "" };
}