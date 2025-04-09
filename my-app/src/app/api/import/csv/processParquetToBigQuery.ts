import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";
import { getEnv } from "../../looker/utils";

const MAX_RETRIES = process.env.NODE_ENV === "production" ? 20 : 4;

export const getCredentials = () => {
  try {
    const credentials = getEnv("GOOGLE_CLOUD_CREDENTIALS_BASE64");
    const credentialsBuffer = Buffer.from(credentials, "base64");
    return JSON.parse(credentialsBuffer.toString("utf-8")) as Record<
      string,
      unknown
    >;
  } catch (error) {
    console.error("Error getting credentials:", error);
    throw new Error("Failed to get credentials");
  }
};

export async function processParquetToBigQuery(
  parquetFile: string,
  table_name: string,
  bucket_name: string,
  project_id: string,
  dataset_id: string
): Promise<void> {
  console.log("processing parquet to bigquery");
  const credentials_json = getCredentials();
  // const gcs_uri = `${bucket_name}/${table_name}.parquet`;

  // Initialize clients
  const storage = new Storage({
    credentials: credentials_json,
    projectId: project_id,
  });
  const bigquery = new BigQuery({
    credentials: credentials_json,
    projectId: project_id,
  });

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // await storage.bucket(bucket_name).upload(parquet_path, {
      //   destination: gcs_uri,
      // });

      // Load data from GCS to BigQuery
      const dataset = bigquery.dataset(dataset_id);
      const [job] = await dataset
        .table(table_name)
        .load(storage.bucket(bucket_name).file(parquetFile), {
          sourceFormat: "PARQUET",
          location: "US",
        });

      await job;

      // Check the job's status for errors
      const errors = job.status.errors;
      if (errors && errors.length > 0) {
        throw errors;
      }
      break;
    } catch (error) {
      if (i === MAX_RETRIES - 1) {
        console.error("Error writing to BigQuery:", error);
        throw new Error("Failed to write data to BigQuery");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}
