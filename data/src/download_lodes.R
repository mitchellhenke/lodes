# Rscript download_lodes.R YEAR STATE
# Rscript download_lodes.R 2022 wi
if(!require(readr)) {
  install.packages("readr", repos = "http://cran.us.r-project.org")
}

args <- commandArgs(trailingOnly=T)

year <- args[1]
state <- args[2]
options(timeout = 1000)

# download the main and aux files, appending them
download_lodes <- function(year, state, save = T){
  aux.url <- paste0("https://lehd.ces.census.gov/data/lodes/LODES8/",
                    state, "/od/", state, "_od_", "aux", "_JT00_", year, ".csv.gz")
  main.url <- paste0("https://lehd.ces.census.gov/data/lodes/LODES8/",
                     state, "/od/", state, "_od_", "main", "_JT00_", year, ".csv.gz")
  aux.df <- readr::read_csv(aux.url, col_types = "ccnnnnnnnnnnc")
  main.df <- readr::read_csv(main.url, col_types = "ccnnnnnnnnnnc")
  #df <- rbind(aux.df, main.df)
  if(save == T){
    
    dir.create(path = paste0("input/lodes/year=", year, "/state=", state),
               showWarnings = F, recursive = T)
    readr::write_csv(aux.df, paste0("input/lodes/year=", year, "/state=", state,
                                    "/", state, "-aux.csv.gz"))
    readr::write_csv(main.df, paste0("input/lodes/year=", year, "/state=", state,
                                     "/", state, "-main.csv.gz"))
  }
  df
}

x <- download_lodes(year, state)
