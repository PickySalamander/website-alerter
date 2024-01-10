# Docker file which downloads the dependencies needed for bcrypt to run

FROM public.ecr.aws/lambda/nodejs:20
WORKDIR ${LAMBDA_TASK_ROOT}

# Install prequisites for bcrypt: https://github.com/kelektiv/node.bcrypt.js/wiki/Installation-Instructions#rhel-and-centos
RUN dnf install -y gcc-c++ make

# Copy the compiled Typescript
COPY index.js ./

# Install bcrypt
RUN npm install bcrypt --silent

CMD [ "index.handler" ]