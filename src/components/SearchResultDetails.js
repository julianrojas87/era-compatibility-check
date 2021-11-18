import React, { useState } from "react";
import { Modal, Button, ButtonToolbar, Panel, FlexboxGrid, Icon } from "rsuite";
import Utils from "../utils/Utils";
import { RDFS, ERA, SKOS } from "../utils/NameSpaces";
import { exportDetailsToExcel, exportDetailsToXml } from "../utils/Export";
import { getPhrase } from "../utils/Languages";
import { getNameFromIndex } from "../utils/Params";

const ITEM_STYLE = {
  fontFamily: "monospace",
  textAlign: "center",
  padding: "3px",
};

function getObjectProperty({ value }, graphStore, language) {
  const objectProperty = Utils.queryGraphStore({
    store: graphStore,
    s: value,
  });

  if (objectProperty && objectProperty[value]) {
    value =
      Utils.getLiteralInLanguage(
        objectProperty[value][SKOS.prefLabel],
        language
      ) ||
      Utils.getLiteralInLanguage(objectProperty[value][RDFS.label], language);
  }

  return getPhrase(value, language);
}

async function exportXML(tableData, setExportingStatus, type) {
  setExportingStatus(true);
  await exportDetailsToXml(tableData, type);
  setExportingStatus(false);
}

async function exportExcel(tableData, setExportingStatus, type) {
  setExportingStatus(true);
  await exportDetailsToExcel(tableData, type);
  setExportingStatus(false);
}

function mountTableData(rawData, id, graphStore, language) {
  return Object.keys(rawData[id])
    .map((k) => {
      const keyInfo = Utils.queryGraphStore({ store: graphStore, s: k });
      if (!keyInfo || !keyInfo[k]) {
        return null;
      }
      const index = keyInfo[k][ERA.rinfIndex];
      const label = keyInfo[k][RDFS.label];

      let value = rawData[id][k];

      if (Array.isArray(value)) {
        value = value.map((v, i) => getObjectProperty(v, graphStore, language));
      } else {
        value = getObjectProperty(value, graphStore, language);
      }

      return {
        index: Array.isArray(index)
          ? index[0].value
          : index
          ? index.value
          : index,
        label: Utils.getLiteralInLanguage(label, language),
        value,
      };
    })
    .filter((v) => v !== null);
}

function renderValues(value) {
  if (Array.isArray(value)) {
    return value.map((v, i) => {
      return <div key={i}>{renderValues(v)}</div>;
    });
  }

  return value.startsWith("http") ? (
    <a href={value} target="_blank">
      {decodeURIComponent(getNameFromIndex(value))}
    </a>
  ) : (
    value
  );
}

function sortByParameterName({ label: label1 }, { label: label2 }) {
  if (typeof label1 !== "string" || typeof label2 !== "string") {
    return 0;
  }
  return label1.localeCompare(label2);
}

export function SearchResultDetail({
  type,
  id,
  graphResult,
  graphStore,
  onClose,
  language,
}) {
  const [exportingStatus, setExportingStatus] = useState(false);
  const rawData = Utils.queryGraphStore({ store: graphResult, s: id });
  if (!rawData || !rawData[id]) {
    return null;
  }

  const tableData = mountTableData(rawData, id, graphStore, language);

  return (
    <Modal show={true} onHide={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>{getPhrase("details", language)}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Panel
          shaded
          style={{ margin: "1rem" }}
          header={
            <a href={id} target="_blank">
              {getObjectProperty({ value: id }, graphResult, language) + " "}
              <Icon icon="external-link" />
            </a>
          }
        >
          {tableData
            .sort(sortByParameterName)
            .map(({ index, label, value }, i) => {
              return (
                <div key={label}>
                  <FlexboxGrid
                    style={{ backgroundColor: i % 2 ? "#f4f4fa" : "#fff" }}
                  >
                    <FlexboxGrid.Item colspan={4} style={ITEM_STYLE}>
                      {index}
                    </FlexboxGrid.Item>
                    <FlexboxGrid.Item colspan={6} style={ITEM_STYLE}>
                      {label}
                    </FlexboxGrid.Item>
                    <FlexboxGrid.Item colspan={14}>
                      {renderValues(value)}
                    </FlexboxGrid.Item>
                  </FlexboxGrid>
                </div>
              );
            })}
        </Panel>
      </Modal.Body>
      <Modal.Footer>
        <ButtonToolbar style={{ justifyContent: "right", display: "flex" }}>
          <Button
            appearance="link"
            disabled={exportingStatus}
            onClick={() => exportExcel(tableData, setExportingStatus, type)}
            loading={exportingStatus}
          >
            {getPhrase("exportExcel", language)}
          </Button>
          <Button
            appearance="link"
            disabled={exportingStatus}
            onClick={() => exportXML(tableData, setExportingStatus, type)}
            loading={exportingStatus}
          >
            {getPhrase("exportXML", language)}
          </Button>
          <Button onClick={onClose} appearance="subtle">
            {getPhrase("close", language)}
          </Button>
        </ButtonToolbar>
      </Modal.Footer>
    </Modal>
  );
}
