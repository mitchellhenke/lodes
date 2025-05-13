rm(list = ls())

library(tidyverse)
library(sf)
library(tigris)

# download county subdivision polygons
# download block polygons
#   convert to centroids (inside original polygon)
#   spatially join to county subdivision
# drop GIS fields
# save as state crosswalk CSV

intersect_blocks_to_cousub <- function(st){
  cousub <- county_subdivisions(state = st, year = 2020)
  blocks <- blocks(state = st, year = 2020)
  
  blocks |>
    select(block_fips = GEOID20) |>
    # like centroid but guarantees that it is contained within polygon's borders
    mutate(geometry = st_point_on_surface(geometry)) |>
    st_join(cousub |>
              select(cousub_fips = GEOID, NAMELSAD)) |>
    st_drop_geometry() |>
    tibble() |>
    write_csv(paste0("input/crosswalk/block-to-cousub/", st, ".csv.gz"))
}

# apply to all states and DC
map(.x = c(state.abb, "DC"),
    .f = intersect_blocks_to_cousub,
    .progress = T)
