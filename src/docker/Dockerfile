#Docker file which downloads the dependencies needed for Puppeteer to run

FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}

# Install Chromium to get all of the dependencies installed
RUN yum install -y amazon-linux-extras
RUN amazon-linux-extras install epel -y
RUN yum install -y chromium

# Copy the compiled Typescript, package, and Puppeteer config over
COPY package.json index.js puppeteer.config.js ./

# Install Puppeteer and any other dependencies not built into the index.js
RUN npm install --silent

CMD [ "index.handler" ]