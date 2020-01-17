# threshy
Visualisation Tool

[**Click Here for Demo**](https://threshy-demo-2-ptbk2ijoga-uc.a.run.app)

## Prerequisites
- [Surround](https://github.com/a2i2/surround)
- [Docker](https://docker.com)

## Run locally
First install Surround if you have not already:
```
$ pip3 install surround
```

Now you can run the tool using (production version):
```
$ surround run prod
```

## Deployment to Google Cloud Run
- Create a Google Cloud Platform (GCP) project.
- Via the [GCP Console](https://console.google.com):
    - Enable the Cloud Run API, Cloud Storage API, and Google Container Registry API
    - Create a Service Account with permissions for the above
    - Download the JSON credentials file and store in the root of the project as `credentials.json`
    - Create a cloud bucket (e.g. `threshy-storage`)
- Then build an image using Surround:
    ```
    $ surround run build
    ```
- Tag the new image with the Google Container Registry URI using your GCP project name:
    ```
    $ docker tag a2i2/threshy:latest gcr.io/[PROJECT_NAME_HERE]/a2i2/threshy:latest
    ```
- Authenticate Docker with the Google credentials so we can push the image to Google:
    ```
    $ cat credentials.json | docker login -u _json_key --password-stdin https://gcr.io
    ```
- Now we can push the container to the Google Container Registry:
    ```
    docker push gcr.io/[PROJECT_NAME_HERE]/a2i2/threshy:latest
    ```

- Create a new Google Cloud Run service with the following settings:
    - Image URI: `gcr.io/[PROJECT_NAME_HERE]/a2i2/threshy:latest`
    - Environment variable: `BUCKET_URI=gs://[BUCKET_NAME_HERE]`

- Deploy!
