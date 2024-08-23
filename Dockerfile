# Use an x64 Node.js base image
FROM node:22-bullseye-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code to the container
COPY . .

# Expose the port your application runs on (adjust as necessary)
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]