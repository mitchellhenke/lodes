if(!require(dplyr)){
  install.packages("dplyr", repos = "http://cran.us.r-project.org")
  library(dplyr)
}
if(!require(stringr)){
  install.packages("stringr", repos = "http://cran.us.r-project.org")
  library(stringr)
}
if(!require(nanoparquet)){
  install.packages("nanoparquet", repos = "http://cran.us.r-project.org")
}

args <- commandArgs(trailingOnly=T)

year <- args[1]
state <- args[2]
geography <- args[3]

# aggregate the supplied LODES data (created by download_lodes) to the
#   specified aggregation level (currently only tract supported)
aggregate_lodes <- function(year, state, geography = "tract", save = T){
  stopifnot(geography %in% c("tract", "block_group"))

  lodes <- readr::read_csv(paste0("input/lodes/year=", year, "/state=", state,
                                  "/", state, ".csv.gz"))

  if(geography == "tract"){
    lodes.agg <- lodes |>
      mutate(w_tract = str_sub(w_geocode, 1, 11),
             h_tract = str_sub(h_geocode, 1, 11)) |>
      group_by(w_tract, h_tract) |>
      summarise(across(.cols = starts_with("S", ignore.case = F), .fns = sum),
                .groups = "drop") |>
      mutate(across(where(is.numeric), as.integer))
  }

  if(geography == "block_group"){
    lodes.agg <- lodes |>
      mutate(w_tract = str_sub(w_geocode, 1, 12),
             h_tract = str_sub(h_geocode, 1, 12)) |>
      group_by(w_tract, h_tract) |>
      summarise(across(.cols = starts_with("S", ignore.case = F), .fns = sum),
                .groups = "drop") |>
      mutate(across(where(is.numeric), as.integer))
  }

  if(save == T){
    dir.create(path = paste0("intermediate/od_lodes/year=", year, "/geography=", geography, "/state=", state),
               showWarnings = F, recursive = T)

    nanoparquet::write_parquet(lodes.agg,
                               paste0("intermediate/od_lodes/year=", year, "/geography=", geography, "/state=", state,
                                      "/", state, ".parquet"))
  }
}

x <- aggregate_lodes(year, state, geography)
