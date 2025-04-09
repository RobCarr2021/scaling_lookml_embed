import { Box, Button } from "@looker/components";
import Joins from "../Joins";
import { IJoinConfig } from "../Joins/types";
import ProgressButton from "../ProgressButton";

interface Step3JoinsProps {
  dashboard_id: string;
  headers: string[];
  joinConfig: IJoinConfig | null;
  onJoinConfigChange: (config: IJoinConfig) => void;
  onBack: () => void;
  onUpload: () => void;
  isUploading: boolean;
}

const Step3Joins = ({
  dashboard_id,
  headers,
  joinConfig,
  onJoinConfigChange,
  onBack,
  onUpload,
  isUploading,
}: Step3JoinsProps) => {
  return (
    <Box display="flex" flexDirection="column" height="100%" gap="medium">
      <Box flexGrow={1}>
        <Joins
          dashboard_id={dashboard_id}
          to_field_options={headers.map((header) => ({
            label: header,
            value: header,
          }))}
          onChange={onJoinConfigChange}
        />
      </Box>
      <Box display="flex" justifyContent="space-between" gap="small">
        <Button onClick={onBack}>Back</Button>
        <ProgressButton
          flexGrow={false}
          onClick={onUpload}
          disabled={!joinConfig?.joins.every((j) => j.from_field && j.to_field)}
          progress_color="white"
          is_loading={isUploading}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </ProgressButton>
      </Box>
    </Box>
  );
};

export default Step3Joins;
