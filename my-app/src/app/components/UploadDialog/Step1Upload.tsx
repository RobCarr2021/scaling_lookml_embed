import { Box, Button } from "@looker/components";

interface Step1UploadProps {
  onFileSelect: (file: File) => void;
  onNext: () => void;
  selectedFile: File | null;
}

const Step1Upload = ({
  onFileSelect,
  onNext,
  selectedFile,
}: Step1UploadProps) => {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" gap="medium">
      <Box flexGrow={1}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          <Button
            onClick={() => document.getElementById("fileInput")?.click()}
            outline
          >
            Select File
            <input
              id="fileInput"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </Button>
        </Box>
      </Box>
      <Box display="flex" justifyContent="flex-end" gap="small">
        <Button onClick={onNext} disabled={!selectedFile} color="key">
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default Step1Upload;
