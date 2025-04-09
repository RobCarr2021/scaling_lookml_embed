import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserLookerSdk } from "../utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboard_id = searchParams.get("dashboard_id");
    const cookieStore = await cookies();
    const sdk = getUserLookerSdk(cookieStore);

    if (!dashboard_id) {
      return NextResponse.json(
        {
          message: "Dashboard ID is required",
        },
        { status: 400 }
      );
    }
    const db = await sdk.ok(sdk.dashboard(dashboard_id));

    const db_explores: Record<string, string> = {};

    db.dashboard_elements?.forEach((element) => {
      let explore_id: string = "";
      if (element.look?.model) {
        explore_id = `${element.look.query.model}::${element.look.query.view}`;
        db_explores[explore_id] = explore_id;
      } else if (element.result_maker) {
        explore_id = `${element.result_maker.query.model}::${element.result_maker.query.view}`;
        db_explores[explore_id] = explore_id;
      } else if (element.query) {
        explore_id = `${element.query.model}::${element.query.view}`;
        db_explores[explore_id] = explore_id;
      }
    });
    const models = await Promise.all(
      Object.values(db_explores).map((explore_id) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [model, explore] = explore_id.split("::");
        return sdk.ok(sdk.lookml_model(model));
      })
    );
    const explores = await Promise.all(
      Object.values(db_explores).map((explore_id) => {
        const [model, explore] = explore_id.split("::");
        return sdk.ok(
          sdk.lookml_model_explore({
            lookml_model_name: model,
            explore_name: explore,
            fields:
              "name,id,label,model_name,fields(dimensions(name,label,label_short,view_label))",
          })
        );
      })
    );

    return NextResponse.json({
      message: "Fields retrieved successfully",
      models,
      explores,
    });
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch fields",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
