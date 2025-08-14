import { withAuth } from "@/utils/server/auth";
import { clientPromise } from "@/utils/db";

async function handler(req, res) {
    try {
        const db = (await clientPromise(req)).db("job-alerts");
        const collection = db.collection("sentJobs");

        const sortField = req.query.sortField || "ts";
        const sortOrder = -1;

        const { status, search, start, end, onlyApplications } = req.query;

        // Build query
        const query = {};
        if (onlyApplications) {
            query.status = {
                $in: [
                    "applied",
                    "shortlisted",
                    "interview",
                    "selected",
                    "rejected",
                    "inactive",
                    "no-reply",
                ],
            };
        }
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { company: { $regex: search, $options: "i" } }
            ];
        }

        if (start || end) {
            if (onlyApplications) {
                query.applied_on = {};
                if (start) query.applied_on.$gte = new Date(start);
                if (end) query.applied_on.$lte = new Date(end);
            } else {
                query.createdAt = {};
                if (start) query.createdAt.$gte = new Date(start);
                if (end) query.createdAt.$lte = new Date(end);
            }
        }

        let jobs;
        let pagination = null;


        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const total = await collection.countDocuments(query);
        jobs = await collection
            .find(query)
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .toArray();

        pagination = {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };


        return res.status(200).json({
            success: true,
            message: "Jobs data fetched successfully",
            data: jobs || [],
            pagination, // Only send pagination if it's used
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

export default withAuth(handler);
