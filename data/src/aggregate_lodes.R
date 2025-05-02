if(!require(dplyr)){
  install.packages("dplyr", repos = "http://cran.us.r-project.org")
  library(dplyr)
}
if(!require(stringr)){
  install.packages("stringr", repos = "http://cran.us.r-project.org")
  library(stringr)
}
if(!require(arrow)){
  install.packages("arrow", repos = "http://cran.us.r-project.org")
  library(arrow)
}

args <- commandArgs(trailingOnly=T)

year <- args[1]
state <- args[2]
geography <- args[3]
origin <- args[4]

fips_code_state_abbreviation <-
  data.frame(
    state_abbreviation = c("ak","al","ar","az","ca","co","ct","dc","de","fl","ga","hi","ia","id","il","in","ks","ky","la","ma","md","me","mi","mn","mo","ms","mt","nc","nd","ne","nh","nj","nm","nv","ny","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","va","vt","wa","wi","wv","wy"),
  fips_code = c("02","01","05","04","06","08","09","11","10","12","13","15","19","16","17","18","20","21","22","25","24","23","26","27","29","28","30","37","38","31","33","34","35","32","36","39","40","41","42","44","45","46","47","48","49","51","50","53","55","54","56")
  )

# aggregate the supplied LODES data (created by download_lodes) to the
#   specified aggregation level (tract, block group, or county)
aggregate_lodes <- function(year, state, geography, origin, save = T){
  stopifnot(geography %in% c("tract", "block_group", "county"))
  stopifnot(origin %in% c("h_geo", "w_geo"))

  # the main, i.e., within-state flows
  lodes.main <- readr::read_csv(paste0("input/lodes/year=", year, "/state=", state,
                                       "/", state, "-main.csv.gz"),
                                col_types = "ccnnnnnnnnnnc")
  st.fips <- fips_code_state_abbreviation |> filter(state_abbreviation == !!state)
  st.fips <- st.fips$fips_code[1]

  # find all between state flows involving this state
  #   as either the origin or destination
  lodes.aux <- readr::read_csv(paste0("input/lodes/year=", year, "/all-aux.csv.gz"),
                               col_types = "ccnnnnnnnnnnc") |>
    filter(str_sub(w_geocode, 1, 2) == st.fips |
             str_sub(h_geocode, 1, 2) == st.fips)

  # combine the main and auxillary files
  lodes <- bind_rows(lodes.main, lodes.aux)
  
  # fips codes can be shortened to specify larger geographies
  #   this records the length of the FIPS code for the specified aggregation geo
  fips.length <- case_when(
    geography == "county" ~ 5,
    geography == "tract" ~ 11,
    geography == "block_group" ~ 12
  )

  # aggregate blocks to the specified geography level by truncating the FIPS
  #   codes and summarizing
  lodes.agg <- lodes |>
    mutate(w_geo = str_sub(w_geocode, 1, fips.length),
           h_geo = str_sub(h_geocode, 1, fips.length)) |>
    group_by(w_geo, h_geo) |>
    summarise(across(.cols = starts_with("S", ignore.case = F), .fns = sum),
              .groups = "drop") |>
    mutate(across(where(is.numeric), as.integer))

  if(save == T){
    dir.create(path = paste0("intermediate/od_lodes/year=", year, "/geography=",
                             geography, "/origin=", origin, "/state=", state),
               showWarnings = F, recursive = T)

    lodes.agg |>
      filter(str_sub(!!rlang::sym(origin), 1, 2) == st.fips) |>
      arrange(across(!!rlang::sym(origin))) |>
      write_parquet(paste0("intermediate/od_lodes/year=", year, "/geography=",
                           geography, "/origin=", origin, "/state=", state, "/",
                           state, ".parquet"),
                    chunk_size = 100000)
  }
}

x <- aggregate_lodes(year, state, geography, origin)
