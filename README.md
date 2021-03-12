# era-compatibility-check

Web application to perform route compatibility checks based on data from the [ERA Knowledge Graph](https://linked.ec-dataplatform.eu/sparql).

## Deploy WITH Docker

This application has been _dockerized_ to facilitate its deployment. We use a [multi-stage approach](https://docs.docker.com/develop/develop-images/multistage-build/) to build a container that makes publishes a build of this Web application via a NGINX instance.

To deploy this container follow these steps:

1. Make sure to have a recent version of [Docker](https://docs.docker.com/engine/install/) installed.

2. Set the application's configuration parameters and build the Docker image:

   ```bash
   docker build -t era-rcc \
       --build-arg ERA_GEO_API=http://era.ilabt.imec.be/ldf \
       --build-arg ZOOM=10 \
       --build-arg FACETED_BASE_URI=https://linked.ec-dataplatform.eu/describe/?url= \
       ./
   ```

   Three configuration parameters need to be when building this image:

   - `ERA_GEO_API`: URL of the [geospatial API](https://github.com/julianrojas87/era-ldf/) that runs over the ERA KG.
   - `ZOOM`: Zoom level at which the geospatial data tiles are defined. According to the [Slippy Tiles spec](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Zoom_levels), the zoom parameter is an integer between 0 (zoomed out) and 18 (zoomed in).
   - `FACETED_BASE_URI`: Base URL to make entities in the application dereferenceable over the configured triple store.

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