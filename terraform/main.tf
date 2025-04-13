terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.2"
    }
  }

  required_version = ">= 1.11.2"

  backend "s3" {
    bucket = "lodes-resources"
    key    = "terraform/terraform.tfstate"

    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
    access_key                  = ""
    secret_key                  = ""
    endpoints = {
      s3 = "https://f8de4764a973ce6156967ec64aab41f3.r2.cloudflarestorage.com"
    }

    /* Set AWS_PROFILE to "cloudflare" before running commands */
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
