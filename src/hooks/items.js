//items.js file
//Query records of a Monday board
import mondaySdk from "monday-sdk-js";
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
            .map((id, index) => `
                delete${index}: delete_item(item_id: ${id}) { id }
            `)
            .join("\n");

        const query = `mutation { ${mutations} }`;

        const response = await monday.api(query);

        if (response.errors) {
            return {
                success: false,
                error: response.errors[0].message
            };
        }

        return { success: true, error: "" };

    } catch (error) {
        return { success: false, error: error.message };
    }
}


