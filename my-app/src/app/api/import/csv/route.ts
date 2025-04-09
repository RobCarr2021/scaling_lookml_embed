import { IJoinConfig } from "@/app/components/Joins/types";
import { BigQuery } from "@google-cloud/bigquery";
import { Storage } from "@google-cloud/storage";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getEnv, getFormData, getUserLookerSdk } from "../../looker/utils";
import { writeLookMLToGitHub } from "./github";

export interface ColumnInfo {
  column_name: string;
  data_type: string;
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 300,
  memory: {
    maxRetainedSize: "2GB",
  },
};

const parseJoinConfig = (joinConfig: string): IJoinConfig => {
  try {
    return JSON.parse(joinConfig);
  } catch (error) {
    console.error("Error parsing join config:", error);
    throw new Error("Invalid join config");
  }
};

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = getFormData<File>(formData, "file");
    const project_id = getEnv("GOOGLE_CLOUD_PROJECT");
    const join_config = parseJoinConfig(getFormData<string>(formData, "joins"));
    const dataset_id = getEnv("BIGQUERY_DATASET_ID");
    const bucket_name = getEnv("GCS_BUCKET_NAME");
    const looker_project_id = getEnv("LOOKER_PROJECT_ID");
    const cookieStore = await cookies();
    const sdk = getUserLookerSdk(cookieStore);
    const userId = sdk.authSession.sudoId;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".csv.gz")) {
      return NextResponse.json(
        { message: "File must be a CSV or gzipped CSV" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const storage = new Storage({
      projectId: project_id,
      credentials: getCredentials(),
    });
    const bucket = storage.bucket(bucket_name);
    // Generate a unique table name incorporating user ID and original filename
    const tableName = `table_${uuidv4().replace(
      /-/g,
      ""
    )}_${userId}_${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const gcsFileName = `${tableName}.csv`; // Use the unique name for the GCS file as well
    const blob = bucket.file(gcsFileName);
    const gcsPath = `gs://${bucket_name}/${blob.name}`;

    console.log(`Attempting to upload ${gcsFileName} to ${gcsPath}`);

    await new Promise<void>((resolve, reject) => {
      const blobStream = blob.createWriteStream({
        resumable: false,
      });
      blobStream.on("error", (err) => {
        console.error(`GCS upload error for ${gcsFileName}:`, err);
        reject(new Error(`Failed to upload ${gcsFileName} to GCS`));
      });
      blobStream.on("finish", () => {
        console.log(`Successfully uploaded ${gcsFileName} to ${gcsPath}`);
        resolve();
      });
      blobStream.end(fileBuffer);
    });

    // --- Start: BigQuery Load Logic ---
    console.log(
      `Attempting to load data from ${gcsPath} into BigQuery table ${dataset_id}.${tableName}`
    );
    const bigquery = new BigQuery({
      projectId: project_id,
      credentials: getCredentials(),
    });

    const metadata = {
      sourceFormat: "CSV",
      skipLeadingRows: 1, // Assuming the first row is a header
      autodetect: true, // Auto-detect schema
      location: "US", // Specify your location if not US default
      writeDisposition: "WRITE_TRUNCATE", // Overwrite table data
    };

    // Load data from GCS into the new table
    const [job] = await bigquery
      .dataset(dataset_id)
      .table(tableName)
      .load(blob, metadata);

    console.log(`BigQuery load job ${job.id} started.`);

    // Wait for the job to finish
    const errors = job.status?.errors;
    if (errors && errors.length > 0) {
      console.error("BigQuery load job failed:", errors);
      throw new Error(`BigQuery load job failed for ${gcsPath}`);
    }

    console.log(
      `BigQuery load job ${job.id} completed successfully. Table: ${dataset_id}.${tableName}`
    );

    // --- End: BigQuery Load Logic ---

    // Get column information from the newly created BigQuery table
    const [tableMetadata] = await bigquery
      .dataset(dataset_id)
      .table(tableName)
      .getMetadata();

    const columnInfo: ColumnInfo[] = tableMetadata.schema.fields.map(
      (field) => ({
        column_name: field.name,
        data_type: field.type,
      })
    );

    console.log("Retrieved column information:", columnInfo);

    await writeLookMLToGitHub({
      tableName,
      columnInfo,
      project_id,
      dataset_id,
      looker_project_id,
      join_config,
      user_id: userId,
      view_label: file.name,
    });

    console.log("LookML written to GitHub");

    return NextResponse.json({
      message: "File uploaded to GCS and loaded into BigQuery successfully",
      gcsPath: gcsPath,
      bigqueryTable: `\`${project_id}.${dataset_id}.${tableName}\``,
    });
  } catch (error) {
    console.error("Error processing CSV upload:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during processing";
    return NextResponse.json(
      {
        message: "Failed to process CSV upload",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
