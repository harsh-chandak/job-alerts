import { withAuth } from "@/utils/server/auth";
import { clientPromise } from "@/utils/db";

async function handler(req, res) {
    try {
        const db = (await clientPromise(req)).db("job-alerts");
        const collection = db.collection("companies");

        // Read raw query params
        const pageRaw = req.query.page;
        const limitRaw = req.query.limit;

        // Validate numbers
        const pageNum = Number.parseInt(pageRaw, 10);
        const limitNum = Number.parseInt(limitRaw, 10);
        const hasPage = Number.isFinite(pageNum) && pageNum > 0;
        const hasLimit = Number.isFinite(limitNum) && limitNum > 0;
        const shouldPaginate = hasPage && hasLimit;

        const sortField = req.query.sortField || "ts";
        const sortOrder = -1; // or: Number(req.query.sortOrder) || -1

        // Always useful to know total count
        const total = await collection.countDocuments();

        // Build the base cursor
        let cursor = collection.find().sort({ [sortField]: sortOrder });

        // Apply pagination only if requested & valid
        if (shouldPaginate) {
            const skip = (pageNum - 1) * limitNum;
            cursor = cursor.skip(skip).limit(limitNum);
        }

        const companies = await cursor.toArray();

        // Base response
        const base = {
            success: true,
            message: "Companies data fetched successfully",
            data: companies,
            total, // keep total even when not paginating (can remove if you prefer)
        };

        // Attach pagination only when used
        if (shouldPaginate) {
            base.pagination = {
                total,
                page: pageNum,
                limit: limitNum,
                totalItems: Math.max(1, Math.ceil(total / limitNum)),
            };
        }

        return res.status(200).json(base);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message,
            data: err.data,
        });
    }
}

export default withAuth(handler);
