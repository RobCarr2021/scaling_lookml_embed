import {
  Box,
  Button,
  Pagination,
  Table,
  TableBody,
  TableDataCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@looker/components";

interface CSVData {
  [key: string]: string;
}

interface Step2PreviewProps {
  csvData: CSVData[];
  headers: string[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onBack: () => void;
  onNext: () => void;
}

const ROWS_PER_PAGE = 10;

const Step2Preview = ({
  csvData,
  headers,
  currentPage,
  totalPages,
  onPageChange,
  onBack,
  onNext,
}: Step2PreviewProps) => {
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentPageData = csvData.slice(startIndex, endIndex);

  return (
    <Box display="flex" flexDirection="column" height="100%" gap="medium">
      <Box flexGrow={1}>
        {csvData.length > 0 && (
          <Box>
            <Table>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeaderCell key={header}>{header}</TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPageData.map((row, index) => (
                  <TableRow key={index}>
                    {headers.map((header) => (
                      <TableDataCell key={`${index}-${header}`}>
                        {row[header]}
                      </TableDataCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box display="flex" justifyContent="center" mt="medium">
              <Pagination
                current={currentPage}
                pages={totalPages}
                onChange={onPageChange}
              />
            </Box>
          </Box>
        )}
      </Box>
      <Box display="flex" justifyContent="space-between" gap="small">
        <Button onClick={onBack}>Back</Button>
        <Button onClick={onNext} color="key">
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default Step2Preview;
