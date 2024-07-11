# Use the official Python base image
FROM python:3.8-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Install necessary dependencies
COPY apt-requirements.txt /app/apt-requirements.txt
RUN apt-get update && \
    xargs -a /app/apt-requirements.txt apt-get install -y && \
    apt-get clean

# Copy the requirements.txt file into the container
COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install -r /app/requirements.txt

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_17.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose ports if needed
EXPOSE 8765 8443

# Start the services
CMD ["sh", "-c", "node joystick_webrtc.js & python gstreamer_webrtc.py"]
