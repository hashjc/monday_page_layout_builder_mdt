// pageLayoutBuilderUtils.js
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
 * Fetches existing layout items from the metadata board for a specific boardId.
 * @param {string} metadataBoardId - The ID of the board storing layouts.
 * @param {string} targetBoardId - The ID of the board we are building a layout for.
 * @param {string} boardIdColumnId - The ID of the 'Board Id' column on the metadata board.
 * @returns {Promise<Array>} List of items matching the targetBoardId.
 */
export async function getPageLayoutSectionRecords(targetBoardId, boardIdColumnId) {
    console.log("Page layout section records - target board id ", targetBoardId);
    console.log("Page layout section records - target board id 2 ", boardIdColumnId);
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

    try {
        const response = await monday.api(query, { variables: { boardId: [String(PLS_BOARDID)] } });
        const items = response?.data?.boards?.[0]?.items_page?.items || [];

        // Filter items where the "Board Id" column matches the board we are currently editing
        return items.filter((item) => {
            const cv = item.column_values.find((c) => c.id === boardIdColumnId);
            return cv?.text?.trim() === String(targetBoardId);
        });
    } catch (error) {
        //console.error("Error in fetchLayoutRecords:", error);
        throw error;
    }
}
