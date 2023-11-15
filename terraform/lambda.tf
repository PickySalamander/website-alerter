# create the scheduled start function which starts the whole process when hit with the event bridge rule
module "scheduled_start" {
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

# create the docker image lambda function that triggers the website polling with Puppeteer. This needs to be
# built with "npm run build" first.
module "process_site" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "website-alerter-process-site-${local.suffix_id}"
  package_type = "Image"
  create_package = false
  create_role = false
  lambda_role = aws_iam_role.lambda_iam_role.arn
  description = "Scheduled call to the function to start scrapping process"
  image_uri = module.process_site_docker.image_uri
  memory_size = 1024  # bigger memory size and timeout to give a chance for puppeteer to run
  timeout = 60

  event_source_mapping = {
    sqs = {
      event_source_arn = aws_sqs_queue.change_queue.arn
    }
  }
}

module "process_site_docker" {
  source = "terraform-aws-modules/lambda/aws//modules/docker-build"

  create_ecr_repo = true
  ecr_repo = "website-alerter-${local.suffix_id}"

  use_image_tag = false

  source_path = "../build/process-site"

  # TODO do I need a trigger here?
  # TODO lifecycle policy?
}

# detect changes from the recently polled website
module "detect_changes" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "website-alerter-dectect-changes-${local.suffix_id}"
  create_role = false
  lambda_role = aws_iam_role.lambda_iam_role.arn
  description = "Detect the changes from the browser processing"
  runtime = var.node_runtime
  source_path = "../build/detect-changes"
  handler = "index.handler"
  timeout = 30

  environment_variables = {
    CONFIG_S3 = aws_s3_bucket.config_bucket.bucket
    WEBSITE_TABLE = aws_dynamodb_table.dynamo_db_table_website_table.name
    RUN_TABLE = aws_dynamodb_table.dynamo_db_table_run_through_table.name
    IS_PRODUCTION = "true"
  }

  event_source_mapping = {
    sqs = {
      event_source_arn = aws_sqs_queue.change_queue.arn
    }
  }
}

// called after the whole flow is finished to follow up on the whole process
module "scheduled_end" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "website-alerter-scheduled-end-${local.suffix_id}"
  create_role = false
  lambda_role = aws_iam_role.lambda_iam_role.arn
  description = "Finalize the whole flow by finishing up any lingering tasks, email the user via SNS, and perform some final maintenance."
  runtime = var.node_runtime
  source_path = "../build/scheduled-end"
  handler = "index.handler"
  timeout = 30

  environment_variables = {
    CONFIG_S3 = aws_s3_bucket.config_bucket.bucket
    WEBSITE_TABLE = aws_dynamodb_table.dynamo_db_table_website_table.name
    RUN_TABLE = aws_dynamodb_table.dynamo_db_table_run_through_table.name
    IS_PRODUCTION = "true"
  }

  event_source_mapping = {
    sqs = {
      event_source_arn = aws_sqs_queue.end_queue.arn
    }
  }
}