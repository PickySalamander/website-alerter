# create the website table
resource "aws_dynamodb_table" "dynamo_db_table_website_table" {
  name = "website-alerter-sites-${local.suffix_id}"

  hash_key = "site"
  attribute {
    name = "site"
    type = "S"
  }

  billing_mode = "PAY_PER_REQUEST"

  lifecycle {
    prevent_destroy = true
  }
}

# create the run table
resource "aws_dynamodb_table" "dynamo_db_table_run_through_table" {
  name = "website-alerter-run-${local.suffix_id}"

  hash_key = "id"
  attribute {
    name = "id"
    type = "S"
  }

  billing_mode = "PAY_PER_REQUEST"

  lifecycle {
    prevent_destroy = true
  }
}