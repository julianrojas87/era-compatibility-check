export const BASE_URI = "http://data.europa.eu/949/";

export const a = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

export const OWL = {
    owlObjectProperty: 'http://www.w3.org/2002/07/owl#ObjectProperty',
    owlDataTypeProperty: 'http://www.w3.org/2002/07/owl#DatatypeProperty',
    unionOf: 'http://www.w3.org/2002/07/owl#unionOf'
}

export const RDF = {
    first: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
    rest: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest',
    nil: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil',
    type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
}

export const XSD = {
    boolean: "http://www.w3.org/2001/XMLSchema#boolean",
    integer: "http://www.w3.org/2001/XMLSchema#integer",
    string: "http://www.w3.org/2001/XMLSchema#string",
    double: "http://www.w3.org/2001/XMLSchema#double",
}

export const RDFS = {
    label: 'http://www.w3.org/2000/01/rdf-schema#label',
    description: 'http://www.w3.org/2000/01/rdf-schema#description',
    range: 'http://www.w3.org/2000/01/rdf-schema#range',
    comment: 'http://www.w3.org/2000/01/rdf-schema#comment',
    domain: 'http://www.w3.org/2000/01/rdf-schema#domain'
}

export const SKOS = {
    prefLabel: 'http://www.w3.org/2004/02/skos/core#prefLabel',
    definition: 'http://www.w3.org/2004/02/skos/core#definition'
}

export const GEOSPARQL = {
    asWKT: 'http://www.opengis.net/ont/geosparql#asWKT',
    hasGeometry: 'http://www.opengis.net/ont/geosparql#hasGeometry'
}

export const WGS84 = {
    lat: 'http://www.w3.org/2003/01/geo/wgs84_pos#lat',
    long: 'http://www.w3.org/2003/01/geo/wgs84_pos#long',
    location: 'http://www.w3.org/2003/01/geo/wgs84_pos#location'
}

export const ERA = {
    OperationalPoint: `${BASE_URI}OperationalPoint`,
    SectionOfLine: `${BASE_URI}SectionOfLine`,
    NetElement: `${BASE_URI}NetElement`,
    NetRelation: `${BASE_URI}NetRelation`,
    rinfIndex: `${BASE_URI}rinfIndex`,
    uopid: `${BASE_URI}uopid`,
    opName: `${BASE_URI}opName`,
    opStart: `${BASE_URI}opStart`,
    opEnd: `${BASE_URI}opEnd`,
    opType: `${BASE_URI}opType`,
    imCode: `${BASE_URI}imCode`,
    inCountry: `${BASE_URI}inCountry`,
    lineReference: `${BASE_URI}lineReference`,
    lineNationalId: `${BASE_URI}lineNationalId`,
    tafTapCode: `${BASE_URI}tafTAPCode`,
    hasAbstraction: `${BASE_URI}hasAbstraction`,
    hasImplementation: `${BASE_URI}hasImplementation`,
    VehicleType: `${BASE_URI}VehicleType`,
    Vehicle: `${BASE_URI}Vehicle`,
    trainDetectionSystem: `${BASE_URI}trainDetectionSystem`,
    trainDetectionSystemType: `${BASE_URI}trainDetectionSystemType`,
    gaugingProfile: `${BASE_URI}gaugingProfile`,
    axleBearingConditionMonitoring: `${BASE_URI}axleBearingConditionMonitoring`,
    hasHotAxleBoxDetector: `${BASE_URI}hasHotAxleBoxDetector`,
    railInclination: `${BASE_URI}railInclination`,
    wheelSetGauge: `${BASE_URI}wheelSetGauge`,
    minimumWheelDiameter: `${BASE_URI}minimumWheelDiameter`,
    minimumHorizontalRadius: `${BASE_URI}minimumHorizontalRadius`,
    minimumTemperature: `${BASE_URI}minimumTemperature`,
    maximumTemperature: `${BASE_URI}maximumTemperature`,
    contactLineSystem: `${BASE_URI}contactLineSystem`,
    energySupplySystem: `${BASE_URI}energySupplySystem`,
    maxCurrentStandstillPantograph: `${BASE_URI}maxCurrentStandstillPantograph`,
    minimumContactWireHeight: `${BASE_URI}minimumContactWireHeight`,
    maximumContactWireHeight: `${BASE_URI}maximumContactWireHeight`,
    contactStripMaterial: `${BASE_URI}contactStripMaterial`,
    typeVersionNumber: `${BASE_URI}typeVersionNumber`,
    vehicleSeries: `${BASE_URI}vehicleSeries`,
    vehicleNumber: `${BASE_URI}vehicleNumber`,
    vehicleType: `${BASE_URI}vehicleType`,
    isQuietRoute: `${BASE_URI}isQuietRoute`,
    operationalRestriction: `${BASE_URI}operationalRestriction`,
    autorisedCountry: `${BASE_URI}authorizedCountry`,
    tenClassification: `${BASE_URI}tenClassification`,
    elementA: `${BASE_URI}elementA`,
    elementB: `${BASE_URI}elementB`,
    elementPart: `${BASE_URI}elementPart`,
    navigability: `${BASE_URI}navigability`,
    length: `${BASE_URI}length`,
    trackId: `${BASE_URI}trackId`,
    notApplicable: `${BASE_URI}notApplicable`,
    notYetAvailable: `${BASE_URI}notYetAvailable`,
    solNature: `${BASE_URI}solNature`,
    track: `${BASE_URI}track`,

}

export const NAVIGS = {
    AB: `${BASE_URI}concepts/navigabilities/AB`,
    BA: `${BASE_URI}concepts/navigabilities/BA`,
    Both: `${BASE_URI}concepts/navigabilities/Both`,
    None: `${BASE_URI}concepts/navigabilities/None`
}

export const URI_LENGTH = {
    nationalLine: `${BASE_URI}functionalInfrastructure/nationalLines/`.length,
    operationalPoint: `${BASE_URI}functionalInfrastructure/operationalPoints/`.length,
}
