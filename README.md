## Running the Application

### 1. Build and start all containers:

Run the following to build Docker images freshly and start backend and frontend containers:

docker-compose up --build

text

### 2. Verify containers are running:

In a separate terminal, check the status of the containers:

docker-compose ps

text

You should see backend and frontend containers running.

### 3. Access application

- Frontend UI: open [http://localhost](http://localhost) in your web browser.
- Backend API docs: open [http://localhost:8000/docs](http://localhost:8000/docs) to view FastAPI Swagger UI.

---