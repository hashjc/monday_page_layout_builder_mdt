/**
 * fieldValidityConfig.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuration for field-level VALIDITY rules in the Page Layout.
 *
 * Validity rules define constraints a field's value must satisfy — e.g.
 * "number must be >= 6", "email must end with @company.com".
 * They are evaluated at form-submit time (and optionally on blur).
 *
 * This module is intentionally dependency-free so it can be imported by:
 *   • Page Layout Builder (App.jsx) — to drive the rule editor UI
 *   • Super Form / Viewer app       — to evaluate rules at runtime
 *
 * We deliberately RE-USE the operator infrastructure from fieldVisibilityConfig
 * (ALL_OPERATORS, NUMERIC_TYPES, BOOLEAN_TYPES, etc.) rather than duplicating
 * it. Validity rules diverge only in:
 *   • Which types are supported (narrower list — no people/board_relation/files)
 *   • Which operators are available per type (tailored overrides below)
 *   • The self-referencing default (fieldId defaults to the field itself)
 *   • Value extraction for email / phone / link (label vs. actual value)
 *
 * JSON shape stored per field (embedded in field JSON at save time):
 *   {
 *     "validityRules": {
 *       "conditions": [
 *         {
 *           "id":       "val_1",
 *           "source":   "field",
 *           "fieldId":  "numeric_mm0929rz",   // may be the field itself
 *           "operator": ">=",
 *           "value":    "6"
 *         }
 *       ],
 *       "criteria": "1 AND 2"   // same free-form expression as visibilityRules
 *     }
 *   }
 *
 * A field FAILS validation when its validityRules evaluate to FALSE.
 * i.e. all conditions in the expression must be TRUE for the field to pass.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Re-export shared operator infrastructure ─────────────────────────────────
// The full ALL_OPERATORS list and type sets live in fieldVisibilityConfig.js.
// We re-export what the modal UI needs so it only has to import from one place.
export {
    operatorNeedsValue,
    getValueInputType,
    NUMERIC_TYPES,
    STRING_TYPES,
    BOOLEAN_TYPES,
} from "./fieldVisibilityConfig";

// ─── Column types that support validity rules ─────────────────────────────────
// Narrower than visibility — we skip people, board_relation, files, formula,
// mirror, doc, tags, timeline, dependency, rating, checkbox.
export const VALIDITY_SUPPORTED_TYPES = new Set([
    "numbers",
    "text",
    "long_text",
    "email",
    "phone",
    "link",       // monday type for URL columns
    "date",
]);

/**
 * Returns true if a column type supports validity rules.
 * Used by LayoutField to decide whether to render the validity button.
 */
export function supportsValidityRules(colType) {
    return VALIDITY_SUPPORTED_TYPES.has(colType);
}

// ─── Operator sets per type (validity-specific overrides) ─────────────────────
// We pull from the shared ALL_OPERATORS pool — no duplication of operator defs.

const OP = (ids) => ALL_OPERATORS.filter((o) => ids.includes(o.id));

/**
 * Returns the list of applicable operators for a given column type
 * in the context of VALIDITY rules.
 *
 * Leave the value input blank to compare against an empty field:
 *   "==" + blank  → field must be empty
 *   "!=" + blank  → field must not be empty
 *
 * Type-specific notes:
 *   • numbers / date  — comparison operators only
 *   • email           — == / != + ends_with (domain enforcement)
 *   • phone           — == / != only
 *   • link            — starts_with + contains + == / !=
 *   • text/long_text  — full string set
 */
export function getValidityOperatorsForType(colType) {
    switch (colType) {
        case "numbers":
            return OP(["==", "!=", ">", ">=", "<", "<="]);

        case "date":
            return OP(["==", "!=", ">", ">=", "<", "<="]);

        case "text":
        case "long_text":
            return OP(["==", "!=", "contains", "not_contains", "starts_with", "ends_with"]);

        case "email":
            return OP(["==", "!=", "ends_with"]);

        case "phone":
            return OP(["==", "!="]);

        case "link":
            return OP(["==", "!=", "starts_with", "contains"]);

        default:
            return OP(["==", "!="]);
    }
}

/**
 * Returns the appropriate HTML input type for the value input
 * in a validity rule condition, given the source column type.
 *
 * Mirrors getValueInputType from fieldVisibilityConfig but date returns "date"
 * explicitly (same behaviour, kept here for clarity).
 */
export function getValidityValueInputType(colType) {
    if (colType === "numbers") return "number";
    if (colType === "date")    return "date";
    return "text";
}

// ─── Value extraction for compound column types ───────────────────────────────
// email / phone / link store { value, label } pairs. Validity rules apply to
// the actual value (email address, phone number, URL) — not the display label.

/**
 * Extract the comparable value from a raw column value.
 * Used by both the runtime evaluator (fieldValidation.js) and any UI preview.
 *
 * @param {*}      rawValue  Raw value from formData
 * @param {string} colType   Monday column type
 * @returns {string|number|boolean|null}
 */
