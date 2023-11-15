provider "aws" {
  region = var.aws_region
}

resource "random_string" "suffix" {
  length = 8
  special = false
  upper = false
}

locals {
  suffix_id = random_string.suffix.result
}

resource "aws_s3_bucket" "config_bucket" {
  bucket = "website-alerter-${local.suffix_id}"
  lifecycle {
    prevent_destroy = true
  }
}
