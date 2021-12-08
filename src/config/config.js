
const BASE_URI = '${BASE_URI}';
//const BASE_URI = 'http://era.ilabt.imec.be'; // on imec premises
//const BASE_URI = 'https://data-interop.era.europa.eu'; // on DIGIT premises (PROD)
//const BASE_URI = 'https://era.cymo.eu'; // on DIGIT premises (DEV)
const ZOOM = '${ZOOM}';
//const ZOOM = '12';

/**
 * Constants used within the app
 * */ 
export const APP_PATH = '/compatibility-check-demo';
export const SEARCH_QUERY_API = BASE_URI + '/ldf/search'
export const COUNT_QUERY_API = BASE_URI + '/ldf/count'
export const ERA_OPERATIONAL_POINTS = BASE_URI + '/ldf/operational-points';
export const ERA_VEHICLE_TYPES = BASE_URI + '/ldf/vehicle-types';
export const ABSTRACTION_TILES = BASE_URI + '/ldf/sparql-tiles/abstraction';
export const IMPLEMENTATION_TILES = BASE_URI + '/ldf/sparql-tiles/implementation';
//export const IMPLEMENTATION_TILES = 'http://localhost:3000/ldf/sparql-tiles/implementation';
export const OSRM_API = BASE_URI + '/ldf/osrm';
export const ROUTE_INFO = BASE_URI + '/ldf/route-info';
//export const ROUTE_INFO = 'http://localhost:3000/ldf/route-info';
export const ABSTRACTION_ZOOM = ZOOM;
export const IMPLEMENTATION_ZOOM = ZOOM;
export const ERA_ONTOLOGY = /*BASE_URI + */'https://data-interop.era.europa.eu/era-vocabulary/ontology.ttl';
export const ERA_TYPES = BASE_URI + '/era-vocabulary/era-skos'
