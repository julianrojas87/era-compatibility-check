import React from "react";
import { parse as wktParse } from 'wellknown';
import { Alert } from "rsuite";
import { saveAs } from "file-saver";
import convert from "xml-js";
import ExcelJS from "exceljs";
import {
  Document,
  Page,
  Text,
  Link,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import Utils from "./Utils";
import { ERA, RDFS, SKOS, WGS84, RDF } from "./NameSpaces";
import { getNameFromIndex } from "./Params";
import { getPhrase, getCurrentLanguage } from "./Languages";

const styles = StyleSheet.create({
  page: {
    flexDirection: "col",
    backgroundColor: "#FFFFFF",
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
    border: "3px solid black",
    borderRadius: "7px",
  },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  titleNumber: {
    //width: "20px",
    height: "20px",
    backgroundColor: "#333",
    color: "#fff",
    borderRadius: "50%",
    textAlign: "center",
    marginTop: "10px",
  },
  titleText: {
    height: "20px",
    fontSize: "12px",
    margin: "10px",
  },
  stepBlock: {
    marginLeft: "9px",
    borderLeft: "2px dashed #333",
  },
  trackView: {
    flexDirection: "row",
    justifyContent: "flex-start",
    padding: "10px",
  },
  trackText: {
    fontSize: "12px",
    marginLeft: "7px",
    fontWeight: "bold",
  },
  trackLink: {
    fontSize: "12px",
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    margin: "10px",
  },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: { margin: "auto", marginTop: 5, fontSize: 10 },
});

export async function exportSearchToExcel(
  rawSearchResult,
  paramsType,
  language
) {
  const workbook = new ExcelJS.Workbook();

  workbook.properties.date1904 = true;
  workbook.calcProperties.fullCalcOnLoad = true;

  const worksheet = workbook.addWorksheet("Result");

  if (paramsType === "OP") {
    worksheet.columns = [
      { header: getPhrase("name", language), key: "name", width: 64 },
      { header: "UOPID", key: "uopid", width: 32 },
      { header: getPhrase("type", language), key: "type", width: 64 },
    ];

    const nameCol = worksheet.getColumn("name");
    nameCol.values = [
      getPhrase("name", language),
      ...rawSearchResult.map((v) => v.name),
    ];

    const uopidCol = worksheet.getColumn("uopid");
    uopidCol.values = ["UOPID", ...rawSearchResult.map((v) => v.uopid)];

    const typeCol = worksheet.getColumn("type");
    typeCol.values = [
      getPhrase("type", language),
      ...rawSearchResult.map((v) => v.type),
    ];
  } else {
    worksheet.columns = [
      { header: getPhrase("solId", language), key: "solId", width: 64 },
      { header: getPhrase("imCode", language), key: "imCode", width: 16 },
      {
        header: getPhrase("nationalLine", language),
        key: "nationalLine",
        width: 32,
      },
      {
        header: getPhrase("operationalPointStart", language),
        key: "operationalPointStart",
        width: 32,
      },
      {
        header: getPhrase("operationalPointEnd", language),
        key: "operationalPointEnd",
        width: 32,
      },
      {
        header: getPhrase("lengthOfSOL", language),
        key: "lengthOfSOL",
        width: 16,
      },
    ];

    const solIdCol = worksheet.getColumn("solId");
    solIdCol.values = [
      getPhrase("solId", language),
      ...rawSearchResult.map((v) => v.solId),
    ];

    const imCodeCol = worksheet.getColumn("imCode");
    imCodeCol.values = [
      getPhrase("imCode", language),
      ...rawSearchResult.map((v) => v.imCode),
    ];

    const nationalLineCol = worksheet.getColumn("nationalLine");
    nationalLineCol.values = [
      getPhrase("nationalLine", language),
      ...rawSearchResult.map((v) => v.nationalLine),
    ];

    const operationalPointStartCol = worksheet.getColumn(
      "operationalPointStart"
    );
    operationalPointStartCol.values = [
      getPhrase("operationalPointStart", language),
      ...rawSearchResult.map((v) => v.operationalPointStart),
    ];

    const operationalPointEndCol = worksheet.getColumn("operationalPointEnd");
    operationalPointEndCol.values = [
      getPhrase("operationalPointEnd", language),
      ...rawSearchResult.map((v) => v.operationalPointEnd),
    ];

    const lengthOfSOLCol = worksheet.getColumn("lengthOfSOL");
    lengthOfSOLCol.values = [
      getPhrase("lengthOfSOL", language),
      ...rawSearchResult.map((v) => v.lengthOfSOL),
    ];
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], { type: "application/xlsx;charset=utf-8" });
  saveAs(blob, "export.xlsx");
}

