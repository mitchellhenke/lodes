import argparse
import yaml
import subprocess
import concurrent.futures

def create_lodes_file(
    year: str,
) -> None:
    with open("params.yaml") as file:
        params = yaml.safe_load(file)
    years = params["input"]["year"]

    if year not in years:
        raise ValueError(
            f"Input year must be one of: {', '.join(years)}"
        )

    large_states = []
    for state in large_states:
        run_r_script(year, state)

    states = params['input']['state']
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_state = {
            executor.submit(
                run_r_script,
                year,
                state,
            ): state
            for state in states if state not in large_states
        }
        for future in concurrent.futures.as_completed(future_to_state):
            _state = future_to_state[future]
            data = future.result()

def run_r_script(year: str, state: str) -> None:
    result = subprocess.run(["Rscript", "src/aggregate_lodes.R", year, state])
    result.check_returncode()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, type=str)
    args = parser.parse_args()

    create_lodes_file(
        args.year,
    )


if __name__ == "__main__":
    main()
