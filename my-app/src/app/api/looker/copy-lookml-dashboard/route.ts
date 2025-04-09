import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getUserLookerSdk } from "../utils";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sdk = getUserLookerSdk(cookieStore);

    const folder = await sdk.ok(sdk.folder("personal"));

    const { dashboard_id }: { dashboard_id: string } = await request.json();

    if (!dashboard_id.includes("::")) {
      return NextResponse.json(
        { message: "dashboard_id is invalid" },
        { status: 400 }
      );
    }

    if (!dashboard_id) {
      return NextResponse.json(
        { message: "dashboard_id is required" },
        { status: 400 }
      );
    }

    if (!folder.id) {
      return NextResponse.json(
        { message: "Personal folder not found" },
        { status: 400 }
      );
    }

    const importedDashboard = await sdk.ok(
      sdk.import_lookml_dashboard(dashboard_id, folder.id)
    );

    return NextResponse.json({
      message: "Dashboard imported successfully",
      dashboard: importedDashboard,
    });
  } catch (error) {
    console.error("Error importing dashboard:", error);
    return NextResponse.json(
      {
        message: "Failed to import dashboard",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
