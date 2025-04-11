if(!require(dplyr)){
  install.packages("dplyr")
  library(dplyr)
}
if(!require(stringr)){
  install.packages("stringr")
  library(stringr)
}
if(!require(nanoparquet)){
  install.packages("nanoparquet")
}

# aggregate the supplied LODES data (created by download_lodes) to the
#   specified aggregation level (currently only tract supported)
aggregate_lodes <- function(year, state, aggregate_to = "tract", save = T){
  stopifnot(aggregate_to %in% c("tract"))
  
  lodes <- readr::read_csv(paste0("input/lodes/year=", year, "/state=", state,
                                  "/", state, ".csv.gz"))
  
  if(aggregate_to == "tract"){
    lodes.agg <- lodes |>
      mutate(w_tract = str_sub(w_geocode, 1, 11),
             h_tract = str_sub(h_geocode, 1, 11)) |>
      group_by(w_tract, h_tract) |>
      summarise(across(.cols = where(is.numeric), .fns = sum),
                .groups = "drop")
  }
  
  if(save == T){
    dir.create(path = paste0("intermediate/od_tract/year=", year, "/state=", state),
               showWarnings = F, recursive = T)
    
    nanoparquet::write_parquet(lodes.agg,
                               paste0("intermediate/od_", aggregate_to, "/year=",
                                      year, "/state=", state, "/", state, ".parquet"))
  }
}
