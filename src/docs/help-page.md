# Help Page

---------------
This is a prototype of the Route Compatibility Check application and service,
working on the Knowledge Graph (KG) of the [EU Agency for Railways (ERA)](https://www.era.europa.eu).
The _ERA KG_ is created out of independently maintained datasets.

The objective is to check if a certain railway vehicle (read as a locomotive unit, passenger car, wagon, etc) or authorized type of vehicle, can travel the route from _operational point A_ to _operational point B_. Each route is composed of sections of lines (tracks) with different technical parameters. Each track is between two operations points. The small icons that appear on the map show the location of the operational points and details about them when you hover over them.

Vehicles are presented using the unique vehicle number defined in the European Centralised Virtual Vehicle Register ([ECVVR](https://www.era.europa.eu/registers_en#ecvvr)) and vehicle type information is originated from the European Registry Authorized Type of Vehicle ([ERATV](https://eratv.era.europa.eu/)) and shown with their particular code and name (e.g., `11-001-0003-9-001 - Euro 4000 Tristandard`).

Source code of this application is available at this [GitHub repository](https://github.com/julianrojas87/era-compatibility-check).

### Main Workflow

---------------
Next we show the steps that could be followed to use this application.

#### Step 1: Select area

> **DO**\
Zoom and pan so that the screen shows the area you are interested in.\
_Tip: select an area which has one or two country borders_

> **OBSERVE**\
The operational points are loaded for that area.\
![Step 1](img/step1.gif)

> **UNDER THE HOOD**\
The information about the railway topology is kept in the form of a Knowledge Graph (KG) in a graph data store. In an effort to avoid overloading the data store with too many heavy queries from the application, we take advantage of the fact that the railway topology data is georeferenced and we publish it in tiles through a semantically annotated API (i.e. an API whose responses include [metadata that semantically describe](https://www.hydra-cg.com/spec/latest/core/) how clients can interact with it).
\
This API is designed based on the principles of the [Slippy Map](https://en.wikipedia.org/wiki/Tiled_web_map) approach, used by map applications (e.g. Google Maps and OSM) to serve only the data of a specific region that an application is trying to visualize. This means that when you pan or zoom on the map, the application will request to the API the data for the region seen in your screen, according to the Slippy Map specification. The API will receive this request and will proceed in turn, to perform a SPARQL query to the KG data store for these specific data.
\
However, this SPARQL query is not limited to retrieve only data about operational points, but all the complete set of entities and properties that are related to the area covered by the requested tile. This is done to increase the cacheability of the API responses and also means that the API will need to ask the data store for a specific tile only once. Similarly, the application won’t have to request the same tile more than once since the browser will also cache the data. Moreover, the rest of the fetched data will remain available to the application for further processing.

#### Step 2: Select _from_ and _to_ operational points

> **DO**\
Select two operational points which are connected to the railway infrastructure. Once the shortest route is calculated, expand it to see all operation points and tracks between them.

> **OBSERVE**\
First you see the calculation of the tiles where possible routes can be found. By default the max number of routes is set to 1. Then the shortest route is calculated and drawn on the map showing all operational points on the route.
![Step 2](img/step2.gif)

> **UNDER THE HOOD**\
Route planning queries are not something that can be trivially solved on KG data stores. Non-standard [extensions to SPARQL](https://www.stardog.com/blog/a-path-of-our-own/) are needed to deal with such use cases, only available in vendor-specific implementations. For that reason we needed an additional solution capable of performing a shortest-path algorithm over the railway topology data of our KG. Our geospatial tiling approach gives us another very important advantage besides highly cacheable data tiles, and that is access to the complete set of facts (triples in KG terminology) for a certain region which includes the railway topological information.
\
This enables our application to perform any kind of processing on the data, such as a graph shortest-path algorithm. In this case, we perform an [A* algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm) that progressively downloads data tiles containing the railway topology data from the KG that it needs to find routes between two selected operational points. When the maximum number of routes is selected to be more than 1, the application performs [Yen's algorithm](https://en.wikipedia.org/wiki/Yen%27s_algorithm) for finding the top-k shortest paths in a graph.

#### Step 3: Select a vehicle type

> **DO**\
Click on the menu `Select a Vehicle Type` and choose a vehicle type.

> **OBSERVE**\
Now on the route description you see on which tracks of the route the selected vehicle can go and if not why. This way you see the compatibility between the selected vehicle type and the selected route, track by track, parameter by parameter. In the example below, for the first track, the train detection system is compatible but the energy supply system is not. A `no data` value will show when information about a certain parameter is not available. This will render an `UNKNOWN` compatibility result.
![Step 3](img/step3.gif)

> **UNDER THE HOOD**\
During the route calculation process, the application fetches all the data (KG's triples) associated with every single operational point and track of the found route(s). Thanks to this it is possible to select any vehicle type (whose data were fetched from the start during application loading) and perform a comparison of their characteristics. Since all the data is already present in the application _in-memory_, the comparison process is executed very efficiently and vehicle types can be switched without requiring new data requests to the KG data store.

#### Step 4: Select a vehicle

> **DO**\
Click on the menu `Select a Vehicle` and choose a vehicle.

> **OBSERVE**\
This step displays the same behavior as the previous one, with the difference of showing additional compatibility parameters that are only available for specific vehicles. In the example below, the “operational restriction” parameter is exclusive of vehicle `238029424542`. When a vehicle is selected, the application will automatically select its associated vehicle type (if this information is available in the KG).
![Step 4](img/step4.gif)

> **UNDER THE HOOD**\
When the application is loaded, it requests the set of vehicles and vehicle types to the backend API. Since the amount of entities is considerably high (+1600 vehicle types +800,000 vehicles), these data are loaded in a streaming fashion, using [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) to prevent blocking the user interface of the application.

### Other things to try

---------------

#### Switch vehicle (types) over the same route

You can select different vehicles or vehicle types to check their compatibility with a specific route. The relevant pieces of KG data are already loaded into the application memory, which allows to compute the compatibility check almost instantaneously.

#### Choose more than one route

Before selecting two operational points, increase the maximum number of routes on the left to get alternative paths. Mind that higher number of routes will take longer to be calculated, however route results are rendered incrementally and should appear on screen as soon as they are calculated.

#### Select vehicle (type) first

Select a vehicle or vehicle type first and then proceed to calculate a route. This way the compatibility checks will be computed at once.

#### Explore the ERA Knowledge Graph

You have probably noticed that many of the items in the comparison table of each track are _clickable_. These are not just links to pages but links to the edges and nodes of the KG. Edges are in the column `Properties`. The properties link in a meaningful way a node, such as a track, to another node. This other node can be a value, for example:

> [`T_ATBm_1_ATUe`](https://linked.ec-dataplatform.eu/describe/?url=http%3A%2F%2Fera.europa.eu%2Fimplementation%23T_ATBm_1_ATUe) - [`maximum temperature`](https://linked.ec-dataplatform.eu/describe/?url=http%3A%2F%2Fera.europa.eu%2Fns%23maximumTemperature) -> `40`

Or to another node identified with a URI, for example:

> [`T_ATBm_1_ATUe`](https://linked.ec-dataplatform.eu/describe/?url=http%3A%2F%2Fera.europa.eu%2Fimplementation%23T_ATBm_1_ATUe) - [`train detection system`](https://linked.ec-dataplatform.eu/describe/?url=http%3A%2F%2Fera.europa.eu%2Fns%23trainDetectionSystem) -> [`track circuit`](https://linked.ec-dataplatform.eu/describe/?url=http%3A%2F%2Fera.europa.eu%2Fconcepts%2Ftrain-detection%23track_circuit).

Each property has meaning defined by the [ERA vocabulary](http://era.ilabt.imec.be/era-vocabulary/index-en.html). With them, both humans and machines can _understand_ that a node is of a specific type (e.g., track, operational point, or vehicle type) or the meaning of a statement such as the examples above.

If you click on a property you can see its description as a set of triples which is the pertinent subset of the triples from the vocabulary (this is the knowledge model, or ontology, which is also a knowledge graph).

If you click on a Track, or Vehicle, you’ll see that part of the ERA knowledge graph, which describes them again in the same way, as triples of subject-predicate-object (called alternatively resource-property-value).

If you click on a clickable parameter value in the columns Track or Vehicle, you’ll go to a description of a reference data node. For example, clicking on track circuit, you’ll be able to navigate the graph, just by clicking, to all the tracks and vehicle types which train detection system is track circuit. From any node, you can explore the knowledge graph node by node just by clicking on the neighboring nodes.

---------------

Please send you feedback (questions, bugs, comments, recommendation) to [interoperable-data@portal.era.europa.eu](mailto:interoperable-data@portal.era.europa.eu).
