"use client";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  Flex,
  Heading,
} from "@looker/components";
import Papa from "papaparse";
import { useState } from "react";
import useSWR from "swr";
import { IJoinConfig, ILookmlFields } from "../Joins/types";
import AnimatedLogo from "../LoadingAnimation";
import Step1Upload from "./Step1Upload";
import Step2Preview from "./Step2Preview";
import Step3Joins from "./Step3Joins";
import StepIndicator from "./StepIndicator";

interface CSVData {
  [key: string]: string;
}

const UploadDialog = ({
  dashboard_id,
  reloadDashboard,
}: {
  dashboard_id: string;
  reloadDashboard: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStep, setCurrentStep] = useState(1);
  const [joinConfig, setJoinConfig] = useState<IJoinConfig | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setCurrentPage(1);
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as CSVData[];
        setCsvData(data);
        setHeaders(Object.keys(data[0] || {}));
        setCurrentStep(2);
      },
    });
  };

  const handleUpload = async () => {
    if (selectedFile) {
      setCurrentStep(4);
      setIsUploading(true);
      // Handle file upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("joins", JSON.stringify(joinConfig!));

      await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Upload failed");
          }
          return response.json();
        })
        .catch((error) => {
          console.error("Error uploading file:", error);
        })
        .finally(() => {
          setIsUploading(false);
        });
      await new Promise((resolve) => setTimeout(resolve, 5000));
      reloadDashboard();
      setSelectedFile(null);
      setIsOpen(false);
      setCurrentStep(1);
    }
    setIsUploading(false);
  };

  const totalPages = Math.ceil(csvData.length / 10);

  const handleJoinConfigChange = (config: IJoinConfig) => {
    setJoinConfig(config);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _field_data = useSWR<ILookmlFields>(
    !(dashboard_id && isOpen)
      ? null
      : `/api/looker/fields?dashboard_id=${dashboard_id}`,
    (url) => fetch(url).then((res) => res.json())
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Upload
            onFileSelect={handleFileSelect}
            onNext={() => setCurrentStep(2)}
            selectedFile={selectedFile}
          />
        );
      case 2:
        return (
          <Step2Preview
            csvData={csvData}
            headers={headers}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <Step3Joins
            dashboard_id={dashboard_id}
            headers={headers}
            joinConfig={joinConfig}
            onJoinConfigChange={handleJoinConfigChange}
            onBack={() => setCurrentStep(2)}
            onUpload={handleUpload}
            isUploading={isUploading}
          />
        );
      case 4:
        return (
          <>
            <AnimatedLogo
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              height="100%"
              svg_height={150}
              svg_width={"auto"}
            />
            <Heading textAlign="center">Uploading your data...</Heading>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Upload Data</Button>
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        width="80vw"
        canClose={() => !isUploading}
      >
        <DialogHeader>Upload File</DialogHeader>
        <DialogContent style={{ height: "60vh" }}>
          <Box display="flex" flexDirection="column" height="100%" gap="large">
            <Flex justifyContent="space-between" alignItems="center" mb="large">
              <StepIndicator
                step={1}
                label="Upload CSV"
                currentStep={currentStep}
              />
              <Box width="100px" height="1px" bg="text3" />
              <StepIndicator
                step={2}
                label="Preview Data"
                currentStep={currentStep}
              />
              <Box width="100px" height="1px" bg="text3" />
              <StepIndicator
                step={3}
                label="Configure Joins"
                currentStep={currentStep}
              />
            </Flex>
            {renderStepContent()}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadDialog;
