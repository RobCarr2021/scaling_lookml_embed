"use client";
import { Box, ComponentsProvider } from "@looker/components";
import { LookerEmbedDashboard } from "@looker/embed-sdk";
import { IDashboard } from "@looker/sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import DashboardHeader from "./DashboardHeader";
import EmbedDashboard from "./EmbedDashboard";

const Main = () => {
  const dashboardRef = useRef<LookerEmbedDashboard | null>(null);
  const [selected_dashboard, setSelectedDashboard] = useState<IDashboard>();
  const should_edit_ref = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const reloadDashboard = () => {
    setRefresh((p) => p + 1);
  };

  const { data, mutate, isLoading } = useSWR<{
    dashboards: IDashboard[];
    lookml_dashboards: IDashboard[];
  }>("/api/looker/dashboards", (url) => fetch(url).then((res) => res.json()), {
    revalidateOnFocus: true,
  });

  const refreshDashboards = (new_dashboard?: IDashboard) => {
    if (new_dashboard) {
      mutate({ ...data, dashboards: [new_dashboard, ...data.dashboards] });
    } else {
      mutate(data);
    }
  };

  useEffect(() => {
    if (selected_dashboard && dashboardRef.current) {
      dashboardRef.current.loadDashboard(selected_dashboard.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected_dashboard, dashboardRef.current]);

  const dashboards = useMemo(() => {
    const out: IDashboard[] = [];
    if (data) {
      data.dashboards?.forEach((dashboard) => {
        out.push(dashboard);
      });
      data.lookml_dashboards?.forEach((dashboard) => {
        if (out.every((d) => d.lookml_link_id !== dashboard.id)) {
          out.push(dashboard);
        }
      });
    }
    return out;
  }, [data]);

  useEffect(() => {
    if (!isLoading && dashboards.length && !selected_dashboard) {
      setSelectedDashboard(dashboards[0]);
    }
  }, [isLoading, dashboards, selected_dashboard]);

  const onSelectDashboard = (db: IDashboard, should_edit?: boolean) => {
    setSelectedDashboard(db);
    if (should_edit && dashboardRef.current) {
      should_edit_ref.current = true;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  } else {
    return (
      <ComponentsProvider>
        <Box id="test" display="flex" flexDirection="column" flexGrow={1}>
          <DashboardHeader
            dashboards={dashboards}
            selected_dashboard={selected_dashboard}
            selectDashboard={onSelectDashboard}
            refreshDashboards={refreshDashboards}
            reloadDashboard={reloadDashboard}
          />
          {selected_dashboard ? (
            <EmbedDashboard
              key={refresh}
              dashboardId={selected_dashboard.id}
              theme_id="bl"
              setDashboard={(dashboard) => {
                dashboardRef.current = dashboard;
              }}
              should_edit_ref={should_edit_ref}
              dashboard={dashboardRef}
            />
          ) : null}
        </Box>
      </ComponentsProvider>
    );
  }
};

export default Main;
