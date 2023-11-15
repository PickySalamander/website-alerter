variable "aws_region" {
  description = "Region of AWS to use"
  type = string
  default = "us-east-1"
}

variable "node_runtime" {
  description = "Which Node.js version should Lambda use for functions"
  type = string
  default = "nodejs18.x"
}

variable "sqs_timeout" {
  description = "SQS timeout for retries in seconds"
  type = number
  default = 120
}