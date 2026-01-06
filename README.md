# Padel

This project is a web application for booking paddle tennis courts.

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kaf-05/Padel.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Padel
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

## Running the application

1. Start the server:
   ```bash
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000`.

## Deployment (cPanel)

To deploy this application on a cPanel server, follow these steps:

1.  **Upload Files:** Upload all project files to the root directory of your domain (e.g., `public_html`).

2.  **Setup Node.js Application:**
    *   In your cPanel dashboard, find and open the **"Setup Node.js App"** tool.
    *   Click **"Create Application"**.
    *   Set **"Application root"** to your project's directory (e.g., `/public_html`).
    *   Set **"Application startup file"** to `server.js`.
    *   Choose your desired **"Node.js version"**.
    *   Click **"Create"**.

3.  **Set Environment Variables:**
    *   After the application is created, scroll down to the **"Environment Variables"** section.
    *   Add the following variables:
        *   `DB_HOST`: Your database host (e.g., `localhost`).
        *   `DB_USER`: Your database user (e.g., `xubahvhs_padel`).
        *   `DB_PASSWORD`: Your database password.
        *   `DB_NAME`: Your database name (e.g., `xubahvhs_padel`).

4.  **Install Dependencies:**
    *   Click on **"Run NPM Install"**. This will install the dependencies listed in `package.json`.

5.  **Start the Application:**
    *   After the dependencies are installed, click **"Start App"**.

Your application should now be running. cPanel will automatically handle the necessary routing.
