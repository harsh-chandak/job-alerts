import { ObjectId } from 'mongodb';
import {clientPromise} from "@/utils/db";
import { withAuth } from '@/utils/server/auth';

async function handler(req, res) {
    const db = (await clientPromise(req)).db("job-alerts");

    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (typeof id !== 'string' || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid company ID format' });
    }

    try {
        // Convert id string to ObjectId
        const objectId = new ObjectId(id);

        const company = await db.collection('companies').findOne({ _id: objectId });

        if (!company) {
            return res.status(200).json({ error: 'Company not found' });
        }

        await db.collection('companies').deleteOne({ _id: objectId });

        res.status(200).json({ success: true, message: 'Deleted', data: company });
    } catch (err) {
        console.error('Error fetching company by ID:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export default withAuth(handler)
