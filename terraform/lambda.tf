module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "website-alerter-scheduled-start-${local.suffix_id}"
  create_role = false
  lambda_role = aws_iam_role.lambda_iam_role.arn
  description = "Scheduled start of the scraping process this will parse the config files and queue all the sites to SQS"
  runtime = var.node_runtime
  source_path = "../build/scheduled-start"
  handler = "index.handler"
  timeout = 30

  environment_variables = {
    CONFIG_S3 = aws_s3_bucket.config_bucket.bucket
    WEBSITE_TABLE = aws_dynamodb_table.dynamo_db_table_website_table.name
    WEBSITE_QUEUE_NAME = aws_sqs_queue.website_queue.url
    RUN_TABLE = aws_dynamodb_table.dynamo_db_table_run_through_table.name
    END_QUEUE = aws_sqs_queue.end_queue.url
    IS_PRODUCTION = "true"
  }
}