import argparse
from pathlib import Path

import requests as r
import logging

logger = logging.getLogger(__name__)

# w_geocode,h_geocode,S000,SA01,SA02,SA03,SE01,SE02,SE03,SI01,SI02,SI03,createdate
LODES_BASE_URL = "https://lehd.ces.census.gov/data/lodes/LODES8"

def fetch_data(
    year: str, state: str
) -> None:
    """
    Fetch a TIGER/Line shapefile and save it to a directory.

    The output directory is partitioned by year, and state.

    Args:
        year: The year of the LODES data.
        state: The two-digit state FIPS code for the shapefile.
    """
    output_dir = (
        Path.cwd()
        / "input"
        / "lodes"
        / f"year={year}"
        / f"state={state}"
    )
    output_file = output_dir / f"{state}.zip"
    output_dir.mkdir(parents=True, exist_ok=True)

    # /wi/od/wi_od_main_JT00_2022.csv.gz
    url_aux = f"{LODES_BASE_URL}/{state}/od/{state}_od_aux_JT00_{year}.csv.gz"
    url_main = f"{LODES_BASE_URL}/{state}/od/{state}_od_main_JT00_{year}.csv.gz"

    try:
        response = r.get(url, stream=True)
        response.raise_for_status()

        with open(output_file, "wb") as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)
        logger.info(f"File downloaded successfully: {output_file}")

    except r.exceptions.RequestException as e:
        logger.error(f"Failed to download file: {e}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, type=str)
    parser.add_argument("--state", required=False, type=str)
    args = parser.parse_args()
    fetch_data(year=args.year, state=args.state)


if __name__ == "__main__":
    main()
