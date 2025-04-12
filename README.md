1. **Start the Services**  
   Run the following command to start the PostgreSQL container:

   ```bash
   docker-compose up -d
   ```

2. **Verify the Setup**  
   Check if the container is running:

   ```bash
   docker ps
   ```

   You should see a container named `postgres_container`.

3. **Access the Database**  
   Use the following command to access the PostgreSQL database:

   ```bash
   docker exec -it postgres_container psql -U your_username -d your_database
   ```

4. **Stop the Services**  
   To stop the container, run:
   ```bash
   docker-compose down
   ```
