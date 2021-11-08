import React, { Component } from "react";
import GraphStore from "@graphy/memory.dataset.fast";
import axios from "axios";

import RDFetch from "../workers/RDFetch.worker";
import Utils from "../utils/Utils";
import {
  exportSearchToExcel,
  exportSearchToXml,
  mountSearchExportData,
} from "../utils/Export";
import { getCurrentLanguage, getPhrase } from "../utils/Languages";
import { SearchPermalink } from "./SearchPermalink";
import { SearchResultDetail } from "./SearchResultDetails";
import SearchResult from "./SearchResult";
import {
  ERA_TYPES,
  ERA_ONTOLOGY,
  SEARCH_QUERY_API,
  COUNT_QUERY_API,
} from "../config/config";
import {
  mountParamsFromVocabulary,
  getParamByRinf,
  getNameFromIndex,
} from "../utils/Params";
import queryString from "query-string";
import {
  Container,
  Divider,
  Button,
  Input,
  Icon,
  SelectPicker,
  DatePicker,
  InputNumber,
  InputGroup,
  Checkbox,
  CheckPicker,
  Panel,
  FlexboxGrid,
  PanelGroup,
  TagGroup,
  Tag,
  Loader,
  Modal,
  ButtonToolbar,
  IconButton,
  Alert,
} from "rsuite";
import {
  SKOS,
  RDFS,
  RDF,
  BASE_URI,
  ERA,
  GEOSPARQL,
  WGS84,
} from "../utils/NameSpaces";

const itemsPerPage = 30;

const ACTIVITIES = {
  EXPORT_EXCEL: "EXPORT_EXCEL",
  EXPORT_XML: "EXPORT_XML",
  EXPORT_RDF: "EXPORT_RDF",
  PERMALINK_LOADED: "PERMALINK_LOADED",
};

export default class Search extends Component {
  constructor(props) {
    super(props);

    this.state = {
      searchResult: [],
      rawSearchResult: [],
      searchResultActivePage: 0,
      searchResultNextPage: 0,
      searchResultDisplayLength: itemsPerPage,
      searchResultTotal: 1,
      searchResultPagesLoaded: [],
      searchResultPagesLoading: [],
      params: { OP: {}, SOL: {} },
      paramsType: "OP",
      paramsLabels: {},
      searchValues: { OP: {}, SOL: {} },
      currentSearchParams: {},
      searched: false,
      language: window.localStorage.getItem("language") || "en",
      loading: false,
      currentActivity: "",
      currentSearchUrl: "",
      justFetchedVocabulary: false,
      justFetchedTypes: false,
    };

    this.graphStore = GraphStore();
    this.graphResult = GraphStore();
  }

  componentDidMount() {
    this.fetchVocabulary();
    this.fetchTypes();
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      language,
      currentActivity,
      justFetchedVocabulary,
      justFetchedTypes,
    } = this.state;
    const storedLanguage = getCurrentLanguage();

    if (language !== storedLanguage) {
      this.setState({ language: storedLanguage });
      this.setState({
        params: mountParamsFromVocabulary(this.graphStore),
        justFetchedVocabulary: false,
        justFetchedTypes: false,
      });
      this.loadQueryString();
    }

    if (justFetchedVocabulary && justFetchedTypes) {
      this.setState({
        params: mountParamsFromVocabulary(this.graphStore),
        justFetchedVocabulary: false,
        justFetchedTypes: false,
      });
      this.loadQueryString();
    }

