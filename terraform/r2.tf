resource "cloudflare_r2_bucket" "lodes-data" {
  account_id = var.cloudflare_account_id
  name       = "lodes-data"
  location   = "ENAM"
}

resource "cloudflare_r2_bucket" "lodes-dvc" {
  account_id = var.cloudflare_account_id
  name       = "lodes-dvc"
  location   = "ENAM"
}

resource "cloudflare_r2_bucket" "lodes-resources" {
  account_id = var.cloudflare_account_id
  name       = "lodes-resources"
  location   = "ENAM"
}

resource "cloudflare_r2_bucket_lifecycle" "lodes-resources-lifecycle" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.lodes-resources.name

  rules = [
    {
      id = "expire-cached-items"
      conditions = {
        prefix = "/cache"
      }
      enabled = true

      delete_objects_transition = {
        condition = {
          max_age = 1
          type    = "Age"
        }
      }
    },
    {
      id = "abort-multipart-upload"
      conditions = {
        prefix = ""
      }
      enabled = true
      abort_multipart_uploads_transition = {
        condition = {
          max_age = 1
          type    = "Age"
        }
      }
    }
  ]
}

