"use client";

import UploadDialog from "@/app/components/UploadDialog/index";
import { Box, Select, SelectOptionObject } from "@looker/components";
import { IDashboard } from "@looker/sdk";
import { useMemo, useState } from "react";
import ProgressButton from "./ProgressButton";
const DashboardHeader = ({
  dashboards,
  selectDashboard,
  selected_dashboard,
  refreshDashboards,
  reloadDashboard,
}: {
  selected_dashboard?: IDashboard;
  dashboards: IDashboard[];
  selectDashboard: (dashboard: IDashboard, should_edit?: boolean) => void;
  refreshDashboards: (new_dashboard?: IDashboard) => void;
  reloadDashboard: () => void;
}) => {
  const [search, setSearch] = useState("");
  const [copy_dashboard_loading, setCopyDashboardLoading] = useState(false);

  const filtered_select_options: SelectOptionObject[] = useMemo(() => {
    return dashboards.reduce((acc, dashboard) => {
      if (search?.length) {
        if (dashboard.title.toLowerCase().includes(search.toLowerCase())) {
          acc.push({
            label: dashboard.title,
            value: dashboard.id,
            description: dashboard.description || "",
          });
        }
      } else {
        acc.push({ label: dashboard.title, value: dashboard.id });
      }
      return acc;
    }, [] as SelectOptionObject[]);
  }, [search, dashboards]);

  const copyDashboard = async () => {
    setCopyDashboardLoading(true);
    const res = await fetch("/api/looker/copy-lookml-dashboard", {
      method: "POST",
      body: JSON.stringify({ dashboard_id: selected_dashboard?.id }),
    });
    const data = await res.json();
    refreshDashboards();
    selectDashboard(data.dashboard, true);
    setCopyDashboardLoading(false);
  };
  const sdb: IDashboard | undefined = useMemo(() => {
    return selected_dashboard || dashboards[0];
  }, [selected_dashboard, dashboards]);

  return (
    <div className="dashboard-tabs">
      <Box
        className="tabs-container"
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
      >
        <Select
          key={sdb?.id}
          maxWidth={400}
          options={filtered_select_options}
          placeholder="Select Dashboard"
          isFilterable
          value={sdb?.id}
          defaultValue={sdb?.id}
          onChange={(value) => {
            const found = dashboards.find((d) => d.id === value);
            selectDashboard(found, false);
          }}
          onFilter={setSearch}
        />
        {selected_dashboard?.id.includes("::") ? (
          <ProgressButton
            flexGrow={false}
            onClick={copyDashboard}
            is_loading={copy_dashboard_loading}
            progress_color="white"
          >
            Customize
          </ProgressButton>
        ) : (
          <UploadDialog
            dashboard_id={selected_dashboard?.id}
            reloadDashboard={reloadDashboard}
          />
        )}
      </Box>
    </div>
  );
};

export default DashboardHeader;
