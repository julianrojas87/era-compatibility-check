import React, { useState } from "react";
import { Divider, Icon, Button, FlexboxGrid } from "rsuite";
import { exportToPdf, exportRoutesToExcel } from "../utils/Export";

async function onPdf(props) {
  props.setPdfLoading(true);
  await exportToPdf(props);
  props.setPdfLoading(false);
}

async function onExcel(props) {
  props.setExcelLoading(true);
  await exportRoutesToExcel(props);
  props.setExcelLoading(false);
}

export function RoutesExport({
  routes,
  from,
  to,
  graphStore,
  compatibilityVehicleType,
  checkCompatibility,
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  if (routes.length === 0) return null;

  return (
    <>
      <Divider />
      <FlexboxGrid justify="space-around">
        <Button
          appearance="primary"
          onClick={() => {
            onPdf({
              setPdfLoading,
              from,
              to,
              routes,
              graphStore,
              compatibilityVehicleType,
              checkCompatibility,
            });
          }}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <Icon icon="spinner" pulse />
          ) : (
            <Icon icon="file-pdf-o" />
          )}{" "}
          Export to PDF
        </Button>
        <Button
          appearance="primary"
          onClick={() => {
            onExcel({
              setExcelLoading,
              from,
              to,
              routes,
              graphStore,
              compatibilityVehicleType,
              checkCompatibility,
            });
          }}
          disabled={excelLoading}
        >
          <Icon icon="file-excel-o" /> Export to Excel
        </Button>
      </FlexboxGrid>
    </>
  );
}
