import { IJoinConfig } from "@/app/components/Joins/types";
import { GITHUB_PRODUCTION_BRANCH } from "@/app/constants";
import GitHub from "github-api";
import { getEnv } from "../../looker/utils";
import { generateLookML } from "./generateLookML";
import { ColumnInfo } from "./route";

export async function writeLookMLToGitHub({
  tableName,
  columnInfo,
  project_id,
  dataset_id,
  user_id,
  view_label,
  looker_project_id,
  join_config,
}: {
  tableName: string;
  columnInfo: ColumnInfo[];
  project_id: string;
  dataset_id: string;
  user_id: string;
  view_label: string;
  looker_project_id: string;
  join_config: IJoinConfig;
}): Promise<void> {
  // Generate LookML
  const lookml = generateLookML({
    tableName: tableName,
    columnInfo: columnInfo,
    project_id: project_id,
    dataset_id: dataset_id,
    looker_user_id: user_id,
    view_label: view_label,
    join_config,
  });
  const gh = new GitHub({
    token: getEnv("GITHUB_TOKEN"),
  });

  const repo = gh.getRepo(
    getEnv("GITHUB_REPO_OWNER"),
    getEnv("GITHUB_REPO_NAME")
  );

  try {
    // First, try to create the refinements directory if it doesn't exist
    try {
      await repo.getContents("main", "refinements");
    } catch {
      // Directory doesn't exist, create it
      await repo.writeFile(
        GITHUB_PRODUCTION_BRANCH,
        "refinements/.gitkeep",
        "",
        "Create refinements directory",
        { encode: true }
      );
    }

    // Now write the LookML file
    await repo.writeFile(
      GITHUB_PRODUCTION_BRANCH,
      `refinements/${tableName}.view.lkml`,
      lookml,
      `Add LookML view for ${tableName}`,
      {
        encode: true,
      }
    );

    const webhookUrl = `${getEnv(
      "LOOKERSDK_BASE_URL"
    )}/webhooks/projects/${looker_project_id}/deploy`;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const deploy_webhook = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "X-Looker-Deploy-Secret": getEnv("LOOKER_PROJECT_WEBHOOK_SECRET"),
        "Content-Type": "application/json",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    return;
  } catch (error) {
    console.error("Error writing LookML to GitHub:", error);
    throw new Error("Failed to write LookML to GitHub repository");
  }
}
