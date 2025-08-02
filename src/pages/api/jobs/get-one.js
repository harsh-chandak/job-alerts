import { withAuth } from "@/utils/server/auth";
import {clientPromise} from "@/utils/db";
import { ObjectId } from "mongodb";

export default withAuth(async function handler(req, res) {
  const { id } = req.query;

  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

  const db = (await clientPromise(req)).db("job-alerts");

  const job = await db.collection("sentJobs").findOne({ _id: new ObjectId(id) });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const updates = await db.collection("jobUpdates")
    .find({ jobId: job._id })
    .sort({ timestamp: -1 })
    .toArray();

  return res.status(200).json({
    success: true,
    data: {
      ...job,
      updates,
      lastFollowUp: job.lastFollowUp || null
    }
  });
});
