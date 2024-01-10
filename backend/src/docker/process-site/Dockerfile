# Docker file which downloads the dependencies needed for Puppeteer to run

FROM public.ecr.aws/lambda/nodejs:20
WORKDIR ${LAMBDA_TASK_ROOT}

# Install Chromium to get all of the dependencies installed (we don't actually use this version of chrome)
# Code mostly taken from https://stackoverflow.com/questions/76949379/run-microdnf-install-google-chrome-stable-results-in-cannot-be-verified-and-rep
COPY google-chrome.repo /etc/yum.repos.d/google-chrome.repo
RUN dnf install -y wget
RUN wget https://dl.google.com/linux/linux_signing_key.pub
RUN rpm --import linux_signing_key.pub
RUN dnf install -y google-chrome-stable

# Copy the compiled package.json, Typescript, and Puppeteer config over
COPY package.json index.js puppeteer.config.js ./

# Force puppeteer to use the version it was built with: https://pptr.dev/chromium-support
ENV PUPPETEER_BROWSER_REVISION 115.0.5790.102

# Install Puppeteer and any other dependencies not built into the index.js
RUN npm install --silent

CMD [ "index.handler" ]