    if (currentActivity === ACTIVITIES.PERMALINK_LOADED) {
      this.setState({ currentActivity: "" });
      this.search();
    }
  }

  formatXml = async (rawSearchResult, paramsType, language) => {
    await exportSearchToXml(rawSearchResult, paramsType, language);

    this.cancelExport();
  };

  downloadExport = async () => {
    const { currentSearchUrl, currentSearchParams, language } = this.state;
    const result = GraphStore();
    const rdfetcht = new RDFetch();
    rdfetcht.addEventListener("message", (e) => {
      if (e.data === "done") {
        try {
        rdfetcht.terminate();
        const rawSearchResultForExport = mountSearchExportData({
          result,
          currentSearchParams,
          store: this.graphStore,
          language,
        });
        if (this.state.currentActivity === ACTIVITIES.EXPORT_EXCEL)
          this.formatExcel(
            rawSearchResultForExport,
            currentSearchParams.type,
            language
          );
        if (this.state.currentActivity === ACTIVITIES.EXPORT_XML)
          this.formatXml(
            rawSearchResultForExport,
            currentSearchParams.type,
            language
          );
        } catch(ex) {
          console.error(ex);
          this.cancelExport();
          Alert.error(`Export error: ${ex.message || ex}`, 10000);
        }
      } else {
        const quad = Utils.rebuildQuad(e.data);
        result.add(quad);
        this.graphResult.add(quad);
      }
    });

    rdfetcht.postMessage({
      url: currentSearchUrl,
      headers: { Accept: "application/n-triples" },
    });
  };

  formatExcel = async (rawSearchResult, paramsType, language) => {
    await exportSearchToExcel(rawSearchResult, paramsType, language);

    this.cancelExport();
  };

  loadQueryString = () => {
    const queryParams = queryString.parse(this.props.location.search, {
      arrayFormat: "bracket",
      parseBooleans: true,
    });
    this.setState((state) => {
      const isQuery = !!queryParams.paramsType;
      const paramsType = queryParams.paramsType || state.paramsType;
      delete queryParams.paramsType;
      return {
        currentActivity: isQuery ? ACTIVITIES.PERMALINK_LOADED : "",
        paramsType,
        searchValues: { ...state.searchValues, [paramsType]: queryParams },
      };
    });
  };

  fetchVocabulary = () => {
    const rdfetcht = new RDFetch();
    rdfetcht.addEventListener("message", (e) => {
      if (e.data === "done") {
        rdfetcht.terminate();
        this.setState({ justFetchedVocabulary: true });
      } else {
        this.graphStore.add(Utils.rebuildQuad(e.data));
      }
    });

    rdfetcht.postMessage({
      url: ERA_ONTOLOGY,
      headers: { Accept: "application/n-quads" },
    });
  };

  fetchTypes = () => {
    const rdfetcht = new RDFetch();
    rdfetcht.addEventListener("message", (e) => {
      if (e.data === "done") {
        rdfetcht.terminate();
        this.setState({ justFetchedTypes: true });
      } else {
        this.graphStore.add(Utils.rebuildQuad(e.data));
      }
    });

    rdfetcht.postMessage({
      url: ERA_TYPES,
      headers: { Accept: "application/n-quads" },
    });
  };

  queryDataNewSearch = async ({ currentSearchParams }) => {
    try {
      const where = this.mountWhere({ currentSearchParams });
      const requestUrl = `${COUNT_QUERY_API}?${this.mountCount({
        where,
        currentSearchParams,
      })}`;

      const countResult = await axios.get(requestUrl);

      const count = countResult.data.results.bindings[0].count.value;

      this.setState({ searchResultTotal: Number.parseInt(count) });

      this.queryData({ currentSearchParams, page: 0 });
    } catch (ex) {
      this.setState({ searchResultPagesLoading: [] });
      Alert.error(`Query error: ${ex.message || ex}`, 10000);
    }
  };

  queryData = ({ currentSearchParams, page }) => {
    const { searchResultDisplayLength } = this.state;
    const result = GraphStore();
    const rdfetcht = new RDFetch();
    rdfetcht.addEventListener("message", (e) => {
      if (e.data === "done") {
        rdfetcht.terminate();
        this.mountJsonDataFromQuery({ page, result, currentSearchParams });
      } else {
        const quad = Utils.rebuildQuad(e.data);
        result.add(quad);
        this.graphResult.add(quad);
      }
    });

    const where = this.mountWhere({ currentSearchParams });
    const describe = this.mountDescribe({
      where,
      currentSearchParams,
    });
    const withLimit = `${describe}
                        OFFSET ${searchResultDisplayLength * page}
                        LIMIT ${searchResultDisplayLength}`;

    const query = queryString.stringify({ query: describe });
    const queryWithLimit = queryString.stringify({ query: withLimit });

    this.setState({ currentSearchUrl: `${SEARCH_QUERY_API}?${query}` });

    console.log(withLimit);

    rdfetcht.postMessage({
      url: `${SEARCH_QUERY_API}?${queryWithLimit}`,
      headers: { Accept: "application/n-triples" },
    });
  };

  mountCount = ({ where, currentSearchParams }) => {
    const { type } = currentSearchParams;

    const query = `PREFIX era: <${BASE_URI}>
    PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
    SELECT (COUNT(DISTINCT ?${type}) AS ?count)
    ${where}`;

    return queryString.stringify({ query });
  };

  mountDescribe = ({ where, currentSearchParams }) => {
    const { type } = currentSearchParams;

    const query = `PREFIX era: <${BASE_URI}>
    PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
    DESCRIBE ?${type} ${
      type === "SOL" ? "?startOP ?endOP ?startLoc ?endLoc" : "?location"
    }
    ${where}`;

    return query;
  };

  mountValueForQuery = (value, type) => {
    if (Array.isArray(value)) {
      return value.map((v) => this.mountValueForQuery(v, type));
    }

    if (type === "number") {
      return [value];
    }

    if (typeof value === "string" && value.startsWith("http")) {
      return [`<${value}>`];
    }

    if (typeof value === "boolean") {
      return [`"${value}"^^xsd:boolean`];
    }

    return [`"${value}"`];
  };

  mountWhere = ({ currentSearchParams }) => {
    const { searchValues, paramsType, params } = this.state;
    const { type } = currentSearchParams;
    const filters = {};

    const values = Object.keys(searchValues[paramsType] || {}).map(
      (rinfIndex) => {
        const param = getParamByRinf(params, rinfIndex);
        if (!param) {
          return null;
        }

        const index = param.index;
        const prefix = index.includes(BASE_URI) ? "era" : "wgs";
        const indexName = index.slice(index.lastIndexOf("/") + 1);

        const domain = [
          ...param.domain,
          `${prefix}:${
            prefix === "wgs"
              ? indexName.slice(indexName.lastIndexOf("#") + 1)
              : indexName
          }`,
        ];

        const eraName = domain.map((d) => d.slice(4)).join("_");

        const value = this.mountValueForQuery(
          searchValues[paramsType][rinfIndex],
          param.type
        );

        if (param.type === "number") {
          if (value.length === 2) {
            filters[
              eraName
            ] = `?${eraName} >= ${value[0]} && ?${eraName} <= ${value[1]}`;
          } else {
            filters[eraName] = `?${eraName} = ${value[0]}`;
          }
        } else if (param.type === "text") {
          filters[
            eraName
          ] = `contains(lcase(str(?${eraName})),${value[0].toLowerCase()})`;
        } else {
          filters[eraName] = `?${eraName} IN (${value.join(",")})`;
        }

        return {
          indexName,
          domain,
          eraName,
        };
      }
    );

    const typeName = `${type === "OP" ? "OperationalPoint" : "SectionOfLine"}`;

    let vIndex = 0;
    const where = `WHERE {
      ?${type} a era:${typeName}.
      ${
        type === "SOL"
          ? `?SOL era:opStart ?startOP.
        ?startOP wgs:location ?startLoc.
        ?SOL era:opEnd ?endOP.
        ?endOP wgs:location ?endLoc.`
          : "?OP wgs:location ?location."
      }
      
      ${values
        .filter((v) => v !== null)
        .map(({ eraName, domain }) => {
          return domain
            .map((domainName, index) => {
              if (domain.length === 1) {
                //only one domain
                return `?${type} ${domainName} ?${eraName}`;
              }
              if (index === 0) {
                //first?
                return `?${type} ${domainName} ?v${vIndex}`;
              }
              if (index === domain.length - 1) {
                //last?
                return `?v${vIndex++} ${domainName} ?${eraName}`;
              }

              //middle ones
              return `?v${vIndex++} ${domainName} ?v${vIndex}`;
            })
            .join(".\n");
        })
        .join(".\n")}
      ${Object.keys(filters)
        .map((f) => `FILTER(${filters[f]})`)
        .join("\n")}
    }`;

    return where;
  };

  mountJsonDataFromQuery = ({ page, result, currentSearchParams }) => {
    const { type } = currentSearchParams;
    const rawResult = Utils.queryGraphStore({ store: result });
    const searchResultsForPage = [];
    const rawSearchResultForPage = [];
    const language = getCurrentLanguage();
    const showDetails = (id) => {
      this.setState({ showDetails: id });
    };

    for (const key of Object.keys(rawResult || {})) {
      try {
        const RDFType = rawResult[key][RDF.type]
          ? Array.isArray(rawResult[key][RDF.type])
            ? rawResult[key][RDF.type].map((v) => v.value)
            : [rawResult[key][RDF.type].value]
          : [];

        const correctType =
          (type === "SOL" && RDFType.includes(ERA.SectionOfLine)) ||
          (type === "OP" && RDFType.includes(ERA.OperationalPoint));

        if (correctType) {
          const t = Utils.queryGraphStore({
            store: this.graphStore,
            s: eraOpType,
          });
          
          const eraOpType = Array.isArray(rawResult[key][ERA.opType])
            ? rawResult[key][ERA.opType][0]
            : rawResult[key][ERA.opType];

          if (type === "OP") {
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
            const gLocation = rawResult[key][WGS84.location].value;
            const tafTAPCode = Utils.getLiteralInLanguage(
              rawResult[key][ERA.tafTapCode],
              language
            );
            const locationLat = Utils.getLiteralInLanguage(
              rawResult[gLocation][WGS84.lat],
              language
            );
            const locationLong = Utils.getLiteralInLanguage(
              rawResult[gLocation][WGS84.long],
              language
            );
            const geoLocation = `${locationLat}, ${locationLong}`;

            searchResultsForPage.push({
              name: (
                <Button appearance="link" onClick={() => showDetails(key)}>
                  {name}
                </Button>
              ),
              uopid,
              type: opTypeName && (
                <a
                  href={rawResult[key][ERA.opType].value}
                  target="_blank"
                  title={Utils.getLiteralInLanguage(
                    t[rawResult[key][ERA.opType].value][SKOS.definition],
                    language
                  )}
                >
                  {Utils.getLiteralInLanguage(opType, language)}
                </a>
              ),
              geoLocation,
            });
            rawSearchResultForPage.push({
              name,
              uopid,
              type: opTypeName,
              opType: opRawType,
              gLocation,
              geoLocation,
              tafTAPCode,
            });
          } else {
            const solId = rawResult[key][RDFS.label].value;
            const imCode = rawResult[key][ERA.imCode].value;
            const nationalLine = getNameFromIndex(
              rawResult[key][ERA.lineNationalId].value
            );
            const opStart = rawResult[key][ERA.opStart].value;
            const opEnd = rawResult[key][ERA.opEnd].value;

            const operationalPointStart = Utils.getLiteralInLanguage(
              rawResult[opStart][ERA.opName],
              language
            );
            const operationalPointEnd = Utils.getLiteralInLanguage(
              rawResult[opEnd][ERA.opName],
              language
            );

            const opStartGeo = rawResult[opStart][GEOSPARQL.hasGeometry].value;

            const opEndGeo = rawResult[opEnd][GEOSPARQL.hasGeometry].value;

            const opStartGeoLocationLat = Utils.getLiteralInLanguage(
              rawResult[opStartGeo][WGS84.lat],
              language
            );
            const opStartGeoLocationLong = Utils.getLiteralInLanguage(
              rawResult[opStartGeo][WGS84.long],
              language
            );
            const opEndGeoLocationLat = Utils.getLiteralInLanguage(
              rawResult[opEndGeo][WGS84.lat],
              language
            );
            const opEndGeoLocationLong = Utils.getLiteralInLanguage(
              rawResult[opEndGeo][WGS84.long],
              language
            );

            const leangthInMeters = Number.parseInt(
              rawResult[key][ERA.length].value
            );
            const lengthOfSOL = Number.isInteger(leangthInMeters)
              ? `${leangthInMeters / 1000}`
              : "-";
            const nature = getNameFromIndex(
              rawResult[key][ERA.solNature].value
            );
            const track = rawResult[key][ERA.track].value;

            searchResultsForPage.push({
              solId: (
                <Button appearance="link" onClick={() => showDetails(key)}>
                  {solId}
                </Button>
              ),
              imCode,
              nationalLine,
              operationalPointStart: (
                <Button appearance="link" onClick={() => showDetails(opStart)}>
                  {operationalPointStart}
                </Button>
              ),
              operationalPointEnd: (
                <Button appearance="link" onClick={() => showDetails(opEnd)}>
                  {operationalPointEnd}
                </Button>
              ),
              lengthOfSOL,
              opStartGeo: `${opStartGeoLocationLat}, ${opStartGeoLocationLong}`,
              opEndGeo: `${opEndGeoLocationLat}, ${opEndGeoLocationLong}`,
              opStart,
              opEnd,
            });
            rawSearchResultForPage.push({
              solId,
              imCode,
              nationalLine,
              operationalPointStart,
              operationalPointEnd,
              lengthOfSOL,
              nature,
              track,
              opEndGeoLocationLat,
              opEndGeoLocationLong,
              opStart,
              opEnd,
            });
          }
        }
      } catch (ex) {
        console.error(ex);
      }
    }

    this.setState((state) => {
      return {
        searchResultPagesLoading: state.searchResultPagesLoading.filter(
          (p) => p !== page
        ),
        searchResultActivePage: page,
        searchResultPagesLoaded: state.searchResultPagesLoaded.concat(page),
        searchResult: Utils.concatToPosition(
          state.searchResult,
          searchResultsForPage,
          page,
          state.searchResultDisplayLength
        ),
        rawSearchResult: Utils.concatToPosition(
          state.rawSearchResult,
          rawSearchResultForPage,
          page,
          state.searchResultDisplayLength
        ),
      };
    });
  };

  handlePageChange = (p) => {
    const page = p - 1;
    const {
      currentSearchParams,
      searchResultPagesLoaded,
      searchResultPagesLoading,
    } = this.state;
    if (
      !searchResultPagesLoaded.includes(page) &&
      !searchResultPagesLoading.includes(page)
    ) {
      this.setState((state) => ({
        searchResultPagesLoading: state.searchResultPagesLoading.concat(page),
        searchResultNextPage: page,
      }));

      this.queryData({ currentSearchParams, page });
    } else if (searchResultPagesLoaded.includes(page)) {
      this.setState({ searchResultActivePage: page });
    }
  };

  getCurrentResultsForPage = () => {
    const { searchResult, searchResultActivePage, searchResultDisplayLength } =
      this.state;

    if (
      searchResult &&
      searchResult.length > searchResultActivePage * searchResultDisplayLength
    ) {
      return searchResult.slice(
        searchResultActivePage * searchResultDisplayLength,
        searchResultActivePage * searchResultDisplayLength +
          searchResultDisplayLength
      );
    } else return [];
  };

  isPageLoading = () => {
    const { searchResultNextPage, searchResultPagesLoading } = this.state;

    return searchResultPagesLoading.includes(searchResultNextPage);
  };

  renderTextInput = (key, param) => {
    const onValueChange = (value) => {
      this.setState((state) => {
        const { searchValues, paramsType } = state;
        searchValues[paramsType][key] = value;
        if (!value) {
          delete searchValues[paramsType][key];
        }
        return { searchValues };
      });
    };

    const { searchValues, paramsType } = this.state;
    return (
      <Input
        description={param.label}
        onChange={onValueChange}
        value={searchValues[paramsType][key] || ""}
      />
    );
  };

  renderSelectPicker = (key, param) => {
    const onValueChange = (value) => {
      this.setState((state) => {
        const { searchValues, paramsType } = state;
        searchValues[paramsType][key] = value === "true" ? true : false;
        if (value === null || value === undefined) {
          delete searchValues[paramsType][key];
        }
        return { searchValues };
      });
    };

    const { searchValues, paramsType } = this.state;
    return (
      <SelectPicker
        style={{ width: "100%" }}
        onChange={onValueChange}
        data={param.data}
        value={
          searchValues[paramsType][key] === true
            ? "true"
            : searchValues[paramsType][key] === false
            ? "false"
            : null
        }
      />
    );
  };

  renderDatePicker = (key, param) => {
    const onValueChange = (value) => {
      let formatedValue = null;
      if (value instanceof Date) {
        formatedValue = `${value.getFullYear()}-${
          value.getMonth() + 1
        }-${value.getDate()}`;
      }
      this.setState((state) => {
        const { searchValues, paramsType } = state;
        searchValues[paramsType][key] = formatedValue;
        return { searchValues };
      });
    };

    const { searchValues, paramsType } = this.state;
    const value = searchValues[paramsType][key];

    return (
      <DatePicker
        style={{ width: "100%" }}
        onChange={onValueChange}
        oneTap
        value={value ? new Date(value) : null}
      />
    );
  };

  renderCheckPicker = (key, param) => {
    const onValueChange = (value) => {
      this.setState((state) => {
        const { searchValues, paramsType } = state;
        searchValues[paramsType][key] = value;
        if (!value || value.length === 0) {
          delete searchValues[paramsType][key];
        }
        return { searchValues };
      });
    };

    const { searchValues, paramsType } = this.state;
    return (
      <CheckPicker
        style={{ width: "100%" }}
        onChange={onValueChange}
        data={param.data}
        value={searchValues[paramsType][key] || null}
      />
    );
  };

  renderInputNumber = (key, param) => {
    const onValueChangeFrom = (v) => {
      let value = Number.parseInt(v);
      value = Number.isInteger(value) ? value : null;
      this.setState((state) => {
        const { searchValues, paramsType } = state;
        const beteween = !!searchValues[paramsType][`${key}-range`];
        if (beteween) {
          searchValues[paramsType][key] = [
            value,
            searchValues[paramsType][key] && searchValues[paramsType][key][1],
          ];
          if (
            !searchValues[paramsType][key][0] &&
            !searchValues[paramsType][key][1]
          ) {
            delete searchValues[paramsType][key];
          }
        } else {
          searchValues[paramsType][key] = [value];
          if (!value) {
            delete searchValues[paramsType][key];
          }
        }
        return { searchValues };
      });
    };
    const onValueChangeTo = (v) => {
      let value = Number.parseInt(v);
      value = Number.isInteger(value) ? value : null;
      this.setState((state) => {
        const { searchValues, paramsType } = state;
        searchValues[paramsType][key] = [
          searchValues[paramsType][key] && searchValues[paramsType][key][0],
          value,
        ];
        if (
          !searchValues[paramsType][key][0] &&
          !searchValues[paramsType][key][1]
        ) {
          delete searchValues[paramsType][key];
        }
        return { searchValues };
      });
    };
    const onToggleBeteween = () => {
      this.setState((state) => {
        const { searchValues, paramsType } = state;
        searchValues[paramsType][`${key}-range`] =
          !searchValues[paramsType][`${key}-range`];
        searchValues[paramsType][key] = [
          searchValues[paramsType][key] && searchValues[paramsType][key][0],
        ];
        return { searchValues };
      });
    };

    const { searchValues, paramsType } = this.state;
    const [from, to] = searchValues[paramsType][key] || [];
    const beteween = !!searchValues[paramsType][`${key}-range`];

    return (
      <div>
        <Checkbox
          onChange={onToggleBeteween}
          checked={beteween}
          style={{ width: "500px" }}
        >
          use range values
        </Checkbox>
        <InputGroup style={{ width: "500px" }}>
          <InputNumber
            prefix={beteween ? "from" : "exactly"}
            onChange={onValueChangeFrom}
            value={from || null}
            max={Number.isInteger(to) ? to : Number.MAX_SAFE_INTEGER}
          />
          {beteween && (
            <InputNumber
              prefix="to"
              onChange={onValueChangeTo}
              value={to || null}
              min={Number.isInteger(from) ? from : Number.MIN_SAFE_INTEGER}
            />
          )}
        </InputGroup>
      </div>
    );
  };

  renderParam = (key, param) => {
    if (param.type === "text") {
      return this.renderTextInput(key, param);
    }

    if (param.type === "select") {
      return this.renderSelectPicker(key, param);
    }

    if (param.type === "date") {
      return this.renderDatePicker(key, param);
    }

    if (param.type === "number") {
      return this.renderInputNumber(key, param);
    }

    if (param.type === "multiple-select") {
      return this.renderCheckPicker(key, param);
    }

    return null;
  };

  loopParams = (params, i) => {
    const { paramsType, language } = this.state;
    const ret = [];
    if (!i) i = 0;

    for (const key of Object.keys(params || {})) {
      if (params[key].type === "sub") {
        const translatedKey = getPhrase(key, language);
        ret.push(
          <Panel
            key={`${paramsType}-${key}`}
            header={<b>{translatedKey}</b>}
            bordered
            collapsible
            defaultExpanded={i === 0}
          >
            {this.loopParams(params[key], i++)}
          </Panel>
        );
      } else if (key !== "type") {
        ret.push(
          <FlexboxGrid
            justify="space-around"
            align="middle"
            key={`${paramsType}-${key}`}
            style={{ padding: "1rem", borderTop: "1px solid #eee" }}
          >
            <FlexboxGrid.Item colspan={6}>
              <span>
                {params[key].label} {key !== "inCountry" ? `(${key})` : null}
              </span>
            </FlexboxGrid.Item>
            <FlexboxGrid.Item colspan={18}>
              {this.renderParam(key, params[key])}
            </FlexboxGrid.Item>
          </FlexboxGrid>
        );
      }
    }
    return <PanelGroup bordered>{ret}</PanelGroup>;
  };

  renderSearchParams = () => {
    const { params, paramsType } = this.state;

    if (!params || !params[paramsType]) return null;

    return this.loopParams({ ...params[paramsType] });
  };

  renderSelectOPSOL = () => {
    const { language } = this.state;
    const onValueChange = (value) => {
      this.setState({ paramsType: value });
    };

    return (
      <FlexboxGrid
        justify="space-around"
        align="middle"
        style={{ padding: "1rem", borderTop: "1px solid #eee" }}
      >
        <FlexboxGrid.Item colspan={6}>
          {getPhrase("searchItem", language)}
        </FlexboxGrid.Item>
        <FlexboxGrid.Item colspan={18}>
          <SelectPicker
            searchable={false}
            style={{ width: "100%" }}
            onChange={onValueChange}
            data={[
              { value: "OP", label: "OP" },
              { value: "SOL", label: "SOL" },
            ]}
            placeholder={getPhrase("searchItem", language)}
            value={this.state.paramsType}
          />
        </FlexboxGrid.Item>
      </FlexboxGrid>
    );
  };

  mountParamsDescription = (params) => {
    let result = {};

    for (const key of Object.keys(params || {})) {
      if (params[key].label) {
        result[key] = params[key].label;
      } else if (params[key].type === "sub") {
        result = { ...result, ...this.mountParamsDescription(params[key]) };
      }
    }

    return result;
  };

  formatValue = (value) => {
    const { language } = this.state;
    if (typeof value === "boolean") {
      return value ? "Y" : "N";
    }
    if (Array.isArray(value)) {
      if (typeof value[0] === "string" && value[0].startsWith("http")) {
        return value
          .map((v) => {
            const typeInfo = Utils.queryGraphStore({
              store: this.graphStore,
              s: v,
            });

            if (typeInfo === null) {
              return getPhrase(v, language);
            }

            return Utils.getLiteralInLanguage(
              typeInfo[v][SKOS.prefLabel],
              language
            );
          })
          .join("; ");
      }
      return value.join("; ");
    }

    return value;
  };

  renderSummary = () => {
    const { paramsType, params, searchValues } = this.state;
    const p = this.mountParamsDescription({
      ...params[paramsType],
    });
    const v = searchValues[paramsType];

    const clearSearchParam = (key) => {
      this.setState((state) => {
        const searchValues = { ...state.searchValues };
        delete searchValues[paramsType][key];
        return { searchValues };
      });
    };

    return (
      <TagGroup>
        {Object.keys(v || {}).map((k) => {
          if (typeof v[k] !== "boolean" && !v[k]) return null;
          if (k.endsWith("-range")) return null;

          return (
            <Tag key={k} closable onClose={() => clearSearchParam(k)}>
              <b>{p[k]}:</b>
              {" " + this.formatValue(v[k])}
            </Tag>
          );
        })}
      </TagGroup>
    );
  };

  closeDetails = () => {
    this.setState({ showDetails: null });
  };

  search = () => {
    this.setState((state) => {
      const page = 0;
      const currentSearchParams = {
        ...state.searchValues[state.paramsType],
        type: state.paramsType,
      };

      this.queryDataNewSearch({ currentSearchParams });

      return {
        currentSearchParams,
        searchResult: [],
        searchResultPagesLoaded: [],
        searchResultPagesLoading: [page],
        searchResultActivePage: page,
        searched: true,
      };
    });
  };

  exportExcel = () => {
    this.setState({ loading: true, currentActivity: ACTIVITIES.EXPORT_EXCEL });
    this.downloadExport();
  };

  exportXML = () => {
    this.setState({ loading: true, currentActivity: ACTIVITIES.EXPORT_XML });
    this.downloadExport();
  };

  exportRDF = () => {
    this.setState({ loading: true, currentActivity: ACTIVITIES.EXPORT_RDF });
    const { currentSearchUrl } = this.state;
    fetch(currentSearchUrl, { headers: { Accept: "text/turtle" } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "export.ttl";
        document.body.appendChild(a);
        a.click();
        a.remove();
        this.cancelExport();
      });
  };

  cancelExport = () => {
    this.setState({
      loading: false,
      currentActivity: "",
    });
  };

  getActivityName = () => {
    const { currentActivity, language } = this.state;
    if (currentActivity === ACTIVITIES.EXPORT_EXCEL)
      return getPhrase("exportExcel", language);
    if (currentActivity === ACTIVITIES.EXPORT_XML)
      return getPhrase("exportXML", language);
    if (currentActivity === ACTIVITIES.EXPORT_RDF)
      return getPhrase("exportRDF", language);
    return "";
  };

  render() {
    const {
      searchResultActivePage,
      searchResultDisplayLength,
      searchResultTotal,
      searchValues,
      showDetails,
      paramsType,
      searched,
      language,
      loading,
      currentSearchParams,
    } = this.state;

    const { type } = currentSearchParams;
    const currentResultsForPage = this.getCurrentResultsForPage();

    return (
      <Container>
        {loading && (
          <Modal size="xs" show={loading} onHide={this.cancelExport}>
            <Modal.Header>
              <Modal.Title>{this.getActivityName()}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Loader
                content={getPhrase("generatingFile", language)}
                vertical
                backdrop
              />
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.cancelExport} appearance="subtle">
                {getPhrase("cancel", language)}
              </Button>
            </Modal.Footer>
          </Modal>
        )}
        <Panel
          shaded
          style={{ margin: "1rem" }}
          header={<h3>{getPhrase("searchCriteria", language)}</h3>}
        >
          {this.renderSelectOPSOL()}
          {this.renderSearchParams()}
          <Divider />
          <ButtonToolbar style={{ justifyContent: "right", display: "flex" }}>
            <Button
              onClick={this.search}
              disabled={this.isPageLoading()}
              appearance="primary"
              size="lg"
            >
              <Icon icon="search" /> {getPhrase("search", language)}
            </Button>
          </ButtonToolbar>
          <div
            style={{
              justifyContent: "right",
              display: "flex",
              marginTop: "3px",
            }}
          >
            {this.renderSummary()}
          </div>
          {searchValues && (
            <div
              style={{
                justifyContent: "right",
                display: "flex",
                marginTop: "3px",
              }}
            >
              <SearchPermalink paramsType={paramsType} params={searchValues} />
            </div>
          )}
        </Panel>

        {searched && (
          <Panel
            shaded
            style={{ margin: "1rem" }}
            header={<h3>{getPhrase("searchResult", language)}</h3>}
          >
            <ButtonToolbar style={{ justifyContent: "right", display: "flex" }}>
              <IconButton
                icon={<Icon icon="file-excel-o" />}
                onClick={this.exportExcel}
              >
                {getPhrase("exportExcel", language)}
              </IconButton>
              <IconButton
                icon={<Icon icon="file-code-o" />}
                onClick={this.exportXML}
              >
                {getPhrase("exportXML", language)}
              </IconButton>
              <IconButton
                icon={<Icon icon="file-code-o" />}
                onClick={this.exportRDF}
              >
                {getPhrase("exportRDF", language)}
              </IconButton>
            </ButtonToolbar>

            <SearchResult
              type={type}
              language={language}
              data={currentResultsForPage}
              loading={this.isPageLoading()}
              pagination={{
                activePage: searchResultActivePage,
                displayLength: searchResultDisplayLength,
                total: searchResultTotal,
                handlePageChange: this.handlePageChange,
              }}
            />
          </Panel>
        )}

        {showDetails && (
          <SearchResultDetail
            onClose={this.closeDetails}
            id={showDetails}
            graphResult={this.graphResult}
            graphStore={this.graphStore}
            type={paramsType}
            language={language}
          />
        )}
      </Container>
    );
  }
}
