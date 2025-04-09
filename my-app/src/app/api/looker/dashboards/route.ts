import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserLookerSdk } from "../utils";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sdk = getUserLookerSdk(cookieStore);

    const dashboards = sdk.ok(
      sdk.search_dashboards({ user_id: sdk.authSession.sudoId })
    );

    const lookml_dashboards = sdk.ok(sdk.folder_dashboards("lookml"));

    const [db, lkdb] = await Promise.all([dashboards, lookml_dashboards]);

    return NextResponse.json({
      message: "Dashboards retrieved successfully",
      dashboards: db,
      lookml_dashboards: lkdb,
    });
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch dashboards",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
