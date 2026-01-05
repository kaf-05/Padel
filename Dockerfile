# Use the official Nginx image as a base
FROM nginx:alpine

# Copy the static files from the project to the Nginx web server directory
COPY ./stitch_calendario_semanal_de_pistas/ /usr/share/nginx/html

# Expose port 80 to allow external access to the web server
EXPOSE 80

# Command to start the Nginx server when the container starts
CMD ["nginx", "-g", "daemon off;"]