function mountSteps({
  routes,
  graphStore,
  fetchImplementationTile,
  compatibilityVehicleType,
  checkCompatibility,
}) {
  return routes.map(async (r) => {
    // Get the sequence of steps of the route
    const steps = {};
    const tracks = [];
    let report = [];

    for (const node of r.path.nodes) {
      let op = Utils.getOPFromMicroNetElement(node.id, graphStore);

      if (op) {
        // NetElement belongs to an OP
        if (!op[ERA.opType]) {
          // OP belongs to a tile we haven't fetched yet
          await fetchImplementationTile({
            coords: wktParse(op[WGS84.location][GEOSPARQL.asWKT].value).coordinates,
            rebuild: true, force: true
          });
          op = Utils.getOPFromMicroNetElement(node.id, graphStore);
        }

        if (!steps[op['@id']]) {
          steps[op['@id']] = op;
        }
      } else {
        // NetElement belongs to a SoL
        tracks.push({
          id: Utils.getTrackIdFromMicroNetElement(node.id, graphStore),
          length: node.length
        });
      }
    }

    // Flag that we have data to perform route compatibility
    if (compatibilityVehicleType) {
      report = checkCompatibility(tracks);
    }

    return { steps, tracks, report };
  });
}

function getLabel(sub, p, graphStore) {
  let s = null;

  if (typeof sub === 'object') {
    s = sub.value;
  } else {
    s = sub;
  }

  if (s) {
    const l = Utils.queryGraphStore({
      store: graphStore,
      s: s
    })

    if (l) {
      return Utils.getLiteralInLanguage(l[s][p], getCurrentLanguage());
    } else {
      return (<span style={{ color: 'red' }}>{`unknown term ${p} in KG`}</span>)
    }
  }
}

function formatValues(values, graphStore) {
  if (values || values === false) {
    const res = [];
    if (Array.isArray(values)) {
      for (const v of values) {
        if (Utils.isValidHttpUrl(v.value)) {
          res.push(
            <Link key={v.value} style={styles.tableCell} src={v.value}>
              {getLabel(v, SKOS.prefLabel, graphStore)}
            </Link>
          );
        } else {
          res.push(<Text key={v.value} style={styles.tableCell}>{v.value}</Text>);
        }
      }
    } else {
      if (typeof values === 'object') {
        if (Utils.isValidHttpUrl(values.value)) {
          res.push(
            <Link key={values.value} src={values.value} style={styles.tableCell}>
              {getLabel(values, SKOS.prefLabel, graphStore)}
            </Link>
          );
        } else {
          res.push(<Text key={values.value} style={styles.tableCell}>{values.value}</Text>);
        }
      } else {
        res.push(
          <Link key={values} src={values} style={styles.tableCell}>
            {getLabel(values, RDFS.label, graphStore)}
          </Link>
        );
      }
    }
    return res;
  } else {
    return <Text style={{ ...styles.tableCell, color: "orange" }}>no data</Text>;
  }
}

