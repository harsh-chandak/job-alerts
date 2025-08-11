// pages/api/upload.js
import formidable from "formidable";
import fs from "fs";
import { clientPromise } from "@/utils/db";
import { withAuth } from "@/utils/server/auth";

export const config = {
  api: {
    bodyParser: false, // Required for formidable
  },
};

function validateCompany(company) {
  if (!company?.name || !company?.careersUrl) return false;

  if (company.customApi) {
    return company.careersApi && company.responseMapping?.jobsPath &&
      company.responseMapping?.fields?.title &&
      company.responseMapping?.fields?.id
  }

  return true;
}

async function handler(req, res) {
  if (req.user?.readOnly) {
    return res.status(423).json({ error: 'Demo accounts are read-only' });
  }
  try {
    const db = (await clientPromise(req)).db("job-alerts");
    const collection = db.collection("companies");

    if (req.method === "POST") {
      if (req.headers["content-type"].includes("multipart/form-data")) {
        // Bulk upload
        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
          if (err) {
            return res.status(500).json({ message: "Error parsing form data" });
          }

          const file = files.file[0];
          const rawData = fs.readFileSync(file.filepath, "utf-8");

          let companies;
          try {
            companies = JSON.parse(rawData);
          } catch {
            return res.status(400).json({ message: "Invalid JSON format" });
          }

          const validCompanies = companies.filter(validateCompany);
          const result = await collection.insertMany(validCompanies);

          return res.status(200).json({
            message: `${result.insertedCount} valid companies uploaded`,
            skipped: companies.length - validCompanies.length
          });
        });
      } else {
        // Single company upload (JSON)
        const body = await new Promise((resolve, reject) => {
          let data = "";
          req.on("data", chunk => data += chunk);
          req.on("end", () => resolve(JSON.parse(data)));
          req.on("error", reject);
        });

        const company = body.company;
        if (!validateCompany(company)) {
          return res.status(400).json({ message: "Invalid company format or missing required fields" });
        }

        await collection.insertOne(company);
        return res.status(200).json({ message: "Company added" });
      }
    } else {
      return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, message: 'Internal server error.', data: error })
  }
}

export default withAuth(handler)