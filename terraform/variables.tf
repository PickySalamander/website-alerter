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

variable "lambda_log_retention" {
  description = "The number of days log events are kept in CloudWatch Logs. When updating this property, unsetting it doesn't remove the log retention policy. To remove the retention policy, set the value to INFINITE."
  default = 14
}