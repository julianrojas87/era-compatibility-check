import React from "react";
import { Container, Table } from "rsuite";

import { getPhrase } from "../utils/Languages";

const { Column, HeaderCell, Cell, Pagination } = Table;

export default function SearchResult({
  data,
  pagination,
  loading,
  language,
  type,
}) {
  return (
    <Container>
      {type === "SOL" ? (
        <Table data={data} loading={loading} height={400} wordWrap={true}>
          <Column align="center" fixed flexGrow={1}>
            <HeaderCell>{getPhrase("solId", language)}</HeaderCell>
            <Cell dataKey="solId" />
          </Column>
          <Column align="center" fixed flexGrow={1}>
            <HeaderCell>{getPhrase("imCode", language)}</HeaderCell>
            <Cell dataKey="imCode" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("nationalLine", language)}</HeaderCell>
            <Cell dataKey="nationalLine" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("operationalPointStart", language)}</HeaderCell>
            <Cell dataKey="operationalPointStart" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("opStartLocation", language)}</HeaderCell>
            <Cell dataKey="opStartGeo" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("operationalPointEnd", language)}</HeaderCell>
            <Cell dataKey="operationalPointEnd" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("opEndLocation", language)}</HeaderCell>
            <Cell dataKey="opEndGeo" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("lengthOfSOL", language)}</HeaderCell>
            <Cell dataKey="lengthOfSOL" />
          </Column>
        </Table>
      ) : (
        <Table data={data} loading={loading} height={400} wordWrap={true}>
          <Column align="center" fixed flexGrow={1}>
            <HeaderCell>{getPhrase("name", language)}</HeaderCell>
            <Cell dataKey="name" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>UOPID</HeaderCell>
            <Cell dataKey="uopid" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("type", language)}</HeaderCell>
            <Cell dataKey="type" />
          </Column>
          <Column flexGrow={1}>
            <HeaderCell>{getPhrase("geographicalLocation", language)}</HeaderCell>
            <Cell dataKey="geoLocation" />
          </Column>
        </Table>
      )}

      <Pagination
        showLengthMenu={false}
        activePage={pagination.activePage + 1}
        displayLength={pagination.displayLength}
        total={pagination.total}
        onChangePage={pagination.handlePageChange}
      />
    </Container>
  );
}
