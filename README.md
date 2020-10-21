# Threshy
<center><img src="https://i.imgur.com/8etWt90.png" alt="Threshy Logo" width="600" height="74"/></center>

Threshy is a visualisation tool designed for software engineers to set decision thresholds when integrating their apps with machine-learnt components.

Below is a walkthrough on about Threshy and how to use it:

<a href="https://www.youtube.com/watch?v=0oOKmbG81YE">
    <img alt="Walkthrough" src="https://i.imgur.com/123F9lA.png" width="500" height="281">
</a>

For a live demo of Threshy, [**click here**](http://bit.ly/a2i2-threshy). **Please note that Threshy is currently not supported using Safari.**

You can read more about the foundations behind Threshy in our associated paper on **[arXiv](https://arxiv.org/abs/2008.08252)**.

## Citing Threshy

Threshy was [presented](https://2020.esec-fse.org/details/esecfse-2020-tool-demos/2/Threshy-Supporting-Safe-Usage-of-Intelligent-Web-Services) at  Demonstrations Track of the 2020 ACM Joint European Software Engineering Conference and Symposium on the Foundations of Software Engineering (**[ESEC/FSE](https://2020.esec-fse.org)**).

Please cite Threshy if you use it in your own work:

```bibtex
@inproceedings{Cummaudo:2020fse-demo,
    address = {Virtual Event, USA},
    author = {Cummaudo, Alex and Barnett, Scott and Vasa, Rajesh and Grundy, John},
    booktitle = {Proceedings of the 28th ACM Joint Meeting on European Software Engineering Conference and Symposium on the Foundations of Software Engineering},
    doi = {10.1145/3368089.3417919},
    month = {nov},
    pages = {5},
    publisher = {ACM},
    title = {{Threshy: Supporting Safe Usage of Intelligent Web Services}},
    year = {2020}
}
```

## Installing Threshy

### Prerequisites
- [Surround](https://github.com/a2i2/surround)
- [Docker](https://docker.com)

### Run locally
First install Surround if you have not already:
```
$ pip3 install surround
```

Now you can run the tool using (production version):
```
$ surround run prod
```

### Deployment to Google Cloud Run
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
