FROM node:10

# Maintainer
LABEL maintainer="Vmoksha Technologies <devops@vmokshagroup.com>"

#Install Base Packages or dependence softwares of Build and Nginx Proxy
RUN apt-get update && apt-get install -y  \
    build-essential                       \
    libssl-dev                            \
    gcc                                   \
    g++                                   \
    make                                  \
    nano                                  \
    curl

RUN mkdir -p /usr/app/

# Set work directory by default to app path
WORKDIR /usr/app/

COPY package.json package.json

# Install Node modules and build the packages
RUN npm install && npm cache clean --force

# Install sails dependency package.
#RUN npm install -g sails

# Add Node.js app
COPY . /usr/app/

# Expose Node port
EXPOSE 3000

# Run the startup script
CMD [ "node", "app.js" ]

#CMD [ "/bin/sh", "-c", "node app.js > server.log 2>&1" ]
