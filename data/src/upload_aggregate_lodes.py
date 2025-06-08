import argparse
import re
import boto3
import botocore
import yaml
import os
import hashlib

def create_public_files(
    dataset: str,
    year: str,
    geography: str,
    state: str,
    origin: str,
) -> None:


    with open("params.yaml") as file:
        params = yaml.safe_load(file)
    geographies = params["input"]["census"]["geography"]
    if geography not in geographies:
        raise ValueError(
            f"Input geography must be one of: {', '.join(geographies)}"
        )

    os.environ["AWS_PROFILE"] = params["s3"]["profile"]
    account_id = params["s3"]["account_id"]
    public_bucket = params["s3"]["public_bucket"]


    s3 = boto3.client(
      service_name = 's3',
      endpoint_url = params["s3"]["endpoint_url"]
    )

    file_path = f"intermediate/od_lodes/year={year}/geography={geography}/origin={origin}/state={state}/{state}.parquet"
    filename = f"{dataset}-{year}-{geography}-{origin}-{state}.parquet"
    s3_path = f"{dataset}/year={year}/geography={geography}/origin={origin}/state={state}/{filename}"
    with open(file_path, 'rb') as file:
        data = file.read()
        md5 = hashlib.md5(data).hexdigest()
        try:
            print(s3_path)
            s3.head_object(Bucket=public_bucket, Key=s3_path, IfNoneMatch=md5)
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Message'] == 'Not Modified':
                print('skipping')
            elif e.response['Error']['Message'] == 'Not Found':
                s3.put_object(Body=data, Bucket=public_bucket, Key=s3_path, IfNoneMatch=md5)
            else:
                print(e.response)
                raise e

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, type=str)
    parser.add_argument("--year", required=True, type=str)
    parser.add_argument("--geography", required=True, type=str)
    args = parser.parse_args()
    with open("params.yaml") as file:
        params = yaml.safe_load(file)

    for state in params['input']['state']:
        for origin in params['input']['origin']:
            create_public_files(
                args.dataset,
                args.year,
                args.geography,
                state,
                origin
            )


if __name__ == "__main__":
    main()
