resource "aws_sqs_queue" "website_dead" {
  name = "website-alerter-dead-queue-${local.suffix_id}"
}

# create the website polling queue
resource "aws_sqs_queue" "website_queue" {
  name = "website-alerter-queue-${local.suffix_id}"
  visibility_timeout_seconds = var.sqs_timeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.website_dead.arn
    maxReceiveCount = 3
  })
}

# create the detect changes queue
resource "aws_sqs_queue" "change_queue" {
  name = "website-alerter-change-${local.suffix_id}"
  visibility_timeout_seconds = var.sqs_timeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.website_dead.arn
    maxReceiveCount = 3
  })
}

# create the final maintenance queue with a 10 minute delay
resource "aws_sqs_queue" "end_queue" {
  name = "website-alerter-end-${local.suffix_id}"
  delay_seconds = 600
  visibility_timeout_seconds = var.sqs_timeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.website_dead.arn
    maxReceiveCount = 3
  })
}