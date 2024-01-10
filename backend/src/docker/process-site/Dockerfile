#Docker file which downloads the dependencies needed for Puppeteer to run

FROM public.ecr.aws/lambda/nodejs:20
WORKDIR ${LAMBDA_TASK_ROOT}

# Install Chromium to get all of the dependencies installed (we don't actually use this version of chrome)
RUN yum install -y amazon-linux-extras
RUN amazon-linux-extras install epel -y
RUN yum install -y chromium

# Copy the compiled package.json, Typescript, and Puppeteer config over
COPY package.json index.js puppeteer.config.js ./

# Force puppeteer to use the version it was built with: https://pptr.dev/chromium-support
ENV PUPPETEER_BROWSER_REVISION 115.0.5790.102

# Install Puppeteer and any other dependencies not built into the index.js
RUN npm install --silent

CMD [ "index.handler" ]