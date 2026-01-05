# Padel
padel

## Despliegue con Docker

Para desplegar la aplicación, puedes utilizar Docker. Asegúrate de tener Docker y Docker Compose instalados en tu máquina.

### Pasos para el despliegue

1. **Construir y ejecutar el contenedor:**

   Abre una terminal en la raíz del proyecto y ejecuta el siguiente comando:

   ```bash
   docker-compose up --build -d
   ```

   Este comando construirá la imagen de Docker y ejecutará el contenedor en segundo plano.

2. **Acceder a la aplicación:**

   Una vez que el contenedor esté en funcionamiento, puedes acceder a la aplicación en tu navegador web a través de la siguiente URL:

   [http://localhost:8080](http://localhost:8080)

3. **Detener el contenedor:**

   Para detener la aplicación, ejecuta el siguiente comando en la terminal:

   ```bash
   docker-compose down
   ```
