"use client";
import { LookerEmbedDashboard, LookerEmbedSDK } from "@looker/embed-sdk";
import React, { MutableRefObject, useCallback, useRef } from "react";
interface EmbedDashboardProps {
  dashboardId?: string;
  theme_id: string;
  dashboard?: MutableRefObject<LookerEmbedDashboard>;
  setDashboard: (dashboard: LookerEmbedDashboard) => void;
  should_edit_ref: MutableRefObject<boolean>;
}

LookerEmbedSDK.initCookieless(
  process.env.NEXT_PUBLIC_LOOKER_HOST || "",
  "/api/looker/acquire-embed-session",
  "/api/looker/generate-embed-tokens"
);

const EmbedDashboard: React.FC<EmbedDashboardProps> = ({
  dashboardId,
  theme_id,
  setDashboard,
  should_edit_ref,
  dashboard,
}) => {
  const ref = useRef<boolean>(null);
  const handleDashboardLoaded = useCallback(() => {
    if (should_edit_ref.current && dashboard) {
      dashboard.current.edit();
      should_edit_ref.current = false;
    }
  }, [should_edit_ref, dashboard]);

  const dashboardRef = useCallback(
    (el: HTMLDivElement) => {
      if (el) {
        el.innerHTML = "";
      }
      if (dashboardId?.length) {
        if (ref.current) {
          return;
        }
        ref.current = true;
        LookerEmbedSDK.createDashboardWithId(dashboardId)
          .appendTo(el)
          .withTheme(theme_id)
          .on("dashboard:run:complete", handleDashboardLoaded)
          .build()
          .connect()
          .then((dashboard) => {
            setDashboard(dashboard);
          })
          // catch various errors which can occur in the process (note: does not catch 404 on content)
          .catch((error) => {
            console.error("An unexpected error occurred", error);
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme_id]
  );

  return <div className="looker-embed" ref={dashboardRef} />;
};

export default EmbedDashboard;
