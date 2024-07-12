# Stage 1: Build Python dependencies
FROM python:3.8-slim as build

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Install necessary dependencies
COPY apt-requirements.txt /app/apt-requirements.txt
RUN apt-get update && \
    grep -vE "^\s*#" /app/apt-requirements.txt | xargs apt-get install -y && \
    apt-get clean

# Install supervisor in the build stage
RUN apt-get install -y supervisor
RUN mkdir -p /var/log/supervisor

# Set the working directory
WORKDIR /opt/app

# Create a virtual environment
RUN python -m venv /opt/app/venv

# Activate the virtual environment
ENV PATH="/opt/app/venv/bin:$PATH"

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Stage 2: Set up Node.js and copy Python dependencies
FROM node:14

# Set the working directory
WORKDIR /opt/app

# Install supervisor in the node stage
RUN apt-get update && apt-get install -y supervisor

# Copy the virtual environment from the build stage
COPY --from=build /opt/app/venv /venv

# Activate the virtual environment
ENV PATH="/venv/bin:$PATH"

# Set the Node.js environment
ENV NODE_ENV=container

# Copy the package.json and package-lock.json files
COPY package*.json .

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Copy the supervisord configuration file
COPY ./supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports if needed
EXPOSE 8765 8443

# Run supervisord to start the services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
