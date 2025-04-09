import { Connection } from "duckdb";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { getEnv } from "../../looker/utils";
// Define the DuckDB connection type

interface ParquetCreationResult {
  parquetPath: string;
  tableName: string;
  columnInfo: ColumnInfo[];
  parquetFile: string;
}

export async function createParquetFromCSV(
  fileContents: string,
  userId: string,
  fileName: string
): Promise<ParquetCreationResult> {
  // Get the appropriate DuckDB package based on environment

  let duckdb;
  try {
    duckdb =
      process.env.NODE_ENV === "production"
        ? (await import("duckdb-lambda-x86")).default
        : (await import("duckdb")).default;
  } catch (error) {
    console.error("Error importing DuckDB:", error);
    throw error;
  }

  // Generate a unique table name
  const tableName = `table_${uuidv4().replace(
    /-/g,
    ""
  )}_${userId}_${fileName.replace(/[^a-zA-Z0-9]/g, "_")}`;

  // Save the CSV file to the filesystem
  const uploadsDir =
    process.env.NODE_ENV === "production"
      ? path.join("/tmp")
      : path.join(process.cwd(), "tmp");
  if (process.env.NODE_ENV !== "production") {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  // Write the CSV contents to a file
  const filePath = path.join(uploadsDir, `${tableName}.csv`);

  await fs.writeFile(filePath, fileContents);

  // Create DuckDB connection and table
  const connection: Connection = await new Promise((resolve) => {
    const db = new duckdb.Database(":memory:");
    resolve(db.connect());
  });

  await new Promise((resolve) =>
    connection.run(
      `
INSTALL httpfs;
LOAD httpfs;
CREATE SECRET (
    TYPE gcs,
    KEY_ID '${getEnv("GCS_ACCESS_KEY")}',
    SECRET '${getEnv("GCS_ACCESS_SECRET")}'
);
      `,
      (err) => {
        resolve(err);
      }
    )
  );
  try {
    await new Promise((resolve) =>
      connection.run(
        `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto("${filePath}")`,
        (err) => {
          resolve(err);
        }
      )
    );
    // Delete the CSV file after creating the table
    await fs.unlink(filePath);

    // Get column information from the newly created table
    const columnInfo = (await new Promise((resolve) =>
      connection.all(
        `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = '${tableName}'`,
        (err, result) => {
          resolve(result as unknown as ColumnInfo[]);
        }
      )
    )) as ColumnInfo[];

    // Write table to Parquet file
    const parquetDir =
      process.env.NODE_ENV === "production"
        ? path.join("/tmp")
        : path.join(process.cwd(), "tmp");
    if (process.env.NODE_ENV !== "production") {
      await fs.mkdir(parquetDir, { recursive: true });
    }
    // const parquetPath = path.join(parquetDir, `${tableName}.parquet`);
    const parquetFile = `${tableName}.parquet`;
    const gcsPath = `gs://${getEnv("GCS_BUCKET_NAME")}/${parquetFile}`;

    const p = new Promise<ParquetCreationResult>((resolve) =>
      connection.all(
        `COPY ${tableName} TO '${gcsPath}' (FORMAT PARQUET)`,
        (err) => {
          console.log("err", err);
          resolve({
            parquetPath: gcsPath,
            parquetFile,
            tableName,
            columnInfo,
          });
        }
      )
    );
    return p;
  } finally {
    // await connection.close();
  }
}