export function extractValidityValue(rawValue, colType) {
    if (rawValue === null || rawValue === undefined) return "";

    switch (colType) {
        case "email":
            // Stored as { email: "x@y.com", text: "display" }
            // or as a plain string when set programmatically
            if (typeof rawValue === "object") return rawValue.email || rawValue.text || "";
            return String(rawValue);

        case "phone":
            // Stored as { phone: "1234567890", countryShortName: "US" }
            if (typeof rawValue === "object") return rawValue.phone || "";
            return String(rawValue);

        case "link":
            // Stored as { url: "https://...", text: "label" }
            if (typeof rawValue === "object") return rawValue.url || rawValue.text || "";
            return String(rawValue);

        default:
            return rawValue;
    }
}

// ─── Runtime evaluator ────────────────────────────────────────────────────────

/**
 * Evaluate a single validity condition against a live field value.
 *
 * @param {Object} condition   - { operator, fieldId, value }
 * @param {Object} fieldValues - { [columnId]: rawValue }  (live form state)
 * @param {Object} columnsMap  - { [columnId]: { type, ... } }
 * @returns {boolean}  true if this condition PASSES (value is valid per this rule)
 */
export function evaluateValidityCondition(condition, fieldValues, columnsMap) {
    const { operator, fieldId, value: ruleValue } = condition;
    const colType = columnsMap[fieldId]?.type || "text";
    const raw     = fieldValues[fieldId];
    const actual  = extractValidityValue(raw, colType);

    const fieldIsEmpty = actual === null || actual === undefined || actual === "";

    // Blank rule value — user is comparing against an empty field.
    // "==" + blank → field must be empty; "!=" + blank → field must not be empty.
    // Any other operator + blank is treated as "!=" (field must not be empty).
    const ruleIsBlank = ruleValue === null || ruleValue === undefined || ruleValue === "";
    if (ruleIsBlank) {
        if (operator === "==") return fieldIsEmpty;
        return !fieldIsEmpty;
    }

    // Non-blank rule value: empty field fails all comparisons
    if (fieldIsEmpty) return false;

    // Numeric / date comparisons
    if (colType === "numbers" || colType === "date") {
        const num  = colType === "numbers" ? parseFloat(actual)    : actual;
        const comp = colType === "numbers" ? parseFloat(ruleValue) : ruleValue;
        if (colType === "numbers" && (isNaN(num) || isNaN(comp))) return false;
        switch (operator) {
            case "==": return num === comp || String(num) === String(comp);
            case "!=": return num !== comp && String(num) !== String(comp);
            case ">":  return num >   comp;
            case ">=": return num >=  comp;
            case "<":  return num <   comp;
            case "<=": return num <=  comp;
        }
    }

    // String comparisons (text, long_text, email, phone, link)
    const str  = String(actual).toLowerCase();
    const comp = String(ruleValue).toLowerCase();
    switch (operator) {
        case "==":           return str === comp;
        case "!=":           return str !== comp;
        case "contains":     return str.includes(comp);
        case "not_contains": return !str.includes(comp);
        case "starts_with":  return str.startsWith(comp);
        case "ends_with":    return str.endsWith(comp);
    }

    return false;
}

/**
 * Parse and evaluate a free-form criteria expression like "1 AND (2 OR 3)".
 * Returns true if the expression evaluates to true given the results array.
 *
 * @param {string}    expr     e.g. "1 AND (2 OR 3)"
 * @param {boolean[]} results  indexed from 1 (results[0] = condition 1)
 * @returns {boolean}
 */
function evalCriteriaExpression(expr, results) {
    // Replace condition numbers with their boolean values
    // then evaluate as a JS boolean expression (safe — only AND/OR/digits/parens)
    let jsExpr = expr
        .replace(/\b(\d+)\b/g, (_, n) => {
            const idx = parseInt(n, 10) - 1;
            return idx >= 0 && idx < results.length ? String(results[idx]) : "false";
        })
        .replace(/\bAND\b/gi, "&&")
        .replace(/\bOR\b/gi,  "||");

    // Safety check — only allow boolean literals, &&, ||, (), spaces
    if (!/^[\strue\false()&|!]+$/.test(jsExpr)) return false;

    try {
        // eslint-disable-next-line no-new-func
        return Boolean(new Function(`return (${jsExpr})`)());
    } catch (_) {
        return false;
    }
}

/**
 * Evaluate all validity rules for a field.
 * Returns true if the field's value PASSES validation (is valid).
 *
 * @param {{ conditions, criteria }} validityRules
 * @param {Object} fieldValues   - { [columnId]: rawValue }
 * @param {Object} columnsMap    - { [columnId]: { type, ... } }
 * @returns {boolean}  true = valid, false = invalid
 */
export function validateField(validityRules, fieldValues, columnsMap) {
    if (!validityRules) return true;
    const { conditions = [], criteria = "ALL" } = validityRules;
    if (conditions.length === 0) return true;

    const results = conditions.map((c) =>
        evaluateValidityCondition(c, fieldValues, columnsMap)
    );

    if (conditions.length === 1) return results[0];

    // criteria is either "ALL", "ANY", or a free-form expression like "1 AND (2 OR 3)"
    if (criteria === "ALL") return results.every(Boolean);
    if (criteria === "ANY") return results.some(Boolean);

    // Free-form expression
    return evalCriteriaExpression(criteria, results);
}
