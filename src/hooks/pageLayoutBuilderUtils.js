import mondaySdk from "monday-sdk-js";
import {
    PAGELAYOUTSECTION_BOARDID,
    PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONORDER,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS,
    PAGELAYOUTSECTION_COLUMN_TITLE_FIELDS,
} from "../config_constants";
import { getBoardColumns } from "./boardMetadata";

const PLS_BOARDID = PAGELAYOUTSECTION_BOARDID;
const monday = mondaySdk();

/**
 * Fetches existing layout section records from the PageLayoutSections metadata board
 * and filters them to only return records that match the given targetBoardId.
 *
 * @param {string|number} targetBoardId - The ID of the board we're building a layout for.
 * @param {string} boardIdColumnId - The column ID of the "Board Id" column in the PLS board.
 * @returns {Promise<Array>} Filtered list of monday items for this board's layout.
 */
export async function getPageLayoutSectionRecords(targetBoardId) {
    //Get PageLayoutSection Board's key columns
    const res = await getBoardColumns(String(PAGELAYOUTSECTION_BOARDID));
    if (!res.success) throw new Error("Cannot access PageLayoutSections board: " + res.error);
    const find = (title) => res.columns.find((c) => c.title === title);
    const boardIdCol = find(PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID);
    const fieldsCol = find(PAGELAYOUTSECTION_COLUMN_TITLE_FIELDS); // NEW
    const orderCol = find(PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONORDER);

    if (!boardIdCol || !fieldsCol || !orderCol)
        throw new Error(
            `Missing required columns in PageLayoutSections board.\n` +
                `Expected: "${PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID}", "${PAGELAYOUTSECTION_COLUMN_TITLE_FIELDS}", "${PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONORDER}".\n` +
                `Found: ${res.columns.map((c) => `"${c.title}"`).join(", ")}`,
        );
    const boardIdColumnId = boardIdCol.id;
    const fieldsColId = fieldsCol.id; // NEW — replaces sectionsColId for writes
    const orderColId = orderCol.id;
    //Query Page Layout Section Board's records
    const targetStr = String(targetBoardId).trim();

    const query = `
        query($boardId: [ID!]) {
            boards(ids: $boardId) {
                items_page(limit: 500) {
                    items {
                        id
                        name
                        column_values {
                            id
                            text
                            value
                        }
                    }
                }
            }
        }
    `;

    const response = await monday.api(query, {
        variables: { boardId: [String(PLS_BOARDID)] },
    });

    const items = response?.data?.boards?.[0]?.items_page?.items || [];
    // Debug: log what each item's boardId column actually contains

    items.forEach((item) => {
        const cv = item.column_values.find((c) => c.id === boardIdColumnId);
        console.log(`[PLB] Item "${item.name}" (${item.id}) - boardId col text: "${cv?.text}" value: "${cv?.value}"`);
    });

    // Match by normalizing both sides to trimmed strings.
    // Monday's text column can return the number as "5026698263" or "5026698263.0" etc.
    // We strip trailing ".0" to be safe.
    const normalize = (val) =>
        String(val ?? "")
            .trim()
            .replace(/\.0+$/, "");

    const matched = items.filter((item) => {
        const cv = item.column_values.find((c) => c.id === boardIdColumnId);
        const colText = normalize(cv?.text);
        const colValue = (() => {
            // text column stores value as JSON string e.g. '"5026698263"'
            try {
                return normalize(JSON.parse(cv?.value ?? ""));
            } catch (_) {
                return normalize(cv?.value);
            }
        })();
        const isMatch = colText === targetStr || colValue === targetStr;
        if (!isMatch) {
        }
        return isMatch;
    });
    const sortedRecords = sortPageLayoutSectionRecords(matched, orderColId);
    console.log("PLS board record queries Matched records ", sortedRecords);
    return sortedRecords;
}

/**
 * Sorts monday records by a specific numeric column ID.
 * Handles cases where numeric values are stored as strings.
 * * @param {Array} pageLayoutSectionRecords - Array of monday item objects
 * @param {string} sectionOrderColId - The ID of the numeric column (e.g., "numeric_mm0pat0e")
 * @returns {Array} Sorted or original array
 */
