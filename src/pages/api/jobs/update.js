import { clientPromise } from '@/utils/db';
import { withAuth } from '@/utils/server/auth';
import { ObjectId } from 'mongodb';

const handler = async (req, res, user) => {
  if (req.user?.readOnly) {
    return res.status(423).json({ error: 'Demo accounts are read-only' });
  }
  if (req.method !== 'PUT') return res.status(405).end();

  const { id, update } = req.body;
  if (!id || typeof update !== 'object' || update === null) {
    return res.status(400).json({ error: 'Missing or invalid id/update' });
  }

  try {
    const db = (await clientPromise(req)).db('job-alerts');

    const job = await db.collection('sentJobs').findOne({ _id: new ObjectId(id) });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const logs = [];

    // For audit logs, we need to extract field changes.
    // But if update contains operators like $unset or $set, 
    // we need to handle differently.

    // We'll build a flat "new values" object to compare with existing job fields.
    // This is a simplified approach:

    let newValues = {};

    // If update contains operators ($set, $unset, etc)
    const hasOperator = Object.keys(update).some(key => key.startsWith('$'));

    if (hasOperator) {
      // For $set, we compare those fields
      if (update.$set) {
        newValues = { ...newValues, ...update.$set };
      }
      // For $unset, those fields become undefined or removed
      if (update.$unset) {
        for (const key of Object.keys(update.$unset)) {
          newValues[key] = undefined;
        }
      }
      // You can expand this to handle $inc, $push etc if you want
    } else {
      newValues = { ...update };
    }

    // Create audit logs for fields that changed
    for (const key in newValues) {
      // Use optional chaining and handle undefined properly
      if (newValues[key] !== job[key]) {
        logs.push({
          jobId: job._id,
          field: key,
          previousValue: job[key] ?? null,
          newValue: newValues[key],
          changedBy: user?.email || 'system',
          timestamp: new Date(),
        });
      }
    }

    // Special case: Add `applied_on` timestamp if marking as applied AND if not present
    if (!hasOperator && update.status === 'applied' && !job.applied_on) {
      update.applied_on = new Date();
    } else if (hasOperator && update.$set && update.$set.status === 'applied' && !job.applied_on) {
      update.$set.applied_on = new Date();
    }

    // Prepare update query: either the update object itself if it contains operators,
    // or wrap it in $set otherwise
    const updateQuery = hasOperator ? update : { $set: update };

    await db.collection('sentJobs').updateOne(
      { _id: new ObjectId(id) },
      updateQuery
    );

    if (logs.length) {
      await db.collection('jobUpdates').insertMany(logs);
    }

    return res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      updatedFields: Object.keys(newValues),
      auditLogs: logs,
    });
  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
      data: err?.data || null,
    });
  }
};

export default withAuth(handler);
