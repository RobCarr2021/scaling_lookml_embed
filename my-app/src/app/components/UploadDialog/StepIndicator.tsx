import { Box, Flex, Text } from "@looker/components";

interface StepIndicatorProps {
  step: number;
  label: string;
  currentStep: number;
}

const StepIndicator = ({ step, label, currentStep }: StepIndicatorProps) => {
  const isComplete = currentStep > step;
  const isCurrent = currentStep === step;

  return (
    <Flex alignItems="center" gap="small">
      <Box
        width="24px"
        height="24px"
        borderRadius="50%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={isComplete ? "key" : isCurrent ? "background" : "background"}
        border={isComplete ? "none" : "1px solid"}
        borderColor={isCurrent ? "key" : "text3"}
      >
        <Text color={isComplete ? "white" : isCurrent ? "key" : "text3"}>
          {step}
        </Text>
      </Box>
      <Text color={isComplete ? "key" : isCurrent ? "key" : "text3"}>
        {label}
      </Text>
    </Flex>
  );
};

export default StepIndicator;
