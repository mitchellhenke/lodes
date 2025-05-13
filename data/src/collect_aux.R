if(!require(dplyr)){
  install.packages("dplyr", repos = "http://cran.us.r-project.org")
  library(dplyr)
}
if(!require(stringr)){
  install.packages("stringr", repos = "http://cran.us.r-project.org")
  library(stringr)
}
if(!require(purrr)){
  install.packages("purrr", repos = "http://cran.us.r-project.org")
}
if(!require(readr)){
  install.packages("readr", repos = "http://cran.us.r-project.org")
  library(readr)
}

args <- commandArgs(trailingOnly=T)

year <- args[1]

# this function reads all existing state auxiliary files for a given year,
#   appends them, and saves them as a single compressed CSV file
collect_aux <- function(year){
  all.aux <- purrr::map(.x = list.files(paste0("input/lodes/year=", year),
                                        pattern = "aux.csv.gz", recursive = T),
                        .f = ~read_csv(paste0("input/lodes/year=", year, "/", .x),
                                       col_types = "ccnnnnnnnnnnc"),
                        .progress = T) |>
    purrr::list_rbind()
  readr::write_csv(all.aux, paste0("input/lodes/year=", year, "/all-aux.csv.gz"))
}

x <- collect_aux(year)
