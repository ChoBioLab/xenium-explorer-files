FROM nginx:alpine

# Copy all application files except those that will be mounted as volumes
COPY index.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

# Create directory for logs
RUN mkdir -p /logs

# Use a custom nginx config to handle larger file sizes
COPY nginx.conf /etc/nginx/conf.d/default.conf

