import clientPromise from "@/utils/db";

export default async function handler(req, res) {
    try {
        const db = (await clientPromise).db("job-alerts");
        const collection = db.collection("companies");

        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const sortField = req.query.sortField || 'ts';

        const sortOrder = -1;

        const total = await collection.countDocuments();

        const companies = await collection
            .find()
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .toArray();

        return res.status(200).json({
            success: true,
            message: "Companies data fetched successfully",
            data: companies,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message,
            data: err.data,
        });
    }
}
