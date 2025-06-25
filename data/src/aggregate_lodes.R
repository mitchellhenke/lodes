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

fips_code_state_abbreviation <-
  data.frame(
    state_abbreviation = c("ak","al","ar","az","ca","co","ct","dc","de","fl","ga","hi","ia","id","il","in","ks","ky","la","ma","md","me","mi","mn","mo","ms","mt","nc","nd","ne","nh","nj","nm","nv","ny","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","va","vt","wa","wi","wv","wy"),
    fips_code = c("02","01","05","04","06","08","09","11","10","12","13","15","19","16","17","18","20","21","22","25","24","23","26","27","29","28","30","37","38","31","33","34","35","32","36","39","40","41","42","44","45","46","47","48","49","51","50","53","55","54","56")
  )

# aggregate the supplied LODES data (created by download_lodes) to the
#   specified aggregation level (tract, block group, county subdivision, or county)
aggregate_lodes <- function(year, state, 
                            geography = c("tract", "block_group", "cousub", "county"),
                            origin = c("h_geo", "w_geo"),
                            save = T){
  stopifnot(geography %in% c("tract", "block_group", "cousub", "county"))
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
  
  # combine the main and auxilary files
  lodes <- bind_rows(lodes.main, lodes.aux)
  
  # aggregate to each supplied geography
  for(g in seq(geography)){
    # fips codes can be shortened to specify larger geographies
    #   this records the length of the FIPS code for the specified aggregation geo
    fips.length <- case_when(
      geography[g] == "county" ~ 5,
      geography[g] == "tract" ~ 11,
      geography[g] == "block_group" ~ 12,
      geography[g] == "cousub" ~ 10
    )
    
    # substitute cousub geocodes from crosswalk
    if(geography[g] == "cousub"){
      cousub.crosswalk <- read_csv("resources/block-to-cousub_2020.csv.gz",
                                   col_types = "ccc")
      lodes <- lodes |>
        # add work origin cousub
        inner_join(cousub.crosswalk |>
                     select(w_geocode = block_fips, w_cousub_fips = cousub_fips)) |>
        # add home origin cousub
        inner_join(cousub.crosswalk |>
                     select(h_geocode = block_fips, h_cousub_fips = cousub_fips)) |>
        # replace block FIPS with cousub FIPS
        select(-c(h_geocode, w_geocode)) |>
        rename(h_geocode = h_cousub_fips, w_geocode = w_cousub_fips)
    }
    
    print(paste("aggregating", state, year, geography[g]))
    
    lodes.agg <- lodes |>
      mutate(w_geo = str_sub(w_geocode, 1, fips.length),
             h_geo = str_sub(h_geocode, 1, fips.length)) |>
      group_by(w_geo, h_geo) |>
      summarise(across(.cols = starts_with("S", ignore.case = F), .fns = sum),
                .groups = "drop") |>
      mutate(across(where(is.numeric), as.integer))
    
    # if cousub is the geography add text labels
    if(geography[g] == "cousub"){
      cousub.names <- cousub.crosswalk |>
        group_by(cousub_fips, cousub) |>
        summarise(.groups = "drop")
      lodes.agg <- lodes.agg |>
        inner_join(cousub.names |> select(w_geo = cousub_fips, w_name = cousub)) |>
        inner_join(cousub.names |> select(h_geo = cousub_fips, h_name = cousub))
    }
    
    if(save == T) {
      for(o in seq(origin)) {
        dir.create(path = paste0("intermediate/od_lodes/year=", year, "/geography=",
                                 geography[g], "/origin=", origin[o], "/state=", state),
                   showWarnings = F, recursive = T)
        
        print(paste("saving", state, year, geography[g], origin[o]))
        
        lodes.agg |>
          filter(str_sub(!!rlang::sym(origin[o]), 1, 2) == st.fips) |>
          arrange(across(!!rlang::sym(origin[o]))) |>
          write_parquet(paste0("intermediate/od_lodes/year=", year, "/geography=",
                               geography[g], "/origin=", origin[o], "/state=", state, "/",
                               state, ".parquet"),
                        chunk_size = 100000)
      }
    } else {
      lodes.agg
    }
  }
}

x <- aggregate_lodes(year, state)