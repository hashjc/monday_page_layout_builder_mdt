import mondaySdk from "monday-sdk-js";
import {
    PAGELAYOUTSECTION_BOARDID,
    PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONORDER,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS,
} from "../config_constants";

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
export async function getPageLayoutSectionRecords(targetBoardId, boardIdColumnId) {
    const targetStr = String(targetBoardId).trim();
    console.log("[PLB] getPageLayoutSectionRecords - targetBoardId:", targetStr, "| boardIdColumnId:", boardIdColumnId);

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
    console.log("[PLB] Total records in PLS board:", items.length);

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
            console.log(`[PLB] Skipping item "${item.name}" - colText="${colText}" colValue="${colValue}" !== target="${targetStr}"`);
        }
        return isMatch;
    });

    console.log(
        "[PLB] Matched records for board",
        targetStr,
        ":",
        matched.length,
        matched.map((i) => i.name),
    );
    return matched;
}

/**
 * Parses a monday long_text column value into a JS object.
 *
 * monday's GraphQL API returns long_text column values in this shape:
 *   cv.value  = '{"text":"<actual json string>","changed_at":"..."}'
 *   cv.text   = <actual json string>   ← this is the most reliable field
 *
 * We try multiple strategies in order of reliability.
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
                console.log("[PLB] parseLongTextJSON: parsed via cv.text");
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
                    console.log("[PLB] parseLongTextJSON: parsed via cv.value outer.text");
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
                    console.log("[PLB] parseLongTextJSON: parsed via double-decode of cv.value");
                    return twice;
                }
            }
        } catch (_) {}

        // Strategy 4: cv.value IS the JSON object directly (no wrapper)
        try {
            const direct = JSON.parse(cv.value);
            if (direct && typeof direct === "object" && !Array.isArray(direct)) {
                console.log("[PLB] parseLongTextJSON: parsed via direct cv.value");
                return direct;
            }
        } catch (_) {}
    }

    console.warn("[PLB] parseLongTextJSON: FAILED to parse column value. cv.text:", cv.text?.slice(0, 100), "cv.value:", cv.value?.slice(0, 100));
    return null;
}
