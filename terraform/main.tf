terraform {
  required_providers {
    docker = {
      source = "kreuzwerker/docker"
    }
  }
}

data "aws_region" "current" {}

data "aws_caller_identity" "this" {}

data "aws_ecr_authorization_token" "token" {}

provider "aws" {
  region = var.aws_region
}

provider "docker" {
  registry_auth {
    address  = format("%v.dkr.ecr.%v.amazonaws.com", data.aws_caller_identity.this.account_id, data.aws_region.current.name)
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
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
