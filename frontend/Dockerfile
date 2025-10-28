# Use official nginx image
FROM nginx:alpine

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy your static frontend files
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Nginx starts automatically by default