function sortPageLayoutSectionRecords(pageLayoutSectionRecords, sectionOrderColId) {
    if (!pageLayoutSectionRecords || !Array.isArray(pageLayoutSectionRecords) || pageLayoutSectionRecords.length === 0) {
        return pageLayoutSectionRecords;
    }

    const hasColumn = pageLayoutSectionRecords[0].column_values?.some((cv) => cv.id === sectionOrderColId);

    // If column id is not present anywhere then return same records
    if (!hasColumn) {
        return pageLayoutSectionRecords;
    }

    return pageLayoutSectionRecords.slice().sort((a, b) => {
        // Find the specific column value object for record A and B
        const valA = a.column_values.find((cv) => cv.id === sectionOrderColId)?.text;
        const valB = b.column_values.find((cv) => cv.id === sectionOrderColId)?.text;

        // Convert to float to handle numeric sorting (even if they are strings)
        // We use parseFloat to handle decimals, and fallback to 0 if the value is empty/invalid
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;

        return numA - numB;
    });
}

/**
 * Parses a monday long_text column value into a JS ARRAY.
 * Used for the new FIELDS column which stores [{ id, columnId, ... }, ...]
 *
 * @param {Object} cv - column_value object { id, text, value }
 * @returns {Array|null} Parsed fields array, or null if parsing fails.
 */
export function parseFieldsArrayJSON(cv) {
    if (!cv) return null;
    console.log("In parseFieldsArrayJSON method CV ", cv);

    //const existingJson = cv.text;
    //const validJson = existingJson.replaceAll('=>', ':');

    //console.log('Feilds parsed json ', fieldsParsedJsonValid);
    try {
        const fieldsParsedJsonValid = JSON.parse(cv.text);
        const fields = fieldsParsedJsonValid?.fields ?? [];
        return fields;
    } catch (ex) {
        return [];
    }
    /*
    // Strategy 1: cv.text is the raw stored string — try it first
    if (cv.text && cv.text.trim().startsWith("[")) {
        console.log('1. In parseFieldsArrayJSON method CV text ', cv.text);
        try {
            const parsed = JSON.parse(cv.text);
            console.log('In parseFieldsArrayJSON method CV text parsed ', parsed);
            console.log('In parseFieldsArrayJSON method CV text parsed text ', parsed.text);
            const parsedFields = JSON.parse(parsed.text);
            console.log('Parsed fields ', parsedFields);
            if (Array.isArray(parsed)) return parsed;
        } catch (_) {
            console.log('1. exception ', _);
        }
    }

    // Strategy 2: cv.value is the monday wrapper { text: "[...]", changed_at: "..." }
    if (cv.value) {
        console.log('2. In parseFieldsArrayJSON method CV text ', cv.value);
        try {
            const outer = JSON.parse(cv.value);
            console.log('2. In parseFieldsArrayJSON method CV text ', outer);
            if (outer && typeof outer.text === "string" && outer.text.trim().startsWith("[")) {
                const inner = JSON.parse(outer.text);
                if (Array.isArray(inner)) return inner;
            }
        } catch (_) {
            console.log('2. exception ', _);
        }

        // Strategy 3: cv.value is itself the array string (no wrapper)
        try {

            const direct = JSON.parse(cv.value);
            console.log('3. In parseFieldsArrayJSON method CV text ', direct);
            if (Array.isArray(direct)) return direct;
        } catch (_) {
            console.log('4. exception ', _);
        }

    }
    */
    return null;
}

/**
 * Parses a monday long_text column value into a JS object.
 *
 * @param {Object} cv - A column_value object from the GraphQL response { id, text, value }
 * @returns {Object|null} Parsed section data object, or null if parsing fails.
 */
export function parseLongTextJSON(cv) {
    if (!cv) return null;

    // Strategy 1 (most reliable): cv.text IS the stored string for long_text columns.
    // Monday sets cv.text = the raw stored content, without any extra encoding.
    if (cv.text && cv.text.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(cv.text);
            if (parsed && typeof parsed === "object") {
                return parsed;
            }
        } catch (_) {}
    }

    // Strategy 2: cv.value = '{"text":"<json>","changed_at":"..."}' (standard long_text GraphQL shape)
    if (cv.value) {
        try {
            const outer = JSON.parse(cv.value);
            if (outer && typeof outer.text === "string" && outer.text.trim().startsWith("{")) {
                const inner = JSON.parse(outer.text);
                if (inner && typeof inner === "object") {
                    return inner;
                }
            }
        } catch (_) {}

        // Strategy 3: cv.value is itself a JSON-encoded string of the object (double-encoded)
        try {
            const once = JSON.parse(cv.value);
            if (typeof once === "string" && once.trim().startsWith("{")) {
                const twice = JSON.parse(once);
                if (twice && typeof twice === "object") {
                    return twice;
                }
            }
        } catch (_) {}

        // Strategy 4: cv.value IS the JSON object directly (no wrapper)
        try {
            const direct = JSON.parse(cv.value);
            if (direct && typeof direct === "object" && !Array.isArray(direct)) {
                return direct;
            }
        } catch (_) {}
    }
    return null;
}
