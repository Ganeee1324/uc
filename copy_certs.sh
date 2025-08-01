#!/bin/bash

# Create certs directory in the application folder
mkdir -p /home/ubuntu/marketplace-backend/certs

# Copy the certificates
sudo cp /etc/letsencrypt/live/symbia.it/fullchain.pem /home/ubuntu/marketplace-backend/certs/
sudo cp /etc/letsencrypt/live/symbia.it/privkey.pem /home/ubuntu/marketplace-backend/certs/

# Change ownership to ubuntu user
sudo chown ubuntu:ubuntu /home/ubuntu/marketplace-backend/certs/fullchain.pem
sudo chown ubuntu:ubuntu /home/ubuntu/marketplace-backend/certs/privkey.pem

# Set proper permissions
chmod 644 /home/ubuntu/marketplace-backend/certs/fullchain.pem
chmod 600 /home/ubuntu/marketplace-backend/certs/privkey.pem

echo "Certificates copied successfully!" 