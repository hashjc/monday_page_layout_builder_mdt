//items.js file
//Query records of a Monday board
import mondaySdk from "monday-sdk-js";
import { getBoardIdsByName } from "./boardMetadata";
const monday = mondaySdk();
const LIMIT = 500;

/**
 * Delete multiple board items. Pass an array of ids.
 * @param {} itemIds
 * @returns
 */

export async function deleteItems(itemIds = []) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return { success: false, error: "Item IDs are required" };
    }

    try {
        const mutations = itemIds
            .map(
                (id, index) => `
                delete${index}: delete_item(item_id: ${id}) { id }
            `,
            )
            .join("\n");

        const query = `mutation { ${mutations} }`;

        const response = await monday.api(query);

        if (response.errors) {
            return {
                success: false,
                error: response.errors[0].message,
            };
        }

        return { success: true, error: "" };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getItemsByBoardName(boardName) {
    // Step 1: Find the ID(s)
    const matchingBoards = await getBoardIdsByName(boardName);

    if (matchingBoards.length === 0) {
        console.warn("No board found with that name.");
        return [];
    }

    if (matchingBoards.length > 1) {
        console.warn("Multiple boards found with this name. Picking the first one.");
    }

    // Step 2: Use the ID to get records
    const targetId = matchingBoards[0].id;
    return await getItems(targetId);
}

/**
 * Retrieves all records from a board including column values.
 * @param {string|number} boardId
 * @param {number} limit - Default 500
 * @returns {Promise<Array>} List of items.
 */
export async function getItems(boardId, limit = 500) {
    try {
        const query = `
            query($boardId: [ID!], $limit: Int) {
                boards(ids: $boardId) {
                    items_page(limit: $limit) {
                        items {
                            id
                            name
                            column_values {
                                id
                                text
                                value
                                type
                            }
                        }
                    }
                }
            }
        `;
        const response = await monday.api(query, {
            variables: {
                boardId: [String(boardId)],
                limit,
            },
        });

        if (response.errors) throw new Error(response.errors[0].message);

        return response.data?.boards?.[0]?.items_page?.items || [];
    } catch (error) {
        console.error(`[getItems] Error fetching board ${boardId}:`, error);
        return [];
    }
}