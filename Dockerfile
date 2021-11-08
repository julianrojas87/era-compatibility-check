### Multi-stage Docker image

# STAGE 1: Start from a Node.js ready container
FROM node:16 AS RCC
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
ARG BASE_URI=https://data-interop.era.europa.eu
ARG ZOOM=10
# Parse env variables and build app for production
RUN envsub ./src/config/config.js && npm run build

# STAGE 2: Start from NGINX ready container
FROM nginx
# Copy built application from stage 1
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=RCC /opt/era-compatiblity-check/dist /usr/share/nginx/html
# Expose HTTP default port

EXPOSE 80
# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
