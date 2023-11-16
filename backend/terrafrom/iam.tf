resource "aws_iam_role" "lambda_iam_role" {
  name = "website-alerter-role-${local.suffix_id}"
  description = "Generic role for Lambdas in website-alerter stack"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  inline_policy {
    name = "general"
    policy = jsonencode({
      "Version" : "2012-10-17",
      "Statement" : [
        {
          "Action" : [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:DescribeLogStreams",
            "logs:PutLogEvents",
            "s3:ListBucket"
          ],
          "Effect" : "Allow",
          "Resource" : "*"
        }
      ]
    })
  }

  inline_policy {
    name = "data"
    policy = jsonencode({
      Version = "2012-10-17",
      Statement = [
        {
          Action = [
            "dynamodb:ListTables",
            "dynamodb:DescribeTable",
            "dynamodb:GetItem",
            "dynamodb:UpdateItem",
            "dynamodb:PutItem"
          ],
          Effect = "Allow",
          Resource = [
            aws_dynamodb_table.dynamo_db_table_website_table.arn,
            aws_dynamodb_table.dynamo_db_table_run_through_table.arn
          ]
        },
        {
          Action = [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject"
          ],
          Effect = "Allow",
          Resource = [
            "${aws_s3_bucket.config_bucket.arn}/*"
          ]
        }
      ]
    })
  }

  inline_policy {
    name = "events"
    policy = jsonencode({
      Version = "2012-10-17",
      Statement = [
        {
          Action = [
            "sqs:ReceiveMessage",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes",
            "sqs:ChangeMessageVisibility",
            "sqs:DeleteMessage",
            "sqs:GetQueueUrl",
            "sqs:SendMessage"
          ],
          Effect = "Allow",
          Resource = [
            aws_sqs_queue.website_queue.arn,
            aws_sqs_queue.change_queue.arn,
            aws_sqs_queue.end_queue.arn
          ]
        }
      ]
    })
  }
}