### Multi-stage Docker image

# STAGE 1: Start from a Node.js ready container
FROM node:latest AS RCC
# Create a new directory for app files
RUN mkdir -p /opt/era-compatiblity-check
# Set working directory in the container
WORKDIR /opt/era-compatiblity-check
# Copy source files
COPY . .
# Install dependencies
RUN npm install
# Install envsub to parse environment variables
RUN npm install -g envsub
# Define config variables
ARG ERA_GEO_API=http://era.ilabt.imec.be/ldf
ARG ZOOM=10
ARG FACETED_BASE_URI=https://linked.ec-dataplatform.eu/describe/?url=
# Parse env variables and build app for production
RUN envsub ./src/config/config.js && npm run build

# STAGE 2: Start from NGINX ready container
FROM nginx
# Copy built application from stage 1
COPY --from=RCC /opt/era-compatiblity-check/dist /usr/share/nginx/html
# Expose HTTP default port
EXPOSE 80
# Start NGINX
CMD ["nginx", "-g", "daemon off;"]