function formatValuesForExcel(values, graphStore, valuesArray) {
  if (values || values === false) {
    if (Array.isArray(values)) {
      const res = [];
      for (const v of values) {
        res.push(getLabel(v.value, SKOS.prefLabel, graphStore));
      }
      valuesArray.push(res.join(", "))
    } else {
      if(typeof values === 'object') {
        if (Utils.isValidHttpUrl(values.value)) {
          valuesArray.push({
            text: getLabel(values, SKOS.prefLabel, graphStore),
            hyperlink: values.value,
          });
        } else {
          valuesArray.push(values.value);
        }
      } else {
        valuesArray.push({
          text: getLabel(values, RDFS.label, graphStore),
          hyperlink: values,
        });
      }
    }
  } else {
    valuesArray.push("no data");
  }
}

function getCompatibility(comp) {
  switch (comp) {
    case "YES":
      return (<Text style={{ ...styles.tableCell, color: "green" }}>YES</Text>);
    case "NO":
      return (<Text style={{ ...styles.tableCell, color: "red" }}>NO</Text>);
    case "UNKNOWN":
      return (<Text style={{ ...styles.tableCell, color: "orange" }}>unknown</Text>);
  }
}

function getTrackDescription(desc, reps, graphStore, compatibilityVehicleType) {
  return (
    <View>
      <View style={styles.trackView}>
        <Text style={styles.trackText}>Track: </Text>
        <Link style={styles.trackLink} src={desc.id.value}>
          {' ' + getLabel(desc.id, ERA.trackId, graphStore)}
        </Link>
      </View>
      {reps && (
        <View>
          <View style={styles.trackView}>
            <Text style={styles.trackText}>Vehicle Type: </Text>
            <Link style={styles.trackLink} src={compatibilityVehicleType}>
              {getLabel(
                compatibilityVehicleType,
                ERA.typeVersionNumber,
                graphStore
              )}
            </Link>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Properties</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Compatible</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Track</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Vehicle</Text>
              </View>
            </View>
            {Object.keys(reps).map((rep, i) => {
              const compatibility = reps[rep].compatible ? 'YES'
                : reps[rep].compatible === false ? 'NO'
                  : reps[rep].values.track === ERA.notApplicable ? 'YES'
                    : 'UNKNOWN';
              return (
                <View style={styles.tableRow} key={`row-${i}`}>
                  <View style={styles.tableCol}>
                    {reps[rep].predicates.map((p, i) => {
                      return (
                        <Link key={`predicate-${i}`} style={styles.tableCell} src={p}>
                          {getLabel(p, RDFS.label, graphStore)}
                        </Link>
                      );
                    })}
                  </View>
                  <View style={styles.tableCol}>
                    {getCompatibility(compatibility)}
                  </View>
                  <View style={styles.tableCol}>
                    {formatValues(reps[rep].values.track, graphStore)}
                  </View>
                  <View style={styles.tableCol}>
                    {formatValues(reps[rep].values.vehicle, graphStore)}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function PdfDocument({ panels, graphStore, compatibilityVehicleType }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {panels.map(({ steps, tracks, report }, i) => {
          return (
            <View key={"route-" + i} style={styles.section}>
              <Text>Route {i + 1}</Text>
              {Object.keys(steps).map((key, j) => {
                return (
                  <View key={"step-" + j}>
                    <View style={styles.sectionTitle}>
                      <Text style={styles.titleNumber}> {j + 1} </Text>
                      <Link src={key} style={styles.titleText}>
                        {`${Utils.getLiteralInLanguage(steps[key][RDFS.label], getCurrentLanguage())} (${Utils.getLiteralInLanguage(steps[key][ERA.opType][SKOS.prefLabel], getCurrentLanguage())})`}
                      </Link>
                    </View>
                    <View style={styles.stepBlock}>
                      {j < Object.keys(steps).length - 1
                        ? getTrackDescription(
                          tracks[j],
                          report[j],
                          graphStore,
                          compatibilityVehicleType
                        )
                        : null}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function exportToPdf(props) {
  try {
    const panels = await Promise.all(mountSteps(props));
    const blob = await pdf(
      <PdfDocument
        panels={panels}
        graphStore={props.graphStore}
        compatibilityVehicleType={props.compatibilityVehicleType}
      />
    ).toBlob();
    saveAs(blob, `${Utils.getOPInfo(props.from, props.graphStore)[ERA.uopid].value} - ${Utils.getOPInfo(props.to, props.graphStore)[ERA.uopid].value}.pdf`);
  } catch (ex) {
    console.error(props, ex);
  }
}

export async function exportDetailsToExcel(data) {
  const workbook = new ExcelJS.Workbook();

  workbook.properties.date1904 = true;
  workbook.calcProperties.fullCalcOnLoad = true;

  const worksheet = workbook.addWorksheet("Result");

  worksheet.columns = [
    { header: "Index", key: "index", width: 32 },
    { header: "Label", key: "label", width: 64 },
    { header: "Value", key: "value", width: 128 },
  ];

  const indexCol = worksheet.getColumn("index");
  indexCol.values = ["Index", ...data.map((v) => v.index)];
  const labelCol = worksheet.getColumn("label");
  labelCol.values = ["Label", ...data.map((v) => v.label)];
  const valueCol = worksheet.getColumn("value");
  valueCol.values = ["Value", ...data.map((v) => v.value)];

  const buffer = await workbook.xlsx.writeBuffer();

  let blob = new Blob([buffer], { type: "application/xlsx;charset=utf-8" });
  saveAs(blob, "export.xlsx");
}

export async function exportDetailsToXml(data, type) {
  const xmlData = {
    _declaration: {
      _attributes: {
        version: "1.0",
        encoding: "UTF-8",
      },
    },
    RINFData: {},
  };

  const formattedData = data.map((v) => {
    if (Array.isArray(v.value)) {
      return {
        value: v.value.map((value) => {
          return {
            _attributes: {
              ...v,
              value,
            },
          };
        }),
      };
    }

    return {
      _attributes: {
        ...v,
      },
    };
  });

  if (type === "SOL")
    xmlData.RINFData = { SectionOfLine: { data: formattedData } };
  else xmlData.RINFData = { OperationalPoint: { data: formattedData } };

  const result = convert.json2xml(xmlData, { compact: true, spaces: "\t" });
  let blob = new Blob([result], { type: "text/xml;charset=utf-8" });
  saveAs(blob, "export.xml");
}

/**
 * each route will be generated in a separated excel file
 **/
export async function exportRoutesToExcel(props) {
  try {
    const panels = await Promise.all(mountSteps(props));
    panels.forEach((panel, index) => exportRouteToExcel(props, panel, index));
  } catch (ex) {
    console.error(props, ex);
  }
}

async function exportRouteToExcel(props, panel, index) {
  try {
    const workbook = new ExcelJS.Workbook();

    workbook.properties.date1904 = true;
    workbook.calcProperties.fullCalcOnLoad = true;

    mountRouteTab(props, panel, workbook);
    mountVehiclesTab(props, panel, workbook);

    const buffer = await workbook.xlsx.writeBuffer();

    let blob = new Blob([buffer], { type: "application/xlsx;charset=utf-8" });
    saveAs(blob, `${Utils.getOPInfo(props.from, props.graphStore)[ERA.uopid].value} - ${Utils.getOPInfo(props.to, props.graphStore)[ERA.uopid].value}_${index + 1}.xlsx`);
  } catch (ex) {
    console.error(props, panel, ex);
  }
}

function mountVehiclesTab(props, panel, workbook) {
  const { report } = panel;

  report.forEach((r, index) =>
    mountVehicleTab(props, panel, workbook, r, index)
  );
}

function mountVehicleTab(props, panel, workbook, report, index) {
  const { graphStore } = props;
  const { tracks } = panel;
  const tabName = `Track ${getLabel(tracks[index].id, ERA.trackId, props.graphStore)}`;

  const vehicleTab = workbook.addWorksheet(tabName);

  vehicleTab.columns = [
    { header: "Properties", key: "properties", width: 32 },
    { header: "Compatible", key: "compatible", width: 12 },
    { header: "Track", key: "track", width: 32 },
    { header: "Vehicle", key: "vehicle", width: 32 }
  ];

  const propertiesCol = ["Properties"];
  const compatibleCol = ["Compatible"];
  const trackCol = ["Track"];
  const vehicleCol = ["Vehicle"];

  Object.keys(report).map(rep => {
    const compatibility = report[rep].compatible ? 'YES'
      : report[rep].compatible === false ? 'NO'
      : report[rep].values.track === ERA.notApplicable ? 'YES'
      : 'unknown';

    if(report[rep].predicates.length > 1) {
      propertiesCol.push(report[rep].predicates.map(p => getLabel(p, RDFS.label, props.graphStore)).join(', '));
    } else {
      propertiesCol.push({
        text: getLabel(report[rep].predicates[0], RDFS.label, props.graphStore),
        hyperlink: report[rep].predicates[0]
      })
    }

    compatibleCol.push(compatibility);

    formatValuesForExcel(
      report[rep].values.track,
      graphStore,
      trackCol
    );

    formatValuesForExcel(
      report[rep].values.vehicle,
      graphStore,
      vehicleCol
    );
  });

  vehicleTab.getColumn("properties").values = propertiesCol;
  vehicleTab.getColumn("compatible").values = compatibleCol;
  vehicleTab.getColumn("track").values = trackCol;
  vehicleTab.getColumn("vehicle").values = vehicleCol;
}

function mountRouteTab(props, panel, workbook) {
  const { graphStore } = props;
  const { steps, tracks } = panel;

  const routeTab = workbook.addWorksheet("Route overview");

  routeTab.columns = [
    { header: "Position", key: "position", width: 8 },
    { header: "Name", key: "name", width: 56 },
    { header: "Type", key: "type", width: 24 },
    { header: "Track", key: "track", width: 24 },
  ];

  const positionCol = ["Position"];
  const nameCol = ["Name"];
  const typeCol = ["Type"];
  const trackCol = ["Track"];

  Object.keys(steps).forEach((step, i) => {
    const OPLink = steps[step]["@id"];
    positionCol.push(i + 1);
    nameCol.push({
      text: steps[step][RDFS.label].value,
      hyperlink: OPLink,
      tooltip: OPLink,
    });

    typeCol.push({
      text: Utils.getLiteralInLanguage(steps[step][ERA.opType][SKOS.prefLabel], getCurrentLanguage()),
      hyperlink: steps[step][ERA.opType]["@id"],
      tooltip: steps[step][ERA.opType]["@id"]
    });

    if (tracks[i]) {
      const trackLink = tracks[i].id.value;
      trackCol.push({
        text: getLabel(tracks[i].id.value, ERA.trackId, graphStore),
        hyperlink: trackLink,
        tooltip: trackLink,
      });
    }
  });

  routeTab.getColumn("position").values = positionCol;
  routeTab.getColumn("name").values = nameCol;
  routeTab.getColumn("type").values = typeCol;
  routeTab.getColumn("track").values = trackCol;
}

export async function exportSearchToXml(data, paramsType) {
  try {
    const xmlData = {
      _declaration: {
        _attributes: {
          version: "1.0",
          encoding: "UTF-8",
        },
      },
      RINFData: {},
    };

    if (paramsType === "OP") {
      xmlData.RINFData = {
        OperationalPoint: data.map((v) => {
          return {
            OPName: { _attributes: { value: v.name } },
            UniqueOPID: { _attributes: { value: v.uopid } },
            OPTafTapCode: { _attributes: { value: v.tafTAPCode } },
            OPType: { _attributes: { value: v.opType, OptionalValue: v.type } },
            OPGeographicalLocation: { _attributes: { value: v.gLocation } },
          };
        }),
      };
    } else {
      xmlData.RINFData = {
        SectionOfLine: data.map((v) => {
          return {
            SOLIMCode: { _attributes: { value: v.imCode } },
            SOLLineIdentification: { _attributes: { value: v.solId } },
            SOLOPStart: { _attributes: { value: v.operationalPointStart } },
            SOLOPEnd: {
              _attributes: {
                value: v.opType,
                OptionalValue: v.operationalPointEnd,
              },
            },
            SOLLength: { _attributes: { value: v.lengthOfSOL } },
            SOLNature: { _attributes: { value: v.nature } },
            SOLTrack: { _attributes: { value: v.track } },
          };
        }),
      };
    }

    const result = convert.json2xml(xmlData, { compact: true, spaces: "\t" });
    const blob = new Blob([result], { type: "text/xml;charset=utf-8" });
    saveAs(blob, `${paramsType}.xml`);
  } catch (ex) {
    Alert.error(`An error occurred. ${ex.message || ex}`, 10000);
  }
}

export function mountSearchExportData({
  result,
  currentSearchParams,
  store,
  language,
}) {
  const { type } = currentSearchParams;
  const rawResult = Utils.queryGraphStore({ store: result });
  const rawSearchResultForExport = [];

  for (const key of Object.keys(rawResult || {})) {
    const RDFType = rawResult[key][RDF.type]
      ? Array.isArray(rawResult[key][RDF.type])
        ? rawResult[key][RDF.type].map((v) => v.value)
        : [rawResult[key][RDF.type].value]
      : [];

    const correctType =
      (type === "SOL" && RDFType.includes(ERA.SectionOfLine)) ||
      (type === "OP" && RDFType.includes(ERA.OperationalPoint));

    if (correctType) {
      const eraOpType = Array.isArray(rawResult[key][ERA.opType])
        ? rawResult[key][ERA.opType][0]
        : rawResult[key][ERA.opType];
      if (type === "OP") {
        const t = Utils.queryGraphStore({
          store: store,
          s: eraOpType,
        });

        const name = Utils.getLiteralInLanguage(
          rawResult[key][RDFS.label],
          language
        );
        const opType = t
          ? t[rawResult[key][ERA.opType].value]
            ? t[rawResult[key][ERA.opType].value][SKOS.prefLabel]
            : undefined
          : undefined;
        const opTypeName = Utils.getLiteralInLanguage(opType, language);
        const uopid = rawResult[key][ERA.uopid].value;
        const opRawType = getNameFromIndex(eraOpType.value);
        const gLocation =
          rawResult[key]["http://www.w3.org/2003/01/geo/wgs84_pos#location"]
            .value;
        const tafTAPCode = Utils.getLiteralInLanguage(
          rawResult[key]["http://data.europa.eu/949/tafTAPCode"],
          language
        );

        rawSearchResultForExport.push({
          name,
          uopid,
          type: opTypeName,
          opType: opRawType,
          gLocation,
          tafTAPCode,
        });
      } else {
        const solId = rawResult[key][RDFS.label].value;
        const imCode = rawResult[key][ERA.imCode].value;
        const nationalLine = getNameFromIndex(
          rawResult[key][ERA.lineNationalId].value
        );
        const operationalPointStart = getNameFromIndex(
          rawResult[key][ERA.opStart].value
        );
        const operationalPointEnd = getNameFromIndex(
          rawResult[key][ERA.opEnd].value
        );
        const lengthOfSOL = rawResult[key][ERA.length].value;
        const nature = getNameFromIndex(
          rawResult[key]["http://data.europa.eu/949/solNature"].value
        );
        const track = rawResult[key]["http://data.europa.eu/949/track"].value;

        rawSearchResultForExport.push({
          solId,
          imCode,
          nationalLine,
          operationalPointStart,
          operationalPointEnd,
          lengthOfSOL,
          nature,
          track,
        });
      }
    }
  }

  return rawSearchResultForExport;
}
