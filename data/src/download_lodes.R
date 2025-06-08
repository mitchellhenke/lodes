# Rscript download_lodes.R YEAR STATE
# Rscript download_lodes.R 2022 wi
if(!require(readr)) {
  install.packages("readr", repos = "http://cran.us.r-project.org")
}
if(!require(dplyr)) {
  install.packages("dplyr", repos = "http://cran.us.r-project.org")
}

df.states_with_no_data <- data.frame(
  state = c('ak', 'mi', 'ms', 'az', 'dc', 'ms', 'nh', 'az', 'dc', 'ak', 'ak', 'dc', 'dc', 'ak', 'dc', 'ak', 'dc', 'dc', 'ms', 'dc', 'ak', 'ms', 'ms', 'ms', 'ma'),
  year  = c(2022, 2022, 2022, 2002, 2002, 2002, 2002, 2003, 2003, 2018, 2021, 2005, 2004, 2017, 2009, 2020, 2008, 2006, 2019, 2007, 2019, 2003, 2020, 2021, 2009)
)

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

  skip <- df.states_with_no_data |> filter(state == !!state, year == !!year)
  if(nrow(skip) > 0) {
    df.empty <- data.frame(
       w_geocode=character(),
       h_geocode=character(),
       S000=integer(),
       SA01=integer(),
       SA02=integer(),
       SA03=integer(),
       SE01=integer(),
       SE02=integer(),
       SE03=integer(),
       SI01=integer(),
       SI02=integer(),
       SI03=integer(),
       createdate=character()
    )

    aux.df <- df.empty
    main.df <- df.empty
  } else {
    aux.df <- readr::read_csv(aux.url, col_types = "ccnnnnnnnnnnc")
    main.df <- readr::read_csv(main.url, col_types = "ccnnnnnnnnnnc")
  }
  
  if(save == T){

    dir.create(path = paste0("input/lodes/year=", year, "/state=", state),
               showWarnings = F, recursive = T)
    readr::write_csv(aux.df, paste0("input/lodes/year=", year, "/state=", state,
                                    "/", state, "-aux.csv.gz"))
    readr::write_csv(main.df, paste0("input/lodes/year=", year, "/state=", state,
                                     "/", state, "-main.csv.gz"))
  }
  
}

x <- download_lodes(year, state)
