# ERA Compatibility Check and Search Form

Web application to perform route compatibility checks and entity search based on data from the [ERA Knowledge Graph](https://linked.ec-dataplatform.eu/sparql).

The web application is built using React, with React Route. It has two main routes:

* `/` - Route Compatibility Check
* `/search` - Search Form

## Route Compatibility Check

The route compatibility functionality performs 2 main processes: _route calculation_ and _compatibility assessment_. Both processes depend from initial RDF data fetching tasks that happen during application loading time. Concretely the following resources are fetched:

* [ERA Vocabulary](http://data-interop.era.europa.eu/era-vocabulary/ontology.ttl) ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L119))
* [ERA reference data](https://data-interop.era.europa.eu/era-vocabulary/era-skos) ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L120))
* [Operational Points](https://data-interop.era.europa.eu/ldf/operational-points) ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L121))
* [Vehicle Types](https://data-interop.era.europa.eu/ldf/vehicle-types) ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L122))

The data fetching happens through the [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) module [`RDFetch.worker.js`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/workers/RDFetch.worker.js), which fetches the resources via HTTP and parses the RDF quads into [RDFJS objects](https://rdf.js.org/data-model-spec/). All fetched quad objects are streamed back to the main application thread and persisted using an instance of an in-memory [Graphy.js datastore](https://graphy.link/memory.dataset.fast) (see in [source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L109)). 

Additionally, the application offers the _permalink_ and _exporting_  functionalities. Next we describe the details of the these processes.

### Route Calculation

The route calculation process is triggered when the user selects the _From_ and _To_ Operational Points, via the autocomplete functionality ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L789)) in the left side panel.

When the first OP is selected, the application proceeds to center the map on its location and already fetches the corresponding tiles that contain the data of this OP ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L497)). Tiles are fetched via the API layer on https://data-interop.era.europa.eu/ldf/sparql-tiles/abstraction/{zoom}/{X}/{Y}  where:

* `{zoom}`: Corresponds to the zoom level at which the tiles are requested. The zoom parameter is an integer between 0 (zoomed out) and 18 (zoomed in).
* `{X}`: Corresponds to the longitude coordinate and goes from 0 (left edge is 180 °W) to 2^zoom − 1 (right edge is 180 °E) in a [Mercator projection](https://en.wikipedia.org/wiki/Mercator_projection).
* `{Y}`: Corresponds to the latitude coordinate and goes from 0 (top edge is 85.0511 °N) to 2^zoom − 1 (bottom edge is 85.0511 °S) in a Mercator projection. The number 85.0511 is the result of arctan(sinh(π)).

For example the tile that covers the city of Brussels is obtained via the following URL: https://data-interop.era.europa.eu/ldf/sparql-tiles/abstraction/10/524/343. See more information in the [Slippy Maps specification](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames).

Once the user has selected the second OP, the application also fetches the tiles that contains this OP and adjusts the map UI to include both selected OPs. Additionally, the application applies the [Vox Traversal algorithm](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.42.3443&rep=rep1&type=pdf) ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L595)) to determine the tiles that intersect the straight line between both _From_ and _To_ OPs. If the amount of intersected tiles is equals or lower than 10, the application proceeds to fetch all the tiles. This is done to potentially increase the performance of the route calculation. 

The route calculation process is initiated by calling the [`PathFinder.yen()`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L641) function, which implements [Yen's algorithm](https://en.wikipedia.org/wiki/Yen%27s_algorithm) for finding top-k shortest path routes in a directed graph. Internally Yen's algorithm relies on a single shortest path calculation algorithm. 

In this case we use the [A*(star) algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm) implemented with the [`PathFinder.Astar()`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/algorithm/PathFinder.js#L119) function. This implementation uses the geospatial location of OPs as an heuristic to prioritize the exploration of nodes found closer to the _To_ OP ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/algorithm/PathFinder.js#L266)). The algorithm also dynamically fetches the tiles of additional nodes that are explored as part of the route calculation process only if such tiles haven't been fetched already ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/algorithm/PathFinder.js#L203)).

Once a route is found the `PathFinder` object streams back the route information as a `path` event ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/algorithm/PathFinder.js#L26)). This information is used to visualize the path in the map UI and also to describe the route in the left panel ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L615)). The React components in charge of the route visualization and description are [`RoutesLayer.js`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/RoutesLayer.js) and [`RoutesInfo.js`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/RoutesInfo.js) respectively.

### Compatibility Assessment

The compatibility assessment happens either when the user selects a Vehicle Type or automatically when a route is calculated and the user has selected a Vehicle Type beforehand.

The compatibility checking process takes place by comparing a set of properties from the Vehicle Type and the individual Tracks that comprise a given route. The function that implements the logic for comparing the different properties is the [`verifyCompatibility()`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/algorithm/Compatibility.js#L20) function.

This function produces a `report` object per route that contains the property values and the assessed compatibility per Track. The report is interpreted within the `RoutesInfo.js` component to render the table report displayed in the left panel together with the route description ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/RoutesInfo.js#L144)).

### Permalink

The permalink functionality is managed by the [`RoutesPermalink.js`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/RoutesPermalink.js) React component, which progressively builds the URL with the user selected parameters that identify a specific route.  The reloading of a permalink takes place at application loading time, where the application verify the presence of route parameters in the URL and if complete, proceeds to fill in the values in the left side panels and executes the route calculation process ([source code](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/MainLayout.js#L138)).

### Export

The export functionality is handled by the [`RoutesExport.js`](https://git.fpfis.eu/datateam/ERA/era-compatibility-check/-/blob/dev/src/components/RoutesExport.js) React component. It allows exporting the route information and optionally the compatibility report too, either as a PDF document or an Excel sheet. The following libraries are used for formatting the export:

* PDF: [`@react-pdf`](https://react-pdf.org/)
* Excel: [`exceljs`](https://www.npmjs.com/package/exceljs)

## Search Form

The search part of the app is composed by a list of parameters for the user to configure, the search result table and a modal to show the items details.

The lifecycle of the search page is described in the next items.

### Mount Parameters

All the parameters names and types are fetched from the ERA Knowledge Graph when the search page is loaded. There are separated parameters for each type of search, search for Operational Point (OP) or search for Section of Line (SOL).

1. The app download the Vocabulary and Ontology info from the ERA Knowledge Graph, using the function `fetchVocabulary` and `fetchTypes` from the `Search` class. All data is stored on the `graphStore` property from this class.

2. When successfully loaded the data, it call the function `mountParamsFromVocabulary` from the `Params.js` file, that is responsible of mounting an object with all the parameters with the correct name and type.

3. The `mountParamsFromVocabulary` navigates through the parameters object and uses the `RINF indexes` to find the correct parameter on the `graphStore` and get it name and type.

4. Currently we have four possible types for parameters:
   1. `text` - user can enter any string
   2. `number` - user can enter number or range of numbers (min and max)
   3. `select` - user can select one of multiple choices (also used for Boolean types)
   4. `multiple-select` - user can select multiple items from a list
      1. For the `multiple-select` we get all the possible options also from the `graphStore`, using the `TYPES` object to find the right ones

5. Every parameter have a domain, that is a list of all the father domains from the `params` object. This is used to mount the SPARQL query.

6. The `Search` class then renders all parameters accordingly to its types, using the `renderSearchParams` function.

7. When the user make changes to the parameters (i.e. writing on a text input) the changes are stored on the state `searchValues`.

### Permalink

On every parameter change, the permalink is generated using the `SearchPermalink` component. It receives the parameter type and renders a URL with the all the parameters.
For this we use the [query-string](https://www.npmjs.com/package/query-string) library.

When the search page is loaded, the function `loadQueryString` runs and, if we have query-string data, it populates the `searchValues` state with the correct values, and automatically run the search to show the search result.

### Search Result

When the user clicks on the `Search` button, the `queryDataNewSearch` is called. This function calls `mountWhere` to get a SPARQL query from all the parameters set by the user on the page.

Using this SPARQL query, it first call the server to get the count of items in the result. This first call is using [axios](https://www.npmjs.com/package/axios). The returned count value is them stored with the name `searchResultTotal` on the Search state.

After this, the `queryData` function is called, the get the page 0 items. This function uses the value stored in `itemsPerPage` to limit the number of results per query. Currently it's configured 30 items per page.

When the app finish download the items for the current page, it calls the method `mountJsonDataFromQuery`, that is responsible for parsing the result and save it on the Search state to be used to render the result table.

On the Search state, there is some values to control the search results:

1. `searchResultPagesLoading` - an array with all the pages that are currently been fetched
2. `searchResultPagesLoaded` - an array with all the pages that are already fetched
3. `searchResultActivePage` - the number of the current page to render
4. `searchResult` - an array with the data of all items on all fetched pages. The search result component will grab only the items needed to render the current page from this array.
5. `rawSearchResult` - contains the same items like the `searchResult`, but they are not formatted. This is used on the export functionalities.

### Summary

The summary is the list of all parameters and values entered by the user at the moment. It reads the current parameters from the `searchValues` state, and them render a list on the bottom of the parameters list.

Each item can be removed using a close button, that calls the `clearSearchParam` function. This will remove the item from the summary list and clear the data of the respective parameter on the parameters.

### Multi-language

The app have multi-language support. User can select the language on a Select input on the app header. The selected language is stored in the browser on a local storage variable named `language`, and loaded next time the user access the app.

The phrases can come from two locations:

1. From the GraphStore. When read literals from the store the function `getLiteralInLanguage` from `Utils.js` is used, and return the literal in the selected language if available. In case it's not available, it fall-back to English.
2. From the `phrases` object, available in the `Languages.js` file. To read from this object the `getPhrase` is used. If the desired phrase are not available in the current selected language, it'll fall-back to English. If English is also not available, it'll return the phrase `code` received as parameter.

### Export

The app allows the user to export the search result in three formats:

1. XML - [xml-js](https://www.npmjs.com/package/xml-js) library it's used for it
2. Excel - [exceljs](https://www.npmjs.com/package/exceljs) library it's used for it
3. RDF - It's downloaded in this format directly from the graph store server

The export flow is equal for every data type. First, a call is made to get all the results from the server, and this is stored on a local graph store. Then, this result is parsed to the desired format, and the [file-saver](https://www.npmjs.com/package/file-saver) library is used to generate a file download. 

It's possible to export the complete result list or to export a single item from the result.

## Deploy WITH Docker

This application has been _dockerized_ to facilitate its deployment. We use a [multi-stage approach](https://docs.docker.com/develop/develop-images/multistage-build/) to build a container that makes publishes a build of this Web application via a NGINX instance.

To deploy this container follow these steps:

1. Make sure to have a recent version of [Docker](https://docs.docker.com/engine/install/) installed.

2. Set the application's configuration parameters and build the Docker image:

   ```bash
   docker build -t era-rcc \
       --build-arg BASE_URI=https://data-interop.era.europa.eu \
       --build-arg ZOOM=10 \
       ./
   ```

   Five configuration parameters need to be when building this image:
   - `BASE_URI`: The base URI where all the resources and application are available.
   - `ZOOM`: Zoom level at which the geospatial data tiles are defined. According to the [Slippy Tiles spec](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Zoom_levels), the zoom parameter is an integer between 0 (zoomed out) and 18 (zoomed in).

3. Start the application:

   ```bash
   docker run -p ${PORT}:80 era-rcc
   ```

   Replace `${PORT}` for the TCP port where you want to run the application.

## Deploy WITHOUT Docker

To directly build this application you need to install first:

- [Node.js](https://nodejs.org/en/download/)  at least v12.

Then follow these steps:

1. Clone this repository:

   ```bash
   git clone https://github.com/julianrojas87/era-compatibility-check.git
   ```

2. Go inside the cloned folder and install the dependencies:

   ```bash
   npm install
   ```

3. Build the application:

   ```bash
   npm run build
   ```

4. Publish the compiled static site:

   ```bash
   cd dist
   npx http-server -p 8080
   ```

   The above commands will publish the application at `http://localhost:8080`.
